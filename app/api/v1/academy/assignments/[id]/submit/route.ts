import { AssignmentSubmissionStatus } from "@prisma/client";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to submit an assignment.");

  const { id: assignmentId } = await context.params;
  const body = await request.json();
  const notes = typeof body.notes === "string" ? body.notes : undefined;
  const fileUrls = Array.isArray(body.fileUrls) ? body.fileUrls.filter((url: unknown) => typeof url === "string") : [];

  try {
    const prisma = getMainPrisma();
    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment || assignment.active === false) return problem(404, "ASSIGNMENT_NOT_FOUND", "Assignment not found.");
    if (assignment.courseId) {
      const enrolment = await prisma.courseEnrolment.findUnique({
        where: { courseId_agentId: { courseId: assignment.courseId, agentId: userId } },
      });
      if (!enrolment || enrolment.status !== "ACTIVE") return problem(403, "NOT_ENROLLED", "Enrol in this course to submit assignments.");
    }
    const submission = await prisma.assignmentSubmission.create({
      data: {
        assignmentId,
        agentId: userId,
        status: AssignmentSubmissionStatus.SUBMITTED,
        notes: notes ?? null,
        fileUrls,
      },
    });

    await prisma.trainingNotification.create({
      data: {
        userId,
        eventType: "ASSIGNMENT_SUBMITTED",
        channel: "IN_APP",
        subject: "Assignment submitted",
        body: `Your submission for ${assignment.title} is awaiting review.`,
      },
    });

    return ok(submission);
  } catch (error) {
    console.error("Assignment submission failed", error);
    return problem(500, "ASSIGNMENT_SUBMIT_FAILED", "Assignment could not be submitted.");
  }
}
