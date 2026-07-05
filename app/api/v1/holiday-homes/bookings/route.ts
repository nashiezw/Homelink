import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import {
  createHolidayBookingInPostgres,
  listHolidayBookingsFromPostgres,
  shouldUsePostgresHolidayBookings,
} from "@/lib/holiday-homes/postgres-booking-repository";
import { getPostgresUserById } from "@/lib/auth/postgres-auth";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to view booking enquiries.");
  }

  const { searchParams } = new URL(request.url);
  const listingId = searchParams.get("listingId") ?? undefined;
  const store = shouldUsePostgresHolidayBookings() ? null : getStore();
  const user = shouldUsePostgresHolidayBookings() ? await getPostgresUserById(userId) : store?.getUserById(userId);
  if (!user) return problem(401, "UNAUTHORIZED", "User not found.");

  if (user.roles.includes("ADMIN")) {
    if (shouldUsePostgresHolidayBookings()) {
      return ok({ enquiries: await listHolidayBookingsFromPostgres(listingId ? { listingId } : undefined) });
    }
    return ok({ enquiries: store!.listHolidayBookingEnquiries(listingId ? { listingId } : undefined) });
  }
  if (user.roles.includes("AGENT")) {
    if (shouldUsePostgresHolidayBookings()) {
      return ok({ enquiries: await listHolidayBookingsFromPostgres({ agentId: userId }) });
    }
    return ok({ enquiries: store!.listHolidayBookingEnquiries({ agentId: userId }) });
  }
  if (shouldUsePostgresHolidayBookings()) {
    return ok({ enquiries: await listHolidayBookingsFromPostgres({ ownerId: userId, listingId }) });
  }
  return ok({
    enquiries: store!.listHolidayBookingEnquiries({ ownerId: userId, listingId }),
  });
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to request a booking.");
  }

  const body = await request.json();
  const store = shouldUsePostgresHolidayBookings() ? null : getStore();
  const user = shouldUsePostgresHolidayBookings() ? await getPostgresUserById(userId) : store?.getUserById(userId);
  const input = {
    listingId: body.listingId,
    guestUserId: userId,
    guestName: user?.name ?? body.guestName ?? "Guest",
    guestEmail: body.guestEmail ?? user?.email,
    guestPhone: body.guestPhone ?? user?.phone,
    checkIn: body.checkIn,
    checkOut: body.checkOut,
    guests: Number(body.guests) || 1,
    message: body.message,
  };
  const result = shouldUsePostgresHolidayBookings()
    ? await createHolidayBookingInPostgres(input)
    : store!.createHolidayBookingEnquiry(input);

  if (result.error) {
    return problem(400, "INVALID_BOOKING", result.error);
  }

  return ok({ enquiry: result.enquiry });
}
