import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { requireAdminAsync } from "@/lib/admin/require-admin";
import { getPostgresControlCenter } from "@/lib/admin/postgres-analytics";
import { isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { getStore } from "@/lib/store/app-store";

export async function GET(request: Request) {
  if (isPostgresStoreEnabled()) {
    const auth = await requireAdminAsync(request);
    if ("error" in auth && auth.error) return auth.error;
    return ok(await getPostgresControlCenter("all"));
  }

  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to view admin analytics.");
  }
  const user = getStore().getUserById(userId);
  if (!user?.roles.includes("ADMIN")) {
    return problem(403, "FORBIDDEN", "Admin access required.");
  }
  return ok(getStore().getAdminAnalytics());
}
