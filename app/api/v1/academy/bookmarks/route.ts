import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to bookmark lessons.");

  const body = await request.json();
  const lessonId = String(body.lessonId ?? "");
  const bookmarked = body.bookmarked !== false;

  if (!lessonId) return problem(400, "MISSING_LESSON", "lessonId is required.");

  const prisma = getMainPrisma();
  const lesson = await prisma.trainingLesson.findUnique({
    where: { id: lessonId },
    include: { section: { include: { module: true } } },
  });
  if (!lesson) return problem(404, "NOT_FOUND", "Lesson not found.");

  const courseId = lesson.section.module.courseId;
  const enrolment = await prisma.courseEnrolment.findUnique({
    where: { courseId_agentId: { courseId, agentId: userId } },
  });
  if (!enrolment || enrolment.status !== "ACTIVE") {
    return problem(403, "NOT_ENROLLED", "Enrol in this course to bookmark lessons.");
  }

  const progress = await prisma.lessonProgress.upsert({
    where: { lessonId_agentId: { lessonId, agentId: userId } },
    create: {
      lessonId,
      agentId: userId,
      status: bookmarked ? "BOOKMARKED" : "IN_PROGRESS",
      lastViewedAt: new Date(),
    },
    update: {
      status: bookmarked ? "BOOKMARKED" : "IN_PROGRESS",
      lastViewedAt: new Date(),
    },
  });

  return ok({ lessonId, bookmarked: progress.status === "BOOKMARKED" });
}

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to view bookmarks.");

  const prisma = getMainPrisma();
  const bookmarks = await prisma.lessonProgress.findMany({
    where: { agentId: userId, status: "BOOKMARKED" },
    include: {
      lesson: {
        include: { section: { include: { module: { include: { course: true } } } } },
      },
    },
    orderBy: { lastViewedAt: "desc" },
    take: 20,
  });

  return ok({
    bookmarks: bookmarks.map((entry) => ({
      lessonId: entry.lessonId,
      title: entry.lesson.title,
      courseId: entry.lesson.section.module.courseId,
      courseTitle: entry.lesson.section.module.course.title,
      lastViewedAt: entry.lastViewedAt.toISOString(),
    })),
  });
}
