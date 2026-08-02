CREATE TABLE "blog_comments" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "blog_comments_postId_status_createdAt_idx" ON "blog_comments"("postId", "status", "createdAt");
CREATE INDEX "blog_comments_parentId_idx" ON "blog_comments"("parentId");

ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "blog_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "blog_article_feedback" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "vote" TEXT NOT NULL,
    "note" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_article_feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "blog_article_feedback_postId_vote_idx" ON "blog_article_feedback"("postId", "vote");
CREATE INDEX "blog_article_feedback_createdAt_idx" ON "blog_article_feedback"("createdAt");

ALTER TABLE "blog_article_feedback" ADD CONSTRAINT "blog_article_feedback_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
