import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to bulk update coupons.");

  try {
    const body = await request.json();
    const { action, couponIds, dateRange } = body;

    if (!action || !["activate", "deactivate"].includes(action)) {
      return problem(400, "INVALID_ACTION", "Action must be 'activate' or 'deactivate'.");
    }

    const prisma = getMainPrisma();
    let where: any = {};

    // Handle bulk by IDs
    if (couponIds && Array.isArray(couponIds) && couponIds.length > 0) {
      where.id = { in: couponIds };
    }
    // Handle bulk by date range
    else if (dateRange) {
      const { startDate, endDate } = dateRange;
      if (startDate && endDate) {
        where.createdAt = {
          gte: new Date(startDate),
          lte: new Date(endDate),
        };
      } else if (startDate) {
        where.createdAt = { gte: new Date(startDate) };
      } else if (endDate) {
        where.createdAt = { lte: new Date(endDate) };
      }
    } else {
      return problem(400, "MISSING_FILTER", "Either couponIds or dateRange is required.");
    }

    const active = action === "activate";

    const result = await prisma.academyCoupon.updateMany({
      where,
      data: { active },
    });

    return ok({
      message: `Successfully ${action}d ${result.count} coupons.`,
      count: result.count,
    });
  } catch (error) {
    console.error("Failed to bulk update coupons:", error);
    return problem(500, "SERVER_ERROR", "Failed to bulk update coupons.");
  }
}
