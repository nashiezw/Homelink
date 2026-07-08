import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getLearnerAcademyDashboard } from "@/lib/academy/public-academy-repository";
import { getPostgresPublicUserById, shouldUsePostgresAuth } from "@/lib/auth/postgres-auth";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to view your learner dashboard.");
  const user = shouldUsePostgresAuth()
    ? await getPostgresPublicUserById(userId)
    : getStore().getUserById(userId);
  try {
    return ok(await getLearnerAcademyDashboard(userId, { isAgent: user?.roles?.includes("AGENT") ?? false }));
  } catch (error) {
    console.error("Failed to load learner Academy dashboard", error);
    return problem(500, "ACADEMY_LEARNER_FAILED", "Your Academy dashboard could not be loaded.");
  }
}
