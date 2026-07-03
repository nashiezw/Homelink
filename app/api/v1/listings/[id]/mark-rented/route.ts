import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to manage listings.");
  }
  const { id } = await params;
  const listing = getStore().getListing(id);
  if (!listing || listing.ownerId !== userId) {
    return problem(403, "FORBIDDEN", "You can only update your own listings.");
  }
  const body = await request.json().catch(() => ({}));
  const updated = getStore().markListingRented(
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
  const listing = getStore().getListing(id);
  if (!listing || listing.ownerId !== userId) {
    return problem(403, "FORBIDDEN", "You can only update your own listings.");
  }
  const updates = await request.json();
  const updated = getStore().updateListing(id, updates);
  return ok(updated);
}
