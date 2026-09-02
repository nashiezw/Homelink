import { cookies } from "next/headers";
import { getVisitorMessages, getLiveChatStreamTargets, subscribeLiveChatRealtime } from "@/lib/live-chat/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VISITOR_COOKIE = "hl_live_visitor";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const visitorKey = cookieStore.get(VISITOR_COOKIE)?.value;
  if (!visitorKey) return new Response(null, { status: 204 });

  const { searchParams } = new URL(request.url);
  const targets = await getLiveChatStreamTargets(visitorKey, searchParams.get("conversationId"));
  if (!targets.length) return new Response(null, { status: 204 });

  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let messagePoll: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: (() => void) | null = null;
  const seenMessageIds = new Set<string>();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      const conversationId = searchParams.get("conversationId");
      const initialMessages = await getVisitorMessages(visitorKey, conversationId);
      for (const message of initialMessages) seenMessageIds.add(message.id);
      unsubscribe = subscribeLiveChatRealtime(targets, (event) => send(event.type, event));
      send("ready", { ok: true, targets: targets.length });
      heartbeat = setInterval(() => send("heartbeat", { now: new Date().toISOString() }), 25_000);
      messagePoll = setInterval(() => {
        void getVisitorMessages(visitorKey, conversationId).then((messages) => {
          for (const message of messages) {
            if (seenMessageIds.has(message.id)) continue;
            seenMessageIds.add(message.id);
            send("message", { type: "message", conversationId: conversationId ?? message.conversationId, message, createdAt: new Date().toISOString() });
          }
        }).catch(() => null);
      }, 2_500);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (messagePoll) clearInterval(messagePoll);
      unsubscribe?.();
    },
  });

  request.signal.addEventListener("abort", () => {
    if (heartbeat) clearInterval(heartbeat);
    if (messagePoll) clearInterval(messagePoll);
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
