import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ waitlistId: string }> }) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to update waitlist priority.");

  try {
    const prisma = getMainPrisma();
    const { waitlistId } = await params;
    const body = await request.json();
    const { priority } = body;

    if (typeof priority !== "number" || priority < 0) {
      return problem(400, "INVALID_PRIORITY", "Priority must be a non-negative number.");
    }

    const updated = await prisma.courseWaitlist.update({
      where: { id: waitlistId },
      data: { priority },
    });

    return ok({
      message: "Waitlist priority updated successfully.",
      waitlistEntry: updated,
    });
  } catch (error) {
    console.error("Failed to update waitlist priority:", error);
    return problem(500, "SERVER_ERROR", "Failed to update waitlist priority.");
  }
}
