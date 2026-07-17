import { AcademyRegistrationStatus, PaymentProvider, PaymentStatus, Role, TrainingCourseStatus, TrainingVisibility, type Prisma } from "@prisma/client";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { calculateCourseProgress, getCompletedLessonIds } from "@/lib/academy/academy-progress";
import { canAccessProgrammeCourse, getProgrammeProgressSummary } from "@/lib/academy/academy-completion";
import { assessmentMetaForAssignment, assessmentMetaForQuiz } from "@/lib/academy/academy-assessments";
import { getProgrammeCourse, LEGACY_COURSE_ID, PROGRAMME_COURSE_IDS } from "@/lib/academy/academy-programme";
import { getEnrolledCourseToolkits, getToolkitGroupsForCourse, programmeMetaForCourse } from "@/lib/academy/academy-toolkits";
import {
  getManualAccessView,
  getToolkitAccessView,
  maskToolkitGroups,
  previewToolkitGroups,
} from "@/lib/academy/academy-resource-access";
import { fetchCourseTree, flattenCourseMaterials, mapLessonForLearner } from "@/lib/academy/course-tree";
import { toAcademyFileDownloadUrl } from "@/lib/academy/academy-files";

export type AcademyRegistrationIntent = "TRAINING_ONLY" | "AGENT_TRAINING";

function resolveCoursePrice(course: { publicPrice: Prisma.Decimal; agentPrice: Prisma.Decimal; price: Prisma.Decimal }, intent: AcademyRegistrationIntent) {
  if (intent === "AGENT_TRAINING") return course.agentPrice ?? course.price;
  return course.publicPrice || course.price;
}

export async function listPublicAcademyCourses() {
  const courses = await getMainPrisma().trainingCourse.findMany({
    where: {
      id: { in: PROGRAMME_COURSE_IDS },
      status: TrainingCourseStatus.PUBLISHED,
      visibility: { in: [TrainingVisibility.PUBLIC, TrainingVisibility.ROLE_BASED] },
      registrationOpen: true,
    },
    include: {
      category: true,
      modules: { include: { sections: { include: { lessons: true }, orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } },
    },
  });

  const ordered = PROGRAMME_COURSE_IDS
    .map((id) => courses.find((course) => course.id === id))
    .filter(Boolean);

  return Promise.all(ordered.map(async (course) => {
    if (!course) return null;
    const meta = programmeMetaForCourse(course.id);
    const toolkit = await getToolkitGroupsForCourse(course.id, { preview: true });
    const toolkitCount = toolkit.reduce((sum, group) => sum + group.items.length, 0);
    return {
      id: course.id,
      title: meta?.title ?? course.title,
      subtitle: meta?.subtitle ?? course.subtitle,
      slug: course.slug,
      description: meta?.description ?? course.description,
      shortDescription: meta?.shortDescription ?? course.shortDescription,
      category: course.category?.name ?? "HouseLink Agent Academy",
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
      badgeName: meta?.badgeName ?? null,
      certificateTitle: meta?.certificateTitle ?? null,
      learningOutcomes: meta?.learningOutcomes ?? [],
      includes: meta?.includes ?? [],
      assessmentSummary: meta?.assessmentSummary ?? null,
      toolkitCount,
      toolkitPreview: previewToolkitGroups(toolkit),
      lessonCount: course.modules.reduce((sum, module) => sum + module.sections.reduce((count, section) => count + section.lessons.length, 0), 0),
      modules: course.modules.map((module) => ({
        id: module.id,
        title: module.title,
        description: module.description,
        lessons: module.sections.flatMap((section) => section.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title, estimatedMinutes: lesson.estimatedMinutes }))),
      })),
    };
  })).then((rows) => rows.filter(Boolean));
}

export async function getLearnerAcademyDashboard(learnerId: string, options?: { isAgent?: boolean }) {
  const prisma = getMainPrisma();
  const isAgent = Boolean(options?.isAgent);
  const [applications, notifications, announcements, certificates, courseProgressRows, resourceAccessRows] = await Promise.all([
    prisma.academyLearnerApplication.findMany({
      where: {
        learnerId,
        courseId: { in: PROGRAMME_COURSE_IDS },
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
    prisma.trainingNotification.findMany({ where: { userId: learnerId }, orderBy: { createdAt: "desc" }, take: 10 }),
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
    prisma.academyResourceAccess.findMany({
      where: { learnerId },
      include: { course: true, payment: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const programmeApplications = applications.filter(
    (entry) => entry.courseId !== LEGACY_COURSE_ID && PROGRAMME_COURSE_IDS.includes(entry.courseId),
  );
  const approved = programmeApplications.filter((entry) => entry.status === AcademyRegistrationStatus.APPROVED);
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

  const [agentBadges, bookmarkRows, recentProgress] = await Promise.all([
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

  const activityDates = await prisma.lessonProgress.findMany({
    where: { agentId: learnerId },
    select: { lastViewedAt: true, completedAt: true },
    orderBy: { lastViewedAt: "desc" },
    take: 60,
  });
  const streak = computeLearningStreak(activityDates.map((row) => row.completedAt ?? row.lastViewedAt));

  const continueLearning = (() => {
    const recent = recentProgress.find(
      (row) =>
        row.lesson.section.module.courseId !== LEGACY_COURSE_ID &&
        PROGRAMME_COURSE_IDS.includes(row.lesson.section.module.courseId),
    ) ?? recentProgress[0];
    if (!recent) return null;
    const courseId = recent.lesson.section.module.courseId;
    if (courseId === LEGACY_COURSE_ID || !PROGRAMME_COURSE_IDS.includes(courseId)) {
      const fallback = approved[0];
      if (!fallback) return null;
      return {
        lessonId: "",
        lessonTitle: "Continue your programme",
        courseId: fallback.course.id,
        courseTitle: getProgrammeCourse(fallback.course.id)?.title ?? fallback.course.title,
        lastViewedAt: new Date().toISOString(),
      };
    }
    return {
      lessonId: recent.lessonId,
      lessonTitle: recent.lesson.title,
      courseId,
      courseTitle: getProgrammeCourse(courseId)?.title ?? recent.lesson.section.module.course.title,
      lastViewedAt: recent.lastViewedAt.toISOString(),
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

  return {
    settings: {
      ...settings,
      dashboardWelcome: String(brandingPayload.dashboardWelcome ?? "Continue your professional training journey."),
    },
    metrics: {
      enrolledCourses: approved.length,
      pendingApprovals: programmeApplications.filter((entry) => entry.status === AcademyRegistrationStatus.PENDING_PAYMENT || entry.status === AcademyRegistrationStatus.PAYMENT_UPLOADED).length,
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
      verifyUrl: certificate.qrCodeUrl ?? `/api/v1/academy/certificates/verify/${encodeURIComponent(certificate.certificateNumber)}`,
      downloadUrl: certificate.pdfUrl ?? `/dashboard/academy/certificate/${certificate.id}`,
    })),
    programmeCourses: await getProgrammeProgressSummary(learnerId),
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
    applications: await Promise.all(programmeApplications.map(async (entry) => {
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
        referenceNumber: typeof ((entry.payment.metadata ?? {}) as Record<string, unknown>).referenceNumber === "string"
          ? String(((entry.payment.metadata ?? {}) as Record<string, unknown>).referenceNumber)
          : null,
      } : null,
      course: {
        id: entry.course.id,
        title: getProgrammeCourse(entry.course.id)?.title ?? entry.course.title,
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
            pdfUrl: lesson.pdfUrl ? toAcademyFileDownloadUrl(lesson.pdfUrl) : null,
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
          ? `Upload proof of payment for ${course.title}. You do not need to become a HouseLink agent to complete this training.`
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
  };
}

export async function getLearnerCourseDetail(learnerId: string, courseId: string, options?: { isAgent?: boolean }) {
  if (courseId === LEGACY_COURSE_ID || !PROGRAMME_COURSE_IDS.includes(courseId)) {
    return "NOT_FOUND" as const;
  }
  const prisma = getMainPrisma();
  const access = await canAccessProgrammeCourse(learnerId, courseId);
  if (!access.allowed) return "PREREQUISITE_NOT_MET" as const;

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

  const [quizAttempts, assignmentSubmissions, settings, bookmarkRows] = await Promise.all([
    prisma.quizAttempt.findMany({ where: { agentId: learnerId, quiz: { courseId } }, orderBy: { startedAt: "desc" } }),
    prisma.assignmentSubmission.findMany({ where: { agentId: learnerId, assignment: { courseId } }, orderBy: { submittedAt: "desc" } }),
    getAcademySettingsPublic(),
    prisma.lessonProgress.findMany({ where: { agentId: learnerId, status: "BOOKMARKED" }, select: { lessonId: true } }),
  ]);
  const bookmarkIds = new Set(bookmarkRows.map((row) => row.lessonId));

  const bestQuizScores = new Map<string, number>();
  for (const attempt of quizAttempts) {
    const score = Number(attempt.score);
    const current = bestQuizScores.get(attempt.quizId) ?? 0;
    if (score > current) bestQuizScores.set(attempt.quizId, score);
  }

  const programme = getProgrammeCourse(courseId);
  const toolkitRaw = await getToolkitGroupsForCourse(courseId, { cumulative: true });
  const toolkitAccess = await getToolkitAccessView(learnerId, courseId, Boolean(options?.isAgent));
  const toolkit = maskToolkitGroups(toolkitRaw, toolkitAccess);

  return {
    settings,
    programme: programme
      ? {
          theme: programme.theme,
          badgeName: programme.badgeName,
          certificateTitle: programme.certificateTitle,
          subtitle: programme.subtitle,
          assessmentSummary: programme.assessmentSummary,
          includes: programme.includes,
        }
      : null,
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
          lessons: section.lessons.map((lesson) => mapLessonForLearner(lesson, completedIds, bookmarkIds)),
        })),
        lessonCount: module.sections.reduce((sum, s) => sum + s.lessons.length, 0),
        completedCount: module.sections.reduce((sum, s) => sum + s.lessons.filter((l) => completedIds.has(l.id)).length, 0),
      })),
    },
    assessments: {
      summary: programme?.assessmentSummary ?? null,
      badgeName: programme?.badgeName ?? null,
      totals: {
        quizzes: programme?.quizIds.length ?? 0,
        quizzesPassed: course.quizzes.filter(
          (quiz) => programme?.quizIds.includes(quiz.id) && (bestQuizScores.get(quiz.id) ?? 0) >= quiz.passingPercentage,
        ).length,
        assignments: programme?.assignmentIds.length ?? 0,
        assignmentsSubmitted: course.assignments.filter(
          (assignment) => programme?.assignmentIds.includes(assignment.id) && assignmentSubmissions.some((s) => s.assignmentId === assignment.id),
        ).length,
        exams: programme?.requiresFinalExam ? course.finalExams.length : 0,
      },
      quizzes: course.quizzes
        .filter((quiz) => !programme?.quizIds.length || programme.quizIds.includes(quiz.id))
        .map((quiz) => {
          const meta = assessmentMetaForQuiz(quiz.id);
          return {
            id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            moduleTitle: meta?.moduleTitle ?? null,
            sortOrder: meta?.sortOrder ?? 0,
            passingPercentage: quiz.passingPercentage,
            timeLimitMinutes: quiz.timeLimitMinutes,
            questionCount: quiz.questions.length,
            bestScore: bestQuizScores.get(quiz.id) ?? null,
            passed: (bestQuizScores.get(quiz.id) ?? 0) >= quiz.passingPercentage,
          };
        })
        .sort((a, b) => a.sortOrder - b.sortOrder),
      assignments: course.assignments
        .filter((assignment) => !programme?.assignmentIds.length || programme.assignmentIds.includes(assignment.id))
        .map((assignment) => {
          const meta = assessmentMetaForAssignment(assignment.id);
          return {
            id: assignment.id,
            title: assignment.title,
            description: assignment.description,
            moduleTitle: meta?.moduleTitle ?? null,
            sortOrder: meta?.sortOrder ?? 0,
            points: assignment.points,
            dueDays: assignment.dueDays,
            submitted: assignmentSubmissions.some((s) => s.assignmentId === assignment.id),
            status: assignmentSubmissions.find((s) => s.assignmentId === assignment.id)?.status ?? null,
          };
        })
        .sort((a, b) => a.sortOrder - b.sortOrder),
      exams: programme?.requiresFinalExam
        ? course.finalExams.map((exam) => ({
            id: exam.id,
            title: exam.title,
            description: "Capstone examination covering Foundations, Listing & Client Mastery, and Professional Certification.",
            durationMinutes: exam.durationMinutes,
            passingScore: exam.passingScore,
            attemptLimit: exam.attemptLimit,
          }))
        : [],
      certificateCheckpoint: programme?.requiresFinalExam
        ? null
        : {
            title: "Programme Certificate Checkpoint",
            description: `Pass all ${programme?.quizIds.length ?? 0} module quizzes and submit all ${programme?.assignmentIds.length ?? 0} assignments to unlock your ${programme?.certificateTitle ?? "programme certificate"}.`,
          },
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
