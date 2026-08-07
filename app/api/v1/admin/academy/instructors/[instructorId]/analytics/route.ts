import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ instructorId: string }> }) {
  try {
    const prisma = getMainPrisma();
    const { instructorId } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30"; // days

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Instructors are managed through course assignments
    const courses = await prisma.trainingCourse.findMany({
      where: { instructor: instructorId },
    });

    const totalCourses = courses.length;

    return ok({
      instructorId,
      period,
      totalCourses,
      totalEnrollments: 0,
      totalProgress: 0,
      completions: 0,
      completionRate: 0,
      courses: courses.map(course => ({
        id: course.id,
        title: course.title,
        enrollments: 0,
        progress: 0,
        completions: 0,
      })),
    });
  } catch (error) {
    console.error("Failed to get instructor analytics:", error);
    return problem(500, "SERVER_ERROR", "Failed to get instructor analytics.");
  }
}
