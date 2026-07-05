import {
  computeAdminOverview,
  computeAdminSummary,
  computePropertyAnalytics,
  computeUserAnalytics,
  getActivityFeed,
  getAuditLog,
  getModerationQueue,
  getPaymentsCenter,
  getSecuritySnapshot,
  getSupportTickets,
  getSystemHealth,
  getVerificationQueue,
} from "@/lib/admin/compute-analytics";
import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok } from "@/lib/api/response";
import { isPostgresStoreEnabled } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) {
    return auth.error;
  }

  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section") ?? "overview";
  if (isPostgresStoreEnabled()) {
    const summary = {
      users: { total: 0, activeToday: 0, weeklyActive: 0, pendingVerification: 0, blocked: 0, suspended: 0, deleted: 0 },
      listings: { total: 0, active: 0, pending: 0, rejected: 0, flagged: 0 },
      enquiries: { total: 0, open: 0, urgent: 0, closed: 0 },
      payments: { totalRevenue: 0, pendingPayouts: 0, failedPayments: 0 },
    };
    if (section === "summary") return ok(summary);
    if (section === "all") return ok({ overview: {}, activity: [], audit: [], summary });
    return ok({ [section]: section === "overview" ? {} : {}, summary });
  }

  switch (section) {
    case "overview":
      return ok({
        overview: computeAdminOverview(),
        activity: getActivityFeed(),
        audit: getAuditLog().slice(0, 8),
        summary: computeAdminSummary(),
      });
    case "users":
      return ok({ users: computeUserAnalytics() });
    case "properties":
      return ok({ properties: computePropertyAnalytics() });
    case "verification":
      return ok({ verification: getVerificationQueue() });
    case "moderation":
      return ok({ moderation: getModerationQueue() });
    case "support":
      return ok({ support: getSupportTickets() });
    case "payments":
      return ok({ payments: getPaymentsCenter() });
    case "system":
      return ok({ system: getSystemHealth() });
    case "security":
      return ok({ security: getSecuritySnapshot(), audit: getAuditLog().slice(0, 30) });
    case "summary":
      return ok(computeAdminSummary());
    case "all":
      return ok({
        overview: computeAdminOverview(),
        users: computeUserAnalytics(),
        properties: computePropertyAnalytics(),
        verification: getVerificationQueue(),
        moderation: getModerationQueue(),
        support: getSupportTickets(),
        payments: getPaymentsCenter(),
        system: getSystemHealth(),
        security: getSecuritySnapshot(),
        activity: getActivityFeed(),
        audit: getAuditLog(),
        summary: computeAdminSummary(),
      });
    default:
      return ok({ overview: computeAdminOverview() });
  }
}
