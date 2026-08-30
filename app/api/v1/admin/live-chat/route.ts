import { requireAdminAsync, requireAdmin } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { canManageLiveChat, getLiveChatInbox, liveChatAdminAction, LiveChatError } from "@/lib/live-chat/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = isPostgresStoreEnabled() ? await requireAdminAsync(request) : requireAdmin(request);
  if (auth.error || !auth.user) return auth.error ?? problem(401, "UNAUTHORIZED", "Admin required.");
  if (!canManageLiveChat(auth.user)) return problem(403, "FORBIDDEN", "Live Chat access required.");
  const { searchParams } = new URL(request.url);
  try {
    return ok(await getLiveChatInbox({
      activeConversationId: searchParams.get("conversationId"),
      filter: searchParams.get("filter"),
      query: searchParams.get("q"),
      user: auth.user,
    }));
  } catch (error) {
    console.error("[admin/live-chat] GET failed", error);
    return problem(500, "LIVE_CHAT_ADMIN_FAILED", "Live Chat inbox could not be loaded.");
  }
}

export async function POST(request: Request) {
  const auth = isPostgresStoreEnabled() ? await requireAdminAsync(request) : requireAdmin(request);
  if (auth.error || !auth.user) return auth.error ?? problem(401, "UNAUTHORIZED", "Admin required.");
  if (!canManageLiveChat(auth.user)) return problem(403, "FORBIDDEN", "Live Chat access required.");
  try {
    const body = await request.json().catch(() => ({}));
    return ok(await liveChatAdminAction(auth.user, body));
  } catch (error) {
    if (error instanceof LiveChatError) return problem(error.status, error.code, error.message);
    console.error("[admin/live-chat] action failed", error);
    return problem(500, "LIVE_CHAT_ACTION_FAILED", "Live Chat action could not be completed.");
  }
}
