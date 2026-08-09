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
    const roles = user?.roles ?? [];
    return ok(await getLearnerAcademyDashboard(userId, {
      isAgent: roles.includes("AGENT"),
      isAdmin: roles.some((role) => ["ADMIN", "SUPER_ADMIN", "ACADEMY_ADMIN", "AGENCY_ADMIN"].includes(role)),
      isTrainer: roles.includes("TRAINER"),
      isPublicLearner: roles.includes("PUBLIC_LEARNER"),
    }));
  } catch (error) {
    console.error("Failed to load learner Academy dashboard", error);
    return problem(500, "ACADEMY_LEARNER_FAILED", "Your Academy dashboard could not be loaded.");
  }
}
