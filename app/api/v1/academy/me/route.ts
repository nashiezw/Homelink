import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getLearnerAcademyDashboard } from "@/lib/academy/public-academy-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to view your learner dashboard.");
  try {
    return ok(await getLearnerAcademyDashboard(userId));
  } catch (error) {
    console.error("Failed to load learner Academy dashboard", error);
    return problem(500, "ACADEMY_LEARNER_FAILED", "Your Academy dashboard could not be loaded.");
  }
}
