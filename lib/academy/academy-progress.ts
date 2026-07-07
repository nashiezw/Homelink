import { getMainPrisma } from "@/lib/db/main-prisma";
import { awardProgrammeBadge, hasPassedCourseAssessments } from "@/lib/academy/academy-completion";
import { getProgrammeCourse } from "@/lib/academy/academy-programme";

type CourseWithLessons = {
  id: string;
  certificateEnabled: boolean;
  modules: Array<{
    sections: Array<{ lessons: Array<{ id: string; estimatedMinutes: number }> }>;
  }>;
};

export async function countCourseLessons(courseId: string): Promise<number> {
  const prisma = getMainPrisma();
  const lessons = await prisma.trainingLesson.count({
    where: { section: { module: { courseId } } },
  });
  return lessons;
}

export async function getCompletedLessonIds(learnerId: string, courseId: string): Promise<Set<string>> {
  const prisma = getMainPrisma();
  const rows = await prisma.lessonProgress.findMany({
    where: {
      agentId: learnerId,
      status: "COMPLETED",
      lesson: { section: { module: { courseId } } },
    },
    select: { lessonId: true },
  });
  return new Set(rows.map((row) => row.lessonId));
}

export async function completeLessonForLearner(learnerId: string, lessonId: string) {
  const prisma = getMainPrisma();
  const lesson = await prisma.trainingLesson.findUnique({
    where: { id: lessonId },
    include: {
      section: {
        include: {
          module: {
            include: {
              course: {
                include: {
                  modules: {
                    include: { sections: { include: { lessons: { select: { id: true, estimatedMinutes: true } } } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!lesson) return "LESSON_NOT_FOUND" as const;

  const course = lesson.section.module.course;
  const enrolment = await prisma.courseEnrolment.findUnique({
    where: { courseId_agentId: { courseId: course.id, agentId: learnerId } },
  });
  if (!enrolment || enrolment.status !== "ACTIVE") return "NOT_ENROLLED" as const;

  const now = new Date();
  await prisma.lessonProgress.upsert({
    where: { lessonId_agentId: { lessonId, agentId: learnerId } },
    create: {
      lessonId,
      agentId: learnerId,
      status: "COMPLETED",
      percentComplete: 100,
      completedAt: now,
      lastViewedAt: now,
      readingSeconds: lesson.estimatedMinutes * 60,
    },
    update: {
      status: "COMPLETED",
      percentComplete: 100,
      completedAt: now,
      lastViewedAt: now,
    },
  });

  const allLessonIds = course.modules.flatMap((module) =>
    module.sections.flatMap((section) => section.lessons.map((entry) => entry.id))
  );
  const completedIds = await getCompletedLessonIds(learnerId, course.id);
  const completedCount = allLessonIds.filter((id) => completedIds.has(id)).length;
  const percentComplete = allLessonIds.length ? Math.round((completedCount / allLessonIds.length) * 100) : 0;
  const learningMinutes = course.modules.reduce(
    (sum, module) =>
      sum +
      module.sections.reduce(
        (sectionSum, section) =>
          sectionSum +
          section.lessons.reduce(
            (lessonSum, entry) => lessonSum + (completedIds.has(entry.id) ? entry.estimatedMinutes : 0),
            0
          ),
        0
      ),
    0
  );
  const courseCompleted = percentComplete >= 100;

  await prisma.courseProgress.upsert({
    where: { courseId_agentId: { courseId: course.id, agentId: learnerId } },
    create: {
      courseId: course.id,
      agentId: learnerId,
      status: courseCompleted ? "COMPLETED" : percentComplete > 0 ? "IN_PROGRESS" : "NOT_STARTED",
      percentComplete,
      learningMinutes,
      completedAt: courseCompleted ? now : null,
    },
    update: {
      status: courseCompleted ? "COMPLETED" : percentComplete > 0 ? "IN_PROGRESS" : "NOT_STARTED",
      percentComplete,
      learningMinutes,
      completedAt: courseCompleted ? now : null,
    },
  });

  if (courseCompleted && course.certificateEnabled) {
    await tryCompleteCourseCertification(learnerId, course.id);
  }

  await prisma.trainingNotification.create({
    data: {
      userId: learnerId,
      eventType: courseCompleted ? "COURSE_COMPLETED" : "LESSON_COMPLETED",
      channel: "IN_APP",
      subject: courseCompleted ? "Course completed" : "Lesson completed",
      body: courseCompleted
        ? `Congratulations! You completed ${course.title}.`
        : `You completed "${lesson.title}" in ${course.title}.`,
    },
  });

  return {
    lessonId,
    courseId: course.id,
    percentComplete,
    courseCompleted,
  };
}

export async function issueCertificateIfMissing(learnerId: string, courseId: string) {
  const prisma = getMainPrisma();
  const existing = await prisma.certificateIssue.findFirst({
    where: { agentId: learnerId, courseId, status: "ACTIVE" },
  });
  if (existing) return existing;

  const [course, template, settingsRow] = await Promise.all([
    prisma.trainingCourse.findUnique({ where: { id: courseId } }),
    prisma.certificateTemplate.findFirst({ where: { active: true }, orderBy: { updatedAt: "desc" } }),
    prisma.trainingSetting.findUnique({ where: { id: "singleton" } }),
  ]);
  if (!course) return null;

  const settingsPayload = (settingsRow?.payload ?? {}) as Record<string, unknown>;
  const templateJson = (template?.templateJson ?? {}) as Record<string, unknown>;
  const programme = getProgrammeCourse(courseId);
  const prefix = programme?.certificatePrefix
    ?? (typeof settingsPayload.certificatePrefix === "string" ? settingsPayload.certificatePrefix : null)
    ?? (typeof templateJson.certificateNumberPrefix === "string" ? templateJson.certificateNumberPrefix : null)
    ?? "HLA";
  const expiryDays = typeof templateJson.expiryDays === "number" ? templateJson.expiryDays : 365;
  const certificateNumber = `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const expiresAt = new Date(Date.now() + expiryDays * 86400000);

  const issue = await prisma.certificateIssue.create({
    data: {
      certificateNumber,
      courseId,
      agentId: learnerId,
      templateId: template?.id ?? null,
      status: "ACTIVE",
      issuedAt: new Date(),
      expiresAt,
      qrCodeUrl: `/api/v1/academy/certificates/verify/${encodeURIComponent(certificateNumber)}`,
    },
  });
  await prisma.certificateIssue.update({
    where: { id: issue.id },
    data: { pdfUrl: `/dashboard/academy/certificate/${issue.id}` },
  });
  return { ...issue, pdfUrl: `/dashboard/academy/certificate/${issue.id}` };
}

export async function tryCompleteCourseCertification(learnerId: string, courseId: string) {
  const prisma = getMainPrisma();
  const course = await prisma.trainingCourse.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        include: { sections: { include: { lessons: { select: { id: true, estimatedMinutes: true } } } } },
      },
    },
  });
  if (!course?.certificateEnabled) return null;

  const completedIds = await getCompletedLessonIds(learnerId, courseId);
  const { percentComplete } = calculateCourseProgress(course, completedIds);
  if (percentComplete < 100) return null;

  const assessmentsPassed = await hasPassedCourseAssessments(learnerId, courseId);
  if (!assessmentsPassed) return null;

  const certificate = await issueCertificateIfMissing(learnerId, courseId);
  await awardProgrammeBadge(learnerId, courseId);
  return certificate;
}

export function calculateCourseProgress(
  course: CourseWithLessons,
  completedLessonIds: Set<string>
) {
  const allLessons = course.modules.flatMap((module) =>
    module.sections.flatMap((section) => section.lessons)
  );
  const total = allLessons.length;
  const completed = allLessons.filter((lesson) => completedLessonIds.has(lesson.id)).length;
  const percentComplete = total ? Math.round((completed / total) * 100) : 0;
  return { total, completed, percentComplete };
}
