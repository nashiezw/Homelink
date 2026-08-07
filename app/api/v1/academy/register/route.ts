import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { registerPublicLearner } from "@/lib/academy/public-academy-repository";
import { getPostgresPublicUserById, shouldUsePostgresAuth } from "@/lib/auth/postgres-auth";
import { getStore } from "@/lib/store/app-store";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Create or sign in to a learner account before registering.");
  const body = await request.json();
  const courseId = typeof body.courseId === "string" ? body.courseId : "";
  if (!courseId) return problem(400, "COURSE_REQUIRED", "Choose an Academy course.");

  const user = shouldUsePostgresAuth()
    ? await getPostgresPublicUserById(userId)
    : getStore().getUserById(userId);
  if (!user) return problem(401, "UNAUTHORIZED", "Your session is no longer valid.");

  const prisma = getMainPrisma();

  // Check if email verification is required
  const settings = await prisma.trainingSetting.findUnique({ where: { id: "singleton" } });
  const payload = (settings?.payload ?? {}) as Record<string, unknown>;
  const requireEmailVerification = Boolean(payload.requireEmailVerification ?? false);

  // Check if user's email is verified
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerifiedAt: true, email: true },
  });

  if (requireEmailVerification && !userRecord?.emailVerifiedAt) {
    // Generate and send verification token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.emailVerificationToken.upsert({
      where: { userId },
      create: { userId, token, expiresAt },
      update: { token, expiresAt },
    });

    // TODO: Send actual email with verification link
    // For now, return the token in development for testing
    return ok({
      status: "PENDING_EMAIL_VERIFICATION",
      id: "pending-verification",
      message: "Email verification required. A verification link has been sent to your email.",
      ...(process.env.NODE_ENV === "development" && { 
        verificationToken: token, 
        verificationLink: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/academy/verify-email?token=${token}` 
      }),
    });
  }

  const result = await registerPublicLearner({
    learnerId: userId,
    courseId,
    fullName: typeof body.fullName === "string" && body.fullName.trim() ? body.fullName : user.name,
    email: typeof body.email === "string" && body.email.trim() ? body.email : user.email,
    phone: typeof body.phone === "string" ? body.phone : user.phone ?? undefined,
    organisation: typeof body.organisation === "string" ? body.organisation : undefined,
    motivation: typeof body.motivation === "string" ? body.motivation : undefined,
    paymentMethod: typeof body.paymentMethod === "string" ? body.paymentMethod : undefined,
    couponCode: typeof body.couponCode === "string" ? body.couponCode : undefined,
  });
  if (result === "COURSE_NOT_AVAILABLE") {
    return problem(404, "COURSE_NOT_AVAILABLE", "This course is not currently open for public registration.");
  }
  return ok(result);
}
