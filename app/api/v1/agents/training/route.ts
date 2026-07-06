import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem, created } from "@/lib/api/response";
import { shouldUsePostgresAgents } from "@/lib/agents/postgres-agent-repository";
import {
  completePostgresAgentTraining,
  getPostgresAgentTrainingCertificates,
  listPostgresAgentTrainingModules,
  listPostgresAgentTrainingProgress,
} from "@/lib/agents/postgres-training-repository";
import { getStore } from "@/lib/store/app-store";

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in required.");
  const body = await request.json();
  if (shouldUsePostgresAgents()) {
    if (!body.moduleId) return problem(400, "INVALID_MODULE", "Training module is required.");
    try {
      return created(await completePostgresAgentTraining(userId, body.moduleId, { score: body.score, answers: body.answers }));
    } catch {
      return problem(404, "MODULE_NOT_FOUND", "Training module was not found.");
    }
  }
  const progress = getStore().completeAgentTraining(userId, body.moduleId, body.score);
  return created(progress);
}

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in required.");
  if (shouldUsePostgresAgents()) {
    const [modules, progress, certificates] = await Promise.all([
      listPostgresAgentTrainingModules(),
      listPostgresAgentTrainingProgress(userId),
      getPostgresAgentTrainingCertificates(userId),
    ]);
    return ok({ modules, progress, certificates });
  }
  const store = getStore();
  return ok({
    modules: store.listAgentTrainingModules(),
    progress: store.getAgentTrainingProgress(userId),
  });
}
