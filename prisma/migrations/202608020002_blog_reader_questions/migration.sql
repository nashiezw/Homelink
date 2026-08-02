CREATE TABLE "blog_reader_questions" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_reader_questions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "blog_reader_questions_status_createdAt_idx" ON "blog_reader_questions"("status", "createdAt");
CREATE INDEX "blog_reader_questions_postId_idx" ON "blog_reader_questions"("postId");

ALTER TABLE "blog_reader_questions" ADD CONSTRAINT "blog_reader_questions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
