import { problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { getPostgresPublicUserById } from "@/lib/auth/postgres-auth";
import { getViewingAppointment, shouldUsePostgresAppointments } from "@/lib/appointments/postgres-appointment-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!shouldUsePostgresAppointments()) return problem(503, "POSTGRES_REQUIRED", "Appointment calendar export requires PostgreSQL.");
  const { id } = await params;
  const appointment = await getViewingAppointment(id);
  if (!appointment) return problem(404, "NOT_FOUND", "Appointment not found.");
  const userId = getSessionUserIdFromRequest(request);
  const user = userId ? await getPostgresPublicUserById(userId) : null;
  const canRead = user?.roles.some((role) => ["ADMIN", "SUPER_ADMIN"].includes(role)) || user?.id === appointment.seekerId || user?.id === appointment.agentId;
  if (!canRead) return problem(403, "FORBIDDEN", "You cannot export this appointment.");

  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HomeLink Zimbabwe//Viewing Appointments//EN",
    "BEGIN:VEVENT",
    `UID:${appointment.id}@homelink.co.zw`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(new Date(appointment.startAt))}`,
    `DTEND:${toIcsDate(new Date(appointment.endAt))}`,
    `SUMMARY:HomeLink viewing ${appointment.referenceNumber}`,
    `LOCATION:${escapeIcs(appointment.location)}`,
    `DESCRIPTION:${escapeIcs(`Viewing reference ${appointment.referenceNumber}. Status: ${appointment.status}.`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${appointment.referenceNumber}.ics"`,
    },
  });
}

function toIcsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}
