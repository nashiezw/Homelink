import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import {
  getListingFromPostgres,
  shouldUsePostgresListings,
  updateListingInPostgres,
} from "@/lib/listings/postgres-listing-repository";
import { getStore } from "@/lib/store/app-store";
import { LISTING_WORKFLOW_STATUSES, isAllowedAvailabilityStatus } from "@/lib/listings/status";
import type { ListingWorkflowStatus } from "@/lib/listings/status";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to manage listings.");
  }
  const { id } = await params;
  const listing = shouldUsePostgresListings() ? await getListingFromPostgres(id) : getStore().getListing(id);
  if (!listing || listing.ownerId !== userId) {
    return problem(403, "FORBIDDEN", "You can only update your own listings.");
  }
  const body = await request.json().catch(() => ({}));
  const updated = shouldUsePostgresListings()
    ? await updateListingInPostgres(id, { status: "RENTED", availableFrom: "Rented" })
    : getStore().markListingRented(
        id,
        typeof body.tenantUserId === "string" ? body.tenantUserId : undefined,
        typeof body.fullAddress === "string" ? body.fullAddress : undefined,
      );
  return ok(updated);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to edit listings.");
  }
  const { id } = await params;
  const listing = shouldUsePostgresListings() ? await getListingFromPostgres(id) : getStore().getListing(id);
  if (!listing || listing.ownerId !== userId) {
    return problem(403, "FORBIDDEN", "You can only update your own listings.");
  }
  const updates = await request.json();
  if (updates?.status && !LISTING_WORKFLOW_STATUSES.includes(updates.status as ListingWorkflowStatus)) {
    return problem(400, "INVALID_STATUS", "Choose a supported listing status.");
  }
  if (updates?.status && !isAllowedAvailabilityStatus(listing.intent, updates.status)) {
    return problem(400, "INVALID_STATUS", "That status does not match this listing intent.");
  }
  if (shouldUsePostgresListings()) {
    return ok(await updateListingInPostgres(id, updates));
  }
  const updated = getStore().updateListing(id, updates);
  return ok(updated);
}
