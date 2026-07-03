import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { created, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to sign a lease.");
  }

  const body = await request.json();
  const listingId = String(body.listingId ?? "");
  const tenantUserId = String(body.tenantUserId ?? "");
  const fullAddress = String(body.fullAddress ?? "");
  const landlordUserId = String(body.landlordUserId ?? "");

  if (!listingId || !tenantUserId || !fullAddress) {
    return problem(400, "INVALID_INPUT", "listingId, tenantUserId, and fullAddress are required.");
  }

  const listing = getStore().getListing(listingId);
  if (!listing) {
    return problem(404, "NOT_FOUND", "Listing not found.");
  }

  const landlordId = landlordUserId || listing.ownerId;
  if (userId !== landlordId && userId !== tenantUserId) {
    return problem(403, "FORBIDDEN", "Only landlord or tenant can sign.");
  }

  const result = getStore().signTenancyLease({
    listingId,
    landlordUserId: landlordId,
    tenantUserId,
    fullAddress,
    startDate: body.startDate ? String(body.startDate) : undefined,
    signedByUserId: userId,
  });

  if (!result) {
    return problem(500, "LEASE_FAILED", "Could not create lease record.");
  }

  return created(result);
}
