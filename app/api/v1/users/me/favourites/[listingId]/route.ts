import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

type RouteContext = {
  params: Promise<{ listingId: string }>;
};

export async function DELETE(request: Request, { params }: RouteContext) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to manage favourites.");
  }
  const { listingId } = await params;
  return ok(getStore().removeFavourite(userId, listingId));
}
