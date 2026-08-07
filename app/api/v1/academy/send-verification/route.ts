import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to verify your email.");

  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : null;
    
    if (!email) {
      return problem(400, "EMAIL_REQUIRED", "Email address is required.");
    }

    const prisma = getMainPrisma();
    
    // Check if email is already verified
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, emailVerifiedAt: true },
    });

    if (!user) {
      return problem(404, "USER_NOT_FOUND", "User not found.");
    }

    if (user.emailVerifiedAt) {
      return ok({ verified: true, message: "Email is already verified." });
    }

    // Generate verification token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store verification token
    await prisma.emailVerificationToken.upsert({
      where: { userId },
      create: {
        userId,
        token,
        expiresAt,
      },
      update: {
        token,
        expiresAt,
      },
    });

    // In a real implementation, you would send an email here
    // For now, we'll return the token for testing purposes
    // TODO: Integrate with email service (Resend, SendGrid, etc.)
    
    return ok({
      verified: false,
      message: "Verification email sent.",
      // Only return token in development for testing
      ...(process.env.NODE_ENV === "development" && { verificationToken: token, verificationLink: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/academy/verify-email?token=${token}` }),
    });
  } catch (error) {
    console.error("Failed to send verification email", error);
    return problem(500, "SERVER_ERROR", "Failed to send verification email.");
  }
}
