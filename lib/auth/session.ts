import { getStore } from "@/lib/store/app-store";
import { isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "houselink_session";
const secureCookie = process.env.NODE_ENV === "production" ? "; Secure" : "";
const signedSessionPrefix = "v2.";
const MIN_PRODUCTION_SECRET_LENGTH = 32;

export class SessionSecretConfigurationError extends Error {
  constructor() {
    super(`A 32+ character session secret must be configured in production.`);
    this.name = "SessionSecretConfigurationError";
  }
}

export function isSessionSecretConfigurationError(error: unknown): error is SessionSecretConfigurationError {
  return error instanceof SessionSecretConfigurationError;
}

export function hasUsableSessionSecret() {
  try {
    getSessionSecret();
    return true;
  } catch (error) {
    if (isSessionSecretConfigurationError(error)) return false;
    throw error;
  }
}

function getSessionSecret() {
  return getSessionSecretCandidates()[0];
}

function getSessionSecretCandidates() {
  if (process.env.NODE_ENV === "production") {
    const primary = [
      process.env.HOUSELINK_SESSION_SECRET,
      process.env.AUTH_SECRET,
      process.env.NEXTAUTH_SECRET,
    ].find(isStrongSessionSecret);
    if (!isStrongSessionSecret(primary)) {
      throw new SessionSecretConfigurationError();
    }
    const previous = process.env.HOUSELINK_PREVIOUS_SESSION_SECRETS
      ?.split(",")
      .map((value) => value.trim())
      .filter(isStrongSessionSecret) ?? [];
    return [primary, ...previous];
  }

  const candidates = [
    process.env.HOUSELINK_SESSION_SECRET,
    process.env.AUTH_SECRET,
    process.env.NEXTAUTH_SECRET,
    "houselink-local-session-secret",
  ].filter((value): value is string => Boolean(value));
  return [...new Set(candidates)];
}

function isStrongSessionSecret(value: string | undefined): value is string {
  return Boolean(value && value.length >= MIN_PRODUCTION_SECRET_LENGTH && value !== "houselink-local-session-secret");
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

export type SignedSessionPayload = {
  sessionId: string;
  userId: string;
  createdAt?: number;
};

export function parseSignedSessionValue(value: string): SignedSessionPayload | null {
  if (!value.startsWith(signedSessionPrefix)) return null;
  const token = value.slice(signedSessionPrefix.length);
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !verifySignature(payload, signature)) return null;
  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as { sessionId?: unknown; userId?: unknown; createdAt?: unknown };
    if (typeof parsed.sessionId !== "string" || typeof parsed.userId !== "string") return null;
    return {
      sessionId: parsed.sessionId,
      userId: parsed.userId,
      createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : undefined,
    };
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
  const signedSession = parseSignedSessionValue(cookieValue);
  if (signedSession) return signedSession.userId;
  if (isPostgresStoreEnabled()) return null;

  const session = getStore().getSession(cookieValue);
  return session?.userId ?? null;
}

export function getSignedSessionFromRequest(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (!match) return null;
  return parseSignedSessionValue(decodeURIComponent(match[1]));
}

export function sessionCookieHeader(sessionId: string, maxAgeSeconds = 604800, userId?: string) {
  const value = userId ? signedSessionValue(sessionId, userId) : sessionId;
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secureCookie}`;
}

export function clearSessionCookieHeader() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureCookie}`;
}
