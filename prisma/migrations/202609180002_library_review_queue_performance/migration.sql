CREATE INDEX IF NOT EXISTS "library_reviews_status_createdAt_idx" ON "library_reviews"("status", "createdAt" DESC);
