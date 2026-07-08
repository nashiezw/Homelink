import type { Prisma } from "@prisma/client";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { getListingFromPostgres } from "@/lib/listings/postgres-listing-repository";
import { getPublicRoommateProfileFromPostgres } from "@/lib/roommates/postgres-roommate-repository";
import type {
  CreateEnquiryInput,
  EnquiryAnalytics,
  EnquiryStatus,
  PropertyEnquiry,
} from "@/lib/enquiries/types";
import { collectViewingReferenceNumbers, generateViewingReference } from "@/lib/enquiries/viewing-reference";

type Actor = { id: string; name: string };
type EnquiryRow = {
  id: string;
  subjectType: string;
  listingId: string | null;
  roommateUserId: string | null;
  holidayBookingId: string | null;
  seekerId: string;
  ownerId: string | null;
  status: string;
  enquiryType: string;
  assignedAgentId: string | null;
  payload: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export function shouldUsePostgresEnquiries() {
  return isPostgresStoreEnabled();
}

export async function createEnquiryInPostgres(input: CreateEnquiryInput) {
  assertPostgres();
  const isRoommate = input.subjectType === "ROOMMATE";
  const listing = input.listingId ? await getListingFromPostgres(input.listingId) : null;
  const roommate = isRoommate && input.roommateUserId ? await getPublicRoommateProfileFromPostgres(input.roommateUserId) : null;
  if (!listing && !roommate) return null;
  const now = new Date().toISOString();
  const id = `enq_${crypto.randomUUID()}`;
  const enquiry: PropertyEnquiry = {
    id,
    subjectType: input.subjectType ?? "LISTING",
    listingId: input.listingId,
    listingTitle: listing?.title ?? "Roommate profile",
    listingType: listing?.type ?? "roommate",
    listingIntent: listing?.intent ?? "rent",
    roommateUserId: input.roommateUserId,
    ownerId: listing?.ownerId ?? input.roommateUserId ?? "",
    ownerName: listing?.landlordName ?? roommate?.name ?? "Roommate",
    seekerId: input.seekerId,
    seekerName: input.seekerName,
    seekerEmail: input.seekerEmail,
    seekerPhone: input.seekerPhone,
    enquiryType: input.enquiryType,
    channel: input.channel ?? "WEB",
    message: input.message,
    status: "NEW",
    priority: "NORMAL",
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: input.guests,
    preferredDate: input.preferredDate,
    preferredTime: input.preferredTime,
    source: input.source ?? "LISTING",
    tags: [],
    notes: [],
    activities: [
      {
        id: `act_${crypto.randomUUID()}`,
        type: "CREATED",
        actorId: input.seekerId,
        actorName: input.seekerName,
        message: "Enquiry created.",
        createdAt: now,
      },
    ],
    viewings: [],
    offers: [],
    documents: [],
    commissionRecorded: false,
    createdAt: now,
    updatedAt: now,
  };
  await saveEnquiry(enquiry);
  return enquiry;
}

export async function listEnquiriesFromPostgres(filters: {
  status?: EnquiryStatus;
  q?: string;
  userId: string;
  roles: string[];
}) {
  assertPostgres();
  const where = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.roles.includes("ADMIN")
      ? {}
      : filters.roles.includes("AGENT")
        ? { assignedAgentId: filters.userId }
        : filters.roles.includes("LANDLORD")
          ? { ownerId: filters.userId }
          : { seekerId: filters.userId }),
  };
  const rows = await getMainPrisma().propertyEnquiryRecord.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 1000,
  });
  const enquiries = rows.map(enquiryFromRow);
  if (!filters.q?.trim()) return enquiries;
  const q = filters.q.toLowerCase();
  return enquiries.filter((enquiry) =>
    [enquiry.id, enquiry.listingTitle, enquiry.seekerName, enquiry.seekerEmail, enquiry.message]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q)),
  );
}

export async function getEnquiryFromPostgres(id: string) {
  assertPostgres();
  const row = await getMainPrisma().propertyEnquiryRecord.findUnique({ where: { id } });
  return row ? enquiryFromRow(row) : null;
}

export async function updateEnquiryStatusInPostgres(id: string, status: EnquiryStatus, actor: Actor, reason?: string) {
  const enquiry = await getEnquiryFromPostgres(id);
  if (!enquiry) return null;
  const previous = enquiry.status;
  const now = new Date().toISOString();
  enquiry.status = status;
  enquiry.updatedAt = now;
  enquiry.activities.unshift({
    id: `act_${crypto.randomUUID()}`,
    type: "STATUS_CHANGED",
    actorId: actor.id,
    actorName: actor.name,
    message: reason ? `Status changed to ${status}: ${reason}` : `Status changed to ${status}.`,
    fromStatus: previous,
    toStatus: status,
    createdAt: now,
  });
  await saveEnquiry(enquiry);
  return enquiry;
}

export async function assignEnquiryAgentInPostgres(id: string, agentId: string, actor: Actor) {
  const enquiry = await getEnquiryFromPostgres(id);
  if (!enquiry) return null;
  const agent = await getMainPrisma().user.findUnique({ where: { id: agentId }, select: { name: true } });
  const now = new Date().toISOString();
  enquiry.assignedAgentId = agentId;
  enquiry.assignedAgentName = agent?.name ?? "Agent";
  enquiry.status = enquiry.status === "NEW" ? "ASSIGNED" : enquiry.status;
  enquiry.updatedAt = now;
  enquiry.activities.unshift({
    id: `act_${crypto.randomUUID()}`,
    type: "ASSIGNED",
    actorId: actor.id,
    actorName: actor.name,
    message: `Assigned to ${enquiry.assignedAgentName}.`,
    createdAt: now,
  });
  await saveEnquiry(enquiry);
  return enquiry;
}

export async function listAllEnquiriesFromPostgres() {
  assertPostgres();
  const rows = await getMainPrisma().propertyEnquiryRecord.findMany({
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
  return rows.map(enquiryFromRow);
}

export async function scheduleViewingInPostgres(
  id: string,
  viewing: { scheduledAt: string; location: string; agentId?: string; agentName?: string },
  actor: Actor,
) {
  const allEnquiries = await listAllEnquiriesFromPostgres();
  const enquiry = allEnquiries.find((row) => row.id === id);
  if (!enquiry) return null;
  const referenceNumber = generateViewingReference(collectViewingReferenceNumbers(allEnquiries));
  const now = new Date().toISOString();
  const entry = {
    id: `enqview_${crypto.randomUUID()}`,
    referenceNumber,
    ...viewing,
    createdAt: now,
  };
  enquiry.viewings.unshift(entry);
  enquiry.status = "VIEWING_SCHEDULED";
  enquiry.updatedAt = now;
  enquiry.activities.unshift({
    id: `act_${crypto.randomUUID()}`,
    type: "VIEWING_SCHEDULED",
    actorId: actor.id,
    actorName: actor.name,
    message: `Viewing ${referenceNumber} scheduled for ${viewing.scheduledAt}`,
    toStatus: "VIEWING_SCHEDULED",
    metadata: { viewingId: entry.id, referenceNumber },
    createdAt: now,
  });
  await saveEnquiry(enquiry);
  return enquiry;
}

export async function completeViewingInPostgres(
  id: string,
  viewingId: string,
  outcome: "COMPLETED" | "NO_SHOW" | "RESCHEDULED" | "CANCELLED",
  feedback: string,
  actor: Actor,
  extras?: { followUpDate?: string; clientInterested?: boolean },
) {
  const enquiry = await getEnquiryFromPostgres(id);
  if (!enquiry) return null;
  const viewing = enquiry.viewings.find((row) => row.id === viewingId);
  if (!viewing) throw new Error("VIEWING_NOT_FOUND");
  const now = new Date().toISOString();
  viewing.outcome = outcome;
  viewing.feedback = feedback;
  viewing.completedAt = now;
  if (extras?.followUpDate) viewing.followUpDate = extras.followUpDate;
  if (typeof extras?.clientInterested === "boolean") viewing.clientInterested = extras.clientInterested;
  enquiry.status =
    outcome === "COMPLETED" && extras?.clientInterested === false
      ? "FOLLOW_UP_REQUIRED"
      : outcome === "COMPLETED"
        ? "VIEWING_COMPLETED"
        : "FOLLOW_UP_REQUIRED";
  enquiry.updatedAt = now;
  enquiry.activities.unshift({
    id: `act_${crypto.randomUUID()}`,
    type: "VIEWING_COMPLETED",
    actorId: actor.id,
    actorName: actor.name,
    message: feedback || `Viewing ${viewing.referenceNumber} ${outcome.toLowerCase()}`,
    toStatus: enquiry.status,
    metadata: { viewingId, referenceNumber: viewing.referenceNumber },
    createdAt: now,
  });
  await saveEnquiry(enquiry);
  return enquiry;
}

export async function addEnquiryNoteInPostgres(
  id: string,
  note: { authorId: string; authorName: string; body: string; internal: boolean },
) {
  const enquiry = await getEnquiryFromPostgres(id);
  if (!enquiry) return null;
  const now = new Date().toISOString();
  enquiry.notes.unshift({
    id: `note_${crypto.randomUUID()}`,
    authorId: note.authorId,
    authorName: note.authorName,
    body: note.body,
    internal: note.internal,
    createdAt: now,
  });
  enquiry.activities.unshift({
    id: `act_${crypto.randomUUID()}`,
    type: "NOTE_ADDED",
    actorId: note.authorId,
    actorName: note.authorName,
    message: "Note added.",
    createdAt: now,
  });
  enquiry.updatedAt = now;
  await saveEnquiry(enquiry);
  return enquiry;
}

export function canAccessPostgresEnquiry(enquiry: PropertyEnquiry | null, userId: string, roles: string[]) {
  if (!enquiry) return false;
  if (roles.includes("ADMIN")) return true;
  if (roles.includes("AGENT") && enquiry.assignedAgentId === userId) return true;
  if (roles.includes("LANDLORD") && enquiry.ownerId === userId) return true;
  return enquiry.seekerId === userId;
}

export async function getEnquiryActor(userId: string) {
  const user = await getMainPrisma().user.findUnique({ where: { id: userId }, select: { name: true, roles: true } });
  return user ? { id: userId, name: user.name, roles: user.roles.map(String) } : null;
}

export function summarizeEnquiries(enquiries: PropertyEnquiry[]): EnquiryAnalytics {
  const byStatus = Object.fromEntries(
    enquiries.reduce((map, enquiry) => map.set(enquiry.status, (map.get(enquiry.status) ?? 0) + 1), new Map<string, number>()),
  );
  const byType = Object.fromEntries(
    enquiries.reduce((map, enquiry) => map.set(enquiry.enquiryType, (map.get(enquiry.enquiryType) ?? 0) + 1), new Map<string, number>()),
  );
  const closedWon = enquiries.filter((e) => ["BOOKING_CONFIRMED", "RENTAL_APPROVED", "SALE_COMPLETED"].includes(e.status)).length;
  return {
    total: enquiries.length,
    newCount: enquiries.filter((e) => e.status === "NEW").length,
    activeCount: enquiries.filter((e) => !["CLOSED", "CANCELLED", "LOST_LEAD"].includes(e.status)).length,
    closedWonCount: closedWon,
    lostCount: enquiries.filter((e) => e.status === "LOST_LEAD").length,
    avgResponseMinutes: 0,
    conversionRate: enquiries.length ? Math.round((closedWon / enquiries.length) * 1000) / 10 : 0,
    byStatus,
    byType,
  };
}

async function saveEnquiry(enquiry: PropertyEnquiry) {
  await getMainPrisma().propertyEnquiryRecord.upsert({
    where: { id: enquiry.id },
    create: {
      id: enquiry.id,
      subjectType: enquiry.subjectType,
      listingId: enquiry.listingId || null,
      roommateUserId: enquiry.roommateUserId ?? null,
      holidayBookingId: enquiry.holidayBookingId ?? null,
      seekerId: enquiry.seekerId,
      ownerId: enquiry.ownerId || null,
      status: enquiry.status,
      enquiryType: enquiry.enquiryType,
      assignedAgentId: enquiry.assignedAgentId ?? null,
      payload: toJsonPayload(enquiryPayload(enquiry)),
      createdAt: new Date(enquiry.createdAt),
      updatedAt: new Date(enquiry.updatedAt),
    },
    update: {
      subjectType: enquiry.subjectType,
      listingId: enquiry.listingId || null,
      roommateUserId: enquiry.roommateUserId ?? null,
      holidayBookingId: enquiry.holidayBookingId ?? null,
      seekerId: enquiry.seekerId,
      ownerId: enquiry.ownerId || null,
      status: enquiry.status,
      enquiryType: enquiry.enquiryType,
      assignedAgentId: enquiry.assignedAgentId ?? null,
      payload: toJsonPayload(enquiryPayload(enquiry)),
      updatedAt: new Date(enquiry.updatedAt),
    },
  });
}

function enquiryFromRow(row: EnquiryRow) {
  return {
    id: row.id,
    subjectType: row.subjectType as PropertyEnquiry["subjectType"],
    listingId: row.listingId ?? "",
    roommateUserId: row.roommateUserId ?? undefined,
    holidayBookingId: row.holidayBookingId ?? undefined,
    seekerId: row.seekerId,
    ownerId: row.ownerId ?? "",
    status: row.status as PropertyEnquiry["status"],
    enquiryType: row.enquiryType as PropertyEnquiry["enquiryType"],
    assignedAgentId: row.assignedAgentId ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(row.payload as Omit<PropertyEnquiry, "id" | "subjectType" | "listingId" | "seekerId" | "ownerId" | "status" | "enquiryType" | "createdAt" | "updatedAt">),
  };
}

function enquiryPayload(enquiry: PropertyEnquiry) {
  const {
    id: _id,
    subjectType: _subjectType,
    listingId: _listingId,
    roommateUserId: _roommateUserId,
    holidayBookingId: _holidayBookingId,
    seekerId: _seekerId,
    ownerId: _ownerId,
    status: _status,
    enquiryType: _enquiryType,
    assignedAgentId: _assignedAgentId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...payload
  } = enquiry;
  return payload;
}

function toJsonPayload(payload: unknown) {
  return JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;
}

function assertPostgres() {
  if (!isPostgresStoreEnabled()) throw new Error("Postgres persistence is not configured.");
}
