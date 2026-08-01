-- AlterTable
ALTER TABLE "library_products" ADD COLUMN IF NOT EXISTS "bundleProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "library_products" ADD COLUMN IF NOT EXISTS "bundlePromoPrice" DECIMAL(12,2);
