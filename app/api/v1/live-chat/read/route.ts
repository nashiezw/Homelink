import { cookies } from "next/headers";
import { ok, problem } from "@/lib/api/response";
import { markVisitorRead } from "@/lib/live-chat/repository";

export const dynamic = "force-dynamic";

const VISITOR_COOKIE = "hl_live_visitor";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const visitorKey = (await cookies()).get(VISITOR_COOKIE)?.value;
    if (!visitorKey || typeof body.conversationId !== "string") return ok({ ok: true });
    return ok(await markVisitorRead(visitorKey, body.conversationId));
  } catch (error) {
    console.error("[live-chat/read] failed", error);
    return problem(500, "LIVE_CHAT_READ_FAILED", "Read state could not be updated.");
  }
}
