CREATE TABLE IF NOT EXISTS "VirtualTourEvent" (
  "id" TEXT NOT NULL,
  "tourId" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "sceneId" TEXT,
  "eventType" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VirtualTourEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ViewingAppointment" (
  "id" TEXT NOT NULL,
  "referenceNumber" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "enquiryId" TEXT,
  "seekerId" TEXT,
  "seekerName" TEXT NOT NULL,
  "seekerEmail" TEXT,
  "seekerPhone" TEXT,
  "agentId" TEXT,
  "agentName" TEXT,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "location" TEXT NOT NULL,
  "notes" TEXT,
  "reminderAt" TIMESTAMP(3),
  "confirmedAt" TIMESTAMP(3),
  "rescheduledAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "auditTrail" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ViewingAppointment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SignedAgreement" (
  "id" TEXT NOT NULL,
  "subjectType" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "listingId" TEXT,
  "title" TEXT NOT NULL,
  "signerUserId" TEXT,
  "signerName" TEXT NOT NULL,
  "signerEmail" TEXT,
  "signerRole" TEXT NOT NULL,
  "signatureText" TEXT NOT NULL,
  "agreementText" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "pdfBase64" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "metadata" JSONB,
  "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SignedAgreement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MarketInsightSnapshot" (
  "id" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "suburb" TEXT NOT NULL,
  "propertyType" TEXT NOT NULL,
  "intent" TEXT NOT NULL DEFAULT 'rent',
  "listingId" TEXT,
  "sampleSize" INTEGER NOT NULL DEFAULT 0,
  "medianPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "averagePrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "recommendedPriceMin" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "recommendedPriceMax" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "demandScore" INTEGER NOT NULL DEFAULT 0,
  "vacancyRisk" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "comparableListingIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketInsightSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ViewingAppointment_referenceNumber_key" ON "ViewingAppointment"("referenceNumber");
CREATE INDEX IF NOT EXISTS "VirtualTourEvent_tourId_createdAt_idx" ON "VirtualTourEvent"("tourId", "createdAt");
CREATE INDEX IF NOT EXISTS "VirtualTourEvent_listingId_createdAt_idx" ON "VirtualTourEvent"("listingId", "createdAt");
CREATE INDEX IF NOT EXISTS "VirtualTourEvent_eventType_idx" ON "VirtualTourEvent"("eventType");
CREATE INDEX IF NOT EXISTS "ViewingAppointment_listingId_startAt_idx" ON "ViewingAppointment"("listingId", "startAt");
CREATE INDEX IF NOT EXISTS "ViewingAppointment_enquiryId_idx" ON "ViewingAppointment"("enquiryId");
CREATE INDEX IF NOT EXISTS "ViewingAppointment_agentId_startAt_idx" ON "ViewingAppointment"("agentId", "startAt");
CREATE INDEX IF NOT EXISTS "ViewingAppointment_status_idx" ON "ViewingAppointment"("status");
CREATE INDEX IF NOT EXISTS "SignedAgreement_subjectType_subjectId_idx" ON "SignedAgreement"("subjectType", "subjectId");
CREATE INDEX IF NOT EXISTS "SignedAgreement_listingId_idx" ON "SignedAgreement"("listingId");
CREATE INDEX IF NOT EXISTS "SignedAgreement_signerUserId_idx" ON "SignedAgreement"("signerUserId");
CREATE INDEX IF NOT EXISTS "SignedAgreement_signedAt_idx" ON "SignedAgreement"("signedAt");
CREATE INDEX IF NOT EXISTS "MarketInsightSnapshot_city_suburb_propertyType_idx" ON "MarketInsightSnapshot"("city", "suburb", "propertyType");
CREATE INDEX IF NOT EXISTS "MarketInsightSnapshot_listingId_idx" ON "MarketInsightSnapshot"("listingId");
CREATE INDEX IF NOT EXISTS "MarketInsightSnapshot_createdAt_idx" ON "MarketInsightSnapshot"("createdAt");

ALTER TABLE "VirtualTourEvent"
  ADD CONSTRAINT "VirtualTourEvent_tourId_fkey"
  FOREIGN KEY ("tourId") REFERENCES "ListingVirtualTour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ViewingAppointment"
  ADD CONSTRAINT "ViewingAppointment_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SignedAgreement"
  ADD CONSTRAINT "SignedAgreement_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MarketInsightSnapshot"
  ADD CONSTRAINT "MarketInsightSnapshot_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
