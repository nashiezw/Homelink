import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok } from "@/lib/api/response";
import { isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { listTenancyDisputesFromPostgres } from "@/lib/residence/postgres-tenancy-repository";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  if (isPostgresStoreEnabled()) {
    return ok({
      disputes: await listTenancyDisputesFromPostgres(
        status as import("@/lib/residence/types").TenancyDisputeStatus | undefined,
      ),
    });
  }

  const disputes = getStore().listTenancyDisputes(
    status as import("@/lib/residence/types").TenancyDisputeStatus | undefined,
  );
  return ok({ disputes });
}
