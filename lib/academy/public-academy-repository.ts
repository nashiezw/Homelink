import { AcademyRegistrationStatus, PaymentProvider, PaymentStatus, Role, TrainingCourseStatus, TrainingVisibility, Prisma } from "@prisma/client";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { sendRegistrationConfirmationEmail } from "@/lib/academy/academy-email";
import { recordAcademyReferralRegistration, rewardSuccessfulAcademyReferral } from "@/lib/academy/engagement-repository";
import { calculateCourseProgress, getCompletedLessonIds } from "@/lib/academy/academy-progress";
import { getAssessmentGateState, getLessonGateState, getModuleGateState } from "@/lib/academy/academy-gates";
import { awardProgrammeBadge, canAccessProgrammeCourse } from "@/lib/academy/academy-completion";
import { assessmentMetaForAssignment, assessmentMetaForQuiz } from "@/lib/academy/academy-assessments";
import { getProgrammeCourse, LEGACY_COURSE_ID, PROGRAMME_COURSE_IDS } from "@/lib/academy/academy-programme";
import { getEnrolledCourseToolkits, getToolkitGroupsForCourse, programmeMetaForCourse } from "@/lib/academy/academy-toolkits";
import { buildReadinessScore } from "@/lib/academy/academy-readiness";
import { attemptsRemaining, getCourseRetakeRules } from "@/lib/academy/assessment-retake-rules";
import {
  getManualAccessView,
  getToolkitAccessView,
  maskToolkitGroups,
  previewToolkitGroups,
} from "@/lib/academy/academy-resource-access";
import { fetchCourseTree, flattenCourseMaterials, mapLessonForLearner } from "@/lib/academy/course-tree";
import { toAcademyFileDownloadUrl } from "@/lib/academy/academy-files";
import { replaceLegacyBrandingText } from "@/lib/brand/rebrand";
import { lessonHandoutStoragePath } from "@/lib/academy/lesson-handouts";
import {
  FIRST_LESSON_START_DEADLINE_HOURS,
  getFirstLessonDeadline,
  getReservationTimeLeft,
  releaseExpiredFirstLessonReservations,
} from "@/lib/academy/activation-deadline";

export type AcademyRegistrationIntent = "TRAINING_ONLY" | "AGENT_TRAINING";

export async function listPublicAcademyCourses() {
  const prisma = getMainPrisma();
  const courses = await prisma.trainingCourse.findMany({
    where: {
      status: TrainingCourseStatus.PUBLISHED,
      visibility: { in: [TrainingVisibility.PUBLIC, TrainingVisibility.ROLE_BASED] },
      registrationOpen: true,
    },
    include: {
      category: true,
      modules: { include: { sections: { include: { lessons: true }, orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } },
      quizzes: { where: { active: true } },
      assignments: { where: { active: true } },
      finalExams: { where: { active: true } },
    },
  });
  const programmeBadges = await prisma.badge.findMany({
    where: { id: { in: PROGRAMME_COURSE_IDS.map((courseId) => getProgrammeCourse(courseId)?.badgeId).filter((id): id is string => Boolean(id)) } },
  });
  const badgeById = new Map(programmeBadges.map((badge) => [badge.id, badge]));

  // The programme order is useful for the original structured programme, but
  // it must not hide courses created in the admin course builder.
  const ordered = [...courses].sort((a, b) => {
    const programmeOrder = PROGRAMME_COURSE_IDS.indexOf(a.id) - PROGRAMME_COURSE_IDS.indexOf(b.id);
    const aIsProgramme = PROGRAMME_COURSE_IDS.includes(a.id);
    const bIsProgramme = PROGRAMME_COURSE_IDS.includes(b.id);
    if (aIsProgramme && bIsProgramme) return programmeOrder;
    if (aIsProgramme) return -1;
    if (bIsProgramme) return 1;
    return Number(b.featured) - Number(a.featured) || a.createdAt.getTime() - b.createdAt.getTime();
  });

  return Promise.all(ordered.map(async (course) => {
    if (!course) return null;
    const meta = programmeMetaForCourse(course.id);
    const badge = meta ? badgeById.get(meta.badgeId) : null;
    const toolkit = await getToolkitGroupsForCourse(course.id, { preview: true });
    const toolkitCount = toolkit.reduce((sum, group) => sum + group.items.length, 0);
    const quizCount = course.quizzes?.length ?? 0;
    const assignmentCount = course.assignments?.length ?? 0;
    const finalExamCount = course.finalExams?.length ?? 0;
    const lessonCount = course.modules.reduce((sum, module) => sum + module.sections.reduce((count, section) => count + section.lessons.length, 0), 0);
    return {
      id: course.id,
      title: course.title,
      subtitle: course.subtitle,
      slug: course.slug,
      description: course.description,
      shortDescription: course.shortDescription,
      category: course.category?.name ?? "HouseLink Academy",
      difficulty: course.difficulty,
      estimatedHours: Number(course.estimatedHours),
      durationMinutes: course.durationMinutes,
      instructor: course.instructor,
      price: Number(course.publicPrice || course.price),
      publicPrice: Number(course.publicPrice || course.price),
      agentPrice: Number(course.agentPrice),
      currency: course.currency,
      accessDurationDays: course.accessDurationDays,
      certificateEnabled: course.certificateEnabled,
      featured: course.featured,
      sortOrder: meta?.sortOrder ?? 0,
      theme: meta?.theme ?? null,
      prerequisiteCourseId: meta?.prerequisiteCourseId ?? null,
      badgeName: badge?.name ?? meta?.badgeName ?? null,
      certificateTitle: course.certificateEnabled ? (meta?.certificateTitle ?? `${course.title} Certificate`) : null,
      learningOutcomes: course.learningOutcomes && course.learningOutcomes.length > 0 ? course.learningOutcomes : (meta?.learningOutcomes ?? []),
      includes: buildCourseIncludes({ lessonCount, toolkitCount, quizCount, assignmentCount, finalExamCount, certificateEnabled: course.certificateEnabled }),
      assessmentSummary: buildAssessmentSummary({ courseTitle: course.title, quizCount, assignmentCount, finalExamCount, passMark: course.passingPercentage, certificateEnabled: course.certificateEnabled }),
      quizCount,
      assignmentCount,
      hasFinalExam: finalExamCount > 0,
      portfolioRequired: meta?.assignmentIds.some((id) => id.includes("portfolio")) ?? false,
      roleplayCount: meta?.assignmentIds.filter((id) => id.includes("roleplay") || id.includes("simulation")).length ?? 0,
      toolkitCount,
      toolkitPreview: previewToolkitGroups(toolkit),
      lessonCount,
      modules: course.modules.map((module) => ({
        id: module.id,
        title: module.title,
        description: module.description,
        lessons: module.sections.flatMap((section) => section.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title, estimatedMinutes: lesson.estimatedMinutes }))),
      })),
    };
  })).then((rows) => rows.filter(Boolean));
}

export async function getLearnerAcademyDashboard(learnerId: string, options?: { isAgent?: boolean; isAdmin?: boolean; isTrainer?: boolean; isPublicLearner?: boolean }) {
  await releaseExpiredFirstLessonReservations();
  const prisma = getMainPrisma();
  const isAgent = Boolean(options?.isAgent);
  const announcementAudiences = new Set(["ALL", "LEARNERS"]);
  if (isAgent || options?.isAdmin) announcementAudiences.add("AGENTS");
  if (options?.isAdmin) {
    announcementAudiences.add("ADMINS");
    announcementAudiences.add("PUBLIC_LEARNERS");
  }
  if (options?.isTrainer) announcementAudiences.add("TRAINERS");
  if (options?.isPublicLearner) announcementAudiences.add("PUBLIC_LEARNERS");
  const [learner, applications, dashboardCourses, notifications, announcements, certificates, courseProgressRows, resourceAccessRows, certificateTemplates] = await Promise.all([
    prisma.user.findUnique({ where: { id: learnerId }, select: { name: true, email: true } }),
    prisma.academyLearnerApplication.findMany({
      where: {
        learnerId,
        course: { status: TrainingCourseStatus.PUBLISHED },
      },
      include: {
        course: {
          include: {
            modules: {
              include: {
                sections: {
                  include: {
                    lessons: {
                      include: {
                        lessonVideos: true,
                        lessonDownloads: true,
                      },
                      orderBy: { sortOrder: "asc" },
                    },
                  },
                  orderBy: { sortOrder: "asc" },
                },
              },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        payment: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.trainingCourse.findMany({
      where: {
        id: { not: LEGACY_COURSE_ID },
        status: TrainingCourseStatus.PUBLISHED,
        visibility: { in: [TrainingVisibility.PUBLIC, TrainingVisibility.ROLE_BASED] },
        registrationOpen: true,
      },
      select: {
        id: true,
        title: true,
        subtitle: true,
        shortDescription: true,
        certificateEnabled: true,
        featured: true,
        createdAt: true,
      },
    }),
    prisma.trainingNotification.findMany({ where: { userId: learnerId }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.announcement.findMany({
      where: {
        AND: [
          { audience: { in: Array.from(announcementAudiences) } },
          { publishedAt: { not: null } },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.certificateIssue.findMany({
      where: { agentId: learnerId, status: "ACTIVE" },
      include: { course: true, template: true },
      orderBy: { issuedAt: "desc" },
    }),
    prisma.courseProgress.findMany({ where: { agentId: learnerId } }),
    prisma.academyResourceAccess.findMany({
      where: { learnerId },
      include: { course: true, payment: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.certificateTemplate.findMany({ where: { active: true }, orderBy: { updatedAt: "desc" } }),
  ]);

  const visibleApplications = applications.filter((entry) => entry.courseId !== LEGACY_COURSE_ID);
  const approved = visibleApplications.filter((entry) => entry.status === AcademyRegistrationStatus.APPROVED);
  const totalLessons = approved.reduce((sum, entry) => sum + countLessons(entry.course), 0);
  const completedLessons = await Promise.all(
    approved.map(async (entry) => {
      const completedIds = await getCompletedLessonIds(learnerId, entry.course.id);
      return completedIds.size;
    })
  );
  const completedLessonTotal = completedLessons.reduce((sum, count) => sum + count, 0);
  const overallProgress = totalLessons ? Math.round((completedLessonTotal / totalLessons) * 100) : 0;
  const settings = await getAcademySettingsPublic();

  let [agentBadges, bookmarkRows, recentProgress] = await Promise.all([
    prisma.agentBadge.findMany({ where: { agentId: learnerId }, include: { badge: true }, orderBy: { awardedAt: "desc" } }),
    prisma.lessonProgress.findMany({
      where: { agentId: learnerId, status: "BOOKMARKED" },
      include: { lesson: { include: { section: { include: { module: { include: { course: true } } } } } } },
      orderBy: { lastViewedAt: "desc" },
      take: 12,
    }),
    prisma.lessonProgress.findMany({
      where: { agentId: learnerId },
      include: { lesson: { include: { section: { include: { module: { include: { course: true } } } } } } },
      orderBy: { lastViewedAt: "desc" },
      take: 1,
    }),
  ]);

  const existingBadgeIds = new Set(agentBadges.map((entry) => entry.badgeId));
  const missingBadgeCourseIds = certificates
    .filter((certificate) => certificate.status === "ACTIVE" && certificate.courseId)
    .map((certificate) => certificate.courseId)
    .filter((courseId): courseId is string => Boolean(courseId))
    .map((courseId) => getProgrammeCourse(courseId))
    .filter((programme): programme is NonNullable<ReturnType<typeof getProgrammeCourse>> => Boolean(programme))
    .filter((programme) => !existingBadgeIds.has(programme.badgeId))
    .map((programme) => programme.id);

  if (missingBadgeCourseIds.length) {
    await Promise.all(missingBadgeCourseIds.map((courseId) => awardProgrammeBadge(learnerId, courseId)));
    agentBadges = await prisma.agentBadge.findMany({
      where: { agentId: learnerId },
      include: { badge: true },
      orderBy: { awardedAt: "desc" },
    });
  }

  const activityDates = await prisma.lessonProgress.findMany({
    where: { agentId: learnerId },
    select: { lastViewedAt: true, completedAt: true },
    orderBy: { lastViewedAt: "desc" },
    take: 60,
  });
  const streak = computeLearningStreak(activityDates.map((row) => row.completedAt ?? row.lastViewedAt));
  const completedOrCertifiedCourseIds = new Set([
    ...certificates.map((certificate) => certificate.courseId).filter((id): id is string => Boolean(id)),
    ...courseProgressRows.filter((row) => row.status === "COMPLETED" || row.percentComplete >= 100).map((row) => row.courseId),
  ]);

  const continueLearning = (() => {
    const recent = recentProgress.find(
      (row) =>
        row.lesson.section.module.courseId !== LEGACY_COURSE_ID &&
        !completedOrCertifiedCourseIds.has(row.lesson.section.module.courseId),
    ) ?? recentProgress[0];
    if (!recent) return null;
    const courseId = recent.lesson.section.module.courseId;
    if (courseId === LEGACY_COURSE_ID || completedOrCertifiedCourseIds.has(courseId)) {
      const fallback = approved.find((entry) => !completedOrCertifiedCourseIds.has(entry.course.id));
      if (!fallback) return null;
      return {
        lessonId: "",
        lessonTitle: "Continue your programme",
        courseId: fallback.course.id,
        courseTitle: fallback.course.title,
        lastViewedAt: new Date().toISOString(),
      };
    }
    return {
      lessonId: recent.lessonId,
      lessonTitle: recent.lesson.title,
      courseId,
      courseTitle: recent.lesson.section.module.course.title,
      lastViewedAt: recent.lastViewedAt.toISOString(),
    };
  })();

  const firstLessonByCourseId = new Map(
    approved
      .map((entry) => {
        const firstLesson = getFirstCourseLesson(entry.course);
        return firstLesson
          ? [
              entry.course.id,
              {
                lessonId: firstLesson.id,
                lessonTitle: replaceLegacyBrandingText(firstLesson.title),
                courseId: entry.course.id,
                courseTitle: entry.course.title,
              },
            ] as const
          : null;
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
  );

  const firstLessonAction = (() => {
    if (continueLearning?.lessonId) return null;
    const notStarted = approved.find((entry) => {
      if (completedOrCertifiedCourseIds.has(entry.course.id)) return false;
      const progress = courseProgressRows.find((row) => row.courseId === entry.course.id);
      if (progress?.status === "COMPLETED" || (progress?.percentComplete ?? 0) >= 100) return false;
      return !progress || (progress.percentComplete ?? 0) <= 0;
    });
    if (!notStarted) return null;
    const firstLesson = firstLessonByCourseId.get(notStarted.course.id);
    if (!firstLesson) return null;
    return {
      ...firstLesson,
      href: `/dashboard/academy/${firstLesson.courseId}?lesson=${encodeURIComponent(firstLesson.lessonId)}`,
    };
  })();

  const settingsPayload = settings as Record<string, unknown>;
  const brandingPayload = (settingsPayload.branding ?? {}) as Record<string, unknown>;

  const approvedCourseIds = approved.map((entry) => entry.course.id);
  const courseToolkitsRaw = await getEnrolledCourseToolkits(approvedCourseIds);
  const courseToolkits = await Promise.all(
    courseToolkitsRaw.map(async (entry) => {
      const access = await getToolkitAccessView(learnerId, entry.courseId, isAgent);
      return {
        ...entry,
        access,
        groups: maskToolkitGroups(entry.groups, access),
      };
    }),
  );
  const activeCourseId = continueLearning?.courseId ?? approvedCourseIds[0] ?? null;
  const activeCourseToolkit = courseToolkits.find((toolkit) => toolkit.courseId === activeCourseId) ?? courseToolkits[0] ?? null;
  const manualAccess = await getManualAccessView(learnerId, isAgent);
  const toolkitDownloadCount = courseToolkits.reduce((sum, toolkit) => sum + toolkit.itemCount, 0);
  const badgeById = new Map(agentBadges.map((entry) => [entry.badgeId, entry.badge]));
  const certificateByCourseId = new Map(
    certificates
      .filter((certificate) => certificate.courseId)
      .map((certificate) => [certificate.courseId as string, certificate]),
  );
  const applicationByCourseId = new Map(visibleApplications.map((entry) => [entry.courseId, entry]));
  const defaultTheme = {
    label: "Course",
    accent: String(brandingPayload.primaryColour ?? "#008b68"),
    gradient: "from-emerald-600 to-slate-900",
    sidebar: "bg-emerald-600",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
  const dashboardCourseCards = (await Promise.all(dashboardCourses.map(async (course) => {
    const application = applicationByCourseId.get(course.id);
    const approvedApplication = application?.status === AcademyRegistrationStatus.APPROVED;
    const programme = getProgrammeCourse(course.id);
    const certificate = certificateByCourseId.get(course.id);
    const courseProgress = courseProgressRows.find((row) => row.courseId === course.id);
    const badge = programme ? badgeById.get(programme.badgeId) : null;
    const programmeAccess = programme ? await canAccessProgrammeCourse(learnerId, course.id) : { allowed: true as const };
    return {
      id: course.id,
      title: course.title,
      subtitle: course.subtitle ?? course.shortDescription ?? "",
      theme: programme?.theme ?? defaultTheme,
      sortOrder: programme?.sortOrder ?? 999,
      unlocked: approvedApplication || !programme || programmeAccess.allowed,
      progress: courseProgress?.percentComplete ?? 0,
      completed: Boolean(certificate) || courseProgress?.status === "COMPLETED" || (courseProgress?.percentComplete ?? 0) >= 100,
      badgeEarned: programme ? existingBadgeIds.has(programme.badgeId) : Boolean(certificate),
      badgeName: badge?.name ?? programme?.badgeName ?? `${course.title} completion`,
      certificate: certificate
        ? {
            id: certificate.id,
            certificateNumber: certificate.certificateNumber,
            issuedAt: certificate.issuedAt.toISOString(),
            downloadUrl: `/dashboard/academy/certificate/${certificate.id}`,
            preview: buildIssuedCertificatePreviewPayload({
              certificate,
              learnerName: learner?.name ?? "HouseLink Learner",
              programme,
              programmeBadge: badge,
              fallbackTemplate: selectDashboardCertificateTemplateForCourse(certificateTemplates, certificate.courseId),
            }),
          }
        : null,
      certificatePreview: {
        enabled: course.certificateEnabled,
        title: course.certificateEnabled ? `${course.title} Certificate` : "Course completion",
        learnerName: learner?.name || "Learner Name",
        courseTitle: course.title,
        progress: Number(courseProgress?.percentComplete ?? 0),
        requirements: buildDashboardCertificateRequirements({
          progress: Number(courseProgress?.percentComplete ?? 0),
          completed: Boolean(certificate) || courseProgress?.status === "COMPLETED" || Number(courseProgress?.percentComplete ?? 0) >= 100,
          certificateIssued: Boolean(certificate),
        }),
      },
      firstLesson: firstLessonByCourseId.get(course.id) ?? null,
    };
  }))).sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));

  return {
    settings: {
      ...settings,
      dashboardWelcome: String(brandingPayload.dashboardWelcome ?? "Continue your professional training journey."),
    },
    metrics: {
      enrolledCourses: approved.length,
      pendingApprovals: visibleApplications.filter((entry) => entry.status === AcademyRegistrationStatus.PENDING_PAYMENT || entry.status === AcademyRegistrationStatus.PAYMENT_UPLOADED).length,
      certificates: certificates.length,
      downloads: toolkitDownloadCount,
      totalLessons,
      progress: overallProgress,
      completedLessons: completedLessonTotal,
      streak,
      badges: agentBadges.length,
      xp: agentBadges.reduce((sum, entry) => sum + entry.badge.xp, 0),
    },
    streak,
    continueLearning,
    firstLessonAction,
    badges: agentBadges.map((entry) => ({
      id: entry.badge.id,
      name: entry.badge.name,
      description: entry.badge.description,
      xp: entry.badge.xp,
      awardedAt: entry.awardedAt.toISOString(),
    })),
    bookmarks: bookmarkRows.map((entry) => ({
      lessonId: entry.lessonId,
      title: entry.lesson.title,
      courseId: entry.lesson.section.module.courseId,
      courseTitle: entry.lesson.section.module.course.title,
    })),
    certificates: certificates.map((certificate) => ({
      id: certificate.id,
      certificateNumber: certificate.certificateNumber,
      courseTitle: certificate.course?.title ?? "Academy Course",
      issuedAt: certificate.issuedAt.toISOString(),
      expiresAt: certificate.expiresAt?.toISOString() ?? null,
      verifyUrl: `/academy/verify?certificate=${encodeURIComponent(certificate.certificateNumber)}`,
      downloadUrl: certificate.pdfUrl ?? `/dashboard/academy/certificate/${certificate.id}`,
    })),
    programmeCourses: dashboardCourseCards,
    activeCourseId,
    activeCourseToolkit,
    courseToolkits,
    referenceManual: {
      title: "Complete Training Manual (Reference)",
      description: "Full HouseLink manual for deep reference — purchase and admin approval required before download.",
      downloadUrl: manualAccess.unlocked
        ? toAcademyFileDownloadUrl("/uploads/academy/houselink-zimbabwe-real-estate-agent-training-manual.pdf")
        : null,
      access: manualAccess,
    },
    resourceAccess: resourceAccessRows.map((entry) => ({
      id: entry.id,
      resourceKind: entry.resourceKind,
      resourceKey: entry.resourceKey,
      status: entry.status,
      amount: Number(entry.amount),
      currency: entry.currency,
      proofUrl: entry.proofUrl,
      adminNote: entry.adminNote,
      course: entry.course ? { id: entry.course.id, title: entry.course.title } : null,
      payment: entry.payment ? { id: entry.payment.id, status: entry.payment.status, proofStatus: entry.payment.proofStatus } : null,
    })),
    applications: await Promise.all(visibleApplications.map(async (entry) => {
      const completedIds = entry.status === AcademyRegistrationStatus.APPROVED
        ? await getCompletedLessonIds(learnerId, entry.course.id)
        : new Set<string>();
      const progress = calculateCourseProgress(entry.course, completedIds);
      const courseProgress = courseProgressRows.find((row) => row.courseId === entry.course.id);
      const firstLesson = getFirstCourseLesson(entry.course);
      const firstLessonProgress = firstLesson
        ? await prisma.lessonProgress.findUnique({
          where: { lessonId_agentId: { lessonId: firstLesson.id, agentId: learnerId } },
          select: { id: true },
        })
        : null;
      const firstLessonStarted = firstLesson ? Boolean(firstLessonProgress) : progress.percentComplete > 0;
      const reservationDeadline = entry.status === AcademyRegistrationStatus.APPROVED && !firstLessonStarted
        ? getFirstLessonDeadline(entry.accessStartsAt ?? entry.approvedAt ?? entry.updatedAt)
        : null;
      const timeLeft = getReservationTimeLeft(reservationDeadline);

      return {
        id: entry.id,
        status: entry.status,
        learnerType: entry.learnerType,
        amount: Number(entry.amount),
        currency: entry.currency,
        proofUrl: entry.proofUrl,
        accessStartsAt: entry.accessStartsAt?.toISOString(),
        accessEndsAt: entry.accessEndsAt?.toISOString(),
        firstLessonStartDeadlineAt: reservationDeadline?.toISOString() ?? null,
        firstLessonStartHoursRemaining: timeLeft.hoursRemaining,
        firstLessonStartWindowHours: FIRST_LESSON_START_DEADLINE_HOURS,
        firstLessonStarted,
        adminNote: entry.adminNote,
        progress: courseProgress?.percentComplete ?? progress.percentComplete,
        payment: entry.payment ? {
          id: entry.payment.id,
          status: entry.payment.status,
          proofStatus: entry.payment.proofStatus,
          proofUrl: entry.payment.proofUrl,
          method: entry.payment.method,
          referenceNumber: typeof ((entry.payment.metadata ?? {}) as Record<string, unknown>).referenceNumber === "string"
            ? String(((entry.payment.metadata ?? {}) as Record<string, unknown>).referenceNumber)
            : null,
        } : null,
        course: {
          id: entry.course.id,
          title: entry.course.title,
          slug: entry.course.slug,
          description: entry.course.description,
          shortDescription: entry.course.shortDescription,
          subtitle: entry.course.subtitle,
          certificateEnabled: entry.course.certificateEnabled,
          modules: entry.course.modules.map((module) => ({
            id: module.id,
            title: replaceLegacyBrandingText(module.title),
            lessons: module.sections.flatMap((section) => section.lessons.map((lesson) => ({
              id: lesson.id,
              title: replaceLegacyBrandingText(lesson.title),
              summary: lesson.summary ? replaceLegacyBrandingText(lesson.summary) : lesson.summary,
              richText: replaceLegacyBrandingText(lesson.richText),
              estimatedMinutes: lesson.estimatedMinutes,
              completionRequirement: lesson.completionRequirement,
              videoUrl: lesson.videoUrl,
              embeddedVideoUrl: lesson.embeddedVideoUrl,
              coverImageUrl: lesson.coverImageUrl,
              pdfUrl: lesson.pdfUrl ? toAcademyFileDownloadUrl(lesson.pdfUrl) : null,
              audioUrl: lesson.audioUrl,
              completed: completedIds.has(lesson.id),
              lessonVideos: lesson.lessonVideos.map((video) => ({
                id: video.id,
                title: replaceLegacyBrandingText(video.title),
                url: video.url,
                provider: video.provider,
              })),
              lessonDownloads: lesson.lessonDownloads.map((download) => ({
                id: download.id,
                title: replaceLegacyBrandingText(download.title),
                url: toAcademyFileDownloadUrl(download.url),
                type: download.type,
              })),
            }))),
          })),
        },
      };
    })),
    announcements,
    notifications,
  };
}

async function syncLessonHandoutUrls(courseId: string) {
  const prisma = getMainPrisma();
  const lessons = await prisma.trainingLesson.findMany({
    where: { section: { module: { courseId } } },
    select: { id: true, title: true, pdfUrl: true },
  });
  const updates = lessons
    .map((lesson) => ({ ...lesson, expectedPdfUrl: lessonHandoutStoragePath(courseId, lesson.title) }))
    .filter((lesson) => lesson.pdfUrl !== lesson.expectedPdfUrl);
  if (!updates.length) return;
  await prisma.$transaction(
    updates.map((lesson) =>
      prisma.trainingLesson.update({
        where: { id: lesson.id },
        data: { pdfUrl: lesson.expectedPdfUrl },
      }),
    ),
  );
}

export async function registerPublicLearner(input: {
  learnerId: string;
  courseId: string;
  fullName: string;
  email: string;
  phone?: string;
  organisation?: string;
  motivation?: string;
  paymentMethod?: string;
  couponCode?: string;
  referralCode?: string;
}) {
  const prisma = getMainPrisma();
  const course = await prisma.trainingCourse.findFirst({
    where: { id: input.courseId, status: TrainingCourseStatus.PUBLISHED, registrationOpen: true },
  });
  if (!course) return "COURSE_NOT_AVAILABLE" as const;

  const existing = await prisma.academyLearnerApplication.findUnique({
    where: { learnerId_courseId: { learnerId: input.learnerId, courseId: input.courseId } },
    include: { payment: true },
  });
  if (existing) return existing;

  // Calculate price with coupon if provided
  let basePrice = course.publicPrice || course.price;
  let discountAmount = 0;
  let couponId: string | null = null;

  // If course has no price set, treat as free
  const courseHasPrice = basePrice !== null && basePrice !== undefined && Number(basePrice) > 0;

  if (input.couponCode && courseHasPrice) {
    const code = input.couponCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const coupon = await prisma.academyCoupon.findUnique({
      where: { code },
      include: { _count: { select: { usages: true } } },
    });

    if (coupon && coupon.active) {
      const now = new Date();
      const validFrom = coupon.validFrom ? new Date(coupon.validFrom) : null;
      const validUntil = coupon.validUntil ? new Date(coupon.validUntil) : null;
      
      if ((!validFrom || validFrom <= now) && (!validUntil || validUntil >= now)) {
        if (!coupon.maxUses || coupon.usedCount < coupon.maxUses) {
          if (!coupon.minPurchaseAmount || Number(basePrice) >= Number(coupon.minPurchaseAmount)) {
            const applicable = coupon.applicableCourses.length === 0 || coupon.applicableCourses.includes(course.id);
            if (applicable) {
              couponId = coupon.id;
              if (coupon.discountType === "PERCENTAGE") {
                discountAmount = Number(basePrice) * (Number(coupon.discountValue) / 100);
              } else {
                discountAmount = Number(coupon.discountValue);
              }
              discountAmount = Math.min(discountAmount, Number(basePrice));
            }
          }
        }
      }
    }
  }

  const finalPrice = courseHasPrice ? new Prisma.Decimal(Math.max(0, Number(basePrice) - discountAmount)) : new Prisma.Decimal(0);

  const payment = await prisma.payment.create({
    data: {
      userId: input.learnerId,
      provider: PaymentProvider.PAYNOW,
      status: Number(finalPrice) > 0 ? PaymentStatus.PENDING : PaymentStatus.PAID,
      amount: finalPrice,
      currency: course.currency,
      description: `${course.title} Academy enrolment${couponId ? " (with coupon)" : ""}`,
      plan: "academy_course",
      method: input.paymentMethod || "bank_transfer",
      manual: Number(finalPrice) > 0,
      proofStatus: Number(finalPrice) > 0 ? "REQUESTED" : "NONE",
      metadata: { 
        courseId: course.id, 
        learnerType: "PUBLIC_LEARNER", 
        referenceNumber: `HLA-${Date.now()}`,
        couponCode: input.couponCode || null,
        referralCode: input.referralCode || null,
        couponId,
        discountAmount: discountAmount.toString(),
      } as Prisma.InputJsonObject,
    },
  });
  
  const now = new Date();
  const isFree = Number(finalPrice) <= 0;
  const accessEndsAt = new Date(now.getTime() + course.accessDurationDays * 86400000);
  const application = await prisma.academyLearnerApplication.create({
    data: {
      learnerId: input.learnerId,
      courseId: course.id,
      paymentId: payment.id,
      status: isFree ? AcademyRegistrationStatus.APPROVED : AcademyRegistrationStatus.PENDING_PAYMENT,
      fullName: input.fullName,
      email: input.email.trim().toLowerCase(),
      phone: input.phone || null,
      organisation: input.organisation || null,
      motivation: input.motivation || null,
      amount: finalPrice,
      currency: course.currency,
      accessStartsAt: isFree ? now : null,
      accessEndsAt: isFree ? accessEndsAt : null,
    },
  });

  // Record coupon usage if applicable
  if (couponId && discountAmount > 0) {
    await prisma.$transaction([
      prisma.academyCoupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } },
      }),
      prisma.academyCouponUsage.create({
        data: {
          couponId,
          userId: input.learnerId,
          paymentId: payment.id,
          discountAmount: new Prisma.Decimal(discountAmount),
          originalAmount: basePrice,
          finalAmount: finalPrice,
        },
      }),
    ]);
  }

  const user = await prisma.user.findUnique({ where: { id: input.learnerId }, select: { roles: true, email: true, name: true } });
  if (user && !user.roles.includes(Role.PUBLIC_LEARNER)) {
    await prisma.user.update({ where: { id: input.learnerId }, data: { roles: [...user.roles, Role.PUBLIC_LEARNER] } });
  }
  await prisma.trainingNotification.create({
    data: {
      userId: input.learnerId,
      eventType: "ACADEMY_REGISTRATION",
      channel: "IN_APP",
      subject: isFree ? "Academy access activated" : "Academy payment pending",
      body: isFree
        ? await buildStartLessonNotificationBody(course.id, course.title)
        : `Upload proof of payment for ${course.title} so an admin can activate your access.`,
    },
  });
  await recordAcademyReferralRegistration({
    referralCode: input.referralCode,
    learnerId: input.learnerId,
    courseId: course.id,
    learnerName: input.fullName,
    learnerEmail: input.email,
  });
  if (isFree) {
    await prisma.courseEnrolment.upsert({
      where: { courseId_agentId: { courseId: course.id, agentId: input.learnerId } },
      create: { courseId: course.id, agentId: input.learnerId, status: "ACTIVE", dueAt: accessEndsAt },
      update: { status: "ACTIVE", dueAt: accessEndsAt },
    });
    await rewardSuccessfulAcademyReferral({ learnerId: input.learnerId, courseId: course.id });
  }

  // Send registration confirmation email if payment is required
  let emailSent = false;
  let emailError = null;
  if (!isFree && user) {
    const emailResult = await sendRegistrationConfirmationEmail(
      input.email || user.email,
      input.fullName || user.name,
      course.title,
      Number(finalPrice),
      course.currency,
      input.paymentMethod || "bank_transfer",
      application.id,
    );
    emailSent = emailResult.success;
    emailError = emailResult.error;
    
    // Log email delivery status to audit log
    await prisma.trainingAuditLog.create({
      data: {
        actorId: input.learnerId,
        action: "academy.registration.email_sent",
        target: application.id,
        metadata: {
          courseId: course.id,
          courseTitle: course.title,
          learnerId: input.learnerId,
          emailSent: emailSent,
          emailError: emailError,
        } as Prisma.InputJsonObject,
      },
    });
  }

  return {
    ...application,
    paymentId: payment.id,
    finalPrice: Number(finalPrice),
    currency: course.currency,
    emailSent,
    emailError,
  };
}

export async function attachAcademyPaymentProof(paymentId: string, learnerId: string, proofUrl: string) {
  const prisma = getMainPrisma();
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return null;
  if (payment.userId !== learnerId) return "FORBIDDEN" as const;
  const application = await prisma.academyLearnerApplication.findFirst({ where: { paymentId, learnerId } });
  if (!application) return "NOT_ACADEMY_PAYMENT" as const;
  const [updated] = await prisma.$transaction([
    prisma.academyLearnerApplication.update({
      where: { id: application.id },
      data: { proofUrl, status: AcademyRegistrationStatus.PAYMENT_UPLOADED },
    }),
    prisma.payment.update({ where: { id: paymentId }, data: { proofUrl, proofStatus: "UPLOADED" } }),
  ]);
  return updated;
}

export async function reviewPublicLearnerApplication(input: {
  applicationId: string;
  actorId: string;
  status: "APPROVED" | "REJECTED" | "REFUNDED" | "EXPIRED";
  adminNote?: string;
}) {
  const prisma = getMainPrisma();
  const application = await prisma.academyLearnerApplication.findUnique({ where: { id: input.applicationId }, include: { course: true, payment: true } });
  if (!application) return null;
  const now = new Date();
  const accessEndsAt = new Date(now.getTime() + application.course.accessDurationDays * 86400000);
  const approved = input.status === "APPROVED";
  
  // If rejecting, refunding, or expiring, remove coupon usage
  if (input.status === "REJECTED" || input.status === "REFUNDED" || input.status === "EXPIRED") {
    if (application.paymentId) {
      await prisma.academyCouponUsage.deleteMany({
        where: { paymentId: application.paymentId },
      });
    }
  }
  
  const updated = await prisma.academyLearnerApplication.update({
    where: { id: application.id },
    data: {
      status: input.status,
      adminNote: input.adminNote || null,
      approvedById: approved ? input.actorId : application.approvedById,
      approvedAt: approved ? now : application.approvedAt,
      rejectedAt: input.status === "REJECTED" ? now : application.rejectedAt,
      accessStartsAt: approved ? now : application.accessStartsAt,
      accessEndsAt: approved ? accessEndsAt : application.accessEndsAt,
    },
  });
  if (application.paymentId) {
    await prisma.payment.update({
      where: { id: application.paymentId },
      data: {
        status: approved ? PaymentStatus.PAID : input.status === "REFUNDED" ? PaymentStatus.REFUNDED : PaymentStatus.PENDING,
        proofStatus: approved ? "VERIFIED" : input.status === "REJECTED" ? "REJECTED" : undefined,
      },
    });
  }
  if (approved) {
    await prisma.courseEnrolment.upsert({
      where: { courseId_agentId: { courseId: application.courseId, agentId: application.learnerId } },
      create: { courseId: application.courseId, agentId: application.learnerId, status: "ACTIVE", dueAt: accessEndsAt },
      update: { status: "ACTIVE", dueAt: accessEndsAt },
    });
    await rewardSuccessfulAcademyReferral({ learnerId: application.learnerId, courseId: application.courseId });
  }

  // If rejecting, refunding, or expiring, remove coupon usage
  if (input.status === "REJECTED" || input.status === "REFUNDED" || input.status === "EXPIRED") {
    if (application.paymentId) {
      await prisma.academyCouponUsage.deleteMany({
        where: { paymentId: application.paymentId },
      });
    }
  }

  await prisma.trainingNotification.create({
    data: {
      userId: application.learnerId,
      eventType: `ACADEMY_APPLICATION_${input.status}`,
      channel: "IN_APP",
      subject: approved ? "Academy place reserved" : "Academy registration updated",
      body: approved ? await buildStartLessonNotificationBody(application.courseId, application.course.title) : input.adminNote || `Your ${application.course.title} registration is ${input.status.toLowerCase()}.`,
    },
  });
  await prisma.trainingAuditLog.create({
    data: {
      actorId: input.actorId,
      action: `academy.public_learner.${input.status.toLowerCase()}`,
      target: application.id,
      metadata: { courseId: application.courseId, learnerId: application.learnerId } as Prisma.InputJsonObject,
    },
  });
  return updated;
}

function countLessons(course: { modules: Array<{ sections: Array<{ lessons: unknown[] }> }> }) {
  return course.modules.reduce((sum, module) => sum + module.sections.reduce((count, section) => count + section.lessons.length, 0), 0);
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

async function buildStartLessonNotificationBody(courseId: string, courseTitle: string) {
  const course = await getMainPrisma().trainingCourse.findUnique({
    where: { id: courseId },
    select: {
      modules: {
        orderBy: { sortOrder: "asc" },
        select: {
          sections: {
            orderBy: { sortOrder: "asc" },
            select: {
              lessons: { orderBy: { sortOrder: "asc" }, select: { title: true }, take: 1 },
            },
            take: 1,
          },
        },
        take: 1,
      },
    },
  });
  const firstLesson = course ? getFirstCourseLesson(course) : null;
  return firstLesson
    ? `Your place has been reserved. Start your first lesson within ${FIRST_LESSON_START_DEADLINE_HOURS} hours to keep your place. The system will release unused places. Start with Lesson 1: ${replaceLegacyBrandingText(firstLesson.title)}.`
    : `${courseTitle} is active in your learner dashboard.`;
}

function computeLearningStreak(dates: Date[]) {
  if (!dates.length) return 0;
  const dayKeys = new Set(dates.map((date) => date.toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (dayKeys.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (streak === 0) {
      cursor.setDate(cursor.getDate() - 1);
      if (Math.abs(Date.now() - cursor.getTime()) > 86400000 * 2) break;
    } else {
      break;
    }
    if (streak > 365) break;
  }
  return streak;
}

function buildCourseIncludes(input: {
  lessonCount: number;
  toolkitCount: number;
  quizCount: number;
  assignmentCount: number;
  finalExamCount: number;
  certificateEnabled: boolean;
}) {
  const rows = [`${input.lessonCount} guided lesson${input.lessonCount === 1 ? "" : "s"}`];
  if (input.toolkitCount) rows.push(`${input.toolkitCount} downloadable resource${input.toolkitCount === 1 ? "" : "s"}`);
  if (input.quizCount) rows.push(`${input.quizCount} quiz${input.quizCount === 1 ? "" : "zes"}`);
  if (input.assignmentCount) rows.push(`${input.assignmentCount} practical assignment${input.assignmentCount === 1 ? "" : "s"}`);
  if (input.finalExamCount) rows.push(`${input.finalExamCount} final exam${input.finalExamCount === 1 ? "" : "s"}`);
  if (input.certificateEnabled) rows.push("Downloadable certificate after completion requirements are met");
  return rows;
}

function buildAssessmentSummary(input: {
  courseTitle: string;
  quizCount: number;
  assignmentCount: number;
  finalExamCount: number;
  passMark: number;
  certificateEnabled: boolean;
}) {
  const requirements = [];
  if (input.quizCount) requirements.push(`pass ${input.quizCount} quiz${input.quizCount === 1 ? "" : "zes"}`);
  if (input.assignmentCount) requirements.push(`complete ${input.assignmentCount} assignment${input.assignmentCount === 1 ? "" : "s"}`);
  if (input.finalExamCount) requirements.push(`pass the final exam`);
  if (!requirements.length) return input.certificateEnabled
    ? `Complete ${input.courseTitle} lessons and meet the ${input.passMark}% course pass requirement to unlock the certificate.`
    : `Complete ${input.courseTitle} lessons to finish this course.`;
  const joined = requirements.length === 1 ? requirements[0] : `${requirements.slice(0, -1).join(", ")} and ${requirements.at(-1)}`;
  return `Complete the lessons, ${joined}, and meet the ${input.passMark}% course pass requirement${input.certificateEnabled ? " to unlock the certificate" : ""}.`;
}

function buildDashboardCertificateRequirements(input: { progress: number; completed: boolean; certificateIssued: boolean }) {
  return [
    { label: "Reach 100% course progress", complete: input.completed || input.progress >= 100 },
    { label: "Complete required assessments", complete: input.completed },
    { label: "Certificate record issued", complete: input.certificateIssued },
  ];
}

function buildIssuedCertificatePreviewPayload(input: {
  certificate: {
    id: string;
    certificateNumber: string;
    courseId: string | null;
    issuedAt: Date;
    expiresAt: Date | null;
    course?: {
      id: string;
      title: string;
      learningOutcomes: Prisma.JsonValue;
    } | null;
    template?: {
      backgroundUrl: string | null;
      logoUrl: string | null;
      signatureUrl: string | null;
      templateJson: Prisma.JsonValue;
    } | null;
  };
  learnerName: string;
  programme: ReturnType<typeof getProgrammeCourse> | null;
  programmeBadge?: { name: string } | null;
  fallbackTemplate?: {
    backgroundUrl: string | null;
    logoUrl: string | null;
    signatureUrl: string | null;
    templateJson: Prisma.JsonValue;
  } | null;
}) {
  const template = input.certificate.template ?? input.fallbackTemplate ?? null;
  const templateJson = (template?.templateJson ?? {}) as Record<string, unknown>;
  const colours = (templateJson.colours ?? {}) as Record<string, unknown>;
  const certificateTitle = typeof templateJson.title === "string" && templateJson.title.trim()
    ? String(templateJson.title)
    : input.certificate.course?.title
      ? `${input.certificate.course.title} Certificate`
      : "HouseLink Academy Training Certificate";
  const learningOutcomes = Array.isArray(input.certificate.course?.learningOutcomes)
    ? input.certificate.course.learningOutcomes.filter((item): item is string => typeof item === "string")
    : [];

  return {
    learnerName: input.learnerName,
    courseTitle: input.certificate.course?.title ?? "HouseLink Academy Course",
    certificateTitle: trainingCertificateTitle(certificateTitle),
    certificateNumber: input.certificate.certificateNumber,
    issuedAt: input.certificate.issuedAt.toISOString(),
    expiresAt: input.certificate.expiresAt?.toISOString() ?? null,
    verifyUrl: `/academy/verify?certificate=${encodeURIComponent(input.certificate.certificateNumber)}`,
    accent: String(colours.primary ?? input.programme?.theme.accent ?? "#008b68"),
    backgroundUrl: template?.backgroundUrl ?? null,
    logoUrl: template?.logoUrl ?? null,
    signatureUrl: template?.signatureUrl ?? null,
    signatureName: typeof templateJson.signatureName === "string" ? templateJson.signatureName : null,
    signatureTitle: typeof templateJson.signatureTitle === "string" ? templateJson.signatureTitle : null,
    secondSignatureUrl: typeof templateJson.secondSignatureUrl === "string" ? templateJson.secondSignatureUrl : null,
    secondSignatureName: typeof templateJson.secondSignatureName === "string" ? templateJson.secondSignatureName : null,
    secondSignatureTitle: typeof templateJson.secondSignatureTitle === "string" ? templateJson.secondSignatureTitle : null,
    sealUrl: typeof templateJson.sealUrl === "string" ? templateJson.sealUrl : null,
    leftLaurelUrl: typeof templateJson.leftLaurelUrl === "string" ? templateJson.leftLaurelUrl : null,
    rightLaurelUrl: typeof templateJson.rightLaurelUrl === "string" ? templateJson.rightLaurelUrl : null,
    designation: typeof templateJson.designation === "string" ? templateJson.designation : null,
    completionIntro: typeof templateJson.completionIntro === "string" ? templateJson.completionIntro : null,
    awardIntro: typeof templateJson.awardIntro === "string" ? templateJson.awardIntro : null,
    badgeLine: typeof templateJson.badgeLine === "string" ? templateJson.badgeLine : null,
    recognitionLineOne: typeof templateJson.recognitionLineOne === "string" ? templateJson.recognitionLineOne : null,
    recognitionLineTwo: typeof templateJson.recognitionLineTwo === "string" ? templateJson.recognitionLineTwo : null,
    learnerNameFont: typeof templateJson.learnerNameFont === "string" ? templateJson.learnerNameFont : null,
    learnerNameMaxFontSize: typeof templateJson.learnerNameMaxFontSize === "number" ? templateJson.learnerNameMaxFontSize : null,
    learnerNameMinFontSize: typeof templateJson.learnerNameMinFontSize === "number" ? templateJson.learnerNameMinFontSize : null,
    designationMaxFontSize: typeof templateJson.designationMaxFontSize === "number" ? templateJson.designationMaxFontSize : null,
    badgeLineMaxFontSize: typeof templateJson.badgeLineMaxFontSize === "number" ? templateJson.badgeLineMaxFontSize : null,
    customHtml: typeof templateJson.customHtml === "string" ? templateJson.customHtml : "",
    customCss: typeof templateJson.customCss === "string" ? templateJson.customCss : "",
    skillsAssessed: learningOutcomes,
    badgeName: input.programmeBadge?.name ?? null,
  };
}

function selectDashboardCertificateTemplateForCourse<T extends { templateJson: Prisma.JsonValue }>(templates: T[], courseId: string | null): T | null {
  if (!courseId) return templates[0] ?? null;
  const courseTemplate = templates.find((template) => {
    const templateJson = (template.templateJson ?? {}) as Record<string, unknown>;
    const courseIds = Array.isArray(templateJson.courseIds) ? templateJson.courseIds.filter((id): id is string => typeof id === "string") : [];
    return courseIds.includes(courseId);
  });
  if (courseTemplate) return courseTemplate;

  return templates.find((template) => {
    const templateJson = (template.templateJson ?? {}) as Record<string, unknown>;
    const courseIds = Array.isArray(templateJson.courseIds) ? templateJson.courseIds.filter((id): id is string => typeof id === "string") : [];
    return courseIds.length === 0;
  }) ?? templates[0] ?? null;
}

function trainingCertificateTitle(title: string) {
  if (/^Certified HouseLink Agent$/i.test(title.trim())) return "Certificate of Completion - HouseLink Agent Foundations";
  if (/HouseLink Certified Agent - Foundations/i.test(title)) return "Certificate of Completion - HouseLink Agent Foundations";
  if (/HouseLink Certified Agent - Listing & Client Mastery/i.test(title)) return "Certificate of Completion - HouseLink Listing & Client Mastery";
  if (/HouseLink Certified Professional Agent/i.test(title)) return "Certificate of Completion - HouseLink Professional Training";
  return title;
}

export async function getAcademySettingsPublic() {
  const settings = await getMainPrisma().trainingSetting.findUnique({ where: { id: "singleton" } });
  const payload = (settings?.payload ?? {}) as Record<string, unknown>;
  return {
    academyName: String(payload.academyName ?? "HouseLink Academy"),
    certificatePrefix: String(payload.certificatePrefix ?? "HLA"),
    primaryColour: String(payload.primaryColour ?? "#008b68"),
    accentColour: String(payload.accentColour ?? "#c6a15b"),
    paymentInstructions: String(payload.paymentInstructions ?? "Upload proof of payment for admin approval before course activation."),
    accessDurationDays: Number(payload.accessDurationDays ?? 365),
    supportedFormats: Array.isArray(payload.supportedFormats) ? payload.supportedFormats : ["PDF", "DOCX", "VIDEO"],
    quizSettings: (payload.quizSettings ?? { defaultPassMark: 80, maxAttempts: 3, showResults: true }) as Record<string, unknown>,
    enrolmentSettings: (payload.enrolmentSettings ?? { allowTrainingOnly: true, requirePaymentProof: true }) as Record<string, unknown>,
    completionRules: (payload.completionRules ?? { requireAllLessons: true, requireFinalExam: false }) as Record<string, unknown>,
    requireEmailVerification: Boolean(payload.requireEmailVerification ?? false),
    community: (payload.community ?? { enabled: false, name: "", whatsappUrl: "", inviteText: "", sharePrompt: "" }) as Record<string, unknown>,
  };
}

export async function getLearnerCourseDetail(learnerId: string, courseId: string, options?: { isAgent?: boolean }) {
  const prisma = getMainPrisma();
  const programme = getProgrammeCourse(courseId);
  // Courses built in admin are independent unless they belong to the managed
  // programme; only managed programme courses use the programme prerequisite
  // gates.
  if (programme) {
    const access = await canAccessProgrammeCourse(learnerId, courseId);
    if (!access.allowed) return "PREREQUISITE_NOT_MET" as const;
  }

  const enrolment = await prisma.courseEnrolment.findUnique({
    where: { courseId_agentId: { courseId, agentId: learnerId } },
  });
  const application = await prisma.academyLearnerApplication.findUnique({
    where: { learnerId_courseId: { learnerId, courseId } },
  });
  if (!enrolment || enrolment.status !== "ACTIVE") {
    if (application?.status !== AcademyRegistrationStatus.APPROVED) return "NOT_ENROLLED" as const;
  }

  await syncLessonHandoutUrls(courseId);
  const course = await fetchCourseTree(courseId);
  if (!course) return "NOT_FOUND" as const;

  const completedIds = await getCompletedLessonIds(learnerId, courseId);
  const progress = calculateCourseProgress(course, completedIds);
  const courseProgress = await prisma.courseProgress.findUnique({ where: { courseId_agentId: { courseId, agentId: learnerId } } });

  const [quizAttempts, assignmentSubmissions, examAttempts, settings, bookmarkRows, retakeRules, programmeBadge, certificate] = await Promise.all([
    prisma.quizAttempt.findMany({ where: { agentId: learnerId, quiz: { courseId } }, orderBy: { startedAt: "desc" } }),
    prisma.assignmentSubmission.findMany({ where: { agentId: learnerId, assignment: { courseId } }, orderBy: { submittedAt: "desc" } }),
    prisma.examAttempt.findMany({ where: { agentId: learnerId, exam: { courseId } }, orderBy: { startedAt: "desc" } }),
    getAcademySettingsPublic(),
    prisma.lessonProgress.findMany({ where: { agentId: learnerId, status: "BOOKMARKED" }, select: { lessonId: true } }),
    getCourseRetakeRules(courseId),
    programme ? prisma.badge.findUnique({ where: { id: programme.badgeId } }) : Promise.resolve(null),
    prisma.certificateIssue.findFirst({
      where: { agentId: learnerId, courseId, status: "ACTIVE" },
      select: { id: true, certificateNumber: true, issuedAt: true },
      orderBy: { issuedAt: "desc" },
    }),
  ]);
  const bookmarkIds = new Set(bookmarkRows.map((row) => row.lessonId));

  const bestQuizScores = new Map<string, number>();
  for (const attempt of quizAttempts) {
    const score = Number(attempt.score);
    const current = bestQuizScores.get(attempt.quizId) ?? 0;
    if (score > current) bestQuizScores.set(attempt.quizId, score);
  }

  const toolkitRaw = await getToolkitGroupsForCourse(courseId, { cumulative: true });
  const toolkitAccess = await getToolkitAccessView(learnerId, courseId, Boolean(options?.isAgent));
  const toolkit = maskToolkitGroups(toolkitRaw, toolkitAccess);
  const lessonCount = course.modules.reduce((sum, module) => sum + module.sections.reduce((sectionSum, section) => sectionSum + section.lessons.length, 0), 0);
  const toolkitCount = toolkitRaw.reduce((sum, group) => sum + group.items.length, 0);
  const quizCount = course.quizzes.length;
  const assignmentCount = course.assignments.length;
  const finalExamCount = course.finalExams.length;
  const generatedIncludes = buildCourseIncludes({
    lessonCount,
    toolkitCount,
    quizCount,
    assignmentCount,
    finalExamCount,
    certificateEnabled: course.certificateEnabled,
  });
  const generatedAssessmentSummary = buildAssessmentSummary({
    courseTitle: course.title,
    quizCount,
    assignmentCount,
    finalExamCount,
    passMark: course.passingPercentage,
    certificateEnabled: course.certificateEnabled,
  });
  const defaultCourseTheme = {
    label: "Course",
    accent: settings.primaryColour,
    gradient: "from-emerald-600 via-emerald-700 to-teal-800",
    sidebar: "from-emerald-50 via-white to-teal-50/60",
    chip: "bg-emerald-100 text-emerald-900",
  };
  const assignmentStatuses = Object.fromEntries(
    course.assignments.map((assignment) => [
      assignment.id,
      assignmentSubmissions.find((submission) => submission.assignmentId === assignment.id)?.status ?? null,
    ]),
  );
  const quizScores = Object.fromEntries(course.quizzes.map((quiz) => [quiz.id, bestQuizScores.get(quiz.id) ?? null]));
  const readiness = buildReadinessScore(programme, {
    courseProgress: courseProgress?.percentComplete ?? progress.percentComplete,
    quizScores,
    assignmentStatuses,
    finalExamPassed: examAttempts.some((attempt) => attempt.status === "PASSED"),
  });
  const moduleGateStates = await Promise.all(course.modules.map((module) => getModuleGateState(learnerId, courseId, module.id)));
  const lessonGateEntries = await Promise.all(
    course.modules.flatMap((module) =>
      module.sections.flatMap((section) =>
        section.lessons.map(async (lesson) => [lesson.id, await getLessonGateState(learnerId, courseId, lesson.id)] as const),
      ),
    ),
  );
  const lessonGateById = new Map(lessonGateEntries);
  const quizGateEntries = await Promise.all(course.quizzes.map(async (quiz) => [quiz.id, await getAssessmentGateState(learnerId, courseId, quiz.id, "quiz")] as const));
  const assignmentGateEntries = await Promise.all(course.assignments.map(async (assignment) => [assignment.id, await getAssessmentGateState(learnerId, courseId, assignment.id, "assignment")] as const));
  const quizGateById = new Map(quizGateEntries);
  const assignmentGateById = new Map(assignmentGateEntries);
  const moduleTitleById = new Map(course.modules.map((module) => [module.id, module.title]));
  const lessonPlacementById = new Map(
    course.modules.flatMap((module) =>
      module.sections.flatMap((section) => section.lessons.map((lesson) => [lesson.id, { lessonTitle: lesson.title, moduleTitle: module.title }] as const)),
    ),
  );

  return {
    settings,
    programme: {
      theme: programme?.theme ?? defaultCourseTheme,
      badgeName: programmeBadge?.name ?? programme?.badgeName ?? `${course.title} completion`,
      certificateTitle: course.certificateEnabled ? `${course.title} Certificate` : "Course completion",
      subtitle: course.subtitle,
      assessmentSummary: generatedAssessmentSummary,
      includes: generatedIncludes,
    },
    toolkit,
    toolkitAccess,
    course: {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      instructor: course.instructor,
      certificateEnabled: course.certificateEnabled,
      passingPercentage: course.passingPercentage,
      retakeRules,
      progress: courseProgress?.percentComplete ?? progress.percentComplete,
      status: courseProgress?.status ?? "NOT_STARTED",
      modules: course.modules.map((module, moduleIndex) => ({
        id: module.id,
        title: module.title,
        description: module.description,
        sortOrder: module.sortOrder,
        gate: moduleGateStates[moduleIndex],
        sections: module.sections.map((section) => ({
          id: section.id,
          title: section.title,
          sortOrder: section.sortOrder,
          lessons: section.lessons.map((lesson) => ({
            ...mapLessonForLearner(lesson, completedIds, bookmarkIds),
            locked: lessonGateById.get(lesson.id)?.locked ?? moduleGateStates[moduleIndex]?.locked ?? false,
            gate: lessonGateById.get(lesson.id) ?? moduleGateStates[moduleIndex],
          })),
        })),
        lessonCount: module.sections.reduce((sum, s) => sum + s.lessons.length, 0),
        completedCount: module.sections.reduce((sum, s) => sum + s.lessons.filter((l) => completedIds.has(l.id)).length, 0),
      })),
    },
    assessments: {
      summary: generatedAssessmentSummary,
      badgeName: programmeBadge?.name ?? programme?.badgeName ?? null,
      totals: {
        quizzes: course.quizzes.length,
        quizzesPassed: course.quizzes.filter(
          (quiz) => (bestQuizScores.get(quiz.id) ?? 0) >= quiz.passingPercentage,
        ).length,
        assignments: course.assignments.length,
        assignmentsSubmitted: course.assignments.filter(
          (assignment) => assignmentSubmissions.some((s) => s.assignmentId === assignment.id),
        ).length,
        exams: programme?.requiresFinalExam === false ? 0 : course.finalExams.length,
      },
      quizzes: course.quizzes
        .map((quiz) => {
          const meta = assessmentMetaForQuiz(quiz.id);
          const attempts = quizAttempts.filter((attempt) => attempt.quizId === quiz.id && (attempt.status === "PASSED" || attempt.status === "FAILED"));
          const lessonPlacement = quiz.lessonId ? lessonPlacementById.get(quiz.lessonId) : null;
          return {
            id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            moduleTitle: lessonPlacement?.moduleTitle ?? (quiz.moduleId ? moduleTitleById.get(quiz.moduleId) : null) ?? meta?.moduleTitle ?? null,
            lessonTitle: lessonPlacement?.lessonTitle ?? null,
            moduleId: quiz.moduleId,
            lessonId: quiz.lessonId,
            sortOrder: meta?.sortOrder ?? 0,
            gate: quizGateById.get(quiz.id) ?? { locked: false, title: "", requirements: [] },
            passingPercentage: quiz.passingPercentage,
            timeLimitMinutes: quiz.timeLimitMinutes,
            questionCount: quiz.questions.length,
            bestScore: bestQuizScores.get(quiz.id) ?? null,
            passed: (bestQuizScores.get(quiz.id) ?? 0) >= quiz.passingPercentage,
            attemptsUsed: attempts.length,
            attemptLimit: retakeRules.quizAttemptLimit,
            attemptsRemaining: attemptsRemaining(retakeRules.quizAttemptLimit, attempts.length),
          };
        })
        .sort((a, b) => a.sortOrder - b.sortOrder),
      assignments: course.assignments
        .map((assignment) => {
          const meta = assessmentMetaForAssignment(assignment.id);
          const submissions = assignmentSubmissions.filter((submission) => submission.assignmentId === assignment.id);
          const latestSubmission = submissions[0];
          const grade = latestSubmission?.grade == null ? null : Number(latestSubmission.grade);
          const gradePercent = grade == null
            ? null
            : assignment.points > 0
              ? Math.round((grade / assignment.points) * 100)
              : 0;
          const passed = latestSubmission?.status === "APPROVED"
            || (latestSubmission?.status === "GRADED" && (gradePercent ?? 0) >= course.passingPercentage);
          const needsResubmission = latestSubmission?.status === "RESUBMISSION_REQUESTED"
            || latestSubmission?.status === "REJECTED"
            || (latestSubmission?.status === "GRADED" && gradePercent !== null && gradePercent < course.passingPercentage);
          const lessonPlacement = assignment.lessonId ? lessonPlacementById.get(assignment.lessonId) : null;
          return {
            id: assignment.id,
            title: assignment.title,
            description: assignment.description,
            moduleTitle: lessonPlacement?.moduleTitle ?? (assignment.moduleId ? moduleTitleById.get(assignment.moduleId) : null) ?? meta?.moduleTitle ?? null,
            lessonTitle: lessonPlacement?.lessonTitle ?? null,
            moduleId: assignment.moduleId,
            lessonId: assignment.lessonId,
            sortOrder: meta?.sortOrder ?? 0,
            gate: assignmentGateById.get(assignment.id) ?? { locked: false, title: "", requirements: [] },
            points: assignment.points,
            dueDays: assignment.dueDays,
            submitted: Boolean(latestSubmission),
            status: latestSubmission?.status ?? null,
            grade,
            gradePercent,
            passed,
            needsResubmission,
            reviewerNote: latestSubmission?.reviewerNote ?? null,
            attemptsUsed: submissions.length,
            attemptLimit: retakeRules.assignmentSubmissionLimit,
            attemptsRemaining: attemptsRemaining(retakeRules.assignmentSubmissionLimit, submissions.length),
          };
        })
        .sort((a, b) => a.sortOrder - b.sortOrder),
      exams: programme?.requiresFinalExam === false
        ? []
        : course.finalExams.map((exam) => {
            const attempts = examAttempts.filter((attempt) => attempt.examId === exam.id && (attempt.status === "PASSED" || attempt.status === "FAILED"));
            const attemptLimit = retakeRules.examAttemptLimit || exam.attemptLimit;
            return {
              id: exam.id,
              title: exam.title,
              description: `Final examination covering ${course.title}.`,
              durationMinutes: exam.durationMinutes,
              passingScore: exam.passingScore,
              attemptLimit,
              attemptsUsed: attempts.length,
              attemptsRemaining: attemptsRemaining(attemptLimit, attempts.length),
              bestScore: attempts.length ? Math.max(...attempts.map((attempt) => Number(attempt.score))) : null,
              passed: attempts.some((attempt) => attempt.status === "PASSED"),
            };
          }),
      certificateCheckpoint: programme?.requiresFinalExam
        ? null
        : course.certificateEnabled
          ? {
            title: "Certificate Checkpoint",
            description: generatedAssessmentSummary,
          }
          : null,
      readiness,
    },
    materials: flattenCourseMaterials(course),
    certificate: certificate
      ? {
          id: certificate.id,
          certificateNumber: certificate.certificateNumber,
          issuedAt: certificate.issuedAt.toISOString(),
          downloadUrl: `/dashboard/academy/certificate/${certificate.id}`,
        }
      : null,
    application: application
      ? {
          id: application.id,
          status: application.status,
          accessEndsAt: application.accessEndsAt?.toISOString() ?? null,
        }
      : null,
  };
}
