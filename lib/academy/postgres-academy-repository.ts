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
  ] = await Promise.all([
    prisma.trainingCourse.findMany({ include: { category: true }, orderBy: { updatedAt: "desc" } }),
    prisma.trainingLesson.count(),
    compact
      ? prisma.trainingLesson.findMany({
          select: {
            id: true,
            sectionId: true,
            title: true,
            summary: true,
            richText: true,
            estimatedMinutes: true,
            completionRequirement: true,
            sortOrder: true,
            updatedAt: true,
            section: {
              select: {
                id: true,
                title: true,
                module: {
                  select: {
                    id: true,
                    title: true,
                    course: { select: { id: true, title: true, status: true } },
                  },
                },
              },
            },
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
    prisma.quiz.findMany({ include: { attempts: compact ? { take: 100, orderBy: { startedAt: "desc" } } : true }, orderBy: { updatedAt: "desc" } }),
    prisma.assignment.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.finalExam.findMany({ include: { attempts: compact ? { take: 100, orderBy: { startedAt: "desc" } } : true }, orderBy: { updatedAt: "desc" } }),
    prisma.certificateIssue.findMany({ orderBy: { issuedAt: "desc" }, ...(compact ? { take: 250 } : {}) }),
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
    prisma.agentBadge.findMany({ include: { badge: true }, orderBy: { awardedAt: "desc" }, ...(compact ? { take: 100 } : {}) }),
    prisma.academyCoupon.findMany({
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
        usages: { take: 10, orderBy: { createdAt: "desc" } },
        _count: { select: { usages: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

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
    .sort((a, b) => b.failed - a.failed)[0];
  const trainerInsights = buildTrainerInsights({ quizzes, quizAttempts, examAttempts, assignmentSubmissions });
  const learnerProfiles = buildLearnerProfiles({ enrolments, courseProgress, quizAttempts, examAttempts, assignmentSubmissions, certificates });
  const [certifiedActiveListings, certifiedClosedListings] = await Promise.all([
    certifiedAgentIds.length
      ? prisma.listing.count({ where: { ownerId: { in: certifiedAgentIds }, status: ListingStatus.ACTIVE } })
      : 0,
    certifiedAgentIds.length
      ? prisma.listing.count({ where: { ownerId: { in: certifiedAgentIds }, status: { in: [ListingStatus.SOLD, ListingStatus.RENTED] } } })
      : 0,
  ]);

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
      certificatesIssued: certificates.length,
      activeLearners: activeLearners.size,
      inactiveLearners: Math.max(0, enrolledLearners.size - activeLearners.size),
      averageScore: scoredAttempts.length ? Math.round(scoredAttempts.reduce((sum, attempt) => sum + Number(attempt.score), 0) / scoredAttempts.length) : 0,
      completionRate: enrolments.length ? Math.round((completedCourses.length / enrolments.length) * 100) : 0,
      learningHours: Math.round(totalLearningMinutes / 60),
      downloads: documents.filter((document) => document.downloadable).length,
      videoWatchPercent: totalVideoSeconds ? Math.min(100, Math.round(((watchedSeconds._sum.watchedSeconds ?? 0) / totalVideoSeconds) * 100)) : 0,
      publicLearners: publicLearnerApplications.length,
      pendingPublicApprovals: publicLearnerApplications.filter((entry) => entry.status === "PAYMENT_UPLOADED" || entry.status === "PENDING_PAYMENT").length
        + resourceAccessApplications.filter((entry) => entry.status === "PAYMENT_UPLOADED" || entry.status === "PENDING_PAYMENT").length,
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
    certificates,
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
      remainingUses: coupon.maxUses ? coupon.maxUses - coupon.usedCount : null,
      isValid: coupon.active && 
                (!coupon.validUntil || new Date(coupon.validUntil) > new Date()) &&
                (!coupon.maxUses || coupon.usedCount < coupon.maxUses),
    })),
    auditLogs: recentActivity,
    topCourses: courses
      .map((course) => ({
        id: course.id,
        title: course.title,
        completions: courseProgress.filter((entry) => entry.courseId === course.id && entry.status === "COMPLETED").length,
        enrolments: enrolments.filter((entry) => entry.courseId === course.id).length,
      }))
      .sort((a, b) => b.completions - a.completions)
      .slice(0, 5),
    mostDifficultCourse: courses
      .map((course) => ({
        id: course.id,
        title: course.title,
        average: average(courseProgress.filter((entry) => entry.courseId === course.id).map((entry) => Number(entry.averageScore))),
      }))
      .sort((a, b) => a.average - b.average)[0],
    mostFailedQuiz: failedQuiz,
    trainerInsights,
    learnerProfiles,
    mostActiveAgents: agentCounts([...lessonProgress.map((entry) => entry.agentId), ...courseProgress.map((entry) => entry.agentId)]).slice(0, 5),
    agentsNeedingAttention: courseProgress.filter((entry) => entry.status !== "COMPLETED" && entry.percentComplete < 35).slice(0, 8),
    recentlyCompletedCourses: completedCourses.slice(0, 8),
    recentCertificates: certificates.slice(0, 8),
    upcomingExpiringCertificates: certificates
      .filter((certificate) => certificate.expiresAt && certificate.expiresAt.getTime() > Date.now())
      .sort((a, b) => (a.expiresAt?.getTime() ?? 0) - (b.expiresAt?.getTime() ?? 0))
      .slice(0, 8),
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
    leaderboard: agentBadges.map((entry) => ({
      id: entry.id,
      agentId: entry.agentId,
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
    const course = await prisma.trainingCourse.update({
      where: { id: String(body.courseId) },
      data: courseInput(body.course ?? {}, actor.id, true),
    });
    await audit(actor, "academy.course.update", course.id, { title: course.title });
    return course;
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
    const lesson = await prisma.trainingLesson.update({ where: { id: String(body.lessonId) }, data: lessonInput(body.lesson ?? {}) });
    await syncLessonDepthResources(lesson.id, body.lesson?.lessonDepth);
    await audit(actor, "academy.lesson.update", lesson.id, { title: lesson.title });
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
    const trainingModule = await prisma.trainingModule.update({
      where: { id: String(body.moduleId) },
      data: {
        title: body.module?.title,
        description: body.module?.description,
        sortOrder: body.module?.sortOrder,
      }
    });
    await audit(actor, "academy.module.update", trainingModule.id, { title: trainingModule.title });
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
    const assignment = await prisma.assignment.findUnique({ where: { id: submission.assignmentId }, select: { courseId: true } });
    if (assignment?.courseId && (status === AssignmentSubmissionStatus.APPROVED || status === AssignmentSubmissionStatus.GRADED)) {
      await tryCompleteCourseCertification(submission.agentId, assignment.courseId);
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
    const path = await prisma.learningPath.create({
      data: {
        title: required(body.path?.title, "Path title"),
        description: stringOrNull(body.path?.description),
        status: String(body.path?.status ?? "DRAFT"),
        badgeTitle: stringOrNull(body.path?.badgeTitle),
        courses: {
          create: arrayOfStrings(body.path?.courseIds).map((courseId, index) => ({ courseId, sortOrder: index, required: true })),
        },
      },
    });
    await audit(actor, "academy.path.create", path.id, { title: path.title });
    return path;
  }
  if (action === "update_learning_path") {
    const pathId = String(body.pathId);
    const courseIds = arrayOfStrings(body.path?.courseIds);
    const path = await prisma.$transaction(async (tx) => {
      const updated = await tx.learningPath.update({
        where: { id: pathId },
        data: learningPathInput(body.path ?? {}),
      });
      if (courseIds.length) {
        await tx.pathCourse.deleteMany({ where: { pathId } });
        await tx.pathCourse.createMany({
          data: courseIds.map((courseId, index) => ({ pathId, courseId, sortOrder: index, required: true })),
          skipDuplicates: true,
        });
      }
      return updated;
    });
    await audit(actor, "academy.path.update", path.id, { title: path.title });
    return path;
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
    const badge = await prisma.badge.create({ data: badgeInput(body.badge ?? {}) });
    await audit(actor, "academy.badge.create", badge.id, { name: badge.name });
    return badge;
  }
  if (action === "update_badge") {
    const badge = await prisma.badge.update({ where: { id: String(body.badgeId) }, data: badgeInput(body.badge ?? {}) });
    await audit(actor, "academy.badge.update", badge.id, { name: badge.name });
    return badge;
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
      },
    });
    if (!application) return null;
    const lessonIds = application.course.modules.flatMap((module) =>
      module.sections.flatMap((section) => section.lessons.map((lesson) => lesson.id)),
    );
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
  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    description: course.description,
    status: course.status,
    visibility: course.visibility,
    instructor: course.instructor,
    difficulty: course.difficulty,
    passingPercentage: course.passingPercentage,
    certificateEnabled: course.certificateEnabled,
    registrationOpen: course.registrationOpen,
    publicPrice: Number(course.publicPrice),
    agentPrice: Number(course.agentPrice),
    toolkitPublicPrice: Number(course.toolkitPublicPrice),
    toolkitAgentPrice: Number(course.toolkitAgentPrice),
    toolkitSalesEnabled: course.toolkitSalesEnabled,
    currency: course.currency,
    accessDurationDays: course.accessDurationDays,
    featured: course.featured,
    category: course.category,
    modules: course.modules.map((module) => ({
      id: module.id,
      title: module.title,
      description: module.description,
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
    quizzes: course.quizzes,
    assignments: course.assignments,
    exams: course.finalExams,
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
    title: required(input.title, "Assignment title"),
    description: required(input.description, "Assignment description"),
    dueDays: optionalNumber(input.dueDays),
    points: numberOr(input.points, 100),
    active: input.active === undefined ? undefined : Boolean(input.active),
  };
}

function learningPathInput(input: Record<string, any>): Prisma.LearningPathUpdateInput {
  return {
    title: required(input.title, "Path title"),
    description: stringOrNull(input.description),
    status: String(input.status ?? "DRAFT"),
    badgeTitle: stringOrNull(input.badgeTitle),
  };
}

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
    name: required(input.name, "Badge name"),
    description: stringOrNull(input.description),
    iconUrl: stringOrNull(input.iconUrl),
    xp: numberOr(input.xp, 0),
    active: input.active !== false,
  };
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
  if (failedAttempts === 0 && reviewedAssignments > 0) return "Move learner toward portfolio evidence and final certification readiness.";
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
