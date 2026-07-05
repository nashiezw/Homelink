import { ok } from "@/lib/api/response";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isPostgresStoreEnabled()) {
    const prisma = getMainPrisma();
    const [enquiries, paidPayments] = await Promise.all([
      prisma.propertyEnquiryRecord.count().catch(() => 0),
      prisma.payment
        .aggregate({ where: { status: "PAID" }, _sum: { amount: true } })
        .catch(() => ({ _sum: { amount: 0 } })),
    ]);
    const consultants = 0;
    const revenue = Number(paidPayments._sum.amount ?? 0);
    return ok({
      consultants,
      propertiesManaged: Math.max(enquiries, 0),
      rating: 4.9,
      transactionValue: `$${revenue.toLocaleString()}`,
      live: { consultants, managed: enquiries, requests: enquiries, revenue },
    });
  }
  return ok(getStore().getPMPublicStats());
}
