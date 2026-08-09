import { TrainingAttemptStatus } from "@prisma/client";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { shuffleArray, toPublicShuffledAnswers } from "@/lib/academy/quiz-randomisation";
import { supplementalQuestionsForQuizzes } from "@/lib/academy/quiz-question-bank";
import { attemptsRemaining, getCourseRetakeRules } from "@/lib/academy/assessment-retake-rules";

export const dynamic = "force-dynamic";

type QuestionPool = { quizzes?: string[]; minimumQuestions?: number };

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = getSessionUserIdFromRequest(_request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to view this exam.");

  const { id: examId } = await context.params;
  const prisma = getMainPrisma();

  const exam = await prisma.finalExam.findUnique({ where: { id: examId, active: true } });
  if (!exam) return problem(404, "NOT_FOUND", "Exam not found.");

  const enrolment = await prisma.courseEnrolment.findUnique({
    where: { courseId_agentId: { courseId: exam.courseId, agentId: userId } },
  });
  if (!enrolment || enrolment.status !== "ACTIVE") {
    return problem(403, "NOT_ENROLLED", "Enrol in this course to take the final exam.");
  }

  const rules = await getCourseRetakeRules(exam.courseId);
  const attemptLimit = rules.examAttemptLimit || exam.attemptLimit;
  const submittedAttempts = await prisma.examAttempt.findMany({
    where: { examId, agentId: userId, status: { in: [TrainingAttemptStatus.PASSED, TrainingAttemptStatus.FAILED] } },
    orderBy: { submittedAt: "desc" },
  });
  const attemptCount = submittedAttempts.length;
  const passedAttempt = submittedAttempts.find((attempt) => attempt.status === TrainingAttemptStatus.PASSED);
  const remainingAttempts = attemptsRemaining(attemptLimit, attemptCount);
  const lastFailedAttempt = submittedAttempts.find((attempt) => attempt.status === TrainingAttemptStatus.FAILED && attempt.submittedAt);
  const retryAvailableAt = lastFailedAttempt?.submittedAt && rules.retakeCooldownHours > 0
    ? new Date(lastFailedAttempt.submittedAt.getTime() + rules.retakeCooldownHours * 60 * 60 * 1000)
    : null;

  if (!passedAttempt && attemptCount >= attemptLimit) {
    return problem(403, "ATTEMPT_LIMIT", "You have used all available exam attempts.");
  }
  if (!passedAttempt && retryAvailableAt && retryAvailableAt.getTime() > Date.now()) {
    return problem(429, "RETAKE_COOLDOWN", `Retake available ${retryAvailableAt.toLocaleString()}. Review the course notes before trying again.`);
  }

  const pools = (exam.questionPools ?? {}) as QuestionPool;
  const quizIds = pools.quizzes ?? [];
  const minimumQuestions = pools.minimumQuestions ?? 6;

  const quizQuestions = await prisma.quizQuestion.findMany({
    where: { quizId: { in: quizIds }, quiz: { active: true } },
    include: { answers: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });

  const databaseQuestions = quizQuestions.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    answers: q.answers,
  }));
  const fullPool = [...databaseQuestions, ...supplementalQuestionsForQuizzes(quizIds)];
  const shuffled = exam.randomQuestions ? shuffleArray(fullPool) : fullPool;
  const selected = shuffled.slice(0, Math.min(minimumQuestions, shuffled.length));

  return ok({
    id: exam.id,
    title: exam.title,
    durationMinutes: exam.durationMinutes,
    passingScore: exam.passingScore,
    attemptNumber: attemptCount + 1,
    attemptLimit,
    attemptsUsed: attemptCount,
    attemptsRemaining: remainingAttempts,
    passed: Boolean(passedAttempt),
    bestScore: submittedAttempts.length ? Math.max(...submittedAttempts.map((attempt) => Number(attempt.score))) : null,
    poolSize: fullPool.length,
    questions: selected.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      answers: toPublicShuffledAnswers(q.answers),
    })),
  });
}
