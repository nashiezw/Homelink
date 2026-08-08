import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to view instructors.");

  try {
    const prisma = getMainPrisma();
    const courses = await prisma.trainingCourse.findMany({
      where: {
        instructor: {
          not: null,
        },
      },
      select: {
        instructor: true,
      },
      distinct: ["instructor"],
    });

    const instructors = courses
      .map((c: any) => c.instructor)
      .filter((i: any): i is string => i !== null)
      .map((name: string) => ({
        id: name,
        name,
        email: null,
        phone: null,
        createdAt: new Date().toISOString(),
        _count: {
          instructedCourses: Number(courses.filter((c: any) => c.instructor === name).length),
        },
      }));

    return ok({ instructors });
  } catch (error) {
    console.error("Failed to get instructors:", error);
    return problem(500, "SERVER_ERROR", "Failed to get instructors.");
  }
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to manage instructors.");

  // Instructors are managed through course assignments, not as separate users
  return problem(400, "NOT_SUPPORTED", "Instructors are managed through course assignments. Use the course editor to set instructors.");
}

export async function PATCH(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to manage instructors.");

  return problem(400, "NOT_SUPPORTED", "Instructors are managed through course assignments. Use the course editor to set instructors.");
}

export async function DELETE(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to manage instructors.");

  return problem(400, "NOT_SUPPORTED", "Instructors are managed through course assignments. Use the course editor to set instructors.");
}
