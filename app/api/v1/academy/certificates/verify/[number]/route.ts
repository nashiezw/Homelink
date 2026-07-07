import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ number: string }> }) {
  const { number } = await context.params;
  const certificateNumber = decodeURIComponent(number);
  if (!certificateNumber) return problem(400, "NUMBER_REQUIRED", "Certificate number is required.");

  try {
    const certificate = await getMainPrisma().certificateIssue.findUnique({
      where: { certificateNumber },
      include: { course: true, template: true },
    });
    if (!certificate) return problem(404, "NOT_FOUND", "Certificate not found.");
    if (certificate.status !== "ACTIVE") return problem(410, "REVOKED", "This certificate is no longer active.");

    return ok({
      valid: true,
      certificateNumber: certificate.certificateNumber,
      course: certificate.course?.title ?? null,
      issuedAt: certificate.issuedAt.toISOString(),
      expiresAt: certificate.expiresAt?.toISOString() ?? null,
      status: certificate.status,
    });
  } catch (error) {
    console.error("Certificate verification failed", error);
    return problem(500, "VERIFY_FAILED", "Certificate could not be verified.");
  }
}
