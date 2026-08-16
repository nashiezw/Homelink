import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { randomBytes } from "crypto";
import { sendEmailVerificationEmail } from "@/lib/academy/academy-email";

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
      select: { email: true, emailVerifiedAt: true, name: true },
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
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Store verification token
    const redirectUrl = "/dashboard/academy";

    await prisma.emailVerificationToken.upsert({
      where: { userId },
      create: { userId, token, expiresAt, ipAddress, userAgent, redirectUrl },
      update: { token, expiresAt, ipAddress, userAgent, redirectUrl, usedAt: null },
    });

    // Send verification email
    const emailResult = await sendEmailVerificationEmail(user.email, user.name, token, {
      verificationPath: "/academy/verify-email",
      redirectUrl,
    });
    
    if (!emailResult.success) {
      console.error("Failed to send verification email:", emailResult.error);
      return problem(502, "EMAIL_SEND_FAILED", emailResult.error || "Failed to send verification email. Please check Platform Settings SMTP configuration.");
    }
    
    return ok({
      verified: false,
      message: "Verification email sent successfully.",
      // Only return token in development for testing
      ...(process.env.NODE_ENV === "development" && { 
        verificationToken: token, 
        verificationLink: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.houselink.co.zw"}/academy/verify-email?token=${token}&redirect=${encodeURIComponent(redirectUrl)}` 
      }),
    });
  } catch (error) {
    console.error("Failed to send verification email", error);
    return problem(500, "SERVER_ERROR", "Failed to send verification email.");
  }
}
