import { requireAdminAsync } from "@/lib/admin/require-admin";
import { advancedAnalyticsToCsv, getAdvancedSiteAnalyticsReport } from "@/lib/analytics/advanced-report";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminAsync(request, "platform:read");
  if ("error" in auth && auth.error) return auth.error;

  const url = new URL(request.url);
  const days = Number(url.searchParams.get("days") || 30);
  const report = await getAdvancedSiteAnalyticsReport(Number.isFinite(days) ? days : 30);
  const csv = advancedAnalyticsToCsv(report);
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="houselink-advanced-analytics-${report.days}d.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
