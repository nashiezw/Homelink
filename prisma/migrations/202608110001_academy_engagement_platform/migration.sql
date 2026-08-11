-- Academy engagement records are intentionally separate from enrolment,
-- progress, assessment, and certificate records.

CREATE TABLE IF NOT EXISTS "academy_engagement_settings" (
  "id" TEXT NOT NULL DEFAULT 'singleton',
  "payload" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "academy_engagement_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "academy_engagement_profiles" (
  "id" TEXT NOT NULL,
  "learnerId" TEXT NOT NULL,
  "courseId" TEXT,
  "communityOptIn" BOOLEAN NOT NULL DEFAULT false,
  "ambassadorOptIn" BOOLEAN NOT NULL DEFAULT false,
  "directoryOptIn" BOOLEAN NOT NULL DEFAULT false,
  "spotlightConsent" BOOLEAN NOT NULL DEFAULT false,
  "publicVisibility" TEXT NOT NULL DEFAULT 'PRIVATE',
  "profileHeadline" TEXT,
  "profileBio" TEXT,
  "referralCode" TEXT,
  "consentedAt" TIMESTAMP(3),
  "consentWithdrawnAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "academy_engagement_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "academy_referrals" (
  "id" TEXT NOT NULL,
  "referrerId" TEXT NOT NULL,
  "courseId" TEXT,
  "referralCode" TEXT NOT NULL,
  "referredName" TEXT,
  "referredEmail" TEXT,
  "status" TEXT NOT NULL DEFAULT 'INVITED',
  "rewardLabel" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "academy_referrals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "academy_testimonials" (
  "id" TEXT NOT NULL,
  "learnerId" TEXT NOT NULL,
  "courseId" TEXT,
  "rating" INTEGER,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "publicConsent" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "adminNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "academy_testimonials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "academy_challenges" (
  "id" TEXT NOT NULL,
  "courseId" TEXT,
  "title" TEXT NOT NULL,
  "instructions" TEXT NOT NULL,
  "rewardLabel" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "academy_challenges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "academy_challenge_submissions" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "learnerId" TEXT NOT NULL,
  "evidence" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
  "adminNote" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "academy_challenge_submissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "academy_office_hours" (
  "id" TEXT NOT NULL,
  "courseId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "link" TEXT,
  "capacity" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "academy_office_hours_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "academy_office_hour_rsvps" (
  "id" TEXT NOT NULL,
  "officeHourId" TEXT NOT NULL,
  "learnerId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'GOING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "academy_office_hour_rsvps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "academy_engagement_profiles_learnerId_courseId_key" ON "academy_engagement_profiles"("learnerId", "courseId");
CREATE UNIQUE INDEX IF NOT EXISTS "academy_engagement_profiles_referralCode_key" ON "academy_engagement_profiles"("referralCode");
CREATE INDEX IF NOT EXISTS "academy_engagement_profiles_learnerId_idx" ON "academy_engagement_profiles"("learnerId");
CREATE INDEX IF NOT EXISTS "academy_engagement_profiles_courseId_idx" ON "academy_engagement_profiles"("courseId");
CREATE INDEX IF NOT EXISTS "academy_referrals_referrerId_idx" ON "academy_referrals"("referrerId");
CREATE INDEX IF NOT EXISTS "academy_referrals_courseId_idx" ON "academy_referrals"("courseId");
CREATE INDEX IF NOT EXISTS "academy_referrals_referralCode_idx" ON "academy_referrals"("referralCode");
CREATE INDEX IF NOT EXISTS "academy_testimonials_learnerId_idx" ON "academy_testimonials"("learnerId");
CREATE INDEX IF NOT EXISTS "academy_testimonials_courseId_idx" ON "academy_testimonials"("courseId");
CREATE INDEX IF NOT EXISTS "academy_testimonials_status_idx" ON "academy_testimonials"("status");
CREATE INDEX IF NOT EXISTS "academy_challenges_courseId_idx" ON "academy_challenges"("courseId");
CREATE INDEX IF NOT EXISTS "academy_challenges_status_idx" ON "academy_challenges"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "academy_challenge_submissions_challengeId_learnerId_key" ON "academy_challenge_submissions"("challengeId", "learnerId");
CREATE INDEX IF NOT EXISTS "academy_challenge_submissions_challengeId_idx" ON "academy_challenge_submissions"("challengeId");
CREATE INDEX IF NOT EXISTS "academy_challenge_submissions_learnerId_idx" ON "academy_challenge_submissions"("learnerId");
CREATE INDEX IF NOT EXISTS "academy_office_hours_courseId_idx" ON "academy_office_hours"("courseId");
CREATE INDEX IF NOT EXISTS "academy_office_hours_startsAt_idx" ON "academy_office_hours"("startsAt");
CREATE UNIQUE INDEX IF NOT EXISTS "academy_office_hour_rsvps_officeHourId_learnerId_key" ON "academy_office_hour_rsvps"("officeHourId", "learnerId");
CREATE INDEX IF NOT EXISTS "academy_office_hour_rsvps_learnerId_idx" ON "academy_office_hour_rsvps"("learnerId");
