import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { shuffleArray, toPublicShuffledAnswers } from "@/lib/academy/quiz-randomisation";
import { supplementalQuestionsForQuiz } from "@/lib/academy/quiz-question-bank";

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

  if (quiz.courseId) {
    const enrolment = await prisma.courseEnrolment.findUnique({
      where: { courseId_agentId: { courseId: quiz.courseId, agentId: userId } },
    });
    if (!enrolment || enrolment.status !== "ACTIVE") {
      return problem(403, "NOT_ENROLLED", "Enrol in this course to take the quiz.");
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
    poolSize: fullPool.length,
    questions: questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      answers: toPublicShuffledAnswers(q.answers),
    })),
  });
}
