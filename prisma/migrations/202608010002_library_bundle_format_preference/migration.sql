-- AlterTable
ALTER TABLE "library_products" ADD COLUMN IF NOT EXISTS "bundleFormatPreference" TEXT NOT NULL DEFAULT 'MATCH_SHOPPER';
