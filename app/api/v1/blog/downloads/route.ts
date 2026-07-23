import { ok, problem } from "@/lib/api/response";
import { trackBlogDownload } from "@/lib/blog/blog-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.postId || !body.url) return problem(400, "DOWNLOAD_REQUIRED", "Download details are required.");
    return ok(await trackBlogDownload(String(body.postId), String(body.label ?? "Download"), String(body.url)));
  } catch (error) {
    console.error("Blog download tracking failed", error);
    return problem(500, "DOWNLOAD_TRACK_FAILED", "Download could not be tracked.");
  }
}
