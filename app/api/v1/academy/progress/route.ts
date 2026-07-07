import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { completeLessonForLearner } from "@/lib/academy/academy-progress";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to update your learning progress.");

  const body = await request.json();
  const lessonId = typeof body.lessonId === "string" ? body.lessonId : "";
  if (!lessonId) return problem(400, "LESSON_REQUIRED", "Choose a lesson to mark complete.");

  try {
    const result = await completeLessonForLearner(userId, lessonId);
    if (result === "LESSON_NOT_FOUND") return problem(404, "LESSON_NOT_FOUND", "This lesson could not be found.");
    if (result === "NOT_ENROLLED") return problem(403, "NOT_ENROLLED", "You do not have active access to this course.");
    return ok(result);
  } catch (error) {
    console.error("Failed to update lesson progress", error);
    return problem(500, "PROGRESS_UPDATE_FAILED", "Your progress could not be saved.");
  }
}
