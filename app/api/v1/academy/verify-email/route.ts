import { ok, problem } from "@/lib/api/response";
import { createPostgresSession } from "@/lib/auth/postgres-auth";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token : null;
    
    if (!token) {
      return problem(400, "TOKEN_REQUIRED", "Verification token is required.");
    }

    const prisma = getMainPrisma();
    
    // Find the verification token
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            emailVerifiedAt: true,
            name: true,
            roles: true,
            phone: true,
            accountStatus: true,
          },
        },
      },
    });

    if (!verificationToken) {
      return problem(404, "TOKEN_NOT_FOUND", "Invalid verification token.");
    }

    // Check if token is expired
    if (verificationToken.expiresAt < new Date()) {
      return problem(400, "TOKEN_EXPIRED", "Verification token has expired. Please request a new one.");
    }

    // Check if already used
    if (verificationToken.usedAt) {
      return problem(400, "TOKEN_ALREADY_USED", "This verification token has already been used.");
    }

    // Check if email is already verified
    if (verificationToken.user.emailVerifiedAt) {
      const session = await createVerifiedAcademySession(verificationToken.user);
      if ("error" in session) return session.error;
      return ok({
        message: "Email is already verified.",
        user: session.user,
        redirectUrl: verificationToken.redirectUrl || "/dashboard/academy",
      });
    }

    // Mark token as used and verify email
    await prisma.$transaction([
      prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerifiedAt: new Date() },
      }),
    ]);

    const session = await createVerifiedAcademySession(verificationToken.user);
    if ("error" in session) return session.error;

    return ok({
      message: "Email verified successfully!",
      user: session.user,
      redirectUrl: verificationToken.redirectUrl || "/dashboard/academy",
    });
  } catch (error) {
    console.error("Failed to verify email", error);
    return problem(500, "SERVER_ERROR", "Failed to verify email.");
  }
}

async function createVerifiedAcademySession(user: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  roles: string[];
  accountStatus: string;
}) {
  if (user.accountStatus !== "ACTIVE") {
    return { error: problem(403, "ACCOUNT_INACTIVE", "Your account is not active. Please contact support.") };
  }

  const sessionId = `session_${randomUUID()}`;
  const maxAgeSeconds = 60 * 60 * 24 * 30;
  await createPostgresSession(user.id, sessionId, maxAgeSeconds);

  const cookieStore = await cookies();
  cookieStore.set("session", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: maxAgeSeconds,
    path: "/",
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      roles: user.roles,
    },
  };
}
