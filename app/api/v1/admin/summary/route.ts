import { requireAdmin } from "@/lib/admin/require-admin";
import { ok } from "@/lib/api/response";
import { computeAdminSummary } from "@/lib/admin/compute-analytics";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth.error) return auth.error;
  return ok(computeAdminSummary());
}
