import type { Prisma } from "@prisma/client";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { sendSmtpPlainEmail } from "@/lib/integrations/smtp";
import { getRuntimePlatformSettings } from "@/lib/settings/runtime";
import { getStore } from "@/lib/store/app-store";
import type { Listing } from "@/lib/types";
import type { TenantRequestInput, TenantRequestMatch, TenantRequestRecord, TenantRequestStatus } from "@/lib/tenant-requests/types";

const SUBJECT_TYPE = "PROPERTY_REQUEST";
const LEGACY_SUBJECT_TYPE = "TENANT_REQUEST";
const MATCH_THRESHOLD = 55;

type TenantRequestRow = {
  id: string;
  seekerId: string;
  assignedAgentId: string | null;
  status: string;
  payload: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export function normalizeTenantRequestInput(body: Record<string, unknown>): TenantRequestInput {
  const preferredAreas = listFromUnknown(body.preferredAreas);
  const alternativeAreas = listFromUnknown(body.alternativeAreas);
  return {
    intent: body.intent === "buy" ? "buy" : "rent",
    name: clean(body.name),
    phone: clean(body.phone),
    email: clean(body.email) || undefined,
    clientType: normalizeClientType(body.clientType),
    propertyType: normalizePropertyType(body.propertyType),
    bedrooms: positiveNumber(body.bedrooms),
    bathrooms: positiveNumber(body.bathrooms),
    ensuite: body.ensuite === "required" || body.ensuite === "preferred" ? body.ensuite : "not_needed",
    preferredAreas,
    alternativeAreas,
    minBudget: positiveNumber(body.minBudget),
    maxBudget: positiveNumber(body.maxBudget),
    moveInDate: clean(body.moveInDate) || undefined,
    checkOutDate: clean(body.checkOutDate) || undefined,
    leaseLength: clean(body.leaseLength) || undefined,
    purchaseReadiness: normalizePurchaseReadiness(body.purchaseReadiness),
    timeline: normalizeTimeline(body.timeline),
    adults: positiveNumber(body.adults),
    children: positiveNumber(body.children),
    mustHaves: listFromUnknown(body.mustHaves),
    notes: clean(body.notes) || undefined,
    source: clean(body.source) || "WEBSITE",
  };
}

export function validateTenantRequest(input: TenantRequestInput) {
  if (!input.name) return "Client name is required.";
  if (!input.phone) return "WhatsApp or phone number is required.";
  if (!input.preferredAreas.length && !input.alternativeAreas.length) return "At least one preferred area is required.";
  if (!input.maxBudget) return "Maximum budget is required.";
  return null;
}

export async function createTenantRequest(input: TenantRequestInput, seekerId = "guest") {
  if (!isPostgresStoreEnabled()) {
    const listings = getStore().listListings().filter(isMatchableListing);
    const request = tenantRequestPayload(createTenantRequestReference(input), input, seekerId);
    request.matches = scoreListingsForTenantRequest(request, listings);
    request.status = request.matches.length ? "MATCHED" : "NEW";
    return getStore().saveTenantRequest(request);
  }

  const request = tenantRequestPayload(createTenantRequestReference(input), input, seekerId);
  request.matches = await listCurrentMatches(request);
  request.status = request.matches.length ? "MATCHED" : "NEW";
  if (request.matches.length) {
    request.activities.unshift({
      id: `act_${crypto.randomUUID()}`,
      type: "MATCHED",
      message: `${request.matches.length} current listing match${request.matches.length === 1 ? "" : "es"} found.`,
      createdAt: new Date().toISOString(),
    });
  }
  await saveTenantRequest(request);
  await notifyTenantRequestReceived(request).catch(() => undefined);
  await notifyTenantRequestMatches(request, request.matches.slice(0, 3), "auto").catch(() => undefined);
  return request;
}

export async function listTenantRequests(q?: string) {
  if (!isPostgresStoreEnabled()) return getStore().listTenantRequests(q);
  const rows = await getMainPrisma().propertyEnquiryRecord.findMany({
    where: { subjectType: { in: [SUBJECT_TYPE, LEGACY_SUBJECT_TYPE] } },
    orderBy: { updatedAt: "desc" },
    take: 1000,
  });
  const requests = rows.map(tenantRequestFromRow);
  if (!q?.trim()) return requests;
  const needle = q.toLowerCase();
  return requests.filter((request) =>
    [
      request.id,
      request.name,
      request.phone,
      request.email,
      request.intent,
      request.clientType,
      request.propertyType,
      request.purchaseReadiness,
      request.preferredAreas.join(" "),
      request.alternativeAreas.join(" "),
      request.notes,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle)),
  );
}

export async function listPropertyRequestAgents() {
  if (!isPostgresStoreEnabled()) {
    return getStore()
      .listUsers({ role: "AGENT" })
      .map((agent) => ({ id: agent.id, name: agent.name, email: agent.email }));
  }
  return getMainPrisma().user.findMany({
    where: { roles: { has: "AGENT" } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

export async function getTenantRequest(id: string) {
  if (!isPostgresStoreEnabled()) return getStore().getTenantRequest(id);
  const row = await getMainPrisma().propertyEnquiryRecord.findFirst({ where: { id, subjectType: { in: [SUBJECT_TYPE, LEGACY_SUBJECT_TYPE] } } });
  return row ? tenantRequestFromRow(row) : null;
}

export async function deleteTenantRequest(id: string) {
  if (!isPostgresStoreEnabled()) return getStore().deleteTenantRequest(id);
  const deleted = await getMainPrisma().propertyEnquiryRecord.deleteMany({
    where: { id, subjectType: { in: [SUBJECT_TYPE, LEGACY_SUBJECT_TYPE] } },
  });
  return deleted.count > 0;
}

export async function listTenantRequestsForAgent(agentId: string) {
  const requests = await listTenantRequests();
  return requests.filter((request) => request.assignedAgentId === agentId && !["CLOSED", "CANCELLED"].includes(request.status));
}

export async function refreshTenantRequestMatches(id: string) {
  const request = await getTenantRequest(id);
  if (!request) return null;
  request.matches = await listCurrentMatches(request);
  request.status = request.matches.length && request.status === "NEW" ? "MATCHED" : request.status;
  request.updatedAt = new Date().toISOString();
  request.activities.unshift({
    id: `act_${crypto.randomUUID()}`,
    type: "MATCHED",
    message: `Matches refreshed: ${request.matches.length} listing${request.matches.length === 1 ? "" : "s"} found.`,
    createdAt: request.updatedAt,
  });
  await saveTenantRequest(request);
  return request;
}

export async function updateTenantRequestStatus(id: string, status: TenantRequestStatus, actor: { id: string; name: string }) {
  const request = await getTenantRequest(id);
  if (!request) return null;
  request.status = status;
  request.updatedAt = new Date().toISOString();
  request.activities.unshift({
    id: `act_${crypto.randomUUID()}`,
    type: "STATUS_CHANGED",
    actorId: actor.id,
    actorName: actor.name,
    message: `Status changed to ${status}.`,
    createdAt: request.updatedAt,
  });
  await saveTenantRequest(request);
  return request;
}

export async function assignTenantRequestAgent(id: string, agentId: string, actor: { id: string; name: string }) {
  const request = await getTenantRequest(id);
  if (!request) return null;
  const agent = isPostgresStoreEnabled()
    ? await getMainPrisma().user.findUnique({ where: { id: agentId }, select: { name: true } })
    : getStore().getUserById(agentId);
  if (!agent) throw new Error("Agent could not be found.");
  const now = new Date().toISOString();
  request.assignedAgentId = agentId;
  request.assignedAgentName = agent.name;
  request.updatedAt = now;
  request.activities.unshift({
    id: `act_${crypto.randomUUID()}`,
    type: "ASSIGNED",
    actorId: actor.id,
    actorName: actor.name,
    message: `Assigned to ${agent.name}.`,
    createdAt: now,
  });
  await saveTenantRequest(request);
  return request;
}

export async function extendTenantRequest(id: string, actor: { id: string; name: string }, days = 30) {
  const request = await getTenantRequest(id);
  if (!request) return null;
  const now = new Date();
  const base = new Date(request.expiresAt);
  const nextBase = Number.isNaN(base.getTime()) || base < now ? now : base;
  const expiresAt = addDays(nextBase, days).toISOString();
  request.expiresAt = expiresAt;
  request.status = request.status === "EXPIRED" ? (request.matches.length ? "MATCHED" : "NEW") : request.status;
  request.updatedAt = now.toISOString();
  request.activities.unshift({
    id: `act_${crypto.randomUUID()}`,
    type: "EXTENDED",
    actorId: actor.id,
    actorName: actor.name,
    message: `Request extended until ${expiresAt.slice(0, 10)}.`,
    createdAt: request.updatedAt,
  });
  await saveTenantRequest(request);
  return request;
}

export async function addTenantRequestNote(id: string, body: string, actor: { id: string; name: string }) {
  const request = await getTenantRequest(id);
  if (!request) return null;
  const now = new Date().toISOString();
  request.adminNotes.unshift({ id: `note_${crypto.randomUUID()}`, body, authorId: actor.id, authorName: actor.name, createdAt: now });
  request.activities.unshift({
    id: `act_${crypto.randomUUID()}`,
    type: "NOTE_ADDED",
    actorId: actor.id,
    actorName: actor.name,
    message: "Admin note added.",
    createdAt: now,
  });
  request.updatedAt = now;
  await saveTenantRequest(request);
  return request;
}

export async function notifyTenantRequestManually(id: string, listingIds: string[], actor: { id: string; name: string }) {
  const request = await getTenantRequest(id);
  if (!request) return null;
  const selected = request.matches.filter((match) => listingIds.includes(match.listingId));
  await notifyTenantRequestMatches(request, selected, "manual").catch(() => undefined);
  const now = new Date().toISOString();
  request.matches = request.matches.map((match) =>
    listingIds.includes(match.listingId) ? { ...match, manuallyNotifiedAt: now } : match,
  );
  request.status = "CONTACTED";
  request.updatedAt = now;
  request.activities.unshift({
    id: `act_${crypto.randomUUID()}`,
    type: "NOTIFIED",
    actorId: actor.id,
    actorName: actor.name,
    message: `Client manually notified about ${selected.length} listing${selected.length === 1 ? "" : "s"}.`,
    createdAt: now,
  });
  await saveTenantRequest(request);
  return request;
}

export function buildTenantRequestWhatsAppMessage(request: TenantRequestRecord, listingIds?: string[]) {
  const matches = (listingIds?.length ? request.matches.filter((match) => listingIds.includes(match.listingId)) : request.matches).slice(0, 3);
  const requestLabel = requestKindLabel(request);
  if (!matches.length) {
    return `Hi ${request.name}, this is HouseLink Zimbabwe. We have recorded your ${requestLabel} request and will contact you when we have a close match.`;
  }
  const lines = matches.map((match, index) => {
    const link = match.slug ? ` https://www.houselink.co.zw/listings/${match.slug}` : "";
    return `${index + 1}. ${match.listingTitle}, ${match.suburb} - $${match.price}.${link}`;
  });
  return `Hi ${request.name}, HouseLink found ${matches.length === 1 ? "a property" : "properties"} close to your ${requestLabel} request:\n\n${lines.join("\n")}\n\nWould you like us to arrange viewing details?`;
}

export function buildStillLookingWhatsAppMessage(request: TenantRequestRecord) {
  const areas = [...request.preferredAreas, ...request.alternativeAreas].slice(0, 3).join(", ") || "your preferred area";
  return `Hi ${request.name}, this is HouseLink Zimbabwe. Are you still looking for ${request.propertyType === "holiday_home" ? "a holiday home" : request.intent === "buy" ? "a property to buy" : request.propertyType === "other" ? "a property to rent" : `a ${request.propertyType} to rent`} around ${areas}? Reply YES if we should keep matching you, or send updated area/budget details.`;
}

export function buildRequestReceivedMessage(request: TenantRequestRecord) {
  return `Hi ${request.name}, HouseLink has received your ${requestKindLabel(request)} request. We will match your area, budget, and must-haves with suitable listings and contact you when there is a close fit. Reference: ${request.id}`;
}

export async function matchActiveTenantRequestsForListing(listing: Listing) {
  if (!isPostgresStoreEnabled() || !isMatchableListing(listing)) return [];
  const requests = await listTenantRequests();
  const matched: TenantRequestRecord[] = [];
  for (const request of requests.filter((item) => !["CLOSED", "CANCELLED"].includes(item.status))) {
    const match = scoreListingForTenantRequest(request, listing);
    if (!match) continue;
    const existing = request.matches.find((item) => item.listingId === listing.id);
    request.matches = [match, ...request.matches.filter((item) => item.listingId !== listing.id)].slice(0, 12);
    request.status = request.status === "NEW" ? "MATCHED" : request.status;
    request.updatedAt = new Date().toISOString();
    if (!existing) {
      request.activities.unshift({
        id: `act_${crypto.randomUUID()}`,
        type: "MATCHED",
        listingId: listing.id,
        message: `New listing match found: ${listing.title}.`,
        createdAt: request.updatedAt,
      });
      await notifyTenantRequestMatches(request, [match], "auto").catch(() => undefined);
    }
    await saveTenantRequest(request);
    matched.push(request);
  }
  return matched;
}

async function listCurrentMatches(request: TenantRequestRecord) {
  const listings = isPostgresStoreEnabled()
    ? await import("@/lib/listings/postgres-listing-repository").then((module) =>
        module.listListingsFromPostgres({ status: "ACTIVE", intent: request.intent }),
      )
    : getStore().listListings().filter(isMatchableListing);
  return scoreListingsForTenantRequest(request, listings);
}

function scoreListingsForTenantRequest(request: TenantRequestRecord, listings: Listing[]) {
  return listings
    .map((listing) => scoreListingForTenantRequest(request, listing))
    .filter((match): match is TenantRequestMatch => Boolean(match))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}

function scoreListingForTenantRequest(request: TenantRequestRecord, listing: Listing): TenantRequestMatch | null {
  if (!isMatchableListing(listing)) return null;
  if (listing.intent !== request.intent) return null;
  let score = 0;
  const reasons: string[] = [];
  const areas = [...request.preferredAreas, ...request.alternativeAreas].map(normalize);
  const listingArea = normalize(`${listing.suburb} ${listing.city} ${listing.title}`);

  if (areas.some((area) => area && listingArea.includes(area))) {
    score += 35;
    reasons.push(`Area match: ${listing.suburb}`);
  }
  if (request.propertyType !== "other" && request.propertyType !== "room-share" && listing.type === request.propertyType) {
    score += 18;
    reasons.push(`Property type: ${listing.type}`);
  }
  if (request.propertyType === "room-share" && listing.type === "room") {
    score += 18;
    reasons.push("Room/shared option");
  }
  if (request.bedrooms && listing.bedrooms >= request.bedrooms) {
    score += 16;
    reasons.push(`${listing.bedrooms} bedroom${listing.bedrooms === 1 ? "" : "s"}`);
  }
  if (request.bathrooms && listing.bathrooms >= request.bathrooms) {
    score += 8;
    reasons.push(`${listing.bathrooms} bathroom${listing.bathrooms === 1 ? "" : "s"}`);
  }
  if (request.maxBudget && listing.price <= request.maxBudget) {
    score += 18;
    reasons.push(`Within budget at $${listing.price}`);
  }
  if (request.maxBudget && listing.price > request.maxBudget) {
    const overBudgetPct = (listing.price - request.maxBudget) / request.maxBudget;
    if (overBudgetPct <= 0.1) {
      score += 6;
      reasons.push("Slightly above budget");
    }
  }

  const amenities = listing.amenities.map(normalize);
  for (const mustHave of request.mustHaves) {
    const wanted = normalize(mustHave);
    if (!wanted) continue;
    if (amenities.some((amenity) => amenity.includes(wanted) || wanted.includes(amenity))) {
      score += 4;
      reasons.push(mustHave);
    }
  }
  if (request.ensuite === "required" || request.ensuite === "preferred") {
    const text = normalize(`${listing.title} ${listing.description} ${listing.amenities.join(" ")}`);
    if (text.includes("ensuite") || text.includes("en suite")) {
      score += request.ensuite === "required" ? 12 : 7;
      reasons.push("Ensuite mentioned");
    } else if (request.ensuite === "required") {
      score -= 15;
    }
  }

  const label = matchLabel(score, request.maxBudget, listing.price, reasons);
  if (score < MATCH_THRESHOLD && (label !== "over_budget" || score < 45)) return null;
  return {
    listingId: listing.id,
    listingTitle: listing.title,
    slug: listing.slug,
    city: listing.city,
    suburb: listing.suburb,
    price: listing.price,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    score: Math.min(100, score),
    label,
    reasons: reasons.slice(0, 5),
  };
}

async function notifyTenantRequestMatches(request: TenantRequestRecord, matches: TenantRequestMatch[], mode: "auto" | "manual") {
  if (!matches.length) return;
  const settings = getRuntimePlatformSettings();
  const integrations = settings.integrations;
  if (!request.email || !integrations.smtpHost || !integrations.smtpUser) return;
  const top = matches
    .slice(0, 3)
    .map((match) => `- ${match.listingTitle}, ${match.suburb}: $${match.price} (${match.reasons.join(", ")})`)
    .join("\n");
  const subject = mode === "manual" ? "HouseLink property matches selected for you" : "HouseLink found a property match for your request";
  const body = `Hi ${request.name},\n\nHouseLink found listing matches for your ${requestKindLabel(request)} request:\n\n${top}\n\nReply to HouseLink on WhatsApp or email to arrange viewing details.`;
  await sendSmtpPlainEmail(integrations, request.email, subject, body);
}

async function notifyTenantRequestReceived(request: TenantRequestRecord) {
  const settings = getRuntimePlatformSettings();
  const integrations = settings.integrations;
  if (!request.email || !integrations.smtpHost || !integrations.smtpUser) return;
  await sendSmtpPlainEmail(
    integrations,
    request.email,
    "HouseLink received your property request",
    `${buildRequestReceivedMessage(request)}\n\nIf anything changes, reply to HouseLink with your updated details.`,
  );
}

async function saveTenantRequest(request: TenantRequestRecord) {
  if (!isPostgresStoreEnabled()) {
    getStore().saveTenantRequest(request);
    return;
  }
  await getMainPrisma().propertyEnquiryRecord.upsert({
    where: { id: request.id },
    create: {
      id: request.id,
      subjectType: SUBJECT_TYPE,
      listingId: null,
      seekerId: request.seekerId,
      ownerId: null,
      status: request.status,
      enquiryType: "PROPERTY_REQUEST",
      assignedAgentId: request.assignedAgentId ?? null,
      payload: toJson(requestPayload(request)),
      createdAt: new Date(request.createdAt),
      updatedAt: new Date(request.updatedAt),
    },
    update: {
      status: request.status,
      assignedAgentId: request.assignedAgentId ?? null,
      payload: toJson(requestPayload(request)),
      updatedAt: new Date(request.updatedAt),
    },
  });
}

function tenantRequestFromRow(row: TenantRequestRow): TenantRequestRecord {
  const payload = row.payload as Omit<TenantRequestRecord, "id" | "seekerId" | "status" | "createdAt" | "updatedAt">;
  const computedStatus = row.status === "CLOSED" || row.status === "CANCELLED"
    ? row.status
    : payload.expiresAt && new Date(payload.expiresAt).getTime() < Date.now()
      ? "EXPIRED"
      : row.status;
  return {
    ...payload,
    intent: payload.intent ?? "rent",
    id: row.id,
    seekerId: row.seekerId,
    assignedAgentId: payload.assignedAgentId ?? row.assignedAgentId ?? undefined,
    status: computedStatus as TenantRequestStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    expiresAt: payload.expiresAt ?? addDays(row.createdAt, 60).toISOString(),
    matches: payload.matches ?? [],
    activities: payload.activities ?? [],
    adminNotes: payload.adminNotes ?? [],
  };
}

function requestPayload(request: TenantRequestRecord) {
  const { id: _id, seekerId: _seekerId, status: _status, createdAt: _createdAt, updatedAt: _updatedAt, ...payload } = request;
  return payload;
}

function tenantRequestPayload(id: string, input: TenantRequestInput, seekerId: string): TenantRequestRecord {
  const now = new Date().toISOString();
  return {
    ...input,
    id,
    seekerId,
    status: "NEW",
    expiresAt: addDays(new Date(), 60).toISOString(),
    matches: [],
    adminNotes: [],
    activities: [
      {
        id: `act_${crypto.randomUUID()}`,
        type: "CREATED",
        message: `${input.propertyType === "holiday_home" ? "Holiday home" : input.intent === "buy" ? "Buyer" : "Tenant rental"} request submitted.`,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

function createTenantRequestReference(input: TenantRequestInput) {
  const kind = input.propertyType === "holiday_home" ? "STAY" : input.intent === "buy" ? "BUY" : "RENT";
  const date = new Date();
  const ymd = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `HL-${kind}-${ymd}-${suffix}`;
}

function isMatchableListing(listing: Listing) {
  return ["ACTIVE", "VIEWING_IN_PROGRESS", undefined].includes(listing.status);
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function positiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function listFromUnknown(value: unknown) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  if (typeof value === "string") return value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizePropertyType(value: unknown): TenantRequestInput["propertyType"] {
  const allowed = ["house", "cottage", "flat", "room", "room-share", "land", "commercial", "holiday_home", "other"] as const;
  return allowed.includes(value as TenantRequestInput["propertyType"]) ? (value as TenantRequestInput["propertyType"]) : "house";
}

function requestKindLabel(request: TenantRequestRecord) {
  if (request.propertyType === "holiday_home") return "holiday home";
  return request.intent === "buy" ? "buying" : "rental";
}

function normalizeClientType(value: unknown): TenantRequestInput["clientType"] {
  const allowed = ["individual", "family", "company", "investor", "diaspora", "other"] as const;
  return allowed.includes(value as NonNullable<TenantRequestInput["clientType"]>) ? (value as TenantRequestInput["clientType"]) : undefined;
}

function normalizePurchaseReadiness(value: unknown): TenantRequestInput["purchaseReadiness"] {
  const allowed = ["cash_ready", "mortgage", "payment_plan", "still_browsing", "other"] as const;
  return allowed.includes(value as NonNullable<TenantRequestInput["purchaseReadiness"]>) ? (value as TenantRequestInput["purchaseReadiness"]) : undefined;
}

function normalizeTimeline(value: unknown): TenantRequestInput["timeline"] {
  const allowed = ["ready_now", "one_to_three_months", "three_to_six_months", "flexible"] as const;
  return allowed.includes(value as NonNullable<TenantRequestInput["timeline"]>) ? (value as TenantRequestInput["timeline"]) : undefined;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function matchLabel(score: number, maxBudget: number | undefined, price: number, reasons: string[]): TenantRequestMatch["label"] {
  if (maxBudget && price > maxBudget) return "over_budget";
  if (score >= 82) return "strong_match";
  if (reasons.some((reason) => reason.startsWith("Area match"))) return score >= 65 ? "possible_match" : "nearby";
  return "possible_match";
}

function toJson(payload: unknown) {
  return JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;
}
