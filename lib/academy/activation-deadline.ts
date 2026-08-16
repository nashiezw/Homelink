import { AcademyRegistrationStatus, type Prisma } from "@prisma/client";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const FIRST_LESSON_START_DEADLINE_HOURS = 72;
const FIRST_LESSON_START_DEADLINE_MS = FIRST_LESSON_START_DEADLINE_HOURS * 60 * 60 * 1000;

type Actor = { id?: string; name?: string };

export function getFirstLessonDeadline(startedAt: Date | string | null | undefined) {
  if (!startedAt) return null;
  const start = startedAt instanceof Date ? startedAt : new Date(startedAt);
  if (!Number.isFinite(start.getTime())) return null;
  return new Date(start.getTime() + FIRST_LESSON_START_DEADLINE_MS);
}

export function getReservationTimeLeft(deadline: Date | string | null | undefined) {
  if (!deadline) return { expired: false, hoursRemaining: null as number | null };
  const value = deadline instanceof Date ? deadline : new Date(deadline);
  if (!Number.isFinite(value.getTime())) return { expired: false, hoursRemaining: null as number | null };
  const remainingMs = value.getTime() - Date.now();
  return {
    expired: remainingMs <= 0,
    hoursRemaining: Math.max(0, Math.ceil(remainingMs / (60 * 60 * 1000))),
  };
}

export async function releaseExpiredFirstLessonReservations(actor: Actor = {}) {
  const prisma = getMainPrisma();
  const cutoff = new Date(Date.now() - FIRST_LESSON_START_DEADLINE_MS);
  const applications = await prisma.academyLearnerApplication.findMany({
    where: {
      status: AcademyRegistrationStatus.APPROVED,
      OR: [
        { accessStartsAt: { lte: cutoff } },
        { accessStartsAt: null, approvedAt: { lte: cutoff } },
      ],
    },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          modules: {
            orderBy: { sortOrder: "asc" },
            select: {
              sortOrder: true,
              sections: {
                orderBy: { sortOrder: "asc" },
                select: {
                  sortOrder: true,
                  lessons: {
                    orderBy: { sortOrder: "asc" },
                    select: { id: true, title: true },
                    take: 1,
                  },
                },
                take: 1,
              },
            },
            take: 1,
          },
        },
      },
      learner: { select: { name: true, email: true } },
    },
  });

  let released = 0;
  const checked = applications.length;

  for (const application of applications) {
    const firstLesson = getFirstCourseLesson(application.course);
    if (!firstLesson) continue;

    const opened = await prisma.lessonProgress.findUnique({
      where: { lessonId_agentId: { lessonId: firstLesson.id, agentId: application.learnerId } },
      select: { id: true },
    });
    if (opened) continue;

    const reservationStartedAt = application.accessStartsAt ?? application.approvedAt ?? application.updatedAt;
    const deadline = getFirstLessonDeadline(reservationStartedAt);
    if (!deadline || deadline.getTime() > Date.now()) continue;

    await prisma.$transaction([
      prisma.academyLearnerApplication.update({
        where: { id: application.id },
        data: {
          status: AcademyRegistrationStatus.EXPIRED,
          adminNote: appendAdminNote(
            application.adminNote,
            `Place released because Lesson 1 was not opened within ${FIRST_LESSON_START_DEADLINE_HOURS} hours.`,
          ),
        },
      }),
      prisma.courseEnrolment.updateMany({
        where: { courseId: application.courseId, agentId: application.learnerId, status: "ACTIVE" },
        data: { status: "EXPIRED" },
      }),
      prisma.trainingNotification.create({
        data: {
          userId: application.learnerId,
          eventType: "ACADEMY_PLACE_RELEASED",
          channel: "IN_APP",
          subject: "Academy place released",
          body: `Your reserved place for ${application.course.title} was released because Lesson 1 was not opened within ${FIRST_LESSON_START_DEADLINE_HOURS} hours. Contact admin if you still want to join.`,
        },
      }),
      prisma.trainingAuditLog.create({
        data: {
          actorId: actor.id,
          action: "academy.activation.place_released",
          target: application.id,
          metadata: {
            actorName: actor.name ?? "System",
            courseId: application.courseId,
            courseTitle: application.course.title,
            learnerId: application.learnerId,
            learnerEmail: application.learner?.email ?? application.email,
            firstLessonId: firstLesson.id,
            firstLessonTitle: firstLesson.title,
            reservationStartedAt: reservationStartedAt?.toISOString() ?? null,
            deadlineAt: deadline.toISOString(),
            windowHours: FIRST_LESSON_START_DEADLINE_HOURS,
          } satisfies Prisma.InputJsonObject,
        },
      }),
    ]);
    released += 1;
  }

  return { checked, released, windowHours: FIRST_LESSON_START_DEADLINE_HOURS };
}

function getFirstCourseLesson(course: {
  modules: Array<{
    sections: Array<{
      lessons: Array<{ id: string; title: string }>;
    }>;
  }>;
}) {
  return course.modules.flatMap((module) => module.sections.flatMap((section) => section.lessons))[0] ?? null;
}

function appendAdminNote(current: string | null | undefined, note: string) {
  const stamped = `${new Date().toISOString()} - ${note}`;
  return current?.trim() ? `${current.trim()}\n${stamped}` : stamped;
}
