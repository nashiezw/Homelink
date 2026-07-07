import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getLearnerCourseDetail } from "@/lib/academy/public-academy-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ courseId: string }> }) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to view this course.");

  const { courseId } = await context.params;
  if (!courseId) return problem(400, "COURSE_REQUIRED", "Course id is required.");

  try {
    const result = await getLearnerCourseDetail(userId, courseId);
    if (result === "NOT_ENROLLED") return problem(403, "NOT_ENROLLED", "You do not have access to this course.");
    if (result === "NOT_FOUND") return problem(404, "NOT_FOUND", "Course not found.");
    return ok(result);
  } catch (error) {
    console.error("Failed to load learner course", error);
    return problem(500, "COURSE_LOAD_FAILED", "Course could not be loaded.");
  }
}
