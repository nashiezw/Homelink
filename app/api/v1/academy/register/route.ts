import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { registerPublicLearner } from "@/lib/academy/public-academy-repository";
import { getPostgresPublicUserById, shouldUsePostgresAuth } from "@/lib/auth/postgres-auth";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Create or sign in to a learner account before registering.");
  const body = await request.json();
  const courseId = typeof body.courseId === "string" ? body.courseId : "";
  if (!courseId) return problem(400, "COURSE_REQUIRED", "Choose an Academy course.");

  const user = shouldUsePostgresAuth()
    ? await getPostgresPublicUserById(userId)
    : getStore().getUserById(userId);
  if (!user) return problem(401, "UNAUTHORIZED", "Your session is no longer valid.");

  const registrationIntent =
    body.registrationIntent === "AGENT_TRAINING" || body.registrationIntent === "TRAINING_ONLY"
      ? body.registrationIntent
      : undefined;
  const isAgent = user.roles?.includes("AGENT") ?? false;

  const result = await registerPublicLearner({
    learnerId: userId,
    courseId,
    fullName: typeof body.fullName === "string" && body.fullName.trim() ? body.fullName : user.name,
    email: typeof body.email === "string" && body.email.trim() ? body.email : user.email,
    phone: typeof body.phone === "string" ? body.phone : user.phone ?? undefined,
    organisation: typeof body.organisation === "string" ? body.organisation : undefined,
    motivation: typeof body.motivation === "string" ? body.motivation : undefined,
    paymentMethod: typeof body.paymentMethod === "string" ? body.paymentMethod : undefined,
    registrationIntent,
    isAgent,
  });
  if (result === "COURSE_NOT_AVAILABLE") {
    return problem(404, "COURSE_NOT_AVAILABLE", "This course is not currently open for public registration.");
  }
  return ok(result);
}
