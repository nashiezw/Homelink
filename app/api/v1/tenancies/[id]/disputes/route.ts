import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { created, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to report a dispute.");
  }

  const { id: tenancyId } = await params;
  const body = await request.json();
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const details = typeof body.details === "string" ? body.details.trim() : "";

  if (!reason || !details) {
    return problem(400, "INVALID_INPUT", "Reason and details are required.");
  }

  const dispute = getStore().addTenancyDispute(tenancyId, userId, reason, details);
  if (!dispute) {
    return problem(403, "FORBIDDEN", "Cannot dispute this record.");
  }

  return created({ dispute });
}
