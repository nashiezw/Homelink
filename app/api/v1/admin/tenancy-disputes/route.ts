import { requireAdmin } from "@/lib/admin/require-admin";
import { ok } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const disputes = getStore().listTenancyDisputes(
    status as import("@/lib/residence/types").TenancyDisputeStatus | undefined,
  );
  return ok({ disputes });
}
