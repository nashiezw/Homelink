import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to export coupons.");

  try {
    const prisma = getMainPrisma();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where = activeOnly ? { active: true } : {};

    const coupons = await prisma.academyCoupon.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { usages: true },
        },
      },
    });

    // Convert to CSV
    const headers = ["code", "discountType", "discountValue", "maxUses", "usedCount", "validUntil", "applicableCourses", "active", "createdAt", "usageCount"];
    const csvRows = [headers.join(",")];

    coupons.forEach((coupon) => {
      const row = [
        coupon.code,
        coupon.discountType,
        coupon.discountValue.toString(),
        coupon.maxUses?.toString() || "",
        coupon.usedCount.toString(),
        coupon.validUntil?.toISOString() || "",
        coupon.applicableCourses.join(";"),
        coupon.active.toString(),
        coupon.createdAt.toISOString(),
        Number(coupon._count.usages).toString(),
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="coupons-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Failed to export coupons:", error);
    return problem(500, "SERVER_ERROR", "Failed to export coupons.");
  }
}
