import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { tryCompleteCourseCertification } from "@/lib/academy/academy-progress";
import { DEFAULT_COURSE_RETAKE_RULES, attemptsRemaining, getCourseRetakeRules } from "@/lib/academy/assessment-retake-rules";

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

  const allowedStatuses = ["APPROVED", "REJECTED", "GRADED", "RESUBMISSION_REQUESTED"];
  if (!status || !allowedStatuses.includes(status)) {
    return problem(400, "INVALID_STATUS", "Status must be APPROVED, REJECTED, GRADED, or RESUBMISSION_REQUESTED");
  }

  const prisma = getMainPrisma();
  const actorId = getSessionUserIdFromRequest(request);

  try {
    const existing = await prisma.assignmentSubmission.findUnique({
      where: { id },
      select: {
        status: true,
        reviewedAt: true,
        assignment: { select: { points: true } },
      },
    });
    if (!existing) return problem(404, "NOT_FOUND", "Assignment submission not found");

    const numericGrade = status === "APPROVED" || status === "GRADED" ? Number(grade) : null;
    if ((status === "APPROVED" || status === "GRADED") && (numericGrade === null || !Number.isFinite(numericGrade) || numericGrade < 0 || numericGrade > existing.assignment.points)) {
      return problem(400, "INVALID_GRADE", `Grade must be between 0 and ${existing.assignment.points}`);
    }

    const submission = await prisma.assignmentSubmission.update({
      where: { id },
      data: {
        status,
        grade: numericGrade,
        reviewerNote: reviewerNote || null,
        reviewedAt: new Date(),
      },
      include: {
        assignment: {
          include: {
            lesson: { select: { section: { select: { module: { select: { courseId: true } } } } } },
            module: { select: { courseId: true } },
          },
        },
      },
    });

    // Fetch agent details separately
    const agent = await prisma.user.findUnique({
      where: { id: submission.agentId },
      select: { name: true, email: true },
    });

    const courseId = submission.assignment.courseId
      ?? submission.assignment.module?.courseId
      ?? submission.assignment.lesson?.section.module.courseId
      ?? null;
    const rules = courseId ? await getCourseRetakeRules(courseId) : DEFAULT_COURSE_RETAKE_RULES;
    const submissionCount = await prisma.assignmentSubmission.count({
      where: { assignmentId: submission.assignmentId, agentId: submission.agentId },
    });
    const remainingSubmissions = attemptsRemaining(rules.assignmentSubmissionLimit, submissionCount);
    const passedReview = status === "APPROVED" || status === "GRADED";

    // Create notification for the student
    await prisma.trainingNotification.create({
      data: {
        userId: submission.agentId,
        eventType: "ASSIGNMENT_REVIEWED",
        channel: "IN_APP",
        subject: existing.reviewedAt ? "Assignment review updated" : `Assignment ${status.toLowerCase().replace(/_/g, " ")}`,
        body: passedReview
          ? `Your submission for ${submission.assignment.title} was approved. The next eligible lesson or module is now unlocked.${numericGrade !== null ? ` Grade: ${numericGrade}/${submission.assignment.points}.` : ""}`
          : `Your submission for ${submission.assignment.title} needs changes. ${remainingSubmissions} submission${remainingSubmissions === 1 ? "" : "s"} remaining.`,
      },
    });

    // Log audit event
    await prisma.auditEvent.create({
      data: {
        actorId,
        action: existing.reviewedAt ? "ASSIGNMENT_REMARKED" : `ASSIGNMENT_${status}`,
        target: `AssignmentSubmission:${id}`,
        metadata: {
          assignmentId: submission.assignmentId,
          agentId: submission.agentId,
          previousStatus: existing.status,
          newStatus: status,
          grade: numericGrade,
          reviewerNote,
        } as any,
      },
    });

    if ((status === "APPROVED" || status === "GRADED") && courseId) {
      await tryCompleteCourseCertification(submission.agentId, courseId);
    }

    return ok({ ...submission, agent });
  } catch (error) {
    console.error("Failed to update assignment submission:", error);
    return problem(500, "SERVER_ERROR", "Failed to update submission");
  }
}
