import { created, ok, problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { getLibraryGuestClaimByToken, redeemLibraryGuestClaim } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim();
  if (!token) return problem(400, "MISSING_TOKEN", "Claim token is required.");
  const claim = await getLibraryGuestClaimByToken(token);
  if (!claim) return problem(404, "CLAIM_NOT_FOUND", "This claim link is invalid or already used.");
  if ("expired" in claim && claim.expired) {
    return problem(410, "CLAIM_EXPIRED", "This claim link has expired. Ask support to issue a new one.");
  }
  return ok({ claim });
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in with the claimed email to redeem Library access.");
  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return problem(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
  const token = String(body.token ?? "").trim();
  if (!token) return problem(400, "MISSING_TOKEN", "Claim token is required.");
  const result = await redeemLibraryGuestClaim({ token, userId });
  if (!result) return problem(400, "CLAIM_FAILED", "Could not redeem this claim.");
  if ("error" in result) {
    if (result.error === "INVALID_TOKEN") return problem(404, "CLAIM_NOT_FOUND", "This claim link is invalid or already used.");
    if (result.error === "EXPIRED") return problem(410, "CLAIM_EXPIRED", "This claim link has expired.");
    if (result.error === "EMAIL_MISMATCH") {
      return problem(403, "EMAIL_MISMATCH", `Sign in with ${result.email} to claim this Library order.`);
    }
    if (result.error === "UNAUTHORIZED") return problem(401, "UNAUTHORIZED", "Sign in to redeem Library access.");
    return problem(503, "NOT_SUPPORTED", "Guest claims require the database-backed Library.");
  }
  return created({
    claim: result.claim,
    downloads: result.downloads,
    redirectUrl: "/dashboard/my-library",
  });
}
