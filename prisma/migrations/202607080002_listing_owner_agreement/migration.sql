ALTER TABLE "Listing"
ADD COLUMN "ownerAgreementAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "ownerAgreementSignedAt" TIMESTAMP(3),
ADD COLUMN "ownerAgreementSignerName" TEXT,
ADD COLUMN "ownerAgreementVersion" TEXT;
