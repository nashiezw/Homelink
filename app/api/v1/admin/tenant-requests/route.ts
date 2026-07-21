import { ok, problem } from "@/lib/api/response";
import { requireAdminAsync } from "@/lib/admin/require-admin";
import {
  addTenantRequestNote,
  assignTenantRequestAgent,
  buildStillLookingWhatsAppMessage,
  buildTenantRequestWhatsAppMessage,
  extendTenantRequest,
  listTenantRequests,
  listPropertyRequestAgents,
  notifyTenantRequestManually,
  refreshTenantRequestMatches,
  updateTenantRequestStatus,
} from "@/lib/tenant-requests/repository";
import type { TenantRequestStatus } from "@/lib/tenant-requests/types";

export async function GET(request: Request) {
  const auth = await requireAdminAsync(request, "enquiries:read");
  if ("error" in auth && auth.error) return auth.error;
  const url = new URL(request.url);
  const requests = await listTenantRequests(url.searchParams.get("q") ?? undefined);
  const agents = await listPropertyRequestAgents();
  return ok({
    requests,
    agents,
    analytics: {
      total: requests.length,
      rentCount: requests.filter((item) => item.intent === "rent").length,
      buyCount: requests.filter((item) => item.intent === "buy").length,
      newCount: requests.filter((item) => item.status === "NEW").length,
      matchedCount: requests.filter((item) => item.matches.length > 0).length,
      contactedCount: requests.filter((item) => item.status === "CONTACTED").length,
      expiringSoonCount: requests.filter((item) => {
        const days = (new Date(item.expiresAt).getTime() - Date.now()) / 86_400_000;
        return item.status !== "CLOSED" && item.status !== "CANCELLED" && days >= 0 && days <= 7;
      }).length,
      expiredCount: requests.filter((item) => item.status === "EXPIRED").length,
    },
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminAsync(request, "enquiries:write");
  if ("error" in auth && auth.error) return auth.error;
  const body = await request.json();
  const requestId = String(body.requestId ?? "");
  if (!requestId) return problem(400, "INVALID_REQUEST", "requestId is required.");
  const actor = { id: auth.user.id, name: auth.user.name };

  try {
    switch (body.action) {
      case "refresh_matches":
        return ok({ request: await refreshTenantRequestMatches(requestId) });
      case "assign":
        if (!body.agentId) return problem(400, "INVALID_AGENT", "agentId is required.");
        return ok({ request: await assignTenantRequestAgent(requestId, String(body.agentId), actor) });
      case "extend":
        return ok({ request: await extendTenantRequest(requestId, actor, Number(body.days ?? 30)) });
      case "status":
        return ok({ request: await updateTenantRequestStatus(requestId, body.status as TenantRequestStatus, actor) });
      case "note":
        if (!String(body.body ?? "").trim()) return problem(400, "INVALID_NOTE", "Note body is required.");
        return ok({ request: await addTenantRequestNote(requestId, String(body.body), actor) });
      case "notify":
        return ok({ request: await notifyTenantRequestManually(requestId, Array.isArray(body.listingIds) ? body.listingIds : [], actor) });
      case "whatsapp_template": {
        const request = (await listTenantRequests()).find((item) => item.id === requestId);
        if (!request) return problem(404, "NOT_FOUND", "Property request could not be found.");
        return ok({
          message: buildTenantRequestWhatsAppMessage(request, Array.isArray(body.listingIds) ? body.listingIds : undefined),
        });
      }
      case "still_looking_template": {
        const request = (await listTenantRequests()).find((item) => item.id === requestId);
        if (!request) return problem(404, "NOT_FOUND", "Property request could not be found.");
        return ok({ message: buildStillLookingWhatsAppMessage(request) });
      }
      default:
        return problem(400, "INVALID_ACTION", "Unknown tenant request action.");
    }
  } catch (error) {
    return problem(400, "ACTION_FAILED", error instanceof Error ? error.message : "Action failed.");
  }
}
