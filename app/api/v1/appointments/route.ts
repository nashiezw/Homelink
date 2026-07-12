import { created, ok, problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { checkRateLimit, getClientIp } from "@/lib/api/request-meta";
import {
  appointmentSlotsForListing,
  createViewingAppointment,
  listViewingAppointments,
  shouldUsePostgresAppointments,
} from "@/lib/appointments/postgres-appointment-repository";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!shouldUsePostgresAppointments()) return problem(503, "POSTGRES_REQUIRED", "Appointment booking requires PostgreSQL.");
  const { searchParams } = new URL(request.url);
  const listingId = searchParams.get("listingId") ?? undefined;
  const slots = searchParams.get("slots") === "true";
  if (slots && listingId) return ok({ slots: await appointmentSlotsForListing(listingId) });

  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to view appointments.");
  const user = await getMainPrisma().user.findUnique({ where: { id: userId }, select: { roles: true } });
  const roles = user?.roles.map(String) ?? [];
  const isAdmin = roles.some((role) => ["ADMIN", "SUPER_ADMIN"].includes(role));
  const appointments = await listViewingAppointments({
    listingId,
    agentId: isAdmin ? undefined : roles.includes("AGENT") ? userId : undefined,
    seekerId: isAdmin || roles.includes("AGENT") ? undefined : userId,
    status: searchParams.get("status") ?? undefined,
  });
  return ok({ appointments });
}

export async function POST(request: Request) {
  if (!shouldUsePostgresAppointments()) return problem(503, "POSTGRES_REQUIRED", "Appointment booking requires PostgreSQL.");
  const rate = checkRateLimit(`appointment:${getClientIp(request)}`, 10);
  if (!rate.allowed) return problem(429, "RATE_LIMITED", `Try again in ${rate.retryAfterSec} seconds.`);
  const userId = getSessionUserIdFromRequest(request);
  const body = await request.json();
  if (!body.listingId || !body.startAt) return problem(400, "INVALID_APPOINTMENT", "listingId and startAt are required.");
  if (!body.seekerName && !userId) return problem(400, "INVALID_APPOINTMENT", "Your name is required.");
  const user = userId
    ? await getMainPrisma().user.findUnique({ where: { id: userId }, select: { name: true, email: true, phone: true } })
    : null;
  let appointment;
  try {
    appointment = await createViewingAppointment(
      {
        listingId: String(body.listingId),
        enquiryId: body.enquiryId,
        seekerId: userId ?? undefined,
        seekerName: user?.name ?? String(body.seekerName ?? "Guest"),
        seekerEmail: user?.email ?? body.seekerEmail,
        seekerPhone: user?.phone ?? body.seekerPhone,
        startAt: String(body.startAt),
        notes: body.notes,
      },
      { id: userId ?? "guest", name: user?.name ?? String(body.seekerName ?? "Guest") },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("APPOINTMENT_CONFLICT:")) {
      return problem(409, "APPOINTMENT_CONFLICT", `That viewing slot is no longer available. Conflict: ${message.split(":")[1]}`);
    }
    throw error;
  }
  if (!appointment) return problem(404, "LISTING_NOT_FOUND", "Listing could not be found.");
  return created({ appointment });
}
