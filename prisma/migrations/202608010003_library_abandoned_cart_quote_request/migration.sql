-- CreateTable
CREATE TABLE IF NOT EXISTS "library_abandoned_carts" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "reminderSentAt" TIMESTAMP(3),
    "recoveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_abandoned_carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "library_quote_requests" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 20,
    "formatType" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_quote_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "library_abandoned_carts_email_updatedAt_idx" ON "library_abandoned_carts"("email", "updatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "library_abandoned_carts_userId_updatedAt_idx" ON "library_abandoned_carts"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "library_abandoned_carts_recoveredAt_reminderSentAt_idx" ON "library_abandoned_carts"("recoveredAt", "reminderSentAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "library_quote_requests_status_createdAt_idx" ON "library_quote_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "library_quote_requests_productId_createdAt_idx" ON "library_quote_requests"("productId", "createdAt");
