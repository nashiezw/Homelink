import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to view discussions.");

  const url = new URL(request.url);
  const courseId = url.searchParams.get("courseId");
  if (!courseId) return problem(400, "MISSING_COURSE", "courseId is required.");

  const prisma = getMainPrisma();
  const enrolment = await prisma.courseEnrolment.findUnique({
    where: { courseId_agentId: { courseId, agentId: userId } },
  });
  if (!enrolment || enrolment.status !== "ACTIVE") {
    return problem(403, "NOT_ENROLLED", "Enrol in this course to view discussions.");
  }

  const threads = await prisma.discussionThread.findMany({
    where: { courseId },
    include: {
      posts: { orderBy: { createdAt: "asc" }, take: 50 },
    },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });

  return ok({
    threads: threads.map((thread) => ({
      id: thread.id,
      title: thread.title,
      pinned: thread.pinned,
      locked: thread.locked,
      authorId: thread.authorId,
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
      posts: thread.posts.map((post) => ({
        id: post.id,
        authorId: post.authorId,
        body: post.body,
        createdAt: post.createdAt.toISOString(),
        bookmarked: post.bookmarkedBy.includes(userId),
      })),
    })),
  });
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to post.");

  const body = await request.json();
  const courseId = String(body.courseId ?? "");
  const title = String(body.title ?? "").trim();
  const postBody = String(body.body ?? "").trim();
  const threadId = body.threadId ? String(body.threadId) : null;

  if (!courseId) return problem(400, "MISSING_COURSE", "courseId is required.");

  const prisma = getMainPrisma();
  const enrolment = await prisma.courseEnrolment.findUnique({
    where: { courseId_agentId: { courseId, agentId: userId } },
  });
  if (!enrolment || enrolment.status !== "ACTIVE") {
    return problem(403, "NOT_ENROLLED", "Enrol in this course to participate.");
  }

  if (threadId) {
    const thread = await prisma.discussionThread.findUnique({ where: { id: threadId } });
    if (!thread || thread.locked) return problem(403, "THREAD_LOCKED", "This thread is locked.");
    const post = await prisma.discussionPost.create({
      data: { threadId, authorId: userId, body: postBody },
    });
    await prisma.discussionThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });
    return ok({ postId: post.id });
  }

  if (!title || !postBody) return problem(400, "INVALID", "Title and body are required for a new thread.");

  const thread = await prisma.discussionThread.create({
    data: {
      courseId,
      title,
      authorId: userId,
      posts: { create: { authorId: userId, body: postBody } },
    },
  });
  return ok({ threadId: thread.id });
}
