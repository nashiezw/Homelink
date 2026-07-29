ALTER TABLE "library_coupons" ADD COLUMN "productIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "library_coupons" ADD COLUMN "categoryIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "library_coupons" ADD COLUMN "firstPurchaseOnly" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "library_preview_pages" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "pageNumber" INTEGER NOT NULL,
  "imageUrl" TEXT,
  "documentUrl" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "library_preview_pages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "library_fulfilments" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "courier" TEXT,
  "trackingNumber" TEXT,
  "trackingUrl" TEXT,
  "packingSlipNumber" TEXT,
  "dispatchNotes" TEXT,
  "deliveryNotes" TEXT,
  "assignedToId" TEXT,
  "packedAt" TIMESTAMP(3),
  "dispatchedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "library_fulfilments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "library_invoices" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "invoiceUrl" TEXT,
  "subtotal" DECIMAL(12,2) NOT NULL,
  "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "taxTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "billingName" TEXT,
  "billingEmail" TEXT,
  "metadata" JSONB,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "library_invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "library_activity" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "library_activity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "library_guest_claims" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "userId" TEXT,
  "email" TEXT NOT NULL,
  "claimTokenHash" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3),
  "claimedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "library_guest_claims_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "library_recommendations" (
  "id" TEXT NOT NULL,
  "sourceProductId" TEXT NOT NULL,
  "targetProductId" TEXT NOT NULL,
  "reason" TEXT NOT NULL DEFAULT 'RELATED',
  "weight" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "library_recommendations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "library_tax_settings" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "country" TEXT NOT NULL DEFAULT 'ZW',
  "rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "inclusive" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "library_tax_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "library_export_jobs" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "requestedById" TEXT,
  "fileUrl" TEXT,
  "filters" JSONB,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "library_export_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "library_academy_entitlements" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "library_academy_entitlements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "library_preview_pages_productId_pageNumber_key" ON "library_preview_pages"("productId", "pageNumber");
CREATE INDEX "library_preview_pages_productId_active_sortOrder_idx" ON "library_preview_pages"("productId", "active", "sortOrder");
CREATE INDEX "library_fulfilments_orderId_idx" ON "library_fulfilments"("orderId");
CREATE INDEX "library_fulfilments_status_createdAt_idx" ON "library_fulfilments"("status", "createdAt");
CREATE UNIQUE INDEX "library_invoices_invoiceNumber_key" ON "library_invoices"("invoiceNumber");
CREATE INDEX "library_invoices_orderId_idx" ON "library_invoices"("orderId");
CREATE INDEX "library_activity_targetType_targetId_createdAt_idx" ON "library_activity"("targetType", "targetId", "createdAt");
CREATE INDEX "library_activity_actorId_createdAt_idx" ON "library_activity"("actorId", "createdAt");
CREATE INDEX "library_guest_claims_email_status_idx" ON "library_guest_claims"("email", "status");
CREATE INDEX "library_guest_claims_claimTokenHash_idx" ON "library_guest_claims"("claimTokenHash");
CREATE UNIQUE INDEX "library_recommendations_sourceProductId_targetProductId_reason_key" ON "library_recommendations"("sourceProductId", "targetProductId", "reason");
CREATE INDEX "library_recommendations_sourceProductId_active_weight_idx" ON "library_recommendations"("sourceProductId", "active", "weight");
CREATE INDEX "library_tax_settings_country_active_idx" ON "library_tax_settings"("country", "active");
CREATE INDEX "library_export_jobs_type_status_createdAt_idx" ON "library_export_jobs"("type", "status", "createdAt");
CREATE INDEX "library_export_jobs_requestedById_createdAt_idx" ON "library_export_jobs"("requestedById", "createdAt");
CREATE UNIQUE INDEX "library_academy_entitlements_orderId_productId_courseId_key" ON "library_academy_entitlements"("orderId", "productId", "courseId");
CREATE INDEX "library_academy_entitlements_userId_status_idx" ON "library_academy_entitlements"("userId", "status");

ALTER TABLE "library_preview_pages" ADD CONSTRAINT "library_preview_pages_productId_fkey" FOREIGN KEY ("productId") REFERENCES "library_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "library_fulfilments" ADD CONSTRAINT "library_fulfilments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "library_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "library_invoices" ADD CONSTRAINT "library_invoices_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "library_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "library_guest_claims" ADD CONSTRAINT "library_guest_claims_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "library_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "library_guest_claims" ADD CONSTRAINT "library_guest_claims_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "library_recommendations" ADD CONSTRAINT "library_recommendations_sourceProductId_fkey" FOREIGN KEY ("sourceProductId") REFERENCES "library_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "library_recommendations" ADD CONSTRAINT "library_recommendations_targetProductId_fkey" FOREIGN KEY ("targetProductId") REFERENCES "library_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
