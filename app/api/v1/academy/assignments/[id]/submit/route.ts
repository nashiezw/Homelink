import { AssignmentSubmissionStatus } from "@prisma/client";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { getAssessmentGateState } from "@/lib/academy/academy-gates";
import { DEFAULT_COURSE_RETAKE_RULES, attemptsRemaining, getCourseRetakeRules } from "@/lib/academy/assessment-retake-rules";

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
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        module: { select: { courseId: true } },
        lesson: { select: { section: { select: { module: { select: { courseId: true } } } } } },
      },
    });
    if (!assignment || assignment.active === false) return problem(404, "ASSIGNMENT_NOT_FOUND", "Assignment not found.");
    const courseId = assignment.courseId ?? assignment.module?.courseId ?? assignment.lesson?.section.module.courseId ?? null;
    const [rules, course] = await Promise.all([
      courseId ? getCourseRetakeRules(courseId) : DEFAULT_COURSE_RETAKE_RULES,
      courseId ? prisma.trainingCourse.findUnique({ where: { id: courseId }, select: { passingPercentage: true } }) : null,
    ]);
    if (courseId) {
      const enrolment = await prisma.courseEnrolment.findUnique({
        where: { courseId_agentId: { courseId, agentId: userId } },
      });
      if (!enrolment || enrolment.status !== "ACTIVE") return problem(403, "NOT_ENROLLED", "Enrol in this course to submit assignments.");
      const gate = await getAssessmentGateState(userId, courseId, assignment.id, "assignment");
      if (gate.locked) return problem(403, "CHECKPOINT_LOCKED", gate.title);
    }
    const priorSubmissions = await prisma.assignmentSubmission.findMany({
      where: { assignmentId, agentId: userId },
      orderBy: { submittedAt: "desc" },
    });
    const latestSubmission = priorSubmissions[0];
    const passMark = course?.passingPercentage ?? 80;
    const latestGradePercent = latestSubmission?.grade == null
      ? null
      : assignment.points > 0
        ? Math.round((Number(latestSubmission.grade) / assignment.points) * 100)
        : 0;
    const accepted = latestSubmission?.status === AssignmentSubmissionStatus.APPROVED
      || (latestSubmission?.status === AssignmentSubmissionStatus.GRADED && (latestGradePercent ?? 0) >= passMark);
    if (accepted) {
      return problem(409, "ASSIGNMENT_ALREADY_APPROVED", "This assignment has already been accepted.");
    }
    if (priorSubmissions.length >= rules.assignmentSubmissionLimit) {
      return problem(403, "ASSIGNMENT_SUBMISSION_LIMIT", "You have used all available assignment submissions. Ask Academy Admin to review your options.");
    }
    if (latestSubmission && latestSubmission.status === AssignmentSubmissionStatus.SUBMITTED) {
      return problem(409, "ASSIGNMENT_AWAITING_REVIEW", "Your latest submission is already awaiting review.");
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

    return ok({
      ...submission,
      attemptsUsed: priorSubmissions.length + 1,
      attemptLimit: rules.assignmentSubmissionLimit,
      attemptsRemaining: attemptsRemaining(rules.assignmentSubmissionLimit, priorSubmissions.length + 1),
    });
  } catch (error) {
    console.error("Assignment submission failed", error);
    return problem(500, "ASSIGNMENT_SUBMIT_FAILED", "Assignment could not be submitted.");
  }
}
