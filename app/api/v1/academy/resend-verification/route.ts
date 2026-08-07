import { randomBytes } from "crypto";
import { ok, problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { sendEmailVerificationEmail } from "@/lib/academy/academy-email";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to resend verification email.");

  try {
    const body = await request.json();
    const registrationId = typeof body.registrationId === "string" ? body.registrationId : null;
    
    if (!registrationId) {
      return problem(400, "REGISTRATION_ID_REQUIRED", "Registration ID is required.");
    }

    const prisma = getMainPrisma();
    
    // Verify the registration belongs to the user
    const registration = await prisma.academyLearnerApplication.findFirst({
      where: {
        id: registrationId,
        learnerId: userId,
      },
      include: {
        learner: {
          select: {
            email: true,
            emailVerifiedAt: true,
            name: true,
          },
        },
      },
    });

    if (!registration) {
      return problem(404, "REGISTRATION_NOT_FOUND", "Registration not found.");
    }

    if (registration.learner.emailVerifiedAt) {
      return ok({ verified: true, message: "Email is already verified." });
    }

    // Rate limiting: Check if token was updated in the last 5 minutes
    const existingToken = await prisma.emailVerificationToken.findUnique({ where: { userId } });
    if (existingToken) {
      const timeSinceLastUpdate = Date.now() - existingToken.createdAt.getTime();
      const fiveMinutes = 5 * 60 * 1000;
      if (timeSinceLastUpdate < fiveMinutes) {
        const remainingSeconds = Math.ceil((fiveMinutes - timeSinceLastUpdate) / 1000);
        return problem(429, "RATE_LIMIT_EXCEEDED", `Please wait ${remainingSeconds} seconds before requesting another verification email.`);
      }
    }

    // Generate new verification token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Store verification token
    await prisma.emailVerificationToken.upsert({
      where: { userId },
      create: {
        userId,
        token,
        expiresAt,
        ipAddress,
        userAgent,
      },
      update: {
        token,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    // Send verification email
    const emailResult = await sendEmailVerificationEmail(registration.learner.email, registration.learner.name || "Learner", token);
    
    return ok({
      verified: false,
      message: "Verification email resent.",
      emailSent: emailResult.success,
      // Only return token in development for testing
      ...(process.env.NODE_ENV === "development" && { verificationToken: token, verificationLink: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/academy/verify-email?token=${token}` }),
    });
  } catch (error) {
    console.error("Failed to resend verification email", error);
    return problem(500, "SERVER_ERROR", "Failed to resend verification email.");
  }
}
