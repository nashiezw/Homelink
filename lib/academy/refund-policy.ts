import { getMainPrisma } from "@/lib/db/main-prisma";

export interface RefundPolicy {
  refundWindowDays: number;
  refundPercentage: number;
  courseCompletionThreshold: number;
  automaticApproval: boolean;
  requireReason: boolean;
  allowedReasons: string[];
}

const DEFAULT_REFUND_POLICY: RefundPolicy = {
  refundWindowDays: 30,
  refundPercentage: 100,
  courseCompletionThreshold: 20, // If user completes more than 20% of course, no refund
  automaticApproval: false,
  requireReason: true,
  allowedReasons: [
    "Course not as described",
    "Technical issues preventing access",
    "Personal circumstances",
    "Quality concerns",
    "Other",
  ],
};

export async function getRefundPolicy(): Promise<RefundPolicy> {
  // In a real implementation, this would be stored in the database
  // For now, return default policy
  return DEFAULT_REFUND_POLICY;
}

export async function checkRefundEligibility(
  paymentId: string,
  userId: string
): Promise<{
  eligible: boolean;
  reason: string;
  policy: RefundPolicy;
}> {
  const prisma = getMainPrisma();
  const policy = await getRefundPolicy();

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    return { eligible: false, reason: "Payment not found", policy };
  }

  if (payment.userId !== userId) {
    return { eligible: false, reason: "Payment does not belong to user", policy };
  }

  if (payment.status !== "PAID") {
    return { eligible: false, reason: "Payment is not in paid status", policy };
  }

  // Check refund window
  const paymentDate = payment.createdAt;
  const daysSincePayment = Math.floor((Date.now() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSincePayment > policy.refundWindowDays) {
    return {
      eligible: false,
      reason: `Refund window of ${policy.refundWindowDays} days has passed`,
      policy,
    };
  }

  // Check for existing refund request
  const existingRefund = await prisma.refundRequest.findFirst({
    where: { paymentId },
  });

  if (existingRefund) {
    return { eligible: false, reason: "Refund request already exists", policy };
  }

  return { eligible: true, reason: "Eligible for refund", policy };
}

export async function calculateRefundAmount(
  paymentId: string,
  requestedAmount?: number
): Promise<{
  refundAmount: number;
  currency: string;
  policy: RefundPolicy;
}> {
  const prisma = getMainPrisma();
  const policy = await getRefundPolicy();

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new Error("Payment not found");
  }

  const paymentAmount = Number(payment.amount);
  const maxRefundAmount = paymentAmount * (policy.refundPercentage / 100);

  if (requestedAmount && requestedAmount <= maxRefundAmount) {
    return {
      refundAmount: requestedAmount,
      currency: payment.currency,
      policy,
    };
  }

  return {
    refundAmount: maxRefundAmount,
    currency: payment.currency,
    policy,
  };
}

export async function validateRefundReason(reason: string): Promise<boolean> {
  const policy = await getRefundPolicy();
  return policy.allowedReasons.includes(reason) || reason === "Other";
}
