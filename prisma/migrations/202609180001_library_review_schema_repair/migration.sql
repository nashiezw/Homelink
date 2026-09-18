ALTER TABLE "library_reviews" ADD COLUMN IF NOT EXISTS "displayName" TEXT;
ALTER TABLE "library_reviews" ADD COLUMN IF NOT EXISTS "guestName" TEXT;
ALTER TABLE "library_reviews" ADD COLUMN IF NOT EXISTS "guestEmail" TEXT;
ALTER TABLE "library_reviews" ADD COLUMN IF NOT EXISTS "guestPhone" TEXT;
ALTER TABLE "library_reviews" ADD COLUMN IF NOT EXISTS "purchaseSource" TEXT;
ALTER TABLE "library_reviews" ADD COLUMN IF NOT EXISTS "adminNote" TEXT;
ALTER TABLE "library_reviews" ALTER COLUMN "userId" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "library_reviews_productId_status_createdAt_idx" ON "library_reviews"("productId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "library_reviews_guestEmail_idx" ON "library_reviews"("guestEmail");
CREATE INDEX IF NOT EXISTS "library_reviews_guestPhone_idx" ON "library_reviews"("guestPhone");
