import { getMainPrisma } from "@/lib/db/main-prisma";
import { ACADEMY_PROGRAMME_COURSES, getProgrammeCourse, PROGRAMME_COURSE_IDS } from "@/lib/academy/academy-programme";
import { TrainingCourseStatus } from "@prisma/client";
import { getCertificateEligibility } from "@/lib/academy/certificate-eligibility";

export async function canAccessProgrammeCourse(learnerId: string, courseId: string) {
  const course = getProgrammeCourse(courseId);
  if (!course?.prerequisiteCourseId) return { allowed: true as const };
  const hasPrerequisite = await getMainPrisma().certificateIssue.findFirst({
    where: { agentId: learnerId, courseId: course.prerequisiteCourseId, status: "ACTIVE" },
  });
  if (hasPrerequisite) return { allowed: true as const };
  
  // Get database course data for accurate prerequisite title
  const prerequisiteCourse = await getMainPrisma().trainingCourse.findUnique({
    where: { id: course.prerequisiteCourseId },
    select: { title: true }
  });
  
  return {
    allowed: false as const,
    reason: `Complete ${prerequisiteCourse?.title ?? "the previous course"} and earn its certificate first.`,
    prerequisiteCourseId: course.prerequisiteCourseId,
  };
}

export async function hasPassedCourseAssessments(learnerId: string, courseId: string) {
  const eligibility = await getCertificateEligibility(learnerId, courseId);
  if (!eligibility) return false;
  return eligibility.requirements
    .filter((requirement) => requirement.kind !== "lesson" && requirement.kind !== "certificate")
    .every((requirement) => requirement.complete);
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
  const [certificates, badges, progressRows, courses, badgeData] = await Promise.all([
    prisma.certificateIssue.findMany({ where: { agentId: learnerId, status: "ACTIVE" } }),
    prisma.agentBadge.findMany({ where: { agentId: learnerId }, include: { badge: true } }),
    prisma.courseProgress.findMany({ where: { agentId: learnerId } }),
    prisma.trainingCourse.findMany({
      where: { id: { in: PROGRAMME_COURSE_IDS }, status: TrainingCourseStatus.PUBLISHED },
      select: { id: true, title: true, subtitle: true, status: true }
    }),
    prisma.badge.findMany({
      where: { id: { in: ACADEMY_PROGRAMME_COURSES.map((c) => c.badgeId) } },
    }),
  ]);

  const certByCourse = new Map(certificates.map((c) => [c.courseId, c]));
  const badgeIds = new Set(badges.map((b) => b.badgeId));
  const progressByCourse = new Map(progressRows.map((p) => [p.courseId, p.percentComplete]));
  const courseDbData = new Map(courses.map((c) => [c.id, c]));
  const badgeDbData = new Map(badgeData.map((b) => [b.id, b]));

  return ACADEMY_PROGRAMME_COURSES.map((course) => {
    const certificate = certByCourse.get(course.id);
    const previousCert = course.prerequisiteCourseId ? certByCourse.get(course.prerequisiteCourseId) : true;
    const unlocked = !course.prerequisiteCourseId || !!previousCert;
    const dbCourse = courseDbData.get(course.id);
    const dbBadge = badgeDbData.get(course.badgeId);
    
    return {
      id: course.id,
      title: dbCourse?.title ?? course.title,
      subtitle: dbCourse?.subtitle ?? course.subtitle,
      theme: course.theme,
      sortOrder: course.sortOrder,
      unlocked,
      progress: progressByCourse.get(course.id) ?? 0,
      completed: !!certificate,
      badgeEarned: badgeIds.has(course.badgeId),
      badgeName: (dbBadge as { name?: string } | null)?.name ?? course.badgeName,
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
