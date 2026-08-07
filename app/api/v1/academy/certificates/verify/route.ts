import { ok, problem } from "@/lib/api/response";
import { getCertificate, verifyCertificate } from "@/lib/academy/certificate-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const certificateNumber = searchParams.get("certificateNumber");

    if (!certificateNumber) {
      return problem(400, "MISSING_CODE", "Certificate number is required.");
    }

    const isValid = await verifyCertificate(certificateNumber);

    if (!isValid) {
      return ok({
        valid: false,
        message: "Certificate is invalid, expired, or revoked.",
      });
    }

    const certificate = await getCertificate(certificateNumber);

    return ok({
      valid: true,
      certificate: {
        certificateNumber: certificate?.certificateNumber,
        courseId: certificate?.courseId || null,
        issuedAt: certificate?.issuedAt,
        expiresAt: certificate?.expiresAt,
        status: certificate?.status,
      },
    });
  } catch (error) {
    console.error("Failed to verify certificate:", error);
    return problem(500, "SERVER_ERROR", "Failed to verify certificate.");
  }
}
