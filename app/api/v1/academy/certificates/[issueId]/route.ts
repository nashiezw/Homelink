import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getProgrammeCourse } from "@/lib/academy/academy-programme";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ issueId: string }> }) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to view this certificate.");

  const { issueId } = await context.params;
  const prisma = getMainPrisma();
  const issue = await prisma.certificateIssue.findUnique({
    where: { id: issueId },
    include: { course: true },
  });
  if (!issue || issue.status !== "ACTIVE") return problem(404, "NOT_FOUND", "Certificate not found.");
  if (issue.agentId !== userId) return problem(403, "FORBIDDEN", "This certificate belongs to another learner.");

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const programme = issue.courseId ? getProgrammeCourse(issue.courseId) : null;

  return ok({
    id: issue.id,
    certificateNumber: issue.certificateNumber,
    courseId: issue.courseId,
    courseTitle: issue.course?.title ?? "HouseLink Academy Course",
    certificateTitle: programme?.certificateTitle ?? "Certified HouseLink Agent",
    issuedAt: issue.issuedAt.toISOString(),
    expiresAt: issue.expiresAt?.toISOString() ?? null,
    verifyUrl: issue.qrCodeUrl ?? `/api/v1/academy/certificates/verify/${encodeURIComponent(issue.certificateNumber)}`,
    learnerName: user?.name ?? "HouseLink Learner",
    accent: programme?.theme.accent ?? "#008b68",
  });
}
