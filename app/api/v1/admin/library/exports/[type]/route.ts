import { requireAdmin, requireAdminAsync } from "@/lib/admin/require-admin";
import { problem } from "@/lib/api/response";
import { isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { buildLibraryExportCsv } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ type: string }> }) {
  const auth = isPostgresStoreEnabled() ? await requireAdminAsync(request) : requireAdmin(request);
  if (auth.error) return auth.error;
  const { type } = await context.params;
  const safeType = decodeURIComponent(type).replace(/\.csv$/i, "").trim().toLowerCase() || "products";
  try {
    const csv = await buildLibraryExportCsv(safeType);
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="houselink-library-${safeType}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[admin/library/exports] GET failed", error);
    return problem(500, "LIBRARY_EXPORT_FAILED", "Library export could not be generated.");
  }
}
