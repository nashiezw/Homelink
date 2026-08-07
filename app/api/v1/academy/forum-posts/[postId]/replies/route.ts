import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const prisma = getMainPrisma();
    const { postId } = await params;

    const replies = await prisma.forumReply.findMany({
      where: { postId },
      include: {
        learner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return ok({ replies });
  } catch (error) {
    console.error("Failed to get forum replies:", error);
    return problem(500, "SERVER_ERROR", "Failed to get forum replies.");
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to reply to a post.");

  try {
    const prisma = getMainPrisma();
    const { postId } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return problem(400, "MISSING_CONTENT", "Reply content is required.");
    }

    const reply = await prisma.forumReply.create({
      data: {
        postId,
        learnerId: userId,
        content,
      },
    });

    return ok({
      message: "Reply created successfully.",
      reply,
    });
  } catch (error) {
    console.error("Failed to create forum reply:", error);
    return problem(500, "SERVER_ERROR", "Failed to create forum reply.");
  }
}
