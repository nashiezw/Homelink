import { ok, problem } from "@/lib/api/response";
import { getPublicBlogIndex } from "@/lib/blog/blog-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const result = await getPublicBlogIndex({
      query: url.searchParams.get("q") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      tag: url.searchParams.get("tag") ?? undefined,
      page: Number(url.searchParams.get("page") ?? 1),
      limit: Number(url.searchParams.get("limit") ?? 9),
      popular: url.searchParams.get("popular") === "true",
    });
    return ok(result);
  } catch (error) {
    console.error("Blog index failed", error);
    return problem(500, "BLOG_UNAVAILABLE", "Blog articles could not be loaded.");
  }
}
