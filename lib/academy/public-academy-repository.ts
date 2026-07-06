import { AcademyRegistrationStatus, PaymentProvider, PaymentStatus, Role, TrainingCourseStatus, TrainingVisibility, type Prisma } from "@prisma/client";
import { getMainPrisma } from "@/lib/db/main-prisma";

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
    price: Number(course.price),
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
  const [applications, notifications, documents, announcements] = await Promise.all([
    prisma.academyLearnerApplication.findMany({
      where: { learnerId },
      include: {
        course: { include: { modules: { include: { sections: { include: { lessons: true } } } } } },
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
  ]);

  const approved = applications.filter((entry) => entry.status === AcademyRegistrationStatus.APPROVED);
  const totalLessons = approved.reduce((sum, entry) => sum + countLessons(entry.course), 0);
  return {
    metrics: {
      enrolledCourses: approved.length,
      pendingApprovals: applications.filter((entry) => entry.status === AcademyRegistrationStatus.PENDING_PAYMENT || entry.status === AcademyRegistrationStatus.PAYMENT_UPLOADED).length,
      certificates: approved.filter((entry) => entry.course.certificateEnabled).length,
      downloads: documents.length,
      totalLessons,
      progress: totalLessons ? 0 : 0,
    },
    applications: applications.map((entry) => ({
      id: entry.id,
      status: entry.status,
      amount: Number(entry.amount),
      currency: entry.currency,
      proofUrl: entry.proofUrl,
      accessStartsAt: entry.accessStartsAt?.toISOString(),
      accessEndsAt: entry.accessEndsAt?.toISOString(),
      adminNote: entry.adminNote,
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
        description: entry.course.description,
        certificateEnabled: entry.course.certificateEnabled,
        modules: entry.course.modules.map((module) => ({
          id: module.id,
          title: module.title,
          lessons: module.sections.flatMap((section) => section.lessons.map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            summary: lesson.summary,
            estimatedMinutes: lesson.estimatedMinutes,
            videoUrl: lesson.videoUrl ?? lesson.embeddedVideoUrl,
            pdfUrl: lesson.pdfUrl,
          }))),
        })),
      },
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

  const payment = await prisma.payment.create({
    data: {
      userId: input.learnerId,
      provider: PaymentProvider.PAYNOW,
      status: Number(course.price) > 0 ? PaymentStatus.PENDING : PaymentStatus.PAID,
      amount: course.price,
      currency: course.currency,
      description: `${course.title} Academy enrolment`,
      plan: "academy_course",
      method: input.paymentMethod || "bank_transfer",
      manual: Number(course.price) > 0,
      proofStatus: Number(course.price) > 0 ? "REQUESTED" : "NONE",
      metadata: { courseId: course.id, learnerType: "PUBLIC_LEARNER", referenceNumber: `HLA-${Date.now()}` } as Prisma.InputJsonObject,
    },
  });
  const now = new Date();
  const isFree = Number(course.price) <= 0;
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
      amount: course.price,
      currency: course.currency,
      accessStartsAt: isFree ? now : null,
      accessEndsAt: isFree ? accessEndsAt : null,
    },
  });

  const user = await prisma.user.findUnique({ where: { id: input.learnerId }, select: { roles: true } });
  if (user && !user.roles.includes(Role.PUBLIC_LEARNER)) {
    await prisma.user.update({ where: { id: input.learnerId }, data: { roles: [...user.roles, Role.PUBLIC_LEARNER] } });
  }
  await prisma.trainingNotification.create({
    data: {
      userId: input.learnerId,
      eventType: "ACADEMY_REGISTRATION",
      channel: "IN_APP",
      subject: isFree ? "Academy access activated" : "Academy payment pending",
      body: isFree ? `${course.title} is active in your learner dashboard.` : `Upload proof of payment for ${course.title} so an admin can activate your access.`,
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
