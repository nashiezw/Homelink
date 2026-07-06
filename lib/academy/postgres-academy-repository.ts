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
  const prisma = getMainPrisma();
  const [
    courses,
    lessons,
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
    recentActivity,
  ] = await Promise.all([
    prisma.trainingCourse.findMany({ include: { category: true }, orderBy: { updatedAt: "desc" } }),
    prisma.trainingLesson.count(),
    prisma.documentLibrary.findMany({ include: { category: true }, orderBy: { updatedAt: "desc" } }),
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
    prisma.trainingAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
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
      totalLessons: lessons,
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
    },
    courses,
    documents,
    videos,
    quizzes,
    assignments,
    exams,
    certificates,
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
  if (action === "create_document") {
    const document = await prisma.documentLibrary.create({ data: documentInput(body.document ?? {}, actor.id) });
    await audit(actor, "academy.document.create", document.id, { title: document.title, fileType: document.fileType });
    await notifyAgents("DOCUMENT_UPDATED", "Academy document added", `${document.title} is available in the document library.`);
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
  if (action === "create_video") {
    const video = await prisma.videoLibrary.create({ data: videoInput(body.video ?? {}) });
    await audit(actor, "academy.video.create", video.id, { title: video.title });
    return video;
  }
  if (action === "create_lesson") {
    const lesson = await prisma.trainingLesson.create({ data: lessonInput(body.lesson ?? {}) });
    await audit(actor, "academy.lesson.create", lesson.id, { title: lesson.title });
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
    createdById: actorId,
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
