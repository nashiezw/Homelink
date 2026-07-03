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
    return problem(401, "UNAUTHORIZED", "Sign in required.");
  }

  const { id: tenancyId } = await params;
  const body = await request.json();
  const consent = Boolean(body.consent);

  const result = getStore().setTenancyAddressConsent(tenancyId, userId, consent);
  if (!result) {
    return problem(403, "FORBIDDEN", "Not part of this tenancy.");
  }

  return ok(result);
}
