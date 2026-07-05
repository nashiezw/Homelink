import type { Prisma } from "@prisma/client";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { getListingFromPostgres } from "@/lib/listings/postgres-listing-repository";

type HolidayBookingPayload = Record<string, unknown> & {
  id: string;
  listingId: string;
  guestUserId: string;
  status: string;
  createdAt: string;
};

export function shouldUsePostgresHolidayBookings() {
  return isPostgresStoreEnabled();
}

export async function listHolidayBookingsFromPostgres(filters: { listingId?: string; ownerId?: string; agentId?: string } = {}) {
  const rows = await getMainPrisma().holidayBookingRecord.findMany({
    where: {
      ...(filters.listingId ? { listingId: filters.listingId } : {}),
      ...(filters.ownerId ? { ownerId: filters.ownerId } : {}),
      ...(filters.agentId ? { agentId: filters.agentId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => row.payload as HolidayBookingPayload);
}

export async function createHolidayBookingInPostgres(input: Record<string, unknown>) {
  const listingId = String(input.listingId ?? "");
  const listing = await getListingFromPostgres(listingId);
  if (!listing) return { error: "Listing not found." };
  const now = new Date().toISOString();
  const payload: HolidayBookingPayload = {
    id: `hbe_${crypto.randomUUID()}`,
    listingId,
    listingTitle: listing.title,
    ownerId: listing.ownerId,
    guestUserId: String(input.guestUserId),
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    guestPhone: input.guestPhone,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: input.guests,
    message: input.message,
    status: "NEW",
    createdAt: now,
    updatedAt: now,
  };
  await upsertHolidayBooking(payload);
  return { enquiry: payload };
}

export async function updateHolidayBookingStatusInPostgres(id: string, status: string, actorId: string) {
  const row = await getMainPrisma().holidayBookingRecord.findUnique({ where: { id } });
  if (!row) return null;
  const payload = { ...(row.payload as HolidayBookingPayload), status, updatedAt: new Date().toISOString(), updatedBy: actorId };
  await upsertHolidayBooking(payload);
  return payload;
}

export async function upsertHolidayBooking(payload: HolidayBookingPayload) {
  await getMainPrisma().holidayBookingRecord.upsert({
    where: { id: payload.id },
    update: {
      listingId: payload.listingId,
      guestUserId: payload.guestUserId,
      ownerId: typeof payload.ownerId === "string" ? payload.ownerId : null,
      agentId: typeof payload.agentId === "string" ? payload.agentId : null,
      status: payload.status,
      payload: toJson(payload),
    },
    create: {
      id: payload.id,
      listingId: payload.listingId,
      guestUserId: payload.guestUserId,
      ownerId: typeof payload.ownerId === "string" ? payload.ownerId : null,
      agentId: typeof payload.agentId === "string" ? payload.agentId : null,
      status: payload.status,
      payload: toJson(payload),
    },
  });
}

function toJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}
