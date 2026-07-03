import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to continue.");

  const { id } = await context.params;
  const store = getStore();
  const user = store.getUserById(userId);
  const pmRequest = store.getPMRequest(id);

  if (!pmRequest) return problem(404, "NOT_FOUND", "Request not found.");

  const canView =
    user?.roles.includes("ADMIN") ||
    pmRequest.ownerId === userId ||
    pmRequest.consultantId === userId;

  if (!canView) return problem(403, "FORBIDDEN", "You cannot view this request.");

  const audit = store.getAuditLog(30).filter((e) => e.target === id);
  const payments = pmRequest.paymentIds.map((pid) => store.getPaymentById(pid)).filter(Boolean);

  return ok({ request: pmRequest, audit, payments });
}
