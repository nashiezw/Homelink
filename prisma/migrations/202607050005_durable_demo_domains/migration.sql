CREATE TABLE IF NOT EXISTS "ResidenceRecordRow" (
  "id" TEXT NOT NULL,
  "tenancyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "counterpartyId" TEXT NOT NULL,
  "listingId" TEXT,
  "status" TEXT NOT NULL,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResidenceRecordRow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TenancyReferenceRow" (
  "id" TEXT NOT NULL,
  "tenancyId" TEXT NOT NULL,
  "targetUserId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenancyReferenceRow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TenancyDisputeRow" (
  "id" TEXT NOT NULL,
  "tenancyId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenancyDisputeRow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PropertyManagementRequestRow" (
  "id" TEXT NOT NULL,
  "requestNumber" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "consultantId" TEXT,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PropertyManagementRequestRow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HolidayBookingRecord" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "guestUserId" TEXT NOT NULL,
  "ownerId" TEXT,
  "agentId" TEXT,
  "status" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HolidayBookingRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AgentApplicationRecord" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentApplicationRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AgentTrainingProgressRecord" (
  "id" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "moduleId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentTrainingProgressRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PropertyManagementRequestRow_requestNumber_key" ON "PropertyManagementRequestRow"("requestNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "AgentApplicationRecord_userId_key" ON "AgentApplicationRecord"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "AgentTrainingProgressRecord_agentId_moduleId_key" ON "AgentTrainingProgressRecord"("agentId", "moduleId");

CREATE INDEX IF NOT EXISTS "ResidenceRecordRow_tenancyId_idx" ON "ResidenceRecordRow"("tenancyId");
CREATE INDEX IF NOT EXISTS "ResidenceRecordRow_userId_idx" ON "ResidenceRecordRow"("userId");
CREATE INDEX IF NOT EXISTS "ResidenceRecordRow_counterpartyId_idx" ON "ResidenceRecordRow"("counterpartyId");
CREATE INDEX IF NOT EXISTS "ResidenceRecordRow_listingId_idx" ON "ResidenceRecordRow"("listingId");
CREATE INDEX IF NOT EXISTS "ResidenceRecordRow_status_idx" ON "ResidenceRecordRow"("status");
CREATE INDEX IF NOT EXISTS "ResidenceRecordRow_verified_idx" ON "ResidenceRecordRow"("verified");
CREATE INDEX IF NOT EXISTS "TenancyReferenceRow_tenancyId_idx" ON "TenancyReferenceRow"("tenancyId");
CREATE INDEX IF NOT EXISTS "TenancyReferenceRow_targetUserId_idx" ON "TenancyReferenceRow"("targetUserId");
CREATE INDEX IF NOT EXISTS "TenancyDisputeRow_tenancyId_idx" ON "TenancyDisputeRow"("tenancyId");
CREATE INDEX IF NOT EXISTS "TenancyDisputeRow_status_idx" ON "TenancyDisputeRow"("status");
CREATE INDEX IF NOT EXISTS "PropertyManagementRequestRow_ownerId_idx" ON "PropertyManagementRequestRow"("ownerId");
CREATE INDEX IF NOT EXISTS "PropertyManagementRequestRow_status_idx" ON "PropertyManagementRequestRow"("status");
CREATE INDEX IF NOT EXISTS "PropertyManagementRequestRow_consultantId_idx" ON "PropertyManagementRequestRow"("consultantId");
CREATE INDEX IF NOT EXISTS "HolidayBookingRecord_listingId_idx" ON "HolidayBookingRecord"("listingId");
CREATE INDEX IF NOT EXISTS "HolidayBookingRecord_guestUserId_idx" ON "HolidayBookingRecord"("guestUserId");
CREATE INDEX IF NOT EXISTS "HolidayBookingRecord_ownerId_idx" ON "HolidayBookingRecord"("ownerId");
CREATE INDEX IF NOT EXISTS "HolidayBookingRecord_agentId_idx" ON "HolidayBookingRecord"("agentId");
CREATE INDEX IF NOT EXISTS "HolidayBookingRecord_status_idx" ON "HolidayBookingRecord"("status");
CREATE INDEX IF NOT EXISTS "AgentApplicationRecord_status_idx" ON "AgentApplicationRecord"("status");
CREATE INDEX IF NOT EXISTS "AgentTrainingProgressRecord_agentId_idx" ON "AgentTrainingProgressRecord"("agentId");
CREATE INDEX IF NOT EXISTS "AgentTrainingProgressRecord_status_idx" ON "AgentTrainingProgressRecord"("status");
