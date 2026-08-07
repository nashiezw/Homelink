import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to view refund requests.");

  try {
    const prisma = getMainPrisma();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const refunds = await prisma.refundRequest.findMany({
      where,
      include: {
        learner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        payment: {
          select: {
            id: true,
            amount: true,
            currency: true,
            createdAt: true,
            provider: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok({ refunds });
  } catch (error) {
    console.error("Failed to get refund requests:", error);
    return problem(500, "SERVER_ERROR", "Failed to get refund requests.");
  }
}

export async function PATCH(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to process refund requests.");

  try {
    const prisma = getMainPrisma();
    const body = await request.json();
    const { refundId, action } = body;

    if (!refundId || !["approve", "reject", "process"].includes(action)) {
      return problem(400, "INVALID_INPUT", "Valid refundId and action are required.");
    }

    const refund = await prisma.refundRequest.findUnique({
      where: { id: refundId },
      include: {
        payment: true,
      },
    });

    if (!refund) {
      return problem(404, "NOT_FOUND", "Refund request not found.");
    }

    if (action === "approve") {
      await prisma.refundRequest.update({
        where: { id: refundId },
        data: { status: "APPROVED" },
      });

      return ok({ message: "Refund request approved." });
    }

    if (action === "reject") {
      await prisma.refundRequest.update({
        where: { id: refundId },
        data: { status: "REJECTED" },
      });

      return ok({ message: "Refund request rejected." });
    }

    if (action === "process") {
      // In a real implementation, this would integrate with the payment gateway
      // For now, we'll mark it as completed
      await prisma.refundRequest.update({
        where: { id: refundId },
        data: {
          status: "COMPLETED",
          processedAt: new Date(),
        },
      });

      // Update payment status
      await prisma.payment.update({
        where: { id: refund.paymentId },
        data: { status: "REFUNDED" },
      });

      return ok({ message: "Refund processed successfully." });
    }

    return problem(400, "INVALID_ACTION", "Invalid action.");
  } catch (error) {
    console.error("Failed to process refund request:", error);
    return problem(500, "SERVER_ERROR", "Failed to process refund request.");
  }
}
