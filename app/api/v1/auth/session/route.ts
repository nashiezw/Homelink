import { NextResponse } from "next/server";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getClientIp, checkRateLimit } from "@/lib/api/request-meta";
import {
  clearSessionCookieHeader,
  getSignedSessionFromRequest,
  getSessionUserIdFromRequest,
  hasUsableSessionSecret,
  isSessionSecretConfigurationError,
  sessionCookieHeader,
} from "@/lib/auth/session";
import { getRegistrationPolicy, getRateLimitPerMinute, getSessionTimeoutSeconds } from "@/lib/settings/runtime";
import { ok, problem } from "@/lib/api/response";
import {
  createPostgresUser,
  createPostgresSession,
  getPostgresPublicUserById,
  getPostgresUserByEmail,
  recordPostgresAuditEvent,
  recordPostgresLogin,
  revokePostgresSession,
  shouldUsePostgresAuth,
  touchPostgresSession,
  toPublicPostgresUser,
} from "@/lib/auth/postgres-auth";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { getStore } from "@/lib/store/app-store";

export async function POST(request: Request) {
  if (!hasUsableSessionSecret()) return sessionSecretProblem();

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

  if (action === "register") {
    if (!policy.open) {
      return problem(403, "REGISTRATION_CLOSED", "New registrations are currently closed.");
    }
    if (!name.trim()) {
      return problem(400, "NAME_REQUIRED", "Name is required for registration.");
    }
    if (shouldUsePostgresAuth()) {
      const existing = await getPostgresUserByEmail(email);
      if (existing) {
        return problem(409, "EMAIL_EXISTS", "An account with this email already exists.");
      }
      const user = await createPostgresUser({
        email,
        passwordHash: hashPassword(password),
        name,
        phone: body.phone,
      });
      const sessionId = `session_${crypto.randomUUID()}`;
      const sessionMaxAge = getSessionTimeoutSeconds();
      await createPostgresSession(user.id, sessionId, sessionMaxAge);
      return new NextResponse(
        JSON.stringify({
          data: toPublicPostgresUser(user),
          meta: { requestId: crypto.randomUUID() },
        }),
        {
          status: 201,
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": sessionCookieHeader(sessionId, sessionMaxAge, user.id),
          },
        },
      );
    }
    const store = getStore();
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

  if (shouldUsePostgresAuth()) {
    const user = await getPostgresUserByEmail(email);
    const passwordMatches = Boolean(user?.passwordHash && verifyPassword(password, user.passwordHash));
    const envSeedMatches = user ? seedPasswordMatches(user.email, password) : false;
    if (!user?.passwordHash || (!passwordMatches && !envSeedMatches)) {
      await recordPostgresAuditEvent({
        action: "AUTH_LOGIN_FAIL",
        target: email.trim().toLowerCase() || "unknown",
        metadata: { reason: "INVALID_CREDENTIALS", ip: getClientIp(request) },
      });
      return problem(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
    }
    if (user.accountStatus === "SUSPENDED") {
      await recordPostgresAuditEvent({
        actorId: user.id,
        action: "AUTH_LOGIN_BLOCKED",
        target: user.id,
        metadata: { reason: "ACCOUNT_SUSPENDED", ip: getClientIp(request) },
      });
      return problem(403, "ACCOUNT_SUSPENDED", "Your account has been suspended. Contact support.");
    }
    if (user.accountStatus === "BLOCKED") {
      await recordPostgresAuditEvent({
        actorId: user.id,
        action: "AUTH_LOGIN_BLOCKED",
        target: user.id,
        metadata: { reason: "ACCOUNT_BLOCKED", ip: getClientIp(request) },
      });
      return problem(403, "ACCOUNT_BLOCKED", "Your account has been blocked.");
    }
    if (!passwordMatches && envSeedMatches) {
      await getMainPrisma().user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(password) },
      });
    }
    const updated = await recordPostgresLogin(user.id);
    if (!updated) {
      return problem(401, "UNAUTHORIZED", "Session is no longer valid.");
    }
    const sessionId = `session_${crypto.randomUUID()}`;
    const sessionMaxAge = getSessionTimeoutSeconds();
    await createPostgresSession(user.id, sessionId, sessionMaxAge);
    return new NextResponse(
      JSON.stringify({
        data: toPublicPostgresUser(updated),
        meta: { requestId: crypto.randomUUID() },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": sessionCookieHeader(sessionId, sessionMaxAge, user.id),
        },
      },
    );
  }

  const store = getStore();
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

function seedPasswordMatches(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const candidates = [
    normalized === "admin@houselinkzim.co.zw" ? process.env.SEED_ADMIN_PASSWORD : "",
    normalized === "landlord@houselinkzim.co.zw" ? process.env.SEED_LANDLORD_PASSWORD : "",
    normalized === "tinashe.dube@houselinkzim.co.zw" ? process.env.SEED_TINASHE_PASSWORD : "",
    process.env.SEED_STANDARD_PASSWORD,
  ].filter((value): value is string => Boolean(value));
  return candidates.some((candidate) => candidate === password);
}

export async function DELETE(request: Request) {
  try {
    if (shouldUsePostgresAuth()) {
      const session = getSignedSessionFromRequest(request);
      if (session) {
        await revokePostgresSession(session.sessionId, session.userId);
      }
    } else {
      const cookie = request.headers.get("cookie") ?? "";
      const match = cookie.match(/houselink_session=([^;]+)/);
      if (match) {
        getStore().deleteSession(match[1]);
      }
    }
  } catch (error) {
    if (isSessionSecretConfigurationError(error)) return sessionSecretProblem();
    throw error;
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

export async function GET(request: Request) {
  let userId: string | null;
  try {
    userId = getSessionUserIdFromRequest(request);
  } catch (error) {
    if (isSessionSecretConfigurationError(error)) return sessionSecretProblem();
    throw error;
  }
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to continue.");
  }
  if (shouldUsePostgresAuth()) {
    const session = getSignedSessionFromRequest(request);
    if (session) {
      await touchPostgresSession(session.sessionId);
    }
    const user = await getPostgresPublicUserById(userId);
    if (!user) {
      return problem(401, "UNAUTHORIZED", "Session is no longer valid.");
    }
    return ok(toPublicPostgresUser(user));
  }
  const user = getStore().getUserById(userId);
  if (!user) {
    return problem(401, "UNAUTHORIZED", "Session is no longer valid.");
  }
  return ok(getStore().publicUser(user));
}

function sessionSecretProblem() {
  return problem(
    503,
    "AUTH_CONFIGURATION_ERROR",
    "Authentication is not configured. Set HOUSELINK_SESSION_SECRET, AUTH_SECRET, or NEXTAUTH_SECRET to a 32+ character value.",
  );
}
