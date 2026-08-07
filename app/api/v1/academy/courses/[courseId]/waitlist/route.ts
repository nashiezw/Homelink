import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to join the waitlist.");

  try {
    const prisma = getMainPrisma();
    const { courseId } = await params;

    // Check if user is already on the waitlist
    const existing = await prisma.courseWaitlist.findUnique({
      where: {
        courseId_learnerId: {
          courseId,
          learnerId: userId,
        },
      },
    });

    if (existing) {
      return problem(400, "ALREADY_ON_WAITLIST", "You are already on the waitlist for this course.");
    }

    // Check if user is already enrolled
    const enrollment = await prisma.academyLearnerApplication.findFirst({
      where: {
        courseId,
        learnerId: userId,
        status: "APPROVED",
      },
    });

    if (enrollment) {
      return problem(400, "ALREADY_ENROLLED", "You are already enrolled in this course.");
    }

    const waitlistEntry = await prisma.courseWaitlist.create({
      data: {
        courseId,
        learnerId: userId,
        priority: 0,
      },
    });

    return ok({
      message: "You have been added to the waitlist.",
      waitlistEntry,
    });
  } catch (error) {
    console.error("Failed to join waitlist:", error);
    return problem(500, "SERVER_ERROR", "Failed to join waitlist.");
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to leave the waitlist.");

  try {
    const prisma = getMainPrisma();
    const { courseId } = await params;

    await prisma.courseWaitlist.delete({
      where: {
        courseId_learnerId: {
          courseId,
          learnerId: userId,
        },
      },
    });

    return ok({
      message: "You have been removed from the waitlist.",
    });
  } catch (error) {
    console.error("Failed to leave waitlist:", error);
    return problem(500, "SERVER_ERROR", "Failed to leave waitlist.");
  }
}
