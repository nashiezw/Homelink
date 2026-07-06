import { ok, problem } from "@/lib/api/response";
import { listPublicAcademyCourses } from "@/lib/academy/public-academy-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok(await listPublicAcademyCourses());
  } catch (error) {
    console.error("Failed to load public Academy courses", error);
    return problem(500, "ACADEMY_COURSES_FAILED", "Academy courses could not be loaded.");
  }
}
