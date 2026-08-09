import { getMainPrisma } from "@/lib/db/main-prisma";
import { randomBytes } from "crypto";

export interface CertificateIssue {
  id: string;
  certificateNumber: string;
  courseId: string | null;
  agentId: string;
  templateId: string | null;
  qrCodeUrl: string | null;
  pdfUrl: string | null;
  status: string;
  issuedAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  course?: {
    title: string;
  } | null;
  template?: {
    name: string;
    backgroundUrl: string | null;
    logoUrl: string | null;
    signatureUrl: string | null;
    templateJson: Record<string, unknown>;
  } | null;
  learnerName?: string | null;
}

export interface CreateCertificateIssueInput {
  courseId: string;
  agentId: string;
  templateId?: string;
}

export async function generateCertificate(
  courseId: string,
  agentId: string,
  templateId?: string
): Promise<CertificateIssue> {
  const prisma = getMainPrisma();
  
  // Check if certificate already exists
  const existing = await prisma.certificateIssue.findFirst({
    where: {
      courseId,
      agentId,
      status: "ACTIVE",
    },
  });

  if (existing) {
    return existing;
  }

  // Generate unique certificate number
  const certificateNumber = generateCertificateNumber();

  const certificate = await prisma.certificateIssue.create({
    data: {
      certificateNumber,
      courseId,
      agentId,
      templateId,
      status: "ACTIVE",
    },
  });

  return certificate;
}

export async function getCertificate(certificateNumber: string): Promise<CertificateIssue | null> {
  const prisma = getMainPrisma();
  
  const certificate = await prisma.certificateIssue.findUnique({
    where: { certificateNumber },
    include: {
      course: {
        select: {
          title: true,
        },
      },
      template: {
        select: {
          name: true,
          backgroundUrl: true,
          logoUrl: true,
          signatureUrl: true,
          templateJson: true,
        },
      },
    },
  });

  if (!certificate) return null;

  const [learner, fallbackTemplate] = await Promise.all([
    prisma.user.findUnique({ where: { id: certificate.agentId }, select: { name: true } }),
    certificate.template || !certificate.courseId
      ? Promise.resolve(null)
      : prisma.certificateTemplate.findMany({ where: { active: true }, orderBy: { updatedAt: "desc" } }).then((templates) => selectCertificateTemplateForCourse(templates, certificate.courseId!)),
  ]);

  return {
    ...certificate,
    learnerName: learner?.name ?? null,
    template: normaliseCertificateTemplate(certificate.template ?? fallbackTemplate),
  };
}

export async function getAgentCertificates(agentId: string): Promise<CertificateIssue[]> {
  const prisma = getMainPrisma();
  
  const certificates = await prisma.certificateIssue.findMany({
    where: { agentId },
    include: {
      course: {
        select: {
          title: true,
        },
      },
    },
    orderBy: { issuedAt: "desc" },
  });

  return certificates;
}

export async function getCourseCertificates(courseId: string): Promise<CertificateIssue[]> {
  const prisma = getMainPrisma();
  
  const certificates = await prisma.certificateIssue.findMany({
    where: { courseId },
    include: {
      course: {
        select: {
          title: true,
        },
      },
    },
    orderBy: { issuedAt: "desc" },
  });

  return certificates;
}

export async function updateCertificate(
  id: string,
  pdfUrl?: string,
  qrCodeUrl?: string
): Promise<CertificateIssue> {
  const prisma = getMainPrisma();
  
  const certificate = await prisma.certificateIssue.update({
    where: { id },
    data: {
      ...(pdfUrl && { pdfUrl }),
      ...(qrCodeUrl && { qrCodeUrl }),
    },
  });

  return certificate;
}

export async function revokeCertificate(id: string): Promise<CertificateIssue> {
  const prisma = getMainPrisma();
  
  const certificate = await prisma.certificateIssue.update({
    where: { id },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
    },
  });

  return certificate;
}

export async function verifyCertificate(certificateNumber: string): Promise<boolean> {
  const prisma = getMainPrisma();
  
  const certificate = await prisma.certificateIssue.findUnique({
    where: { certificateNumber },
  });

  if (!certificate) {
    return false;
  }

  // Check if certificate is active and not expired
  if (certificate.status !== "ACTIVE") {
    return false;
  }

  if (certificate.expiresAt && certificate.expiresAt < new Date()) {
    return false;
  }

  return true;
}

function generateCertificateNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(4).toString("hex").toUpperCase();
  return `CERT-${timestamp}-${random}`;
}

function selectCertificateTemplateForCourse<T extends { templateJson: unknown }>(templates: T[], courseId: string): T | null {
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

function normaliseCertificateTemplate(
  template: {
    name: string;
    backgroundUrl: string | null;
    logoUrl: string | null;
    signatureUrl: string | null;
    templateJson: unknown;
  } | null
) {
  if (!template) return null;
  const templateJson = template.templateJson && typeof template.templateJson === "object" && !Array.isArray(template.templateJson)
    ? (template.templateJson as Record<string, unknown>)
    : {};

  return {
    name: template.name,
    backgroundUrl: template.backgroundUrl,
    logoUrl: template.logoUrl,
    signatureUrl: template.signatureUrl,
    templateJson,
  };
}
