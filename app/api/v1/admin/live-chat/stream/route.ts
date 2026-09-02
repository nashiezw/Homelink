import { requireAdminAsync, requireAdmin } from "@/lib/admin/require-admin";
import { isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { canManageLiveChat, getLiveChatInbox, subscribeLiveChatAdminRealtime } from "@/lib/live-chat/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = isPostgresStoreEnabled() ? await requireAdminAsync(request) : requireAdmin(request);
  if (auth.error || !auth.user || !canManageLiveChat(auth.user)) return new Response(null, { status: auth.user ? 403 : 401 });

  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let inboxPoll: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: (() => void) | null = null;
  const seenConversationVersions = new Map<string, string>();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      const seed = await getLiveChatInbox({ filter: "all", user: auth.user });
      for (const conversation of seed.conversations) seenConversationVersions.set(conversation.id, `${conversation.lastMessageAt ?? ""}:${conversation.unreadForStaff}`);
      unsubscribe = subscribeLiveChatAdminRealtime((event) => send(event.type, event));
      send("ready", { ok: true });
      heartbeat = setInterval(() => send("heartbeat", { now: new Date().toISOString() }), 25_000);
      inboxPoll = setInterval(() => {
        void getLiveChatInbox({ filter: "all", user: auth.user }).then((inbox) => {
          for (const conversation of inbox.conversations) {
            const version = `${conversation.lastMessageAt ?? ""}:${conversation.unreadForStaff}`;
            if (seenConversationVersions.get(conversation.id) === version) continue;
            seenConversationVersions.set(conversation.id, version);
            send("inbox", { type: "inbox", conversationId: conversation.id, visitorId: conversation.visitor.id, reason: "conversation_updated", createdAt: new Date().toISOString() });
          }
        }).catch(() => null);
      }, 2_500);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (inboxPoll) clearInterval(inboxPoll);
      unsubscribe?.();
    },
  });

  request.signal.addEventListener("abort", () => {
    if (heartbeat) clearInterval(heartbeat);
    if (inboxPoll) clearInterval(inboxPoll);
    unsubscribe?.();
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
