import { AcademyRegistrationStatus, PaymentProvider, PaymentStatus, Role, TrainingCourseStatus, TrainingVisibility, type Prisma } from "@prisma/client";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { calculateCourseProgress, getCompletedLessonIds } from "@/lib/academy/academy-progress";
import { fetchCourseTree, flattenCourseMaterials, mapLessonForLearner } from "@/lib/academy/course-tree";

export type AcademyRegistrationIntent = "TRAINING_ONLY" | "AGENT_TRAINING";

function resolveCoursePrice(course: { publicPrice: Prisma.Decimal; agentPrice: Prisma.Decimal; price: Prisma.Decimal }, intent: AcademyRegistrationIntent) {
  if (intent === "AGENT_TRAINING") return course.agentPrice ?? course.price;
  return course.publicPrice || course.price;
}

export async function listPublicAcademyCourses() {
  const courses = await getMainPrisma().trainingCourse.findMany({
    where: {
      status: TrainingCourseStatus.PUBLISHED,
      visibility: { in: [TrainingVisibility.PUBLIC, TrainingVisibility.ROLE_BASED] },
      registrationOpen: true,
    },
    include: {
      category: true,
      modules: { include: { sections: { include: { lessons: true }, orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
  });
  return courses.map((course) => ({
    id: course.id,
    title: course.title,
    slug: course.slug,
    description: course.description,
    category: course.category?.name ?? "Academy",
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
    lessonCount: course.modules.reduce((sum, module) => sum + module.sections.reduce((count, section) => count + section.lessons.length, 0), 0),
    modules: course.modules.map((module) => ({
      id: module.id,
      title: module.title,
      lessons: module.sections.flatMap((section) => section.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title, estimatedMinutes: lesson.estimatedMinutes }))),
    })),
  }));
}

export async function getLearnerAcademyDashboard(learnerId: string) {
  const prisma = getMainPrisma();
  const [applications, notifications, documents, announcements, certificates, courseProgressRows] = await Promise.all([
    prisma.academyLearnerApplication.findMany({
      where: { learnerId },
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
    prisma.trainingNotification.findMany({ where: { userId: learnerId }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.documentLibrary.findMany({
      where: { active: true, visible: true, permissions: { hasSome: ["PUBLIC_LEARNER", "LEARNER", "AGENT", "ADMIN"] } },
      include: { category: true },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      take: 12,
    }),
    prisma.announcement.findMany({
      where: {
        AND: [
          { OR: [{ audience: "ALL" }, { audience: "LEARNERS" }, { audience: "PUBLIC_LEARNERS" }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.certificateIssue.findMany({
      where: { agentId: learnerId, status: "ACTIVE" },
      include: { course: true },
      orderBy: { issuedAt: "desc" },
    }),
    prisma.courseProgress.findMany({ where: { agentId: learnerId } }),
  ]);

  const approved = applications.filter((entry) => entry.status === AcademyRegistrationStatus.APPROVED);
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

  return {
    settings,
    metrics: {
      enrolledCourses: approved.length,
      pendingApprovals: applications.filter((entry) => entry.status === AcademyRegistrationStatus.PENDING_PAYMENT || entry.status === AcademyRegistrationStatus.PAYMENT_UPLOADED).length,
      certificates: certificates.length,
      downloads: documents.length,
      totalLessons,
      progress: overallProgress,
      completedLessons: completedLessonTotal,
    },
    certificates: certificates.map((certificate) => ({
      id: certificate.id,
      certificateNumber: certificate.certificateNumber,
      courseTitle: certificate.course?.title ?? "Academy Course",
      issuedAt: certificate.issuedAt.toISOString(),
      expiresAt: certificate.expiresAt?.toISOString() ?? null,
      verifyUrl: certificate.qrCodeUrl ?? `/api/v1/academy/certificates/verify/${encodeURIComponent(certificate.certificateNumber)}`,
    })),
    applications: await Promise.all(applications.map(async (entry) => {
      const completedIds = entry.status === AcademyRegistrationStatus.APPROVED
        ? await getCompletedLessonIds(learnerId, entry.course.id)
        : new Set<string>();
      const progress = calculateCourseProgress(entry.course, completedIds);
      const courseProgress = courseProgressRows.find((row) => row.courseId === entry.course.id);

      return {
      id: entry.id,
      status: entry.status,
      learnerType: entry.learnerType,
      amount: Number(entry.amount),
      currency: entry.currency,
      proofUrl: entry.proofUrl,
      accessStartsAt: entry.accessStartsAt?.toISOString(),
      accessEndsAt: entry.accessEndsAt?.toISOString(),
      adminNote: entry.adminNote,
      progress: courseProgress?.percentComplete ?? progress.percentComplete,
      payment: entry.payment ? {
        id: entry.payment.id,
        status: entry.payment.status,
        proofStatus: entry.payment.proofStatus,
        proofUrl: entry.payment.proofUrl,
        method: entry.payment.method,
      } : null,
      course: {
        id: entry.course.id,
        title: entry.course.title,
        slug: entry.course.slug,
        description: entry.course.description,
        certificateEnabled: entry.course.certificateEnabled,
        modules: entry.course.modules.map((module) => ({
          id: module.id,
          title: module.title,
          lessons: module.sections.flatMap((section) => section.lessons.map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            summary: lesson.summary,
            richText: lesson.richText,
            estimatedMinutes: lesson.estimatedMinutes,
            completionRequirement: lesson.completionRequirement,
            videoUrl: lesson.videoUrl,
            embeddedVideoUrl: lesson.embeddedVideoUrl,
            pdfUrl: lesson.pdfUrl,
            audioUrl: lesson.audioUrl,
            completed: completedIds.has(lesson.id),
            lessonVideos: lesson.lessonVideos.map((video) => ({
              id: video.id,
              title: video.title,
              url: video.url,
              provider: video.provider,
            })),
            lessonDownloads: lesson.lessonDownloads.map((download) => ({
              id: download.id,
              title: download.title,
              url: download.url,
              type: download.type,
            })),
          }))),
        })),
      },
    };
    })),
    documents: documents.map((document) => ({
      id: document.id,
      title: document.title,
      description: document.description,
      fileType: document.fileType,
      category: document.category?.name,
      downloadUrl: `/api/v1/academy/documents/${document.id}/download`,
    })),
    announcements,
    notifications,
  };
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
  registrationIntent?: AcademyRegistrationIntent;
  isAgent?: boolean;
}) {
  const prisma = getMainPrisma();
  const course = await prisma.trainingCourse.findFirst({
    where: { id: input.courseId, status: TrainingCourseStatus.PUBLISHED, registrationOpen: true },
  });
  if (!course) return "COURSE_NOT_AVAILABLE" as const;

  const intent: AcademyRegistrationIntent =
    input.registrationIntent ??
    (input.isAgent ? "AGENT_TRAINING" : "TRAINING_ONLY");
  const learnerType = intent === "AGENT_TRAINING" ? "AGENT" : "PUBLIC_LEARNER";
  const payableAmount = resolveCoursePrice(course, intent);

  const existing = await prisma.academyLearnerApplication.findUnique({
    where: { learnerId_courseId: { learnerId: input.learnerId, courseId: input.courseId } },
    include: { payment: true },
  });
  if (existing) return existing;

  const payment = await prisma.payment.create({
    data: {
      userId: input.learnerId,
      provider: PaymentProvider.PAYNOW,
      status: Number(payableAmount) > 0 ? PaymentStatus.PENDING : PaymentStatus.PAID,
      amount: payableAmount,
      currency: course.currency,
      description: `${course.title} Academy enrolment`,
      plan: "academy_course",
      method: input.paymentMethod || "bank_transfer",
      manual: Number(payableAmount) > 0,
      proofStatus: Number(payableAmount) > 0 ? "REQUESTED" : "NONE",
      metadata: { courseId: course.id, learnerType, registrationIntent: intent, referenceNumber: `HLA-${Date.now()}` } as Prisma.InputJsonObject,
    },
  });
  const now = new Date();
  const isFree = Number(payableAmount) <= 0;
  const accessEndsAt = new Date(now.getTime() + course.accessDurationDays * 86400000);
  const application = await prisma.academyLearnerApplication.create({
    data: {
      learnerId: input.learnerId,
      courseId: course.id,
      paymentId: payment.id,
      learnerType,
      status: isFree ? AcademyRegistrationStatus.APPROVED : AcademyRegistrationStatus.PENDING_PAYMENT,
      fullName: input.fullName,
      email: input.email.trim().toLowerCase(),
      phone: input.phone || null,
      organisation: input.organisation || null,
      motivation: input.motivation || null,
      amount: payableAmount,
      currency: course.currency,
      accessStartsAt: isFree ? now : null,
      accessEndsAt: isFree ? accessEndsAt : null,
    },
  });

  const user = await prisma.user.findUnique({ where: { id: input.learnerId }, select: { roles: true } });
  if (user) {
    const rolesToAdd: Role[] = [];
    if (intent === "TRAINING_ONLY" && !user.roles.includes(Role.PUBLIC_LEARNER)) {
      rolesToAdd.push(Role.PUBLIC_LEARNER);
    }
    if (rolesToAdd.length) {
      await prisma.user.update({ where: { id: input.learnerId }, data: { roles: [...user.roles, ...rolesToAdd] } });
    }
  }
  await prisma.trainingNotification.create({
    data: {
      userId: input.learnerId,
      eventType: "ACADEMY_REGISTRATION",
      channel: "IN_APP",
      subject: isFree ? "Academy access activated" : "Academy payment pending",
      body: isFree
        ? `${course.title} is active in your learner dashboard.`
        : intent === "TRAINING_ONLY"
          ? `Upload proof of payment for ${course.title}. You do not need to become a HomeLink agent to complete this training.`
          : `Upload proof of payment for ${course.title} so an admin can activate your access.`,
    },
  });
  if (isFree) {
    await prisma.courseEnrolment.upsert({
      where: { courseId_agentId: { courseId: course.id, agentId: input.learnerId } },
      create: { courseId: course.id, agentId: input.learnerId, status: "ACTIVE", dueAt: accessEndsAt },
      update: { status: "ACTIVE", dueAt: accessEndsAt },
    });
  }
  return application;
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
  const application = await prisma.academyLearnerApplication.findUnique({ where: { id: input.applicationId }, include: { course: true } });
  if (!application) return null;
  const now = new Date();
  const accessEndsAt = new Date(now.getTime() + application.course.accessDurationDays * 86400000);
  const approved = input.status === "APPROVED";
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
  }
  await prisma.trainingNotification.create({
    data: {
      userId: application.learnerId,
      eventType: `ACADEMY_APPLICATION_${input.status}`,
      channel: "IN_APP",
      subject: approved ? "Academy access approved" : "Academy registration updated",
      body: approved ? `${application.course.title} is now active in your learner dashboard.` : input.adminNote || `Your ${application.course.title} registration is ${input.status.toLowerCase()}.`,
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

export async function getAcademySettingsPublic() {
  const settings = await getMainPrisma().trainingSetting.findUnique({ where: { id: "singleton" } });
  const payload = (settings?.payload ?? {}) as Record<string, unknown>;
  return {
    academyName: String(payload.academyName ?? "HomeLink Academy"),
    certificatePrefix: String(payload.certificatePrefix ?? "HLA"),
    primaryColour: String(payload.primaryColour ?? "#008b68"),
    accentColour: String(payload.accentColour ?? "#c6a15b"),
    paymentInstructions: String(payload.paymentInstructions ?? "Upload proof of payment for admin approval before course activation."),
    accessDurationDays: Number(payload.accessDurationDays ?? 365),
    supportedFormats: Array.isArray(payload.supportedFormats) ? payload.supportedFormats : ["PDF", "DOCX", "VIDEO"],
    quizSettings: (payload.quizSettings ?? { defaultPassMark: 80, maxAttempts: 3, showResults: true }) as Record<string, unknown>,
    enrolmentSettings: (payload.enrolmentSettings ?? { allowTrainingOnly: true, requirePaymentProof: true }) as Record<string, unknown>,
    completionRules: (payload.completionRules ?? { requireAllLessons: true, requireFinalExam: false }) as Record<string, unknown>,
  };
}

export async function getLearnerCourseDetail(learnerId: string, courseId: string) {
  const prisma = getMainPrisma();
  const enrolment = await prisma.courseEnrolment.findUnique({
    where: { courseId_agentId: { courseId, agentId: learnerId } },
  });
  const application = await prisma.academyLearnerApplication.findUnique({
    where: { learnerId_courseId: { learnerId, courseId } },
  });
  if (!enrolment || enrolment.status !== "ACTIVE") {
    if (application?.status !== AcademyRegistrationStatus.APPROVED) return "NOT_ENROLLED" as const;
  }

  const course = await fetchCourseTree(courseId);
  if (!course) return "NOT_FOUND" as const;

  const completedIds = await getCompletedLessonIds(learnerId, courseId);
  const progress = calculateCourseProgress(course, completedIds);
  const courseProgress = await prisma.courseProgress.findUnique({ where: { courseId_agentId: { courseId, agentId: learnerId } } });

  const [quizAttempts, assignmentSubmissions, settings] = await Promise.all([
    prisma.quizAttempt.findMany({ where: { agentId: learnerId, quiz: { courseId } }, orderBy: { startedAt: "desc" } }),
    prisma.assignmentSubmission.findMany({ where: { agentId: learnerId, assignment: { courseId } }, orderBy: { submittedAt: "desc" } }),
    getAcademySettingsPublic(),
  ]);

  const bestQuizScores = new Map<string, number>();
  for (const attempt of quizAttempts) {
    const score = Number(attempt.score);
    const current = bestQuizScores.get(attempt.quizId) ?? 0;
    if (score > current) bestQuizScores.set(attempt.quizId, score);
  }

  return {
    settings,
    course: {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      instructor: course.instructor,
      certificateEnabled: course.certificateEnabled,
      passingPercentage: course.passingPercentage,
      progress: courseProgress?.percentComplete ?? progress.percentComplete,
      status: courseProgress?.status ?? "NOT_STARTED",
      modules: course.modules.map((module) => ({
        id: module.id,
        title: module.title,
        description: module.description,
        sortOrder: module.sortOrder,
        sections: module.sections.map((section) => ({
          id: section.id,
          title: section.title,
          sortOrder: section.sortOrder,
          lessons: section.lessons.map((lesson) => mapLessonForLearner(lesson, completedIds)),
        })),
        lessonCount: module.sections.reduce((sum, s) => sum + s.lessons.length, 0),
        completedCount: module.sections.reduce((sum, s) => sum + s.lessons.filter((l) => completedIds.has(l.id)).length, 0),
      })),
    },
    assessments: {
      quizzes: course.quizzes.map((quiz) => ({
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        passingPercentage: quiz.passingPercentage,
        timeLimitMinutes: quiz.timeLimitMinutes,
        questionCount: quiz.questions.length,
        bestScore: bestQuizScores.get(quiz.id) ?? null,
        passed: (bestQuizScores.get(quiz.id) ?? 0) >= quiz.passingPercentage,
      })),
      assignments: course.assignments.map((assignment) => ({
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        points: assignment.points,
        dueDays: assignment.dueDays,
        submitted: assignmentSubmissions.some((s) => s.assignmentId === assignment.id),
        status: assignmentSubmissions.find((s) => s.assignmentId === assignment.id)?.status ?? null,
      })),
      exams: course.finalExams.map((exam) => ({
        id: exam.id,
        title: exam.title,
        durationMinutes: exam.durationMinutes,
        passingScore: exam.passingScore,
        attemptLimit: exam.attemptLimit,
      })),
    },
    materials: flattenCourseMaterials(course),
    application: application
      ? {
          id: application.id,
          status: application.status,
          accessEndsAt: application.accessEndsAt?.toISOString() ?? null,
        }
      : null,
  };
}
