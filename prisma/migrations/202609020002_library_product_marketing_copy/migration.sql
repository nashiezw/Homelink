ALTER TABLE "library_products"
  ADD COLUMN IF NOT EXISTS "salesHeadline" TEXT,
  ADD COLUMN IF NOT EXISTS "shortMarketingPitch" TEXT;
