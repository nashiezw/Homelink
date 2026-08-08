import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await context.params;
  const body = await request.json();
  const { status, grade, reviewerNote } = body;

  if (!status || !["APPROVED", "REJECTED"].includes(status)) {
    return problem(400, "INVALID_STATUS", "Status must be APPROVED or REJECTED");
  }

  const prisma = getMainPrisma();
  const actorId = getSessionUserIdFromRequest(request);

  try {
    const submission = await prisma.assignmentSubmission.update({
      where: { id },
      data: {
        status,
        grade: grade !== undefined ? parseFloat(grade) : null,
        reviewerNote: reviewerNote || null,
        reviewedAt: new Date(),
      },
      include: {
        assignment: true,
      },
    });

    // Fetch agent details separately
    const agent = await prisma.user.findUnique({
      where: { id: submission.agentId },
      select: { name: true, email: true },
    });

    // Create notification for the student
    await prisma.trainingNotification.create({
      data: {
        userId: submission.agentId,
        eventType: "ASSIGNMENT_REVIEWED",
        channel: "IN_APP",
        subject: `Assignment ${status.toLowerCase()}`,
        body: `Your submission for ${submission.assignment.title} has been ${status.toLowerCase()}. ${grade ? `Grade: ${grade}` : ""}`,
      },
    });

    // Log audit event
    await prisma.auditEvent.create({
      data: {
        actorId,
        action: `ASSIGNMENT_${status}`,
        target: `AssignmentSubmission:${id}`,
        metadata: {
          assignmentId: submission.assignmentId,
          agentId: submission.agentId,
          grade,
          reviewerNote,
        } as any,
      },
    });

    return ok({ ...submission, agent });
  } catch (error) {
    console.error("Failed to update assignment submission:", error);
    return problem(500, "SERVER_ERROR", "Failed to update submission");
  }
}
