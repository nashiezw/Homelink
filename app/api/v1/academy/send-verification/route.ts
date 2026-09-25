import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { sendEmailVerificationEmail } from "@/lib/academy/academy-email";
import { issueEmailVerificationToken } from "@/lib/auth/email-verification-token";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to verify your email.");

  try {
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

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const redirectUrl = "/dashboard/academy";
    const { token } = await issueEmailVerificationToken({
      userId,
      ipAddress,
      userAgent,
      redirectUrl,
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
