import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { listAgentCommissionsFromPostgres, shouldUsePostgresAgents } from "@/lib/agents/postgres-agent-repository";
import { getStore } from "@/lib/store/app-store";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in required.");
  if (shouldUsePostgresAgents()) {
    return ok(await listAgentCommissionsFromPostgres(userId));
  }
  return ok(getStore().listAgentCommissions(userId));
}
