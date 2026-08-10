import {
  AssignmentSubmissionStatus,
  ListingStatus,
  Prisma,
  TrainingAttemptStatus,
  TrainingCourseStatus,
  TrainingDifficulty,
  TrainingQuestionType,
  TrainingResourceType,
  TrainingVisibility,
} from "@prisma/client";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { ensureOfficialAcademySeed } from "@/lib/academy/official-academy-seed";
import { reviewPublicLearnerApplication } from "@/lib/academy/public-academy-repository";
import { reviewResourceAccessApplication } from "@/lib/academy/academy-resource-access";
import { fetchCourseTree, resolveLessonSectionId } from "@/lib/academy/course-tree";
import { tryCompleteCourseCertification } from "@/lib/academy/academy-progress";
import { getCourseRetakeRules, normaliseRetakeRules, saveCourseRetakeRules } from "@/lib/academy/assessment-retake-rules";
import { sendSmtpPlainEmail } from "@/lib/integrations/smtp";
import { getHydratedRuntimePlatformSettings } from "@/lib/settings/runtime";

export type AcademyDashboard = Awaited<ReturnType<typeof getAcademyDashboard>>;

const DEFAULT_DOCUMENT_CATEGORIES = [
  "Training Manuals",
  "Sales Scripts",
  "Viewing Forms",
  "Inspection Checklists",
  "Offer to Purchase",
  "Lease Agreements",
  "Rental Forms",
  "Property Management Forms",
  "Marketing Templates",
  "Company Policies",
  "Legal Documents",
  "Government Documents",
  "Compliance Documents",
  "HR Documents",
  "Brand Guidelines",
  "Commission Forms",
];

const DEFAULT_TRAINING_CATEGORIES = [
  "New Agent Programme",
  "Legal Compliance",
  "Sales",
  "Negotiation",
  "Property Management",
  "Continuing Education",
];

type Actor = { id: string; name: string };

export async function getAcademyDashboard(options: { compact?: boolean } = {}) {
  await ensureAcademyDefaults();
  await ensureOfficialAcademySeed();
  const prisma = getMainPrisma();
  const compact = options.compact === true;
  const [
    courses,
    lessonCount,
    lessonRows,
    documents,
    videos,
    quizzes,
    assignments,
    exams,
    certificates,
    enrolments,
    courseProgress,
    lessonProgress,
    quizAttempts,
    examAttempts,
    assignmentSubmissions,
    learningPaths,
    announcements,
    badges,
    settings,
    recentActivity,
    publicLearnerApplications,
    resourceAccessApplications,
    academyRevenue,
    discussionThreads,
    agentBadges,
    coupons,
    certificateTemplates,
  ] = await Promise.all([
    prisma.trainingCourse.findMany({
      include: {
        category: true,
        modules: { include: { sections: { include: { lessons: true } } } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.trainingLesson.count(),
    compact
      ? prisma.trainingLesson.findMany({
          select: {
            id: true,
            sectionId: true,
            title: true,
            summary: true,
            estimatedMinutes: true,
            sortOrder: true,
            section: { select: { id: true, title: true, module: { select: { id: true, title: true, course: { select: { id: true, title: true, status: true } } } } } },
          },
          orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
        })
      : prisma.trainingLesson.findMany({
          include: {
            section: { include: { module: { include: { course: true } } } },
            lessonVideos: true,
            lessonDocuments: { include: { document: true } },
            lessonResources: true,
            lessonDownloads: true,
          },
          orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
        }),
    prisma.documentLibrary.findMany({
      where: { active: true, visible: true },
      include: { category: true },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.videoLibrary.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.quiz.findMany({ include: { questions: true, attempts: compact ? { take: 100, orderBy: { startedAt: "desc" } } : true }, orderBy: { updatedAt: "desc" } }),
    prisma.assignment.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.finalExam.findMany({ include: { attempts: compact ? { take: 100, orderBy: { startedAt: "desc" } } : true }, orderBy: { updatedAt: "desc" } }),
    prisma.certificateIssue.findMany({ include: { course: { select: { title: true } } }, orderBy: { issuedAt: "desc" }, ...(compact ? { take: 250 } : {}) }),
    prisma.courseEnrolment.findMany(),
    prisma.courseProgress.findMany({ orderBy: { updatedAt: "desc" }, ...(compact ? { take: 500 } : {}) }),
    prisma.lessonProgress.findMany({ orderBy: { lastViewedAt: "desc" }, ...(compact ? { take: 500 } : {}) }),
    prisma.quizAttempt.findMany({ orderBy: { startedAt: "desc" }, ...(compact ? { take: 500 } : {}) }),
    prisma.examAttempt.findMany({ orderBy: { startedAt: "desc" }, ...(compact ? { take: 300 } : {}) }),
    prisma.assignmentSubmission.findMany({ orderBy: { submittedAt: "desc" }, ...(compact ? { take: 300 } : {}) }),
    prisma.learningPath.findMany({ include: { courses: { include: { course: true }, orderBy: { sortOrder: "asc" } } }, orderBy: { updatedAt: "desc" } }),
    prisma.announcement.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.badge.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.trainingSetting.findUnique({ where: { id: "singleton" } }),
    prisma.trainingAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.academyLearnerApplication.findMany({
      include: { course: true, payment: true, learner: { select: { id: true, name: true, email: true, phone: true, roles: true } } },
      orderBy: { updatedAt: "desc" },
      ...(compact ? { take: 100 } : {}),
    }),
    prisma.academyResourceAccess.findMany({
      include: { course: true, payment: true, learner: { select: { id: true, name: true, email: true, phone: true, roles: true } } },
      orderBy: { updatedAt: "desc" },
      ...(compact ? { take: 100 } : {}),
    }),
    prisma.payment.aggregate({ where: { plan: "academy_course", status: "PAID" }, _sum: { amount: true } }),
    compact
      ? prisma.discussionThread.findMany({
          include: { _count: { select: { posts: true } }, course: { select: { id: true, title: true } } },
          orderBy: { updatedAt: "desc" },
          take: 30,
        })
      : prisma.discussionThread.findMany({
          include: { posts: true, course: { select: { id: true, title: true } } },
          orderBy: { updatedAt: "desc" },
          take: 50,
        }),
    prisma.agentBadge.findMany({
      include: { badge: true, user: { select: { id: true, name: true, email: true } } },
      orderBy: { awardedAt: "desc" },
      ...(compact ? { take: 100 } : {}),
    }),
    prisma.academyCoupon.findMany({
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
        usages: { take: 10, orderBy: { createdAt: "desc" } },
        _count: { select: { usages: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.certificateTemplate.findMany({ orderBy: { updatedAt: "desc" } }),
  ]);

  const [pendingLearnerCount, pendingResourceCount] = await Promise.all([
    prisma.academyLearnerApplication.count({
      where: { status: { in: ["PAYMENT_UPLOADED", "PENDING_PAYMENT"] } },
    }),
    prisma.academyResourceAccess.count({
      where: { status: { in: ["PAYMENT_UPLOADED", "PENDING_PAYMENT"] } },
    }),
  ]);
  const learnerIdsForDisplay = [
    ...certificates.map((certificate) => certificate.agentId),
    ...assignmentSubmissions.map((submission) => submission.agentId),
    ...agentBadges.map((entry) => entry.agentId),
  ];
  const certificateLearners = await prisma.user.findMany({
    where: { id: { in: [...new Set(learnerIdsForDisplay)] } },
    select: { id: true, name: true, email: true },
  });
  const certificateLearnerById = new Map(certificateLearners.map((learner) => [learner.id, learner]));
  const certificateRows = certificates.map((certificate) => {
    const learner = certificateLearnerById.get(certificate.agentId);
    return {
      id: certificate.id,
      certificateNumber: certificate.certificateNumber,
      agentId: certificate.agentId,
      learnerName: learner?.name ?? null,
      learnerEmail: learner?.email ?? null,
      courseId: certificate.courseId,
      courseTitle: certificate.course?.title ?? null,
      status: certificate.status,
      issuedAt: certificate.issuedAt.toISOString(),
      expiresAt: certificate.expiresAt?.toISOString() ?? null,
    };
  });

  const activeLearners = new Set([
    ...courseProgress.filter((entry) => daysAgo(entry.updatedAt) <= 30).map((entry) => entry.agentId),
    ...lessonProgress.filter((entry) => daysAgo(entry.lastViewedAt) <= 30).map((entry) => entry.agentId),
  ]);
  const enrolledLearners = new Set(enrolments.map((entry) => entry.agentId));
  const certifiedAgentIds = [...new Set(certificates.filter((certificate) => certificate.status === "ACTIVE").map((certificate) => certificate.agentId))];
  const scoredAttempts = [...quizAttempts, ...examAttempts].filter((attempt) => Number(attempt.score) > 0);
  const completedCourses = courseProgress.filter((entry) => entry.status === "COMPLETED");
  const totalLearningMinutes = courseProgress.reduce((sum, entry) => sum + entry.learningMinutes, 0);
  const totalVideoSeconds = videos.reduce((sum, video) => sum + video.durationSeconds, 0);
  const watchedSeconds = await prisma.videoProgress.aggregate({ _sum: { watchedSeconds: true } });
  const failedQuiz = quizzes
    .map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      failed: quiz.attempts.filter((attempt) => attempt.status === TrainingAttemptStatus.FAILED).length,
      attempts: quiz.attempts.length,
    }))
    .filter((quiz) => quiz.attempts > 0 && quiz.failed > 0)
    .sort((a, b) => b.failed - a.failed)[0];
  const trainerInsights = buildTrainerInsights({ quizzes, quizAttempts, examAttempts, assignmentSubmissions });
  const learnerProfiles = buildLearnerProfiles({ enrolments, courseProgress, quizAttempts, examAttempts, assignmentSubmissions, certificates });
  const courseIdByLessonId = new Map(
    lessonRows.map((lesson: any) => [lesson.id, lesson.section?.module?.course?.id ?? lesson.section?.module?.courseId ?? null]),
  );
  const [certifiedActiveListings, certifiedClosedListings] = await Promise.all([
    certifiedAgentIds.length
      ? prisma.listing.count({ where: { ownerId: { in: certifiedAgentIds }, status: ListingStatus.ACTIVE } })
      : 0,
    certifiedAgentIds.length
      ? prisma.listing.count({ where: { ownerId: { in: certifiedAgentIds }, status: { in: [ListingStatus.SOLD, ListingStatus.RENTED] } } })
      : 0,
  ]);
  const learnerDirectory = new Map(certificateLearners.map((learner) => [learner.id, { name: learner.name ?? learner.email ?? learner.id, email: learner.email ?? "" }]));
  for (const application of publicLearnerApplications) {
    learnerDirectory.set(application.learnerId, {
      name: application.learner?.name ?? application.fullName ?? application.email ?? application.learnerId,
      email: application.learner?.email ?? application.email ?? "",
    });
  }
  const academyIntegrity = buildAcademyIntegrity({
    courses,
    lessons: lessonRows as any[],
    quizzes,
    assignments,
    certificateTemplates,
    announcements,
    badges,
  });
  const learnerTimeline = buildLearnerTimeline({
    learnerDirectory,
    enrolments,
    courseProgress,
    lessonProgress,
    quizAttempts,
    examAttempts,
    assignmentSubmissions,
    certificates,
    courses,
    quizzes,
    assignments,
    exams,
  });
  const certificateSimulations = buildCertificateSimulations({
    learnerDirectory,
    enrolments,
    courseProgress,
    quizAttempts,
    examAttempts,
    assignmentSubmissions,
    certificates,
    courses,
    quizzes,
    assignments,
    exams,
  });
  const announcementDelivery = buildAnnouncementDeliverySummary({ announcements, publicLearnerApplications, enrolments });

  return {
    metrics: {
      totalCourses: courses.length,
      publishedCourses: courses.filter((course) => course.status === TrainingCourseStatus.PUBLISHED).length,
      draftCourses: courses.filter((course) => course.status === TrainingCourseStatus.DRAFT).length,
      archivedCourses: courses.filter((course) => course.status === TrainingCourseStatus.ARCHIVED).length,
      totalLessons: lessonCount,
      videosUploaded: videos.length,
      pdfResources: documents.filter((document) => document.fileType === TrainingResourceType.PDF).length,
      quizzes: quizzes.length,
      assignments: assignments.length,
      exams: exams.length,
      totalEnrolments: enrolments.filter((entry) => entry.status === "ACTIVE").length,
      totalCertificates: certificates.length,
      certificatesIssued: certificates.length,
      activeCertificates: certificates.filter((certificate) => certificate.status === "ACTIVE").length,
      activeLearners: activeLearners.size,
      inactiveLearners: Math.max(0, enrolledLearners.size - activeLearners.size),
      averageScore: scoredAttempts.length ? Math.round(scoredAttempts.reduce((sum, attempt) => sum + Number(attempt.score), 0) / scoredAttempts.length) : 0,
      completionRate: enrolments.length ? Math.round((completedCourses.length / enrolments.length) * 100) : 0,
      learningHours: Math.round(totalLearningMinutes / 60),
      downloads: documents.filter((document) => document.downloadable).length,
      videoWatchPercent: totalVideoSeconds ? Math.min(100, Math.round(((watchedSeconds._sum.watchedSeconds ?? 0) / totalVideoSeconds) * 100)) : 0,
      publicLearners: publicLearnerApplications.length,
      pendingPublicApprovals: pendingLearnerCount + pendingResourceCount,
      academyRevenue: Number(academyRevenue._sum.amount ?? 0),
      certifiedAgents: certifiedAgentIds.length,
      certifiedActiveListings,
      certifiedClosedListings,
    },
    courses,
    lessons: lessonRows.map((lesson: any) => ({
      ...lesson,
      lessonVideos: lesson.lessonVideos ?? [],
      lessonDocuments: lesson.lessonDocuments ?? [],
      lessonResources: lesson.lessonResources ?? [],
      lessonDownloads: lesson.lessonDownloads ?? [],
    })),
    documents,
    videos,
    quizzes,
    assignments,
    assignmentSubmissions: assignmentSubmissions.slice(0, 50).map((submission) => ({
      id: submission.id,
      assignmentId: submission.assignmentId,
      agentId: submission.agentId,
      learnerName: certificateLearnerById.get(submission.agentId)?.name ?? null,
      learnerEmail: certificateLearnerById.get(submission.agentId)?.email ?? null,
      status: submission.status,
      notes: submission.notes,
      fileUrls: submission.fileUrls,
      grade: submission.grade === null ? null : Number(submission.grade),
      reviewerId: submission.reviewerId,
      reviewerNote: submission.reviewerNote,
      submittedAt: submission.submittedAt.toISOString(),
      reviewedAt: submission.reviewedAt?.toISOString() ?? null,
      assignmentTitle: assignments.find((assignment) => assignment.id === submission.assignmentId)?.title ?? "Assignment",
    })),
    exams,
    certificates: certificateRows,
    learningPaths,
    announcements,
    badges,
    settings,
    publicLearnerApplications: publicLearnerApplications.map((entry) => ({
      id: entry.id,
      status: entry.status,
      learnerType: entry.learnerType,
      fullName: entry.fullName,
      email: entry.email,
      phone: entry.phone,
      organisation: entry.organisation,
      amount: Number(entry.amount),
      currency: entry.currency,
      proofUrl: entry.proofUrl ?? entry.payment?.proofUrl,
      adminNote: entry.adminNote,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      course: { id: entry.course.id, title: entry.course.title },
      learner: entry.learner,
      payment: entry.payment ? { id: entry.payment.id, status: entry.payment.status, proofStatus: entry.payment.proofStatus, proofUrl: entry.payment.proofUrl } : null,
      productType: "COURSE_ENROLMENT" as const,
    })),
    resourceAccessApplications: resourceAccessApplications.map((entry) => ({
      id: entry.id,
      status: entry.status,
      learnerType: entry.learnerType,
      resourceKind: entry.resourceKind,
      fullName: entry.fullName,
      email: entry.email,
      phone: entry.phone,
      amount: Number(entry.amount),
      currency: entry.currency,
      proofUrl: entry.proofUrl ?? entry.payment?.proofUrl,
      adminNote: entry.adminNote,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      course: entry.course ? { id: entry.course.id, title: entry.course.title } : null,
      learner: entry.learner,
      payment: entry.payment ? { id: entry.payment.id, status: entry.payment.status, proofStatus: entry.payment.proofStatus, proofUrl: entry.payment.proofUrl } : null,
      productType: "RESOURCE_ACCESS" as const,
    })),
    coupons: coupons.map((coupon) => ({
      ...coupon,
      discountValue: Number(coupon.discountValue),
      minPurchaseAmount: coupon.minPurchaseAmount ? Number(coupon.minPurchaseAmount) : null,
      usedCount: coupon._count.usages,
      remainingUses: coupon.maxUses ? coupon.maxUses - coupon._count.usages : null,
      isValid: coupon.active && 
                (!coupon.validUntil || new Date(coupon.validUntil) > new Date()) &&
                (!coupon.maxUses || coupon._count.usages < coupon.maxUses),
    })),
    auditLogs: recentActivity,
    topCourses: courses
      .map((course) => ({
        id: course.id,
        title: course.title,
        completions: courseProgress.filter((entry) => entry.courseId === course.id && entry.status === "COMPLETED").length,
        enrolments: enrolments.filter((entry) => entry.courseId === course.id && entry.status === "ACTIVE").length,
        activeLearners: new Set([
          ...courseProgress.filter((entry) => entry.courseId === course.id && daysAgo(entry.updatedAt) <= 30).map((entry) => entry.agentId),
          ...lessonProgress
            .filter((entry) => courseIdByLessonId.get(entry.lessonId) === course.id && daysAgo(entry.lastViewedAt) <= 30)
            .map((entry) => entry.agentId),
        ]).size,
      }))
      .sort((a, b) => b.completions - a.completions || b.enrolments - a.enrolments || b.activeLearners - a.activeLearners)
      .slice(0, 5),
    mostDifficultCourse: courses
      .map((course) => {
        const scoredProgress = courseProgress
          .filter((entry) => entry.courseId === course.id && Number(entry.averageScore) > 0)
          .map((entry) => Number(entry.averageScore));
        return {
          id: course.id,
          title: course.title,
          average: average(scoredProgress),
          scoredLearners: scoredProgress.length,
        };
      })
      .filter((course) => course.scoredLearners > 0)
      .sort((a, b) => a.average - b.average)[0],
    mostFailedQuiz: failedQuiz,
    trainerInsights,
    learnerProfiles,
    mostActiveAgents: agentCounts([...lessonProgress.map((entry) => entry.agentId), ...courseProgress.map((entry) => entry.agentId)]).slice(0, 5),
    agentsNeedingAttention: courseProgress.filter((entry) => entry.status !== "COMPLETED" && entry.percentComplete < 35).slice(0, 8),
    recentlyCompletedCourses: completedCourses.slice(0, 8),
    recentCertificates: certificateRows.slice(0, 8),
    upcomingExpiringCertificates: certificates
      .filter((certificate) => certificate.expiresAt && certificate.expiresAt.getTime() > Date.now())
      .sort((a, b) => (a.expiresAt?.getTime() ?? 0) - (b.expiresAt?.getTime() ?? 0))
      .slice(0, 8)
      .map((certificate) => certificateRows.find((row) => row.id === certificate.id)!)
      .filter(Boolean),
    overdueAssignments: assignmentSubmissions.filter((submission) => submission.status === AssignmentSubmissionStatus.RESUBMISSION_REQUESTED).length,
    recentActivity,
    discussionThreads: discussionThreads.map((thread: any) => ({
      id: thread.id,
      title: thread.title,
      courseTitle: thread.course?.title ?? "General",
      posts: thread._count?.posts ?? thread.posts?.length ?? 0,
      status: thread.locked ? "LOCKED" : thread.pinned ? "PINNED" : "OPEN",
      updatedAt: thread.updatedAt.toISOString(),
    })),
    academyIntegrity,
    learnerTimeline,
    certificateSimulations,
    announcementDelivery,
    leaderboard: agentBadges.map((entry) => ({
      id: entry.id,
      agentId: entry.agentId,
      learnerName: entry.user?.name ?? certificateLearnerById.get(entry.agentId)?.name ?? null,
      learnerEmail: entry.user?.email ?? certificateLearnerById.get(entry.agentId)?.email ?? null,
      badgeName: entry.badge.name,
      xp: entry.badge.xp,
      awardedAt: entry.awardedAt.toISOString(),
    })),
  };
}

export async function runAcademyAction(body: Record<string, any>, actor: Actor) {
  await ensureAcademyDefaults();
  const prisma = getMainPrisma();
  const action = String(body.action ?? "");
  if (action === "create_course") {
    const course = await prisma.trainingCourse.create({
      data: courseInput(body.course ?? {}, actor.id),
    });
    await audit(actor, "academy.course.create", course.id, { title: course.title });
    await notifyAgents("NEW_COURSE_PUBLISHED", "New Academy course created", `${course.title} is ready in HouseLink Agent Academy.`);
    return course;
  }
  if (action === "update_course") {
    const input = body.course ?? {};
    const courseId = String(body.courseId);
    if (!courseId || courseId === "undefined") throw new Error("Course id is required.");
    
    const before = await prisma.trainingCourse.findUnique({
      where: { id: courseId },
      select: { title: true, subtitle: true, description: true, shortDescription: true, learningOutcomes: true }
    });
    
    try {
      const updateData: Record<string, any> = {};
      if (input.title !== undefined) updateData.title = String(input.title);
      if (input.slug !== undefined) updateData.slug = slugify(String(input.slug));
      if (input.subtitle !== undefined) updateData.subtitle = input.subtitle ? String(input.subtitle) : null;
      if (input.description !== undefined) updateData.description = String(input.description);
      if (input.shortDescription !== undefined) updateData.shortDescription = input.shortDescription ? String(input.shortDescription) : null;
      if (input.categoryId !== undefined) updateData.categoryId = input.categoryId ? String(input.categoryId) : null;
      if (input.tags !== undefined) updateData.tags = arrayOfStrings(input.tags);
      if (input.difficulty !== undefined) updateData.difficulty = enumValue(TrainingDifficulty, input.difficulty, TrainingDifficulty.BEGINNER);
      if (input.durationMinutes !== undefined) updateData.durationMinutes = numberOr(input.durationMinutes, 0);
      if (input.instructor !== undefined) updateData.instructor = input.instructor ? String(input.instructor) : null;
      if (input.coInstructors !== undefined) updateData.coInstructors = arrayOfStrings(input.coInstructors);
      if (input.learningOutcomes !== undefined) updateData.learningOutcomes = Array.isArray(input.learningOutcomes) ? input.learningOutcomes : [];
      if (input.targetAudience !== undefined) updateData.targetAudience = input.targetAudience ? String(input.targetAudience) : null;
      if (input.prerequisites !== undefined) updateData.prerequisites = Array.isArray(input.prerequisites) ? input.prerequisites : [];
      if (input.thumbnailUrl !== undefined) updateData.thumbnailUrl = input.thumbnailUrl ? String(input.thumbnailUrl) : null;
      if (input.bannerUrl !== undefined) updateData.bannerUrl = input.bannerUrl ? String(input.bannerUrl) : null;
      if (input.introVideoUrl !== undefined) updateData.introVideoUrl = input.introVideoUrl ? String(input.introVideoUrl) : null;
      if (input.previewVideoUrl !== undefined) updateData.previewVideoUrl = input.previewVideoUrl ? String(input.previewVideoUrl) : null;
      if (input.welcomeVideoUrl !== undefined) updateData.welcomeVideoUrl = input.welcomeVideoUrl ? String(input.welcomeVideoUrl) : null;
      if (input.seoTitle !== undefined) updateData.seoTitle = input.seoTitle ? String(input.seoTitle) : null;
      if (input.seoDescription !== undefined) updateData.seoDescription = input.seoDescription ? String(input.seoDescription) : null;
      if (input.enrollmentType !== undefined) updateData.enrollmentType = String(input.enrollmentType ?? "OPEN");
      if (input.capacity !== undefined) updateData.capacity = optionalNumber(input.capacity);
      if (input.discountPrice !== undefined) updateData.discountPrice = input.discountPrice == null || input.discountPrice === "" ? null : decimalOr(input.discountPrice, 0);
      if (input.passingPercentage !== undefined) updateData.passingPercentage = clamp(numberOr(input.passingPercentage, 80), 0, 100);
      if (input.estimatedHours !== undefined) updateData.estimatedHours = decimalOr(input.estimatedHours, 0);
      if (input.certificateEnabled !== undefined) updateData.certificateEnabled = Boolean(input.certificateEnabled);
      if (input.expiresAfterDays !== undefined) updateData.expiresAfterDays = optionalNumber(input.expiresAfterDays);
      if (input.price !== undefined) updateData.price = decimalOr(input.price, 0);
      if (input.publicPrice !== undefined) updateData.publicPrice = decimalOr(input.publicPrice, 0);
      if (input.agentPrice !== undefined) updateData.agentPrice = decimalOr(input.agentPrice, 0);
      if (input.toolkitPublicPrice !== undefined) updateData.toolkitPublicPrice = decimalOr(input.toolkitPublicPrice, 15);
      if (input.toolkitAgentPrice !== undefined) updateData.toolkitAgentPrice = decimalOr(input.toolkitAgentPrice, 0);
      if (input.toolkitSalesEnabled !== undefined) updateData.toolkitSalesEnabled = input.toolkitSalesEnabled !== false;
      if (input.currency !== undefined) updateData.currency = String(input.currency ?? "USD");
      if (input.registrationOpen !== undefined) updateData.registrationOpen = Boolean(input.registrationOpen);
      if (input.accessDurationDays !== undefined) updateData.accessDurationDays = numberOr(input.accessDurationDays, 365);
      if (input.language !== undefined) updateData.language = String(input.language ?? "English");
      if (input.status !== undefined) updateData.status = enumValue(TrainingCourseStatus, input.status, TrainingCourseStatus.DRAFT);
      if (input.featured !== undefined) updateData.featured = Boolean(input.featured);
      if (input.visibility !== undefined) updateData.visibility = enumValue(TrainingVisibility, input.visibility, TrainingVisibility.INTERNAL_ONLY);
      if (input.branchIds !== undefined) updateData.branchIds = arrayOfStrings(input.branchIds);
      if (input.roleNames !== undefined) updateData.roleNames = arrayOfStrings(input.roleNames);
      
      const course = await prisma.trainingCourse.update({
        where: { id: courseId },
        data: updateData,
      });
      
      // Track content changes with detailed audit
      const changes: Record<string, { from: string | string[] | null; to: string | string[] | null }> = {};
      if (before) {
        if (input.title !== undefined && input.title !== before.title) changes.title = { from: before.title, to: input.title };
        if (input.subtitle !== undefined && input.subtitle !== before.subtitle) changes.subtitle = { from: before.subtitle, to: input.subtitle };
        if (input.description !== undefined && input.description !== before.description) changes.description = { from: before.description, to: input.description };
        if (input.shortDescription !== undefined && input.shortDescription !== before.shortDescription) changes.shortDescription = { from: before.shortDescription, to: input.shortDescription };
        if (input.learningOutcomes !== undefined && JSON.stringify(input.learningOutcomes) !== JSON.stringify(before.learningOutcomes)) {
          changes.learningOutcomes = { from: before.learningOutcomes, to: input.learningOutcomes };
        }
      }
      
      await audit(actor, "academy.course.update", course.id, { 
        title: course.title,
        changes: Object.keys(changes).length > 0 ? changes : undefined
      });
      return course;
    } catch (error) {
      console.error("Course update error:", error);
      throw error;
    }
  }
  if (action === "update_course_certification_rules") {
    const rules = body.rules ?? {};
    const courseId = String(body.courseId);
    const [course, retakeRules] = await Promise.all([
      prisma.trainingCourse.update({
        where: { id: courseId },
        data: {
          passingPercentage: clamp(numberOr(rules.passingPercentage, 80), 0, 100),
          certificateEnabled: Boolean(rules.certificateEnabled),
          expiresAfterDays: optionalNumber(rules.expiresAfterDays),
          accessDurationDays: Math.max(0, numberOr(rules.accessDurationDays, 365)),
        },
      }),
      saveCourseRetakeRules(courseId, normaliseRetakeRules(rules)),
    ]);
    await audit(actor, "academy.course.certification_rules", course.id, {
      passingPercentage: course.passingPercentage,
      certificateEnabled: course.certificateEnabled,
      expiresAfterDays: course.expiresAfterDays,
      accessDurationDays: course.accessDurationDays,
      retakeRules,
    });
    return { ...course, retakeRules };
  }
  if (action === "duplicate_course") {
    const source = await prisma.trainingCourse.findUnique({
      where: { id: String(body.courseId) },
      include: { modules: { include: { sections: { include: { lessons: true } } } } },
    });
    if (!source) return null;
    const copy = await prisma.trainingCourse.create({
      data: {
        ...courseInput({ ...source, title: `${source.title} Copy`, slug: `${source.slug}-copy-${Date.now()}` }, actor.id),
        status: TrainingCourseStatus.DRAFT,
        modules: {
          create: source.modules.map((module) => ({
            title: module.title,
            description: module.description,
            sortOrder: module.sortOrder,
            sections: {
              create: module.sections.map((section) => ({
                title: section.title,
                description: section.description,
                sortOrder: section.sortOrder,
                lessons: {
                  create: section.lessons.map((lesson) => ({
                    title: lesson.title,
                    summary: lesson.summary,
                    richText: lesson.richText,
                    videoUrl: lesson.videoUrl,
                    embeddedVideoUrl: lesson.embeddedVideoUrl,
                    pdfUrl: lesson.pdfUrl,
                    audioUrl: lesson.audioUrl,
                    mapEmbedUrl: lesson.mapEmbedUrl,
                    estimatedMinutes: lesson.estimatedMinutes,
                    completionRequirement: lesson.completionRequirement,
                    sortOrder: lesson.sortOrder,
                  })),
                },
              })),
            },
          })),
        },
      },
    });
    await audit(actor, "academy.course.duplicate", copy.id, { sourceId: source.id });
    return copy;
  }
  if (action === "delete_course") {
    const course = await prisma.trainingCourse.delete({ where: { id: String(body.courseId) } });
    await audit(actor, "academy.course.delete", course.id, { title: course.title });
    return course;
  }
  if (action === "archive_course" || action === "restore_course") {
    const status = action === "restore_course" ? TrainingCourseStatus.DRAFT : TrainingCourseStatus.ARCHIVED;
    const course = await prisma.trainingCourse.update({ where: { id: String(body.courseId) }, data: { status } });
    await audit(actor, `academy.course.${action.replace("_course", "")}`, course.id, { status });
    return course;
  }
  if (action === "publish_course" || action === "unpublish_course") {
    const status = action === "publish_course" ? TrainingCourseStatus.PUBLISHED : TrainingCourseStatus.DRAFT;
    const course = await prisma.trainingCourse.update({ where: { id: String(body.courseId) }, data: { status } });
    await audit(actor, `academy.course.${action.replace("_course", "")}`, course.id, { status });
    return course;
  }
  if (action === "create_document") {
    const document = await prisma.documentLibrary.create({ data: documentInput(body.document ?? {}, actor.id) });
    await audit(actor, "academy.document.create", document.id, { title: document.title, fileType: document.fileType });
    await notifyAgents("DOCUMENT_UPDATED", "Academy document added", `${document.title} is available in the document library.`);
    return document;
  }
  if (action === "update_document") {
    const document = await prisma.documentLibrary.update({
      where: { id: String(body.documentId) },
      data: documentUpdateInput(body.document ?? {}),
    });
    await audit(actor, "academy.document.update", document.id, { title: document.title });
    return document;
  }
  if (action === "replace_document") {
    const current = await prisma.documentLibrary.findUnique({ where: { id: String(body.documentId) } });
    if (!current) return null;
    const replacement = await prisma.documentLibrary.create({
      data: {
        ...documentInput({ ...current, ...(body.document ?? {}) }, actor.id),
        version: current.version + 1,
      },
    });
    await prisma.documentLibrary.update({ where: { id: current.id }, data: { active: false, replacedById: replacement.id } });
    await audit(actor, "academy.document.replace", replacement.id, { previousId: current.id, version: replacement.version });
    return replacement;
  }
  if (action === "delete_document") {
    const document = await prisma.documentLibrary.update({
      where: { id: String(body.documentId) },
      data: { active: false, visible: false },
    });
    await audit(actor, "academy.document.delete", document.id, { title: document.title });
    return document;
  }
  if (action === "reorder_documents") {
    const ids = arrayOfStrings(body.documentIds);
    await prisma.$transaction(ids.map((id, sortOrder) => prisma.documentLibrary.update({ where: { id }, data: { sortOrder } })));
    await audit(actor, "academy.document.reorder", "document_library", { count: ids.length });
    return { reordered: ids.length };
  }
  if (action === "create_video") {
    const video = await prisma.videoLibrary.create({ data: videoInput(body.video ?? {}) });
    await audit(actor, "academy.video.create", video.id, { title: video.title });
    return video;
  }
  if (action === "update_video") {
    const video = await prisma.videoLibrary.update({ where: { id: String(body.videoId) }, data: videoInput(body.video ?? {}) });
    await audit(actor, "academy.video.update", video.id, { title: video.title });
    return video;
  }
  if (action === "archive_video" || action === "restore_video" || action === "delete_video") {
    const video = await prisma.videoLibrary.update({ where: { id: String(body.videoId) }, data: { active: action !== "archive_video" && action !== "delete_video" } });
    await audit(actor, `academy.video.${action.replace("_video", "")}`, video.id, { active: video.active });
    return video;
  }
  if (action === "create_lesson") {
    const lessonPayload = body.lesson ?? {};
    const sectionId = await resolveLessonSectionId({
      sectionId: lessonPayload.sectionId,
      moduleId: lessonPayload.moduleId,
      courseId: lessonPayload.courseId,
    });
    const lesson = await prisma.trainingLesson.create({
      data: {
        sectionId,
        title: required(lessonPayload.title, "Lesson title"),
        summary: stringOrNull(lessonPayload.summary),
        richText: String(lessonPayload.richText ?? ""),
        estimatedMinutes: numberOr(lessonPayload.estimatedMinutes, 30),
        completionRequirement: String(lessonPayload.completionRequirement ?? "VIEW"),
        sortOrder: numberOr(lessonPayload.sortOrder, 0),
      },
    });
    await syncLessonDepthResources(lesson.id, lessonPayload.lessonDepth);
    await audit(actor, "academy.lesson.create", lesson.id, { title: lesson.title, courseId: lessonPayload.courseId });
    return lesson;
  }
  if (action === "update_lesson") {
    const input = body.lesson ?? {};
    const before = await prisma.trainingLesson.findUnique({
      where: { id: String(body.lessonId) },
      select: { title: true, summary: true, richText: true, objectives: true }
    });
    
    const lesson = await prisma.trainingLesson.update({ where: { id: String(body.lessonId) }, data: lessonInput(input) });
    await syncLessonDepthResources(lesson.id, body.lesson?.lessonDepth);
    
    // Track content changes with detailed audit
    const changes: Record<string, { from: string | string[] | null; to: string | string[] | null }> = {};
    if (before) {
      if (input.title !== undefined && input.title !== before.title) changes.title = { from: before.title, to: input.title };
      if (input.summary !== undefined && input.summary !== before.summary) changes.summary = { from: before.summary, to: input.summary };
      if (input.richText !== undefined && input.richText !== before.richText) changes.richText = { from: before.richText, to: input.richText };
      if (input.objectives !== undefined && JSON.stringify(input.objectives) !== JSON.stringify(before.objectives)) {
        changes.objectives = { from: before.objectives, to: input.objectives };
      }
    }
    
    await audit(actor, "academy.lesson.update", lesson.id, { 
      title: lesson.title,
      changes: Object.keys(changes).length > 0 ? changes : undefined
    });
    return lesson;
  }
  if (action === "delete_lesson") {
    const lesson = await prisma.trainingLesson.delete({ where: { id: String(body.lessonId) } });
    await audit(actor, "academy.lesson.delete", lesson.id, { title: lesson.title });
    return lesson;
  }
  if (action === "add_lesson_video") {
    const video = await prisma.lessonVideo.create({
      data: {
        lessonId: String(body.video?.lessonId),
        title: required(body.video?.title, "Video title"),
        url: required(body.video?.url, "Video URL"),
        provider: String(body.video?.provider ?? "UPLOAD"),
        durationSeconds: numberOr(body.video?.durationSeconds, 0),
        captionsUrl: stringOrNull(body.video?.captionsUrl),
        downloadable: Boolean(body.video?.downloadable),
      },
    });
    await audit(actor, "academy.lesson_video.create", video.id, { title: video.title });
    return video;
  }
  if (action === "update_lesson_video") {
    const video = await prisma.lessonVideo.update({
      where: { id: String(body.videoId) },
      data: {
        title: body.video?.title,
        url: body.video?.url,
        provider: body.video?.provider,
        durationSeconds: body.video?.durationSeconds,
        captionsUrl: body.video?.captionsUrl,
        downloadable: body.video?.downloadable,
      },
    });
    await audit(actor, "academy.lesson_video.update", video.id, { title: video.title });
    return video;
  }
  if (action === "delete_lesson_video") {
    const video = await prisma.lessonVideo.delete({ where: { id: String(body.videoId) } });
    await audit(actor, "academy.lesson_video.delete", video.id, { title: video.title });
    return video;
  }
  if (action === "add_lesson_document") {
    const link = await prisma.lessonDocument.create({
      data: {
        lessonId: String(body.link?.lessonId),
        documentId: required(body.link?.documentId, "Document ID"),
        sortOrder: numberOr(body.link?.sortOrder, 0),
      },
    });
    await audit(actor, "academy.lesson_document.create", link.id, { lessonId: link.lessonId });
    return link;
  }
  if (action === "remove_lesson_document") {
    const link = await prisma.lessonDocument.delete({ where: { id: String(body.linkId) } });
    await audit(actor, "academy.lesson_document.delete", link.id, { lessonId: link.lessonId });
    return link;
  }
  if (action === "add_lesson_resource") {
    const resource = await prisma.lessonResource.create({
      data: {
        lessonId: String(body.resource?.lessonId),
        title: required(body.resource?.title, "Resource title"),
        body: required(body.resource?.body, "Resource content"),
        type: String(body.resource?.type ?? "TEXT"),
        sortOrder: numberOr(body.resource?.sortOrder, 0),
      },
    });
    await audit(actor, "academy.lesson_resource.create", resource.id, { title: resource.title });
    return resource;
  }
  if (action === "update_lesson_resource") {
    const resource = await prisma.lessonResource.update({
      where: { id: String(body.resourceId) },
      data: {
        title: body.resource?.title,
        body: body.resource?.body,
        type: body.resource?.type,
        sortOrder: body.resource?.sortOrder,
      },
    });
    await audit(actor, "academy.lesson_resource.update", resource.id, { title: resource.title });
    return resource;
  }
  if (action === "delete_lesson_resource") {
    const resource = await prisma.lessonResource.delete({ where: { id: String(body.resourceId) } });
    await audit(actor, "academy.lesson_resource.delete", resource.id, { title: resource.title });
    return resource;
  }
  if (action === "add_lesson_download") {
    const download = await prisma.lessonDownload.create({
      data: {
        lessonId: String(body.download?.lessonId),
        title: required(body.download?.title, "Download title"),
        url: required(body.download?.url, "Download URL"),
        type: enumValue(TrainingResourceType, body.download?.type, TrainingResourceType.PDF),
      },
    });
    await audit(actor, "academy.lesson_download.create", download.id, { title: download.title });
    return download;
  }
  if (action === "update_lesson_download") {
    const download = await prisma.lessonDownload.update({
      where: { id: String(body.downloadId) },
      data: {
        title: body.download?.title,
        url: body.download?.url,
        type: body.download?.type ? enumValue(TrainingResourceType, body.download.type, TrainingResourceType.PDF) : undefined,
      },
    });
    await audit(actor, "academy.lesson_download.update", download.id, { title: download.title });
    return download;
  }
  if (action === "delete_lesson_download") {
    const download = await prisma.lessonDownload.delete({ where: { id: String(body.downloadId) } });
    await audit(actor, "academy.lesson_download.delete", download.id, { title: download.title });
    return download;
  }
  if (action === "create_module") {
    const trainingModule = await prisma.trainingModule.create({
      data: {
        courseId: String(body.module?.courseId),
        title: required(body.module?.title, "Module title"),
        description: stringOrNull(body.module?.description),
        sortOrder: numberOr(body.module?.sortOrder, 0),
      }
    });
    await prisma.trainingSection.create({
      data: {
        moduleId: trainingModule.id,
        title: String(body.module?.sectionTitle ?? "Section 1"),
        sortOrder: 0,
      }
    });
    await audit(actor, "academy.module.create", trainingModule.id, { title: trainingModule.title });
    return trainingModule;
  }
  if (action === "create_section") {
    const section = await prisma.trainingSection.create({
      data: {
        moduleId: String(body.section?.moduleId),
        title: required(body.section?.title, "Section title"),
        sortOrder: numberOr(body.section?.sortOrder, 0),
      },
    });
    await audit(actor, "academy.section.create", section.id, { title: section.title });
    return section;
  }
  if (action === "update_section") {
    const section = await prisma.trainingSection.update({
      where: { id: String(body.sectionId) },
      data: {
        title: body.section?.title,
        sortOrder: body.section?.sortOrder,
      },
    });
    await audit(actor, "academy.section.update", section.id, { title: section.title });
    return section;
  }
  if (action === "delete_section") {
    const section = await prisma.trainingSection.delete({ where: { id: String(body.sectionId) } });
    await audit(actor, "academy.section.delete", section.id, { title: section.title });
    return section;
  }
  if (action === "update_module") {
    const input = body.module ?? {};
    const before = await prisma.trainingModule.findUnique({
      where: { id: String(body.moduleId) },
      select: { title: true, description: true }
    });
    
    const trainingModule = await prisma.trainingModule.update({
      where: { id: String(body.moduleId) },
      data: {
        title: input.title,
        description: input.description,
        sortOrder: input.sortOrder,
      }
    });
    
    // Track content changes with detailed audit
    const changes: Record<string, { from: string | null; to: string | null }> = {};
    if (before) {
      if (input.title !== undefined && input.title !== before.title) changes.title = { from: before.title, to: input.title };
      if (input.description !== undefined && input.description !== before.description) changes.description = { from: before.description, to: input.description };
    }
    
    await audit(actor, "academy.module.update", trainingModule.id, { 
      title: trainingModule.title,
      changes: Object.keys(changes).length > 0 ? changes : undefined
    });
    return trainingModule;
  }
  if (action === "delete_module") {
    const trainingModule = await prisma.trainingModule.delete({ where: { id: String(body.moduleId) } });
    await audit(actor, "academy.module.delete", trainingModule.id, { title: trainingModule.title });
    return trainingModule;
  }
  if (action === "reorder_modules") {
    const ids = arrayOfStrings(body.moduleIds);
    await prisma.$transaction(ids.map((id, sortOrder) => prisma.trainingModule.update({ where: { id }, data: { sortOrder } })));
    await audit(actor, "academy.module.reorder", String(body.courseId), { count: ids.length });
    return { reordered: ids.length };
  }
  if (action === "reorder_lessons") {
    const ids = arrayOfStrings(body.lessonIds);
    await prisma.$transaction(ids.map((id, sortOrder) => prisma.trainingLesson.update({ where: { id }, data: { sortOrder } })));
    await audit(actor, "academy.lesson.reorder", String(body.sectionId), { count: ids.length });
    return { reordered: ids.length };
  }
  if (action === "duplicate_module") {
    const source = await prisma.trainingModule.findUnique({
      where: { id: String(body.moduleId) },
      include: { sections: { include: { lessons: { include: { lessonVideos: true, lessonResources: true, lessonDownloads: true } } } } },
    });
    if (!source) return null;
    const copy = await prisma.trainingModule.create({
      data: {
        courseId: source.courseId,
        title: `${source.title} (Copy)`,
        description: source.description,
        objectives: source.objectives,
        estimatedMinutes: source.estimatedMinutes,
        sortOrder: source.sortOrder + 1,
        sections: {
          create: source.sections.map((section) => ({
            title: section.title,
            description: section.description,
            sortOrder: section.sortOrder,
            lessons: {
              create: section.lessons.map((lesson) => ({
                title: lesson.title,
                summary: lesson.summary,
                richText: lesson.richText,
                transcript: lesson.transcript,
                lessonNotes: lesson.lessonNotes,
                objectives: lesson.objectives,
                discussionPrompt: lesson.discussionPrompt,
                checklist: lesson.checklist ?? undefined,
                reflectionQuestions: lesson.reflectionQuestions ?? undefined,
                videoUrl: lesson.videoUrl,
                embeddedVideoUrl: lesson.embeddedVideoUrl,
                pdfUrl: lesson.pdfUrl,
                audioUrl: lesson.audioUrl,
                estimatedMinutes: lesson.estimatedMinutes,
                completionRequirement: lesson.completionRequirement,
                sortOrder: lesson.sortOrder,
                lessonVideos: { create: lesson.lessonVideos.map((v) => ({ title: v.title, url: v.url, provider: v.provider, durationSeconds: v.durationSeconds })) },
                lessonResources: { create: lesson.lessonResources.map((r) => ({ title: r.title, body: r.body, type: r.type, sortOrder: r.sortOrder })) },
                lessonDownloads: { create: lesson.lessonDownloads.map((d) => ({ title: d.title, url: d.url, type: d.type })) },
              })),
            },
          })),
        },
      },
    });
    await audit(actor, "academy.module.duplicate", copy.id, { sourceId: source.id });
    return copy;
  }
  if (action === "duplicate_lesson") {
    const source = await prisma.trainingLesson.findUnique({
      where: { id: String(body.lessonId) },
      include: { lessonVideos: true, lessonResources: true, lessonDownloads: true },
    });
    if (!source) return null;
    const copy = await prisma.trainingLesson.create({
      data: {
        sectionId: source.sectionId,
        title: `${source.title} (Copy)`,
        summary: source.summary,
        richText: source.richText,
        transcript: source.transcript,
        lessonNotes: source.lessonNotes,
        objectives: source.objectives,
        discussionPrompt: source.discussionPrompt,
        checklist: source.checklist ?? undefined,
        reflectionQuestions: source.reflectionQuestions ?? undefined,
        videoUrl: source.videoUrl,
        embeddedVideoUrl: source.embeddedVideoUrl,
        pdfUrl: source.pdfUrl,
        audioUrl: source.audioUrl,
        estimatedMinutes: source.estimatedMinutes,
        completionRequirement: source.completionRequirement,
        sortOrder: source.sortOrder + 1,
        lessonVideos: { create: source.lessonVideos.map((v) => ({ title: v.title, url: v.url, provider: v.provider, durationSeconds: v.durationSeconds })) },
        lessonResources: { create: source.lessonResources.map((r) => ({ title: r.title, body: r.body, type: r.type, sortOrder: r.sortOrder })) },
        lessonDownloads: { create: source.lessonDownloads.map((d) => ({ title: d.title, url: d.url, type: d.type })) },
      },
    });
    await audit(actor, "academy.lesson.duplicate", copy.id, { sourceId: source.id });
    return copy;
  }
  if (action === "create_quiz") {
    const quiz = await prisma.quiz.create({
      data: {
        courseId: stringOrNull(body.quiz?.courseId),
        moduleId: stringOrNull(body.quiz?.moduleId),
        lessonId: stringOrNull(body.quiz?.lessonId),
        title: required(body.quiz?.title, "Quiz title"),
        description: stringOrNull(body.quiz?.description),
        passingPercentage: numberOr(body.quiz?.passingPercentage, 80),
        randomise: Boolean(body.quiz?.randomise),
        timeLimitMinutes: optionalNumber(body.quiz?.timeLimitMinutes),
      },
    });
    await audit(actor, "academy.quiz.create", quiz.id, { title: quiz.title });
    return quiz;
  }
  if (action === "update_quiz") {
    const quiz = await prisma.quiz.update({
      where: { id: String(body.quizId) },
      data: quizInput(body.quiz ?? {}),
    });
    await audit(actor, "academy.quiz.update", quiz.id, { title: quiz.title });
    return quiz;
  }
  if (action === "archive_quiz" || action === "restore_quiz" || action === "delete_quiz") {
    const quiz = await prisma.quiz.update({ where: { id: String(body.quizId) }, data: { active: action === "restore_quiz" } });
    await audit(actor, `academy.quiz.${action.replace("_quiz", "")}`, quiz.id, { active: quiz.active });
    return quiz;
  }
  if (action === "create_question") {
    const answers = Array.isArray(body.question?.answers) ? body.question.answers : [];
    const correctIndex = numberOr(body.question?.correctIndex, 0);
    const question = await prisma.quizQuestion.create({
      data: {
        quizId: stringOrNull(body.question?.quizId),
        type: enumValue(TrainingQuestionType, body.question?.type, TrainingQuestionType.MULTIPLE_CHOICE),
        prompt: required(body.question?.prompt, "Question prompt"),
        points: numberOr(body.question?.points, 1),
        explanation: stringOrNull(body.question?.explanation),
        correctAnswer: { value: String(correctIndex) },
        incorrectFeedback: stringOrNull(body.question?.incorrectFeedback),
        hints: arrayOfStrings(body.question?.hints),
        difficulty: enumValue(TrainingDifficulty, body.question?.difficulty, TrainingDifficulty.BEGINNER),
        mediaUrl: stringOrNull(body.question?.mediaUrl),
        attachments: body.question?.attachments as Prisma.InputJsonValue,
        categories: arrayOfStrings(body.question?.categories),
        tags: arrayOfStrings(body.question?.tags),
        answers: answers.length ? {
          create: answers.map((answer: string, answerIndex: number) => ({
            label: String(answer),
            value: String(answerIndex),
            isCorrect: answerIndex === correctIndex,
            feedback: answerIndex === correctIndex ? "Correct." : "Incorrect.",
            sortOrder: answerIndex,
          })),
        } : undefined,
      },
    });
    await audit(actor, "academy.question.create", question.id, { quizId: question.quizId });
    return question;
  }
  if (action === "create_exam") {
    const exam = await prisma.finalExam.create({
      data: {
        courseId: required(body.exam?.courseId, "Course"),
        title: required(body.exam?.title, "Exam title"),
        durationMinutes: numberOr(body.exam?.durationMinutes, 60),
        passingScore: numberOr(body.exam?.passingScore, 80),
        randomQuestions: body.exam?.randomQuestions !== false,
        questionPools: body.exam?.questionPools as Prisma.InputJsonValue,
        attemptLimit: numberOr(body.exam?.attemptLimit, 2),
        browserLock: Boolean(body.exam?.browserLock),
        autoSubmit: body.exam?.autoSubmit !== false,
        retakeRules: body.exam?.retakeRules as Prisma.InputJsonValue,
        reviewEnabled: body.exam?.reviewEnabled !== false,
        manualGrading: Boolean(body.exam?.manualGrading),
      },
    });
    await audit(actor, "academy.exam.create", exam.id, { title: exam.title });
    return exam;
  }
  if (action === "update_exam") {
    const exam = await prisma.finalExam.update({ where: { id: String(body.examId) }, data: examInput(body.exam ?? {}) });
    await audit(actor, "academy.exam.update", exam.id, { title: exam.title });
    return exam;
  }
  if (action === "archive_exam" || action === "restore_exam" || action === "delete_exam") {
    const exam = await prisma.finalExam.update({ where: { id: String(body.examId) }, data: { active: action === "restore_exam" } });
    await audit(actor, `academy.exam.${action.replace("_exam", "")}`, exam.id, { active: exam.active });
    return exam;
  }
  if (action === "create_assignment") {
    const assignment = await prisma.assignment.create({
      data: {
        courseId: stringOrNull(body.assignment?.courseId),
        moduleId: stringOrNull(body.assignment?.moduleId),
        lessonId: stringOrNull(body.assignment?.lessonId),
        title: required(body.assignment?.title, "Assignment title"),
        description: required(body.assignment?.description, "Assignment description"),
        dueDays: optionalNumber(body.assignment?.dueDays),
        points: numberOr(body.assignment?.points, 100),
      },
    });
    await audit(actor, "academy.assignment.create", assignment.id, { title: assignment.title });
    return assignment;
  }
  if (action === "update_assignment") {
    const assignment = await prisma.assignment.update({ where: { id: String(body.assignmentId) }, data: assignmentInput(body.assignment ?? {}) });
    await audit(actor, "academy.assignment.update", assignment.id, { title: assignment.title });
    return assignment;
  }
  if (action === "archive_assignment" || action === "restore_assignment" || action === "delete_assignment") {
    const assignment = await prisma.assignment.update({ where: { id: String(body.assignmentId) }, data: { active: action === "restore_assignment" } });
    await audit(actor, `academy.assignment.${action.replace("_assignment", "")}`, assignment.id, { active: assignment.active });
    return assignment;
  }
  if (action === "review_assignment_submission") {
    const status = enumValue(AssignmentSubmissionStatus, body.review?.status, AssignmentSubmissionStatus.GRADED);
    const submission = await prisma.assignmentSubmission.update({
      where: { id: String(body.submissionId) },
      data: {
        status,
        grade: optionalNumber(body.review?.grade),
        reviewerId: actor.id,
        reviewerNote: stringOrNull(body.review?.reviewerNote),
        reviewedAt: new Date(),
      },
    });
    const assignment = await prisma.assignment.findUnique({
      where: { id: submission.assignmentId },
      include: {
        lesson: { select: { section: { select: { module: { select: { courseId: true } } } } } },
        module: { select: { courseId: true } },
      },
    });
    const courseId = assignment?.courseId ?? assignment?.module?.courseId ?? assignment?.lesson?.section.module.courseId ?? null;
    if (courseId && (status === AssignmentSubmissionStatus.APPROVED || status === AssignmentSubmissionStatus.GRADED)) {
      await tryCompleteCourseCertification(submission.agentId, courseId);
    }
    await audit(actor, "academy.assignment_submission.review", submission.id, {
      assignmentId: submission.assignmentId,
      status,
      grade: submission.grade,
    });
    await prisma.trainingNotification.create({
      data: {
        userId: submission.agentId,
        eventType: "ASSIGNMENT_REVIEWED",
        channel: "IN_APP",
        subject: "Assignment reviewed",
        body: `Your assignment submission was marked ${status.replace(/_/g, " ").toLowerCase()}.`,
      },
    });
    return submission;
  }
  if (action === "update_certificate_status") {
    const rawStatus = String(body.status ?? "ACTIVE").toUpperCase();
    const reason = stringOrNull(body.reason);
    const status = rawStatus === "ACTIVE" ? "ACTIVE" : reason ? `${rawStatus}: ${reason}` : rawStatus;
    const certificate = await prisma.certificateIssue.update({
      where: { id: String(body.certificateId) },
      data: {
        status,
        revokedAt: rawStatus === "ACTIVE" ? null : new Date(),
      },
    });
    await audit(actor, "academy.certificate.status", certificate.id, { status });
    return certificate;
  }
  if (action === "create_learning_path") {
    const input = learningPathPayload(body);
    const path = await prisma.learningPath.create({
      data: {
        title: required(input.title ?? input.name, "Path title"),
        description: stringOrNull(input.description),
        status: String(input.status ?? "DRAFT"),
        badgeTitle: stringOrNull(input.badgeTitle ?? input.badgeName),
        courses: {
          create: arrayOfStrings(input.courseIds).map((courseId, index) => ({ courseId, sortOrder: index, required: true })),
        },
      },
    });
    await audit(actor, "academy.path.create", path.id, { title: path.title });
    return path;
  }
  if (action === "update_learning_path") {
    const pathId = String(body.pathId);
    const input = learningPathPayload(body);
    const courseIds = arrayOfStrings(input.courseIds);
    
    const before = await prisma.learningPath.findUnique({
      where: { id: pathId },
      select: { title: true, description: true, status: true, badgeTitle: true }
    });
    
    if (!before) {
      throw new Error(`Learning path not found: ${pathId}`);
    }
    
    try {
      const updateData: Record<string, any> = {};
      if (input.title !== undefined || input.name !== undefined) updateData.title = required(input.title ?? input.name, "Path title");
      if (input.description !== undefined) updateData.description = stringOrNull(input.description);
      if (input.status !== undefined) updateData.status = String(input.status);
      if (input.badgeTitle !== undefined || input.badgeName !== undefined) updateData.badgeTitle = stringOrNull(input.badgeTitle ?? input.badgeName);
      
      const path = await prisma.$transaction(async (tx) => {
        const updated = await tx.learningPath.update({
          where: { id: pathId },
          data: updateData,
        });
        if (courseIds.length) {
          await tx.pathCourse.deleteMany({ where: { pathId } });
          await tx.pathCourse.createMany({
            data: courseIds.map((cId, index) => ({ pathId, courseId: cId, sortOrder: index, required: true })),
            skipDuplicates: true,
          });
        }
        return updated;
      });
      await audit(actor, "academy.path.update", path.id, { title: path.title });
      return path;
    } catch (error) {
      console.error("Learning path update error:", error);
      throw error;
    }
  }
  if (action === "delete_learning_path") {
    const path = await prisma.learningPath.delete({ where: { id: String(body.pathId) } });
    await audit(actor, "academy.path.delete", path.id, { title: path.title });
    return path;
  }
  if (action === "archive_learning_path" || action === "restore_learning_path") {
    const path = await prisma.learningPath.update({ where: { id: String(body.pathId) }, data: { status: action === "restore_learning_path" ? "PUBLISHED" : "ARCHIVED" } });
    await audit(actor, `academy.path.${action.replace("_learning_path", "")}`, path.id, { status: path.status });
    return path;
  }
  if (action === "create_announcement") {
    const announcement = await prisma.announcement.create({ data: announcementInput(body.announcement ?? {}) });
    await audit(actor, "academy.announcement.create", announcement.id, { title: announcement.title });
    await notifyAgents("ACADEMY_ANNOUNCEMENT", announcement.title, announcement.body);
    return announcement;
  }
  if (action === "update_announcement") {
    const announcement = await prisma.announcement.update({ where: { id: String(body.announcementId) }, data: announcementInput(body.announcement ?? {}) });
    await audit(actor, "academy.announcement.update", announcement.id, { title: announcement.title });
    return announcement;
  }
  if (action === "delete_announcement") {
    const announcement = await prisma.announcement.delete({ where: { id: String(body.announcementId) } });
    await audit(actor, "academy.announcement.delete", announcement.id, { title: announcement.title });
    return announcement;
  }
  if (action === "archive_announcement" || action === "restore_announcement") {
    const announcement = await prisma.announcement.update({
      where: { id: String(body.announcementId) },
      data: { expiresAt: action === "restore_announcement" ? null : new Date(), publishedAt: action === "restore_announcement" ? new Date() : undefined },
    });
    await audit(actor, `academy.announcement.${action.replace("_announcement", "")}`, announcement.id, { title: announcement.title });
    return announcement;
  }
  if (action === "create_badge") {
    const badge = await prisma.badge.create({ data: badgeInput(badgePayload(body)) });
    await audit(actor, "academy.badge.create", badge.id, { name: badge.name });
    return badge;
  }
  if (action === "update_badge") {
    const input = badgePayload(body);
    const badgeId = String(body.badgeId);
    
    const before = await prisma.badge.findUnique({
      where: { id: badgeId },
      select: { name: true, description: true, xp: true, active: true }
    });
    if (!before) throw new Error(`Badge not found: ${badgeId}`);
    
    try {
      const updateData: Record<string, any> = {};
      if (input.name !== undefined || input.title !== undefined) updateData.name = required(input.name ?? input.title, "Badge name");
      if (input.description !== undefined || input.detail !== undefined) updateData.description = stringOrNull(input.description ?? input.detail);
      if (input.iconUrl !== undefined || input.icon !== undefined) updateData.iconUrl = stringOrNull(input.iconUrl ?? input.icon);
      if (input.xp !== undefined) updateData.xp = Number(input.xp) || 0;
      if (input.active !== undefined) updateData.active = Boolean(input.active);
      
      const badge = await prisma.badge.update({ where: { id: badgeId }, data: updateData });
      await audit(actor, "academy.badge.update", badge.id, { name: badge.name });
      return badge;
    } catch (error) {
      console.error("Badge update error:", error);
      throw error;
    }
  }
  if (action === "delete_badge") {
    const badge = await prisma.badge.delete({ where: { id: String(body.badgeId) } });
    await audit(actor, "academy.badge.delete", badge.id, { name: badge.name });
    return badge;
  }
  if (action === "archive_badge" || action === "restore_badge") {
    const badge = await prisma.badge.update({ where: { id: String(body.badgeId) }, data: { active: action === "restore_badge" } });
    await audit(actor, `academy.badge.${action.replace("_badge", "")}`, badge.id, { active: badge.active });
    return badge;
  }
  if (action === "get_course_audit_log") {
    const logs = await prisma.trainingAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 120 });
    const courseId = String(body.courseId ?? "");
    return logs
      .filter((log) => JSON.stringify(log.metadata).includes(courseId) || log.target === courseId || log.action.includes("course"))
      .slice(0, 30)
      .map((log) => ({ id: log.id, action: log.action, createdAt: log.createdAt.toISOString() }));
  }
  if (action === "lock_thread" || action === "unlock_thread") {
    const thread = await prisma.discussionThread.update({
      where: { id: String(body.threadId) },
      data: { locked: action === "lock_thread" },
    });
    await audit(actor, `academy.thread.${action.replace("_thread", "")}`, thread.id, { locked: thread.locked });
    return thread;
  }
  if (action === "pin_thread" || action === "unpin_thread") {
    const thread = await prisma.discussionThread.update({
      where: { id: String(body.threadId) },
      data: { pinned: action === "pin_thread" },
    });
    await audit(actor, `academy.thread.${action.replace("_thread", "")}`, thread.id, { pinned: thread.pinned });
    return thread;
  }
  if (action === "delete_thread") {
    const thread = await prisma.discussionThread.delete({ where: { id: String(body.threadId) } });
    await audit(actor, "academy.thread.delete", thread.id, { title: thread.title });
    return thread;
  }
  if (action === "update_settings") {
    const settings = await prisma.trainingSetting.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", payload: (body.settings ?? {}) as Prisma.InputJsonObject },
      update: { payload: (body.settings ?? {}) as Prisma.InputJsonObject },
    });
    await audit(actor, "academy.settings.update", settings.id, {});
    return settings;
  }
  if (action === "send_test_email_template") {
    const to = required(body.to, "Recipient email");
    const subject = required(body.subject, "Email subject");
    const htmlContent = required(body.htmlContent, "Email HTML content");
    const platformSettings = await getHydratedRuntimePlatformSettings();
    const result = await sendSmtpPlainEmail(platformSettings.integrations, to, `[Test] ${subject}`, htmlContent);
    await audit(actor, "academy.email_template.test", String(body.templateKey ?? "custom"), { to, ok: result.ok, message: result.message });
    if (!result.ok) throw new Error(result.message);
    return { sent: true, message: result.message };
  }
  if (action === "grant_extra_quiz_attempt") {
    const learnerId = required(body.learnerId, "Learner");
    const quizId = required(body.quizId, "Quiz");
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, select: { id: true, title: true, courseId: true } });
    if (!quiz) throw new Error("Quiz not found.");

    await prisma.quizAttempt.create({
      data: {
        quizId,
        agentId: learnerId,
        status: TrainingAttemptStatus.IN_PROGRESS,
        score: 0,
        answers: {
          _adminOverride: {
            actorId: actor.id,
            actorName: actor.name,
            reason: "Extra attempt granted by Academy Admin",
            createdAt: new Date().toISOString(),
          },
        } as Prisma.InputJsonObject,
      },
    });
    await prisma.trainingNotification.create({
      data: {
        userId: learnerId,
        eventType: "QUIZ_EXTRA_ATTEMPT_GRANTED",
        channel: "IN_APP",
        subject: "Extra quiz attempt granted",
        body: `Academy Admin granted you another attempt for ${quiz.title}. Open the quiz when you are ready to retake it.`,
      },
    });
    await audit(actor, "academy.override.quiz_extra_attempt", quizId, { learnerId, courseId: quiz.courseId ?? null, quizTitle: quiz.title });
    return { granted: true };
  }
  if (action === "mark_lesson_gate_satisfied") {
    const learnerId = required(body.learnerId, "Learner");
    const lessonId = required(body.lessonId, "Lesson");
    const result = await markLessonCompleteForAdmin(learnerId, lessonId);
    await prisma.trainingNotification.create({
      data: {
        userId: learnerId,
        eventType: "LESSON_GATE_APPROVED",
        channel: "IN_APP",
        subject: "Lesson gate marked complete",
        body: `Academy Admin marked ${result.lessonTitle} complete. Your course progress has been recalculated.`,
      },
    });
    await audit(actor, "academy.override.lesson_gate_satisfied", lessonId, { learnerId, courseId: result.courseId, lessonTitle: result.lessonTitle });
    return result;
  }
  if (action === "approve_assignment_gate") {
    const learnerId = required(body.learnerId, "Learner");
    const assignmentId = required(body.assignmentId, "Assignment");
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        lesson: { select: { section: { select: { module: { select: { courseId: true } } } } } },
        module: { select: { courseId: true } },
      },
    });
    if (!assignment) throw new Error("Assignment not found.");
    const courseId = assignment.courseId ?? assignment.module?.courseId ?? assignment.lesson?.section.module.courseId ?? null;
    await prisma.assignmentSubmission.create({
      data: {
        assignmentId,
        agentId: learnerId,
        status: AssignmentSubmissionStatus.APPROVED,
        notes: "Gate approved by Academy Admin.",
        grade: assignment.points,
        reviewerId: actor.id,
        reviewerNote: "Admin override: assignment gate satisfied.",
        reviewedAt: new Date(),
      },
    });
    if (courseId) await recalculateCourseProgress(courseId, learnerId);
    await prisma.trainingNotification.create({
      data: {
        userId: learnerId,
        eventType: "ASSIGNMENT_GATE_APPROVED",
        channel: "IN_APP",
        subject: "Assignment gate approved",
        body: `Academy Admin approved ${assignment.title}. The next eligible lesson or module is now unlocked.`,
      },
    });
    await audit(actor, "academy.override.assignment_gate_satisfied", assignmentId, { learnerId, courseId, assignmentTitle: assignment.title });
    return { approved: true, courseId };
  }
  if (action === "unlock_module_for_learner") {
    const learnerId = required(body.learnerId, "Learner");
    const courseId = required(body.courseId, "Course");
    const moduleId = required(body.moduleId, "Module");
    const result = await unlockModuleForLearner(courseId, moduleId, learnerId, actor);
    await prisma.trainingNotification.create({
      data: {
        userId: learnerId,
        eventType: "MODULE_UNLOCKED_BY_ADMIN",
        channel: "IN_APP",
        subject: "Module unlocked",
        body: `${result.moduleTitle} has been unlocked by Academy Admin. Your course progress has been repaired so you can continue.`,
      },
    });
    await audit(actor, "academy.override.module_unlocked", moduleId, { learnerId, courseId, ...result });
    return result;
  }
  if (action === "repair_course_progress") {
    const courseId = required(body.courseId, "Course");
    const learnerId = typeof body.learnerId === "string" && body.learnerId.trim() ? body.learnerId.trim() : null;
    const result = learnerId
      ? await recalculateCourseProgress(courseId, learnerId)
      : await repairCourseProgressForAllLearners(courseId);
    await audit(actor, "academy.progress.repair", courseId, { learnerId, result: result as Prisma.InputJsonValue });
    return result;
  }
  if (action === "review_public_learner") {
    return reviewPublicLearnerApplication({
      applicationId: String(body.applicationId),
      actorId: actor.id,
      status: body.status === "REJECTED" ? "REJECTED" : body.status === "REFUNDED" ? "REFUNDED" : body.status === "EXPIRED" ? "EXPIRED" : "APPROVED",
      adminNote: typeof body.adminNote === "string" ? body.adminNote : undefined,
    });
  }
  if (action === "review_resource_access") {
    return reviewResourceAccessApplication({
      accessId: String(body.accessId),
      actorId: actor.id,
      status: body.status === "REJECTED" ? "REJECTED" : body.status === "REFUNDED" ? "REFUNDED" : body.status === "EXPIRED" ? "EXPIRED" : "APPROVED",
      adminNote: typeof body.adminNote === "string" ? body.adminNote : undefined,
    });
  }
  if (action === "delete_coupon") {
    const coupon = await prisma.academyCoupon.findUnique({
      where: { id: String(body.couponId) },
      include: { _count: { select: { usages: true } } },
    });
    if (!coupon) return null;
    if (coupon._count.usages > 0) {
      throw new Error("Cannot delete coupon with existing usages. Reset usage first.");
    }
    await prisma.academyCoupon.delete({ where: { id: coupon.id } });
    await prisma.trainingAuditLog.create({
      data: {
        actorId: actor.id,
        action: "academy.coupon.delete",
        target: coupon.id,
        metadata: { code: coupon.code } as Prisma.InputJsonObject,
      },
    });
    return { deleted: true };
  }
  if (action === "reset_coupon_usage") {
    const coupon = await prisma.academyCoupon.findUnique({
      where: { id: String(body.couponId) },
    });
    if (!coupon) return null;
    await prisma.academyCouponUsage.deleteMany({ where: { couponId: coupon.id } });
    await prisma.trainingAuditLog.create({
      data: {
        actorId: actor.id,
        action: "academy.coupon.reset_usage",
        target: coupon.id,
        metadata: { code: coupon.code } as Prisma.InputJsonObject,
      },
    });
    return { reset: true };
  }
  if (action === "delete_public_learner") {
    const application = await prisma.academyLearnerApplication.findUnique({
      where: { id: String(body.applicationId) },
      include: {
        course: {
          select: {
            title: true,
            modules: {
              select: {
                sections: {
                  select: {
                    lessons: { select: { id: true } },
                  },
                },
              },
            },
          },
        },
        payment: true,
      },
    });
    if (!application) return null;
    const lessonIds = application.course.modules.flatMap((module) =>
      module.sections.flatMap((section) => section.lessons.map((lesson) => lesson.id)),
    );
    
    // Delete coupon usage if payment exists
    if (application.paymentId) {
      await prisma.academyCouponUsage.deleteMany({
        where: { paymentId: application.paymentId },
      });
    }
    
    await prisma.$transaction([
      prisma.academyLearnerApplication.update({ where: { id: application.id }, data: { paymentId: null } }),
      prisma.courseEnrolment.deleteMany({ where: { courseId: application.courseId, agentId: application.learnerId } }),
      prisma.courseProgress.deleteMany({ where: { courseId: application.courseId, agentId: application.learnerId } }),
      ...(lessonIds.length
        ? [prisma.lessonProgress.deleteMany({ where: { agentId: application.learnerId, lessonId: { in: lessonIds } } })]
        : []),
      prisma.academyLearnerApplication.delete({ where: { id: application.id } }),
      prisma.trainingAuditLog.create({
        data: {
          actorId: actor.id,
          action: "academy.public_learner.delete",
          target: application.id,
          metadata: {
            courseId: application.courseId,
            courseTitle: application.course.title,
            learnerId: application.learnerId,
            status: application.status,
          } as Prisma.InputJsonObject,
        },
      }),
    ]);
    return { id: application.id, deleted: true };
  }
  if (action === "delete_resource_access") {
    const access = await prisma.academyResourceAccess.findUnique({
      where: { id: String(body.accessId) },
      include: { course: { select: { title: true } } },
    });
    if (!access) return null;
    await prisma.$transaction([
      prisma.academyResourceAccess.update({ where: { id: access.id }, data: { paymentId: null } }),
      prisma.academyResourceAccess.delete({ where: { id: access.id } }),
      prisma.trainingAuditLog.create({
        data: {
          actorId: actor.id,
          action: "academy.resource_access.delete",
          target: access.id,
          metadata: {
            resourceKind: access.resourceKind,
            resourceKey: access.resourceKey,
            courseId: access.courseId,
            courseTitle: access.course?.title,
            learnerId: access.learnerId,
            status: access.status,
          } as Prisma.InputJsonObject,
        },
      }),
    ]);
    return { id: access.id, deleted: true };
  }
  return null;
}

export async function getAdminCourseTree(courseId: string) {
  const course = await fetchCourseTree(courseId);
  if (!course) return null;
  const prisma = getMainPrisma();
  const [retakeRules, enrolments, progressRows] = await Promise.all([
    getCourseRetakeRules(courseId),
    prisma.courseEnrolment.findMany({ where: { courseId }, orderBy: { enrolledAt: "desc" } }),
    prisma.courseProgress.findMany({ where: { courseId } }),
  ]);
  const users = enrolments.length
    ? await prisma.user.findMany({ where: { id: { in: enrolments.map((entry) => entry.agentId) } }, select: { id: true, name: true, email: true } })
    : [];
  const userById = new Map(users.map((user) => [user.id, user]));
  const progressByLearner = new Map(progressRows.map((progress) => [progress.agentId, progress]));
  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    description: course.description,
    subtitle: course.subtitle,
    shortDescription: course.shortDescription,
    status: course.status,
    visibility: course.visibility,
    instructor: course.instructor,
    difficulty: course.difficulty,
    passingPercentage: course.passingPercentage,
    certificateEnabled: course.certificateEnabled,
    expiresAfterDays: course.expiresAfterDays,
    registrationOpen: course.registrationOpen,
    publicPrice: Number(course.publicPrice),
    agentPrice: Number(course.agentPrice),
    toolkitPublicPrice: Number(course.toolkitPublicPrice),
    toolkitAgentPrice: Number(course.toolkitAgentPrice),
    toolkitSalesEnabled: course.toolkitSalesEnabled,
    currency: course.currency,
    accessDurationDays: course.accessDurationDays,
    retakeRules,
    featured: course.featured,
    category: course.category,
    learningOutcomes: course.learningOutcomes,
    targetAudience: course.targetAudience,
    prerequisites: course.prerequisites,
    thumbnailUrl: course.thumbnailUrl,
    bannerUrl: course.bannerUrl,
    introVideoUrl: course.introVideoUrl,
    seoTitle: course.seoTitle,
    seoDescription: course.seoDescription,
    modules: course.modules.map((module) => ({
      id: module.id,
      title: module.title,
      description: module.description,
      objectives: module.objectives,
      estimatedMinutes: module.estimatedMinutes,
      sortOrder: module.sortOrder,
      sections: module.sections.map((section) => ({
        id: section.id,
        title: section.title,
        sortOrder: section.sortOrder,
        lessons: section.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          summary: lesson.summary,
          richText: lesson.richText,
          transcript: lesson.transcript,
          lessonNotes: lesson.lessonNotes,
          objectives: lesson.objectives,
          discussionPrompt: lesson.discussionPrompt,
          estimatedMinutes: lesson.estimatedMinutes,
          completionRequirement: lesson.completionRequirement,
          sortOrder: lesson.sortOrder,
          videoUrl: lesson.videoUrl,
          pdfUrl: lesson.pdfUrl,
          lessonVideos: lesson.lessonVideos,
          lessonDocuments: lesson.lessonDocuments.map((d) => ({ id: d.id, documentId: d.documentId, title: d.document.title })),
          lessonResources: lesson.lessonResources,
          lessonDownloads: lesson.lessonDownloads,
        })),
      })),
    })),
    quizzes: course.quizzes.map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      passingPercentage: quiz.passingPercentage,
      moduleId: quiz.moduleId,
      lessonId: quiz.lessonId,
      questionCount: quiz.questions.length,
    })),
    assignments: course.assignments.map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      points: assignment.points,
      moduleId: assignment.moduleId,
      lessonId: assignment.lessonId,
    })),
    exams: course.finalExams,
    learners: enrolments.map((enrolment) => {
      const user = userById.get(enrolment.agentId);
      const progress = progressByLearner.get(enrolment.agentId);
      return {
        id: enrolment.agentId,
        name: user?.name ?? user?.email ?? enrolment.agentId,
        email: user?.email ?? "",
        progress: progress?.percentComplete ?? 0,
        status: progress?.status ?? enrolment.status,
      };
    }),
    stats: {
      moduleCount: course.modules.length,
      lessonCount: course.modules.reduce((sum, m) => sum + m.sections.reduce((s, sec) => s + sec.lessons.length, 0), 0),
      quizCount: course.quizzes.length,
      assignmentCount: course.assignments.length,
      examCount: course.finalExams.length,
    },
  };
}

export async function ensureAcademyDefaults() {
  const prisma = getMainPrisma();
  await prisma.$transaction([
    ...DEFAULT_TRAINING_CATEGORIES.map((name, sortOrder) =>
      prisma.trainingCategory.upsert({
        where: { slug: slugify(name) },
        create: { name, slug: slugify(name), sortOrder },
        update: { name, sortOrder, active: true },
      }),
    ),
    ...DEFAULT_DOCUMENT_CATEGORIES.map((name, sortOrder) =>
      prisma.documentCategory.upsert({
        where: { slug: slugify(name) },
        create: { name, slug: slugify(name), sortOrder },
        update: { name, sortOrder },
      }),
    ),
    prisma.trainingSetting.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        payload: {
          academyName: "HouseLink Agent Academy",
          certificatePrefix: "HLA",
          primaryColour: "#008b68",
          accentColour: "#c6a15b",
          paymentInstructions: "Pay via bank transfer, ZIPIT, or cash deposit. Upload your proof of payment from your learner dashboard for admin approval.",
          accessDurationDays: 365,
          notifications: ["EMAIL", "IN_APP", "PUSH"],
          supportedFormats: ["PDF", "DOCX", "XLSX", "PPTX", "IMAGE", "VIDEO", "AUDIO", "ZIP"],
          quizSettings: { defaultPassMark: 80, maxAttempts: 3, showResults: true, randomiseByDefault: false },
          enrolmentSettings: { allowTrainingOnly: true, allowAgentTraining: true, requirePaymentProof: true },
          completionRules: { requireAllLessons: true, requireFinalExam: false, autoIssueCertificate: true },
          branding: { logoUrl: "/brand/houselink-full-lockup.png", dashboardWelcome: "Continue your professional training journey." },
        },
      },
      update: {},
    }),
  ]);
}

function courseInput(input: Record<string, any>, actorId: string, update = false): Prisma.TrainingCourseUncheckedCreateInput & Prisma.TrainingCourseUncheckedUpdateInput {
  return {
    title: required(input.title, "Course title"),
    subtitle: stringOrNull(input.subtitle),
    slug: input.slug ? slugify(input.slug) : slugify(input.title),
    thumbnailUrl: stringOrNull(input.thumbnailUrl),
    bannerUrl: stringOrNull(input.bannerUrl),
    description: String(input.description ?? ""),
    shortDescription: stringOrNull(input.shortDescription),
    categoryId: stringOrNull(input.categoryId),
    tags: arrayOfStrings(input.tags),
    difficulty: enumValue(TrainingDifficulty, input.difficulty, TrainingDifficulty.BEGINNER),
    durationMinutes: numberOr(input.durationMinutes, 0),
    instructor: stringOrNull(input.instructor),
    coInstructors: arrayOfStrings(input.coInstructors),
    learningOutcomes: arrayOfStrings(input.learningOutcomes),
    targetAudience: stringOrNull(input.targetAudience),
    introVideoUrl: stringOrNull(input.introVideoUrl),
    previewVideoUrl: stringOrNull(input.previewVideoUrl),
    welcomeVideoUrl: stringOrNull(input.welcomeVideoUrl),
    seoTitle: stringOrNull(input.seoTitle),
    seoDescription: stringOrNull(input.seoDescription),
    enrollmentType: String(input.enrollmentType ?? "OPEN"),
    capacity: optionalNumber(input.capacity),
    discountPrice: input.discountPrice != null ? decimalOr(input.discountPrice, 0) : undefined,
    prerequisites: arrayOfStrings(input.prerequisites),
    passingPercentage: numberOr(input.passingPercentage, 80),
    estimatedHours: decimalOr(input.estimatedHours, 0),
    certificateEnabled: Boolean(input.certificateEnabled),
    expiresAfterDays: optionalNumber(input.expiresAfterDays),
    price: decimalOr(input.price, 0),
    publicPrice: decimalOr(input.publicPrice ?? input.price, 0),
    agentPrice: decimalOr(input.agentPrice, 0),
    toolkitPublicPrice: decimalOr(input.toolkitPublicPrice, 15),
    toolkitAgentPrice: decimalOr(input.toolkitAgentPrice, 0),
    toolkitSalesEnabled: input.toolkitSalesEnabled !== false,
    currency: String(input.currency ?? "USD"),
    registrationOpen: Boolean(input.registrationOpen),
    accessDurationDays: numberOr(input.accessDurationDays, 365),
    version: update ? undefined : numberOr(input.version, 1),
    language: String(input.language ?? "English"),
    status: enumValue(TrainingCourseStatus, input.status, TrainingCourseStatus.DRAFT),
    featured: Boolean(input.featured),
    visibility: enumValue(TrainingVisibility, input.visibility, TrainingVisibility.INTERNAL_ONLY),
    branchIds: arrayOfStrings(input.branchIds),
    roleNames: arrayOfStrings(input.roleNames),
    createdById: update ? undefined : actorId,
  };
}

function documentInput(input: Record<string, any>, actorId: string): Prisma.DocumentLibraryUncheckedCreateInput {
  return {
    categoryId: stringOrNull(input.categoryId),
    title: required(input.title, "Document title"),
    description: stringOrNull(input.description),
    fileUrl: required(input.fileUrl ?? input.url, "File URL"),
    fileName: String(input.fileName ?? input.title ?? "academy-document"),
    fileType: enumValue(TrainingResourceType, input.fileType ?? detectFileType(input.fileName ?? input.fileUrl), TrainingResourceType.PDF),
    fileSizeBytes: numberOr(input.fileSizeBytes, 0),
    version: numberOr(input.version, 1),
    tags: arrayOfStrings(input.tags),
    permissions: arrayOfStrings(input.permissions).length ? arrayOfStrings(input.permissions) : ["ADMIN", "AGENT"],
    searchableText: String(input.searchableText ?? `${input.title ?? ""} ${input.description ?? ""}`),
    downloadable: input.downloadable !== false,
    previewable: input.previewable !== false,
    visible: input.visible !== false,
    sortOrder: numberOr(input.sortOrder, 0),
    downloadCount: numberOr(input.downloadCount, 0),
    createdById: actorId,
  };
}

function documentUpdateInput(input: Record<string, any>): Prisma.DocumentLibraryUncheckedUpdateInput {
  return {
    ...(typeof input.categoryId === "string" ? { categoryId: input.categoryId || null } : {}),
    ...(typeof input.title === "string" ? { title: required(input.title, "Document title") } : {}),
    ...(typeof input.description === "string" ? { description: stringOrNull(input.description) } : {}),
    ...(typeof input.fileUrl === "string" ? { fileUrl: required(input.fileUrl, "File URL") } : {}),
    ...(typeof input.fileName === "string" ? { fileName: input.fileName } : {}),
    ...(input.fileType ? { fileType: enumValue(TrainingResourceType, input.fileType, TrainingResourceType.PDF) } : {}),
    ...(input.fileSizeBytes !== undefined ? { fileSizeBytes: numberOr(input.fileSizeBytes, 0) } : {}),
    ...(input.tags !== undefined ? { tags: arrayOfStrings(input.tags) } : {}),
    ...(input.permissions !== undefined ? { permissions: arrayOfStrings(input.permissions) } : {}),
    ...(typeof input.searchableText === "string" ? { searchableText: input.searchableText } : {}),
    ...(typeof input.downloadable === "boolean" ? { downloadable: input.downloadable } : {}),
    ...(typeof input.previewable === "boolean" ? { previewable: input.previewable } : {}),
    ...(typeof input.visible === "boolean" ? { visible: input.visible } : {}),
    ...(input.sortOrder !== undefined ? { sortOrder: numberOr(input.sortOrder, 0) } : {}),
    active: input.active === undefined ? undefined : Boolean(input.active),
  };
}

function videoInput(input: Record<string, any>): Prisma.VideoLibraryCreateInput {
  return {
    title: required(input.title, "Video title"),
    description: stringOrNull(input.description),
    category: String(input.category ?? "Training"),
    videoUrl: required(input.videoUrl ?? input.url, "Video URL"),
    thumbnailUrl: stringOrNull(input.thumbnailUrl),
    durationSeconds: numberOr(input.durationSeconds, 0),
    captionsUrl: stringOrNull(input.captionsUrl),
    downloadable: Boolean(input.downloadable),
    tags: arrayOfStrings(input.tags),
  };
}

function quizInput(input: Record<string, any>): Prisma.QuizUncheckedUpdateInput {
  return {
    courseId: stringOrNull(input.courseId),
    moduleId: stringOrNull(input.moduleId),
    lessonId: stringOrNull(input.lessonId),
    title: required(input.title, "Quiz title"),
    description: stringOrNull(input.description),
    passingPercentage: numberOr(input.passingPercentage, 80),
    randomise: Boolean(input.randomise),
    timeLimitMinutes: optionalNumber(input.timeLimitMinutes),
    active: input.active === undefined ? undefined : Boolean(input.active),
  };
}

function examInput(input: Record<string, any>): Prisma.FinalExamUncheckedUpdateInput {
  return {
    courseId: input.courseId ? String(input.courseId) : undefined,
    title: required(input.title, "Exam title"),
    durationMinutes: numberOr(input.durationMinutes, 60),
    passingScore: numberOr(input.passingScore, 80),
    randomQuestions: input.randomQuestions !== false,
    questionPools: input.questionPools as Prisma.InputJsonValue,
    attemptLimit: numberOr(input.attemptLimit, 2),
    browserLock: Boolean(input.browserLock),
    autoSubmit: input.autoSubmit !== false,
    retakeRules: input.retakeRules as Prisma.InputJsonValue,
    reviewEnabled: input.reviewEnabled !== false,
    manualGrading: Boolean(input.manualGrading),
    active: input.active === undefined ? undefined : Boolean(input.active),
  };
}

function assignmentInput(input: Record<string, any>): Prisma.AssignmentUncheckedUpdateInput {
  return {
    courseId: stringOrNull(input.courseId),
    moduleId: stringOrNull(input.moduleId),
    lessonId: stringOrNull(input.lessonId),
    title: required(input.title, "Assignment title"),
    description: required(input.description, "Assignment description"),
    dueDays: optionalNumber(input.dueDays),
    points: numberOr(input.points, 100),
    active: input.active === undefined ? undefined : Boolean(input.active),
  };
}

// function learningPathInput(input: Record<string, any>): Prisma.LearningPathUpdateInput {
//   return {
//     title: required(input.title, "Path title"),
//     description: stringOrNull(input.description),
//     status: String(input.status ?? "DRAFT"),
//     badgeTitle: stringOrNull(input.badgeTitle),
//   };
// }

function announcementInput(input: Record<string, any>): Prisma.AnnouncementCreateInput {
  return {
    title: required(input.title, "Announcement title"),
    body: required(input.body, "Announcement body"),
    audience: String(input.audience ?? "ALL"),
    publishedAt: input.publishedAt === false ? null : new Date(),
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
  };
}

function badgeInput(input: Record<string, any>): Prisma.BadgeCreateInput {
  return {
    name: required(input.name ?? input.title, "Badge name"),
    description: stringOrNull(input.description ?? input.detail),
    iconUrl: stringOrNull(input.iconUrl ?? input.icon),
    xp: numberOr(input.xp, 0),
    active: input.active !== false,
  };
}

function badgePayload(body: Record<string, any>): Record<string, any> {
  const input = body.badge ?? body.achievement ?? body;
  return input && typeof input === "object" && !Array.isArray(input) ? input : {};
}

function learningPathPayload(body: Record<string, any>): Record<string, any> {
  const input = body.path ?? body.learningPath ?? body.programmePath ?? body;
  return input && typeof input === "object" && !Array.isArray(input) ? input : {};
}

function lessonInput(input: Record<string, any>): Prisma.TrainingLessonUpdateInput {
  const data: Prisma.TrainingLessonUpdateInput = {};
  if (input.sectionId) data.section = { connect: { id: String(input.sectionId) } };
  if (input.title !== undefined) data.title = required(input.title, "Lesson title");
  if (input.summary !== undefined) data.summary = stringOrNull(input.summary);
  if (input.richText !== undefined) data.richText = String(input.richText);
  if (input.transcript !== undefined) data.transcript = stringOrNull(input.transcript);
  if (input.lessonNotes !== undefined) data.lessonNotes = stringOrNull(input.lessonNotes);
  if (input.objectives !== undefined) data.objectives = arrayOfStrings(input.objectives);
  if (input.discussionPrompt !== undefined) data.discussionPrompt = stringOrNull(input.discussionPrompt);
  if (input.checklist !== undefined) data.checklist = input.checklist;
  if (input.reflectionQuestions !== undefined) data.reflectionQuestions = input.reflectionQuestions;
  if (input.videoUrl !== undefined) data.videoUrl = stringOrNull(input.videoUrl);
  if (input.embeddedVideoUrl !== undefined) data.embeddedVideoUrl = stringOrNull(input.embeddedVideoUrl);
  if (input.pdfUrl !== undefined) data.pdfUrl = stringOrNull(input.pdfUrl);
  if (input.audioUrl !== undefined) data.audioUrl = stringOrNull(input.audioUrl);
  if (input.mapEmbedUrl !== undefined) data.mapEmbedUrl = stringOrNull(input.mapEmbedUrl);
  if (input.estimatedMinutes !== undefined) data.estimatedMinutes = numberOr(input.estimatedMinutes, 0);
  if (input.completionRequirement !== undefined) data.completionRequirement = String(input.completionRequirement);
  if (input.sortOrder !== undefined) data.sortOrder = numberOr(input.sortOrder, 0);
  return data;
}

const LESSON_DEPTH_RESOURCE_TYPE = "LESSON_DEPTH";
const LESSON_DEPTH_FIELDS = [
  ["outcome", "Professional outcome"],
  ["standard", "HouseLink field standard"],
  ["mistakes", "Common mistakes to avoid"],
  ["scenario", "Zimbabwe field scenario"],
  ["practice", "Practice before you move on"],
] as const;

async function syncLessonDepthResources(lessonId: string, input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return;
  const prisma = getMainPrisma();
  const existing = await prisma.lessonResource.findMany({ where: { lessonId, type: LESSON_DEPTH_RESOURCE_TYPE } });
  const existingByTitle = new Map(existing.map((resource) => [resource.title, resource]));

  for (const [key, title] of LESSON_DEPTH_FIELDS) {
    const raw = (input as Record<string, unknown>)[key];
    const body = Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string").join("\n") : typeof raw === "string" ? raw.trim() : "";
    const current = existingByTitle.get(title);
    if (!body) {
      if (current) await prisma.lessonResource.delete({ where: { id: current.id } });
      continue;
    }
    if (current) {
      await prisma.lessonResource.update({ where: { id: current.id }, data: { body, sortOrder: LESSON_DEPTH_FIELDS.findIndex(([field]) => field === key) } });
    } else {
      await prisma.lessonResource.create({
        data: {
          lessonId,
          title,
          body,
          type: LESSON_DEPTH_RESOURCE_TYPE,
          sortOrder: LESSON_DEPTH_FIELDS.findIndex(([field]) => field === key),
        },
      });
    }
  }
}

async function markLessonCompleteForAdmin(learnerId: string, lessonId: string) {
  const prisma = getMainPrisma();
  const lesson = await prisma.trainingLesson.findUnique({
    where: { id: lessonId },
    include: {
      section: {
        include: {
          module: {
            select: { courseId: true },
          },
        },
      },
    },
  });
  if (!lesson) throw new Error("Lesson not found.");

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
  const progress = await recalculateCourseProgress(lesson.section.module.courseId, learnerId);
  return {
    lessonId,
    lessonTitle: lesson.title,
    courseId: lesson.section.module.courseId,
    progress,
  };
}

async function recalculateCourseProgress(courseId: string, learnerId: string) {
  const prisma = getMainPrisma();
  const course = await prisma.trainingCourse.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      certificateEnabled: true,
      modules: {
        select: {
          sections: {
            select: {
              lessons: {
                select: { id: true, estimatedMinutes: true },
              },
            },
          },
        },
      },
    },
  });
  if (!course) throw new Error("Course not found.");

  const lessons = course.modules.flatMap((module) => module.sections.flatMap((section) => section.lessons));
  const completedRows = lessons.length
    ? await prisma.lessonProgress.findMany({
        where: {
          agentId: learnerId,
          lessonId: { in: lessons.map((lesson) => lesson.id) },
          status: "COMPLETED",
        },
        select: { lessonId: true },
      })
    : [];
  const completedIds = new Set(completedRows.map((row) => row.lessonId));
  const completedCount = lessons.filter((lesson) => completedIds.has(lesson.id)).length;
  const percentComplete = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;
  const learningMinutes = lessons
    .filter((lesson) => completedIds.has(lesson.id))
    .reduce((sum, lesson) => sum + lesson.estimatedMinutes, 0);
  const now = new Date();
  const progress = await prisma.courseProgress.upsert({
    where: { courseId_agentId: { courseId, agentId: learnerId } },
    create: {
      courseId,
      agentId: learnerId,
      status: percentComplete >= 100 ? "COMPLETED" : percentComplete > 0 ? "IN_PROGRESS" : "NOT_STARTED",
      percentComplete,
      learningMinutes,
      completedAt: percentComplete >= 100 ? now : null,
    },
    update: {
      status: percentComplete >= 100 ? "COMPLETED" : percentComplete > 0 ? "IN_PROGRESS" : "NOT_STARTED",
      percentComplete,
      learningMinutes,
      completedAt: percentComplete >= 100 ? now : null,
    },
  });

  if (percentComplete >= 100 && course.certificateEnabled) {
    await tryCompleteCourseCertification(learnerId, courseId);
  }

  return {
    learnerId,
    courseId,
    lessonCount: lessons.length,
    completedLessons: completedCount,
    percentComplete: progress.percentComplete,
    status: progress.status,
  };
}

async function repairCourseProgressForAllLearners(courseId: string) {
  const prisma = getMainPrisma();
  const enrolments = await prisma.courseEnrolment.findMany({
    where: { courseId, status: "ACTIVE" },
    select: { agentId: true },
  });
  const learners = await Promise.all(enrolments.map((enrolment) => recalculateCourseProgress(courseId, enrolment.agentId)));
  return {
    courseId,
    repairedLearners: learners.length,
    learners,
  };
}

async function unlockModuleForLearner(courseId: string, moduleId: string, learnerId: string, actor: Actor) {
  const prisma = getMainPrisma();
  const course = await prisma.trainingCourse.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { sortOrder: "asc" },
        include: {
          sections: {
            orderBy: { sortOrder: "asc" },
            include: { lessons: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true, estimatedMinutes: true } } },
          },
        },
      },
      quizzes: { where: { active: true }, select: { id: true, title: true, passingPercentage: true, moduleId: true, lessonId: true } },
      assignments: { where: { active: true }, select: { id: true, title: true, points: true, moduleId: true, lessonId: true } },
    },
  });
  if (!course) throw new Error("Course not found.");
  const targetModule = course.modules.find((module) => module.id === moduleId);
  if (!targetModule) throw new Error("Module not found.");

  const priorModules = course.modules.filter((module) => module.sortOrder < targetModule.sortOrder);
  const priorModuleIds = new Set(priorModules.map((module) => module.id));
  const priorLessons = priorModules.flatMap((module) => module.sections.flatMap((section) => section.lessons));
  const priorLessonIds = new Set(priorLessons.map((lesson) => lesson.id));
  const now = new Date();

  for (const lesson of priorLessons) {
    await prisma.lessonProgress.upsert({
      where: { lessonId_agentId: { lessonId: lesson.id, agentId: learnerId } },
      create: {
        lessonId: lesson.id,
        agentId: learnerId,
        status: "COMPLETED",
        percentComplete: 100,
        completedAt: now,
        lastViewedAt: now,
        readingSeconds: lesson.estimatedMinutes * 60,
      },
      update: { status: "COMPLETED", percentComplete: 100, completedAt: now, lastViewedAt: now },
    });
  }

  const priorQuizzes = course.quizzes.filter((quiz) => (quiz.moduleId && priorModuleIds.has(quiz.moduleId)) || (quiz.lessonId && priorLessonIds.has(quiz.lessonId)));
  const priorAssignments = course.assignments.filter((assignment) => (assignment.moduleId && priorModuleIds.has(assignment.moduleId)) || (assignment.lessonId && priorLessonIds.has(assignment.lessonId)));
  const passedQuizRows = priorQuizzes.length
    ? await prisma.quizAttempt.findMany({
        where: { agentId: learnerId, quizId: { in: priorQuizzes.map((quiz) => quiz.id) }, status: TrainingAttemptStatus.PASSED },
        select: { quizId: true },
      })
    : [];
  const passedQuizIds = new Set(passedQuizRows.map((row) => row.quizId));
  const approvedAssignmentRows = priorAssignments.length
    ? await prisma.assignmentSubmission.findMany({
        where: {
          agentId: learnerId,
          assignmentId: { in: priorAssignments.map((assignment) => assignment.id) },
          status: { in: [AssignmentSubmissionStatus.APPROVED, AssignmentSubmissionStatus.GRADED] },
        },
        select: { assignmentId: true },
      })
    : [];
  const approvedAssignmentIds = new Set(approvedAssignmentRows.map((row) => row.assignmentId));

  for (const quiz of priorQuizzes.filter((quiz) => !passedQuizIds.has(quiz.id))) {
    await prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,
        agentId: learnerId,
        status: TrainingAttemptStatus.PASSED,
        score: quiz.passingPercentage,
        answers: {
          _adminOverride: {
            actorId: actor.id,
            actorName: actor.name,
            reason: "Module unlocked by Academy Admin",
            createdAt: now.toISOString(),
          },
        } as Prisma.InputJsonObject,
        submittedAt: now,
        gradedAt: now,
      },
    });
  }

  for (const assignment of priorAssignments.filter((assignment) => !approvedAssignmentIds.has(assignment.id))) {
    await prisma.assignmentSubmission.create({
      data: {
        assignmentId: assignment.id,
        agentId: learnerId,
        status: AssignmentSubmissionStatus.APPROVED,
        notes: "Gate approved by Academy Admin.",
        grade: assignment.points,
        reviewerId: actor.id,
        reviewerNote: "Admin override: module unlocked.",
        submittedAt: now,
        reviewedAt: now,
      },
    });
  }

  const progress = await recalculateCourseProgress(courseId, learnerId);
  return {
    moduleId,
    moduleTitle: targetModule.title,
    lessonsMarkedComplete: priorLessons.length,
    quizzesSatisfied: priorQuizzes.length,
    assignmentsSatisfied: priorAssignments.length,
    progress,
  };
}

async function notifyAgents(eventType: string, subject: string, body: string) {
  const prisma = getMainPrisma();
  const agents = await prisma.user.findMany({ where: { roles: { has: "AGENT" } }, select: { id: true } });
  if (!agents.length) return;
  await prisma.trainingNotification.createMany({
    data: agents.map((agent) => ({ userId: agent.id, eventType, channel: "IN_APP", subject, body })),
  });
}

async function audit(actor: Actor, action: string, target: string, metadata: Prisma.InputJsonObject) {
  await getMainPrisma().trainingAuditLog.create({
    data: { actorId: actor.id, action, target, metadata: { actorName: actor.name, ...metadata } },
  });
}

function required(value: unknown, label: string) {
  if (typeof value === "string" && value.trim()) return value.trim();
  throw new Error(`${label} is required.`);
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberOr(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function optionalNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function decimalOr(value: unknown, fallback: number) {
  return new Prisma.Decimal(numberOr(value, fallback));
}

function arrayOfStrings(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map((entry) => entry.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((entry) => entry.trim()).filter(Boolean);
  return [];
}

function enumValue<T extends Record<string, string>>(enumObject: T, value: unknown, fallback: T[keyof T]) {
  return Object.values(enumObject).includes(String(value)) ? String(value) as T[keyof T] : fallback;
}

function detectFileType(value: unknown) {
  const lower = String(value ?? "").toLowerCase();
  if (lower.endsWith(".docx") || lower.endsWith(".doc")) return TrainingResourceType.DOCX;
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return TrainingResourceType.XLSX;
  if (lower.endsWith(".pptx") || lower.endsWith(".ppt")) return TrainingResourceType.PPTX;
  if (lower.match(/\.(png|jpe?g|gif|webp)$/)) return TrainingResourceType.IMAGE;
  if (lower.match(/\.(mp4|webm|mov)$/)) return TrainingResourceType.VIDEO;
  if (lower.match(/\.(mp3|wav|m4a|ogg)$/)) return TrainingResourceType.AUDIO;
  if (lower.endsWith(".zip")) return TrainingResourceType.ZIP;
  return TrainingResourceType.PDF;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `academy-${Date.now()}`;
}

function daysAgo(date: Date) {
  return (Date.now() - date.getTime()) / 86400000;
}

function average(values: number[]) {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 100;
}

function agentCounts(agentIds: string[]) {
  const counts = new Map<string, number>();
  for (const agentId of agentIds) counts.set(agentId, (counts.get(agentId) ?? 0) + 1);
  return Array.from(counts.entries()).map(([agentId, actions]) => ({ agentId, actions })).sort((a, b) => b.actions - a.actions);
}

function buildAcademyIntegrity({
  courses,
  lessons,
  quizzes,
  assignments,
  certificateTemplates,
  announcements,
  badges,
}: {
  courses: any[];
  lessons: any[];
  quizzes: any[];
  assignments: any[];
  certificateTemplates: any[];
  announcements: any[];
  badges: any[];
}) {
  const issues: Array<{ id: string; severity: "danger" | "warning" | "info"; area: string; title: string; detail: string; action: string }> = [];
  const activeTemplates = certificateTemplates.filter((template) => template.active);
  const courseIdsWithTemplate = new Set<string>();
  for (const template of activeTemplates) {
    const config = template.templateJson && typeof template.templateJson === "object" && !Array.isArray(template.templateJson) ? template.templateJson as Record<string, unknown> : {};
    const courseIds = Array.isArray(config.courseIds) ? config.courseIds.filter((id): id is string => typeof id === "string") : [];
    for (const id of courseIds) courseIdsWithTemplate.add(id);
  }

  for (const course of courses) {
    const courseLessons = course.modules?.flatMap((module: any) => module.sections?.flatMap((section: any) => section.lessons ?? []) ?? []) ?? [];
    if (course.status === TrainingCourseStatus.PUBLISHED && !courseLessons.length) {
      issues.push({ id: `course-no-lessons-${course.id}`, severity: "danger", area: "Courses", title: `${course.title} has no lessons`, detail: "Published courses need learner-facing lessons before enrolment.", action: "Add lessons or unpublish the course." });
    }
    if (course.status === TrainingCourseStatus.PUBLISHED && courseLessons.some((lesson: any) => !String(lesson.richText ?? "").replace(/<[^>]+>/g, " ").trim())) {
      issues.push({ id: `course-empty-lessons-${course.id}`, severity: "warning", area: "Lessons", title: `${course.title} has empty lesson content`, detail: "At least one lesson has no readable body content.", action: "Open the course builder and complete lesson content." });
    }
    if (course.certificateEnabled && !activeTemplates.length && !courseIdsWithTemplate.has(course.id)) {
      issues.push({ id: `course-no-template-${course.id}`, severity: "danger", area: "Certificates", title: `${course.title} has certificates enabled but no active template`, detail: "Certificate issue can fail or fall back unexpectedly without an active template.", action: "Create or activate a certificate template." });
    }
  }

  for (const lesson of lessons) {
    if (lesson.completionRequirement === "COMPLETE_QUIZ" && !quizzes.some((quiz) => quiz.lessonId === lesson.id && quiz.active !== false)) {
      issues.push({ id: `lesson-gate-quiz-${lesson.id}`, severity: "danger", area: "Gates", title: `${lesson.title} requires a quiz but none is linked`, detail: "Learners may be blocked with no quiz to complete.", action: "Link an active quiz to this lesson or change the completion requirement." });
    }
    if (lesson.completionRequirement === "SUBMIT_ASSIGNMENT" && !assignments.some((assignment) => assignment.lessonId === lesson.id && assignment.active !== false)) {
      issues.push({ id: `lesson-gate-assignment-${lesson.id}`, severity: "danger", area: "Gates", title: `${lesson.title} requires an assignment but none is linked`, detail: "Learners may be blocked with no assignment to submit.", action: "Link an active assignment to this lesson or change the completion requirement." });
    }
  }

  for (const quiz of quizzes) {
    if (quiz.active !== false && (quiz.questions?.length ?? 0) === 0) {
      issues.push({ id: `quiz-no-questions-${quiz.id}`, severity: "danger", area: "Quizzes", title: `${quiz.title} has no questions`, detail: "Learners cannot meaningfully pass a quiz without questions.", action: "Add questions before publishing or gate-linking this quiz." });
    }
  }

  const expiredAnnouncements = announcements.filter((announcement) => announcement.expiresAt && announcement.expiresAt.getTime() <= Date.now());
  for (const announcement of expiredAnnouncements.slice(0, 5)) {
    issues.push({ id: `announcement-expired-${announcement.id}`, severity: "info", area: "Announcements", title: `${announcement.title} is expired`, detail: "Expired announcements are hidden from active learner dashboards.", action: "Restore it or leave archived if no longer relevant." });
  }
  for (const badge of badges.filter((badge) => badge.active && badge.xp <= 0)) {
    issues.push({ id: `badge-no-xp-${badge.id}`, severity: "warning", area: "Badges", title: `${badge.name} has no XP value`, detail: "Badges with 0 XP do not improve leaderboard progress.", action: "Set an XP value or mark the badge inactive." });
  }

  return {
    score: Math.max(0, 100 - issues.filter((issue) => issue.severity === "danger").length * 18 - issues.filter((issue) => issue.severity === "warning").length * 8),
    danger: issues.filter((issue) => issue.severity === "danger").length,
    warning: issues.filter((issue) => issue.severity === "warning").length,
    info: issues.filter((issue) => issue.severity === "info").length,
    issues: issues.slice(0, 40),
  };
}

function buildCertificateSimulations({
  learnerDirectory,
  enrolments,
  courseProgress,
  quizAttempts,
  examAttempts,
  assignmentSubmissions,
  certificates,
  courses,
  quizzes,
  assignments,
  exams,
}: {
  learnerDirectory: Map<string, { name: string; email: string }>;
  enrolments: any[];
  courseProgress: any[];
  quizAttempts: any[];
  examAttempts: any[];
  assignmentSubmissions: any[];
  certificates: any[];
  courses: any[];
  quizzes: any[];
  assignments: any[];
  exams: any[];
}) {
  const courseById = new Map(courses.map((course) => [course.id, course]));
  return enrolments.slice(0, 30).map((enrolment) => {
    const course = courseById.get(enrolment.courseId);
    const learner = learnerDirectory.get(enrolment.agentId);
    const progress = courseProgress.find((row) => row.agentId === enrolment.agentId && row.courseId === enrolment.courseId);
    const courseQuizzes = quizzes.filter((quiz) => quiz.courseId === enrolment.courseId && quiz.active !== false);
    const courseAssignments = assignments.filter((assignment) => assignment.courseId === enrolment.courseId && assignment.active !== false);
    const courseExams = exams.filter((exam) => exam.courseId === enrolment.courseId && exam.active !== false);
    const blockers: string[] = [];
    const passedQuizzes = courseQuizzes.filter((quiz) => quizAttempts.some((attempt) => attempt.agentId === enrolment.agentId && attempt.quizId === quiz.id && attempt.status === TrainingAttemptStatus.PASSED && Number(attempt.score) >= quiz.passingPercentage));
    const approvedAssignments = courseAssignments.filter((assignment) => assignmentSubmissions.some((submission) => {
      const gradePercent = submission.grade == null || assignment.points <= 0 ? course?.passingPercentage ?? 80 : Math.round((Number(submission.grade) / assignment.points) * 100);
      return submission.agentId === enrolment.agentId && submission.assignmentId === assignment.id && [AssignmentSubmissionStatus.APPROVED, AssignmentSubmissionStatus.GRADED].includes(submission.status) && gradePercent >= (course?.passingPercentage ?? 80);
    }));
    const passedExams = courseExams.filter((exam) => examAttempts.some((attempt) => attempt.agentId === enrolment.agentId && attempt.examId === exam.id && attempt.status === TrainingAttemptStatus.PASSED && Number(attempt.score) >= exam.passingScore));
    if (!course?.certificateEnabled) blockers.push("Certificate issuing is disabled for this course.");
    if ((progress?.percentComplete ?? 0) < 100) blockers.push(`Course progress is ${progress?.percentComplete ?? 0}%, not 100%.`);
    if (passedQuizzes.length < courseQuizzes.length) blockers.push(`${courseQuizzes.length - passedQuizzes.length} quiz checkpoint${courseQuizzes.length - passedQuizzes.length === 1 ? "" : "s"} still not passed.`);
    if (approvedAssignments.length < courseAssignments.length) blockers.push(`${courseAssignments.length - approvedAssignments.length} assignment${courseAssignments.length - approvedAssignments.length === 1 ? "" : "s"} still not approved/passed.`);
    if (passedExams.length < courseExams.length) blockers.push(`${courseExams.length - passedExams.length} final exam${courseExams.length - passedExams.length === 1 ? "" : "s"} still not passed.`);
    const certificate = certificates.find((issue) => issue.agentId === enrolment.agentId && issue.courseId === enrolment.courseId && issue.status === "ACTIVE");
    return {
      id: `${enrolment.agentId}:${enrolment.courseId}`,
      learnerId: enrolment.agentId,
      learnerName: learner?.name ?? enrolment.agentId,
      learnerEmail: learner?.email ?? "",
      courseId: enrolment.courseId,
      courseTitle: course?.title ?? "Unknown course",
      eligible: blockers.length === 0,
      certificateNumber: certificate?.certificateNumber ?? null,
      progress: progress?.percentComplete ?? 0,
      passedQuizzes: passedQuizzes.length,
      totalQuizzes: courseQuizzes.length,
      approvedAssignments: approvedAssignments.length,
      totalAssignments: courseAssignments.length,
      passedExams: passedExams.length,
      totalExams: courseExams.length,
      blockers,
    };
  });
}

function buildLearnerTimeline({
  learnerDirectory,
  enrolments,
  courseProgress,
  lessonProgress,
  quizAttempts,
  examAttempts,
  assignmentSubmissions,
  certificates,
  courses,
  quizzes,
  assignments,
  exams,
}: {
  learnerDirectory: Map<string, { name: string; email: string }>;
  enrolments: any[];
  courseProgress: any[];
  lessonProgress: any[];
  quizAttempts: any[];
  examAttempts: any[];
  assignmentSubmissions: any[];
  certificates: any[];
  courses: any[];
  quizzes: any[];
  assignments: any[];
  exams: any[];
}) {
  const courseTitle = new Map(courses.map((course) => [course.id, course.title]));
  const quizTitle = new Map(quizzes.map((quiz) => [quiz.id, quiz.title]));
  const assignmentTitle = new Map(assignments.map((assignment) => [assignment.id, assignment.title]));
  const examTitle = new Map(exams.map((exam) => [exam.id, exam.title]));
  const events: Array<{ id: string; learnerId: string; learnerName: string; learnerEmail: string; type: string; title: string; detail: string; occurredAt: string; status: string }> = [];
  const push = (learnerId: string, id: string, type: string, title: string, detail: string, date: Date | null | undefined, status: string) => {
    if (!date) return;
    const learner = learnerDirectory.get(learnerId);
    events.push({ id, learnerId, learnerName: learner?.name ?? learnerId, learnerEmail: learner?.email ?? "", type, title, detail, occurredAt: date.toISOString(), status });
  };
  for (const row of enrolments) push(row.agentId, `enrolment-${row.id}`, "Enrolment", `Enrolled in ${courseTitle.get(row.courseId) ?? "course"}`, row.status, row.enrolledAt, row.status);
  for (const row of courseProgress) push(row.agentId, `course-progress-${row.id}`, "Course progress", courseTitle.get(row.courseId) ?? "Course progress", `${row.percentComplete}% complete`, row.updatedAt, row.status);
  for (const row of lessonProgress) push(row.agentId, `lesson-progress-${row.id}`, "Lesson", "Lesson activity", `${row.percentComplete}% complete`, row.completedAt ?? row.lastViewedAt, row.status);
  for (const row of quizAttempts) push(row.agentId, `quiz-${row.id}`, "Quiz", quizTitle.get(row.quizId) ?? "Quiz", `${row.status} - ${Number(row.score)}%`, row.submittedAt ?? row.startedAt, row.status);
  for (const row of examAttempts) push(row.agentId, `exam-${row.id}`, "Exam", examTitle.get(row.examId) ?? "Exam", `${row.status} - ${Number(row.score)}%`, row.submittedAt ?? row.startedAt, row.status);
  for (const row of assignmentSubmissions) push(row.agentId, `assignment-${row.id}`, "Assignment", assignmentTitle.get(row.assignmentId) ?? "Assignment", row.grade == null ? row.status : `${row.status} - ${Number(row.grade)}`, row.reviewedAt ?? row.submittedAt, row.status);
  for (const row of certificates) push(row.agentId, `certificate-${row.id}`, "Certificate", row.course?.title ?? courseTitle.get(row.courseId) ?? "Certificate", row.certificateNumber, row.issuedAt, row.status);
  return events.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, 120);
}

function buildAnnouncementDeliverySummary({ announcements, publicLearnerApplications, enrolments }: { announcements: any[]; publicLearnerApplications: any[]; enrolments: any[] }) {
  const activeLearnerIds = new Set(enrolments.filter((entry) => entry.status === "ACTIVE").map((entry) => entry.agentId));
  const publicLearnerIds = new Set(publicLearnerApplications.filter((entry) => entry.status === "APPROVED").map((entry) => entry.learnerId));
  return announcements.slice(0, 30).map((announcement) => {
    const audience = announcement.audience ?? "ALL";
    const estimatedReach = audience === "PUBLIC_LEARNERS"
      ? publicLearnerIds.size
      : audience === "LEARNERS" || audience === "AGENTS"
        ? activeLearnerIds.size
        : audience === "ALL"
          ? new Set([...activeLearnerIds, ...publicLearnerIds]).size
          : 0;
    return {
      id: announcement.id,
      title: announcement.title,
      audience,
      active: !announcement.expiresAt || announcement.expiresAt.getTime() > Date.now(),
      estimatedReach,
      createdAt: announcement.createdAt.toISOString(),
      expiresAt: announcement.expiresAt?.toISOString() ?? null,
    };
  });
}

function buildTrainerInsights({
  quizzes,
  quizAttempts,
  examAttempts,
  assignmentSubmissions,
}: {
  quizzes: Array<{ id: string; title: string }>;
  quizAttempts: Array<{
    id: string;
    quizId: string;
    agentId: string;
    status: TrainingAttemptStatus;
    score: Prisma.Decimal | number;
    answers: Prisma.JsonValue;
    startedAt: Date;
    submittedAt: Date | null;
  }>;
  examAttempts: Array<{
    id: string;
    agentId: string;
    status: TrainingAttemptStatus;
    score: Prisma.Decimal | number;
    answers: Prisma.JsonValue;
    startedAt: Date;
    submittedAt: Date | null;
  }>;
  assignmentSubmissions: Array<{ id: string; assignmentId: string; agentId: string; status: AssignmentSubmissionStatus; grade: Prisma.Decimal | number | null; submittedAt: Date }>;
}) {
  const quizTitle = new Map(quizzes.map((quiz) => [quiz.id, quiz.title]));
  const lowConfidence = quizAttempts
    .map((attempt) => ({ attempt, meta: attemptMeta(attempt.answers) }))
    .filter(({ meta }) => meta.confidence === "guessed" || meta.confidence === "mixed")
    .slice(0, 12)
    .map(({ attempt, meta }) => ({
      id: attempt.id,
      agentId: attempt.agentId,
      assessmentTitle: quizTitle.get(attempt.quizId) ?? "Quiz",
      confidence: meta.confidence ?? "unknown",
      score: Number(attempt.score),
      submittedAt: attempt.submittedAt?.toISOString() ?? attempt.startedAt.toISOString(),
    }));

  const failureCounts = new Map<string, { agentId: string; quizTitle: string; failures: number; latestAt: Date }>();
  for (const attempt of quizAttempts.filter((entry) => entry.status === TrainingAttemptStatus.FAILED)) {
    const key = `${attempt.agentId}:${attempt.quizId}`;
    const current = failureCounts.get(key);
    const latestAt = attempt.submittedAt ?? attempt.startedAt;
    failureCounts.set(key, {
      agentId: attempt.agentId,
      quizTitle: quizTitle.get(attempt.quizId) ?? "Quiz",
      failures: (current?.failures ?? 0) + 1,
      latestAt: current && current.latestAt > latestAt ? current.latestAt : latestAt,
    });
  }

  const repeatedFailures = Array.from(failureCounts.values())
    .filter((item) => item.failures >= 2)
    .sort((a, b) => b.failures - a.failures || b.latestAt.getTime() - a.latestAt.getTime())
    .slice(0, 12)
    .map((item) => ({ ...item, latestAt: item.latestAt.toISOString() }));

  const weakTopicCounts = new Map<string, number>();
  for (const attempt of [...quizAttempts, ...examAttempts]) {
    for (const topic of attemptMeta(attempt.answers).reviewTopics) weakTopicCounts.set(topic, (weakTopicCounts.get(topic) ?? 0) + 1);
  }

  const weakTopics = Array.from(weakTopicCounts.entries())
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const rushedAttempts = quizAttempts
    .filter((attempt) => attempt.submittedAt)
    .map((attempt) => {
      const meta = attemptMeta(attempt.answers);
      return {
        id: attempt.id,
        agentId: attempt.agentId,
        assessmentTitle: quizTitle.get(attempt.quizId) ?? "Quiz",
        seconds: meta.elapsedSeconds ?? Math.max(0, Math.round(((attempt.submittedAt ?? attempt.startedAt).getTime() - attempt.startedAt.getTime()) / 1000)),
        score: Number(attempt.score),
      };
    })
    .filter((attempt) => attempt.seconds > 0 && attempt.seconds < 90)
    .sort((a, b) => a.seconds - b.seconds)
    .slice(0, 12);

  const practicalRisk = assignmentSubmissions
    .filter((submission) => submission.status === AssignmentSubmissionStatus.RESUBMISSION_REQUESTED || (submission.grade !== null && Number(submission.grade) < 70))
    .slice(0, 12)
    .map((submission) => ({
      id: submission.id,
      assignmentId: submission.assignmentId,
      agentId: submission.agentId,
      status: submission.status,
      grade: submission.grade === null ? null : Number(submission.grade),
      submittedAt: submission.submittedAt.toISOString(),
    }));

  return { lowConfidence, repeatedFailures, weakTopics, rushedAttempts, practicalRisk };
}

function buildLearnerProfiles({
  enrolments,
  courseProgress,
  quizAttempts,
  examAttempts,
  assignmentSubmissions,
  certificates,
}: {
  enrolments: Array<{ agentId: string; courseId: string; status: string; enrolledAt: Date }>;
  courseProgress: Array<{ agentId: string; courseId: string; percentComplete: number; averageScore: Prisma.Decimal | number; status: string; updatedAt: Date }>;
  quizAttempts: Array<{ agentId: string; status: TrainingAttemptStatus; score: Prisma.Decimal | number; answers: Prisma.JsonValue; startedAt: Date; submittedAt: Date | null }>;
  examAttempts: Array<{ agentId: string; status: TrainingAttemptStatus; score: Prisma.Decimal | number; answers: Prisma.JsonValue; startedAt: Date; submittedAt: Date | null }>;
  assignmentSubmissions: Array<{ agentId: string; status: AssignmentSubmissionStatus; grade: Prisma.Decimal | number | null; reviewerNote: string | null; submittedAt: Date; reviewedAt: Date | null }>;
  certificates: Array<{ agentId: string; status: string }>;
}) {
  const learnerIds = new Set([
    ...enrolments.map((entry) => entry.agentId),
    ...courseProgress.map((entry) => entry.agentId),
    ...quizAttempts.map((entry) => entry.agentId),
    ...assignmentSubmissions.map((entry) => entry.agentId),
    ...certificates.map((entry) => entry.agentId),
  ]);

  return Array.from(learnerIds)
    .map((agentId) => {
      const progress = courseProgress.filter((entry) => entry.agentId === agentId);
      const attempts = [...quizAttempts, ...examAttempts].filter((entry) => entry.agentId === agentId && entry.status !== TrainingAttemptStatus.IN_PROGRESS);
      const submissions = assignmentSubmissions.filter((entry) => entry.agentId === agentId);
      const latestActivity = [
        ...progress.map((entry) => entry.updatedAt),
        ...attempts.map((entry) => entry.submittedAt ?? entry.startedAt),
        ...submissions.map((entry) => entry.reviewedAt ?? entry.submittedAt),
      ].sort((a, b) => b.getTime() - a.getTime())[0];
      const weakTopics = new Map<string, number>();
      for (const attempt of attempts) {
        for (const topic of attemptMeta(attempt.answers).reviewTopics) weakTopics.set(topic, (weakTopics.get(topic) ?? 0) + 1);
      }
      const confidence = attempts.map((attempt) => attemptMeta(attempt.answers).confidence).filter((value): value is string => Boolean(value));
      const passedAttempts = attempts.filter((entry) => entry.status === TrainingAttemptStatus.PASSED).length;
      const failedAttempts = attempts.filter((entry) => entry.status === TrainingAttemptStatus.FAILED).length;
      const reviewedAssignments = submissions.filter((entry) => entry.status === AssignmentSubmissionStatus.GRADED || entry.status === AssignmentSubmissionStatus.APPROVED);
      const mentorSignoffs = submissions.filter((entry) => /mentor sign-off:\s*granted/i.test(entry.reviewerNote ?? "")).length;
      const riskFlags = [
        failedAttempts >= 2 ? "Repeated quiz failures" : null,
        confidence.filter((value) => value === "guessed" || value === "mixed").length >= 2 ? "Low confidence" : null,
        submissions.some((entry) => entry.status === AssignmentSubmissionStatus.RESUBMISSION_REQUESTED) ? "Practical resubmission" : null,
        progress.some((entry) => entry.status !== "COMPLETED" && entry.percentComplete < 35 && daysAgo(entry.updatedAt) > 14) ? "Stalled progress" : null,
      ].filter((value): value is string => Boolean(value));

      return {
        agentId,
        courses: enrolments.filter((entry) => entry.agentId === agentId).length,
        averageProgress: progress.length ? Math.round(progress.reduce((sum, entry) => sum + entry.percentComplete, 0) / progress.length) : 0,
        averageScore: attempts.length ? Math.round(attempts.reduce((sum, entry) => sum + Number(entry.score), 0) / attempts.length) : 0,
        passedAttempts,
        failedAttempts,
        reviewedAssignments: reviewedAssignments.length,
        mentorSignoffs,
        certificates: certificates.filter((entry) => entry.agentId === agentId && entry.status === "ACTIVE").length,
        weakTopics: Array.from(weakTopics.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([topic]) => topic),
        riskFlags,
        recommendation: recommendationForLearner({ riskFlags, failedAttempts, reviewedAssignments: reviewedAssignments.length, mentorSignoffs }),
        latestActivity: latestActivity?.toISOString() ?? null,
      };
    })
    .sort((a, b) => b.riskFlags.length - a.riskFlags.length || b.failedAttempts - a.failedAttempts || b.averageProgress - a.averageProgress)
    .slice(0, 20);
}

function recommendationForLearner({
  riskFlags,
  failedAttempts,
  reviewedAssignments,
  mentorSignoffs,
}: {
  riskFlags: string[];
  failedAttempts: number;
  reviewedAssignments: number;
  mentorSignoffs: number;
}) {
  if (riskFlags.includes("Repeated quiz failures")) return "Schedule a 20-minute coaching review and assign weak-topic remediation before the next retake.";
  if (riskFlags.includes("Practical resubmission")) return "Review the submitted evidence against the rubric and request a focused field correction.";
  if (mentorSignoffs === 0 && reviewedAssignments > 0) return "Add mentor sign-off after confirming practical work is client-ready.";
  if (failedAttempts === 0 && reviewedAssignments > 0) return "Move learner toward portfolio evidence and final certificate readiness.";
  return "Keep learner on the next lesson, checkpoint, and practical task in sequence.";
}

function attemptMeta(value: Prisma.JsonValue) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { confidence: null as string | null, elapsedSeconds: null as number | null, reviewTopics: [] as string[] };
  const meta = (value as Record<string, unknown>)._meta;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return { confidence: null as string | null, elapsedSeconds: null as number | null, reviewTopics: [] as string[] };
  const record = meta as Record<string, unknown>;
  return {
    confidence: typeof record.confidence === "string" ? record.confidence : null,
    elapsedSeconds: typeof record.elapsedSeconds === "number" && Number.isFinite(record.elapsedSeconds) ? record.elapsedSeconds : null,
    reviewTopics: Array.isArray(record.reviewTopics) ? record.reviewTopics.filter((item): item is string => typeof item === "string") : [],
  };
}
