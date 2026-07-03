import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in required.");
  const { id } = await context.params;
  const application = getStore().getAgentApplication(id);
  if (!application || application.userId !== userId) {
    return problem(404, "NOT_FOUND", "Application not found.");
  }
  if (!application.declarationAccepted || !application.termsAccepted || !application.privacyAccepted) {
    return problem(400, "INCOMPLETE", "Accept all declarations before submitting.");
  }
  const submitted = getStore().submitAgentApplication(id);
  return ok(submitted);
}
