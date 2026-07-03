import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { created, ok, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to view saved searches.");
  }
  return ok(getStore().getSavedSearches(userId));
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to create alerts.");
  }
  const body = await request.json();
  if (!body.name) {
    return problem(400, "NAME_REQUIRED", "Alert name is required.");
  }
  return created(
    getStore().createSavedSearch(userId, {
      name: body.name,
      channels: body.channels,
      filters: body.filters,
    }),
  );
}
