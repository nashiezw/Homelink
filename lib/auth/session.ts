import { getStore } from "@/lib/store/app-store";

export const SESSION_COOKIE = "homelink_session";
const secureCookie = process.env.NODE_ENV === "production" ? "; Secure" : "";

export function getSessionUserIdFromRequest(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (!match) {
    return null;
  }
  const session = getStore().getSession(match[1]);
  return session?.userId ?? null;
}

export function sessionCookieHeader(sessionId: string, maxAgeSeconds = 604800) {
  return `${SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secureCookie}`;
}

export function clearSessionCookieHeader() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureCookie}`;
}
