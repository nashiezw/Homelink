import type { Prisma } from "@prisma/client";

type AcademyTransaction = Prisma.TransactionClient;

export async function releaseAcademyCouponUsageByPayment(tx: AcademyTransaction, paymentId: string | null | undefined) {
  if (!paymentId) {
    return { releasedUsageIds: [] as string[], couponIds: [] as string[] };
  }

  const usages = await tx.academyCouponUsage.findMany({
    where: { paymentId },
    select: { id: true, couponId: true },
  });

  if (!usages.length) {
    return { releasedUsageIds: [] as string[], couponIds: [] as string[] };
  }

  const releasedUsageIds = usages.map((usage) => usage.id);
  const couponIds = Array.from(new Set(usages.map((usage) => usage.couponId)));

  await tx.academyCouponUsage.deleteMany({
    where: { id: { in: releasedUsageIds } },
  });

  await Promise.all(
    couponIds.map(async (couponId) => {
      const usedCount = await tx.academyCouponUsage.count({ where: { couponId } });
      await tx.academyCoupon.update({ where: { id: couponId }, data: { usedCount } });
    }),
  );

  return { releasedUsageIds, couponIds };
}
