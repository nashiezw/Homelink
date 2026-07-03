import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to view messages.");
  }
  const { id } = await params;
  const conversations = getStore().getConversations(userId);
  if (!conversations.some((conversation) => conversation.id === id)) {
    return problem(403, "FORBIDDEN", "You do not have access to this conversation.");
  }
  return ok(getStore().getMessages(id));
}
