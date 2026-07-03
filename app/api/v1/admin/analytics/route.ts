import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export function GET(request: Request) {
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
