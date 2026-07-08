import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import {
  getAgentApplicationFromPostgres,
  saveAgentApplicationInPostgres,
  shouldUsePostgresAgentApplications,
} from "@/lib/agents/postgres-application-repository";
import type { AgentApplication } from "@/lib/agents/types";
import { getStore } from "@/lib/store/app-store";

type RouteContext = { params: Promise<{ id: string }> };

function validateSubmission(application: AgentApplication) {
  if (!application.agentContractAccepted) {
    return "Sign the HomeLink agent agreement before submitting.";
  }
  if (!application.declarationAccepted || !application.termsAccepted || !application.privacyAccepted) {
    return "Accept all declarations before submitting.";
  }
  if (!application.signatureDataUrl?.trim()) {
    return "Add your electronic signature before submitting.";
  }
  return null;
}

export async function POST(request: Request, context: RouteContext) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in required.");
  const { id } = await context.params;

  if (shouldUsePostgresAgentApplications()) {
    const application = (await getAgentApplicationFromPostgres(id)) as AgentApplication | null;
    if (!application || application.userId !== userId) {
      return problem(404, "NOT_FOUND", "Application not found.");
    }
    const validationError = validateSubmission(application);
    if (validationError) return problem(400, "INCOMPLETE", validationError);
    const submitted = {
      ...application,
      status: "SUBMITTED" as const,
      agentContractSignedAt: application.agentContractSignedAt ?? new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveAgentApplicationInPostgres(submitted);
    return ok(submitted);
  }

  const application = getStore().getAgentApplication(id);
  if (!application || application.userId !== userId) {
    return problem(404, "NOT_FOUND", "Application not found.");
  }
  const validationError = validateSubmission(application);
  if (validationError) return problem(400, "INCOMPLETE", validationError);
  application.agentContractSignedAt = application.agentContractSignedAt ?? new Date().toISOString();
  getStore().saveAgentApplication(application);
  const submitted = getStore().submitAgentApplication(id);
  return ok(submitted);
}
