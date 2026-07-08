ALTER TABLE "Listing"
ADD COLUMN "ownerAgreementBypassedAt" TIMESTAMP(3),
ADD COLUMN "ownerAgreementBypassedById" TEXT,
ADD COLUMN "ownerAgreementBypassedByName" TEXT,
ADD COLUMN "ownerAgreementBypassedByEmail" TEXT,
ADD COLUMN "ownerAgreementBypassReason" TEXT;
