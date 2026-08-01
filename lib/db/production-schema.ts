import { Prisma, Role, VerificationStatus } from "@prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";

let ensurePromise: Promise<void> | null = null;

export function isMissingSchemaError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2021" || error.code === "P2022");
}

export async function ensureCoreProductionSchema() {
  if (!isPostgresStoreEnabled()) return;
  ensurePromise ??= applyCoreProductionSchema().catch((error) => {
    ensurePromise = null;
    throw error;
  });
  return ensurePromise;
}

async function applyCoreProductionSchema() {
  const prisma = getMainPrisma();
  await prisma.$executeRawUnsafe(`ALTER TYPE "ListingStatus" ADD VALUE IF NOT EXISTS 'VIEWING_IN_PROGRESS'`);
  await prisma.$executeRawUnsafe(`ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'BOARDING_HOUSE'`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accountStatus" TEXT NOT NULL DEFAULT 'ACTIVE'`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3)`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "slug" TEXT`);
  await prisma.$executeRawUnsafe(`
    UPDATE "Listing"
    SET "slug" = trim(both '-' from regexp_replace(lower("title"), '[^a-z0-9]+', '-', 'g')) || '-' || left(regexp_replace("id", '[^a-zA-Z0-9]', '', 'g'), 8)
    WHERE "slug" IS NULL OR "slug" = ''
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE "Listing"
    SET "slug" = 'listing-' || left(regexp_replace("id", '[^a-zA-Z0-9]', '', 'g'), 12)
    WHERE "slug" IS NULL OR "slug" = ''
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Listing_slug_key" ON "Listing"("slug")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Listing_slug_idx" ON "Listing"("slug")`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "featuredUntil" TIMESTAMP(3)`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "views" INTEGER NOT NULL DEFAULT 0`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "adminNotes" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "RoommateProfile" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "RoommateProfile" ADD COLUMN IF NOT EXISTS "payload" JSONB`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "plan" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "method" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "manual" BOOLEAN NOT NULL DEFAULT false`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "proofUrl" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "proofStatus" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "metadata" JSONB`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "metadata" JSONB`);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AppSession" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "revokedAt" TIMESTAMP(3),
      CONSTRAINT "AppSession_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'AppSession_userId_fkey'
      ) THEN
        ALTER TABLE "AppSession"
          ADD CONSTRAINT "AppSession_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AppSession_userId_idx" ON "AppSession"("userId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AppSession_expiresAt_idx" ON "AppSession"("expiresAt")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AppSession_revokedAt_idx" ON "AppSession"("revokedAt")`);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AgentTrainingModuleRecord" (
      "id" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "contentUrl" TEXT,
      "durationMinutes" INTEGER NOT NULL DEFAULT 0,
      "required" BOOLEAN NOT NULL DEFAULT true,
      "order" INTEGER NOT NULL DEFAULT 0,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "payload" JSONB NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AgentTrainingModuleRecord_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AgentTrainingModuleRecord_active_idx" ON "AgentTrainingModuleRecord"("active")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AgentTrainingModuleRecord_required_idx" ON "AgentTrainingModuleRecord"("required")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AgentTrainingModuleRecord_order_idx" ON "AgentTrainingModuleRecord"("order")`);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SitePageView" (
      "id" TEXT NOT NULL,
      "visitorId" TEXT NOT NULL,
      "sessionId" TEXT NOT NULL,
      "path" TEXT NOT NULL,
      "title" TEXT,
      "referrer" TEXT,
      "utmSource" TEXT,
      "utmMedium" TEXT,
      "utmCampaign" TEXT,
      "deviceType" TEXT NOT NULL,
      "durationMs" INTEGER,
      "userId" TEXT,
      "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "endedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SitePageView_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SitePageView_visitorId_idx" ON "SitePageView"("visitorId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SitePageView_sessionId_idx" ON "SitePageView"("sessionId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SitePageView_path_idx" ON "SitePageView"("path")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SitePageView_startedAt_idx" ON "SitePageView"("startedAt")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SitePageView_deviceType_idx" ON "SitePageView"("deviceType")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SitePageView_utmSource_idx" ON "SitePageView"("utmSource")`);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SiteFunnelEvent" (
      "id" TEXT NOT NULL,
      "visitorId" TEXT NOT NULL,
      "sessionId" TEXT,
      "name" TEXT NOT NULL,
      "path" TEXT,
      "target" TEXT,
      "deviceType" TEXT,
      "referrer" TEXT,
      "metadata" JSONB,
      "userId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SiteFunnelEvent_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SiteFunnelEvent_name_createdAt_idx" ON "SiteFunnelEvent"("name", "createdAt")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SiteFunnelEvent_visitorId_idx" ON "SiteFunnelEvent"("visitorId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SiteFunnelEvent_createdAt_idx" ON "SiteFunnelEvent"("createdAt")`);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SitePresence" (
      "id" TEXT NOT NULL,
      "visitorId" TEXT NOT NULL,
      "sessionId" TEXT NOT NULL,
      "path" TEXT NOT NULL,
      "title" TEXT,
      "deviceType" TEXT,
      "userId" TEXT,
      "productId" TEXT,
      "productTitle" TEXT,
      "cartItemCount" INTEGER NOT NULL DEFAULT 0,
      "cartValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "cartCurrency" TEXT,
      "cartSummary" JSONB,
      "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SitePresence_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "SitePresence_visitorId_key" ON "SitePresence"("visitorId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SitePresence_lastSeenAt_idx" ON "SitePresence"("lastSeenAt")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SitePresence_path_idx" ON "SitePresence"("path")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SitePresence_sessionId_idx" ON "SitePresence"("sessionId")`);
  await ensureBootstrapAdmin();
}

async function ensureBootstrapAdmin() {
  const prisma = getMainPrisma();
  const email = "admin@houselink.co.zw";
  const passwordHash = hashPassword(process.env.SEED_ADMIN_PASSWORD || "HouseLinkAdmin2026!");
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: "HouseLink Admin",
        roles: [Role.ADMIN, Role.SEEKER],
        accountStatus: "ACTIVE",
        identityStatus: VerificationStatus.VERIFIED,
        phoneVerifiedAt: new Date(),
        emailVerifiedAt: new Date(),
      },
    });
    return;
  }
  if (!existing.passwordHash) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        accountStatus: existing.accountStatus ?? "ACTIVE",
        roles: existing.roles.includes(Role.ADMIN) ? existing.roles : [...existing.roles, Role.ADMIN],
      },
    });
  }
}
