import { createHash } from "crypto";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";

export type SignatureInput = {
  subjectType: string;
  subjectId: string;
  listingId?: string;
  title: string;
  signerUserId?: string;
  signerName: string;
  signerEmail?: string;
  signerRole: string;
  signatureText: string;
  agreementText: string;
  ipAddress?: string;
  userAgent?: string;
  signatureImageDataUrl?: string;
};

export function shouldUsePostgresSignatures() {
  return isPostgresStoreEnabled();
}

export async function createSignedAgreement(input: SignatureInput) {
  const signedAt = new Date();
  const contentHash = createHash("sha256")
    .update([input.title, input.agreementText, input.signerName, input.signatureText, signedAt.toISOString()].join("\n"))
    .digest("hex");
  const pdfBase64 = createSignedAgreementPdfBase64({ ...input, contentHash, signedAt });
  const row = await getMainPrisma().signedAgreement.create({
    data: {
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      listingId: input.listingId,
      title: input.title,
      signerUserId: input.signerUserId,
      signerName: input.signerName,
      signerEmail: input.signerEmail,
      signerRole: input.signerRole,
      signatureText: input.signatureText,
      agreementText: input.agreementText,
      contentHash,
      pdfBase64,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      signedAt,
      metadata: {
        generatedBy: "HouseLink Zimbabwe",
        signatureMethod: input.signatureImageDataUrl ? "ELECTRONIC_DRAWN_AND_TYPED_SIGNATURE" : "ELECTRONIC_TYPED_SIGNATURE",
        visualSignatureCaptured: Boolean(input.signatureImageDataUrl),
        visualSignatureSha256: input.signatureImageDataUrl
          ? createHash("sha256").update(input.signatureImageDataUrl).digest("hex")
          : undefined,
      },
    },
  });
  return toSignedAgreement(row);
}

export async function getSignedAgreement(id: string) {
  const row = await getMainPrisma().signedAgreement.findUnique({ where: { id } });
  return row ? toSignedAgreement(row) : null;
}

export async function listSignedAgreements(filters: { subjectType?: string; subjectId?: string; listingId?: string } = {}) {
  const rows = await getMainPrisma().signedAgreement.findMany({
    where: {
      ...(filters.subjectType ? { subjectType: filters.subjectType } : {}),
      ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
      ...(filters.listingId ? { listingId: filters.listingId } : {}),
    },
    orderBy: { signedAt: "desc" },
    take: 100,
  });
  return rows.map(toSignedAgreement);
}

function createSignedAgreementPdfBase64(input: SignatureInput & { contentHash: string; signedAt: Date }) {
  const lines = [
    "HouseLink Zimbabwe Signed Agreement",
    input.title,
    "",
    `Signer: ${input.signerName}`,
    `Role: ${input.signerRole}`,
    input.signerEmail ? `Email: ${input.signerEmail}` : "",
    `Signed at: ${input.signedAt.toISOString()}`,
    `Content hash: ${input.contentHash}`,
    "Audit certificate: signer identity, timestamp, IP/device metadata, signature method, and content hash are stored with this record.",
    input.ipAddress ? `IP address: ${input.ipAddress}` : "",
    input.userAgent ? `Device: ${input.userAgent.slice(0, 80)}` : "",
    input.signatureImageDataUrl ? "Visual signature: captured and hashed in audit metadata" : "Visual signature: not captured",
    "",
    ...input.agreementText.split(/\r?\n/).slice(0, 22),
    "",
    `Electronic signature: ${input.signatureText}`,
  ].filter(Boolean);
  const body = lines.map((line, index) => `BT /F1 10 Tf 50 ${760 - index * 18} Td (${escapePdf(line.slice(0, 92))}) Tj ET`).join("\n");
  const stream = `${body}\n`;
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}endstream endobj`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${object}\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf).toString("base64");
}

function escapePdf(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function toSignedAgreement(row: {
  id: string;
  subjectType: string;
  subjectId: string;
  listingId: string | null;
  title: string;
  signerUserId: string | null;
  signerName: string;
  signerEmail: string | null;
  signerRole: string;
  signatureText: string;
  agreementText: string;
  contentHash: string;
  pdfBase64: string;
  ipAddress: string | null;
  userAgent: string | null;
  signedAt: Date;
  createdAt: Date;
}) {
  return {
    id: row.id,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    listingId: row.listingId ?? undefined,
    title: row.title,
    signerUserId: row.signerUserId ?? undefined,
    signerName: row.signerName,
    signerEmail: row.signerEmail ?? undefined,
    signerRole: row.signerRole,
    signatureText: row.signatureText,
    agreementText: row.agreementText,
    contentHash: row.contentHash,
    downloadUrl: `/api/v1/signatures/${row.id}/download`,
    ipAddress: row.ipAddress ?? undefined,
    userAgent: row.userAgent ?? undefined,
    signedAt: row.signedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}
