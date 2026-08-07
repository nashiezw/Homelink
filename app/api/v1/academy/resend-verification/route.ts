import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { randomBytes } from "crypto";

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

    // Generate new verification token
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
    // TODO: Integrate with email service (Resend, SendGrid, etc.)
    
    return ok({
      verified: false,
      message: "Verification email resent.",
      // Only return token in development for testing
      ...(process.env.NODE_ENV === "development" && { verificationToken: token, verificationLink: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/academy/verify-email?token=${token}` }),
    });
  } catch (error) {
    console.error("Failed to resend verification email", error);
    return problem(500, "SERVER_ERROR", "Failed to resend verification email.");
  }
}
