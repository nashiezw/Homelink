import { TrainingAttemptStatus } from "@prisma/client";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to submit a quiz attempt.");

  const { id: quizId } = await context.params;
  const body = await request.json();
  const answers = typeof body.answers === "object" && body.answers ? body.answers : {};

  try {
    const prisma = getMainPrisma();
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { include: { answers: true } } },
    });
    if (!quiz || quiz.active === false) return problem(404, "QUIZ_NOT_FOUND", "Quiz not found.");

    let correct = 0;
    for (const question of quiz.questions) {
      const selected = answers[question.id];
      const correctAnswer = question.answers.find((answer) => answer.isCorrect);
      if (correctAnswer && (selected === correctAnswer.value || selected === correctAnswer.label)) correct += 1;
    }
    const score = quiz.questions.length ? Math.round((correct / quiz.questions.length) * 100) : 0;
    const passed = score >= quiz.passingPercentage;

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        agentId: userId,
        status: passed ? TrainingAttemptStatus.PASSED : TrainingAttemptStatus.FAILED,
        score,
        answers,
        submittedAt: new Date(),
        gradedAt: new Date(),
      },
    });

    await prisma.trainingNotification.create({
      data: {
        userId,
        eventType: passed ? "QUIZ_PASSED" : "QUIZ_FAILED",
        channel: "IN_APP",
        subject: passed ? "Quiz passed" : "Quiz attempt recorded",
        body: `You scored ${score}% on ${quiz.title}.`,
      },
    });

    return ok({ attemptId: attempt.id, score, passed, passingScore: quiz.passingPercentage });
  } catch (error) {
    console.error("Quiz submission failed", error);
    return problem(500, "QUIZ_SUBMIT_FAILED", "Quiz could not be submitted.");
  }
}
