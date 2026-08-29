import { Prisma, Role, VerificationStatus } from "@prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";

let ensurePromise: Promise<void> | null = null;
let ensureBlogPromise: Promise<void> | null = null;
let coreSchemaUnavailableUntil = 0;
let blogSchemaUnavailableUntil = 0;
const SCHEMA_UNAVAILABLE_BACKOFF_MS = 60_000;

export function isMissingSchemaError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2021" || error.code === "P2022");
}

export function isDatabaseUnavailableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  const candidate = error as { code?: unknown; errorCode?: unknown; message?: unknown };
  return (
    candidate.code === "P1001" ||
    candidate.code === "P2024" ||
    candidate.errorCode === "P1001" ||
    candidate.errorCode === "P2024" ||
    (typeof candidate.message === "string" && /can't reach database server/i.test(candidate.message))
  );
}

export async function ensureCoreProductionSchema() {
  if (!isPostgresStoreEnabled()) return;
  if (Date.now() < coreSchemaUnavailableUntil) return;
  ensurePromise ??= applyCoreProductionSchema().catch((error) => {
    ensurePromise = null;
    if (isDatabaseUnavailableError(error)) {
      coreSchemaUnavailableUntil = Date.now() + SCHEMA_UNAVAILABLE_BACKOFF_MS;
      return;
    }
    throw error;
  });
  return ensurePromise;
}

export async function ensureBlogProductionSchema() {
  if (!isPostgresStoreEnabled()) return;
  if (Date.now() < blogSchemaUnavailableUntil) return;
  ensureBlogPromise ??= applyBlogProductionSchema().catch((error) => {
    ensureBlogPromise = null;
    if (isDatabaseUnavailableError(error)) {
      blogSchemaUnavailableUntil = Date.now() + SCHEMA_UNAVAILABLE_BACKOFF_MS;
      return;
    }
    throw error;
  });
  return ensureBlogPromise;
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
    CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "tokenHash" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "usedAt" TIMESTAMP(3),
      CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'PasswordResetToken_userId_fkey'
      ) THEN
        ALTER TABLE "PasswordResetToken"
          ADD CONSTRAINT "PasswordResetToken_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PasswordResetToken_email_idx" ON "PasswordResetToken"("email")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PasswordResetToken_usedAt_idx" ON "PasswordResetToken"("usedAt")`);
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
  await ensureBlogProductionSchema();
  await ensureBootstrapAdmin();
}

async function applyBlogProductionSchema() {
  const prisma = getMainPrisma();
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BlogPostStatus') THEN
        CREATE TYPE "BlogPostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BlogArticleLayout') THEN
        CREATE TYPE "BlogArticleLayout" AS ENUM ('STANDARD_ARTICLE', 'PROPERTY_GUIDE', 'NEWS_ANNOUNCEMENT', 'LIST_ARTICLE');
      END IF;
    END $$
  `);
  await prisma.$executeRawUnsafe(`ALTER TYPE "BlogPostStatus" ADD VALUE IF NOT EXISTS 'DRAFT'`);
  await prisma.$executeRawUnsafe(`ALTER TYPE "BlogPostStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED'`);
  await prisma.$executeRawUnsafe(`ALTER TYPE "BlogPostStatus" ADD VALUE IF NOT EXISTS 'PUBLISHED'`);
  await prisma.$executeRawUnsafe(`ALTER TYPE "BlogPostStatus" ADD VALUE IF NOT EXISTS 'UNPUBLISHED'`);
  await prisma.$executeRawUnsafe(`ALTER TYPE "BlogPostStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED'`);
  await prisma.$executeRawUnsafe(`ALTER TYPE "BlogArticleLayout" ADD VALUE IF NOT EXISTS 'STANDARD_ARTICLE'`);
  await prisma.$executeRawUnsafe(`ALTER TYPE "BlogArticleLayout" ADD VALUE IF NOT EXISTS 'PROPERTY_GUIDE'`);
  await prisma.$executeRawUnsafe(`ALTER TYPE "BlogArticleLayout" ADD VALUE IF NOT EXISTS 'NEWS_ANNOUNCEMENT'`);
  await prisma.$executeRawUnsafe(`ALTER TYPE "BlogArticleLayout" ADD VALUE IF NOT EXISTS 'LIST_ARTICLE'`);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "blog_authors" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "role" TEXT,
      "bio" TEXT,
      "avatarUrl" TEXT,
      "email" TEXT,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "blog_authors_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "blog_authors_slug_key" ON "blog_authors"("slug")`);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "blog_categories" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "description" TEXT,
      "imageUrl" TEXT,
      "seoTitle" TEXT,
      "metaDescription" TEXT,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "blog_categories_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "blog_categories_slug_key" ON "blog_categories"("slug")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "blog_categories_active_idx" ON "blog_categories"("active")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "blog_categories_sortOrder_idx" ON "blog_categories"("sortOrder")`);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "blog_tags" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "description" TEXT,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "blog_tags_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "blog_tags_slug_key" ON "blog_tags"("slug")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "blog_tags_active_idx" ON "blog_tags"("active")`);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "blog_posts" (
      "id" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "excerpt" TEXT NOT NULL,
      "status" "BlogPostStatus" NOT NULL DEFAULT 'DRAFT',
      "layout" "BlogArticleLayout" NOT NULL DEFAULT 'STANDARD_ARTICLE',
      "categoryId" TEXT,
      "authorId" TEXT,
      "featuredImageUrl" TEXT,
      "featuredImageAlt" TEXT,
      "socialImageUrl" TEXT,
      "contentBlocks" JSONB NOT NULL,
      "contentText" TEXT NOT NULL DEFAULT '',
      "seoTitle" TEXT,
      "metaDescription" TEXT,
      "focusKeyword" TEXT,
      "secondaryKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      "canonicalUrl" TEXT,
      "noIndex" BOOLEAN NOT NULL DEFAULT false,
      "featured" BOOLEAN NOT NULL DEFAULT false,
      "popular" BOOLEAN NOT NULL DEFAULT false,
      "readTimeMinutes" INTEGER NOT NULL DEFAULT 4,
      "viewCount" INTEGER NOT NULL DEFAULT 0,
      "searchVector" TEXT NOT NULL DEFAULT '',
      "scheduledAt" TIMESTAMP(3),
      "publishedAt" TIMESTAMP(3),
      "lastEditedById" TEXT,
      "createdById" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "archivedAt" TIMESTAMP(3),
      CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "blog_posts_slug_key" ON "blog_posts"("slug")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "blog_posts_status_idx" ON "blog_posts"("status")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "blog_posts_publishedAt_idx" ON "blog_posts"("publishedAt")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "blog_posts_featured_idx" ON "blog_posts"("featured")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "blog_posts_popular_idx" ON "blog_posts"("popular")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "blog_posts_categoryId_idx" ON "blog_posts"("categoryId")`);
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blog_posts_categoryId_fkey') THEN
        ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "blog_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blog_posts_authorId_fkey') THEN
        ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "blog_authors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_BlogPostToBlogTag" (
      "A" TEXT NOT NULL,
      "B" TEXT NOT NULL
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "_BlogPostToBlogTag_AB_unique" ON "_BlogPostToBlogTag"("A", "B")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "_BlogPostToBlogTag_B_index" ON "_BlogPostToBlogTag"("B")`);
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_BlogPostToBlogTag_A_fkey') THEN
        ALTER TABLE "_BlogPostToBlogTag" ADD CONSTRAINT "_BlogPostToBlogTag_A_fkey" FOREIGN KEY ("A") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_BlogPostToBlogTag_B_fkey') THEN
        ALTER TABLE "_BlogPostToBlogTag" ADD CONSTRAINT "_BlogPostToBlogTag_B_fkey" FOREIGN KEY ("B") REFERENCES "blog_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "blog_downloads" (
      "id" TEXT NOT NULL,
      "postId" TEXT NOT NULL,
      "label" TEXT NOT NULL,
      "url" TEXT NOT NULL,
      "count" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "blog_downloads_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "blog_downloads_postId_url_key" ON "blog_downloads"("postId", "url")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "blog_downloads_postId_idx" ON "blog_downloads"("postId")`);
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blog_downloads_postId_fkey') THEN
        ALTER TABLE "blog_downloads" ADD CONSTRAINT "blog_downloads_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "blog_comments" (
      "id" TEXT NOT NULL,
      "postId" TEXT NOT NULL,
      "parentId" TEXT,
      "authorName" TEXT NOT NULL,
      "authorEmail" TEXT,
      "body" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "ipHash" TEXT,
      "userAgent" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "blog_comments_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "blog_comments_postId_status_createdAt_idx" ON "blog_comments"("postId", "status", "createdAt")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "blog_comments_parentId_idx" ON "blog_comments"("parentId")`);
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blog_comments_postId_fkey') THEN
        ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blog_comments_parentId_fkey') THEN
        ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "blog_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "blog_article_feedback" (
      "id" TEXT NOT NULL,
      "postId" TEXT NOT NULL,
      "vote" TEXT NOT NULL,
      "note" TEXT,
      "ipHash" TEXT,
      "userAgent" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "blog_article_feedback_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "blog_article_feedback_postId_vote_idx" ON "blog_article_feedback"("postId", "vote")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "blog_article_feedback_createdAt_idx" ON "blog_article_feedback"("createdAt")`);
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blog_article_feedback_postId_fkey') THEN
        ALTER TABLE "blog_article_feedback" ADD CONSTRAINT "blog_article_feedback_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "blog_reader_questions" (
      "id" TEXT NOT NULL,
      "postId" TEXT,
      "name" TEXT NOT NULL,
      "email" TEXT,
      "city" TEXT,
      "question" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'NEW',
      "adminNote" TEXT,
      "articleSlug" TEXT,
      "ipHash" TEXT,
      "userAgent" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "blog_reader_questions_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "blog_reader_questions_status_createdAt_idx" ON "blog_reader_questions"("status", "createdAt")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "blog_reader_questions_postId_idx" ON "blog_reader_questions"("postId")`);
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blog_reader_questions_postId_fkey') THEN
        ALTER TABLE "blog_reader_questions" ADD CONSTRAINT "blog_reader_questions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "blog_search_logs" (
      "id" TEXT NOT NULL,
      "query" TEXT NOT NULL,
      "category" TEXT,
      "tag" TEXT,
      "author" TEXT,
      "results" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "blog_search_logs_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "blog_search_logs_query_idx" ON "blog_search_logs"("query")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "blog_search_logs_createdAt_idx" ON "blog_search_logs"("createdAt")`);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "blog_audit_logs" (
      "id" TEXT NOT NULL,
      "actorId" TEXT,
      "action" TEXT NOT NULL,
      "targetId" TEXT NOT NULL,
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "blog_audit_logs_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "blog_audit_logs_targetId_idx" ON "blog_audit_logs"("targetId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "blog_audit_logs_actorId_idx" ON "blog_audit_logs"("actorId")`);
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
