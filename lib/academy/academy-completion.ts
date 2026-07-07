import { getMainPrisma } from "@/lib/db/main-prisma";
import { ACADEMY_PROGRAMME_COURSES, getProgrammeCourse } from "@/lib/academy/academy-programme";

export async function canAccessProgrammeCourse(learnerId: string, courseId: string) {
  const course = getProgrammeCourse(courseId);
  if (!course?.prerequisiteCourseId) return { allowed: true as const };
  const hasPrerequisite = await getMainPrisma().certificateIssue.findFirst({
    where: { agentId: learnerId, courseId: course.prerequisiteCourseId, status: "ACTIVE" },
  });
  if (hasPrerequisite) return { allowed: true as const };
  const prerequisite = getProgrammeCourse(course.prerequisiteCourseId);
  return {
    allowed: false as const,
    reason: `Complete ${prerequisite?.title ?? "the previous course"} and earn its certificate first.`,
    prerequisiteCourseId: course.prerequisiteCourseId,
  };
}

export async function hasPassedCourseAssessments(learnerId: string, courseId: string) {
  const programme = getProgrammeCourse(courseId);
  if (!programme) return true;

  const prisma = getMainPrisma();

  for (const quizId of programme.quizIds) {
    const passed = await prisma.quizAttempt.findFirst({
      where: { quizId, agentId: learnerId, status: "PASSED" },
    });
    if (!passed) return false;
  }

  for (const assignmentId of programme.assignmentIds) {
    const submission = await prisma.assignmentSubmission.findFirst({
      where: {
        assignmentId,
        agentId: learnerId,
        status: { in: ["SUBMITTED", "APPROVED", "GRADED"] },
      },
    });
    if (!submission) return false;
  }

  if (programme.requiresFinalExam) {
    const passedExam = await prisma.examAttempt.findFirst({
      where: { agentId: learnerId, status: "PASSED", exam: { courseId } },
    });
    if (!passedExam) return false;
  }

  return true;
}

export async function awardProgrammeBadge(learnerId: string, courseId: string) {
  const programme = getProgrammeCourse(courseId);
  if (!programme) return null;

  return getMainPrisma().agentBadge.upsert({
    where: { badgeId_agentId: { badgeId: programme.badgeId, agentId: learnerId } },
    create: { badgeId: programme.badgeId, agentId: learnerId, awardedAt: new Date() },
    update: {},
  });
}

export async function getProgrammeProgressSummary(learnerId: string) {
  const prisma = getMainPrisma();
  const [certificates, badges, progressRows] = await Promise.all([
    prisma.certificateIssue.findMany({ where: { agentId: learnerId, status: "ACTIVE" } }),
    prisma.agentBadge.findMany({ where: { agentId: learnerId }, include: { badge: true } }),
    prisma.courseProgress.findMany({ where: { agentId: learnerId } }),
  ]);

  const certByCourse = new Map(certificates.map((c) => [c.courseId, c]));
  const badgeIds = new Set(badges.map((b) => b.badgeId));
  const progressByCourse = new Map(progressRows.map((p) => [p.courseId, p.percentComplete]));

  return ACADEMY_PROGRAMME_COURSES.map((course) => {
    const certificate = certByCourse.get(course.id);
    const previousCert = course.prerequisiteCourseId ? certByCourse.get(course.prerequisiteCourseId) : true;
    const unlocked = !course.prerequisiteCourseId || !!previousCert;
    return {
      id: course.id,
      title: course.title,
      subtitle: course.subtitle,
      theme: course.theme,
      sortOrder: course.sortOrder,
      unlocked,
      progress: progressByCourse.get(course.id) ?? 0,
      completed: !!certificate,
      badgeEarned: badgeIds.has(course.badgeId),
      badgeName: course.badgeName,
      certificate: certificate
        ? {
            id: certificate.id,
            certificateNumber: certificate.certificateNumber,
            issuedAt: certificate.issuedAt.toISOString(),
            downloadUrl: `/dashboard/academy/certificate/${certificate.id}`,
          }
        : null,
    };
  });
}
