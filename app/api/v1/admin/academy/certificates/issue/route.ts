import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { issueCertificateIfMissing } from "@/lib/academy/academy-progress";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to issue certificates.");

  try {
    const body = await request.json();
    const { courseId, agentId, force } = body;

    if (!courseId || !agentId) {
      return problem(400, "MISSING_FIELDS", "courseId and agentId are required.");
    }

    console.log(`[Certificate] Manual certificate issuance requested for agent ${agentId}, course ${courseId}, force: ${force}`);

    const prisma = getMainPrisma();
    
    // Check if certificate already exists
    const existing = await prisma.certificateIssue.findFirst({
      where: { courseId, agentId, status: "ACTIVE" },
    });

    if (existing && !force) {
      return ok({
        message: "Certificate already exists",
        certificate: existing,
      });
    }

    // If force is true, revoke existing certificate first
    if (existing && force) {
      await prisma.certificateIssue.update({
        where: { id: existing.id },
        data: { status: "REVOKED", revokedAt: new Date() },
      });
      console.log(`[Certificate] Existing certificate revoked: ${existing.certificateNumber}`);
    }

    // Use the enhanced certificate issuance function
    const certificate = await issueCertificateIfMissing(agentId, courseId);

    if (!certificate) {
      return problem(400, "ISSUANCE_FAILED", "Failed to issue certificate. Check course configuration and student progress.");
    }

    return ok({
      message: "Certificate issued successfully",
      certificate,
    });
  } catch (error) {
    console.error("Failed to issue certificate:", error);
    return problem(500, "SERVER_ERROR", "Failed to issue certificate.");
  }
}
