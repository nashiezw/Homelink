import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ forumId: string }> }) {
  try {
    const prisma = getMainPrisma();
    const { forumId } = await params;

    const posts = await prisma.forumPost.findMany({
      where: { forumId },
      include: {
        learner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok({ posts: posts.map(post => ({
      ...post,
      _count: {
        replies: Number(post._count.replies)
      }
    })) });
  } catch (error) {
    console.error("Failed to get forum posts:", error);
    return problem(500, "SERVER_ERROR", "Failed to get forum posts.");
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ forumId: string }> }) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to create a post.");

  try {
    const prisma = getMainPrisma();
    const { forumId } = await params;
    const body = await request.json();
    const { title, content } = body;

    if (!title || !content) {
      return problem(400, "MISSING_FIELDS", "Title and content are required.");
    }

    const post = await prisma.forumPost.create({
      data: {
        forumId,
        learnerId: userId,
        title,
        content,
      },
    });

    return ok({
      message: "Post created successfully.",
      post,
    });
  } catch (error) {
    console.error("Failed to create forum post:", error);
    return problem(500, "SERVER_ERROR", "Failed to create forum post.");
  }
}
