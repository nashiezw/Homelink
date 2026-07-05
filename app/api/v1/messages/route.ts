import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { created, ok, problem } from "@/lib/api/response";
import {
  listConversationsFromPostgres,
  sendMessageInPostgres,
  shouldUsePostgresPersistence,
} from "@/lib/db/postgres-app-repository";
import { getStore } from "@/lib/store/app-store";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to view messages.");
  }
  if (shouldUsePostgresPersistence()) {
    return ok(await listConversationsFromPostgres(userId));
  }
  return ok(getStore().getConversations(userId));
}

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to send messages.");
  }
  const body = await request.json();
  if (shouldUsePostgresPersistence()) {
    if (!body.conversationId || !body.body) {
      return problem(400, "INVALID_MESSAGE", "conversationId and body are required.");
    }
    try {
      return created(await sendMessageInPostgres(body.conversationId, userId, body.body));
    } catch (error) {
      console.error("Failed to send message", error);
      return problem(403, "FORBIDDEN", "You do not have access to this conversation.");
    }
  }
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
