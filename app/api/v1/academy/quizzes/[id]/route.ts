import { TrainingAttemptStatus } from "@prisma/client";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { shuffleArray, toPublicShuffledAnswers } from "@/lib/academy/quiz-randomisation";
import { supplementalQuestionsForQuiz } from "@/lib/academy/quiz-question-bank";
import { getAssessmentGateState } from "@/lib/academy/academy-gates";
import { DEFAULT_COURSE_RETAKE_RULES, attemptsRemaining, getCourseRetakeRules } from "@/lib/academy/assessment-retake-rules";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = getSessionUserIdFromRequest(_request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to view this quiz.");

  const { id: quizId } = await context.params;
  const prisma = getMainPrisma();

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId, active: true },
    include: {
      questions: {
        include: { answers: { orderBy: { sortOrder: "asc" } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!quiz) return problem(404, "NOT_FOUND", "Quiz not found.");

  const rules = quiz.courseId ? await getCourseRetakeRules(quiz.courseId) : DEFAULT_COURSE_RETAKE_RULES;
  const submittedAttempts = await prisma.quizAttempt.findMany({
    where: { quizId, agentId: userId, status: { in: [TrainingAttemptStatus.PASSED, TrainingAttemptStatus.FAILED] } },
    orderBy: { submittedAt: "desc" },
    take: 20,
  });
  const attemptLimit = rules.quizAttemptLimit;
  const remainingAttempts = attemptsRemaining(attemptLimit, submittedAttempts.length);
  const passedAttempt = submittedAttempts.find((attempt) => attempt.status === TrainingAttemptStatus.PASSED);
  const lastFailedAttempt = submittedAttempts.find((attempt) => attempt.status === TrainingAttemptStatus.FAILED && attempt.submittedAt);
  const retryAvailableAt = lastFailedAttempt?.submittedAt && rules.retakeCooldownHours > 0
    ? new Date(lastFailedAttempt.submittedAt.getTime() + rules.retakeCooldownHours * 60 * 60 * 1000)
    : null;

  if (!passedAttempt && remainingAttempts <= 0) {
    return problem(403, "ATTEMPT_LIMIT", "You have used all available quiz attempts. Ask Academy Admin to review your options.");
  }
  if (!passedAttempt && retryAvailableAt && retryAvailableAt.getTime() > Date.now()) {
    return problem(429, "RETAKE_COOLDOWN", `Retake available ${retryAvailableAt.toLocaleString()}. Review the lesson notes before trying again.`);
  }

  if (quiz.courseId) {
    const enrolment = await prisma.courseEnrolment.findUnique({
      where: { courseId_agentId: { courseId: quiz.courseId, agentId: userId } },
    });
    if (!enrolment || enrolment.status !== "ACTIVE") {
      return problem(403, "NOT_ENROLLED", "Enrol in this course to take the quiz.");
    }
    const gate = await getAssessmentGateState(userId, quiz.courseId, quiz.id, "quiz");
    if (gate.locked) {
      return problem(403, "CHECKPOINT_LOCKED", gate.title);
    }
  }

  const databaseQuestions = quiz.questions.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    answers: q.answers,
  }));
  const bankQuestions = supplementalQuestionsForQuiz(quiz.id);
  const fullPool = [...databaseQuestions, ...bankQuestions];
  const questions = quiz.randomise ? shuffleArray(fullPool).slice(0, Math.min(8, fullPool.length)) : fullPool;
  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId: quiz.id,
      agentId: userId,
      status: "IN_PROGRESS",
      answers: { _meta: { openedAt: new Date().toISOString(), poolSize: fullPool.length, deliveredQuestionIds: questions.map((q) => q.id) } },
      startedAt: new Date(),
    },
  });

  return ok({
    id: quiz.id,
    attemptId: attempt.id,
    title: quiz.title,
    passingPercentage: quiz.passingPercentage,
    attemptNumber: submittedAttempts.length + 1,
    attemptLimit,
    attemptsUsed: submittedAttempts.length,
    attemptsRemaining: remainingAttempts,
    passed: Boolean(passedAttempt),
    bestScore: submittedAttempts.length ? Math.max(...submittedAttempts.map((attempt) => Number(attempt.score))) : null,
    poolSize: fullPool.length,
    questions: questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      answers: toPublicShuffledAnswers(q.answers),
    })),
  });
}
