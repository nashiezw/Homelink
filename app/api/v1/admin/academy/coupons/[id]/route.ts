import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;
  
  const { id } = await context.params;
  const body = await request.json();
  const prisma = getMainPrisma();
  
  try {
    const coupon = await prisma.academyCoupon.update({
      where: { id },
      data: {
        description: body.description,
        discountType: body.discountType,
        discountValue: body.discountValue,
        maxUses: body.maxUses,
        minPurchaseAmount: body.minPurchaseAmount,
        validFrom: body.validFrom ? new Date(body.validFrom) : undefined,
        validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
        applicableCourses: body.applicableCourses,
        applicableRoles: body.applicableRoles,
        active: body.active,
      }
    });
    
    return ok({
      ...coupon,
      discountValue: Number(coupon.discountValue),
      minPurchaseAmount: coupon.minPurchaseAmount ? Number(coupon.minPurchaseAmount) : null,
    });
  } catch (error) {
    console.error("Failed to update coupon", error);
    return problem(500, "COUPON_UPDATE_FAILED", "Coupon could not be updated.");
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;
  
  const { id } = await context.params;
  const prisma = getMainPrisma();
  
  try {
    await prisma.academyCoupon.delete({ where: { id } });
    return ok({ deleted: id });
  } catch (error) {
    console.error("Failed to delete coupon", error);
    return problem(500, "COUPON_DELETE_FAILED", "Coupon could not be deleted.");
  }
}
