import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

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

  return ok({
    id: quiz.id,
    title: quiz.title,
    passingPercentage: quiz.passingPercentage,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      answers: q.answers.map((a) => ({ id: a.id, label: a.label, value: a.value })),
    })),
  });
}
