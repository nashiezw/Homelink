DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BlogPostStatus') THEN
    CREATE TYPE "BlogPostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BlogArticleLayout') THEN
    CREATE TYPE "BlogArticleLayout" AS ENUM ('STANDARD_ARTICLE', 'PROPERTY_GUIDE', 'NEWS_ANNOUNCEMENT', 'LIST_ARTICLE');
  END IF;
END $$;

ALTER TYPE "BlogPostStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "BlogPostStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED';
ALTER TYPE "BlogPostStatus" ADD VALUE IF NOT EXISTS 'PUBLISHED';
ALTER TYPE "BlogPostStatus" ADD VALUE IF NOT EXISTS 'UNPUBLISHED';
ALTER TYPE "BlogPostStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';
ALTER TYPE "BlogArticleLayout" ADD VALUE IF NOT EXISTS 'STANDARD_ARTICLE';
ALTER TYPE "BlogArticleLayout" ADD VALUE IF NOT EXISTS 'PROPERTY_GUIDE';
ALTER TYPE "BlogArticleLayout" ADD VALUE IF NOT EXISTS 'NEWS_ANNOUNCEMENT';
ALTER TYPE "BlogArticleLayout" ADD VALUE IF NOT EXISTS 'LIST_ARTICLE';

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
);

CREATE UNIQUE INDEX IF NOT EXISTS "blog_authors_slug_key" ON "blog_authors"("slug");

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
);

CREATE UNIQUE INDEX IF NOT EXISTS "blog_categories_slug_key" ON "blog_categories"("slug");
CREATE INDEX IF NOT EXISTS "blog_categories_active_idx" ON "blog_categories"("active");
CREATE INDEX IF NOT EXISTS "blog_categories_sortOrder_idx" ON "blog_categories"("sortOrder");

CREATE TABLE IF NOT EXISTS "blog_tags" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "blog_tags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "blog_tags_slug_key" ON "blog_tags"("slug");
CREATE INDEX IF NOT EXISTS "blog_tags_active_idx" ON "blog_tags"("active");

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
);

CREATE UNIQUE INDEX IF NOT EXISTS "blog_posts_slug_key" ON "blog_posts"("slug");
CREATE INDEX IF NOT EXISTS "blog_posts_status_idx" ON "blog_posts"("status");
CREATE INDEX IF NOT EXISTS "blog_posts_publishedAt_idx" ON "blog_posts"("publishedAt");
CREATE INDEX IF NOT EXISTS "blog_posts_featured_idx" ON "blog_posts"("featured");
CREATE INDEX IF NOT EXISTS "blog_posts_popular_idx" ON "blog_posts"("popular");
CREATE INDEX IF NOT EXISTS "blog_posts_categoryId_idx" ON "blog_posts"("categoryId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blog_posts_categoryId_fkey') THEN
    ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "blog_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blog_posts_authorId_fkey') THEN
    ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "blog_authors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "_BlogPostToBlogTag" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "_BlogPostToBlogTag_AB_unique" ON "_BlogPostToBlogTag"("A", "B");
CREATE INDEX IF NOT EXISTS "_BlogPostToBlogTag_B_index" ON "_BlogPostToBlogTag"("B");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_BlogPostToBlogTag_A_fkey') THEN
    ALTER TABLE "_BlogPostToBlogTag" ADD CONSTRAINT "_BlogPostToBlogTag_A_fkey" FOREIGN KEY ("A") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_BlogPostToBlogTag_B_fkey') THEN
    ALTER TABLE "_BlogPostToBlogTag" ADD CONSTRAINT "_BlogPostToBlogTag_B_fkey" FOREIGN KEY ("B") REFERENCES "blog_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "blog_downloads" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "blog_downloads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "blog_downloads_postId_url_key" ON "blog_downloads"("postId", "url");
CREATE INDEX IF NOT EXISTS "blog_downloads_postId_idx" ON "blog_downloads"("postId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blog_downloads_postId_fkey') THEN
    ALTER TABLE "blog_downloads" ADD CONSTRAINT "blog_downloads_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "blog_search_logs" (
  "id" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "category" TEXT,
  "tag" TEXT,
  "author" TEXT,
  "results" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "blog_search_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "blog_search_logs_query_idx" ON "blog_search_logs"("query");
CREATE INDEX IF NOT EXISTS "blog_search_logs_createdAt_idx" ON "blog_search_logs"("createdAt");

CREATE TABLE IF NOT EXISTS "blog_audit_logs" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "blog_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "blog_audit_logs_targetId_idx" ON "blog_audit_logs"("targetId");
CREATE INDEX IF NOT EXISTS "blog_audit_logs_actorId_idx" ON "blog_audit_logs"("actorId");
