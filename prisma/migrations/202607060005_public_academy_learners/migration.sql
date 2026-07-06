ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ACADEMY_ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'TRAINER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PUBLIC_LEARNER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MODERATOR';

CREATE TYPE "AcademyRegistrationStatus" AS ENUM (
  'PENDING_PAYMENT',
  'PAYMENT_UPLOADED',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
  'REFUNDED'
);

ALTER TABLE "training_courses"
  ADD COLUMN IF NOT EXISTS "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS "registrationOpen" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "accessDurationDays" INTEGER NOT NULL DEFAULT 365;

CREATE TABLE "academy_learner_applications" (
  "id" TEXT NOT NULL,
  "learnerId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "paymentId" TEXT,
  "status" "AcademyRegistrationStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "learnerType" TEXT NOT NULL DEFAULT 'PUBLIC_LEARNER',
  "fullName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "organisation" TEXT,
  "motivation" TEXT,
  "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "proofUrl" TEXT,
  "adminNote" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "accessStartsAt" TIMESTAMP(3),
  "accessEndsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "academy_learner_applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "academy_learner_applications_learnerId_courseId_key"
  ON "academy_learner_applications"("learnerId", "courseId");
CREATE INDEX "academy_learner_applications_status_idx"
  ON "academy_learner_applications"("status");
CREATE INDEX "academy_learner_applications_courseId_idx"
  ON "academy_learner_applications"("courseId");
CREATE INDEX "academy_learner_applications_paymentId_idx"
  ON "academy_learner_applications"("paymentId");

ALTER TABLE "academy_learner_applications"
  ADD CONSTRAINT "academy_learner_applications_learnerId_fkey"
  FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "academy_learner_applications"
  ADD CONSTRAINT "academy_learner_applications_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "training_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "academy_learner_applications"
  ADD CONSTRAINT "academy_learner_applications_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
