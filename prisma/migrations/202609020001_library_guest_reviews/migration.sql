ALTER TABLE "library_reviews" ADD COLUMN IF NOT EXISTS "guestName" TEXT;
ALTER TABLE "library_reviews" ADD COLUMN IF NOT EXISTS "guestEmail" TEXT;
ALTER TABLE "library_reviews" ADD COLUMN IF NOT EXISTS "guestPhone" TEXT;
ALTER TABLE "library_reviews" ADD COLUMN IF NOT EXISTS "purchaseSource" TEXT;
ALTER TABLE "library_reviews" ADD COLUMN IF NOT EXISTS "adminNote" TEXT;

ALTER TABLE "library_reviews" DROP CONSTRAINT IF EXISTS "library_reviews_userId_fkey";
ALTER TABLE "library_reviews" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "library_reviews"
  ADD CONSTRAINT "library_reviews_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "library_reviews_productId_status_createdAt_idx" ON "library_reviews"("productId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "library_reviews_guestEmail_idx" ON "library_reviews"("guestEmail");
CREATE INDEX IF NOT EXISTS "library_reviews_guestPhone_idx" ON "library_reviews"("guestPhone");
