import { AssignmentSubmissionStatus, TrainingAttemptStatus } from "@prisma/client";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { assessmentMetaForAssignment, assessmentMetaForQuiz } from "@/lib/academy/academy-assessments";
import { getProgrammeCourse } from "@/lib/academy/academy-programme";

export type AcademyGateRequirement = {
  id: string;
  title: string;
  type: "quiz" | "assignment";
  complete: boolean;
};

export type AcademyGateState = {
  locked: boolean;
  title: string;
  requirements: AcademyGateRequirement[];
};

const PASSING_ASSIGNMENT_STATUSES = new Set<string>([
  AssignmentSubmissionStatus.APPROVED,
  AssignmentSubmissionStatus.GRADED,
]);

export async function getProgrammeGateState(learnerId: string, courseId: string, beforeSortOrder: number): Promise<AcademyGateState> {
  const programme = getProgrammeCourse(courseId);
  if (!programme || beforeSortOrder <= 0) {
    return { locked: false, title: "", requirements: [] };
  }

  const quizIds = programme.quizIds.filter((quizId) => (assessmentMetaForQuiz(quizId)?.sortOrder ?? 0) < beforeSortOrder);
  const assignmentIds = programme.assignmentIds.filter((assignmentId) => (assessmentMetaForAssignment(assignmentId)?.sortOrder ?? 0) < beforeSortOrder);
  if (!quizIds.length && !assignmentIds.length) {
    return { locked: false, title: "", requirements: [] };
  }

  const prisma = getMainPrisma();
  const [quizzes, assignments, quizAttempts, assignmentSubmissions] = await Promise.all([
    prisma.quiz.findMany({ where: { id: { in: quizIds } }, select: { id: true, title: true } }),
    prisma.assignment.findMany({ where: { id: { in: assignmentIds } }, select: { id: true, title: true } }),
    prisma.quizAttempt.findMany({
      where: { agentId: learnerId, quizId: { in: quizIds }, status: TrainingAttemptStatus.PASSED },
      select: { quizId: true },
    }),
    prisma.assignmentSubmission.findMany({
      where: { agentId: learnerId, assignmentId: { in: assignmentIds }, status: { in: Array.from(PASSING_ASSIGNMENT_STATUSES) as AssignmentSubmissionStatus[] } },
      select: { assignmentId: true },
    }),
  ]);

  const passedQuizIds = new Set(quizAttempts.map((attempt) => attempt.quizId));
  const approvedAssignmentIds = new Set(assignmentSubmissions.map((submission) => submission.assignmentId));
  const requirements: AcademyGateRequirement[] = [
    ...quizIds.map((id) => ({
      id,
      title: quizzes.find((quiz) => quiz.id === id)?.title ?? id,
      type: "quiz" as const,
      complete: passedQuizIds.has(id),
    })),
    ...assignmentIds.map((id) => ({
      id,
      title: assignments.find((assignment) => assignment.id === id)?.title ?? id,
      type: "assignment" as const,
      complete: approvedAssignmentIds.has(id),
    })),
  ];

  return {
    locked: requirements.some((requirement) => !requirement.complete),
    title: "Complete earlier checkpoint requirements before moving on.",
    requirements,
  };
}

export async function getAssessmentGateState(learnerId: string, courseId: string, assessmentId: string, type: "quiz" | "assignment") {
  const meta = type === "quiz" ? assessmentMetaForQuiz(assessmentId) : assessmentMetaForAssignment(assessmentId);
  return getProgrammeGateState(learnerId, courseId, meta?.sortOrder ?? 0);
}
