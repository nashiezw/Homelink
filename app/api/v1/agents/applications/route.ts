import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem, created } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";
import { createApplicationDraft } from "@/lib/agents/platform";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to view your application.");
  }
  const store = getStore();
  const application = store.getAgentApplicationByUser(userId);
  return ok(application ?? null);
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to start an agent application.");
  }
  const user = getStore().getUserById(userId);
  if (!user) return problem(404, "NOT_FOUND", "User not found.");

  const existing = getStore().getAgentApplicationByUser(userId);
  if (existing && existing.status !== "DRAFT" && existing.status !== "DECLINED") {
    return ok(existing);
  }

  const draft = createApplicationDraft(userId, user.email);
  draft.personal.fullName = user.name;
  draft.personal.email = user.email;
  draft.personal.phone = user.phone ?? "";
  draft.personal.whatsapp = user.phone ?? "";
  draft.professional.city = user.city ?? "";
  getStore().saveAgentApplication(draft);
  return created(draft);
}

export async function PATCH(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in required.");
  const body = await request.json();
  const store = getStore();
  const application = store.getAgentApplication(body.id) ?? store.getAgentApplicationByUser(userId);
  if (!application || application.userId !== userId) {
    return problem(404, "NOT_FOUND", "Application not found.");
  }
  if (!["DRAFT", "DOCUMENTS_REQUESTED"].includes(application.status)) {
    return problem(400, "INVALID_STATE", "Application cannot be edited in current status.");
  }

  const updated = store.saveAgentApplication({
    ...application,
    ...body,
    id: application.id,
    userId,
    updatedAt: new Date().toISOString(),
  });
  return ok(updated);
}
