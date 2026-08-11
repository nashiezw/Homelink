import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getLearnerAcademyEngagement, runLearnerAcademyEngagementAction } from "@/lib/academy/engagement-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to view Academy engagement.");
  try {
    return ok(await getLearnerAcademyEngagement(userId));
  } catch (error) {
    console.error("Failed to load learner Academy engagement", error);
    return problem(500, "ACADEMY_ENGAGEMENT_READ_FAILED", "Academy engagement data could not be loaded.");
  }
}

export async function PATCH(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to update Academy engagement.");
  try {
    const body = await request.json();
    const result = await runLearnerAcademyEngagementAction(userId, body);
    if (!result) return problem(400, "INVALID_ENGAGEMENT_ACTION", "Unknown engagement action.");
    return ok(result);
  } catch (error) {
    console.error("Failed to update learner Academy engagement", error);
    return problem(500, "ACADEMY_ENGAGEMENT_WRITE_FAILED", error instanceof Error ? error.message : "Academy engagement update could not be saved.");
  }
}
