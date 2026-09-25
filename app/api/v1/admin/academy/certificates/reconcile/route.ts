import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { getCertificateEligibility } from "@/lib/academy/certificate-eligibility";
import { tryCompleteCourseCertification } from "@/lib/academy/academy-progress";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const learnerId = typeof body.learnerId === "string" ? body.learnerId.trim() : "";
  const courseId = typeof body.courseId === "string" ? body.courseId.trim() : "";
  if (!learnerId || !courseId) return problem(400, "INVALID_REQUEST", "Learner and course are required.");

  const prisma = getMainPrisma();
  const enrolment = await prisma.courseEnrolment.findUnique({
    where: { courseId_agentId: { courseId, agentId: learnerId } },
    select: { courseId: true, agentId: true },
  });
  if (!enrolment) return problem(404, "ENROLMENT_NOT_FOUND", "The learner is not enrolled in this course.");

  try {
    const before = await getCertificateEligibility(learnerId, courseId);
    const certificate = await tryCompleteCourseCertification(learnerId, courseId);
    const after = await getCertificateEligibility(learnerId, courseId);
    await prisma.auditEvent.create({
      data: {
        actorId: getSessionUserIdFromRequest(request),
        action: "ACADEMY_CERTIFICATE_RECONCILED",
        target: `CourseEnrolment:${learnerId}:${courseId}`,
        metadata: {
          beforeStatus: before?.status ?? null,
          afterStatus: after?.status ?? null,
          certificateIssued: Boolean(certificate),
        },
      },
    });
    return ok({ certificateIssued: Boolean(certificate), eligibility: after });
  } catch (error) {
    console.error("Certificate reconciliation failed", error);
    return problem(500, "CERTIFICATE_RECONCILIATION_FAILED", "Certificate eligibility could not be rechecked.");
  }
}
