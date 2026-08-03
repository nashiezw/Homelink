import { applyPasswordReset, requestPasswordReset } from "@/lib/auth/password-reset";
import { checkRateLimit, getClientIp } from "@/lib/api/request-meta";
import { ok, problem } from "@/lib/api/response";
import { requireStrictProductionConfig } from "@/lib/production/runtime";
import { getRateLimitPerMinute } from "@/lib/settings/runtime";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rate = checkRateLimit(`auth-reset:${getClientIp(request)}`, Math.max(5, Math.floor(getRateLimitPerMinute() / 4)));
  if (!rate.allowed) {
    return problem(429, "RATE_LIMITED", `Too many reset attempts. Retry in ${rate.retryAfterSec}s.`);
  }
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email : "";
  const debugSecret = process.env.HOUSELINK_RESET_DEBUG_SECRET;
  const exposeResetUrl = Boolean(
    debugSecret &&
      !requireStrictProductionConfig() &&
      request.headers.get("x-houselink-reset-debug") === debugSecret,
  );
  const result = await requestPasswordReset(email, request.url, exposeResetUrl);
  return ok(result);
}

export async function PATCH(request: Request) {
  const rate = checkRateLimit(`auth-reset-apply:${getClientIp(request)}`, Math.max(8, Math.floor(getRateLimitPerMinute() / 3)));
  if (!rate.allowed) {
    return problem(429, "RATE_LIMITED", `Too many reset attempts. Retry in ${rate.retryAfterSec}s.`);
  }
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!token) return problem(400, "INVALID_TOKEN", "This password reset link is invalid or has expired.");
  const result = await applyPasswordReset(token, password);
  if (!result.ok) return problem(result.code === "WEAK_PASSWORD" ? 400 : 401, result.code, result.message);
  return ok(result);
}
