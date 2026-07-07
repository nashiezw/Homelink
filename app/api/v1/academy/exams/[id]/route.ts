import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

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

  const attemptCount = await prisma.examAttempt.count({ where: { examId, agentId: userId } });
  if (attemptCount >= exam.attemptLimit) {
    return problem(403, "ATTEMPT_LIMIT", "You have used all available exam attempts.");
  }

  const pools = (exam.questionPools ?? {}) as QuestionPool;
  const quizIds = pools.quizzes ?? [];
  const minimumQuestions = pools.minimumQuestions ?? 6;

  const quizQuestions = await prisma.quizQuestion.findMany({
    where: { quizId: { in: quizIds }, quiz: { active: true } },
    include: { answers: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });

  const shuffled = exam.randomQuestions ? [...quizQuestions].sort(() => Math.random() - 0.5) : quizQuestions;
  const selected = shuffled.slice(0, Math.min(minimumQuestions, shuffled.length));

  return ok({
    id: exam.id,
    title: exam.title,
    durationMinutes: exam.durationMinutes,
    passingScore: exam.passingScore,
    attemptNumber: attemptCount + 1,
    attemptLimit: exam.attemptLimit,
    questions: selected.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      answers: q.answers.map((a) => ({ id: a.id, label: a.label, value: a.value })),
    })),
  });
}
