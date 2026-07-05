import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { resolvePostgresTenancyDispute } from "@/lib/admin/postgres-analytics";
import { isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;

  const adminId = getSessionUserIdFromRequest(request)!;
  const { id } = await params;
  const body = await request.json();
  const resolution = body.resolution === "removed" ? "removed" : "upheld";

  if (isPostgresStoreEnabled()) {
    const dispute = resolvePostgresTenancyDispute(
      id,
      resolution,
      adminId,
      typeof body.adminNote === "string" ? body.adminNote : undefined,
    );
    if (!dispute) {
      return problem(404, "NOT_FOUND", "Dispute not found.");
    }
    return ok({ dispute });
  }

  const dispute = getStore().resolveTenancyDispute(
    id,
    resolution,
    adminId,
    typeof body.adminNote === "string" ? body.adminNote : undefined,
  );

  if (!dispute) {
    return problem(404, "NOT_FOUND", "Dispute not found.");
  }

  return ok({ dispute });
}
