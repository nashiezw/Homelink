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
import { getRegistrationPolicy, getRateLimitPerMinute, getSessionTimeoutSeconds, getHydratedRuntimePlatformSettings } from "@/lib/settings/runtime";
import { ok, problem } from "@/lib/api/response";
import {
  createPostgresUser,
  createPostgresSession,
  getPostgresPublicUserById,
  getPostgresUserByEmail,
  getPostgresUserById,
  recordPostgresAuditEvent,
  recordPostgresLogin,
  revokePostgresSession,
  setPostgresUserPassword,
  shouldUsePostgresAuth,
  touchPostgresSession,
  toPublicPostgresUser,
} from "@/lib/auth/postgres-auth";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { getStore } from "@/lib/store/app-store";
import { randomBytes } from "crypto";
import { sendEmailVerificationEmail } from "@/lib/academy/academy-email";
import { sendWelcomeEmail } from "@/lib/academy/welcome-email";

export async function POST(request: Request) {
  if (!hasUsableSessionSecret()) return sessionSecretProblem();

  const policy = getRegistrationPolicy();
  const rate = checkRateLimit(`auth:${getClientIp(request)}`, getRateLimitPerMinute());
  if (!rate.allowed) {
    return problem(429, "RATE_LIMITED", `Too many attempts. Retry in ${rate.retryAfterSec}s.`);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return problem(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
  const action =
    body.action === "register" ? "register" : body.action === "set_password" ? "set_password" : "login";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name : "";
  const redirectUrl = typeof body.redirectUrl === "string" ? body.redirectUrl : null;

  if (action === "set_password") {
    let userId: string | null;
    try {
      userId = getSessionUserIdFromRequest(request);
    } catch (error) {
      if (isSessionSecretConfigurationError(error)) return sessionSecretProblem();
      throw error;
    }
    if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to set a password.");
    if (!password || password.length < policy.minPasswordLength) {
      return problem(400, "WEAK_PASSWORD", `Password must be at least ${policy.minPasswordLength} characters.`);
    }
    if (shouldUsePostgresAuth()) {
      const current = await getPostgresUserById(userId);
      if (!current) return problem(401, "UNAUTHORIZED", "Session is no longer valid.");
      if (current.passwordHash) {
        return problem(409, "PASSWORD_ALREADY_SET", "This account already has a password. Sign in with email and password.");
      }
      const updated = await setPostgresUserPassword(userId, hashPassword(password));
      await recordPostgresAuditEvent({
        actorId: userId,
        action: "AUTH_PASSWORD_SET",
        target: userId,
        metadata: { source: "checkout_continue" },
      });
      return ok(toPublicPostgresUser(updated));
    }
    const store = getStore();
    const current = store.getUserById(userId);
    if (!current) return problem(401, "UNAUTHORIZED", "Session is no longer valid.");
    if (current.passwordHash) {
      return problem(409, "PASSWORD_ALREADY_SET", "This account already has a password. Sign in with email and password.");
    }
    const updated = store.setUserPassword(userId, hashPassword(password));
    return ok(store.publicUser(updated!));
  }

  if (!email || !password) {
    return problem(400, "INVALID_CREDENTIALS", "Email and password are required.");
  }

  if (!isEmail(email)) {
    return problem(400, "INVALID_EMAIL", "Enter a valid email address.");
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
    
    // Check if email verification is required from platform settings
    const platformSettings = await getHydratedRuntimePlatformSettings();
    const requireEmailVerification = platformSettings.emailVerificationRequired;
    
    if (shouldUsePostgresAuth()) {
      const existing = await getPostgresUserByEmail(email);
      if (existing) {
        // If email exists but is not verified, resend verification email
        if (!existing.emailVerifiedAt) {
          const prisma = getMainPrisma();
          const token = randomBytes(32).toString("hex");
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
          const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
          const userAgent = request.headers.get("user-agent") || "unknown";
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.houselink.co.zw";

          await prisma.emailVerificationToken.upsert({
            where: { userId: existing.id },
            create: { userId: existing.id, token, expiresAt, ipAddress, userAgent, redirectUrl },
            update: { token, expiresAt, ipAddress, userAgent, redirectUrl, usedAt: null },
          });

          // Send verification email
          const emailResult = await sendEmailVerificationEmail(existing.email, existing.name, token, redirectUrl);
          
          return new NextResponse(
            JSON.stringify({
              data: {
                user: toPublicPostgresUser(existing),
                requiresEmailVerification: true,
                emailSent: emailResult.success,
                message: emailResult.success
                  ? "An account with this email already exists but is not verified. A new verification link has been sent to your email."
                  : `An account with this email already exists but is not verified. The verification email could not be sent: ${emailResult.error ?? "Check Platform Settings SMTP configuration."}`,
                emailError: emailResult.success ? undefined : emailResult.error,
                ...(process.env.NODE_ENV === "development" && { 
                  verificationToken: token, 
                  verificationLink: `${baseUrl}/auth/verify-email?token=${token}${redirectUrl ? `&redirect=${encodeURIComponent(redirectUrl)}` : ''}` 
                }),
              },
              meta: { requestId: crypto.randomUUID() },
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
        }
        
        // If email exists and is verified, return error
        return problem(409, "EMAIL_EXISTS", "An account with this email already exists. Please sign in instead.");
      }
      const user = await createPostgresUser({
        email,
        passwordHash: hashPassword(password),
        name,
        phone: body.phone,
      });
      
      // If email verification is required, generate token and send email
      if (requireEmailVerification) {
        const prisma = getMainPrisma();
        const token = randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
        const userAgent = request.headers.get("user-agent") || "unknown";

        await prisma.emailVerificationToken.upsert({
          where: { userId: user.id },
          create: { userId: user.id, token, expiresAt, ipAddress, userAgent, redirectUrl },
          update: { token, expiresAt, ipAddress, userAgent, redirectUrl, usedAt: null },
        });

        // Send verification email
        const emailResult = await sendEmailVerificationEmail(user.email, user.name, token, redirectUrl);
        
        return new NextResponse(
          JSON.stringify({
            data: {
              user: toPublicPostgresUser(user),
              requiresEmailVerification: true,
              emailSent: emailResult.success,
              message: emailResult.success
                ? "Please verify your email address. A verification link has been sent to your email."
                : `Please verify your email address. The verification email could not be sent: ${emailResult.error ?? "Check Platform Settings SMTP configuration."}`,
              emailError: emailResult.success ? undefined : emailResult.error,
              ...(process.env.NODE_ENV === "development" && { 
                verificationToken: token, 
                verificationLink: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.houselink.co.zw"}/auth/verify-email?token=${token}${redirectUrl ? `&redirect=${encodeURIComponent(redirectUrl)}` : ''}` 
              }),
            },
            meta: { requestId: crypto.randomUUID() },
          }),
          {
            status: 201,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }
      
      // If no email verification required, create session and log in
      const sessionId = `session_${crypto.randomUUID()}`;
      const sessionMaxAge = getSessionTimeoutSeconds();
      await createPostgresSession(user.id, sessionId, sessionMaxAge);
      
      // Send welcome email
      await sendWelcomeEmail(user.email, user.name);
      
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
    
    // If email verification is required, generate token and send email
    if (requireEmailVerification) {
      const prisma = getMainPrisma();
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
      const userAgent = request.headers.get("user-agent") || "unknown";
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.houselink.co.zw";

      await prisma.emailVerificationToken.upsert({
        where: { userId: user.id },
        create: { userId: user.id, token, expiresAt, ipAddress, userAgent },
        update: { token, expiresAt, ipAddress, userAgent, usedAt: null },
      });

      // Send verification email
      const emailResult = await sendEmailVerificationEmail(user.email, user.name, token);
      
      return new NextResponse(
        JSON.stringify({
          data: {
            user: store.publicUser(user),
            requiresEmailVerification: true,
            emailSent: emailResult.success,
            message: emailResult.success
              ? "Please verify your email address. A verification link has been sent to your email."
              : `Please verify your email address. The verification email could not be sent: ${emailResult.error ?? "Check Platform Settings SMTP configuration."}`,
            emailError: emailResult.success ? undefined : emailResult.error,
            ...(process.env.NODE_ENV === "development" && { 
              verificationToken: token, 
              verificationLink: `${baseUrl}/auth/verify-email?token=${token}` 
            }),
          },
          meta: { requestId: crypto.randomUUID() },
        }),
        {
          status: 201,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }
    
    // If no email verification required, create session and log in
    const session = store.createSession(user.id);
    
    // Send welcome email
    await sendWelcomeEmail(user.email, user.name);
    
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
    if (user && !user.passwordHash) {
      return problem(
        401,
        "PASSWORD_NOT_SET",
        "This account was started without a password. Use Forgot password to send yourself a secure setup link, then sign in normally.",
      );
    }
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
    
    // Check if email verification is required and user's email is not verified
    const platformSettings = await getHydratedRuntimePlatformSettings();
    const requireEmailVerification = platformSettings.emailVerificationRequired;
    if (requireEmailVerification && !user.emailVerifiedAt) {
      // Generate and send new verification token
      const prisma = getMainPrisma();
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
      const userAgent = request.headers.get("user-agent") || "unknown";
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.houselink.co.zw";

      await prisma.emailVerificationToken.upsert({
        where: { userId: user.id },
        create: { userId: user.id, token, expiresAt, ipAddress, userAgent, redirectUrl },
        update: { token, expiresAt, ipAddress, userAgent, redirectUrl, usedAt: null },
      });

      // Send verification email
      const emailResult = await sendEmailVerificationEmail(user.email, user.name, token, redirectUrl);
      
      return problem(
        403,
        "EMAIL_VERIFICATION_REQUIRED",
        emailResult.success
          ? "Please verify your email address before signing in. A new verification link has been sent to your email."
          : `Please verify your email address before signing in. The verification email could not be sent: ${emailResult.error ?? "Check Platform Settings SMTP configuration."}`,
        { emailSent: emailResult.success, emailError: emailResult.success ? undefined : emailResult.error, email: user.email, ...(process.env.NODE_ENV === "development" && { verificationToken: token, verificationLink: `${baseUrl}/auth/verify-email?token=${token}${redirectUrl ? `&redirect=${encodeURIComponent(redirectUrl)}` : ''}` }) }
      );
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
    if (user.accountStatus === "DELETED") {
      await recordPostgresAuditEvent({
        actorId: user.id,
        action: "AUTH_LOGIN_BLOCKED",
        target: user.id,
        metadata: { reason: "ACCOUNT_DELETED", ip: getClientIp(request) },
      });
      return problem(403, "ACCOUNT_DELETED", "This account has been deleted.");
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
  if (user && !user.passwordHash) {
    return problem(
      401,
      "PASSWORD_NOT_SET",
      "This account was started without a password. Use Forgot password to send yourself a secure setup link, then sign in normally.",
    );
  }
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
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
  const localPart = normalized.split("@")[0] ?? "";
  const candidates = [
    localPart === "admin" ? process.env.SEED_ADMIN_PASSWORD : "",
    localPart === "landlord" ? process.env.SEED_LANDLORD_PASSWORD : "",
    localPart === "tinashe.dube" ? process.env.SEED_TINASHE_PASSWORD : "",
    process.env.SEED_STANDARD_PASSWORD,
  ].filter((value): value is string => Boolean(value));
  return candidates.some((candidate) => candidate === password);
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
