import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const prisma = getMainPrisma();
    const { courseId } = await params;

    const forums = await prisma.forum.findMany({
      where: { courseId },
      include: {
        _count: {
          select: {
            posts: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok({ forums });
  } catch (error) {
    console.error("Failed to get forums:", error);
    return problem(500, "SERVER_ERROR", "Failed to get forums.");
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to create a forum.");

  try {
    const prisma = getMainPrisma();
    const { courseId } = await params;
    const body = await request.json();
    const { title, description } = body;

    if (!title) {
      return problem(400, "MISSING_TITLE", "Forum title is required.");
    }

    const forum = await prisma.forum.create({
      data: {
        courseId,
        title,
        description,
      },
    });

    return ok({
      message: "Forum created successfully.",
      forum,
    });
  } catch (error) {
    console.error("Failed to create forum:", error);
    return problem(500, "SERVER_ERROR", "Failed to create forum.");
  }
}
