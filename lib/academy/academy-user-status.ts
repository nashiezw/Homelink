import { AcademyRegistrationStatus } from "@prisma/client";
import { getMainPrisma } from "@/lib/db/main-prisma";

export type CourseRegistrationSummary = {
  courseId: string;
  courseTitle: string;
  status: AcademyRegistrationStatus;
  paymentId: string | null;
};

export async function getAcademyUserStatus(userId: string) {
  const prisma = getMainPrisma();
  const [applications, activeEnrolments] = await Promise.all([
    prisma.academyLearnerApplication.findMany({
      where: { learnerId: userId },
      include: { course: { select: { id: true, title: true, slug: true } }, payment: { select: { id: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.courseEnrolment.findMany({
      where: { agentId: userId, status: "ACTIVE" },
      select: { courseId: true },
    }),
  ]);

  const activeEnrolmentIds = new Set(activeEnrolments.map((entry) => entry.courseId));
  const approved = applications.filter((entry) => entry.status === AcademyRegistrationStatus.APPROVED);
  const pending = applications.filter(
    (entry) =>
      entry.status === AcademyRegistrationStatus.PENDING_PAYMENT ||
      entry.status === AcademyRegistrationStatus.PAYMENT_UPLOADED,
  );

  const registrationsByCourseId = Object.fromEntries(
    applications.map((entry) => [
      entry.courseId,
      {
        courseId: entry.courseId,
        courseTitle: entry.course.title,
        status: entry.status,
        paymentId: entry.payment?.id ?? null,
      } satisfies CourseRegistrationSummary,
    ]),
  );

  const hasActiveAccess = approved.length > 0 || activeEnrolmentIds.size > 0;
  const hasLearnerActivity = applications.length > 0 || activeEnrolmentIds.size > 0;
  const primaryApproved = approved[0];

  return {
    hasActiveAccess,
    hasLearnerActivity,
    activeEnrolments: approved.map((entry) => ({
      courseId: entry.courseId,
      courseTitle: entry.course.title,
      slug: entry.course.slug,
    })),
    pendingApplications: pending.map((entry) => ({
      courseId: entry.courseId,
      courseTitle: entry.course.title,
      status: entry.status,
      paymentId: entry.payment?.id ?? null,
    })),
    registrationsByCourseId,
    primaryCourseId: primaryApproved?.courseId ?? pending[0]?.courseId ?? null,
    metrics: {
      activeEnrolments: Math.max(approved.length, activeEnrolmentIds.size),
      pendingApplications: pending.length,
    },
  };
}

export function resolveAcademyDestination(hasLearnerActivity: boolean, isSignedIn: boolean) {
  if (isSignedIn && hasLearnerActivity) return "/dashboard/academy";
  return "/academy";
}
