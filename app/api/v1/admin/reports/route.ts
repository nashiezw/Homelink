import { requireAdmin } from "@/lib/admin/require-admin";
import { rowsToCsv } from "@/lib/admin/csv";
import { ok } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "revenue";
  const format = searchParams.get("format") ?? "json";
  const store = getStore();
  const data = store.generateReportData(type);

  if (format === "csv") {
    const csv = rowsToCsv(data.rows as Array<Record<string, unknown>>);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="homelink-${type}-report.csv"`,
      },
    });
  }

  return ok(data);
}
