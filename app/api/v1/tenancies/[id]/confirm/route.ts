import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to confirm.");
  }

  const { id: tenancyId } = await params;
  const result = getStore().confirmTenancy(tenancyId, userId);
  if (!result) {
    return problem(403, "FORBIDDEN", "Could not confirm this tenancy.");
  }

  return ok(result);
}
