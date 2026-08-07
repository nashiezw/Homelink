import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to view registration status.");

  const { id } = await params;
  const prisma = getMainPrisma();
  
  try {
    const registration = await prisma.academyLearnerApplication.findFirst({
      where: {
        id: id,
        learnerId: userId,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        payment: {
          select: {
            id: true,
            status: true,
            proofStatus: true,
            amount: true,
            currency: true,
          },
        },
      },
    });

    if (!registration) {
      return problem(404, "NOT_FOUND", "Registration not found.");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerifiedAt: true },
    });

    return ok({
      id: registration.id,
      courseId: registration.course.id,
      courseTitle: registration.course.title,
      status: registration.status,
      paymentId: registration.paymentId,
      finalPrice: registration.payment ? Number(registration.payment.amount) : undefined,
      currency: registration.payment?.currency || "USD",
      needsPaymentProof: registration.status === "PENDING_PAYMENT" && (!registration.payment || registration.payment.proofStatus !== "UPLOADED"),
      emailVerified: !!user?.emailVerifiedAt,
    });
  } catch (error) {
    console.error("Failed to fetch registration status", error);
    return problem(500, "SERVER_ERROR", "Failed to load registration status.");
  }
}
