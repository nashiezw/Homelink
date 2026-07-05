import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import {
  getTenancyDetailFromPostgres,
  shouldUsePostgresTenancies,
} from "@/lib/residence/postgres-tenancy-repository";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in required.");
  }

  const { id: tenancyId } = await params;
  if (shouldUsePostgresTenancies()) {
    const detail = await getTenancyDetailFromPostgres(tenancyId, userId);
    if (!detail) {
      return problem(403, "FORBIDDEN", "You are not part of this tenancy.");
    }
    return ok(detail);
  }
  const detail = getStore().getTenancyDetail(tenancyId, userId);
  if (!detail) {
    return problem(403, "FORBIDDEN", "You are not part of this tenancy.");
  }

  return ok(detail);
}
