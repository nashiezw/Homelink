import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { getPostgresUserByEmail, recordPostgresAuditEvent, setPostgresUserPassword, shouldUsePostgresAuth } from "@/lib/auth/postgres-auth";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { ensureCoreProductionSchema, isMissingSchemaError } from "@/lib/db/production-schema";
import { sendSmtpPlainEmail } from "@/lib/integrations/smtp";
import { requireStrictProductionConfig } from "@/lib/production/runtime";
import { getHydratedRuntimePlatformSettings, getRegistrationPolicy } from "@/lib/settings/runtime";
import { getStore } from "@/lib/store/app-store";

const RESET_TTL_MINUTES = 30;
const SETUP_TTL_MINUTES = 24 * 60;

type LocalResetToken = {
  userId: string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
};

const localResetTokens = new Map<string, LocalResetToken>();

export type PasswordResetRequestResult = {
  accepted: true;
  delivered: boolean;
  resetUrl?: string;
  message: string;
};

export type PasswordResetApplyResult =
  | { ok: true; message: string }
  | { ok: false; code: "INVALID_TOKEN" | "WEAK_PASSWORD"; message: string };

export async function requestPasswordReset(email: string, requestUrl: string, exposeResetUrl = false): Promise<PasswordResetRequestResult> {
  return requestPasswordLink(email, requestUrl, { exposeResetUrl, purpose: "reset" });
}

export async function requestPasswordSetup(email: string, requestUrl: string, exposeResetUrl = false): Promise<PasswordResetRequestResult> {
  return requestPasswordLink(email, requestUrl, { exposeResetUrl, purpose: "setup" });
}

async function requestPasswordLink(
  email: string,
  requestUrl: string,
  options: { exposeResetUrl: boolean; purpose: "reset" | "setup" },
): Promise<PasswordResetRequestResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const genericMessage = options.purpose === "setup"
    ? "The learner account was created. Check the invitation delivery status before closing this screen."
    : "If this email is linked to a HouseLink account, we have sent reset instructions. Check your inbox and spam folder.";
  if (!isEmail(normalizedEmail)) {
    return { accepted: true, delivered: false, message: genericMessage };
  }

  const user = shouldUsePostgresAuth()
    ? await getPostgresUserByEmail(normalizedEmail)
    : getStore().getUserByEmail(normalizedEmail);
  if (!user || user.accountStatus === "DELETED") {
    return { accepted: true, delivered: false, message: genericMessage };
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(token);
  const ttlMinutes = options.purpose === "setup" ? SETUP_TTL_MINUTES : RESET_TTL_MINUTES;
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  const resetUrl = `${appOrigin(requestUrl)}/auth/reset-password?token=${encodeURIComponent(token)}`;

  if (shouldUsePostgresAuth()) {
    await ensurePasswordResetSchema();
    const prisma = getMainPrisma();
    await prisma.$executeRaw`
      INSERT INTO "PasswordResetToken" ("id", "userId", "tokenHash", "email", "expiresAt")
      VALUES (${`reset_${randomUUID()}`}, ${user.id}, ${tokenHash}, ${normalizedEmail}, ${expiresAt})
    `;
    await recordPostgresAuditEvent({
      actorId: user.id,
      action: options.purpose === "setup" ? "AUTH_PASSWORD_SETUP_REQUEST" : "AUTH_PASSWORD_RESET_REQUEST",
      target: user.id,
      metadata: { email: normalizedEmail, purpose: options.purpose },
    });
  } else {
    localResetTokens.set(tokenHash, { userId: user.id, email: normalizedEmail, tokenHash, expiresAt });
  }

  const delivered = options.purpose === "setup"
    ? await sendPasswordSetupEmail(normalizedEmail, user.name, resetUrl)
    : await sendPasswordResetEmail(normalizedEmail, user.name, resetUrl);
  return {
    accepted: true,
    delivered,
    resetUrl: shouldExposeDevResetUrl(delivered, options.exposeResetUrl) ? resetUrl : undefined,
    message: delivered
      ? genericMessage
      : shouldExposeDevResetUrl(delivered, options.exposeResetUrl)
        ? "Email is not configured locally. Use the reset link returned for development."
        : genericMessage,
  };
}

export async function applyPasswordReset(token: string, password: string): Promise<PasswordResetApplyResult> {
  const policy = getRegistrationPolicy();
  if (!password || password.length < policy.minPasswordLength) {
    return { ok: false, code: "WEAK_PASSWORD", message: `Password must be at least ${policy.minPasswordLength} characters.` };
  }

  const tokenHash = hashResetToken(token);
  if (shouldUsePostgresAuth()) {
    await ensurePasswordResetSchema();
    const prisma = getMainPrisma();
    const rows = await prisma.$queryRaw<Array<{ id: string; userId: string; expiresAt: Date; usedAt: Date | null }>>`
      SELECT "id", "userId", "expiresAt", "usedAt"
      FROM "PasswordResetToken"
      WHERE "tokenHash" = ${tokenHash}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
      return { ok: false, code: "INVALID_TOKEN", message: "This password reset link is invalid or has expired." };
    }
    const updated = await setPostgresUserPassword(row.userId, hashPassword(password));
    const completedAt = new Date();
    await prisma.$transaction([
      prisma.user.update({
        where: { id: row.userId },
        data: { emailVerifiedAt: updated.emailVerifiedAt ?? completedAt },
      }),
      prisma.emailVerificationToken.updateMany({
        where: { userId: row.userId, usedAt: null },
        data: { usedAt: completedAt },
      }),
      prisma.$executeRaw`UPDATE "PasswordResetToken" SET "usedAt" = ${completedAt} WHERE "userId" = ${row.userId} AND "usedAt" IS NULL`,
    ]);
    await recordPostgresAuditEvent({
      actorId: row.userId,
      action: "AUTH_PASSWORD_RESET_COMPLETE",
      target: row.userId,
      metadata: { email: updated.email },
    });
    return { ok: true, message: "Your password has been reset. You can sign in with the new password." };
  }

  const row = localResetTokens.get(tokenHash);
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    return { ok: false, code: "INVALID_TOKEN", message: "This password reset link is invalid or has expired." };
  }
  const updated = getStore().setUserPassword(row.userId, hashPassword(password));
  if (!updated) {
    return { ok: false, code: "INVALID_TOKEN", message: "This password reset link is invalid or has expired." };
  }
  row.usedAt = new Date();
  for (const entry of localResetTokens.values()) {
    if (entry.userId === row.userId && !entry.usedAt) entry.usedAt = new Date();
  }
  return { ok: true, message: "Your password has been reset. You can sign in with the new password." };
}

async function sendPasswordLinkEmail(email: string, name: string, resetUrl: string, purpose: "reset" | "setup", ttlMinutes: number) {
  const settings = await getHydratedRuntimePlatformSettings();
  const isSetup = purpose === "setup";
  const expiryLabel = ttlMinutes >= 60 ? `${Math.round(ttlMinutes / 60)} hours` : `${ttlMinutes} minutes`;
  const body = isSetup
    ? [
        `Hi ${name || "there"},`,
        "A HouseLink Academy administrator created a learning account for you.",
        `Set up your password using this secure, single-use link: ${resetUrl}`,
        `This link expires in ${expiryLabel}. Setting your password also verifies this email address.`,
      ].join("\n\n")
    : [
        `Hi ${name || "there"},`,
        "We received a request to reset your HouseLink password.",
        `Reset your password using this secure link: ${resetUrl}`,
        `This link expires in ${expiryLabel}. If you did not request this, you can safely ignore this email.`,
      ].join("\n\n");
  const subject = isSetup ? "Set up your HouseLink Academy password" : "Reset your HouseLink password";
  const result = await sendSmtpPlainEmail(settings.integrations, email, subject, body);
  return result.ok;
}

async function sendPasswordResetEmail(email: string, name: string, resetUrl: string) {
  return sendPasswordLinkEmail(email, name, resetUrl, "reset", RESET_TTL_MINUTES);
}

async function sendPasswordSetupEmail(email: string, name: string, resetUrl: string) {
  return sendPasswordLinkEmail(email, name, resetUrl, "setup", SETUP_TTL_MINUTES);
}

async function ensurePasswordResetSchema() {
  await ensureCoreProductionSchema();
  await getMainPrisma().$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "tokenHash" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "usedAt" TIMESTAMP(3),
      CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
    )
  `).catch((error: unknown) => {
    if (!isMissingSchemaError(error) && !(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2010")) throw error;
  });
}

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function appOrigin(requestUrl: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const url = new URL(requestUrl);
  return url.origin;
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function shouldExposeDevResetUrl(delivered: boolean, exposeResetUrl: boolean) {
  return !delivered && !requireStrictProductionConfig() && (exposeResetUrl || process.env.NODE_ENV !== "production" || process.env.HOUSELINK_EXPOSE_PASSWORD_RESET_LINK === "true");
}
