import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { getPostgresUserByEmail, shouldUsePostgresAuth } from "@/lib/auth/postgres-auth";
import { randomBytes } from "crypto";
import { sendEmailVerificationEmail } from "@/lib/academy/academy-email";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
    
    if (!email) {
      return problem(400, "EMAIL_REQUIRED", "Email address is required.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return problem(400, "INVALID_EMAIL", "Enter a valid email address.");
    }

    let user;
    if (shouldUsePostgresAuth()) {
      user = await getPostgresUserByEmail(email);
    } else {
      user = getStore().getUserByEmail(email);
    }

    if (!user) {
      return problem(404, "USER_NOT_FOUND", "No account found with this email address.");
    }

    // Check if email is already verified from database
    const prisma = getMainPrisma();
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { emailVerifiedAt: true, email: true, name: true },
    });

    if (!dbUser) {
      return problem(404, "USER_NOT_FOUND", "User record not found.");
    }

    if (dbUser.emailVerifiedAt) {
      return ok({ verified: true, message: "Email is already verified. You can sign in." });
    }
    
    // Generate verification token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Store verification token
    await prisma.emailVerificationToken.upsert({
      where: { userId: user.id },
      create: { userId: user.id, token, expiresAt, ipAddress, userAgent },
      update: { token, expiresAt, ipAddress, userAgent },
    });

    // Send verification email
    const emailResult = await sendEmailVerificationEmail(dbUser.email, dbUser.name, token);
    
    if (!emailResult.success) {
      console.error("Failed to send verification email:", emailResult.error);
      return problem(500, "EMAIL_SEND_FAILED", "Failed to send verification email. Please try again.");
    }
    
    return ok({
      verified: false,
      message: "Verification email sent successfully.",
      // Only return token in development for testing
      ...(process.env.NODE_ENV === "development" && { 
        verificationToken: token, 
        verificationLink: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/verify-email?token=${token}` 
      }),
    });
  } catch (error) {
    console.error("Failed to send verification email", error);
    return problem(500, "SERVER_ERROR", "Failed to send verification email.");
  }
}
