import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { sendEmailVerificationEmail } from "@/lib/academy/academy-email";
import { sendWelcomeEmail } from "@/lib/academy/welcome-email";
import { getMainPrisma } from "@/lib/db/main-prisma";

export const dynamic = "force-dynamic";

const RESENDABLE_EMAIL_TYPES = new Set(["email_verification", "welcome_email"]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAsync(request, "platform:write");
  if (auth.error || !auth.user) return auth.error ?? problem(401, "UNAUTHORIZED", "Admin required.");

  const { id } = await context.params;
  const prisma = getMainPrisma();
  const audit = await prisma.auditEvent.findUnique({ where: { id } });

  if (!audit) return problem(404, "AUDIT_NOT_FOUND", "Email failure audit entry was not found.");
  if (audit.action !== "EMAIL_SEND_FAILED") {
    return problem(400, "NOT_EMAIL_FAILURE", "Only failed email audit entries can be resent.");
  }

  const metadata = readObject(audit.metadata);
  const emailType = stringValue(metadata.emailType, "email");
  if (!RESENDABLE_EMAIL_TYPES.has(emailType)) {
    return problem(400, "EMAIL_TYPE_NOT_RESENDABLE", "This email type needs a dedicated workflow before it can be resent safely.");
  }

  const email = audit.target.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return problem(400, "INVALID_TARGET_EMAIL", "The failed email target is not a valid recipient address.");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, emailVerifiedAt: true },
  });
  if (!user) return problem(404, "USER_NOT_FOUND", "No user account was found for this email address.");

  let result: { success: boolean; error?: string | undefined };
  let responseMessage = "Email resent.";

  if (emailType === "email_verification") {
    if (user.emailVerifiedAt) {
      return ok({ resent: false, verified: true, message: "User email is already verified." });
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.emailVerificationToken.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        token,
        expiresAt,
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent") || "admin-resend",
      },
      update: {
        token,
        expiresAt,
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent") || "admin-resend",
        usedAt: null,
      },
    });
    const verificationPath = normalizeVerificationPath(stringValue(metadata.verificationPath, "/auth/verify-email"));
    result = await sendEmailVerificationEmail(user.email, user.name, token, { verificationPath });
    responseMessage = "Verification email resent with a fresh 24-hour token.";
  } else {
    result = await sendWelcomeEmail(user.email, user.name);
    responseMessage = "Welcome email resent.";
  }

  await prisma.auditEvent.create({
    data: {
      actorId: auth.user.id,
      action: result.success ? "EMAIL_RESEND_SUCCEEDED" : "EMAIL_RESEND_FAILED",
      target: audit.target,
      metadata: {
        sourceAuditId: audit.id,
        emailType,
        verificationPath: typeof metadata.verificationPath === "string" ? metadata.verificationPath : null,
        error: result.error ?? null,
        timestamp: new Date().toISOString(),
      } satisfies Prisma.InputJsonObject,
    },
  });

  if (!result.success) {
    return problem(502, "EMAIL_RESEND_FAILED", result.error || "Email could not be resent.");
  }

  return ok({ resent: true, verified: false, message: responseMessage });
}

function getClientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "admin";
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function normalizeVerificationPath(value: string) {
  return value === "/academy/verify-email" ? value : "/auth/verify-email";
}
