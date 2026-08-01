import { ok } from "@/lib/api/response";
import { requireAdminAsync } from "@/lib/admin/require-admin";
import { getAdvancedSiteAnalyticsReport } from "@/lib/analytics/advanced-report";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminAsync(request, "platform:read");
  if ("error" in auth && auth.error) return auth.error;

  const url = new URL(request.url);
  const days = Number(url.searchParams.get("days") || 30);
  return ok(await getAdvancedSiteAnalyticsReport(Number.isFinite(days) ? days : 30));
}
