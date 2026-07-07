import { TrainingAttemptStatus } from "@prisma/client";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

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
    const questions = questionIds.length
      ? await prisma.quizQuestion.findMany({
          where: { id: { in: questionIds } },
          include: { answers: true },
        })
      : [];

    let correct = 0;
    for (const question of questions) {
      const selected = answers[question.id];
      const correctAnswer = question.answers.find((answer) => answer.isCorrect);
      if (correctAnswer && (selected === correctAnswer.value || selected === correctAnswer.label)) correct += 1;
    }

    const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
    const passed = score >= exam.passingScore;

    const attempt = await prisma.examAttempt.create({
      data: {
        examId,
        agentId: userId,
        status: passed ? TrainingAttemptStatus.PASSED : TrainingAttemptStatus.FAILED,
        score,
        answers,
        submittedAt: new Date(),
        gradedAt: new Date(),
      },
    });

    if (passed) {
      await prisma.courseProgress.upsert({
        where: { courseId_agentId: { courseId: exam.courseId, agentId: userId } },
        create: { courseId: exam.courseId, agentId: userId, status: "COMPLETED", percentComplete: 100, completedAt: new Date() },
        update: { status: "COMPLETED", percentComplete: 100, completedAt: new Date() },
      });
    }

    await prisma.trainingNotification.create({
      data: {
        userId,
        eventType: passed ? "EXAM_PASSED" : "EXAM_FAILED",
        channel: "IN_APP",
        subject: passed ? "Final exam passed" : "Final exam attempt recorded",
        body: `You scored ${score}% on ${exam.title}.`,
      },
    });

    return ok({ attemptId: attempt.id, score, passed, passingScore: exam.passingScore });
  } catch (error) {
    console.error("Exam submission failed", error);
    return problem(500, "EXAM_SUBMIT_FAILED", "Exam could not be submitted.");
  }
}
