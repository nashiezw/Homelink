import { ok } from "@/lib/api/response";
import { requireAdminAsync } from "@/lib/admin/require-admin";
import { getPostgresControlCenter } from "@/lib/admin/postgres-analytics";
import { isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { getStore } from "@/lib/store/app-store";

export async function GET(request: Request) {
  const auth = await requireAdminAsync(request, "platform:read");
  if ("error" in auth && auth.error) return auth.error;

  if (isPostgresStoreEnabled()) {
    return ok(await getPostgresControlCenter("all"));
  }

  return ok(getStore().getAdminAnalytics());
}
