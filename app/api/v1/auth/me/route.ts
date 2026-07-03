import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to continue.");
  }
  const user = getStore().getUserById(userId);
  if (!user) {
    return problem(401, "UNAUTHORIZED", "Session is no longer valid.");
  }
  const store = getStore();
  return ok({
    ...store.publicUser(user),
    savedCount: store.getFavourites(userId).length,
    alertCount: store.getSavedSearches(userId).length,
  });
}
