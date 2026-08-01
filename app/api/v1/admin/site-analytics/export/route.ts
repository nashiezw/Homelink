import { requireAdminAsync } from "@/lib/admin/require-admin";
import { getSiteAnalyticsReport, siteAnalyticsReportToCsv } from "@/lib/analytics/site-analytics";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminAsync(request, "platform:read");
  if ("error" in auth && auth.error) return auth.error;

  const url = new URL(request.url);
  const days = Number(url.searchParams.get("days") || 30);
  const report = await getSiteAnalyticsReport(Number.isFinite(days) ? days : 30);
  const csv = siteAnalyticsReportToCsv(report);
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="houselink-analytics-${report.days}d.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
