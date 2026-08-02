import { createHash } from "crypto";
import { created, problem } from "@/lib/api/response";
import { createBlogArticleFeedback } from "@/lib/blog/blog-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
    const ipHash = ip ? createHash("sha256").update(ip).digest("hex") : null;
    return created(await createBlogArticleFeedback({
      postId: String(body.postId ?? ""),
      vote: String(body.vote ?? "HELPFUL"),
      note: body.note ? String(body.note) : null,
      ipHash,
      userAgent: request.headers.get("user-agent"),
    }));
  } catch (error) {
    console.error("Blog feedback failed", error);
    return problem(400, "FEEDBACK_NOT_SAVED", error instanceof Error ? error.message : "Feedback could not be saved.");
  }
}
