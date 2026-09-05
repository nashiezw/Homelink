import { AcademyRegistrationStatus, type Prisma } from "@prisma/client";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { releaseAcademyCouponUsageByPayment } from "@/lib/academy/coupon-usage";

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
      OR: [
        {
          status: AcademyRegistrationStatus.APPROVED,
          OR: [
            { accessStartsAt: { lte: cutoff } },
            { accessStartsAt: null, approvedAt: { lte: cutoff } },
          ],
        },
        { status: AcademyRegistrationStatus.EXPIRED },
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
  let couponUsagesReleased = 0;
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
    if (application.status === AcademyRegistrationStatus.APPROVED && (!deadline || deadline.getTime() > Date.now())) continue;

    const result = await releaseFirstLessonReservation(application.id, actor, { firstLesson, deadline, reservationStartedAt });
    released += 1;
    couponUsagesReleased += result.couponUsagesReleased;
  }

  return { checked, released, couponUsagesReleased, windowHours: FIRST_LESSON_START_DEADLINE_HOURS };
}

export async function releaseFirstLessonReservation(
  applicationId: string,
  actor: Actor,
  knownContext?: {
    firstLesson: { id: string; title: string };
    deadline: Date | null;
    reservationStartedAt: Date | null;
  },
) {
  const prisma = getMainPrisma();
  const application = await prisma.academyLearnerApplication.findUnique({
    where: { id: applicationId },
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
  if (!application) throw new Error("Learner application not found.");
  if (application.status === AcademyRegistrationStatus.RELEASED) {
    throw new Error("This learner place has already been released.");
  }
  if (application.status !== AcademyRegistrationStatus.APPROVED && application.status !== AcademyRegistrationStatus.EXPIRED) {
    throw new Error("Only approved or expired learner places can be released.");
  }

  const firstLesson = knownContext?.firstLesson ?? getFirstCourseLesson(application.course);
  if (!firstLesson) throw new Error("First lesson could not be found for this course.");

  const opened = await prisma.lessonProgress.findUnique({
    where: { lessonId_agentId: { lessonId: firstLesson.id, agentId: application.learnerId } },
    select: { id: true },
  });
  if (opened) throw new Error("This learner has already opened Lesson 1, so their place should not be released.");

  const reservationStartedAt = knownContext?.reservationStartedAt ?? application.accessStartsAt ?? application.approvedAt ?? application.updatedAt ?? null;
  const deadline = knownContext?.deadline ?? getFirstLessonDeadline(reservationStartedAt);
  if (application.status === AcademyRegistrationStatus.APPROVED && (!deadline || deadline.getTime() > Date.now())) {
    throw new Error("This learner's 72-hour start window has not expired yet.");
  }

  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const couponRelease = await releaseAcademyCouponUsageByPayment(tx, application.paymentId);
    await tx.academyLearnerApplication.update({
      where: { id: application.id },
      data: {
        status: AcademyRegistrationStatus.RELEASED,
        accessEndsAt: now,
        adminNote: appendAdminNote(
          application.adminNote,
          `Place permanently released because Lesson 1 was not opened within ${FIRST_LESSON_START_DEADLINE_HOURS} hours. Any linked coupon usage was freed.`,
        ),
      },
    });
    await tx.courseEnrolment.updateMany({
      where: { courseId: application.courseId, agentId: application.learnerId, status: { in: ["ACTIVE", "EXPIRED"] } },
      data: { status: "RELEASED", dueAt: now },
    });
    await tx.trainingNotification.create({
      data: {
        userId: application.learnerId,
        eventType: "ACADEMY_PLACE_RELEASED",
        channel: "IN_APP",
        subject: "Academy place released",
        body: `Your reserved place for ${application.course.title} was released because Lesson 1 was not opened within ${FIRST_LESSON_START_DEADLINE_HOURS} hours. Contact admin if you still want to join.`,
      },
    });
    await tx.trainingAuditLog.create({
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
          paymentId: application.paymentId,
          couponUsageIds: couponRelease.releasedUsageIds,
          couponIds: couponRelease.couponIds,
          firstLessonId: firstLesson.id,
          firstLessonTitle: firstLesson.title,
          reservationStartedAt: reservationStartedAt?.toISOString() ?? null,
          deadlineAt: deadline?.toISOString() ?? null,
          releasedAt: now.toISOString(),
          windowHours: FIRST_LESSON_START_DEADLINE_HOURS,
        } satisfies Prisma.InputJsonObject,
      },
    });
    return couponRelease;
  });

  return {
    applicationId: application.id,
    learnerId: application.learnerId,
    courseId: application.courseId,
    status: AcademyRegistrationStatus.RELEASED,
    releasedAt: now.toISOString(),
    couponUsagesReleased: result.releasedUsageIds.length,
    couponIds: result.couponIds,
    windowHours: FIRST_LESSON_START_DEADLINE_HOURS,
  };
}

export async function reactivateFirstLessonReservation(applicationId: string, actor: Actor) {
  const prisma = getMainPrisma();
  const application = await prisma.academyLearnerApplication.findUnique({
    where: { id: applicationId },
    include: {
      course: { select: { id: true, title: true, accessDurationDays: true } },
      learner: { select: { name: true, email: true } },
    },
  });
  if (!application) throw new Error("Learner application not found.");
  if (application.status !== AcademyRegistrationStatus.EXPIRED) {
    throw new Error("Only expired learner places can be reactivated.");
  }

  const now = new Date();
  const accessEndsAt = new Date(now.getTime() + application.course.accessDurationDays * 86400000);
  const deadline = getFirstLessonDeadline(now);
  const note = `Place reactivated for another ${FIRST_LESSON_START_DEADLINE_HOURS} hours.`;

  await prisma.$transaction([
    prisma.academyLearnerApplication.update({
      where: { id: application.id },
      data: {
        status: AcademyRegistrationStatus.APPROVED,
        approvedById: actor.id,
        approvedAt: now,
        accessStartsAt: now,
        accessEndsAt,
        adminNote: appendAdminNote(application.adminNote, note),
      },
    }),
    prisma.courseEnrolment.upsert({
      where: { courseId_agentId: { courseId: application.courseId, agentId: application.learnerId } },
      create: { courseId: application.courseId, agentId: application.learnerId, status: "ACTIVE", dueAt: accessEndsAt },
      update: { status: "ACTIVE", dueAt: accessEndsAt },
    }),
    prisma.trainingNotification.create({
      data: {
        userId: application.learnerId,
        eventType: "ACADEMY_PLACE_REACTIVATED",
        channel: "IN_APP",
        subject: "Academy place reactivated",
        body: `Your Academy place for ${application.course.title} has been reactivated. Start Lesson 1 within ${FIRST_LESSON_START_DEADLINE_HOURS} hours to keep your place.`,
      },
    }),
    prisma.trainingAuditLog.create({
      data: {
        actorId: actor.id,
        action: "academy.activation.place_reactivated",
        target: application.id,
        metadata: {
          actorName: actor.name ?? "Admin",
          courseId: application.courseId,
          courseTitle: application.course.title,
          learnerId: application.learnerId,
          learnerEmail: application.learner?.email ?? application.email,
          accessStartsAt: now.toISOString(),
          accessEndsAt: accessEndsAt.toISOString(),
          deadlineAt: deadline?.toISOString() ?? null,
          windowHours: FIRST_LESSON_START_DEADLINE_HOURS,
        } satisfies Prisma.InputJsonObject,
      },
    }),
  ]);

  return {
    applicationId: application.id,
    learnerId: application.learnerId,
    courseId: application.courseId,
    status: AcademyRegistrationStatus.APPROVED,
    accessStartsAt: now.toISOString(),
    accessEndsAt: accessEndsAt.toISOString(),
    firstLessonStartDeadlineAt: deadline?.toISOString() ?? null,
    firstLessonStartWindowHours: FIRST_LESSON_START_DEADLINE_HOURS,
  };
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
