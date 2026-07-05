import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { created, ok, problem } from "@/lib/api/response";
import {
  createSavedSearchInPostgres,
  listSavedSearchesFromPostgres,
  shouldUsePostgresPersistence,
} from "@/lib/db/postgres-app-repository";
import { getStore } from "@/lib/store/app-store";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to view saved searches.");
  }
  if (shouldUsePostgresPersistence()) {
    return ok(await listSavedSearchesFromPostgres(userId));
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
  if (shouldUsePostgresPersistence()) {
    try {
      return created(
        await createSavedSearchInPostgres(userId, {
          name: body.name,
          channels: body.channels,
          filters: body.filters,
        }),
      );
    } catch (error) {
      console.error("Failed to create saved search", error);
      return problem(500, "SAVED_SEARCH_CREATE_FAILED", "Alert could not be saved.");
    }
  }
  return created(
    getStore().createSavedSearch(userId, {
      name: body.name,
      channels: body.channels,
      filters: body.filters,
    }),
  );
}
