import { randomBytes } from "crypto";
import { getMainPrisma } from "@/lib/db/main-prisma";

const VERIFICATION_TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;

type VerificationTokenOptions = {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  redirectUrl?: string | null;
};

/**
 * Return the user's current usable token, creating a new one only when needed.
 * Reusing a live token prevents a resend or duplicate registration request from
 * invalidating a verification email that is already in the learner's inbox.
 */
export async function issueEmailVerificationToken(options: VerificationTokenOptions) {
  const prisma = getMainPrisma();
  const now = new Date();
  const existing = await prisma.emailVerificationToken.findUnique({
    where: { userId: options.userId },
  });

  if (isUsable(existing, now)) {
    return {
      token: existing.token,
      expiresAt: existing.expiresAt,
      reused: true,
    };
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_LIFETIME_MS);
  const tokenRecord = {
    token,
    expiresAt,
    ipAddress: options.ipAddress ?? "unknown",
    userAgent: options.userAgent ?? "unknown",
    redirectUrl: options.redirectUrl ?? null,
    usedAt: null,
  };

  if (!existing) {
    try {
      await prisma.emailVerificationToken.create({
        data: { userId: options.userId, ...tokenRecord },
      });
      return { token, expiresAt, reused: false };
    } catch (error) {
      const concurrentToken = await prisma.emailVerificationToken.findUnique({
        where: { userId: options.userId },
      });
      if (isUsable(concurrentToken, now)) {
        return {
          token: concurrentToken.token,
          expiresAt: concurrentToken.expiresAt,
          reused: true,
        };
      }
      throw error;
    }
  }

  const updated = await prisma.emailVerificationToken.updateMany({
    where: {
      id: existing.id,
      token: existing.token,
      usedAt: existing.usedAt,
      expiresAt: existing.expiresAt,
    },
    data: tokenRecord,
  });

  if (updated.count === 0) {
    const concurrentToken = await prisma.emailVerificationToken.findUnique({
      where: { userId: options.userId },
    });
    if (isUsable(concurrentToken, now)) {
      return {
        token: concurrentToken.token,
        expiresAt: concurrentToken.expiresAt,
        reused: true,
      };
    }
    throw new Error("Could not issue an email verification token.");
  }

  return { token, expiresAt, reused: false };
}

export function normalizeEmailVerificationToken(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isUsable(
  token: { usedAt: Date | null; expiresAt: Date } | null,
  now: Date,
): token is { token: string; usedAt: null; expiresAt: Date } {
  return Boolean(token && !token.usedAt && token.expiresAt > now);
}
