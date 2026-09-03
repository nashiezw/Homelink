import { requireAdminAsync, requireAdmin } from "@/lib/admin/require-admin";
import { isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { canManageLiveChat, getLiveChatInbox, subscribeLiveChatAdminRealtime, touchLiveChatAgentPresence } from "@/lib/live-chat/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = isPostgresStoreEnabled() ? await requireAdminAsync(request) : requireAdmin(request);
  if (auth.error || !auth.user || !canManageLiveChat(auth.user)) return new Response(null, { status: auth.user ? 403 : 401 });

  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      await getLiveChatInbox({ filter: "all", user: auth.user }).catch(() => null);
      await touchLiveChatAgentPresence(auth.user, "admin_stream_ready").catch(() => null);
      unsubscribe = subscribeLiveChatAdminRealtime((event) => send(event.type, event));
      send("ready", { ok: true });
      heartbeat = setInterval(() => {
        void touchLiveChatAgentPresence(auth.user!, "admin_stream_heartbeat").catch(() => null);
        send("heartbeat", { now: new Date().toISOString() });
      }, 20_000);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      unsubscribe?.();
    },
  });

  request.signal.addEventListener("abort", () => {
    if (heartbeat) clearInterval(heartbeat);
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
