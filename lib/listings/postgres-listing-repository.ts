import {
  LeadSource as DbLeadSource,
  ListingIntent as DbListingIntent,
  ListingStatus as DbListingStatus,
  PropertyType as DbPropertyType,
  Role as DbRole,
  Prisma,
} from "@prisma/client";
import {
  buildOwnerAgreementBypassRecord,
  HOMELINK_OWNER_LISTING_AGREEMENT,
  listingHasOwnerAgreement,
  ListingApprovalError,
  OWNER_LISTING_AGREEMENT_VERSION,
} from "@/lib/listings/owner-contract";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { recordPostgresAuditEvent } from "@/lib/auth/postgres-auth";
import { createSignedAgreement } from "@/lib/signatures/postgres-signature-repository";
import { getStore } from "@/lib/store/app-store";
import { isStrictProductionMode } from "@/lib/production/runtime";
import { isAllowedAvailabilityStatus } from "@/lib/listings/status";
import type { ListingRecord, StoreUser } from "@/lib/store/types";
import type { Listing, ListingIntent as PublicListingIntent, ListingVirtualTour, PropertyType } from "@/lib/types";
import { resolvePublicImageUrl } from "@/lib/media/resolve-public-image";
import type { ListingPagination, ListingQuery, ListingSort } from "@/lib/api/listing-service";

const DB_VIEWING_IN_PROGRESS = "VIEWING_IN_PROGRESS" as DbListingStatus;

const LISTING_INCLUDE = {
  owner: true,
  media: { orderBy: { sortOrder: "asc" as const } },
  virtualTour: { include: { scenes: { orderBy: { sortOrder: "asc" as const } } } },
  _count: { select: { favourites: true, enquiries: true, reports: true } },
} satisfies Prisma.ListingInclude;

type PrismaListingRow = Prisma.ListingGetPayload<{ include: typeof LISTING_INCLUDE }>;
type ListingInput = Partial<ListingRecord>;

const SAFE_LISTING_SELECT = {
  id: true,
  slug: true,
  ownerId: true,
  intent: true,
  propertyType: true,
  status: true,
  title: true,
  description: true,
  price: true,
  city: true,
  suburb: true,
  latitude: true,
  longitude: true,
  bedrooms: true,
  bathrooms: true,
  furnished: true,
  parking: true,
  petFriendly: true,
  wifi: true,
  solarBackup: true,
  borehole: true,
  generator: true,
  waterTank: true,
  securityWall: true,
  electricFence: true,
  garden: true,
  swimmingPool: true,
  availableFrom: true,
  createdAt: true,
  verifiedAt: true,
  owner: { select: { name: true, phone: true, identityStatus: true } },
  media: {
    select: { url: true, mediaType: true },
    orderBy: { sortOrder: "asc" },
  },
  _count: { select: { favourites: true, enquiries: true } },
} satisfies Prisma.ListingSelect;

type SafeListingRow = Prisma.ListingGetPayload<{ select: typeof SAFE_LISTING_SELECT }>;

const PROPERTY_TYPE_TO_DB: Record<PropertyType, DbPropertyType> = {
  room: DbPropertyType.ROOM,
  house: DbPropertyType.HOUSE,
  flat: DbPropertyType.FLAT,
  cottage: DbPropertyType.COTTAGE,
  commercial: DbPropertyType.COMMERCIAL,
  land: DbPropertyType.LAND,
  holiday_home: DbPropertyType.COTTAGE,
};

const PROPERTY_TYPE_FROM_DB: Record<string, PropertyType> = {
  [DbPropertyType.ROOM]: "room",
  [DbPropertyType.HOUSE]: "house",
  [DbPropertyType.FLAT]: "flat",
  [DbPropertyType.COTTAGE]: "cottage",
  [DbPropertyType.COMMERCIAL]: "commercial",
  [DbPropertyType.LAND]: "land",
};

const STATUS_TO_DB: Record<string, DbListingStatus> = {
  DRAFT: DbListingStatus.DRAFT,
  PENDING_REVIEW: DbListingStatus.PENDING_REVIEW,
  ACTIVE: DbListingStatus.ACTIVE,
  VIEWING_IN_PROGRESS: DB_VIEWING_IN_PROGRESS,
  RENTED: DbListingStatus.RENTED,
  SOLD: DbListingStatus.SOLD,
  SUSPENDED: DbListingStatus.SUSPENDED,
  EXPIRED: DbListingStatus.EXPIRED,
  REJECTED: DbListingStatus.REJECTED,
  ARCHIVED: DbListingStatus.ARCHIVED,
  DELETED: DbListingStatus.DELETED,
};

const DB_STATUS_TO_APP: Record<string, ListingRecord["status"]> = {
  [DbListingStatus.DRAFT]: "DRAFT",
  [DbListingStatus.PENDING_REVIEW]: "PENDING_REVIEW",
  [DbListingStatus.ACTIVE]: "ACTIVE",
  VIEWING_IN_PROGRESS: "VIEWING_IN_PROGRESS",
  [DbListingStatus.RENTED]: "RENTED",
  [DbListingStatus.SOLD]: "SOLD",
  [DbListingStatus.SUSPENDED]: "ARCHIVED",
  [DbListingStatus.EXPIRED]: "EXPIRED",
  [DbListingStatus.REJECTED]: "REJECTED",
  [DbListingStatus.ARCHIVED]: "ARCHIVED",
  [DbListingStatus.DELETED]: "DELETED",
};

const AMENITY_FLAGS = [
  ["furnished", /furnished/i],
  ["parking", /parking|garage/i],
  ["petFriendly", /pet/i],
  ["wifi", /wi-?fi|internet/i],
  ["solarBackup", /solar/i],
  ["borehole", /borehole/i],
  ["generator", /generator/i],
  ["waterTank", /water tank|tank/i],
  ["securityWall", /security wall|walled|wall/i],
  ["electricFence", /electric fence/i],
  ["garden", /garden/i],
  ["swimmingPool", /pool|swimming/i],
] as const;

export function shouldUsePostgresListings() {
  return isPostgresStoreEnabled();
}

export async function createListingInPostgres(input: ListingInput, ownerId: string) {
  assertPostgresConfigured();
  const prisma = getMainPrisma();
  const owner = await ensureUserInPostgres(ownerId);
  const isHoliday = input.type === "holiday_home";
  const type = input.type ?? "room";
  const images = normalizeMedia(input.images, input.image);
  const videos = input.videos ?? [];
  const duplicateOwner = await findDuplicateOwnerListing(input);
  const leadSource = normalizeLeadSource(input.leadSource);
  const id = `listing_${crypto.randomUUID()}`;
  const title = sanitizeText(input.title, "New listing");
  const availability = parseAvailableFrom(input.availableFrom);

  const created = await prisma.$transaction(async (tx) => {
    const listing = await tx.listing.create({
      data: {
        id,
        slug: listingSlug(id, title),
        ownerId,
        intent: normalizeIntent(isHoliday ? "rent" : input.intent),
        propertyType: PROPERTY_TYPE_TO_DB[type],
        status: STATUS_TO_DB[input.status ?? "PENDING_REVIEW"] ?? DbListingStatus.PENDING_REVIEW,
        title,
        description: sanitizeText(input.description, ""),
        price: isHoliday
          ? Number(input.holidayHome?.nightlyRate ?? input.price ?? 0)
          : Number(input.price ?? 0),
        currency: "USD",
        city: sanitizeText(input.city, "Harare"),
        suburb: sanitizeText(input.suburb, "CBD"),
        latitude: input.latitude ?? -17.8292,
        longitude: input.longitude ?? 31.0522,
        bedrooms: Number(input.bedrooms ?? 1),
        bathrooms: Number(input.bathrooms ?? 1),
        ...amenityBooleans(input),
        availableFrom: availability,
        leadSource,
        leadCreatedById: ownerId,
        assignedAgentId: owner.roles.includes("AGENT") ? ownerId : input.assignedAgentId,
        propertyOwnerName: input.propertyOwnerName ?? input.landlordName ?? owner.name,
        propertyOwnerEmail: input.propertyOwnerEmail?.trim().toLowerCase(),
        propertyOwnerPhone: input.propertyOwnerPhone ?? input.phone ?? owner.phone,
        duplicateOwnerReviewStatus: duplicateOwner ? "PENDING_ADMIN_REVIEW" : "NOT_REQUIRED",
        duplicateOwnerMatchId: duplicateOwner?.id,
        ownerAgreementAccepted: Boolean(input.ownerAgreementAccepted),
        ownerAgreementSignedAt: input.ownerAgreementAccepted ? new Date(input.ownerAgreementSignedAt ?? new Date().toISOString()) : null,
        ownerAgreementSignerName: input.ownerAgreementSignerName ?? null,
        ownerAgreementVersion: input.ownerAgreementAccepted ? (input.ownerAgreementVersion ?? OWNER_LISTING_AGREEMENT_VERSION) : null,
      },
      include: LISTING_INCLUDE,
    });

    if (images.length || videos.length) {
      await tx.listingMedia.createMany({
        data: [
          ...images.map((url, index) => ({
            listingId: listing.id,
            url,
            publicId: mediaPublicId(url),
            mediaType: "image",
            sortOrder: index,
          })),
          ...videos.map((url, index) => ({
            listingId: listing.id,
            url,
            publicId: mediaPublicId(url),
            mediaType: "video",
            sortOrder: images.length + index,
          })),
        ],
      });
    }

    return tx.listing.findUniqueOrThrow({ where: { id: listing.id }, include: LISTING_INCLUDE });
  });

  if (input.ownerAgreementAccepted) {
    await createSignedAgreement({
      subjectType: "LISTING_OWNER_AGREEMENT",
      subjectId: created.id,
      listingId: created.id,
      title: "HomeLink Zimbabwe Property Owner Listing Agreement",
      signerUserId: ownerId,
      signerName: input.ownerAgreementSignerName ?? input.propertyOwnerName ?? owner.name,
      signerEmail: input.propertyOwnerEmail ?? owner.email,
      signerRole: "PROPERTY_OWNER",
      signatureText: input.ownerAgreementSignerName ?? input.propertyOwnerName ?? owner.name,
      agreementText: HOMELINK_OWNER_LISTING_AGREEMENT,
      signatureImageDataUrl: input.ownerAgreementSignatureImage,
    }).catch(() => null);
  }

  return toListingRecord(created);
}

export async function listListingsFromPostgres(query: {
  status?: string;
  type?: string;
  intent?: string;
  q?: string;
  includeDeleted?: boolean;
} = {}) {
  assertPostgresConfigured();
  const prisma = getMainPrisma();
  const where = {
    ...(query.status && STATUS_TO_DB[query.status] ? { status: STATUS_TO_DB[query.status] } : {}),
    ...(!query.status && !query.includeDeleted ? { status: { not: DbListingStatus.DELETED } } : {}),
    ...(query.type ? { propertyType: PROPERTY_TYPE_TO_DB[query.type as PropertyType] } : {}),
    ...(query.intent ? { intent: normalizeIntent(query.intent) } : {}),
    ...(query.q
      ? {
          OR: [
            { id: { contains: query.q, mode: "insensitive" } },
            { title: { contains: query.q, mode: "insensitive" } },
            { city: { contains: query.q, mode: "insensitive" } },
            { suburb: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  } satisfies Prisma.ListingWhereInput;
  const rows = await prisma.listing.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: LISTING_INCLUDE,
  }).catch(async (error: unknown) => {
    if (!isMissingColumnError(error)) throw error;
    return prisma.listing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: SAFE_LISTING_SELECT,
    });
  });
  return rows.map(toListingRecord);
}

function publicListingWhere(
  query: ListingQuery,
  cursor: (DecodedListingCursor & { price?: number; verifiedAt?: Date | null }) | null,
  sort: ListingSort,
) {
  const and: Prisma.ListingWhereInput[] = [
    { status: { in: [DbListingStatus.ACTIVE, DB_VIEWING_IN_PROGRESS] } },
  ];

  if (query.intent) and.push({ intent: normalizeIntent(query.intent) });
  if (query.type && query.type !== "holiday_home") and.push({ propertyType: PROPERTY_TYPE_TO_DB[query.type] });
  if (query.city) and.push({ city: { contains: query.city, mode: "insensitive" } });
  if (query.suburb) and.push({ suburb: { contains: query.suburb, mode: "insensitive" } });
  if (query.minPrice) and.push({ price: { gte: query.minPrice } });
  if (query.maxPrice) and.push({ price: { lte: query.maxPrice } });
  if (query.bedrooms) and.push({ bedrooms: { gte: query.bedrooms } });
  if (query.bathrooms) and.push({ bathrooms: { gte: query.bathrooms } });
  if (query.verifiedOnly) and.push({ verifiedAt: { not: null } });
  if (query.availableNow) and.push({ OR: [{ availableFrom: null }, { availableFrom: { lte: new Date() } }] });

  if (query.location) {
    const tokens = query.location.split(/\s+/).map((token) => token.trim()).filter(Boolean);
    for (const token of tokens) {
      and.push({
        OR: [
          { city: { contains: token, mode: "insensitive" } },
          { suburb: { contains: token, mode: "insensitive" } },
          { title: { contains: token, mode: "insensitive" } },
          { description: { contains: token, mode: "insensitive" } },
        ],
      });
    }
  }

  const amenityFilters = amenityWhere(query.amenities);
  if (amenityFilters.length) and.push(...amenityFilters);

  if (query.pool) and.push({ swimmingPool: true });
  if (query.wifi) and.push({ wifi: true });
  if (query.petFriendly) and.push({ petFriendly: true });

  if (cursor) {
    and.push(cursorWhere(cursor, sort));
  }

  return { AND: and } satisfies Prisma.ListingWhereInput;
}

function cursorWhere(
  cursor: DecodedListingCursor & { price?: number; verifiedAt?: Date | null },
  sort: ListingSort,
): Prisma.ListingWhereInput {
  const createdTieBreak = [
    { createdAt: { lt: cursor.createdAt } },
    { createdAt: cursor.createdAt, id: { lt: cursor.id } },
  ];
  if ((sort === "price_asc" || sort === "price_desc") && typeof cursor.price === "number") {
    return {
      OR: [
        { price: sort === "price_asc" ? { gt: cursor.price } : { lt: cursor.price } },
        { price: cursor.price, OR: createdTieBreak },
      ],
    };
  }
  if (sort === "verified") {
    if (cursor.verifiedAt) {
      return {
        OR: [
          { verifiedAt: { lt: cursor.verifiedAt } },
          { verifiedAt: null },
          { verifiedAt: cursor.verifiedAt, OR: createdTieBreak },
        ],
      };
    }
    return { verifiedAt: null, OR: createdTieBreak };
  }
  return { OR: createdTieBreak };
}

function amenityWhere(amenities?: string[]) {
  if (!amenities?.length) return [];
  const filters: Prisma.ListingWhereInput[] = [];
  for (const amenity of amenities) {
    const normalized = amenity.toLowerCase();
    const flag = AMENITY_FLAGS.find(([, pattern]) => pattern.test(normalized))?.[0];
    if (flag) filters.push({ [flag]: true } as Prisma.ListingWhereInput);
  }
  return filters;
}

type DecodedListingCursor = { createdAt: Date; id: string };

function listingOrderBy(sort: ListingSort) {
  if (sort === "price_asc") return [{ price: "asc" as const }, { createdAt: "desc" as const }, { id: "desc" as const }];
  if (sort === "price_desc") return [{ price: "desc" as const }, { createdAt: "desc" as const }, { id: "desc" as const }];
  if (sort === "verified") return [{ verifiedAt: { sort: "desc" as const, nulls: "last" as const } }, { createdAt: "desc" as const }, { id: "desc" as const }];
  return [{ createdAt: "desc" as const }, { id: "desc" as const }];
}

function encodeListingCursor(row: PrismaListingRow | SafeListingRow, sort: ListingSort) {
  const payload: Record<string, string | number | null> = {
    sort,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
  };
  if (sort === "price_asc" || sort === "price_desc") payload.price = Number(row.price);
  if (sort === "verified") payload.verifiedAt = row.verifiedAt?.toISOString() ?? null;
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeListingCursor(cursor: string | undefined, sort: ListingSort): (DecodedListingCursor & { price?: number; verifiedAt?: Date | null }) | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      sort?: unknown;
      createdAt?: unknown;
      id?: unknown;
      price?: unknown;
      verifiedAt?: unknown;
    };
    if (parsed.sort !== sort) return null;
    if (typeof parsed.createdAt !== "string" || typeof parsed.id !== "string") return null;
    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime())) return null;
    return {
      createdAt,
      id: parsed.id,
      price: typeof parsed.price === "number" && Number.isFinite(parsed.price) ? parsed.price : undefined,
      verifiedAt: typeof parsed.verifiedAt === "string" ? new Date(parsed.verifiedAt) : null,
    };
  } catch {
    return null;
  }
}

export async function listPublicListingsPageFromPostgres(
  query: ListingQuery,
  pagination: ListingPagination,
  sort: ListingSort = "newest",
) {
  assertPostgresConfigured();
  const prisma = getMainPrisma();
  const cursor = decodeListingCursor(pagination.cursor, sort);
  const where = publicListingWhere(query, cursor, sort);
  const take = pagination.limit + 1;
  const orderBy = listingOrderBy(sort);

  const rows = await prisma.listing.findMany({
    where,
    orderBy,
    take,
    include: LISTING_INCLUDE,
  }).catch(async (error: unknown) => {
    if (!isMissingColumnError(error)) throw error;
    return prisma.listing.findMany({
      where,
      orderBy,
      take,
      select: SAFE_LISTING_SELECT,
    });
  });

  const pageRows = rows.slice(0, pagination.limit);
  const last = pageRows.at(-1);

  return {
    listings: pageRows.map(toListingRecord),
    nextCursor: rows.length > pagination.limit && last && "createdAt" in last
      ? encodeListingCursor(last, sort)
      : null,
    hasMore: rows.length > pagination.limit,
  };
}

export async function getListingFromPostgres(id: string) {
  assertPostgresConfigured();
  const row = await getListingRow(id).catch(async (error: unknown) => {
    if (!isMissingColumnError(error)) throw error;
    return getSafeListingRow(id);
  });
  return row ? toListingRecord(row) : null;
}

export async function getListingByIdOrSlugFromPostgres(value: string) {
  assertPostgresConfigured();
  const direct = await getListingFromPostgres(value);
  if (direct) return direct;

  const slug = slugify(value);
  const storedSlugRow = await getMainPrisma().listing.findUnique({
    where: { slug },
    include: LISTING_INCLUDE,
  }).catch(async (error: unknown) => {
    if (!isMissingColumnError(error)) throw error;
    return null;
  });
  if (storedSlugRow) return toListingRecord(storedSlugRow);

  const rows = await getMainPrisma().listing.findMany({
    select: { id: true, title: true },
    take: 1000,
  });
  const match = rows.find((listing) => listingSlug(listing.id, listing.title) === slug || slugify(listing.title) === slug);
  const row = match ? await getListingRow(match.id) : null;
  return row ? toListingRecord(row) : null;
}

export async function incrementListingViewsInPostgres(id: string) {
  await getMainPrisma().listing.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => null);
}

export async function updateListingInPostgres(id: string, updates: ListingInput) {
  assertPostgresConfigured();
  const prisma = getMainPrisma();
  const existing = await getListingRow(id);
  if (!existing) return null;
  if (updates.status === "VIEWING_IN_PROGRESS") {
    await ensureViewingStatusEnumValue();
  }
  if (updates.status && !isAllowedAvailabilityStatus(existing.intent.toLowerCase(), updates.status) && ["ACTIVE", "VIEWING_IN_PROGRESS", "RENTED", "SOLD"].includes(updates.status)) {
    return null;
  }
  const type = updates.type ?? PROPERTY_TYPE_FROM_DB[existing.propertyType] ?? "room";
  const images = updates.images ?? (updates.image ? [updates.image] : undefined);
  const videos = updates.videos;

  const updated = await prisma.$transaction(async (tx) => {
    if (images || videos) {
      await tx.listingMedia.deleteMany({ where: { listingId: id } });
      await tx.listingMedia.createMany({
        data: [
          ...(images ?? []).map((url, index) => ({
            listingId: id,
            url,
            publicId: mediaPublicId(url),
            mediaType: "image",
            sortOrder: index,
          })),
          ...(videos ?? []).map((url, index) => ({
            listingId: id,
            url,
            publicId: mediaPublicId(url),
            mediaType: "video",
            sortOrder: (images?.length ?? 0) + index,
          })),
        ],
      });
    }

    await tx.listing.update({
      where: { id },
      data: {
        ...(updates.title !== undefined ? { title: sanitizeText(updates.title, existing.title) } : {}),
        ...(updates.description !== undefined ? { description: sanitizeText(updates.description, existing.description) } : {}),
        ...(updates.city !== undefined ? { city: sanitizeText(updates.city, existing.city) } : {}),
        ...(updates.suburb !== undefined ? { suburb: sanitizeText(updates.suburb, existing.suburb) } : {}),
        ...(updates.price !== undefined ? { price: Number(updates.price) } : {}),
        ...(updates.intent !== undefined ? { intent: normalizeIntent(updates.intent) } : {}),
        ...(updates.type !== undefined ? { propertyType: PROPERTY_TYPE_TO_DB[type] } : {}),
        ...(updates.status !== undefined ? { status: STATUS_TO_DB[updates.status] ?? existing.status } : {}),
        ...(updates.verified !== undefined ? { verifiedAt: updates.verified ? new Date() : null } : {}),
        ...(updates.featured !== undefined ? { featured: updates.featured } : {}),
        ...(updates.featuredUntil !== undefined ? { featuredUntil: parseDate(updates.featuredUntil) } : {}),
        ...(updates.adminNotes !== undefined ? { adminNotes: updates.adminNotes } : {}),
        ...(updates.availableFrom !== undefined ? { availableFrom: parseAvailableFrom(updates.availableFrom) } : {}),
        ...(updates.latitude !== undefined ? { latitude: updates.latitude } : {}),
        ...(updates.longitude !== undefined ? { longitude: updates.longitude } : {}),
        ...(updates.bedrooms !== undefined ? { bedrooms: Number(updates.bedrooms) } : {}),
        ...(updates.bathrooms !== undefined ? { bathrooms: Number(updates.bathrooms) } : {}),
        ...amenityBooleans(updates),
        ...(updates.propertyOwnerName !== undefined ? { propertyOwnerName: updates.propertyOwnerName } : {}),
        ...(updates.propertyOwnerEmail !== undefined ? { propertyOwnerEmail: updates.propertyOwnerEmail?.trim().toLowerCase() } : {}),
        ...(updates.propertyOwnerPhone !== undefined ? { propertyOwnerPhone: updates.propertyOwnerPhone } : {}),
        ...(updates.ownerAgreementAccepted !== undefined ? { ownerAgreementAccepted: updates.ownerAgreementAccepted } : {}),
        ...(updates.ownerAgreementSignedAt !== undefined
          ? { ownerAgreementSignedAt: parseDate(updates.ownerAgreementSignedAt) }
          : {}),
        ...(updates.ownerAgreementSignerName !== undefined ? { ownerAgreementSignerName: updates.ownerAgreementSignerName } : {}),
        ...(updates.ownerAgreementVersion !== undefined ? { ownerAgreementVersion: updates.ownerAgreementVersion } : {}),
        ...(updates.ownerAgreementBypassedAt !== undefined
          ? { ownerAgreementBypassedAt: parseDate(updates.ownerAgreementBypassedAt) }
          : {}),
        ...(updates.ownerAgreementBypassedById !== undefined ? { ownerAgreementBypassedById: updates.ownerAgreementBypassedById } : {}),
        ...(updates.ownerAgreementBypassedByName !== undefined ? { ownerAgreementBypassedByName: updates.ownerAgreementBypassedByName } : {}),
        ...(updates.ownerAgreementBypassedByEmail !== undefined ? { ownerAgreementBypassedByEmail: updates.ownerAgreementBypassedByEmail } : {}),
        ...(updates.ownerAgreementBypassReason !== undefined ? { ownerAgreementBypassReason: updates.ownerAgreementBypassReason } : {}),
      },
    });
    return tx.listing.findUniqueOrThrow({ where: { id }, include: LISTING_INCLUDE });
  });

  return toListingRecord(updated);
}

export async function listAdminListingsFromPostgres(filters: {
  q?: string;
  status?: string;
  type?: string;
  intent?: string;
  includeDeleted?: boolean;
} = {}) {
  const listings = await listListingsFromPostgres(filters);
  return listings.map((l) => ({
    id: l.id,
    slug: l.slug,
    title: l.title,
    city: l.city,
    suburb: l.suburb,
    type: l.type,
    intent: l.intent,
    price: l.price,
    status: l.status,
    verified: l.verified,
    featured: l.featured ?? false,
    views: l.views,
    saves: l.saves,
    enquiries: l.enquiries,
    ownerId: l.ownerId,
    ownerName: l.landlordName,
    ownerEmail: undefined,
    ownerAgreementAccepted: l.ownerAgreementAccepted ?? false,
    ownerAgreementSignerName: l.ownerAgreementSignerName,
    ownerAgreementSignedAt: l.ownerAgreementSignedAt,
    ownerAgreementBypassedAt: l.ownerAgreementBypassedAt,
    ownerAgreementBypassedByName: l.ownerAgreementBypassedByName,
    ownerAgreementBypassedByEmail: l.ownerAgreementBypassedByEmail,
    ownerAgreementBypassReason: l.ownerAgreementBypassReason,
    virtualTour: l.virtualTour,
    virtualTourStatus: l.virtualTour?.status,
    virtualTourSceneCount: l.virtualTour?.scenes.length ?? 0,
    virtualTourVerified: Boolean(l.virtualTour?.adminVerifiedAt),
    createdAt: l.availableFrom,
  }));
}

export async function summarizeListingsFromPostgres() {
  const all = await listListingsFromPostgres({ includeDeleted: true });
  return {
    total: all.filter((l) => l.status !== "DELETED").length,
    active: all.filter((l) => l.status === "ACTIVE").length,
    pending: all.filter((l) => l.status === "PENDING_REVIEW").length,
    viewing: all.filter((l) => l.status === "VIEWING_IN_PROGRESS").length,
    rejected: all.filter((l) => l.status === "REJECTED").length,
    archived: all.filter((l) => l.status === "ARCHIVED").length,
    deleted: all.filter((l) => l.status === "DELETED").length,
    featured: all.filter((l) => l.featured).length,
    unverified: all.filter((l) => !l.verified && l.status === "ACTIVE").length,
    draft: all.filter((l) => l.status === "DRAFT").length,
    expired: all.filter((l) => l.status === "EXPIRED").length,
    rented: all.filter((l) => l.status === "RENTED").length,
    sold: all.filter((l) => l.status === "SOLD").length,
    holiday: all.filter((l) => l.type === "holiday_home").length,
    commercial: all.filter((l) => l.type === "commercial").length,
    virtualTours: all.filter((l) => l.virtualTour?.status === "PUBLISHED").length,
  };
}

export async function adminListingActionInPostgres(
  listingId: string,
  action: string,
  updates: ListingInput = {},
  options: {
    reason?: string;
    days?: number;
    actor?: { id: string; name: string; email: string };
    bypassOwnerAgreement?: boolean;
    bypassReason?: string;
  } = {},
) {
  const statusUpdates: Record<string, ListingRecord["status"]> = {
    approve: "ACTIVE",
    mark_available: "ACTIVE",
    mark_viewing: "VIEWING_IN_PROGRESS",
    mark_let: "RENTED",
    mark_rented: "RENTED",
    mark_sold: "SOLD",
    reject: "REJECTED",
    archive: "ARCHIVED",
    restore: "ACTIVE",
    delete: "DELETED",
  };
  if (action === "verify") return updateListingInPostgres(listingId, { verified: true });
  if (action === "unverify") return updateListingInPostgres(listingId, { verified: false });
  if (action === "save_virtual_tour") {
    return saveListingVirtualTourInPostgres(listingId, updates.virtualTour, options.actor);
  }
  if (action === "feature") return updateListingInPostgres(listingId, { featured: true, featuredUntil: addDays(options.days ?? 7) });
  if (action === "unfeature") return updateListingInPostgres(listingId, { featured: false, featuredUntil: "" });
  if (action === "edit") return updateListingInPostgres(listingId, updates);
  if (action === "approve") {
    const current = await getListingFromPostgres(listingId);
    if (!current) return null;
    const bypassReason = options.bypassReason?.trim() ?? "";
    let bypassRecord: ReturnType<typeof buildOwnerAgreementBypassRecord> | undefined;
    if (!listingHasOwnerAgreement(current)) {
      if (!options.bypassOwnerAgreement || !bypassReason || !options.actor) {
        throw new ListingApprovalError("Owner must sign the HomeLink listing agreement before this listing can go live.");
      }
      bypassRecord = buildOwnerAgreementBypassRecord({
        bypassOwnerAgreement: true,
        bypassReason,
        actor: options.actor,
      });
      await recordPostgresAuditEvent({
        actorId: options.actor.id,
        action: "APPROVE_LISTING_BYPASS_OWNER_AGREEMENT",
        target: listingId,
        metadata: {
          bypassOwnerAgreement: true,
          bypassReason,
          adminName: options.actor.name,
          adminEmail: options.actor.email,
          listingTitle: current.title,
        },
      });
    }
    return updateListingInPostgres(listingId, {
      status: "ACTIVE",
      ...(options.reason ? { adminNotes: options.reason } : {}),
      ...bypassRecord,
    });
  }
  if (statusUpdates[action]) {
    const nextStatus = statusUpdates[action];
    const current = await getListingFromPostgres(listingId);
    if (!current || !isAllowedAvailabilityStatus(current.intent, nextStatus)) return null;
    return updateListingInPostgres(listingId, {
      status: nextStatus,
      ...(nextStatus === "RENTED" ? { availableFrom: "Let" } : {}),
      ...(nextStatus === "ACTIVE" ? { availableFrom: "Available now" } : {}),
      ...(options.reason ? { adminNotes: options.reason } : {}),
    });
  }
  return null;
}

export async function saveListingVirtualTourInPostgres(
  listingId: string,
  virtualTour: ListingVirtualTour | undefined,
  actor?: { id: string; name: string; email: string },
) {
  assertPostgresConfigured();
  const existing = await getListingRow(listingId);
  if (!existing) return null;
  const input = normalizeVirtualTourInput(virtualTour);
  const prisma = getMainPrisma();

  await prisma.$transaction(async (tx) => {
    const previous = await tx.listingVirtualTour.findUnique({ where: { listingId }, select: { id: true } });
    if (!input) {
      if (previous) await tx.listingVirtualTour.delete({ where: { id: previous.id } });
      return;
    }

    const sceneData = input.scenes.map((scene, index) => ({
      id: scene.id,
      title: scene.title,
      imageUrl: scene.imageUrl,
      sortOrder: index,
      hotspots: scene.hotspots?.length ? scene.hotspots : Prisma.JsonNull,
    }));

    if (previous) {
      await tx.virtualTourScene.deleteMany({ where: { tourId: previous.id } });
      await tx.listingVirtualTour.update({
        where: { id: previous.id },
        data: {
          title: input.title,
          status: input.status,
          provider: input.provider,
          externalUrl: input.externalUrl ?? null,
          coverSceneId: input.coverSceneId ?? null,
          adminVerifiedAt: input.adminVerifiedAt ? new Date(input.adminVerifiedAt) : null,
          scenes: { create: sceneData },
        },
      });
    } else {
      await tx.listingVirtualTour.create({
        data: {
          listingId,
          title: input.title,
          status: input.status,
          provider: input.provider,
          externalUrl: input.externalUrl ?? null,
          coverSceneId: input.coverSceneId ?? null,
          adminVerifiedAt: input.adminVerifiedAt ? new Date(input.adminVerifiedAt) : null,
          scenes: { create: sceneData },
        },
      });
    }
  });

  if (actor) {
    await recordPostgresAuditEvent({
      actorId: actor.id,
      action: "SAVE_LISTING_VIRTUAL_TOUR",
      target: listingId,
      metadata: {
        status: input?.status ?? "REMOVED",
        sceneCount: input?.scenes.length ?? 0,
      },
    });
  }

  return getListingFromPostgres(listingId);
}

export async function transferListingInPostgres(listingId: string, newOwnerId: string) {
  await ensureUserInPostgres(newOwnerId);
  return updateListingOwnerInPostgres(listingId, newOwnerId);
}

export async function userOwnsListingInPostgres(listingId: string, userId: string) {
  assertPostgresConfigured();
  const listing = await getMainPrisma().listing.findUnique({
    where: { id: listingId },
    select: { ownerId: true },
  });
  return listing?.ownerId === userId;
}

export async function addListingMediaInPostgres(listingId: string, userId: string, urls: string[], mediaType: "image" | "video" = "image") {
  assertPostgresConfigured();
  if (!(await userOwnsListingInPostgres(listingId, userId))) return null;

  const prisma = getMainPrisma();
  const count = await prisma.listingMedia.count({ where: { listingId } });
  await prisma.listingMedia.createMany({
    data: urls.map((url, index) => ({
      listingId,
      url,
      publicId: mediaPublicId(url),
      mediaType,
      sortOrder: count + index,
    })),
  });
  return getListingFromPostgres(listingId);
}

export function toPublicPostgresListing(listing: ListingRecord): Listing {
  const {
    ownerId: _ownerId,
    phone: _phone,
    whatsapp: _whatsapp,
    propertyOwnerEmail: _propertyOwnerEmail,
    propertyOwnerPhone: _propertyOwnerPhone,
    ...publicListing
  } = listing;
  return { ...publicListing, phone: "", whatsapp: "" };
}

async function ensureUserInPostgres(userId: string) {
  const prisma = getMainPrisma();
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (existing) return existing;
  if (isStrictProductionMode()) {
    throw new Error(`Authenticated user ${userId} does not exist in Postgres.`);
  }

  const storeUser = getStore().getUserById(userId);
  if (!storeUser) {
    throw new Error(`Authenticated user ${userId} does not exist in Postgres and could not be backfilled.`);
  }

  return prisma.user.create({
    data: {
      id: storeUser.id,
      email: storeUser.email,
      phone: storeUser.phone,
      name: storeUser.name,
      roles: normalizeRoles(storeUser),
      identityStatus: storeUser.verification.identity,
      phoneVerifiedAt: storeUser.verification.phone === "VERIFIED" ? new Date() : null,
      emailVerifiedAt: storeUser.verification.email === "VERIFIED" ? new Date() : null,
      createdAt: parseDate(storeUser.createdAt) ?? new Date(),
    },
  });
}

async function findDuplicateOwnerListing(input: ListingInput) {
  const email = input.propertyOwnerEmail?.trim().toLowerCase();
  const phone = input.propertyOwnerPhone?.trim();
  if (!email && !phone) return null;
  return getMainPrisma().listing.findFirst({
    where: {
      OR: [
        ...(email ? [{ propertyOwnerEmail: email }] : []),
        ...(phone ? [{ propertyOwnerPhone: phone }] : []),
      ],
    },
    select: { id: true },
  });
}

async function getListingRow(id: string): Promise<PrismaListingRow | SafeListingRow | null> {
  return getMainPrisma().listing.findUnique({ where: { id }, include: LISTING_INCLUDE });
}

async function getSafeListingRow(id: string): Promise<SafeListingRow | null> {
  return getMainPrisma().listing.findUnique({
    where: { id },
    select: SAFE_LISTING_SELECT,
  });
}

function toListingRecord(row: PrismaListingRow | SafeListingRow): ListingRecord {
  const images = row.media
    .filter((m) => m.mediaType === "image")
    .map((m) => resolvePublicImageUrl(m.url) ?? m.url)
    .filter(Boolean);
  const videos = row.media.filter((m) => m.mediaType === "video").map((m) => m.url);
  const type = PROPERTY_TYPE_FROM_DB[row.propertyType] ?? "room";
  const amenities = amenitiesFromRow(row);
  const fallbackImage = resolvePublicImageUrl(fallbackListingImage(type)) ?? fallbackListingImage(type);
  return {
    id: row.id,
    slug: "slug" in row && row.slug ? row.slug : listingSlug(row.id, row.title),
    title: row.title,
    city: row.city,
    suburb: row.suburb,
    price: Number(row.price),
    currency: "USD",
    intent: row.intent.toLowerCase() as PublicListingIntent,
    type,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    image: images[0] ?? fallbackImage,
    images: images.length ? images : [fallbackImage],
    videos,
    verified: Boolean(row.verifiedAt),
    featured: "featured" in row ? row.featured : false,
    featuredUntil: "featuredUntil" in row ? row.featuredUntil?.toISOString() : undefined,
    availableFrom: row.availableFrom ? row.availableFrom.toISOString().slice(0, 10) : "Available now",
    amenities,
    description: row.description,
    landlordName: "propertyOwnerName" in row ? row.propertyOwnerName ?? row.owner.name : row.owner.name,
    landlordVerified: row.owner.identityStatus === "VERIFIED",
    phone: "propertyOwnerPhone" in row ? row.propertyOwnerPhone ?? row.owner.phone ?? "" : row.owner.phone ?? "",
    whatsapp: "propertyOwnerPhone" in row ? row.propertyOwnerPhone ?? row.owner.phone ?? "" : row.owner.phone ?? "",
    distanceToCbdKm: 5,
    nearby: amenities,
    views: "views" in row ? row.views : 0,
    saves: row._count.favourites,
    enquiries: row._count.enquiries,
    trustScore: row.verifiedAt ? 90 : 70,
    highlight: row.verifiedAt ? "Verified listing" : "New listing",
    ownerId: row.ownerId,
    status: DB_STATUS_TO_APP[row.status] ?? "PENDING_REVIEW",
    latitude: Number(row.latitude ?? -17.8292),
    longitude: Number(row.longitude ?? 31.0522),
    leadSource: "leadSource" in row ? (row.leadSource as "HOMELINK" | "AGENT") : "HOMELINK",
    leadCreatedById: "leadCreatedById" in row ? row.leadCreatedById ?? undefined : undefined,
    assignedAgentId: "assignedAgentId" in row ? row.assignedAgentId ?? undefined : undefined,
    propertyOwnerName: "propertyOwnerName" in row ? row.propertyOwnerName ?? undefined : undefined,
    propertyOwnerEmail: "propertyOwnerEmail" in row ? row.propertyOwnerEmail ?? undefined : undefined,
    propertyOwnerPhone: "propertyOwnerPhone" in row ? row.propertyOwnerPhone ?? undefined : undefined,
    duplicateOwnerReviewStatus: "duplicateOwnerReviewStatus" in row ? row.duplicateOwnerReviewStatus as ListingRecord["duplicateOwnerReviewStatus"] : "NOT_REQUIRED",
    duplicateOwnerMatchId: "duplicateOwnerMatchId" in row ? row.duplicateOwnerMatchId ?? undefined : undefined,
    ownerAgreementAccepted: "ownerAgreementAccepted" in row ? row.ownerAgreementAccepted : false,
    ownerAgreementSignedAt:
      "ownerAgreementSignedAt" in row && row.ownerAgreementSignedAt ? row.ownerAgreementSignedAt.toISOString() : undefined,
    ownerAgreementSignerName: "ownerAgreementSignerName" in row ? row.ownerAgreementSignerName ?? undefined : undefined,
    ownerAgreementVersion: "ownerAgreementVersion" in row ? row.ownerAgreementVersion ?? undefined : undefined,
    ownerAgreementBypassedAt:
      "ownerAgreementBypassedAt" in row && row.ownerAgreementBypassedAt instanceof Date
        ? row.ownerAgreementBypassedAt.toISOString()
        : undefined,
    ownerAgreementBypassedById:
      "ownerAgreementBypassedById" in row ? (row.ownerAgreementBypassedById as string | null) ?? undefined : undefined,
    ownerAgreementBypassedByName:
      "ownerAgreementBypassedByName" in row ? (row.ownerAgreementBypassedByName as string | null) ?? undefined : undefined,
    ownerAgreementBypassedByEmail:
      "ownerAgreementBypassedByEmail" in row ? (row.ownerAgreementBypassedByEmail as string | null) ?? undefined : undefined,
    ownerAgreementBypassReason:
      "ownerAgreementBypassReason" in row ? (row.ownerAgreementBypassReason as string | null) ?? undefined : undefined,
    adminNotes: "adminNotes" in row ? row.adminNotes ?? undefined : undefined,
    virtualTour: "virtualTour" in row ? toListingVirtualTour(row.virtualTour) : undefined,
  };
}

function normalizeVirtualTourInput(input?: ListingVirtualTour): ListingVirtualTour | null {
  if (!input) return null;
  const provider = input.provider === "EXTERNAL" ? "EXTERNAL" : "INTERNAL";
  const scenes = (input.scenes ?? [])
    .filter((scene) => scene.title?.trim() && scene.imageUrl?.trim())
    .map((scene, index) => ({
      id: scene.id?.trim() || `scene_${crypto.randomUUID()}`,
      title: scene.title.trim(),
      imageUrl: scene.imageUrl.trim(),
      sortOrder: index,
      hotspots: scene.hotspots ?? [],
    }));
  const externalUrl = input.externalUrl?.trim();
  if (provider === "INTERNAL" && !scenes.length) return null;
  if (provider === "EXTERNAL" && !externalUrl) return null;
  const status = input.status === "PUBLISHED" || input.status === "HIDDEN" ? input.status : "DRAFT";
  return {
    id: input.id,
    title: input.title?.trim() || "Virtual tour",
    status,
    provider,
    externalUrl: provider === "EXTERNAL" ? externalUrl : undefined,
    coverSceneId: input.coverSceneId || scenes[0]?.id,
    adminVerifiedAt: input.adminVerifiedAt,
    scenes,
  };
}

function toListingVirtualTour(
  tour: PrismaListingRow["virtualTour"] | null | undefined,
): ListingVirtualTour | undefined {
  if (!tour) return undefined;
  return {
    id: tour.id,
    title: tour.title,
    status: tour.status === "PUBLISHED" || tour.status === "HIDDEN" ? tour.status : "DRAFT",
    provider: tour.provider === "EXTERNAL" ? "EXTERNAL" : "INTERNAL",
    externalUrl: tour.externalUrl ?? undefined,
    coverSceneId: tour.coverSceneId ?? undefined,
    adminVerifiedAt: tour.adminVerifiedAt?.toISOString(),
    scenes: tour.scenes.map((scene) => ({
      id: scene.id,
      title: scene.title,
      imageUrl: resolvePublicImageUrl(scene.imageUrl) ?? scene.imageUrl,
      sortOrder: scene.sortOrder,
      hotspots: Array.isArray(scene.hotspots)
        ? (scene.hotspots as ListingVirtualTour["scenes"][number]["hotspots"])
        : [],
    })),
  };
}

function amenityBooleans(input: ListingInput) {
  const amenities = input.amenities ?? [];
  return Object.fromEntries(
    AMENITY_FLAGS.map(([field, pattern]) => [
      field,
      amenities.some((amenity) => pattern.test(amenity)) || Boolean(input.listingDetails?.[field as keyof NonNullable<ListingInput["listingDetails"]>]),
    ]),
  );
}

function amenitiesFromRow(row: PrismaListingRow | SafeListingRow) {
  const labels: Record<(typeof AMENITY_FLAGS)[number][0], string> = {
    furnished: "Furnished",
    parking: "Parking",
    petFriendly: "Pet friendly",
    wifi: "Wi-Fi",
    solarBackup: "Solar backup",
    borehole: "Borehole",
    generator: "Generator",
    waterTank: "Water tank",
    securityWall: "Security wall",
    electricFence: "Electric fence",
    garden: "Garden",
    swimmingPool: "Swimming pool",
  };
  return AMENITY_FLAGS.filter(([field]) => Boolean(row[field])).map(([field]) => labels[field]);
}

function normalizeMedia(images?: string[], image?: string) {
  return [...new Set([...(images ?? []), image].filter((url): url is string => Boolean(url?.trim())))];
}

function sanitizeText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeIntent(value?: string) {
  return value === "buy" || value === DbListingIntent.BUY ? DbListingIntent.BUY : DbListingIntent.RENT;
}

function normalizeLeadSource(value?: string) {
  return value === "AGENT" ? DbLeadSource.AGENT : DbLeadSource.HOMELINK;
}

function normalizeRoles(user: StoreUser) {
  const allowed = new Set<string>(Object.values(DbRole));
  const roles = user.roles.filter((role): role is DbRole => allowed.has(role));
  return roles.length ? roles : [DbRole.SEEKER];
}

function parseAvailableFrom(value?: string) {
  if (!value || value.toLowerCase() === "available now") return null;
  return parseDate(value);
}

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function mediaPublicId(url: string) {
  return url.split("/").pop()?.split(".")[0] || `media_${crypto.randomUUID()}`;
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function listingSlug(id: string, title: string) {
  const suffix = id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toLowerCase();
  const base = slugify(title) || "listing";
  return suffix ? `${base}-${suffix}` : base;
}

async function updateListingOwnerInPostgres(listingId: string, newOwnerId: string) {
  const row = await getMainPrisma().listing
    .update({ where: { id: listingId }, data: { ownerId: newOwnerId }, include: LISTING_INCLUDE })
    .catch(() => null);
  return row ? toListingRecord(row) : null;
}

function fallbackListingImage(type?: PropertyType) {
  if (type === "land") return "/images/roommates/photo-land-mutare.jpg";
  if (type === "commercial") return "/images/roommates/photo-office-harare.jpg";
  if (type === "holiday_home") return "/images/roommates/photo-lodge-vicfalls.jpg";
  return "/images/roommates/photo-cottage-avondale.jpg";
}

function assertPostgresConfigured() {
  if (!isPostgresStoreEnabled()) {
    throw new Error("DATABASE_URL must point to PostgreSQL for production listing persistence.");
  }
}

async function ensureViewingStatusEnumValue() {
  await getMainPrisma().$executeRawUnsafe(`ALTER TYPE "ListingStatus" ADD VALUE IF NOT EXISTS 'VIEWING_IN_PROGRESS'`);
}

function isMissingColumnError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022";
}
