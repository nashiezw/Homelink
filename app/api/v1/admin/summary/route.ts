import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok } from "@/lib/api/response";
import { getPostgresAdminSummary } from "@/lib/admin/postgres-analytics";
import { isPostgresStoreEnabled } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;
  if (isPostgresStoreEnabled()) {
    return ok(await getPostgresAdminSummary());
  }
  const { computeAdminSummary } = await import("@/lib/admin/compute-analytics");
  return ok(computeAdminSummary());
}
