import { cookies } from "next/headers";
import { created, ok, problem } from "@/lib/api/response";
import { checkRateLimit, getClientIp } from "@/lib/api/request-meta";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { getVisitorMessages, LiveChatError, makeLiveChatVisitorKey, sendVisitorMessage } from "@/lib/live-chat/repository";

export const dynamic = "force-dynamic";

const VISITOR_COOKIE = "hl_live_visitor";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const visitorKey = cookieStore.get(VISITOR_COOKIE)?.value;
    if (!visitorKey) return ok([]);
    const { searchParams } = new URL(request.url);
    return ok(await getVisitorMessages(visitorKey, searchParams.get("conversationId")));
  } catch (error) {
    console.error("[live-chat/messages] GET failed", error);
    return problem(500, "LIVE_CHAT_MESSAGES_FAILED", "Messages could not be loaded.");
  }
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`live-chat:${ip}`, 12);
  if (!limit.allowed) return problem(429, "RATE_LIMITED", "Please wait a moment before sending another chat message.", { retryAfterSec: limit.retryAfterSec });
  try {
    const body = await request.json().catch(() => ({}));
    const cookieStore = await cookies();
    const visitorKey = cookieStore.get(VISITOR_COOKIE)?.value || makeLiveChatVisitorKey();
    cookieStore.set(VISITOR_COOKIE, visitorKey, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
    return created(await sendVisitorMessage({
      request,
      visitorKey,
      body: String(body.body ?? ""),
      idempotencyKey: typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined,
      contact: typeof body.contact === "object" && body.contact ? body.contact : undefined,
      context: typeof body.context === "object" && body.context ? body.context : undefined,
      departmentId: typeof body.departmentId === "string" ? body.departmentId : undefined,
      userId: getSessionUserIdFromRequest(request),
    }));
  } catch (error) {
    if (error instanceof LiveChatError) return problem(error.status, error.code, error.message);
    console.error("[live-chat/messages] POST failed", error);
    return problem(500, "LIVE_CHAT_SEND_FAILED", "Your message could not be sent.");
  }
}
