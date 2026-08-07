import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to request a refund.");

  try {
    const prisma = getMainPrisma();
    const body = await request.json();
    const { paymentId, reason, amount } = body;

    if (!paymentId || !reason) {
      return problem(400, "MISSING_FIELDS", "Payment ID and reason are required.");
    }

    // Check if payment exists and belongs to user
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return problem(404, "PAYMENT_NOT_FOUND", "Payment not found.");
    }

    if (payment.userId !== userId) {
      return problem(403, "FORBIDDEN", "You can only request refunds for your own payments.");
    }

    // Check if payment is eligible for refund (within 30 days and paid)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (payment.status !== "PAID") {
      return problem(400, "NOT_ELIGIBLE", "Only paid payments can be refunded.");
    }

    if (payment.createdAt < thirtyDaysAgo) {
      return problem(400, "NOT_ELIGIBLE", "Refund requests must be made within 30 days of payment.");
    }

    // Check if refund already exists
    const existingRefund = await prisma.refundRequest.findFirst({
      where: { paymentId },
    });

    if (existingRefund) {
      return problem(400, "ALREADY_REQUESTED", "A refund request already exists for this payment.");
    }

    const refundAmount = amount || Number(payment.amount);

    if (refundAmount > Number(payment.amount)) {
      return problem(400, "INVALID_AMOUNT", "Refund amount cannot exceed payment amount.");
    }

    const refundRequest = await prisma.refundRequest.create({
      data: {
        paymentId,
        learnerId: userId,
        reason,
        status: "PENDING",
      },
    });

    return ok({
      message: "Refund request submitted successfully.",
      refundRequest,
    });
  } catch (error) {
    console.error("Failed to create refund request:", error);
    return problem(500, "SERVER_ERROR", "Failed to create refund request.");
  }
}

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to view refund requests.");

  try {
    const prisma = getMainPrisma();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const refunds = await prisma.refundRequest.findMany({
      where,
      include: {
        payment: {
          select: {
            id: true,
            amount: true,
            currency: true,
            createdAt: true,
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
