import { readFileSync } from "node:fs";

const files = {
  schema: "prisma/schema.prisma",
  migration: "prisma/migrations/202609050001_academy_released_status/migration.sql",
  couponHelper: "lib/academy/coupon-usage.ts",
  releaseService: "lib/academy/activation-deadline.ts",
  repository: "lib/academy/postgres-academy-repository.ts",
  publicRepository: "lib/academy/public-academy-repository.ts",
  adminUi: "components/admin/agent-academy-hub.tsx",
};

const contents = Object.fromEntries(Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")]));

function assertIncludes(key, needle, message) {
  if (!contents[key].includes(needle)) {
    throw new Error(`${message}\nMissing in ${files[key]}: ${needle}`);
  }
}

assertIncludes("schema", "RELEASED", "Academy applications must support a released state.");
assertIncludes("migration", "ADD VALUE IF NOT EXISTS 'RELEASED'", "Migration must add the released enum value safely.");
assertIncludes("couponHelper", "releaseAcademyCouponUsageByPayment", "Coupon release helper is missing.");
assertIncludes("couponHelper", "academyCouponUsage.count", "Coupon usedCount must be reconciled from real usage rows.");
assertIncludes("releaseService", "AcademyRegistrationStatus.RELEASED", "Release service must mark learner applications as released.");
assertIncludes("releaseService", "releaseAcademyCouponUsageByPayment", "Release service must free coupon usage.");
assertIncludes("releaseService", "This learner has already opened Lesson 1", "Release service must protect learners who started.");
assertIncludes("repository", "release_first_lesson_place", "Admin API must expose per-learner release.");
assertIncludes("publicRepository", "\"RELEASED\"", "Manual review flow must understand released status.");
assertIncludes("publicRepository", "releaseAcademyCouponUsageByPayment", "Manual review flow must reconcile coupons.");
assertIncludes("adminUi", "Release place", "Activation queue must expose per-learner release.");
assertIncludes("adminUi", "releaseableExpiredCount", "Activation metrics must include overdue releaseable places.");

console.log("Academy release-place checks passed.");
