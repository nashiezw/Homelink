import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem, created } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in required.");
  const body = await request.json();
  const progress = getStore().completeAgentTraining(userId, body.moduleId, body.score);
  return created(progress);
}

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in required.");
  const store = getStore();
  return ok({
    modules: store.listAgentTrainingModules(),
    progress: store.getAgentTrainingProgress(userId),
  });
}
