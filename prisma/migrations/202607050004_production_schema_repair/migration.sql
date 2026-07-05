ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "slug" TEXT;

UPDATE "Listing"
SET "slug" = trim(both '-' from regexp_replace(lower("title"), '[^a-z0-9]+', '-', 'g')) || '-' || left(regexp_replace("id", '[^a-zA-Z0-9]', '', 'g'), 8)
WHERE "slug" IS NULL OR "slug" = '';

UPDATE "Listing"
SET "slug" = 'listing-' || left(regexp_replace("id", '[^a-zA-Z0-9]', '', 'g'), 12)
WHERE "slug" IS NULL OR "slug" = '';

ALTER TABLE "Listing" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Listing_slug_key" ON "Listing"("slug");
CREATE INDEX IF NOT EXISTS "Listing_slug_idx" ON "Listing"("slug");

ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
