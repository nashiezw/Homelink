import {
  createPostgresSession,
  createPostgresUser,
  getPostgresUserByEmail,
  recordPostgresAuditEvent,
  shouldUsePostgresAuth,
} from "@/lib/auth/postgres-auth";
import { getSessionTimeoutSeconds } from "@/lib/settings/runtime";
import { getStore } from "@/lib/store/app-store";
import { getMainPrisma } from "@/lib/db/main-prisma";

export type LightweightBuyerInput = {
  name: string;
  email: string;
  phone?: string;
};

export type LightweightBuyerResult =
  | {
      ok: true;
      userId: string;
      sessionId: string;
      maxAgeSeconds: number;
      created: boolean;
      hasPassword: boolean;
      name: string;
      email: string;
    }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
    };

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizePhone(phone?: string) {
  const value = phone?.trim() || "";
  return value || undefined;
}

/**
 * Continue-with-email for Library checkout: create or reuse a passwordless buyer,
 * then open a session so confirmation / My Library work immediately.
 */
export async function ensureLibraryCheckoutBuyer(input: LightweightBuyerInput): Promise<LightweightBuyerResult> {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  const phone = normalizePhone(input.phone);
  if (!email || !email.includes("@")) {
    return { ok: false, status: 400, code: "EMAIL_REQUIRED", message: "Enter a valid email to continue checkout." };
  }
  if (!name) {
    return { ok: false, status: 400, code: "NAME_REQUIRED", message: "Enter your name to continue checkout." };
  }

  const maxAgeSeconds = getSessionTimeoutSeconds();

  if (shouldUsePostgresAuth()) {
    const existing = await getPostgresUserByEmail(email);
    if (existing) {
      if (existing.accountStatus === "SUSPENDED" || existing.accountStatus === "BLOCKED" || existing.accountStatus === "DELETED") {
        return {
          ok: false,
          status: 403,
          code: "ACCOUNT_UNAVAILABLE",
          message: "This account cannot checkout right now. Contact support.",
        };
      }
      if (existing.passwordHash) {
        return {
          ok: false,
          status: 409,
          code: "EMAIL_EXISTS",
          message: "An account with this email already exists. Sign in to checkout.",
        };
      }
      const sessionId = `session_${crypto.randomUUID()}`;
      await getMainPrisma().user.update({
        where: { id: existing.id },
        data: {
          name,
          ...(phone ? { phone } : {}),
          lastLoginAt: new Date(),
        },
      });
      await createPostgresSession(existing.id, sessionId, maxAgeSeconds);
      await recordPostgresAuditEvent({
        actorId: existing.id,
        action: "AUTH_CHECKOUT_CONTINUE",
        target: existing.id,
        metadata: { email, reused: true },
      });
      return {
        ok: true,
        userId: existing.id,
        sessionId,
        maxAgeSeconds,
        created: false,
        hasPassword: false,
        name,
        email: existing.email,
      };
    }

    let user;
    try {
      user = await createPostgresUser({
        email,
        passwordHash: null,
        name,
        phone,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/unique|phone/i.test(message) && phone) {
        user = await createPostgresUser({
          email,
          passwordHash: null,
          name,
        });
      } else if (/unique|email/i.test(message)) {
        return {
          ok: false,
          status: 409,
          code: "EMAIL_EXISTS",
          message: "An account with this email already exists. Sign in to checkout.",
        };
      } else {
        throw error;
      }
    }
    const sessionId = `session_${crypto.randomUUID()}`;
    await createPostgresSession(user.id, sessionId, maxAgeSeconds);
    await recordPostgresAuditEvent({
      actorId: user.id,
      action: "AUTH_CHECKOUT_CONTINUE",
      target: user.id,
      metadata: { email, created: true },
    });
    return {
      ok: true,
      userId: user.id,
      sessionId,
      maxAgeSeconds,
      created: true,
      hasPassword: false,
      name: user.name,
      email: user.email,
    };
  }

  const store = getStore();
  const existing = store.getUserByEmail(email);
  if (existing) {
    if (existing.accountStatus === "SUSPENDED" || existing.accountStatus === "BLOCKED" || existing.accountStatus === "DELETED") {
      return {
        ok: false,
        status: 403,
        code: "ACCOUNT_UNAVAILABLE",
        message: "This account cannot checkout right now. Contact support.",
      };
    }
    if (existing.passwordHash) {
      return {
        ok: false,
        status: 409,
        code: "EMAIL_EXISTS",
        message: "An account with this email already exists. Sign in to checkout.",
      };
    }
    existing.name = name;
    if (phone) existing.phone = phone;
    store.recordLogin(existing.id);
    const session = store.createSession(existing.id);
    return {
      ok: true,
      userId: existing.id,
      sessionId: session.id,
      maxAgeSeconds,
      created: false,
      hasPassword: false,
      name: existing.name,
      email: existing.email,
    };
  }

  const user = store.createUser({
    email,
    passwordHash: null,
    name,
    phone,
  });
  const session = store.createSession(user.id);
  return {
    ok: true,
    userId: user.id,
    sessionId: session.id,
    maxAgeSeconds,
    created: true,
    hasPassword: false,
    name: user.name,
    email: user.email,
  };
}
