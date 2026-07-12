import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import {
  getAgentViewingAvailability,
  saveAgentViewingAvailability,
} from "@/lib/appointments/availability-repository";
import { shouldUsePostgresAppointments } from "@/lib/appointments/postgres-appointment-repository";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

async function requireAgent(userId: string) {
  const user = await getMainPrisma().user.findUnique({
    where: { id: userId },
    select: { roles: true },
  });
  const roles = user?.roles.map(String) ?? [];
  if (!roles.includes("AGENT") && !roles.some((role) => ["ADMIN", "SUPER_ADMIN"].includes(role))) {
    return null;
  }
  return user;
}

export async function GET(request: Request) {
  if (!shouldUsePostgresAppointments()) return problem(503, "POSTGRES_REQUIRED", "Viewing availability requires PostgreSQL.");
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to manage viewing availability.");
  const user = await requireAgent(userId);
  if (!user) return problem(403, "FORBIDDEN", "Agent access required.");

  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId") ?? userId;
  const roles = user.roles.map(String);
  if (agentId !== userId && !roles.some((role) => ["ADMIN", "SUPER_ADMIN"].includes(role))) {
    return problem(403, "FORBIDDEN", "You cannot view another agent's availability.");
  }

  const availability = await getAgentViewingAvailability(agentId);
  return ok({ availability });
}

export async function PATCH(request: Request) {
  if (!shouldUsePostgresAppointments()) return problem(503, "POSTGRES_REQUIRED", "Viewing availability requires PostgreSQL.");
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to manage viewing availability.");
  const user = await requireAgent(userId);
  if (!user) return problem(403, "FORBIDDEN", "Agent access required.");

  const body = await request.json();
  const agentId = typeof body.agentId === "string" ? body.agentId : userId;
  const roles = user.roles.map(String);
  if (agentId !== userId && !roles.some((role) => ["ADMIN", "SUPER_ADMIN"].includes(role))) {
    return problem(403, "FORBIDDEN", "You cannot update another agent's availability.");
  }

  const availability = await saveAgentViewingAvailability(agentId, {
    workingDays: Array.isArray(body.workingDays) ? body.workingDays.map(Number) : [],
    slotHours: Array.isArray(body.slotHours) ? body.slotHours.map(Number) : [],
    horizonDays: body.horizonDays !== undefined ? Number(body.horizonDays) : undefined,
    blockedDates: Array.isArray(body.blockedDates) ? body.blockedDates.map(String) : [],
  });
  return ok({ availability });
}
