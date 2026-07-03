import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { created, ok, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to view messages.");
  }
  return ok(getStore().getConversations(userId));
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to send messages.");
  }
  const body = await request.json();
  const user = getStore().getUserById(userId);
  if (!body.conversationId || !body.body || !user) {
    return problem(400, "INVALID_MESSAGE", "conversationId and body are required.");
  }
  return created(
    getStore().sendMessage({
      conversationId: body.conversationId,
      senderId: userId,
      senderName: user.name,
      body: body.body,
    }),
  );
}
