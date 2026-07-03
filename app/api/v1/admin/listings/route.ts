import { requireAdmin } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const intent = searchParams.get("intent") ?? undefined;
  const includeDeleted = searchParams.get("includeDeleted") === "true";

  const store = getStore();
  const listings = store.listListingsAdmin({ q, status, type, intent, includeDeleted });
  const all = store.listListings();
  const summary = {
    total: all.filter((l) => l.status !== "DELETED").length,
    active: all.filter((l) => l.status === "ACTIVE").length,
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
    commercial: all.filter((l) => l.type === "commercial").length,
  };

  return ok({ listings, summary });
}

export async function PATCH(request: Request) {
  const auth = requireAdmin(request);
  if (auth.error || !auth.user) return auth.error ?? problem(401, "UNAUTHORIZED", "Admin required.");

  const body = await request.json();
  const store = getStore();
  const actor = { id: auth.user.id, name: auth.user.name };
  const { listingId, listingIds, action, reason, days, newOwnerId } = body as {
    listingId?: string;
    listingIds?: string[];
    action: string;
    reason?: string;
    days?: number;
    newOwnerId?: string;
  };

  if (!action) return problem(400, "INVALID_INPUT", "action is required.");

  if (listingIds?.length) {
    const results = store.adminBulkListingAction(listingIds, action, actor, { reason, days });
    return ok({ results });
  }

  if (!listingId) return problem(400, "INVALID_INPUT", "listingId or listingIds required.");

  switch (action) {
    case "approve":
      return ok({ listing: store.adminApproveListing(listingId, actor) });
    case "reject":
      return ok({ listing: store.adminRejectListing(listingId, actor, reason) });
    case "delete":
      return ok({ listing: store.adminDeleteListing(listingId, actor, reason) });
    case "archive":
      return ok({ listing: store.adminArchiveListing(listingId, actor, reason) });
    case "restore":
      return ok({ listing: store.adminRestoreListing(listingId, actor) });
    case "feature":
      return ok({ listing: store.featureListing(listingId, days ?? 7, actor) });
    case "unfeature":
      return ok({ listing: store.adminUnfeatureListing(listingId, actor) });
    case "verify":
      return ok({ listing: store.adminSetListingVerified(listingId, true, actor) });
    case "unverify":
      return ok({ listing: store.adminSetListingVerified(listingId, false, actor) });
    case "transfer":
      if (!newOwnerId) return problem(400, "INVALID_INPUT", "newOwnerId required.");
      return ok({ listing: store.transferListingOwnership(listingId, newOwnerId, actor) });
    case "edit": {
      const updates = (body as { updates?: Record<string, unknown> }).updates ?? {};
      return ok({ listing: store.adminEditListing(listingId, updates, actor) });
    }
    default:
      return problem(400, "UNKNOWN_ACTION", `Unknown action: ${action}`);
  }
}
