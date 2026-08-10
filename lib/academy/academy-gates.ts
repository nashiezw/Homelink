import { AssignmentSubmissionStatus, TrainingAttemptStatus } from "@prisma/client";
import { getMainPrisma } from "@/lib/db/main-prisma";

export type AcademyGateRequirement = {
  id: string;
  title: string;
  type: "lesson" | "quiz" | "assignment";
  complete: boolean;
};

export type AcademyGateState = {
  locked: boolean;
  title: string;
  requirements: AcademyGateRequirement[];
};

type GateTarget =
  | { kind: "lesson"; lessonId: string }
  | { kind: "module"; moduleId: string }
  | { kind: "assessment"; assessmentId: string; assessmentType: "quiz" | "assignment" };

type GateCourseShape = {
  modules: Array<{
    id: string;
    sortOrder: number;
    sections: Array<{
      sortOrder: number;
      lessons: Array<{ id: string; title: string; sortOrder: number }>;
    }>;
  }>;
};

const PASSING_ASSIGNMENT_STATUSES = new Set<string>([
  AssignmentSubmissionStatus.APPROVED,
  AssignmentSubmissionStatus.GRADED,
]);

const COMPLETE_GATE: AcademyGateState = { locked: false, title: "", requirements: [] };

export async function getProgrammeGateState(learnerId: string, courseId: string, beforeSortOrder: number): Promise<AcademyGateState> {
  const prisma = getMainPrisma();
  const courseModule = await prisma.trainingModule.findFirst({
    where: { courseId, sortOrder: { gte: beforeSortOrder } },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  if (!courseModule || beforeSortOrder <= 0) return COMPLETE_GATE;
  return getModuleGateState(learnerId, courseId, courseModule.id);
}

export async function getModuleGateState(learnerId: string, courseId: string, moduleId: string): Promise<AcademyGateState> {
  return getGateStateForTarget(learnerId, courseId, { kind: "module", moduleId });
}

export async function getLessonGateState(learnerId: string, courseId: string, lessonId: string): Promise<AcademyGateState> {
  return getGateStateForTarget(learnerId, courseId, { kind: "lesson", lessonId });
}

export async function getAssessmentGateState(learnerId: string, courseId: string, assessmentId: string, type: "quiz" | "assignment") {
  return getGateStateForTarget(learnerId, courseId, { kind: "assessment", assessmentId, assessmentType: type });
}

export async function getLessonCompletionGateState(learnerId: string, courseId: string, lessonId: string, completionRequirement: string): Promise<AcademyGateState> {
  if (completionRequirement !== "COMPLETE_QUIZ" && completionRequirement !== "SUBMIT_ASSIGNMENT") return COMPLETE_GATE;
  const gate = await getCurrentLessonAssessmentState(learnerId, lessonId, completionRequirement);
  return {
    locked: gate.requirements.some((requirement) => !requirement.complete),
    title: completionRequirement === "COMPLETE_QUIZ"
      ? "Pass this lesson checkpoint quiz before marking the lesson complete."
      : "Submit and receive approval for this lesson assignment before marking the lesson complete.",
    requirements: gate.requirements,
  };
}

async function getGateStateForTarget(learnerId: string, courseId: string, target: GateTarget): Promise<AcademyGateState> {
  const prisma = getMainPrisma();
  const course = await prisma.trainingCourse.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { sortOrder: "asc" },
        include: {
          sections: {
            orderBy: { sortOrder: "asc" },
            include: { lessons: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true, completionRequirement: true, sortOrder: true } } },
          },
        },
      },
      quizzes: { where: { active: true }, select: { id: true, title: true, moduleId: true, lessonId: true } },
      assignments: { where: { active: true }, select: { id: true, title: true, moduleId: true, lessonId: true } },
    },
  });
  if (!course) return COMPLETE_GATE;

  const positions = buildCoursePositions(course);
  const targetOrder = resolveTargetOrder(target, positions, course);
  if (targetOrder === null || targetOrder <= 0) return COMPLETE_GATE;

  const prerequisiteLessonIds = positions.lessons.filter((lesson) => lesson.order < targetOrder).map((lesson) => lesson.id);
  const prerequisiteQuizzes = course.quizzes
    .map((quiz) => ({ ...quiz, order: checkpointOrderForAssessment(quiz, positions) }))
    .filter((quiz) => quiz.order !== null && quiz.order < targetOrder);
  const prerequisiteAssignments = course.assignments
    .map((assignment) => ({ ...assignment, order: checkpointOrderForAssessment(assignment, positions) }))
    .filter((assignment) => assignment.order !== null && assignment.order < targetOrder);

  if (!prerequisiteLessonIds.length && !prerequisiteQuizzes.length && !prerequisiteAssignments.length) return COMPLETE_GATE;

  const [lessonProgress, quizAttempts, assignmentSubmissions] = await Promise.all([
    prerequisiteLessonIds.length
      ? prisma.lessonProgress.findMany({ where: { agentId: learnerId, lessonId: { in: prerequisiteLessonIds }, status: "COMPLETED" }, select: { lessonId: true } })
      : Promise.resolve([]),
    prerequisiteQuizzes.length
      ? prisma.quizAttempt.findMany({ where: { agentId: learnerId, quizId: { in: prerequisiteQuizzes.map((quiz) => quiz.id) }, status: TrainingAttemptStatus.PASSED }, select: { quizId: true } })
      : Promise.resolve([]),
    prerequisiteAssignments.length
      ? prisma.assignmentSubmission.findMany({
          where: {
            agentId: learnerId,
            assignmentId: { in: prerequisiteAssignments.map((assignment) => assignment.id) },
            status: { in: Array.from(PASSING_ASSIGNMENT_STATUSES) as AssignmentSubmissionStatus[] },
          },
          select: { assignmentId: true },
        })
      : Promise.resolve([]),
  ]);

  const completedLessonIds = new Set(lessonProgress.map((entry) => entry.lessonId));
  const passedQuizIds = new Set(quizAttempts.map((attempt) => attempt.quizId));
  const approvedAssignmentIds = new Set(assignmentSubmissions.map((submission) => submission.assignmentId));

  const incompletePriorLessons = positions.lessons
    .filter((lesson) => prerequisiteLessonIds.includes(lesson.id) && !completedLessonIds.has(lesson.id))
    .slice(-3);

  const requirements: AcademyGateRequirement[] = [
    ...incompletePriorLessons.map((lesson) => ({ id: lesson.id, title: lesson.title, type: "lesson" as const, complete: false })),
    ...prerequisiteQuizzes.map((quiz) => ({ id: quiz.id, title: quiz.title, type: "quiz" as const, complete: passedQuizIds.has(quiz.id) })),
    ...prerequisiteAssignments.map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      type: "assignment" as const,
      complete: approvedAssignmentIds.has(assignment.id),
    })),
  ];

  return {
    locked: requirements.some((requirement) => !requirement.complete),
    title: "Complete the earlier lessons, quizzes, and approved assignments before moving on.",
    requirements,
  };
}

async function getCurrentLessonAssessmentState(learnerId: string, lessonId: string, completionRequirement: string): Promise<AcademyGateState> {
  const prisma = getMainPrisma();
  const [quizzes, assignments] = await Promise.all([
    completionRequirement === "COMPLETE_QUIZ"
      ? prisma.quiz.findMany({ where: { lessonId, active: true }, select: { id: true, title: true } })
      : Promise.resolve([]),
    completionRequirement === "SUBMIT_ASSIGNMENT"
      ? prisma.assignment.findMany({ where: { lessonId, active: true }, select: { id: true, title: true } })
      : Promise.resolve([]),
  ]);
  if (!quizzes.length && !assignments.length) return COMPLETE_GATE;

  const [quizAttempts, assignmentSubmissions] = await Promise.all([
    quizzes.length
      ? prisma.quizAttempt.findMany({ where: { agentId: learnerId, quizId: { in: quizzes.map((quiz) => quiz.id) }, status: TrainingAttemptStatus.PASSED }, select: { quizId: true } })
      : Promise.resolve([]),
    assignments.length
      ? prisma.assignmentSubmission.findMany({
          where: {
            agentId: learnerId,
            assignmentId: { in: assignments.map((assignment) => assignment.id) },
            status: { in: Array.from(PASSING_ASSIGNMENT_STATUSES) as AssignmentSubmissionStatus[] },
          },
          select: { assignmentId: true },
        })
      : Promise.resolve([]),
  ]);

  const passedQuizIds = new Set(quizAttempts.map((attempt) => attempt.quizId));
  const approvedAssignmentIds = new Set(assignmentSubmissions.map((submission) => submission.assignmentId));
  const requirements: AcademyGateRequirement[] = [
    ...quizzes.map((quiz) => ({ id: quiz.id, title: quiz.title, type: "quiz" as const, complete: passedQuizIds.has(quiz.id) })),
    ...assignments.map((assignment) => ({ id: assignment.id, title: assignment.title, type: "assignment" as const, complete: approvedAssignmentIds.has(assignment.id) })),
  ];
  return { locked: requirements.some((requirement) => !requirement.complete), title: "", requirements };
}

function buildCoursePositions(course: GateCourseShape) {
  const moduleStart = new Map<string, number>();
  const moduleEnd = new Map<string, number>();
  const lessonOrder = new Map<string, number>();
  const lessons: Array<{ id: string; title: string; order: number }> = [];

  for (const [moduleIndex, module] of course.modules.entries()) {
    const base = module.sortOrder * 10000 + moduleIndex * 1000;
    moduleStart.set(module.id, base);
    let latestLessonOrder = base;
    for (const [sectionIndex, section] of module.sections.entries()) {
      for (const [lessonIndex, lesson] of section.lessons.entries()) {
        const order = base + section.sortOrder * 100 + sectionIndex * 10 + lesson.sortOrder + lessonIndex + 1;
        lessonOrder.set(lesson.id, order);
        lessons.push({ id: lesson.id, title: lesson.title, order });
        latestLessonOrder = Math.max(latestLessonOrder, order);
      }
    }
    moduleEnd.set(module.id, latestLessonOrder + 0.5);
  }

  return { moduleStart, moduleEnd, lessonOrder, lessons };
}

function resolveTargetOrder(
  target: GateTarget,
  positions: ReturnType<typeof buildCoursePositions>,
  course: { quizzes: Array<{ id: string; moduleId: string | null; lessonId: string | null }>; assignments: Array<{ id: string; moduleId: string | null; lessonId: string | null }> },
) {
  if (target.kind === "lesson") return positions.lessonOrder.get(target.lessonId) ?? null;
  if (target.kind === "module") return positions.moduleStart.get(target.moduleId) ?? null;
  const assessment = target.assessmentType === "quiz"
    ? course.quizzes.find((quiz) => quiz.id === target.assessmentId)
    : course.assignments.find((assignment) => assignment.id === target.assessmentId);
  if (!assessment) return null;
  if (assessment.lessonId) return positions.lessonOrder.get(assessment.lessonId) ?? null;
  return checkpointOrderForAssessment(assessment, positions);
}

function checkpointOrderForAssessment(
  assessment: { moduleId: string | null; lessonId: string | null },
  positions: ReturnType<typeof buildCoursePositions>,
) {
  if (assessment.lessonId) return (positions.lessonOrder.get(assessment.lessonId) ?? 0) + 0.2;
  if (assessment.moduleId) return positions.moduleEnd.get(assessment.moduleId) ?? null;
  return null;
}
