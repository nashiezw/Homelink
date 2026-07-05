import { PaymentProvider, PaymentStatus, Role, VerificationStatus, type Prisma } from "@prisma/client";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { createDefaultHomepageCms } from "@/lib/homepage/cms-defaults";
import type { HomepageCmsConfig } from "@/lib/homepage/cms-types";
import { defaultPaymentSettings, defaultPlatformSettings, getPlatformIntegrationEnvOverrides } from "@/lib/settings/defaults";
import { mergePaymentSettings, mergePlatformSettings } from "@/lib/settings/merge";
import type { PaymentSettings, PlatformSettings } from "@/lib/settings/types";
import { redactPaymentSettingsForAdmin } from "@/lib/settings/redact";

const SNAPSHOT_ID = "singleton";
const SNAPSHOT_VERSION = 1;

type SnapshotPayload = {
  platformSettings?: Partial<PlatformSettings>;
  paymentSettings?: Partial<PaymentSettings>;
  homepage?: { cms?: Partial<HomepageCmsConfig> };
};

export async function getPostgresPlatformSettings() {
  const payload = await readSnapshotPayload();
  const settings = mergePlatformSettings(defaultPlatformSettings, payload.platformSettings ?? {});
  return {
    ...settings,
    integrations: {
      ...settings.integrations,
      ...getPlatformIntegrationEnvOverrides(),
    },
  };
}

export async function getPostgresPaymentSettings() {
  const payload = await readSnapshotPayload();
  return mergePaymentSettings(defaultPaymentSettings, payload.paymentSettings ?? {});
}

export async function savePostgresPlatformSettings(settings: Partial<PlatformSettings>) {
  const current = await getPostgresPlatformSettings();
  const merged = mergePlatformSettings(current, settings);
  await patchSnapshotPayload({ platformSettings: merged });
  return merged;
}

export async function savePostgresPaymentSettings(settings: Partial<PaymentSettings>) {
  const current = await getPostgresPaymentSettings();
  const merged = mergePaymentSettings(current, settings);
  await patchSnapshotPayload({ paymentSettings: merged });
  return merged;
}

export async function getPostgresSettingsRbac() {
  const settings = await getPostgresPlatformSettings();
  const users = await getMainPrisma().user.findMany({
    select: { id: true, name: true, email: true, roles: true, accountStatus: true },
    orderBy: { createdAt: "desc" },
  });
  return {
    rbac: settings.rbac,
    admins: users.filter((user) => user.roles.includes(Role.ADMIN)).map(toAdminUser),
    eligibleUsers: users
      .filter((user) => user.accountStatus === "ACTIVE" && !user.roles.includes(Role.ADMIN))
      .map(toAdminUser),
  };
}

export async function getPostgresPaymentSettingsResponse() {
  const settings = await getPostgresPaymentSettings();
  return {
    settings: redactPaymentSettingsForAdmin(settings),
    health: paymentHealth(settings),
    webhooks: [],
  };
}

export async function getPostgresHomepageAdminData() {
  const cms = await getPostgresHomepageCms();
  const [listings, agents] = await Promise.all([
    getMainPrisma().listing.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        title: true,
        city: true,
        propertyType: true,
        price: true,
        featured: true,
        verifiedAt: true,
        media: { orderBy: { sortOrder: "asc" }, take: 1 },
        _count: { select: { reports: true, reviews: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    getMainPrisma().user.findMany({
      where: { roles: { has: Role.AGENT } },
      select: { id: true, name: true, identityStatus: true },
      orderBy: { name: "asc" },
      take: 100,
    }),
  ]);
  const listingOptions = listings.map((listing) => ({
    id: listing.id,
    title: listing.title,
    city: listing.city,
    type: listing.propertyType,
    price: Number(listing.price),
    featured: listing.featured,
    verified: Boolean(listing.verifiedAt),
    trustScore: Math.max(35, Math.min(100, 70 + listing._count.reviews * 5 - listing._count.reports * 15)),
    image: listing.media[0]?.url,
  }));
  const agentOptions = agents.map((agent) => ({
    id: agent.id,
    userId: agent.id,
    name: agent.name,
    slug: agent.id,
    level: agent.identityStatus === VerificationStatus.VERIFIED ? "verified" : "standard",
    status: "ACTIVE",
    averageRating: 0,
    pinned: cms.featuredAgentProfileIds.includes(agent.id),
  }));
  return {
    cms,
    listings: listingOptions,
    agents: agentOptions,
    stats: {
      featuredListings: listingOptions.filter((listing) => listing.featured).length,
      pinnedListings: cms.featuredListingIds.length,
      publishedTestimonials: cms.testimonials.filter((testimonial) => testimonial.published !== false).length,
      activeBanners: cms.banners.filter((banner) => banner.enabled).length,
    },
  };
}

export async function savePostgresHomepageCms(cms: Partial<HomepageCmsConfig>) {
  const current = await getPostgresHomepageCms();
  const merged = mergeHomepageCms(current, cms);
  await patchSnapshotPayload({ homepage: { cms: merged } });
  return merged;
}

export async function patchPostgresHomepageListing(input: { listingId: string; featured?: boolean; pinned?: boolean }) {
  if (typeof input.featured === "boolean") {
    await getMainPrisma().listing.update({
      where: { id: input.listingId },
      data: {
        featured: input.featured,
        featuredUntil: input.featured ? new Date(Date.now() + 14 * 86400000) : null,
      },
    }).catch(() => null);
  }
  if (typeof input.pinned === "boolean") {
    const cms = await getPostgresHomepageCms();
    const ids = new Set(cms.featuredListingIds);
    if (input.pinned) ids.add(input.listingId);
    else ids.delete(input.listingId);
    await savePostgresHomepageCms({ featuredListingIds: [...ids] });
  }
}

export async function patchPostgresHomepageAgent(input: { profileId: string; pinned: boolean }) {
  const cms = await getPostgresHomepageCms();
  const ids = new Set(cms.featuredAgentProfileIds);
  if (input.pinned) ids.add(input.profileId);
  else ids.delete(input.profileId);
  return savePostgresHomepageCms({ featuredAgentProfileIds: [...ids] });
}

export async function getPostgresPaymentsAdminData(filters: { status?: string | null; manual?: string | null; q?: string }) {
  const settings = await getPostgresPaymentSettings();
  const statusFilter = filters.status && isPaymentStatus(filters.status) ? filters.status : undefined;
  const rows = await getMainPrisma().payment.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(filters.status === "MANUAL_REVIEW" ? { proofStatus: { in: ["UPLOADED", "REQUESTED"] }, status: PaymentStatus.PENDING } : {}),
      ...(filters.manual === "true" ? { manual: true } : filters.manual === "false" ? { manual: false } : {}),
      ...(filters.q
        ? {
            OR: [
              { description: { contains: filters.q, mode: "insensitive" } },
              { plan: { contains: filters.q, mode: "insensitive" } },
              { user: { email: { contains: filters.q, mode: "insensitive" } } },
              { user: { name: { contains: filters.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const payments = rows.map(toAdminPayment);
  const paid = payments.filter((payment) => payment.status === "PAID");
  const pending = payments.filter((payment) => ["PENDING", "MANUAL_REVIEW", "AWAITING_PROOF"].includes(payment.status));
  return {
    payments,
    escrowHolds: [],
    chargebacks: [],
    taxSummary: {
      platformCommissionPercent: settings.fees.platformCommissionPercent,
      taxPercent: settings.fees.taxPercent,
      heldInEscrow: 0,
      openChargebacks: 0,
    },
    summary: {
      total: payments.length,
      paid: paid.length,
      pending: pending.length,
      revenue: paid.reduce((sum, payment) => sum + payment.amount, 0),
      manualReview: payments.filter((payment) => payment.status === "MANUAL_REVIEW").length,
      failed: payments.filter((payment) => payment.status === "FAILED").length,
    },
    settings: redactPaymentSettingsForAdmin(settings),
    health: paymentHealth(settings),
  };
}

export async function createPostgresManualPayment(input: {
  userId: string;
  method: string;
  plan: string;
  amount: number;
  referenceNumber?: string;
  proofUrl?: string;
  listingId?: string;
  autoApprove?: boolean;
}) {
  const settings = await getPostgresPaymentSettings();
  const row = await getMainPrisma().payment.create({
    data: {
      userId: input.userId,
      listingId: input.listingId || null,
      provider: PaymentProvider.PAYNOW,
      status: input.autoApprove ? PaymentStatus.PAID : PaymentStatus.PENDING,
      amount: input.amount,
      currency: settings.currency,
      description: input.plan.replace(/_/g, " "),
      plan: input.plan,
      method: input.method,
      manual: true,
      proofUrl: input.proofUrl || null,
      proofStatus: input.proofUrl ? "UPLOADED" : "REQUESTED",
      metadata: { referenceNumber: input.referenceNumber ?? `MAN-${Date.now()}` },
    },
    include: { user: { select: { name: true, email: true } } },
  });
  return toAdminPayment(row);
}

export async function getPostgresAdminPayment(id: string) {
  const row = await getMainPrisma().payment.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!row) return null;
  const audit = await getMainPrisma().auditEvent.findMany({
    where: { target: id },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return {
    payment: toAdminPayment(row),
    audit: audit.map((entry) => ({
      id: entry.id,
      actor: entry.actor?.name ?? entry.actorId ?? "System",
      action: entry.action,
      target: entry.target,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

export async function updatePostgresPayment(id: string, action: string, reason?: string, note?: string) {
  const data: Prisma.PaymentUpdateInput = {};
  if (action === "approve") {
    data.status = PaymentStatus.PAID;
    data.proofStatus = "VERIFIED";
  } else if (action === "reject") {
    data.status = PaymentStatus.FAILED;
    data.proofStatus = "REJECTED";
  } else if (action === "refund") {
    data.status = PaymentStatus.REFUNDED;
  } else if (action === "request_proof") {
    data.proofStatus = "REQUESTED";
  } else if (action === "add_note") {
    data.metadata = { adminNote: note ?? "", notedAt: new Date().toISOString() };
  } else {
    return null;
  }
  const row = await getMainPrisma().payment.update({
    where: { id },
    data,
    include: { user: { select: { name: true, email: true } } },
  }).catch(() => null);
  if (row && reason) {
    await getMainPrisma().auditEvent.create({
      data: { action: `PAYMENT_${action.toUpperCase()}`, target: id, metadata: { reason } },
    });
  }
  return row ? toAdminPayment(row) : null;
}

export async function getPostgresAuditEntries(input: { q?: string; limit: number; offset: number }) {
  const where = input.q
    ? {
        OR: [
          { action: { contains: input.q, mode: "insensitive" as const } },
          { target: { contains: input.q, mode: "insensitive" as const } },
          { actor: { name: { contains: input.q, mode: "insensitive" as const } } },
        ],
      }
    : undefined;
  const [rows, total] = await Promise.all([
    getMainPrisma().auditEvent.findMany({
      where,
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: input.offset,
      take: input.limit,
    }),
    getMainPrisma().auditEvent.count({ where }),
  ]);
  return {
    entries: rows.map((row) => ({
      id: row.id,
      actor: row.actor?.name ?? row.actorId ?? "System",
      action: row.action,
      target: row.target,
      createdAt: row.createdAt.toISOString(),
    })),
    total,
    limit: input.limit,
    offset: input.offset,
    rawCount: total,
  };
}

export async function getPostgresRoommateAdminData(filters: { q?: string; status?: string; lookingFor?: string }) {
  const where: Prisma.RoommateProfileWhereInput = {
    ...(filters.status === "active" ? { active: true } : filters.status === "inactive" ? { active: false } : {}),
    ...(filters.lookingFor ? { payload: { path: ["lookingFor"], equals: filters.lookingFor } } : {}),
    ...(filters.q
      ? {
          OR: [
            { user: { name: { contains: filters.q, mode: "insensitive" } } },
            { user: { email: { contains: filters.q, mode: "insensitive" } } },
            { occupation: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const rows = await getMainPrisma().roommateProfile.findMany({
    where,
    include: { user: { select: { name: true, email: true, accountStatus: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const profiles = rows.map((row) => {
    const payload = jsonObject(row.payload);
    return {
      id: row.id,
      userId: row.userId,
      name: row.user.name,
      email: row.user.email,
      budgetMin: Number(row.budgetMin),
      budgetMax: Number(row.budgetMax),
      occupation: row.occupation ?? stringValue(payload.occupation, ""),
      lookingFor: stringValue(payload.lookingFor, "room"),
      city: row.preferredLocations[0] ?? "",
      suburb: stringValue(payload.suburb, ""),
      lifestyle: row.lifestyle ?? stringValue(payload.lifestyle, ""),
      active: row.active,
      verified: Boolean(payload.verified),
      featured: Boolean(payload.featured),
      moderationStatus: row.active ? "active" : "inactive",
      createdAt: row.createdAt.toISOString(),
    };
  });
  return {
    analytics: {
      total: rows.length,
      active: rows.filter((row) => row.active).length,
      pending: rows.filter((row) => !row.active).length,
      featured: profiles.filter((profile) => profile.featured).length,
    },
    profiles,
  };
}

export async function updatePostgresRoommateProfile(userId: string, action: string, input: { bio?: string; notes?: string }, actorId?: string) {
  const existing = await getMainPrisma().roommateProfile.findUnique({ where: { userId } });
  if (!existing) return null;
  const payload = jsonObject(existing.payload);
  const data: Prisma.RoommateProfileUpdateInput = {};
  if (action === "activate") data.active = true;
  if (action === "suspend" || action === "delete") data.active = false;
  if (action === "verify") data.payload = { ...payload, verified: true };
  if (action === "feature") data.payload = { ...payload, featured: true };
  if (action === "unfeature") data.payload = { ...payload, featured: false };
  if (action === "update_bio") data.payload = { ...payload, bio: input.bio ?? payload.bio ?? "" };
  const row = await getMainPrisma().roommateProfile.update({
    where: { userId },
    data,
    include: { user: true },
  });
  await getMainPrisma().auditEvent.create({
    data: {
      actorId,
      action: `ROOMMATE_${action.toUpperCase()}`,
      target: userId,
      metadata: { notes: input.notes ?? null },
    },
  }).catch(() => null);
  return row;
}

async function getPostgresHomepageCms(): Promise<HomepageCmsConfig> {
  const defaults = createDefaultHomepageCms();
  const payload = await readSnapshotPayload();
  return mergeHomepageCms(defaults, payload.homepage?.cms ?? {});
}

async function readSnapshotPayload(): Promise<SnapshotPayload> {
  const row = await getMainPrisma().appStoreSnapshot.findUnique({
    where: { id: SNAPSHOT_ID },
    select: { payload: true },
  }).catch(() => null);
  return jsonObject(row?.payload) as SnapshotPayload;
}

async function patchSnapshotPayload(patch: SnapshotPayload) {
  const current = await readSnapshotPayload();
  const payload = {
    ...current,
    ...patch,
    homepage: patch.homepage ? { ...(current.homepage ?? {}), ...patch.homepage } : current.homepage,
  };
  await getMainPrisma().appStoreSnapshot.upsert({
    where: { id: SNAPSHOT_ID },
    create: { id: SNAPSHOT_ID, version: SNAPSHOT_VERSION, payload: payload as Prisma.InputJsonObject },
    update: { payload: payload as Prisma.InputJsonObject, version: SNAPSHOT_VERSION },
  });
}

function mergeHomepageCms(current: HomepageCmsConfig, updates: Partial<HomepageCmsConfig>): HomepageCmsConfig {
  return {
    ...current,
    ...updates,
    hero: { ...current.hero, ...updates.hero },
    finalCta: { ...current.finalCta, ...updates.finalCta },
    agentPromo: { ...current.agentPromo, ...updates.agentPromo },
    seo: { ...current.seo, ...updates.seo },
    testimonials: updates.testimonials ?? current.testimonials,
    banners: updates.banners ?? current.banners,
    trustMetrics: updates.trustMetrics ?? current.trustMetrics,
    propertyTypes: updates.propertyTypes ?? current.propertyTypes,
    pages: updates.pages ?? current.pages,
    featuredListingIds: updates.featuredListingIds ?? current.featuredListingIds,
    featuredAgentProfileIds: updates.featuredAgentProfileIds ?? current.featuredAgentProfileIds,
  };
}

function paymentHealth(settings: PaymentSettings) {
  return settings.gateways.map((gateway) => ({
    gateway: gateway.id,
    provider: gateway.id,
    status: gateway.enabled ? "healthy" as const : "degraded" as const,
    successRate: gateway.enabled ? 100 : 0,
    lastCheckedAt: new Date().toISOString(),
  }));
}

function toAdminPayment(row: {
  id: string;
  userId: string;
  listingId: string | null;
  status: PaymentStatus;
  amount: Prisma.Decimal | number;
  currency: string;
  description: string;
  plan: string | null;
  method: string | null;
  manual: boolean;
  proofUrl: string | null;
  proofStatus: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  user?: { name: string; email: string };
}) {
  const metadata = jsonObject(row.metadata);
  return {
    id: row.id,
    userId: row.userId,
    userName: row.user?.name ?? row.user?.email ?? row.userId,
    listingId: row.listingId ?? undefined,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status === PaymentStatus.PENDING && row.manual
      ? row.proofStatus === "UPLOADED"
        ? "MANUAL_REVIEW"
        : row.proofStatus === "REQUESTED"
          ? "AWAITING_PROOF"
          : row.status
      : row.status,
    plan: row.plan ?? row.description,
    method: row.method ?? "unknown",
    manual: row.manual,
    proofUrl: row.proofUrl ?? undefined,
    proofStatus: row.proofStatus ?? undefined,
    referenceNumber: stringValue(metadata.referenceNumber, undefined),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toAdminUser(user: { id: string; name: string; email: string }) {
  return { id: user.id, name: user.name, email: user.email };
}

function isPaymentStatus(value: string): value is PaymentStatus {
  return value === PaymentStatus.PENDING || value === PaymentStatus.PAID || value === PaymentStatus.FAILED || value === PaymentStatus.REFUNDED;
}

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown, fallback: string): string;
function stringValue(value: unknown, fallback: undefined): string | undefined;
function stringValue(value: unknown, fallback: string | undefined) {
  return typeof value === "string" && value.trim() ? value : fallback;
}
