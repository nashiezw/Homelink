import { TrainingAttemptStatus } from "@prisma/client";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { tryCompleteCourseCertification } from "@/lib/academy/academy-progress";
import { isSupplementalQuestionId, supplementalQuestionsForQuiz } from "@/lib/academy/quiz-question-bank";
import { getAssessmentGateState } from "@/lib/academy/academy-gates";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to submit a quiz attempt.");

  const { id: quizId } = await context.params;
  const body = await request.json();
  const answers = typeof body.answers === "object" && body.answers ? body.answers : {};
  const attemptId = typeof body.attemptId === "string" ? body.attemptId : null;
  const confidence = typeof body.confidence === "string" ? body.confidence : null;
  const elapsedSeconds = typeof body.elapsedSeconds === "number" && Number.isFinite(body.elapsedSeconds) ? Math.max(0, Math.round(body.elapsedSeconds)) : null;

  try {
    const prisma = getMainPrisma();
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { include: { answers: true } } },
    });
    if (!quiz || quiz.active === false) return problem(404, "QUIZ_NOT_FOUND", "Quiz not found.");
    if (quiz.courseId) {
      const enrolment = await prisma.courseEnrolment.findUnique({
        where: { courseId_agentId: { courseId: quiz.courseId, agentId: userId } },
      });
      if (!enrolment || enrolment.status !== "ACTIVE") return problem(403, "NOT_ENROLLED", "Enrol in this course to take the quiz.");
      const gate = await getAssessmentGateState(userId, quiz.courseId, quiz.id, "quiz");
      if (gate.locked) return problem(403, "CHECKPOINT_LOCKED", gate.title);
    }

    const cooldownSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentFailedAttempts = await prisma.quizAttempt.count({
      where: {
        quizId,
        agentId: userId,
        status: TrainingAttemptStatus.FAILED,
        submittedAt: { gte: cooldownSince },
      },
    });
    if (recentFailedAttempts >= 2) {
      return problem(429, "QUIZ_RETAKE_COOLDOWN", "You have used two attempts in the last 24 hours. Review the lesson notes and try this checkpoint again tomorrow.");
    }

    const submittedQuestionIds = Object.keys(answers);
    const supplementalById = new Map(supplementalQuestionsForQuiz(quiz.id).map((question) => [question.id, question]));
    const submittedDatabaseQuestions = quiz.questions.filter((question) => !isSupplementalQuestionId(question.id) && submittedQuestionIds.includes(question.id));
    let correct = 0;
    const reviewTopics = new Set<string>();

    for (const question of submittedDatabaseQuestions) {
      const selected = answers[question.id];
      const correctAnswer = question.answers.find((answer) => answer.isCorrect);
      const isCorrect = Boolean(correctAnswer && (selected === correctAnswer.value || selected === correctAnswer.label));
      if (isCorrect) correct += 1;
      else reviewTopics.add(question.categories[0] ?? quiz.title);
    }

    for (const questionId of submittedQuestionIds.filter(isSupplementalQuestionId)) {
      const question = supplementalById.get(questionId);
      if (!question) continue;
      if (answers[questionId] === question.correctValue) correct += 1;
      else reviewTopics.add(question.topic);
    }

    const gradedQuestionCount = submittedDatabaseQuestions.length + submittedQuestionIds.filter((id) => supplementalById.has(id)).length;
    const score = gradedQuestionCount ? Math.round((correct / gradedQuestionCount) * 100) : 0;
    const passed = score >= quiz.passingPercentage;

    const attemptData = {
      quizId,
      agentId: userId,
      status: passed ? TrainingAttemptStatus.PASSED : TrainingAttemptStatus.FAILED,
      score,
      answers: { ...answers, _meta: { confidence, elapsedSeconds, reviewTopics: Array.from(reviewTopics) } },
      submittedAt: new Date(),
      gradedAt: new Date(),
    };
    const existingAttempt = attemptId
      ? await prisma.quizAttempt.findFirst({ where: { id: attemptId, quizId, agentId: userId, status: TrainingAttemptStatus.IN_PROGRESS } })
      : null;
    const attempt = existingAttempt
      ? await prisma.quizAttempt.update({ where: { id: existingAttempt.id }, data: attemptData })
      : await prisma.quizAttempt.create({ data: attemptData });

    await prisma.trainingNotification.create({
      data: {
        userId,
        eventType: passed ? "QUIZ_PASSED" : "QUIZ_FAILED",
        channel: "IN_APP",
        subject: passed ? "Quiz passed" : "Quiz attempt recorded",
        body: `You scored ${score}% on ${quiz.title}.`,
      },
    });

    if (passed && quiz.courseId) {
      await tryCompleteCourseCertification(userId, quiz.courseId);
    }

    return ok({
      attemptId: attempt.id,
      score,
      passed,
      passingScore: quiz.passingPercentage,
      reviewTopics: passed ? [] : Array.from(reviewTopics).slice(0, 4),
      retakeGuidance: passed ? null : "Review these topics before retaking. The next attempt will use a fresh question and answer order.",
    });
  } catch (error) {
    console.error("Quiz submission failed", error);
    return problem(500, "QUIZ_SUBMIT_FAILED", "Quiz could not be submitted.");
  }
}
