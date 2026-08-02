import { createHash } from "crypto";
import { created, ok, problem } from "@/lib/api/response";
import { createBlogComment, getPublicBlogComments } from "@/lib/blog/blog-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const postId = url.searchParams.get("postId");
  if (!postId) return problem(400, "POST_REQUIRED", "Article details are required.");
  try {
    return ok(await getPublicBlogComments(postId));
  } catch (error) {
    console.error("Blog comments failed", error);
    return problem(500, "COMMENTS_UNAVAILABLE", "Comments could not be loaded.");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.company) return ok({ accepted: true });
    const authorName = String(body.authorName ?? "").trim();
    const commentBody = String(body.body ?? "").trim();
    if (authorName.length < 2) return problem(400, "NAME_REQUIRED", "Please enter your name.");
    if (commentBody.length < 8) return problem(400, "COMMENT_TOO_SHORT", "Please write a fuller comment before posting.");
    if (commentBody.length > 1200) return problem(400, "COMMENT_TOO_LONG", "Please keep your comment under 1,200 characters.");

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
    const ipHash = ip ? createHash("sha256").update(ip).digest("hex") : null;
    const comment = await createBlogComment({
      postId: String(body.postId ?? ""),
      parentId: body.parentId ? String(body.parentId) : null,
      authorName,
      authorEmail: body.authorEmail ? String(body.authorEmail) : null,
      body: commentBody,
      ipHash,
      userAgent: request.headers.get("user-agent"),
    });
    return created(comment);
  } catch (error) {
    console.error("Blog comment submit failed", error);
    return problem(400, "COMMENT_NOT_SAVED", error instanceof Error ? error.message : "Your comment could not be saved.");
  }
}
