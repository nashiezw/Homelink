import { createHash } from "crypto";
import { created, ok, problem } from "@/lib/api/response";
import { createBlogReaderQuestion, getPublicReaderQuestionDigest } from "@/lib/blog/blog-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return ok(await getPublicReaderQuestionDigest());
  } catch (error) {
    console.error("Reader questions failed", error);
    return problem(500, "QUESTIONS_UNAVAILABLE", "Reader questions could not be loaded.");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.company) return ok({ accepted: true });
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
    const ipHash = ip ? createHash("sha256").update(ip).digest("hex") : null;
    return created(await createBlogReaderQuestion({
      postId: body.postId ? String(body.postId) : null,
      name: String(body.name ?? ""),
      email: body.email ? String(body.email) : null,
      city: body.city ? String(body.city) : null,
      question: String(body.question ?? ""),
      ipHash,
      userAgent: request.headers.get("user-agent"),
    }));
  } catch (error) {
    console.error("Reader question submit failed", error);
    return problem(400, "QUESTION_NOT_SAVED", error instanceof Error ? error.message : "Your question could not be saved.");
  }
}
