import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { created, ok, problem } from "@/lib/api/response";
import {
  listUserTenanciesFromPostgres,
  shouldUsePostgresTenancies,
} from "@/lib/residence/postgres-tenancy-repository";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to view tenancies.");
  }
  if (shouldUsePostgresTenancies()) {
    return ok({ tenancies: await listUserTenanciesFromPostgres(userId) });
  }
  return ok({ tenancies: getStore().listUserTenancies(userId) });
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to initiate a tenancy.");
  }

  const body = await request.json();
  const listingId = typeof body.listingId === "string" ? body.listingId : "";
  const tenantUserId = typeof body.tenantUserId === "string" ? body.tenantUserId : "";
  const fullAddress = typeof body.fullAddress === "string" ? body.fullAddress : "";

  if (!listingId || !tenantUserId || !fullAddress) {
    return problem(400, "INVALID_INPUT", "listingId, tenantUserId, and fullAddress are required.");
  }

  const listing = getStore().getListing(listingId);
  if (!listing) {
    return problem(404, "LISTING_NOT_FOUND", "Listing not found.");
  }
  if (listing.ownerId !== userId && tenantUserId !== userId) {
    return problem(403, "FORBIDDEN", "Only the landlord or tenant can initiate this tenancy.");
  }

  const landlordUserId = listing.ownerId;
  const result = getStore().createTenancy({
    listingId,
    landlordUserId,
    tenantUserId,
    propertyTitle: listing.title,
    fullAddress,
    city: listing.city,
    suburb: listing.suburb,
    tenantRole: listing.type === "room" ? "roommate" : "tenant",
    verificationSource: "manual",
    notes: "Tenancy initiated — confirm and complete payment or lease for verification",
  });

  getStore().notifyTenancyParties(tenantUserId, landlordUserId, listing.title);
  return created(result);
}
