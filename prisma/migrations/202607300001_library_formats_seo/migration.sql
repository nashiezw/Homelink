-- AlterTable
ALTER TABLE "library_products" ADD COLUMN IF NOT EXISTS "seoFocusKeyword" TEXT;
ALTER TABLE "library_products" ADD COLUMN IF NOT EXISTS "seoImageUrl" TEXT;
ALTER TABLE "library_products" ADD COLUMN IF NOT EXISTS "formats" JSONB;
