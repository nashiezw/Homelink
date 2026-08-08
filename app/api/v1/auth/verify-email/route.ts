import { ok, problem } from "@/lib/api/response";
import { getMainPrisma } from "@/lib/db/main-prisma";

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
      return ok({ message: "Email is already verified." });
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

    return ok({ message: "Email verified successfully!" });
  } catch (error) {
    console.error("Failed to verify email", error);
    return problem(500, "SERVER_ERROR", "Failed to verify email.");
  }
}
