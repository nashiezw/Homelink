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
);

CREATE INDEX IF NOT EXISTS "blog_comments_postId_status_createdAt_idx" ON "blog_comments"("postId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "blog_comments_parentId_idx" ON "blog_comments"("parentId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blog_comments_postId_fkey') THEN
    ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blog_comments_parentId_fkey') THEN
    ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "blog_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "blog_article_feedback" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "vote" TEXT NOT NULL,
  "note" TEXT,
  "ipHash" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "blog_article_feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "blog_article_feedback_postId_vote_idx" ON "blog_article_feedback"("postId", "vote");
CREATE INDEX IF NOT EXISTS "blog_article_feedback_createdAt_idx" ON "blog_article_feedback"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blog_article_feedback_postId_fkey') THEN
    ALTER TABLE "blog_article_feedback" ADD CONSTRAINT "blog_article_feedback_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

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
);

CREATE INDEX IF NOT EXISTS "blog_reader_questions_status_createdAt_idx" ON "blog_reader_questions"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "blog_reader_questions_postId_idx" ON "blog_reader_questions"("postId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blog_reader_questions_postId_fkey') THEN
    ALTER TABLE "blog_reader_questions" ADD CONSTRAINT "blog_reader_questions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
