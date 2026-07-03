import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import type { EnquiryStatus } from "@/lib/enquiries/types";
import { getStore } from "@/lib/store/app-store";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Admin access required.");
  const store = getStore();
  const user = store.getUserById(userId);
  if (!user?.roles.includes("ADMIN")) return problem(403, "FORBIDDEN", "Admin only.");

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q") ?? undefined;
  const agentId = url.searchParams.get("agentId") ?? undefined;

  const enquiries = store.listEnquiries({
    status: status ? (status as EnquiryStatus) : undefined,
    q,
    assignedAgentId: agentId,
  });

  const agents = store
    .listUsers()
    .filter((u) => u.roles.includes("AGENT"))
    .map((u) => ({ id: u.id, name: u.name, email: u.email }));

  return ok({
    enquiries,
    analytics: store.getEnquiryAnalytics(),
    agents,
    settings: {
      ...store.getPlatformSettings().enquiries,
    },
  });
}

export async function PATCH(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Admin access required.");
  const store = getStore();
  const user = store.getUserById(userId);
  if (!user?.roles.includes("ADMIN")) return problem(403, "FORBIDDEN", "Admin only.");

  const body = await request.json();
  const actor = { id: userId, name: user.name };

  if (body.action === "update_settings" && body.settings) {
    store.updatePlatformSettings({ enquiries: body.settings }, actor);
    return ok({ settings: store.getPlatformSettings().enquiries });
  }

  if (!body.enquiryId) return problem(400, "INVALID", "enquiryId is required.");

  try {
    switch (body.action) {
      case "assign":
        if (!body.agentId) return problem(400, "INVALID_AGENT", "agentId is required.");
        return ok({ enquiry: store.assignEnquiryAgent(body.enquiryId, body.agentId, actor) });
      case "status":
        return ok({
          enquiry: store.updateEnquiryStatus(body.enquiryId, body.status, actor, body.reason),
        });
      case "merge":
        return ok({ enquiry: store.mergeEnquiries(body.enquiryId, body.sourceId, actor) });
      case "note":
        return ok({
          enquiry: store.addEnquiryNote(body.enquiryId, {
            authorId: userId,
            authorName: user.name,
            body: body.body,
            internal: true,
          }),
        });
      default:
        return problem(400, "INVALID_ACTION", "Unknown action.");
    }
  } catch (e) {
    return problem(400, "FAILED", e instanceof Error ? e.message : "Action failed.");
  }
}
