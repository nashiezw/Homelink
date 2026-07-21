import { ok, problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import {
  addTenantRequestNote,
  buildStillLookingWhatsAppMessage,
  buildTenantRequestWhatsAppMessage,
  extendTenantRequest,
  getTenantRequest,
  listTenantRequestsForAgent,
  notifyTenantRequestManually,
  refreshTenantRequestMatches,
  updateTenantRequestStatus,
} from "@/lib/tenant-requests/repository";
import type { TenantRequestStatus } from "@/lib/tenant-requests/types";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in required.");
  const requests = await listTenantRequestsForAgent(userId);
  return ok({ requests });
}

export async function PATCH(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in required.");
  const body = await request.json();
  const requestId = String(body.requestId ?? "");
  if (!requestId) return problem(400, "INVALID_REQUEST", "requestId is required.");
  const propertyRequest = await getTenantRequest(requestId);
  if (!propertyRequest || propertyRequest.assignedAgentId !== userId) {
    return problem(404, "NOT_FOUND", "Assigned property request could not be found.");
  }
  const actor = { id: userId, name: "Assigned agent" };

  switch (body.action) {
    case "refresh_matches":
      return ok({ request: await refreshTenantRequestMatches(requestId) });
    case "status":
      return ok({ request: await updateTenantRequestStatus(requestId, body.status as TenantRequestStatus, actor) });
    case "note":
      if (!String(body.body ?? "").trim()) return problem(400, "INVALID_NOTE", "Note body is required.");
      return ok({ request: await addTenantRequestNote(requestId, String(body.body), actor) });
    case "extend":
      return ok({ request: await extendTenantRequest(requestId, actor, Number(body.days ?? 30)) });
    case "notify":
      return ok({ request: await notifyTenantRequestManually(requestId, Array.isArray(body.listingIds) ? body.listingIds : [], actor) });
    case "whatsapp_template":
      return ok({ message: buildTenantRequestWhatsAppMessage(propertyRequest, Array.isArray(body.listingIds) ? body.listingIds : undefined) });
    case "still_looking_template":
      return ok({ message: buildStillLookingWhatsAppMessage(propertyRequest) });
    default:
      return problem(400, "INVALID_ACTION", "Unknown property request action.");
  }
}
