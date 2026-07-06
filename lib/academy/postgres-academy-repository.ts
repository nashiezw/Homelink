import {
  AssignmentSubmissionStatus,
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

export async function getAcademyDashboard() {
  await ensureAcademyDefaults();
  await ensureOfficialAcademySeed();
  const prisma = getMainPrisma();
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
    academyRevenue,
  ] = await Promise.all([
    prisma.trainingCourse.findMany({ include: { category: true }, orderBy: { updatedAt: "desc" } }),
    prisma.trainingLesson.count(),
    prisma.trainingLesson.findMany({
      include: { section: { include: { module: { include: { course: true } } } } },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.documentLibrary.findMany({ include: { category: true }, orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }] }),
    prisma.videoLibrary.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.quiz.findMany({ include: { attempts: true }, orderBy: { updatedAt: "desc" } }),
    prisma.assignment.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.finalExam.findMany({ include: { attempts: true }, orderBy: { updatedAt: "desc" } }),
    prisma.certificateIssue.findMany({ orderBy: { issuedAt: "desc" } }),
    prisma.courseEnrolment.findMany(),
    prisma.courseProgress.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.lessonProgress.findMany({ orderBy: { lastViewedAt: "desc" } }),
    prisma.quizAttempt.findMany({ orderBy: { startedAt: "desc" } }),
    prisma.examAttempt.findMany({ orderBy: { startedAt: "desc" } }),
    prisma.assignmentSubmission.findMany({ orderBy: { submittedAt: "desc" } }),
    prisma.learningPath.findMany({ include: { courses: { include: { course: true }, orderBy: { sortOrder: "asc" } } }, orderBy: { updatedAt: "desc" } }),
    prisma.announcement.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.badge.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.trainingSetting.findUnique({ where: { id: "singleton" } }),
    prisma.trainingAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.academyLearnerApplication.findMany({
      include: { course: true, payment: true, learner: { select: { id: true, name: true, email: true, phone: true, roles: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.payment.aggregate({ where: { plan: "academy_course", status: "PAID" }, _sum: { amount: true } }),
  ]);

  const activeLearners = new Set([
    ...courseProgress.filter((entry) => daysAgo(entry.updatedAt) <= 30).map((entry) => entry.agentId),
    ...lessonProgress.filter((entry) => daysAgo(entry.lastViewedAt) <= 30).map((entry) => entry.agentId),
  ]);
  const enrolledLearners = new Set(enrolments.map((entry) => entry.agentId));
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
      pendingPublicApprovals: publicLearnerApplications.filter((entry) => entry.status === "PAYMENT_UPLOADED").length,
      academyRevenue: Number(academyRevenue._sum.amount ?? 0),
    },
    courses,
    lessons: lessonRows,
    documents,
    videos,
    quizzes,
    assignments,
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
    await notifyAgents("NEW_COURSE_PUBLISHED", "New Academy course created", `${course.title} is ready in HomeLink Agent Academy.`);
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
  if (action === "archive_course" || action === "restore_course" || action === "delete_course") {
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
    const lesson = await prisma.trainingLesson.create({ data: lessonInput(body.lesson ?? {}) });
    await audit(actor, "academy.lesson.create", lesson.id, { title: lesson.title });
    return lesson;
  }
  if (action === "update_lesson") {
    const lesson = await prisma.trainingLesson.update({ where: { id: String(body.lessonId) }, data: lessonInput(body.lesson ?? {}) });
    await audit(actor, "academy.lesson.update", lesson.id, { title: lesson.title });
    return lesson;
  }
  if (action === "delete_lesson") {
    const lesson = await prisma.trainingLesson.delete({ where: { id: String(body.lessonId) } });
    await audit(actor, "academy.lesson.delete", lesson.id, { title: lesson.title });
    return lesson;
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
    const question = await prisma.quizQuestion.create({
      data: {
        quizId: stringOrNull(body.question?.quizId),
        type: enumValue(TrainingQuestionType, body.question?.type, TrainingQuestionType.MULTIPLE_CHOICE),
        prompt: required(body.question?.prompt, "Question prompt"),
        points: numberOr(body.question?.points, 1),
        explanation: stringOrNull(body.question?.explanation),
        correctAnswer: (body.question?.correctAnswer ?? {}) as Prisma.InputJsonValue,
        incorrectFeedback: stringOrNull(body.question?.incorrectFeedback),
        hints: arrayOfStrings(body.question?.hints),
        difficulty: enumValue(TrainingDifficulty, body.question?.difficulty, TrainingDifficulty.BEGINNER),
        mediaUrl: stringOrNull(body.question?.mediaUrl),
        attachments: body.question?.attachments as Prisma.InputJsonValue,
        categories: arrayOfStrings(body.question?.categories),
        tags: arrayOfStrings(body.question?.tags),
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
    const path = await prisma.learningPath.update({
      where: { id: String(body.pathId) },
      data: learningPathInput(body.path ?? {}),
    });
    await audit(actor, "academy.path.update", path.id, { title: path.title });
    return path;
  }
  if (action === "archive_learning_path" || action === "restore_learning_path" || action === "delete_learning_path") {
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
  if (action === "archive_announcement" || action === "restore_announcement" || action === "delete_announcement") {
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
  if (action === "archive_badge" || action === "restore_badge" || action === "delete_badge") {
    const badge = await prisma.badge.update({ where: { id: String(body.badgeId) }, data: { active: action === "restore_badge" } });
    await audit(actor, `academy.badge.${action.replace("_badge", "")}`, badge.id, { active: badge.active });
    return badge;
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
  return null;
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
          certificatePrefix: "HLA",
          notifications: ["EMAIL", "IN_APP", "PUSH"],
          supportedFormats: ["PDF", "DOCX", "XLSX", "PPTX", "IMAGE", "VIDEO", "AUDIO", "ZIP"],
        },
      },
      update: {},
    }),
  ]);
}

function courseInput(input: Record<string, any>, actorId: string, update = false): Prisma.TrainingCourseUncheckedCreateInput & Prisma.TrainingCourseUncheckedUpdateInput {
  return {
    title: required(input.title, "Course title"),
    slug: input.slug ? slugify(input.slug) : slugify(input.title),
    thumbnailUrl: stringOrNull(input.thumbnailUrl),
    bannerUrl: stringOrNull(input.bannerUrl),
    description: String(input.description ?? ""),
    categoryId: stringOrNull(input.categoryId),
    tags: arrayOfStrings(input.tags),
    difficulty: enumValue(TrainingDifficulty, input.difficulty, TrainingDifficulty.BEGINNER),
    durationMinutes: numberOr(input.durationMinutes, 0),
    instructor: stringOrNull(input.instructor),
    prerequisites: arrayOfStrings(input.prerequisites),
    passingPercentage: numberOr(input.passingPercentage, 80),
    estimatedHours: decimalOr(input.estimatedHours, 0),
    certificateEnabled: Boolean(input.certificateEnabled),
    expiresAfterDays: optionalNumber(input.expiresAfterDays),
    price: decimalOr(input.price, 0),
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

function lessonInput(input: Record<string, any>): Prisma.TrainingLessonUncheckedCreateInput {
  return {
    sectionId: required(input.sectionId, "Section"),
    title: required(input.title, "Lesson title"),
    summary: stringOrNull(input.summary),
    richText: String(input.richText ?? ""),
    videoUrl: stringOrNull(input.videoUrl),
    embeddedVideoUrl: stringOrNull(input.embeddedVideoUrl),
    pdfUrl: stringOrNull(input.pdfUrl),
    audioUrl: stringOrNull(input.audioUrl),
    mapEmbedUrl: stringOrNull(input.mapEmbedUrl),
    estimatedMinutes: numberOr(input.estimatedMinutes, 0),
    completionRequirement: String(input.completionRequirement ?? "VIEW"),
    sortOrder: numberOr(input.sortOrder, 0),
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
