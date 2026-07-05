import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok } from "@/lib/api/response";
import { computeAdminSummary } from "@/lib/admin/compute-analytics";
import { isPostgresStoreEnabled } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;
  if (isPostgresStoreEnabled()) {
    return ok({
      users: { total: 0, activeToday: 0, weeklyActive: 0, pendingVerification: 0, blocked: 0, suspended: 0, deleted: 0 },
      listings: { total: 0, active: 0, pending: 0, rejected: 0, flagged: 0 },
      enquiries: { total: 0, open: 0, urgent: 0, closed: 0 },
      payments: { totalRevenue: 0, pendingPayouts: 0, failedPayments: 0 },
    });
  }
  return ok(computeAdminSummary());
}
