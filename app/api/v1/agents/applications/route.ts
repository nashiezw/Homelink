import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem, created } from "@/lib/api/response";
import {
  getAgentApplicationByUserFromPostgres,
  getAgentApplicationFromPostgres,
  saveAgentApplicationInPostgres,
  shouldUsePostgresAgentApplications,
} from "@/lib/agents/postgres-application-repository";
import { getPostgresUserById } from "@/lib/auth/postgres-auth";
import { getStore } from "@/lib/store/app-store";
import { createApplicationDraft } from "@/lib/agents/platform";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to view your application.");
  }
  const store = shouldUsePostgresAgentApplications() ? null : getStore();
  const application = shouldUsePostgresAgentApplications()
    ? await getAgentApplicationByUserFromPostgres(userId)
    : store!.getAgentApplicationByUser(userId);
  return ok(application ?? null);
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to start an agent application.");
  }
  const user = shouldUsePostgresAgentApplications() ? await getPostgresUserById(userId) : getStore().getUserById(userId);
  if (!user) return problem(404, "NOT_FOUND", "User not found.");

  const existing = shouldUsePostgresAgentApplications()
    ? await getAgentApplicationByUserFromPostgres(userId)
    : getStore().getAgentApplicationByUser(userId);
  if (existing && existing.status !== "DRAFT" && existing.status !== "DECLINED") {
    return ok(existing);
  }

  const draft = createApplicationDraft(userId, user.email);
  draft.userId = userId;
  draft.personal.fullName = user.name;
  draft.personal.email = user.email;
  draft.personal.phone = user.phone ?? "";
  draft.personal.whatsapp = user.phone ?? "";
  draft.professional.city = "city" in user && typeof user.city === "string" ? user.city : "";
  if (shouldUsePostgresAgentApplications()) {
    await saveAgentApplicationInPostgres(draft);
  } else {
    getStore().saveAgentApplication(draft);
  }
  return created(draft);
}

export async function PATCH(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in required.");
  const body = await request.json();
  const store = shouldUsePostgresAgentApplications() ? null : getStore();
  const application = shouldUsePostgresAgentApplications()
    ? ((body.id ? await getAgentApplicationFromPostgres(body.id) : null) ?? await getAgentApplicationByUserFromPostgres(userId))
    : store!.getAgentApplication(body.id) ?? store!.getAgentApplicationByUser(userId);
  if (!application || application.userId !== userId) {
    return problem(404, "NOT_FOUND", "Application not found.");
  }
  if (!["DRAFT", "DOCUMENTS_REQUESTED"].includes(application.status)) {
    return problem(400, "INVALID_STATE", "Application cannot be edited in current status.");
  }

  const payload = {
    ...application,
    ...body,
    id: application.id,
    userId,
    status: String(body.status ?? application.status),
    updatedAt: new Date().toISOString(),
  };
  const updated = shouldUsePostgresAgentApplications()
    ? await saveAgentApplicationInPostgres(payload)
    : store!.saveAgentApplication(payload);
  return ok(updated);
}
