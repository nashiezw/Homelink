import { ok, problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import {
  getViewingAppointment,
  shouldUsePostgresAppointments,
  updateViewingAppointment,
} from "@/lib/appointments/postgres-appointment-repository";
import { getMainPrisma } from "@/lib/db/main-prisma";
import type { ViewingAppointmentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!shouldUsePostgresAppointments()) return problem(503, "POSTGRES_REQUIRED", "Appointment booking requires PostgreSQL.");
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to view appointments.");
  const { id } = await params;
  const appointment = await getViewingAppointment(id);
  if (!appointment) return problem(404, "NOT_FOUND", "Appointment could not be found.");
  const user = await getMainPrisma().user.findUnique({ where: { id: userId }, select: { roles: true } });
  const roles = user?.roles.map(String) ?? [];
  const canRead = roles.some((role) => ["ADMIN", "SUPER_ADMIN"].includes(role)) || appointment.seekerId === userId || appointment.agentId === userId;
  if (!canRead) return problem(403, "FORBIDDEN", "You cannot view this appointment.");
  return ok({ appointment });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!shouldUsePostgresAppointments()) return problem(503, "POSTGRES_REQUIRED", "Appointment booking requires PostgreSQL.");
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to update appointments.");
  const user = await getMainPrisma().user.findUnique({ where: { id: userId }, select: { name: true, roles: true } });
  const { id } = await params;
  const body = await request.json();
  const current = await getViewingAppointment(id);
  if (!current) return problem(404, "NOT_FOUND", "Appointment could not be found.");
  const roles = user?.roles.map(String) ?? [];
  const canUpdate = roles.some((role) => ["ADMIN", "SUPER_ADMIN"].includes(role)) || current.seekerId === userId || current.agentId === userId;
  if (!canUpdate) return problem(403, "FORBIDDEN", "You cannot update this appointment.");
  let appointment;
  try {
    appointment = await updateViewingAppointment(
      id,
      {
        status: body.status as ViewingAppointmentStatus | undefined,
        startAt: body.startAt,
        notes: body.notes,
      },
      { id: userId, name: user?.name ?? "HomeLink user" },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("APPOINTMENT_CONFLICT:")) {
      return problem(409, "APPOINTMENT_CONFLICT", `That viewing slot is no longer available. Conflict: ${message.split(":")[1]}`);
    }
    throw error;
  }
  if (!appointment) return problem(404, "NOT_FOUND", "Appointment could not be found.");
  return ok({ appointment });
}
