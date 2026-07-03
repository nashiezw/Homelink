import { getListing } from "@/lib/api/listing-service";
import { ok, problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { getStore } from "@/lib/store/app-store";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const listing = getListing(id, { incrementViews: true });

  if (!listing) {
    return problem(404, "LISTING_NOT_FOUND", "Listing could not be found.");
  }

  return ok(listing);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to edit listings.");
  }
  const { id } = await params;
  const listing = getStore().getListing(id);

  if (!listing) {
    return problem(404, "LISTING_NOT_FOUND", "Listing could not be found.");
  }
  if (listing.ownerId !== userId) {
    return problem(403, "FORBIDDEN", "You can only edit your own listings.");
  }

  const updates = await request.json();
  const updated = getStore().updateListing(id, updates);
  return ok(updated);
}
