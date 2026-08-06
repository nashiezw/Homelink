import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to validate coupons.");
  
  try {
    const body = await request.json();
    const code = String(body.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const courseId = body.courseId;
    const amount = Number(body.amount) || 0;
    
    if (!code) {
      return problem(400, "CODE_REQUIRED", "Coupon code is required.");
    }
    
    const prisma = getMainPrisma();
    
    const coupon = await prisma.academyCoupon.findUnique({
      where: { code },
      include: {
        _count: { select: { usages: true } },
      },
    });
    
    if (!coupon) {
      return problem(404, "COUPON_NOT_FOUND", "This coupon code does not exist.");
    }
    
    // Check if coupon is active
    if (!coupon.active) {
      return problem(400, "COUPON_INACTIVE", "This coupon is currently inactive.");
    }
    
    // Check validity dates
    const now = new Date();
    if (coupon.validFrom && new Date(coupon.validFrom) > now) {
      return problem(400, "COUPON_NOT_STARTED", "This coupon is not yet valid.");
    }
    if (coupon.validUntil && new Date(coupon.validUntil) < now) {
      return problem(400, "COUPON_EXPIRED", "This coupon has expired.");
    }
    
    // Check usage limit
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return problem(400, "COUPON_EXHAUSTED", "This coupon has reached its usage limit.");
    }
    
    // Check minimum purchase amount
    if (coupon.minPurchaseAmount && amount < Number(coupon.minPurchaseAmount)) {
      return problem(400, "MIN_PURCHASE_NOT_MET", `Minimum purchase amount of $${Number(coupon.minPurchaseAmount)} required for this coupon.`);
    }
    
    // Check course applicability
    if (coupon.applicableCourses.length > 0 && courseId && !coupon.applicableCourses.includes(courseId)) {
      return problem(400, "COUPON_NOT_APPLICABLE", "This coupon is not applicable to this course.");
    }
    
    // Check role applicability
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { roles: true } });
    if (coupon.applicableRoles.length > 0 && user && !coupon.applicableRoles.some(role => user.roles.includes(role))) {
      return problem(400, "COUPON_NOT_ELIGIBLE", "You are not eligible for this coupon.");
    }
    
    // Check if user already used this coupon
    const existingUsage = await prisma.academyCouponUsage.findFirst({
      where: { couponId: coupon.id, userId },
    });
    if (existingUsage) {
      return problem(400, "COUPON_ALREADY_USED", "You have already used this coupon.");
    }
    
    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      discountAmount = amount * (Number(coupon.discountValue) / 100);
    } else {
      discountAmount = Number(coupon.discountValue);
    }
    
    // Ensure discount doesn't exceed amount
    discountAmount = Math.min(discountAmount, amount);
    const finalAmount = amount - discountAmount;
    
    return ok({
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      discountAmount,
      originalAmount: amount,
      finalAmount,
      savings: discountAmount,
      remainingUses: coupon.maxUses ? coupon.maxUses - coupon.usedCount : null,
    });
  } catch (error) {
    console.error("Failed to validate coupon", error);
    return problem(500, "COUPON_VALIDATION_FAILED", "Coupon validation failed.");
  }
}
