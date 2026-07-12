import type { Prisma } from "@prisma/client";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { getListingFromPostgres } from "@/lib/listings/postgres-listing-repository";
import type { ViewingAppointment, ViewingAppointmentStatus } from "@/lib/types";

type AppointmentInput = {
  listingId: string;
  enquiryId?: string;
  seekerId?: string;
  seekerName: string;
  seekerEmail?: string;
  seekerPhone?: string;
  agentId?: string;
  agentName?: string;
  startAt: string;
  notes?: string;
};

export function shouldUsePostgresAppointments() {
  return isPostgresStoreEnabled();
}

export async function listViewingAppointments(filters: {
  listingId?: string;
  agentId?: string;
  seekerId?: string;
  status?: string;
  from?: string;
  to?: string;
} = {}) {
  const rows = await getMainPrisma().viewingAppointment.findMany({
    where: {
      ...(filters.listingId ? { listingId: filters.listingId } : {}),
      ...(filters.agentId ? { agentId: filters.agentId } : {}),
      ...(filters.seekerId ? { seekerId: filters.seekerId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.from || filters.to
        ? {
            startAt: {
              ...(filters.from ? { gte: new Date(filters.from) } : {}),
              ...(filters.to ? { lte: new Date(filters.to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { startAt: "asc" },
    take: 500,
  });
  return rows.map(toAppointment);
}

export async function getViewingAppointment(id: string) {
  const row = await getMainPrisma().viewingAppointment.findUnique({ where: { id } });
  return row ? toAppointment(row) : null;
}

export async function createViewingAppointment(input: AppointmentInput, actor?: { id: string; name: string }) {
  const listing = await getListingFromPostgres(input.listingId);
  if (!listing) return null;
  const startAt = parseDate(input.startAt);
  const endAt = new Date(startAt.getTime() + 45 * 60 * 1000);
  const agentId = input.agentId ?? listing.assignedAgentId;
  const conflict = await getMainPrisma().viewingAppointment.findFirst({
    where: {
      status: { in: ["REQUESTED", "CONFIRMED", "RESCHEDULED"] },
      OR: [
        { listingId: input.listingId },
        ...(agentId ? [{ agentId }] : []),
      ],
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true, referenceNumber: true },
  });
  if (conflict) throw new Error(`APPOINTMENT_CONFLICT:${conflict.referenceNumber}`);
  const referenceNumber = await nextReferenceNumber();
  const row = await getMainPrisma().viewingAppointment.create({
    data: {
      referenceNumber,
      listingId: input.listingId,
      enquiryId: input.enquiryId,
      seekerId: input.seekerId,
      seekerName: input.seekerName,
      seekerEmail: input.seekerEmail,
      seekerPhone: input.seekerPhone,
      agentId,
      agentName: input.agentName,
      startAt,
      endAt,
      location: `${listing.suburb}, ${listing.city}`,
      notes: input.notes,
      reminderAt: new Date(startAt.getTime() - 2 * 60 * 60 * 1000),
      auditTrail: auditTrail("REQUESTED", actor, { startAt: startAt.toISOString() }),
    },
  });
  await queueAppointmentNotifications(toAppointment(row), listing.title).catch(() => undefined);
  return toAppointment(row);
}

export async function updateViewingAppointment(
  id: string,
  update: { status?: ViewingAppointmentStatus; startAt?: string; notes?: string },
  actor?: { id: string; name: string },
) {
  const existing = await getMainPrisma().viewingAppointment.findUnique({ where: { id } });
  if (!existing) return null;
  const nextStart = update.startAt ? parseDate(update.startAt) : existing.startAt;
  const status = update.status ?? (update.startAt ? "RESCHEDULED" : existing.status);
  if (update.startAt && status !== "CANCELLED") {
    const nextEnd = new Date(nextStart.getTime() + 45 * 60 * 1000);
    const conflict = await getMainPrisma().viewingAppointment.findFirst({
      where: {
        id: { not: id },
        status: { in: ["REQUESTED", "CONFIRMED", "RESCHEDULED"] },
        OR: [
          { listingId: existing.listingId },
          ...(existing.agentId ? [{ agentId: existing.agentId }] : []),
        ],
        startAt: { lt: nextEnd },
        endAt: { gt: nextStart },
      },
      select: { referenceNumber: true },
    });
    if (conflict) throw new Error(`APPOINTMENT_CONFLICT:${conflict.referenceNumber}`);
  }
  const now = new Date();
  const row = await getMainPrisma().viewingAppointment.update({
    where: { id },
    data: {
      status,
      startAt: nextStart,
      endAt: new Date(nextStart.getTime() + 45 * 60 * 1000),
      notes: update.notes ?? existing.notes,
      reminderAt: new Date(nextStart.getTime() - 2 * 60 * 60 * 1000),
      confirmedAt: status === "CONFIRMED" ? now : existing.confirmedAt,
      rescheduledAt: status === "RESCHEDULED" ? now : existing.rescheduledAt,
      cancelledAt: status === "CANCELLED" ? now : existing.cancelledAt,
      completedAt: status === "COMPLETED" || status === "NO_SHOW" ? now : existing.completedAt,
      auditTrail: appendAudit(existing.auditTrail, status, actor, { startAt: nextStart.toISOString() }),
    },
  });
  return toAppointment(row);
}

export async function appointmentSlotsForListing(listingId: string) {
  const base = new Date();
  base.setHours(9, 0, 0, 0);
  const booked = await listViewingAppointments({ listingId, from: new Date().toISOString() });
  const bookedTimes = new Set(booked.filter((item) => item.status !== "CANCELLED").map((item) => item.startAt.slice(0, 16)));
  return Array.from({ length: 10 }).map((_, index) => {
    const slot = new Date(base);
    slot.setDate(base.getDate() + Math.floor(index / 2) + 1);
    slot.setHours(index % 2 === 0 ? 10 : 14, 0, 0, 0);
    const iso = slot.toISOString();
    return { startAt: iso, available: !bookedTimes.has(iso.slice(0, 16)) };
  });
}

function parseDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("INVALID_APPOINTMENT_DATE");
  return date;
}

async function nextReferenceNumber() {
  const count = await getMainPrisma().viewingAppointment.count();
  return `HLV-${String(count + 1).padStart(6, "0")}`;
}

function auditTrail(action: string, actor?: { id: string; name: string }, metadata?: Record<string, unknown>) {
  return [{ action, actorId: actor?.id ?? "guest", actorName: actor?.name ?? "Guest", metadata, createdAt: new Date().toISOString() }] as Prisma.InputJsonValue;
}

function appendAudit(current: Prisma.JsonValue | null, action: string, actor?: { id: string; name: string }, metadata?: Record<string, unknown>) {
  const list = Array.isArray(current) ? current : [];
  return [...list, { action, actorId: actor?.id ?? "system", actorName: actor?.name ?? "System", metadata, createdAt: new Date().toISOString() }] as Prisma.InputJsonValue;
}

function toAppointment(row: {
  id: string;
  referenceNumber: string;
  listingId: string;
  enquiryId: string | null;
  seekerId: string | null;
  seekerName: string;
  seekerEmail: string | null;
  seekerPhone: string | null;
  agentId: string | null;
  agentName: string | null;
  startAt: Date;
  endAt: Date;
  status: string;
  location: string;
  notes: string | null;
  reminderAt: Date | null;
  confirmedAt: Date | null;
  rescheduledAt: Date | null;
  cancelledAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): ViewingAppointment {
  return {
    id: row.id,
    referenceNumber: row.referenceNumber,
    listingId: row.listingId,
    enquiryId: row.enquiryId ?? undefined,
    seekerId: row.seekerId ?? undefined,
    seekerName: row.seekerName,
    seekerEmail: row.seekerEmail ?? undefined,
    seekerPhone: row.seekerPhone ?? undefined,
    agentId: row.agentId ?? undefined,
    agentName: row.agentName ?? undefined,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    status: row.status as ViewingAppointmentStatus,
    location: row.location,
    notes: row.notes ?? undefined,
    reminderAt: row.reminderAt?.toISOString(),
    confirmedAt: row.confirmedAt?.toISOString(),
    rescheduledAt: row.rescheduledAt?.toISOString(),
    cancelledAt: row.cancelledAt?.toISOString(),
    completedAt: row.completedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function queueAppointmentNotifications(appointment: ViewingAppointment, listingTitle: string) {
  const notifications = [
    appointment.seekerId
      ? {
          userId: appointment.seekerId,
          channel: "EMAIL" as const,
          subject: `Viewing requested: ${appointment.referenceNumber}`,
          body: `Your viewing for ${listingTitle} is requested for ${new Date(appointment.startAt).toLocaleString()}.`,
        }
      : null,
    appointment.agentId
      ? {
          userId: appointment.agentId,
          channel: "EMAIL" as const,
          subject: `New viewing booking: ${appointment.referenceNumber}`,
          body: `${appointment.seekerName} requested a viewing for ${listingTitle} at ${new Date(appointment.startAt).toLocaleString()}.`,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
  if (notifications.length) await getMainPrisma().notification.createMany({ data: notifications });
}
