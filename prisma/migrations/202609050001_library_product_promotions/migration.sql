ALTER TABLE "library_products"
  ADD COLUMN IF NOT EXISTS "promotionEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "promotionTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "promotionDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "promotionBadge" TEXT,
  ADD COLUMN IF NOT EXISTS "promotionStartsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "promotionEndsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "promotionCountdown" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "promotionStyle" TEXT NOT NULL DEFAULT 'EMERALD_GOLD';

CREATE INDEX IF NOT EXISTS "library_products_promotion_active_idx"
  ON "library_products"("promotionEnabled", "promotionStartsAt", "promotionEndsAt");
