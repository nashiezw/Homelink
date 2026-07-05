import { getStore } from "@/lib/store/app-store";
import { isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "homelink_session";
const secureCookie = process.env.NODE_ENV === "production" ? "; Secure" : "";
const signedSessionPrefix = "v2.";

function getSessionSecret() {
  return getSessionSecretCandidates()[0];
}

function getSessionSecretCandidates() {
  const candidates = [
    process.env.HOMELINK_SESSION_SECRET,
    process.env.AUTH_SECRET,
    process.env.NEXTAUTH_SECRET,
    process.env.DATABASE_URL,
    "homelink-local-session-secret",
  ].filter((value): value is string => Boolean(value));
  return [...new Set(candidates)];
}

function signWithSecret(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return signWithSecret(value, getSessionSecret());
}

function verifySignature(value: string, signature: string) {
  const signatureBuffer = Buffer.from(signature);
  return getSessionSecretCandidates().some((secret) => {
    const expectedBuffer = Buffer.from(signWithSecret(value, secret));
    return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
  });
}

function signedSessionValue(sessionId: string, userId: string) {
  const payload = base64UrlEncode(JSON.stringify({ sessionId, userId, createdAt: Date.now() }));
  return `${signedSessionPrefix}${payload}.${sign(payload)}`;
}

function userIdFromSignedSession(value: string) {
  if (!value.startsWith(signedSessionPrefix)) return null;
  const token = value.slice(signedSessionPrefix.length);
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !verifySignature(payload, signature)) return null;
  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as { userId?: unknown };
    return typeof parsed.userId === "string" ? parsed.userId : null;
  } catch {
    return null;
  }
}

export function getSessionUserIdFromRequest(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (!match) {
    return null;
  }
  const cookieValue = decodeURIComponent(match[1]);
  const signedUserId = userIdFromSignedSession(cookieValue);
  if (signedUserId) return signedUserId;
  if (isPostgresStoreEnabled()) return null;

  const session = getStore().getSession(cookieValue);
  return session?.userId ?? null;
}

export function sessionCookieHeader(sessionId: string, maxAgeSeconds = 604800, userId?: string) {
  const value = userId ? signedSessionValue(sessionId, userId) : sessionId;
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secureCookie}`;
}

export function clearSessionCookieHeader() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureCookie}`;
}
