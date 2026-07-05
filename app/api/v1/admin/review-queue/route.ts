export const dynamic = "force-dynamic";

import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { requireAdminAsync } from "@/lib/admin/require-admin";
import { getPostgresModerationQueue, getPostgresVerificationQueue } from "@/lib/admin/postgres-analytics";
import { isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { getStore } from "@/lib/store/app-store";

export async function GET(request: Request) {
  if (isPostgresStoreEnabled()) {
    const auth = await requireAdminAsync(request);
    if ("error" in auth && auth.error) return auth.error;
    const [moderation, verification] = await Promise.all([
      getPostgresModerationQueue(),
      getPostgresVerificationQueue(),
    ]);
    return ok([...verification, ...moderation]);
  }

  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to view the review queue.");
  }
  const user = getStore().getUserById(userId);
  if (!user?.roles.includes("ADMIN")) {
    return problem(403, "FORBIDDEN", "Admin access required.");
  }
  return ok(getStore().getReviewQueue());
}

export async function PATCH(request: Request) {
  if (isPostgresStoreEnabled()) {
    const auth = await requireAdminAsync(request);
    if ("error" in auth && auth.error) return auth.error;
    return problem(501, "POSTGRES_REVIEW_ACTION_NOT_IMPLEMENTED", "Use the verification, listings, or moderation endpoints to resolve production review items.");
  }

  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to manage reviews.");
  }
  const user = getStore().getUserById(userId);
  if (!user?.roles.includes("ADMIN")) {
    return problem(403, "FORBIDDEN", "Admin access required.");
  }
  const body = await request.json();
  if (!body.id) {
    return problem(400, "ID_REQUIRED", "Review item id is required.");
  }
  if (!body.reason?.trim()) {
    return problem(400, "REASON_REQUIRED", "Add a short review note before resolving this item.");
  }
  return ok(getStore().resolveReviewItem(body.id, body.reason));
}
