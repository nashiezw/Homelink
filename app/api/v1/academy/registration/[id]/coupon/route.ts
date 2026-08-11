import { Prisma, AcademyRegistrationStatus, PaymentStatus, Role } from "@prisma/client";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { rewardSuccessfulAcademyReferral } from "@/lib/academy/engagement-repository";

export const dynamic = "force-dynamic";

function normalizeCouponCode(value: unknown) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function jsonObject(value: Prisma.JsonValue | null | undefined): Prisma.InputJsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Prisma.InputJsonObject) : {};
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to apply a promo code.");

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const code = normalizeCouponCode(body.code);
  if (!code) return problem(400, "CODE_REQUIRED", "Enter a promo code.");

  const prisma = getMainPrisma();
  const registration = await prisma.academyLearnerApplication.findFirst({
    where: { id, learnerId: userId },
    include: {
      course: true,
      payment: true,
    },
  });

  if (!registration) return problem(404, "REGISTRATION_NOT_FOUND", "Registration not found.");
  if (registration.status !== AcademyRegistrationStatus.PENDING_PAYMENT) {
    return problem(400, "PROMO_LOCKED", "Promo codes can only be applied before payment proof is uploaded or registration is approved.");
  }
  if (!registration.payment) return problem(400, "PAYMENT_NOT_FOUND", "No payment record is attached to this registration.");
  if (registration.payment.proofStatus === "UPLOADED" || registration.payment.proofStatus === "VERIFIED" || registration.proofUrl) {
    return problem(400, "PAYMENT_PROOF_ALREADY_UPLOADED", "A promo code cannot be applied after payment proof has been uploaded.");
  }

  const currentAmount = Number(registration.payment.amount);
  if (!Number.isFinite(currentAmount) || currentAmount <= 0) {
    return problem(400, "NO_BALANCE_DUE", "There is no remaining payment balance for this registration.");
  }

  const existingPaymentUsage = await prisma.academyCouponUsage.findFirst({
    where: { paymentId: registration.payment.id },
  });
  if (existingPaymentUsage) {
    return problem(400, "PROMO_ALREADY_APPLIED", "A promo code has already been applied to this registration.");
  }

  const coupon = await prisma.academyCoupon.findUnique({ where: { code } });
  if (!coupon) return problem(404, "COUPON_NOT_FOUND", "This promo code does not exist.");
  if (!coupon.active) return problem(400, "COUPON_INACTIVE", "This promo code is currently inactive.");

  const now = new Date();
  if (coupon.validFrom && coupon.validFrom > now) return problem(400, "COUPON_NOT_STARTED", "This promo code is not yet valid.");
  if (coupon.validUntil && coupon.validUntil < now) return problem(400, "COUPON_EXPIRED", "This promo code has expired.");
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return problem(400, "COUPON_EXHAUSTED", "This promo code has reached its usage limit.");
  if (coupon.minPurchaseAmount && currentAmount < Number(coupon.minPurchaseAmount)) {
    return problem(400, "MIN_PURCHASE_NOT_MET", `Minimum purchase amount of ${registration.currency} ${Number(coupon.minPurchaseAmount).toFixed(2)} required for this promo code.`);
  }
  if (coupon.applicableCourses.length > 0 && !coupon.applicableCourses.includes(registration.courseId)) {
    return problem(400, "COUPON_NOT_APPLICABLE", "This promo code is not applicable to this course.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { roles: true } });
  if (coupon.applicableRoles.length > 0 && user && !coupon.applicableRoles.some((role) => user.roles.includes(role as never))) {
    return problem(400, "COUPON_NOT_ELIGIBLE", "You are not eligible for this promo code.");
  }

  const previousUserUsage = await prisma.academyCouponUsage.findFirst({
    where: { couponId: coupon.id, userId },
  });
  if (previousUserUsage) return problem(400, "COUPON_ALREADY_USED", "You have already used this promo code.");

  const rawDiscount = coupon.discountType === "PERCENTAGE"
    ? currentAmount * (Number(coupon.discountValue) / 100)
    : Number(coupon.discountValue);
  const discountAmount = Math.min(currentAmount, Math.max(0, rawDiscount));
  if (discountAmount <= 0) return problem(400, "NO_DISCOUNT", "This promo code does not reduce the current balance.");

  const finalAmount = Math.max(0, currentAmount - discountAmount);
  const fullyCovered = finalAmount <= 0;
  const accessEndsAt = new Date(now.getTime() + registration.course.accessDurationDays * 86400000);
  const paymentMetadata = jsonObject(registration.payment.metadata);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.academyCoupon.update({
      where: { id: coupon.id },
      data: { usedCount: { increment: 1 } },
    });
    await tx.academyCouponUsage.create({
      data: {
        couponId: coupon.id,
        userId,
        paymentId: registration.payment!.id,
        discountAmount: new Prisma.Decimal(discountAmount),
        originalAmount: new Prisma.Decimal(currentAmount),
        finalAmount: new Prisma.Decimal(finalAmount),
      },
    });
    await tx.payment.update({
      where: { id: registration.payment!.id },
      data: {
        amount: new Prisma.Decimal(finalAmount),
        status: fullyCovered ? PaymentStatus.PAID : PaymentStatus.PENDING,
        proofStatus: fullyCovered ? "NONE" : "REQUESTED",
        manual: !fullyCovered,
        metadata: {
          ...paymentMetadata,
          couponCode: coupon.code,
          couponId: coupon.id,
          discountAmount: discountAmount.toFixed(2),
          lateCouponApplied: true,
          lateCouponAppliedAt: now.toISOString(),
        },
      },
    });
    const application = await tx.academyLearnerApplication.update({
      where: { id: registration.id },
      data: {
        amount: new Prisma.Decimal(finalAmount),
        status: fullyCovered ? AcademyRegistrationStatus.APPROVED : AcademyRegistrationStatus.PENDING_PAYMENT,
        accessStartsAt: fullyCovered ? now : registration.accessStartsAt,
        accessEndsAt: fullyCovered ? accessEndsAt : registration.accessEndsAt,
      },
    });
    if (fullyCovered) {
      if (user && !user.roles.includes(Role.PUBLIC_LEARNER)) {
        await tx.user.update({ where: { id: userId }, data: { roles: [...user.roles, Role.PUBLIC_LEARNER] } });
      }
      await tx.courseEnrolment.upsert({
        where: { courseId_agentId: { courseId: registration.courseId, agentId: userId } },
        create: { courseId: registration.courseId, agentId: userId, status: "ACTIVE", dueAt: accessEndsAt },
        update: { status: "ACTIVE", dueAt: accessEndsAt },
      });
    }
    await tx.trainingNotification.create({
      data: {
        userId,
        eventType: "ACADEMY_PROMO_APPLIED",
        channel: "IN_APP",
        subject: fullyCovered ? "Academy promo activated your access" : "Academy promo applied",
        body: fullyCovered
          ? `${coupon.code} covered your ${registration.course.title} registration. Your course access is active.`
          : `${coupon.code} reduced your ${registration.course.title} balance to ${registration.currency} ${finalAmount.toFixed(2)}.`,
      },
    });
    await tx.trainingAuditLog.create({
      data: {
        actorId: userId,
        action: "academy.registration.promo_applied",
        target: registration.id,
        metadata: {
          courseId: registration.courseId,
          learnerId: userId,
          couponId: coupon.id,
          couponCode: coupon.code,
          originalAmount: currentAmount,
          discountAmount,
          finalAmount,
          fullyCovered,
        } as Prisma.InputJsonObject,
      },
    });
    return application;
  });

  if (fullyCovered) {
    await rewardSuccessfulAcademyReferral({ learnerId: userId, courseId: registration.courseId });
  }

  return ok({
    id: updated.id,
    courseId: registration.course.id,
    courseTitle: registration.course.title,
    status: updated.status,
    paymentId: registration.payment.id,
    finalPrice: finalAmount,
    currency: registration.currency,
    needsPaymentProof: !fullyCovered,
    promoApplied: true,
    discountAmount,
    code: coupon.code,
  });
}
