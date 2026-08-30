import { cookies } from "next/headers";
import { ok, problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { bootstrapLiveChat, LiveChatError, makeLiveChatVisitorKey } from "@/lib/live-chat/repository";

export const dynamic = "force-dynamic";

const VISITOR_COOKIE = "hl_live_visitor";

export async function POST(request: Request) {
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
    return ok(await bootstrapLiveChat({
      request,
      visitorKey,
      context: typeof body.context === "object" && body.context ? body.context : {},
      contact: typeof body.contact === "object" && body.contact ? body.contact : undefined,
      userId: getSessionUserIdFromRequest(request),
    }));
  } catch (error) {
    if (error instanceof LiveChatError) return problem(error.status, error.code, error.message);
    console.error("[live-chat/bootstrap] failed", error);
    return problem(500, "LIVE_CHAT_BOOTSTRAP_FAILED", "Live Chat could not be loaded.");
  }
}
