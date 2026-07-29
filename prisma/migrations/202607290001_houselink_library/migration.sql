CREATE TYPE "LibraryProductType" AS ENUM (
  'PRINTED_BOOK',
  'PDF',
  'DIGITAL_BOOK',
  'TRAINING_MANUAL',
  'TOOLKIT',
  'COURSE',
  'TEMPLATE',
  'FORMS',
  'BUNDLE',
  'MEMBERSHIP',
  'SUBSCRIPTION',
  'GIFT_CARD'
);

CREATE TYPE "LibraryProductStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED', 'DELETED');
CREATE TYPE "LibraryOrderStatus" AS ENUM ('PENDING', 'PAID', 'FULFILLED', 'CANCELLED', 'REFUNDED');
CREATE TYPE "LibraryDownloadStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

CREATE TABLE "library_authors" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "bio" TEXT,
  "avatarUrl" TEXT,
  "websiteUrl" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "library_authors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "library_categories" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "seoTitle" TEXT,
  "metaDescription" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "library_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "library_collections" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "heroImageUrl" TEXT,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "library_collections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "library_products" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "authorId" TEXT,
  "publisher" TEXT,
  "edition" TEXT,
  "isbn" TEXT,
  "language" TEXT NOT NULL DEFAULT 'English',
  "publicationDate" TIMESTAMP(3),
  "pages" INTEGER,
  "weightGrams" INTEGER,
  "bookSize" TEXT,
  "sku" TEXT NOT NULL,
  "barcode" TEXT,
  "productType" "LibraryProductType" NOT NULL,
  "status" "LibraryProductStatus" NOT NULL DEFAULT 'DRAFT',
  "price" DECIMAL(12,2) NOT NULL,
  "compareAtPrice" DECIMAL(12,2),
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "categoryId" TEXT,
  "collectionId" TEXT,
  "series" TEXT,
  "difficulty" TEXT,
  "shortDescription" TEXT,
  "description" TEXT NOT NULL,
  "learningOutcomes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "whoThisIsFor" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "requirements" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "tableOfContents" JSONB,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "seoTitle" TEXT,
  "metaDescription" TEXT,
  "searchVector" TEXT NOT NULL DEFAULT '',
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "bestSeller" BOOLEAN NOT NULL DEFAULT false,
  "newRelease" BOOLEAN NOT NULL DEFAULT false,
  "editorsChoice" BOOLEAN NOT NULL DEFAULT false,
  "comingSoon" BOOLEAN NOT NULL DEFAULT false,
  "preorder" BOOLEAN NOT NULL DEFAULT false,
  "stock" INTEGER,
  "lowStockThreshold" INTEGER NOT NULL DEFAULT 0,
  "warehouse" TEXT,
  "supplier" TEXT,
  "downloadLimit" INTEGER,
  "downloadExpiryDays" INTEGER,
  "watermarking" BOOLEAN NOT NULL DEFAULT false,
  "licenseKeys" BOOLEAN NOT NULL DEFAULT false,
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "downloadCount" INTEGER NOT NULL DEFAULT 0,
  "ratingAverage" DECIMAL(4,2) NOT NULL DEFAULT 0,
  "ratingCount" INTEGER NOT NULL DEFAULT 0,
  "scheduledAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "library_products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "library_product_media" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "publicId" TEXT,
  "mediaType" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "library_product_media_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "library_product_files" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "fileSizeBytes" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "secure" BOOLEAN NOT NULL DEFAULT true,
  "previewable" BOOLEAN NOT NULL DEFAULT false,
  "downloadable" BOOLEAN NOT NULL DEFAULT true,
  "downloadLimit" INTEGER,
  "expiryDays" INTEGER,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "library_product_files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "library_orders" (
  "id" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "paymentId" TEXT,
  "status" "LibraryOrderStatus" NOT NULL DEFAULT 'PENDING',
  "subtotal" DECIMAL(12,2) NOT NULL,
  "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "couponCode" TEXT,
  "billingEmail" TEXT,
  "metadata" JSONB,
  "fulfilledAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "library_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "library_order_items" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "total" DECIMAL(12,2) NOT NULL,
  "productType" "LibraryProductType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "library_order_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "library_download_access" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "orderId" TEXT,
  "fileId" TEXT,
  "tokenHash" TEXT,
  "licenseKey" TEXT,
  "status" "LibraryDownloadStatus" NOT NULL DEFAULT 'ACTIVE',
  "downloadLimit" INTEGER,
  "downloadCount" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3),
  "lastDownloadAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "library_download_access_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "library_reviews" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "title" TEXT,
  "body" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "library_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "library_coupons" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "discountType" TEXT NOT NULL,
  "discountValue" DECIMAL(12,2) NOT NULL,
  "usageLimit" INTEGER,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "minimumSubtotal" DECIMAL(12,2),
  "startsAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "library_coupons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "library_wishlist_items" (
  "userId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "library_wishlist_items_pkey" PRIMARY KEY ("userId","productId")
);

CREATE TABLE "library_inventory_movements" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "note" TEXT,
  "actorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "library_inventory_movements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "library_authors_slug_key" ON "library_authors"("slug");
CREATE UNIQUE INDEX "library_categories_slug_key" ON "library_categories"("slug");
CREATE UNIQUE INDEX "library_collections_slug_key" ON "library_collections"("slug");
CREATE UNIQUE INDEX "library_products_slug_key" ON "library_products"("slug");
CREATE UNIQUE INDEX "library_products_sku_key" ON "library_products"("sku");
CREATE UNIQUE INDEX "library_orders_orderNumber_key" ON "library_orders"("orderNumber");
CREATE UNIQUE INDEX "library_reviews_productId_userId_key" ON "library_reviews"("productId", "userId");
CREATE UNIQUE INDEX "library_coupons_code_key" ON "library_coupons"("code");

CREATE INDEX "library_authors_active_idx" ON "library_authors"("active");
CREATE INDEX "library_categories_active_sortOrder_idx" ON "library_categories"("active", "sortOrder");
CREATE INDEX "library_collections_active_featured_sortOrder_idx" ON "library_collections"("active", "featured", "sortOrder");
CREATE INDEX "library_products_status_productType_idx" ON "library_products"("status", "productType");
CREATE INDEX "library_products_categoryId_idx" ON "library_products"("categoryId");
CREATE INDEX "library_products_collectionId_idx" ON "library_products"("collectionId");
CREATE INDEX "library_products_authorId_idx" ON "library_products"("authorId");
CREATE INDEX "library_products_featured_bestSeller_newRelease_idx" ON "library_products"("featured", "bestSeller", "newRelease");
CREATE INDEX "library_products_price_idx" ON "library_products"("price");
CREATE INDEX "library_products_publishedAt_idx" ON "library_products"("publishedAt");
CREATE INDEX "library_product_media_productId_sortOrder_idx" ON "library_product_media"("productId", "sortOrder");
CREATE INDEX "library_product_files_productId_active_idx" ON "library_product_files"("productId", "active");
CREATE INDEX "library_orders_customerId_createdAt_idx" ON "library_orders"("customerId", "createdAt");
CREATE INDEX "library_orders_paymentId_idx" ON "library_orders"("paymentId");
CREATE INDEX "library_orders_status_idx" ON "library_orders"("status");
CREATE INDEX "library_order_items_orderId_idx" ON "library_order_items"("orderId");
CREATE INDEX "library_order_items_productId_idx" ON "library_order_items"("productId");
CREATE INDEX "library_download_access_userId_idx" ON "library_download_access"("userId");
CREATE INDEX "library_download_access_productId_idx" ON "library_download_access"("productId");
CREATE INDEX "library_download_access_orderId_idx" ON "library_download_access"("orderId");
CREATE INDEX "library_download_access_tokenHash_idx" ON "library_download_access"("tokenHash");
CREATE INDEX "library_reviews_status_idx" ON "library_reviews"("status");
CREATE INDEX "library_coupons_active_expiresAt_idx" ON "library_coupons"("active", "expiresAt");
CREATE INDEX "library_inventory_movements_productId_createdAt_idx" ON "library_inventory_movements"("productId", "createdAt");

ALTER TABLE "library_products" ADD CONSTRAINT "library_products_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "library_authors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "library_products" ADD CONSTRAINT "library_products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "library_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "library_products" ADD CONSTRAINT "library_products_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "library_collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "library_product_media" ADD CONSTRAINT "library_product_media_productId_fkey" FOREIGN KEY ("productId") REFERENCES "library_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "library_product_files" ADD CONSTRAINT "library_product_files_productId_fkey" FOREIGN KEY ("productId") REFERENCES "library_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "library_orders" ADD CONSTRAINT "library_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "library_orders" ADD CONSTRAINT "library_orders_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "library_order_items" ADD CONSTRAINT "library_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "library_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "library_order_items" ADD CONSTRAINT "library_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "library_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "library_download_access" ADD CONSTRAINT "library_download_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "library_download_access" ADD CONSTRAINT "library_download_access_productId_fkey" FOREIGN KEY ("productId") REFERENCES "library_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "library_download_access" ADD CONSTRAINT "library_download_access_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "library_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "library_download_access" ADD CONSTRAINT "library_download_access_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "library_product_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "library_reviews" ADD CONSTRAINT "library_reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "library_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "library_reviews" ADD CONSTRAINT "library_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "library_wishlist_items" ADD CONSTRAINT "library_wishlist_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "library_wishlist_items" ADD CONSTRAINT "library_wishlist_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "library_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "library_inventory_movements" ADD CONSTRAINT "library_inventory_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "library_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
