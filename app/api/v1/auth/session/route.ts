import { NextResponse } from "next/server";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getClientIp, checkRateLimit } from "@/lib/api/request-meta";
import {
  clearSessionCookieHeader,
  getSessionUserIdFromRequest,
  sessionCookieHeader,
} from "@/lib/auth/session";
import { getRegistrationPolicy, getRateLimitPerMinute, getSessionTimeoutSeconds } from "@/lib/settings/runtime";
import { ok, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export async function POST(request: Request) {
  const policy = getRegistrationPolicy();
  const rate = checkRateLimit(`auth:${getClientIp(request)}`, getRateLimitPerMinute());
  if (!rate.allowed) {
    return problem(429, "RATE_LIMITED", `Too many attempts. Retry in ${rate.retryAfterSec}s.`);
  }

  const body = await request.json();
  const action = body.action === "register" ? "register" : "login";
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name : "";

  if (!email || !password) {
    return problem(400, "INVALID_CREDENTIALS", "Email and password are required.");
  }

  if (password.length < policy.minPasswordLength) {
    return problem(400, "WEAK_PASSWORD", `Password must be at least ${policy.minPasswordLength} characters.`);
  }

  const store = getStore();

  if (action === "register") {
    if (!policy.open) {
      return problem(403, "REGISTRATION_CLOSED", "New registrations are currently closed.");
    }
    if (!name.trim()) {
      return problem(400, "NAME_REQUIRED", "Name is required for registration.");
    }
    if (store.getUserByEmail(email)) {
      return problem(409, "EMAIL_EXISTS", "An account with this email already exists.");
    }
    const user = store.createUser({
      email,
      passwordHash: hashPassword(password),
      name,
      phone: body.phone,
    });
    const session = store.createSession(user.id);
    return new NextResponse(
      JSON.stringify({
        data: store.publicUser(user),
        meta: { requestId: crypto.randomUUID() },
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": sessionCookieHeader(session.id, getSessionTimeoutSeconds(), user.id),
        },
      },
    );
  }

  const user = store.getUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return problem(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }

  if (user.accountStatus === "SUSPENDED") {
    return problem(403, "ACCOUNT_SUSPENDED", "Your account has been suspended. Contact support.");
  }
  if (user.accountStatus === "BLOCKED") {
    return problem(403, "ACCOUNT_BLOCKED", "Your account has been blocked.");
  }

  store.recordLogin(user.id);
  const session = store.createSession(user.id);
  return new NextResponse(
    JSON.stringify({
      data: store.publicUser(user),
      meta: { requestId: crypto.randomUUID() },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": sessionCookieHeader(session.id, getSessionTimeoutSeconds(), user.id),
      },
    },
  );
}

export async function DELETE(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/homelink_session=([^;]+)/);
  if (match) {
    getStore().deleteSession(match[1]);
  }
  return new NextResponse(
    JSON.stringify({ data: { signedOut: true }, meta: { requestId: crypto.randomUUID() } }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": clearSessionCookieHeader(),
      },
    },
  );
}

export function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to continue.");
  }
  const user = getStore().getUserById(userId);
  if (!user) {
    return problem(401, "UNAUTHORIZED", "Session is no longer valid.");
  }
  return ok(getStore().publicUser(user));
}
