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
import { requireAdmin } from "@/lib/admin/require-admin";
import { ok } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section") ?? "overview";

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
