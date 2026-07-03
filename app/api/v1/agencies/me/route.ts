import { ok, problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to view your agency dashboard.");
  }

  const store = getStore();
  const user = store.getUserById(userId);
  if (!user) {
    return problem(401, "UNAUTHORIZED", "Invalid session.");
  }

  if (!user.agencyId || !user.roles.includes("AGENCY_ADMIN")) {
    return problem(403, "FORBIDDEN", "Agency admin access required.");
  }

  const dashboard = store.getAgencyDashboard(user.agencyId);
  if (!dashboard) {
    return problem(404, "AGENCY_NOT_FOUND", "Agency could not be found.");
  }

  return ok(dashboard);
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to invite agents.");
  }

  const store = getStore();
  const user = store.getUserById(userId);
  if (!user?.agencyId || !user.roles.includes("AGENCY_ADMIN")) {
    return problem(403, "FORBIDDEN", "Agency admin access required.");
  }

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!name || !email) {
    return problem(400, "INVALID_INPUT", "Name and email are required.");
  }

  const result = store.inviteAgencyAgent(user.agencyId, { name, email }, { id: user.id, name: user.name });
  if (result.error) {
    return problem(400, "INVITE_FAILED", result.error);
  }

  const dashboard = store.getAgencyDashboard(user.agencyId);
  return ok({ user: result.user, dashboard });
}
