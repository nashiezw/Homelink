import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getPostgresLandlordAnalytics } from "@/lib/admin/postgres-analytics";
import { isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { getStore } from "@/lib/store/app-store";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to view landlord analytics.");
  }
  if (isPostgresStoreEnabled()) {
    try {
      return ok(await getPostgresLandlordAnalytics(userId));
    } catch (error) {
      console.error("Failed to load landlord analytics from Postgres", { userId, error });
      return problem(500, "LANDLORD_ANALYTICS_FAILED", "Landlord analytics could not be loaded.");
    }
  }
  return ok(getStore().getLandlordAnalytics(userId));
}
