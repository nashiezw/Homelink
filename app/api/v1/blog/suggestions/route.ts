import { ok, problem } from "@/lib/api/response";
import { getBlogSearchSuggestions } from "@/lib/blog/blog-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  try {
    return ok(await getBlogSearchSuggestions(query));
  } catch (error) {
    console.error("Blog suggestions failed", error);
    return problem(500, "BLOG_SUGGESTIONS_UNAVAILABLE", "Search suggestions could not be loaded.");
  }
}
