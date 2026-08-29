import { ok, problem } from "@/lib/api/response";
import { listPublicAcademyCourses } from "@/lib/academy/public-academy-repository";
import { isDatabaseUnavailableError } from "@/lib/db/production-schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = ok(await listPublicAcademyCourses());
    response.headers.set("Cache-Control", "public, max-age=300, s-maxage=600, stale-while-revalidate=600");
    return response;
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      const response = ok([]);
      response.headers.set("Cache-Control", "public, max-age=60, s-maxage=60");
      return response;
    }
    console.error("Failed to load public Academy courses", error);
    return problem(500, "ACADEMY_COURSES_FAILED", "Academy courses could not be loaded.");
  }
}
