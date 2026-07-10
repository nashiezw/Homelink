import {
  AcademyRegistrationStatus,
  AcademyResourceKind,
  PaymentProvider,
  PaymentStatus,
  TrainingCourseStatus,
  type Prisma,
} from "@prisma/client";
import { ACADEMY_FULL_MANUAL_URL, isFullTrainingManualUrl } from "@/lib/academy/academy-constants";
import { PROGRAMME_COURSE_IDS } from "@/lib/academy/academy-programme";
import { loadAcademyManifest, toolkitTitlesForCourse, type ToolkitGroup } from "@/lib/academy/academy-toolkits";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const ACADEMY_MANUAL_RESOURCE_KEY = "training-manual";

export type ResourceAccessSettings = {
  manualPublicPrice: number;
  manualAgentPrice: number;
  manualSalesEnabled: boolean;
};

export type ResourceAccessView = {
  unlocked: boolean;
  salesEnabled: boolean;
  price: number;
  currency: string;
  status: AcademyRegistrationStatus | null;
  accessId: string | null;
  paymentId: string | null;
  paymentMethod: string | null;
  referenceNumber: string | null;
  proofUrl: string | null;
  adminNote: string | null;
};

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "ACADEMY_ADMIN"]);

export function isAcademyAdminRole(roles: string[] | undefined) {
  return roles?.some((role) => ADMIN_ROLES.has(role)) ?? false;
}

export function toolkitResourceKey(courseId: string) {
  return `toolkit:${courseId}`;
}

export function parseResourceAccessSettings(payload: Record<string, unknown> | null | undefined): ResourceAccessSettings {
  const resourceAccess = (payload?.resourceAccess ?? {}) as Record<string, unknown>;
  return {
    manualPublicPrice: Number(resourceAccess.manualPublicPrice ?? 35),
    manualAgentPrice: Number(resourceAccess.manualAgentPrice ?? 15),
    manualSalesEnabled: resourceAccess.manualSalesEnabled !== false,
  };
}

function resolveToolkitPrice(
  course: { toolkitPublicPrice: Prisma.Decimal; toolkitAgentPrice: Prisma.Decimal; currency: string; toolkitSalesEnabled: boolean },
  isAgent: boolean,
) {
  const price = isAgent ? Number(course.toolkitAgentPrice) : Number(course.toolkitPublicPrice);
  return { price, currency: course.currency, salesEnabled: course.toolkitSalesEnabled };
}

function resolveManualPrice(settings: ResourceAccessSettings, isAgent: boolean) {
  return {
    price: isAgent ? settings.manualAgentPrice : settings.manualPublicPrice,
    currency: "USD",
    salesEnabled: settings.manualSalesEnabled,
  };
}

export async function getResourceAccessSettings() {
  const settings = await getMainPrisma().trainingSetting.findUnique({ where: { id: "singleton" } });
  const payload = (settings?.payload ?? {}) as Record<string, unknown>;
  return parseResourceAccessSettings(payload);
}

export async function listLearnerResourceAccess(learnerId: string) {
  return getMainPrisma().academyResourceAccess.findMany({
    where: { learnerId },
    include: { course: true, payment: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getApprovedResourceKeys(learnerId: string) {
  const rows = await getMainPrisma().academyResourceAccess.findMany({
    where: { learnerId, status: AcademyRegistrationStatus.APPROVED },
    select: { resourceKey: true },
  });
  return new Set(rows.map((row) => row.resourceKey));
}

export async function resolveToolkitFileFromPath(relativePath: string) {
  if (!relativePath.startsWith("resources/")) return null;
  const fileName = relativePath.split("/").pop();
  if (!fileName) return null;
  const manifest = await loadAcademyManifest();
  const row = manifest.find((entry) => entry.fileName === fileName || entry.fileUrl.includes(fileName));
  if (!row || isFullTrainingManualUrl(row.fileUrl)) return null;
  return { title: row.title, fileName: row.fileName };
}

export function courseIdsGrantingToolkitTitle(title: string) {
  return PROGRAMME_COURSE_IDS.filter((courseId) => toolkitTitlesForCourse(courseId, true).includes(title));
}

export async function canDownloadAcademyPath(input: {
  relativePath: string;
  userId: string | null;
  roles?: string[];
}) {
  if (isAcademyAdminRole(input.roles)) return true;

  if (isFullTrainingManualUrl(`/uploads/academy/${input.relativePath}`) || input.relativePath.includes("homelink-zimbabwe-real-estate-agent-training-manual.pdf")) {
    if (!input.userId) return false;
    const approved = await getApprovedResourceKeys(input.userId);
    return approved.has(ACADEMY_MANUAL_RESOURCE_KEY);
  }

  const toolkitFile = await resolveToolkitFileFromPath(input.relativePath);
  if (!toolkitFile) return true;

  if (!input.userId) return false;
  const approved = await getApprovedResourceKeys(input.userId);
  return courseIdsGrantingToolkitTitle(toolkitFile.title).some((courseId) => approved.has(toolkitResourceKey(courseId)));
}

export async function getToolkitAccessView(learnerId: string, courseId: string, isAgent: boolean): Promise<ResourceAccessView> {
  const prisma = getMainPrisma();
  const [course, access] = await Promise.all([
    prisma.trainingCourse.findUnique({ where: { id: courseId } }),
    prisma.academyResourceAccess.findUnique({
      where: { learnerId_resourceKey: { learnerId, resourceKey: toolkitResourceKey(courseId) } },
      include: { payment: true },
    }),
  ]);
  if (!course) {
    return { unlocked: false, salesEnabled: false, price: 0, currency: "USD", status: null, accessId: null, paymentId: null, paymentMethod: null, referenceNumber: null, proofUrl: null, adminNote: null };
  }
  const pricing = resolveToolkitPrice(course, isAgent);
  const unlocked = access?.status === AcademyRegistrationStatus.APPROVED;
  return {
    unlocked,
    salesEnabled: pricing.salesEnabled,
    price: pricing.price,
    currency: pricing.currency,
    status: access?.status ?? null,
    accessId: access?.id ?? null,
    paymentId: access?.paymentId ?? null,
    paymentMethod: access?.payment?.method ?? null,
    referenceNumber: paymentReference(access?.payment?.metadata),
    proofUrl: access?.proofUrl ?? access?.payment?.proofUrl ?? null,
    adminNote: access?.adminNote ?? null,
  };
}

export async function getManualAccessView(learnerId: string, isAgent: boolean): Promise<ResourceAccessView> {
  const prisma = getMainPrisma();
  const [access, settings] = await Promise.all([
    prisma.academyResourceAccess.findUnique({
      where: { learnerId_resourceKey: { learnerId, resourceKey: ACADEMY_MANUAL_RESOURCE_KEY } },
      include: { payment: true },
    }),
    getResourceAccessSettings(),
  ]);
  const pricing = resolveManualPrice(settings, isAgent);
  const unlocked = access?.status === AcademyRegistrationStatus.APPROVED;
  return {
    unlocked,
    salesEnabled: pricing.salesEnabled,
    price: pricing.price,
    currency: pricing.currency,
    status: access?.status ?? null,
    accessId: access?.id ?? null,
    paymentId: access?.paymentId ?? null,
    paymentMethod: access?.payment?.method ?? null,
    referenceNumber: paymentReference(access?.payment?.metadata),
    proofUrl: access?.proofUrl ?? access?.payment?.proofUrl ?? null,
    adminNote: access?.adminNote ?? null,
  };
}

function paymentReference(metadata: Prisma.JsonValue | null | undefined) {
  const value = (metadata ?? {}) as Record<string, unknown>;
  return typeof value.referenceNumber === "string" ? value.referenceNumber : null;
}

export function maskToolkitGroups(groups: ToolkitGroup[], access: ResourceAccessView) {
  if (access.unlocked) return groups;
  return groups.map((group) => ({
    ...group,
    items: group.items.map(({ fileUrl: _fileUrl, ...item }) => ({ ...item, locked: true as const, fileUrl: undefined })),
  }));
}

export function previewToolkitGroups(groups: ToolkitGroup[]) {
  return groups.map((group) => ({
    ...group,
    items: group.items.map(({ fileUrl: _fileUrl, fileName: _fileName, ...item }) => item),
  }));
}

export async function registerResourceAccess(input: {
  learnerId: string;
  resourceKind: AcademyResourceKind;
  courseId?: string;
  fullName: string;
  email: string;
  phone?: string;
  isAgent?: boolean;
  paymentMethod?: string;
}) {
  const prisma = getMainPrisma();
  const settings = await getResourceAccessSettings();
  const learnerType = input.isAgent ? "AGENT" : "PUBLIC_LEARNER";
  const resourceKey =
    input.resourceKind === AcademyResourceKind.TRAINING_MANUAL
      ? ACADEMY_MANUAL_RESOURCE_KEY
      : toolkitResourceKey(String(input.courseId ?? ""));

  if (input.resourceKind === AcademyResourceKind.COURSE_TOOLKIT) {
    if (!input.courseId || !PROGRAMME_COURSE_IDS.includes(input.courseId)) return "RESOURCE_NOT_AVAILABLE" as const;
    const course = await prisma.trainingCourse.findFirst({
      where: { id: input.courseId, status: TrainingCourseStatus.PUBLISHED },
    });
    if (!course || !course.toolkitSalesEnabled) return "RESOURCE_NOT_AVAILABLE" as const;
    const pricing = resolveToolkitPrice(course, Boolean(input.isAgent));
    const existing = await prisma.academyResourceAccess.findUnique({
      where: { learnerId_resourceKey: { learnerId: input.learnerId, resourceKey } },
      include: { payment: true },
    });
    if (existing) return existing;

    const payableAmount = pricing.price;
    const payment = await prisma.payment.create({
      data: {
        userId: input.learnerId,
        provider: PaymentProvider.PAYNOW,
        status: payableAmount > 0 ? PaymentStatus.PENDING : PaymentStatus.PAID,
        amount: payableAmount,
        currency: pricing.currency,
        description: `${course.title} field toolkit`,
        plan: "academy_resource",
        method: input.paymentMethod || "bank_transfer",
        manual: payableAmount > 0,
        proofStatus: payableAmount > 0 ? "REQUESTED" : "NONE",
        metadata: {
          resourceKind: input.resourceKind,
          courseId: course.id,
          resourceKey,
          referenceNumber: `HLA-TK-${Date.now()}`,
        } as Prisma.InputJsonObject,
      },
    });
    const now = new Date();
    const isFree = payableAmount <= 0;
    const access = await prisma.academyResourceAccess.create({
      data: {
        learnerId: input.learnerId,
        resourceKind: input.resourceKind,
        resourceKey,
        courseId: course.id,
        paymentId: payment.id,
        learnerType,
        status: isFree ? AcademyRegistrationStatus.APPROVED : AcademyRegistrationStatus.PENDING_PAYMENT,
        fullName: input.fullName,
        email: input.email.trim().toLowerCase(),
        phone: input.phone || null,
        amount: payableAmount,
        currency: pricing.currency,
        accessStartsAt: isFree ? now : null,
        accessEndsAt: null,
        approvedAt: isFree ? now : null,
      },
    });
    await prisma.trainingNotification.create({
      data: {
        userId: input.learnerId,
        eventType: "ACADEMY_RESOURCE_REGISTRATION",
        channel: "IN_APP",
        subject: isFree ? "Toolkit access activated" : "Toolkit payment pending",
        body: isFree
          ? `${course.title} field toolkit downloads are now unlocked.`
          : `Upload proof of payment to unlock the ${course.title} field toolkit.`,
      },
    });
    return access;
  }

  if (!settings.manualSalesEnabled) return "RESOURCE_NOT_AVAILABLE" as const;
  const existing = await prisma.academyResourceAccess.findUnique({
    where: { learnerId_resourceKey: { learnerId: input.learnerId, resourceKey } },
    include: { payment: true },
  });
  if (existing) return existing;

  const pricing = resolveManualPrice(settings, Boolean(input.isAgent));
  const payableAmount = pricing.price;
  const payment = await prisma.payment.create({
    data: {
      userId: input.learnerId,
      provider: PaymentProvider.PAYNOW,
      status: payableAmount > 0 ? PaymentStatus.PENDING : PaymentStatus.PAID,
      amount: payableAmount,
      currency: pricing.currency,
      description: "HomeLink complete training manual",
      plan: "academy_resource",
      method: input.paymentMethod || "bank_transfer",
      manual: payableAmount > 0,
      proofStatus: payableAmount > 0 ? "REQUESTED" : "NONE",
      metadata: {
        resourceKind: input.resourceKind,
        resourceKey,
        referenceNumber: `HLA-MN-${Date.now()}`,
      } as Prisma.InputJsonObject,
    },
  });
  const now = new Date();
  const isFree = payableAmount <= 0;
  const access = await prisma.academyResourceAccess.create({
    data: {
      learnerId: input.learnerId,
      resourceKind: AcademyResourceKind.TRAINING_MANUAL,
      resourceKey,
      paymentId: payment.id,
      learnerType,
      status: isFree ? AcademyRegistrationStatus.APPROVED : AcademyRegistrationStatus.PENDING_PAYMENT,
      fullName: input.fullName,
      email: input.email.trim().toLowerCase(),
      phone: input.phone || null,
      amount: payableAmount,
      currency: pricing.currency,
      accessStartsAt: isFree ? now : null,
      accessEndsAt: null,
      approvedAt: isFree ? now : null,
    },
  });
  await prisma.trainingNotification.create({
    data: {
      userId: input.learnerId,
      eventType: "ACADEMY_RESOURCE_REGISTRATION",
      channel: "IN_APP",
      subject: isFree ? "Training manual unlocked" : "Training manual payment pending",
      body: isFree
        ? "The complete HomeLink training manual is now available to download."
        : "Upload proof of payment to unlock the complete training manual.",
    },
  });
  return access;
}

export async function attachResourceAccessProof(paymentId: string, learnerId: string, proofUrl: string) {
  const prisma = getMainPrisma();
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return null;
  if (payment.userId !== learnerId) return "FORBIDDEN" as const;
  const access = await prisma.academyResourceAccess.findFirst({ where: { paymentId, learnerId } });
  if (!access) return "NOT_RESOURCE_PAYMENT" as const;
  const [updated] = await prisma.$transaction([
    prisma.academyResourceAccess.update({
      where: { id: access.id },
      data: { proofUrl, status: AcademyRegistrationStatus.PAYMENT_UPLOADED },
    }),
    prisma.payment.update({ where: { id: paymentId }, data: { proofUrl, proofStatus: "UPLOADED" } }),
  ]);
  return updated;
}

export async function reviewResourceAccessApplication(input: {
  accessId: string;
  actorId: string;
  status: "APPROVED" | "REJECTED" | "REFUNDED" | "EXPIRED";
  adminNote?: string;
}) {
  const prisma = getMainPrisma();
  const access = await prisma.academyResourceAccess.findUnique({
    where: { id: input.accessId },
    include: { course: true },
  });
  if (!access) return null;
  const now = new Date();
  const approved = input.status === "APPROVED";
  const updated = await prisma.academyResourceAccess.update({
    where: { id: access.id },
    data: {
      status: input.status,
      adminNote: input.adminNote || null,
      approvedById: approved ? input.actorId : access.approvedById,
      approvedAt: approved ? now : access.approvedAt,
      rejectedAt: input.status === "REJECTED" ? now : access.rejectedAt,
      accessStartsAt: approved ? now : access.accessStartsAt,
    },
  });
  if (access.paymentId) {
    await prisma.payment.update({
      where: { id: access.paymentId },
      data: {
        status: approved ? PaymentStatus.PAID : input.status === "REFUNDED" ? PaymentStatus.REFUNDED : PaymentStatus.PENDING,
        proofStatus: approved ? "VERIFIED" : input.status === "REJECTED" ? "REJECTED" : undefined,
      },
    });
  }
  const label =
    access.resourceKind === AcademyResourceKind.TRAINING_MANUAL
      ? "Complete training manual"
      : `${access.course?.title ?? "Course"} field toolkit`;
  await prisma.trainingNotification.create({
    data: {
      userId: access.learnerId,
      eventType: `ACADEMY_RESOURCE_${input.status}`,
      channel: "IN_APP",
      subject: approved ? "Resource access approved" : "Resource access updated",
      body: approved
        ? `${label} is now unlocked in your Academy dashboard.`
        : input.adminNote || `Your request for ${label} is ${input.status.toLowerCase()}.`,
    },
  });
  await prisma.trainingAuditLog.create({
    data: {
      actorId: input.actorId,
      action: `academy.resource_access.${input.status.toLowerCase()}`,
      target: access.id,
      metadata: { resourceKind: access.resourceKind, courseId: access.courseId, learnerId: access.learnerId } as Prisma.InputJsonObject,
    },
  });
  return updated;
}

export function manualDownloadPath() {
  return ACADEMY_FULL_MANUAL_URL.replace("/uploads/academy/", "");
}
