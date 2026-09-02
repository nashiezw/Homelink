import { cookies } from "next/headers";
import { ok, problem } from "@/lib/api/response";
import { getLiveChatTyping, updateVisitorTyping } from "@/lib/live-chat/repository";

export const dynamic = "force-dynamic";

const VISITOR_COOKIE = "hl_live_visitor";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId");
  if (!conversationId) return ok(null);
  return ok(getLiveChatTyping(conversationId));
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const visitorKey = (await cookies()).get(VISITOR_COOKIE)?.value;
    if (!visitorKey || typeof body.conversationId !== "string") return ok({ ok: true });
    return ok(await updateVisitorTyping(visitorKey, body.conversationId, Boolean(body.typing)));
  } catch (error) {
    console.error("[live-chat/typing] failed", error);
    return problem(500, "LIVE_CHAT_TYPING_FAILED", "Typing state could not be updated.");
  }
}
