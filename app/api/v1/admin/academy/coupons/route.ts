import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { CouponDiscountType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;
  
  const prisma = getMainPrisma();
  const { searchParams } = new URL(request.url);
  const active = searchParams.get("active");
  
  try {
    const coupons = await prisma.academyCoupon.findMany({
      where: active !== null ? { active: active === "true" } : undefined,
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
        usages: { take: 10, orderBy: { createdAt: "desc" } },
        _count: { select: { usages: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    
    return ok(coupons.map(coupon => ({
      ...coupon,
      discountValue: Number(coupon.discountValue),
      minPurchaseAmount: coupon.minPurchaseAmount ? Number(coupon.minPurchaseAmount) : null,
      remainingUses: coupon.maxUses ? coupon.maxUses - coupon.usedCount : null,
      isValid: coupon.active && 
                (!coupon.validUntil || new Date(coupon.validUntil) > new Date()) &&
                (!coupon.maxUses || coupon.usedCount < coupon.maxUses),
    })));
  } catch (error) {
    console.error("Failed to load coupons", error);
    return problem(500, "COUPONS_LOAD_FAILED", "Coupons could not be loaded.");
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;
  
  try {
    const body = await request.json();
    const prisma = getMainPrisma();
    
    // Validate coupon code format (alphanumeric, uppercase, no spaces)
    const code = String(body.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!code || code.length < 4) {
      return problem(400, "INVALID_CODE", "Coupon code must be at least 4 characters (letters and numbers only).");
    }
    
    // Check if code already exists
    const existing = await prisma.academyCoupon.findUnique({ where: { code } });
    if (existing) {
      return problem(409, "CODE_EXISTS", "This coupon code already exists.");
    }
    
    const coupon = await prisma.academyCoupon.create({
      data: {
        code,
        description: body.description || null,
        discountType: body.discountType || CouponDiscountType.PERCENTAGE,
        discountValue: body.discountValue,
        maxUses: body.maxUses || null,
        usedCount: 0,
        minPurchaseAmount: body.minPurchaseAmount || null,
        validFrom: body.validFrom ? new Date(body.validFrom) : new Date(),
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
        applicableCourses: body.applicableCourses || [],
        applicableRoles: body.applicableRoles || [],
        active: body.active !== false,
        createdBy: auth.user.id,
      }
    });
    
    return ok({
      ...coupon,
      discountValue: Number(coupon.discountValue),
      minPurchaseAmount: coupon.minPurchaseAmount ? Number(coupon.minPurchaseAmount) : null,
    });
  } catch (error) {
    console.error("Failed to create coupon", error);
    return problem(500, "COUPON_CREATE_FAILED", "Coupon could not be created.");
  }
}
