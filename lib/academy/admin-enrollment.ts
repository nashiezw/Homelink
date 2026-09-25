import { Prisma, Role, TrainingCourseStatus } from "@prisma/client";
import { registerPublicLearner, reviewPublicLearnerApplication } from "@/lib/academy/public-academy-repository";
import { requestPasswordSetup } from "@/lib/auth/password-reset";
import { createPostgresUser } from "@/lib/auth/postgres-auth";
import { getMainPrisma } from "@/lib/db/main-prisma";

export type AdminEnrollmentActor = { id: string; name: string };

export type AdminEnrollmentRequest = {
  userIds?: string[];
  newLearner?: {
    fullName: string;
    email: string;
    phone?: string;
    organisation?: string;
  };
  courseId: string;
  couponCode?: string;
  accessMode: "GRANT_NOW" | "PENDING_PAYMENT";
  adminNote: string;
  requestUrl: string;
};

export type AdminEnrollmentOutcome = {
  userId?: string;
  name: string;
  email: string;
  status: "ENROLLED" | "PENDING_PAYMENT" | "SKIPPED" | "FAILED";
  message: string;
  createdAccount?: boolean;
  invitationSent?: boolean;
  setupUrl?: string;
  applicationId?: string;
};

export async function getAcademyEnrollmentOptions() {
  const prisma = getMainPrisma();
  const [courses, coupons] = await Promise.all([
    prisma.trainingCourse.findMany({
      where: { status: TrainingCourseStatus.PUBLISHED },
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        title: true,
        publicPrice: true,
        price: true,
        currency: true,
        registrationOpen: true,
        accessDurationDays: true,
      },
    }),
    prisma.academyCoupon.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        description: true,
        discountType: true,
        discountValue: true,
        maxUses: true,
        usedCount: true,
        minPurchaseAmount: true,
        validFrom: true,
        validUntil: true,
        applicableCourses: true,
        applicableRoles: true,
      },
    }),
  ]);

  return {
    courses: courses.map((course) => ({
      ...course,
      publicPrice: Number(course.publicPrice || course.price),
      accessDurationDays: course.accessDurationDays,
    })),
    coupons: coupons.map((coupon) => ({
      ...coupon,
      discountValue: Number(coupon.discountValue),
      minPurchaseAmount: coupon.minPurchaseAmount === null ? null : Number(coupon.minPurchaseAmount),
      validFrom: coupon.validFrom.toISOString(),
      validUntil: coupon.validUntil?.toISOString() ?? null,
      remainingUses: coupon.maxUses === null ? null : Math.max(0, coupon.maxUses - coupon.usedCount),
    })),
  };
}

export async function adminEnrollLearners(input: AdminEnrollmentRequest, actor: AdminEnrollmentActor) {
  const prisma = getMainPrisma();
  const courseId = input.courseId.trim();
  const adminNote = input.adminNote.trim();
  if (!courseId) throw new Error("Select an Academy course.");
  if (!adminNote) throw new Error("An admin enrollment note is required.");

  const course = await prisma.trainingCourse.findFirst({
    where: { id: courseId, status: TrainingCourseStatus.PUBLISHED },
    select: { id: true, title: true, publicPrice: true, price: true, currency: true },
  });
  if (!course) throw new Error("The selected course is not published or no longer exists.");

  const requestedIds = [...new Set((input.userIds ?? []).filter((id) => typeof id === "string" && id.trim()).map((id) => id.trim()))];
  if (!requestedIds.length && !input.newLearner) throw new Error("Select a user or enter a new learner.");
  if (requestedIds.length && input.newLearner) throw new Error("Choose existing users or create one new learner, not both.");

  let createdAccount = false;
  let learners = requestedIds.length
    ? await prisma.user.findMany({ where: { id: { in: requestedIds }, accountStatus: { not: "DELETED" } } })
    : [];

  if (requestedIds.length) {
    const foundIds = new Set(learners.map((learner) => learner.id));
    const missing = requestedIds.filter((id) => !foundIds.has(id));
    if (missing.length) throw new Error(`${missing.length} selected user(s) no longer exist or were deleted.`);
  } else if (input.newLearner) {
    const email = input.newLearner.email.trim().toLowerCase();
    const fullName = input.newLearner.fullName.trim();
    const phone = input.newLearner.phone?.trim() || undefined;
    if (!fullName) throw new Error("Enter the learner's full name.");
    if (!isEmail(email)) throw new Error("Enter a valid learner email address.");
    await validateCoupon({
      code: input.couponCode,
      courseId,
      basePrice: Number(course.publicPrice || course.price),
      roles: [Role.SEEKER, Role.PUBLIC_LEARNER],
    });
    if (phone) {
      const phoneOwner = await prisma.user.findFirst({ where: { phone, email: { not: email } }, select: { id: true } });
      if (phoneOwner) throw new Error("That phone number already belongs to another user.");
    }
    let learner = await prisma.user.findUnique({ where: { email } });
    if (!learner) {
      learner = await createPostgresUser({ email, name: fullName, phone, passwordHash: null });
      createdAccount = true;
    }
    if (learner.accountStatus !== "ACTIVE") throw new Error("This email belongs to an account that must be activated before enrollment.");
    learners = [learner];
  }

  const outcomes: AdminEnrollmentOutcome[] = [];
  for (const learner of learners) {
    if (learner.accountStatus !== "ACTIVE") {
      await prisma.trainingAuditLog.create({
        data: {
          actorId: actor.id,
          action: "academy.admin_assisted_enrollment_failed",
          target: learner.id,
          metadata: { learnerId: learner.id, courseId, reason: "inactive_account", accountStatus: learner.accountStatus } as Prisma.InputJsonObject,
        },
      });
      outcomes.push({
        userId: learner.id,
        name: learner.name,
        email: learner.email,
        status: "FAILED",
        message: `Account is ${learner.accountStatus.toLowerCase()}; activate it before enrollment.`,
      });
      continue;
    }
    const existing = await prisma.academyLearnerApplication.findUnique({
      where: { learnerId_courseId: { learnerId: learner.id, courseId } },
      select: { id: true, status: true },
    });
    if (existing) {
      await prisma.trainingAuditLog.create({
        data: {
          actorId: actor.id,
          action: "academy.admin_assisted_enrollment_skipped",
          target: existing.id,
          metadata: { learnerId: learner.id, courseId, reason: "duplicate", existingStatus: existing.status } as Prisma.InputJsonObject,
        },
      });
      outcomes.push({
        userId: learner.id,
        name: learner.name,
        email: learner.email,
        status: "SKIPPED",
        message: `Already registered (${existing.status.replace(/_/g, " ").toLowerCase()}).`,
        applicationId: existing.id,
      });
      continue;
    }

    try {
      await validateCoupon({
        code: input.couponCode,
        courseId,
        basePrice: Number(course.publicPrice || course.price),
        roles: learner.roles,
      });
      const registration = await registerPublicLearner({
        learnerId: learner.id,
        courseId,
        fullName: learner.name,
        email: learner.email,
        phone: learner.phone ?? undefined,
        organisation: input.newLearner?.organisation?.trim() || undefined,
        paymentMethod: "admin_assisted",
        couponCode: input.couponCode?.trim() || undefined,
        adminCreated: true,
        allowClosedRegistration: true,
        requireValidCoupon: true,
      });
      if (registration === "COURSE_NOT_AVAILABLE") throw new Error("The selected course is no longer available.");
      if (registration === "INVALID_COUPON") throw new Error("Coupon became unavailable before enrollment was completed.");

      const applicationId = registration.id;
      const grantAccess = input.accessMode === "GRANT_NOW" || Number(registration.amount) <= 0;
      if (grantAccess) {
        await reviewPublicLearnerApplication({
          applicationId,
          actorId: actor.id,
          status: "APPROVED",
          adminNote,
        });
      } else {
        await prisma.$transaction([
          prisma.academyLearnerApplication.update({ where: { id: applicationId }, data: { adminNote } }),
          prisma.trainingNotification.create({
            data: {
              userId: learner.id,
              eventType: "ACADEMY_ADMIN_ENROLLMENT_PENDING_PAYMENT",
              channel: "IN_APP",
              subject: "Academy enrollment awaiting payment",
              body: `An administrator registered you for ${course.title}. Complete the remaining ${course.currency} ${Number(registration.amount).toFixed(2)} payment to activate access.`,
            },
          }),
        ]);
      }

      await prisma.trainingAuditLog.create({
        data: {
          actorId: actor.id,
          action: "academy.admin_assisted_enrollment",
          target: applicationId,
          metadata: {
            learnerId: learner.id,
            courseId,
            courseTitle: course.title,
            couponCode: input.couponCode?.trim().toUpperCase() || null,
            accessMode: input.accessMode,
            amount: Number(registration.amount),
            createdAccount,
            adminNote,
          } as Prisma.InputJsonObject,
        },
      });

      let invitationSent: boolean | undefined;
      let setupUrl: string | undefined;
      if (!learner.passwordHash) {
        const invitation = await requestPasswordSetup(learner.email, input.requestUrl, false);
        invitationSent = invitation.delivered;
        setupUrl = invitation.resetUrl;
      }
      outcomes.push({
        userId: learner.id,
        name: learner.name,
        email: learner.email,
        status: grantAccess ? "ENROLLED" : "PENDING_PAYMENT",
        message: grantAccess ? "Course access granted." : "Registration created and awaiting payment.",
        createdAccount,
        invitationSent,
        setupUrl,
        applicationId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Enrollment failed.";
      await prisma.trainingAuditLog.create({
        data: {
          actorId: actor.id,
          action: "academy.admin_assisted_enrollment_failed",
          target: learner.id,
          metadata: { learnerId: learner.id, courseId, couponCode: input.couponCode?.trim().toUpperCase() || null, message } as Prisma.InputJsonObject,
        },
      }).catch(() => undefined);
      outcomes.push({
        userId: learner.id,
        name: learner.name,
        email: learner.email,
        status: "FAILED",
        message,
        createdAccount,
      });
    }
  }

  return {
    course: { id: course.id, title: course.title },
    outcomes,
    summary: outcomes.reduce(
      (summary, outcome) => {
        summary[outcome.status] += 1;
        return summary;
      },
      { ENROLLED: 0, PENDING_PAYMENT: 0, SKIPPED: 0, FAILED: 0 },
    ),
  };
}

async function validateCoupon(input: { code?: string; courseId: string; basePrice: number; roles: Role[] }) {
  if (!input.code?.trim()) return;
  const prisma = getMainPrisma();
  const code = input.code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const coupon = await prisma.academyCoupon.findUnique({ where: { code } });
  if (!coupon || !coupon.active) throw new Error("Coupon code is invalid or inactive.");
  const now = new Date();
  if (coupon.validFrom > now || (coupon.validUntil && coupon.validUntil < now)) throw new Error("Coupon is outside its valid date range.");
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) throw new Error("Coupon usage limit has been reached.");
  if (coupon.minPurchaseAmount !== null && input.basePrice < Number(coupon.minPurchaseAmount)) throw new Error("Course price does not meet the coupon minimum.");
  if (coupon.applicableCourses.length && !coupon.applicableCourses.includes(input.courseId)) throw new Error("Coupon does not apply to this course.");
  if (coupon.applicableRoles.length && !coupon.applicableRoles.some((role) => input.roles.includes(role as Role) || role === Role.PUBLIC_LEARNER)) {
    throw new Error("Coupon does not apply to this learner role.");
  }
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
