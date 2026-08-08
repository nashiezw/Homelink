import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ instructorId: string }> }) {
  try {
    const prisma = getMainPrisma();
    const { instructorId } = await params;

    // Instructors are managed through course assignments, not as separate users
    // Get courses where this instructor is assigned
    const courses = await prisma.trainingCourse.findMany({
      where: { instructor: instructorId },
      select: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        _count: {
          select: {
            enrolments: true,
          },
        },
      },
    });

    return ok({
      instructor: {
        id: instructorId,
        name: instructorId, // Using instructorId as name since it's the instructor name in the schema
        email: null,
        phone: null,
        createdAt: new Date().toISOString(),
        instructedCourses: courses.map(course => ({
          ...course,
          _count: {
            enrolments: Number(course._count.enrolments)
          }
        })),
      },
    });
  } catch (error) {
    console.error("Failed to get instructor:", error);
    return problem(500, "SERVER_ERROR", "Failed to get instructor.");
  }
}
