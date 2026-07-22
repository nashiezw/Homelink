import { requireAdmin } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { getPostgresUserById, shouldUsePostgresAuth } from "@/lib/auth/postgres-auth";
import {
  adminListingActionInPostgres,
  listAdminListingsFromPostgres,
  shouldUsePostgresListings,
  summarizeListingsFromPostgres,
  transferListingInPostgres,
} from "@/lib/listings/postgres-listing-repository";
import { ListingApprovalError } from "@/lib/listings/owner-contract";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireListingsAdmin(request);
  if ("error" in auth && auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const intent = searchParams.get("intent") ?? undefined;
  const includeDeleted = searchParams.get("includeDeleted") === "true";

  const listings = shouldUsePostgresListings()
    ? await listAdminListingsFromPostgres({ q, status, type, intent, includeDeleted })
    : getStore().listListingsAdmin({ q, status, type, intent, includeDeleted });
  const summary = shouldUsePostgresListings()
    ? await summarizeListingsFromPostgres()
    : (() => {
        const store = getStore();
        const all = store.listListings();
        return {
          total: all.filter((l) => l.status !== "DELETED").length,
          active: all.filter((l) => l.status === "ACTIVE").length,
          viewing: all.filter((l) => l.status === "VIEWING_IN_PROGRESS").length,
          pending: all.filter((l) => l.status === "PENDING_REVIEW").length,
          rejected: all.filter((l) => l.status === "REJECTED").length,
          archived: all.filter((l) => l.status === "ARCHIVED").length,
          deleted: all.filter((l) => l.status === "DELETED").length,
          featured: all.filter((l) => l.featured).length,
          unverified: all.filter((l) => !l.verified && l.status === "ACTIVE").length,
          draft: all.filter((l) => l.status === "DRAFT").length,
          expired: all.filter((l) => l.status === "EXPIRED").length,
          rented: all.filter((l) => l.status === "RENTED").length,
          sold: all.filter((l) => l.status === "SOLD").length,
          holiday: all.filter((l) => l.type === "holiday_home").length,
          boarding: all.filter((l) => l.type === "boarding_house").length,
          commercial: all.filter((l) => l.type === "commercial").length,
          virtualTours: all.filter((l) => l.virtualTour?.status === "PUBLISHED").length,
        };
      })();

  return ok({ listings, summary });
}

export async function PATCH(request: Request) {
  const auth = await requireListingsAdmin(request);
  if ("error" in auth && auth.error) return auth.error;
  if (!auth.user) return problem(401, "UNAUTHORIZED", "Admin required.");

  const body = await request.json();
  const actor = { id: auth.user.id, name: auth.user.name, email: auth.user.email ?? "" };
  const { listingId, listingIds, action, reason, days, newOwnerId, bypassOwnerAgreement, bypassReason } = body as {
    listingId?: string;
    listingIds?: string[];
    action: string;
    reason?: string;
    days?: number;
    newOwnerId?: string;
    bypassOwnerAgreement?: boolean;
    bypassReason?: string;
  };

  if (!action) return problem(400, "INVALID_INPUT", "action is required.");

  if (shouldUsePostgresListings()) {
    if (action === "transfer") {
      if (!listingId || !newOwnerId) return problem(400, "INVALID_INPUT", "listingId and newOwnerId required.");
      const listing = await transferListingInPostgres(listingId, newOwnerId);
      if (!listing) return problem(404, "LISTING_NOT_FOUND", "Listing could not be found.");
      return ok({ listing });
    }
    if (listingIds?.length) {
      const results = await Promise.all(
        listingIds.map(async (id) => ({
          id,
          ok: Boolean(
            await adminListingActionInPostgres(id, action, body.updates, {
              reason,
              days,
              actor,
              bypassOwnerAgreement,
              bypassReason,
            }),
          ),
        })),
      );
      return ok({ results });
    }
    if (!listingId) return problem(400, "INVALID_INPUT", "listingId or listingIds required.");
    try {
      const listing = await adminListingActionInPostgres(listingId, action, body.updates, {
        reason,
        days,
        actor,
        bypassOwnerAgreement,
        bypassReason,
      });
      if (!listing) return problem(400, "UNKNOWN_ACTION", `Unknown or unsupported action: ${action}`);
      return ok({ listing });
    } catch (error) {
      if (error instanceof ListingApprovalError) {
        return problem(400, "OWNER_AGREEMENT_REQUIRED", error.message);
      }
      throw error;
    }
  }

  if (listingIds?.length) {
    const store = getStore();
    const results = store.adminBulkListingAction(listingIds, action, actor, { reason, days });
    return ok({ results });
  }

  if (!listingId) return problem(400, "INVALID_INPUT", "listingId or listingIds required.");

  switch (action) {
    case "approve": {
      try {
        return ok({
          listing: getStore().adminApproveListing(listingId, actor, { bypassOwnerAgreement, bypassReason }),
        });
      } catch (error) {
        if (error instanceof ListingApprovalError) {
          return problem(400, "OWNER_AGREEMENT_REQUIRED", error.message);
        }
        throw error;
      }
    }
    case "reject":
      return ok({ listing: getStore().adminRejectListing(listingId, actor, reason) });
    case "mark_available":
      return ok({ listing: getStore().adminSetListingStatus(listingId, "ACTIVE", actor, reason) });
    case "mark_viewing":
      return ok({ listing: getStore().adminSetListingStatus(listingId, "VIEWING_IN_PROGRESS", actor, reason) });
    case "mark_let":
    case "mark_rented":
      return ok({ listing: getStore().adminSetListingStatus(listingId, "RENTED", actor, reason) });
    case "mark_sold":
      return ok({ listing: getStore().adminSetListingStatus(listingId, "SOLD", actor, reason) });
    case "delete":
      return ok({ listing: getStore().adminDeleteListing(listingId, actor, reason) });
    case "archive":
      return ok({ listing: getStore().adminArchiveListing(listingId, actor, reason) });
    case "restore":
      return ok({ listing: getStore().adminRestoreListing(listingId, actor) });
    case "feature":
      return ok({ listing: getStore().featureListing(listingId, days ?? 7, actor) });
    case "unfeature":
      return ok({ listing: getStore().adminUnfeatureListing(listingId, actor) });
    case "verify":
      return ok({ listing: getStore().adminSetListingVerified(listingId, true, actor) });
    case "unverify":
      return ok({ listing: getStore().adminSetListingVerified(listingId, false, actor) });
    case "mark_boarding_house": {
      const existing = getStore().listListings().find((listing) => listing.id === listingId);
      return ok({
        listing: getStore().adminEditListing(
          listingId,
          {
            type: "boarding_house",
            intent: "rent",
            bedrooms: 0,
            bathrooms: 0,
            description: appendBoardingHouseSummary(existing?.description ?? ""),
          },
          actor,
        ),
      });
    }
    case "save_virtual_tour": {
      const updates = (body as { updates?: Record<string, unknown> }).updates ?? {};
      return ok({ listing: getStore().adminEditListing(listingId, updates, actor) });
    }
    case "transfer":
      if (!newOwnerId) return problem(400, "INVALID_INPUT", "newOwnerId required.");
      return ok({ listing: getStore().transferListingOwnership(listingId, newOwnerId, actor) });
    case "edit": {
      const updates = (body as { updates?: Record<string, unknown> }).updates ?? {};
      return ok({ listing: getStore().adminEditListing(listingId, updates, actor) });
    }
    default:
      return problem(400, "UNKNOWN_ACTION", `Unknown action: ${action}`);
  }
}

function appendBoardingHouseSummary(description: string) {
  return /\b(boarding|student|campus|university|college|school|hostel|dorm)\b/i.test(description)
    ? description
    : [description, "Student accommodation / boarding house."].filter(Boolean).join("\n\n");
}

async function requireListingsAdmin(request: Request) {
  if (!shouldUsePostgresAuth()) return requireAdmin(request);
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return { error: problem(401, "UNAUTHORIZED", "Sign in to access admin.") };
  const user = await getPostgresUserById(userId);
  if (!user?.roles.includes("ADMIN")) {
    return { error: problem(403, "FORBIDDEN", "Admin access required.") };
  }
  return { user: { id: user.id, name: user.name, email: user.email, roles: user.roles }, error: undefined };
}
