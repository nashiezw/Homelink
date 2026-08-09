import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;

  const prisma = getMainPrisma();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const courseId = searchParams.get("courseId");

  try {
    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }
    if (courseId) {
      where.assignment = {
        OR: [
          { courseId },
          { module: { courseId } },
          { lesson: { section: { module: { courseId } } } },
        ],
      };
    }

    const submissions = await prisma.assignmentSubmission.findMany({
      where,
      include: {
        assignment: {
          include: {
            course: {
              select: {
                title: true,
              },
            },
            lesson: {
              select: {
                title: true,
                section: { select: { module: { select: { course: { select: { title: true } } } } } },
              },
            },
            module: {
              select: {
                course: { select: { title: true } },
              },
            },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    // Fetch agent details for each submission
    const submissionsWithAgents = await Promise.all(
      submissions.map(async (submission) => {
        const agent = await prisma.user.findUnique({
          where: { id: submission.agentId },
          select: { name: true, email: true },
        });
        const resolvedCourse = submission.assignment.course
          ?? submission.assignment.module?.course
          ?? submission.assignment.lesson?.section.module.course
          ?? null;
        return { ...submission, assignment: { ...submission.assignment, course: resolvedCourse }, agent };
      })
    );

    return ok(submissionsWithAgents);
  } catch (error) {
    console.error("Failed to fetch assignment submissions:", error);
    return problem(500, "SERVER_ERROR", "Failed to fetch submissions");
  }
}
