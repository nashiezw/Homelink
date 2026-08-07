import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to view coupon analytics.");

  try {
    const prisma = getMainPrisma();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.lte = new Date(endDate);
    }

    // Get overall statistics
    const totalCoupons = await prisma.academyCoupon.count(dateFilter);
    const activeCoupons = await prisma.academyCoupon.count({
      ...dateFilter,
      where: { active: true },
    });
    const expiredCoupons = await prisma.academyCoupon.count({
      ...dateFilter,
      where: { expiresAt: { lt: new Date() } },
    });

    // Get usage statistics
    const couponsWithUsage = await prisma.academyCoupon.findMany({
      where: dateFilter,
      include: {
        _count: {
          select: { usages: true },
        },
      },
    });

    const totalUsages = couponsWithUsage.reduce((sum, coupon) => sum + coupon._count.usages, 0);
    const totalDiscountValue = couponsWithUsage.reduce((sum, coupon) => {
      const usageCount = coupon._count.usages;
      const discountPerUse = Number(coupon.discountValue);
      return sum + (usageCount * discountPerUse);
    }, 0);

    // Get top performing coupons
    const topCoupons = [...couponsWithUsage]
      .sort((a, b) => b._count.usages - a._count.usages)
      .slice(0, 10)
      .map((coupon) => ({
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        usageCount: coupon._count.usages,
        active: coupon.active,
      }));

    // Get usage by discount type
    const usageByType = couponsWithUsage.reduce((acc, coupon) => {
      const type = coupon.discountType;
      if (!acc[type]) {
        acc[type] = { count: 0, totalDiscount: 0 };
      }
      acc[type].count += coupon._count.usages;
      acc[type].totalDiscount += coupon._count.usages * Number(coupon.discountValue);
      return acc;
    }, {} as Record<string, { count: number; totalDiscount: number }>);

    // Get usage trends over time (by month)
    const usageTrends = await prisma.academyCouponUsage.groupBy({
      by: ["createdAt"],
      where: dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : undefined,
      _count: true,
      orderBy: { createdAt: "asc" },
    });

    const monthlyUsage = usageTrends.reduce((acc, item) => {
      const month = item.createdAt.toISOString().slice(0, 7); // YYYY-MM
      if (!acc[month]) {
        acc[month] = 0;
      }
      acc[month] += item._count;
      return acc;
    }, {} as Record<string, number>);

    return ok({
      overview: {
        total: totalCoupons,
        active: activeCoupons,
        expired: expiredCoupons,
        totalUsages,
        totalDiscountValue,
      },
      topCoupons,
      usageByType: Object.entries(usageByType).map(([type, data]) => ({
        type,
        usageCount: data.count,
        totalDiscount: data.totalDiscount,
      })),
      monthlyUsage: Object.entries(monthlyUsage).map(([month, count]) => ({
        month,
        count,
      })),
    });
  } catch (error) {
    console.error("Failed to get coupon analytics:", error);
    return problem(500, "SERVER_ERROR", "Failed to get coupon analytics.");
  }
}
