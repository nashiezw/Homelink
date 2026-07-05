import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getAgentDashboardFromPostgres, shouldUsePostgresAgents } from "@/lib/agents/postgres-agent-repository";
import { getStore } from "@/lib/store/app-store";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in required.");

  if (shouldUsePostgresAgents()) {
    const dashboard = await getAgentDashboardFromPostgres(userId);
    if (!dashboard) return problem(403, "FORBIDDEN", "Active agent profile required.");
    return ok(dashboard);
  }

  const store = getStore();
  const profile = store.getAgentProfileByUserId(userId);
  if (!profile) return problem(403, "FORBIDDEN", "Active agent profile required.");

  return ok({
    profile,
    stats: store.getAgentDashboardStats(userId),
    leads: store.listAgentLeads(userId),
    commissions: store.listAgentCommissions(userId),
    training: {
      modules: store.listAgentTrainingModules(),
      progress: store.getAgentTrainingProgress(userId),
    },
    appointments: store.listAgentAppointments(userId),
    tasks: store.listAgentTasks(userId),
    wallet: store.listAgentWallet(userId),
    ratings: store.listAgentRatings(userId),
    notifications: store.getNotifications(userId).slice(0, 20),
  });
}
