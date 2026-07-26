import { TrainingAttemptStatus } from "@prisma/client";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { tryCompleteCourseCertification } from "@/lib/academy/academy-progress";
import { isSupplementalQuestionId, supplementalQuestionsForQuizzes } from "@/lib/academy/quiz-question-bank";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

type QuestionPool = { quizzes?: string[]; minimumQuestions?: number };

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to submit an exam attempt.");

  const { id: examId } = await context.params;
  const body = await request.json();
  const answers = typeof body.answers === "object" && body.answers ? body.answers : {};

  try {
    const prisma = getMainPrisma();
    const exam = await prisma.finalExam.findUnique({ where: { id: examId, active: true } });
    if (!exam) return problem(404, "EXAM_NOT_FOUND", "Exam not found.");

    const enrolment = await prisma.courseEnrolment.findUnique({
      where: { courseId_agentId: { courseId: exam.courseId, agentId: userId } },
    });
    if (!enrolment || enrolment.status !== "ACTIVE") {
      return problem(403, "NOT_ENROLLED", "Enrol in this course to take the final exam.");
    }

    const attemptCount = await prisma.examAttempt.count({ where: { examId, agentId: userId } });
    if (attemptCount >= exam.attemptLimit) {
      return problem(403, "ATTEMPT_LIMIT", "You have used all available exam attempts.");
    }

    const questionIds = Object.keys(answers);
    const databaseQuestionIds = questionIds.filter((id) => !isSupplementalQuestionId(id));
    const questions = databaseQuestionIds.length
      ? await prisma.quizQuestion.findMany({
          where: { id: { in: databaseQuestionIds } },
          include: { answers: true },
        })
      : [];
    const pools = (exam.questionPools ?? {}) as QuestionPool;
    const supplementalById = new Map(supplementalQuestionsForQuizzes(pools.quizzes ?? []).map((question) => [question.id, question]));

    let correct = 0;
    const reviewTopics = new Set<string>();
    for (const question of questions) {
      const selected = answers[question.id];
      const correctAnswer = question.answers.find((answer) => answer.isCorrect);
      const isCorrect = Boolean(correctAnswer && (selected === correctAnswer.value || selected === correctAnswer.label));
      if (isCorrect) correct += 1;
      else reviewTopics.add(question.categories[0] ?? "Final exam review");
    }

    for (const questionId of questionIds.filter(isSupplementalQuestionId)) {
      const question = supplementalById.get(questionId);
      if (!question) continue;
      if (answers[questionId] === question.correctValue) correct += 1;
      else reviewTopics.add(question.topic);
    }

    const gradedQuestionCount = questions.length + questionIds.filter((id) => supplementalById.has(id)).length;
    const score = gradedQuestionCount ? Math.round((correct / gradedQuestionCount) * 100) : 0;
    const passed = score >= exam.passingScore;

    const attempt = await prisma.examAttempt.create({
      data: {
        examId,
        agentId: userId,
        status: passed ? TrainingAttemptStatus.PASSED : TrainingAttemptStatus.FAILED,
        score,
        answers: { ...answers, _meta: { reviewTopics: Array.from(reviewTopics) } },
        submittedAt: new Date(),
        gradedAt: new Date(),
      },
    });

    await prisma.trainingNotification.create({
      data: {
        userId,
        eventType: passed ? "EXAM_PASSED" : "EXAM_FAILED",
        channel: "IN_APP",
        subject: passed ? "Final exam passed" : "Final exam attempt recorded",
        body: `You scored ${score}% on ${exam.title}.`,
      },
    });

    if (passed) {
      await tryCompleteCourseCertification(userId, exam.courseId);
    }

    return ok({
      attemptId: attempt.id,
      score,
      passed,
      passingScore: exam.passingScore,
      reviewTopics: passed ? [] : Array.from(reviewTopics).slice(0, 6),
    });
  } catch (error) {
    console.error("Exam submission failed", error);
    return problem(500, "EXAM_SUBMIT_FAILED", "Exam could not be submitted.");
  }
}
