import { getListing } from "@/lib/api/listing-service";
import { ok, problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import {
  getListingByIdOrSlugFromPostgres,
  getListingFromPostgres,
  incrementListingViewsInPostgres,
  shouldUsePostgresListings,
  toPublicPostgresListing,
  updateListingInPostgres,
} from "@/lib/listings/postgres-listing-repository";
import { getStore } from "@/lib/store/app-store";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const listingRecord = shouldUsePostgresListings() ? await getListingByIdOrSlugFromPostgres(id) : null;
  const listing = shouldUsePostgresListings()
    ? listingRecord
      ? toPublicPostgresListing(listingRecord)
      : null
    : getListing(id, { incrementViews: true });

  if (!listing) {
    return problem(404, "LISTING_NOT_FOUND", "Listing could not be found.");
  }

  if (listingRecord) {
    await incrementListingViewsInPostgres(listingRecord.id);
  }

  return ok(listing);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to edit listings.");
  }
  const { id } = await params;
  const listing = shouldUsePostgresListings() ? await getListingFromPostgres(id) : getStore().getListing(id);

  if (!listing) {
    return problem(404, "LISTING_NOT_FOUND", "Listing could not be found.");
  }
  if (listing.ownerId !== userId) {
    return problem(403, "FORBIDDEN", "You can only edit your own listings.");
  }

  const updates = await request.json();
  const updated = shouldUsePostgresListings()
    ? await updateListingInPostgres(id, updates)
    : getStore().updateListing(id, updates);
  if (!updated) {
    return problem(404, "LISTING_NOT_FOUND", "Listing could not be found.");
  }
  return ok(updated);
}
