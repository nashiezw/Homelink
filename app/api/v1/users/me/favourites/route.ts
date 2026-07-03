import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { created, ok, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to view favourites.");
  }
  return ok(getStore().getFavourites(userId));
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to save listings.");
  }
  const body = await request.json();
  if (!body.listingId) {
    return problem(400, "LISTING_REQUIRED", "listingId is required.");
  }
  const listing = getStore().getListing(body.listingId);
  if (!listing) {
    return problem(404, "LISTING_NOT_FOUND", "Listing could not be found.");
  }
  return created(getStore().addFavourite(userId, body.listingId));
}
