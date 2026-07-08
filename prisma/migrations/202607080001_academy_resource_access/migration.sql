-- CreateEnum
CREATE TYPE "AcademyResourceKind" AS ENUM ('COURSE_TOOLKIT', 'TRAINING_MANUAL');

-- AlterTable
ALTER TABLE "training_courses"
ADD COLUMN "toolkitPublicPrice" DECIMAL(12,2) NOT NULL DEFAULT 15,
ADD COLUMN "toolkitAgentPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "toolkitSalesEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "academy_resource_access" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "resourceKind" "AcademyResourceKind" NOT NULL,
    "resourceKey" TEXT NOT NULL,
    "courseId" TEXT,
    "status" "AcademyRegistrationStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paymentId" TEXT,
    "learnerType" TEXT NOT NULL DEFAULT 'PUBLIC_LEARNER',
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
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

    CONSTRAINT "academy_resource_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "academy_resource_access_learnerId_resourceKey_key" ON "academy_resource_access"("learnerId", "resourceKey");

-- CreateIndex
CREATE INDEX "academy_resource_access_status_idx" ON "academy_resource_access"("status");

-- CreateIndex
CREATE INDEX "academy_resource_access_courseId_idx" ON "academy_resource_access"("courseId");

-- CreateIndex
CREATE INDEX "academy_resource_access_paymentId_idx" ON "academy_resource_access"("paymentId");

-- AddForeignKey
ALTER TABLE "academy_resource_access" ADD CONSTRAINT "academy_resource_access_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_resource_access" ADD CONSTRAINT "academy_resource_access_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "training_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_resource_access" ADD CONSTRAINT "academy_resource_access_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Default toolkit prices per programme level
UPDATE "training_courses" SET "toolkitPublicPrice" = 10 WHERE "id" = 'academy-course-beginner';
UPDATE "training_courses" SET "toolkitPublicPrice" = 20 WHERE "id" = 'academy-course-intermediate';
UPDATE "training_courses" SET "toolkitPublicPrice" = 25 WHERE "id" = 'academy-course-advanced-professional';
