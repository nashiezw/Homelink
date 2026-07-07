import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getAdminCourseTree } from "@/lib/academy/postgres-academy-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ courseId: string }> }) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;

  const { courseId } = await context.params;
  try {
    const tree = await getAdminCourseTree(courseId);
    if (!tree) return problem(404, "NOT_FOUND", "Course not found.");
    return ok(tree);
  } catch (error) {
    console.error("Failed to load course tree", error);
    return problem(500, "COURSE_TREE_FAILED", "Course structure could not be loaded.");
  }
}
