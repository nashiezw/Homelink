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
    templateJson: Record<string, unknown>;
  } | null;
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
    },
  });

  return certificate;
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

