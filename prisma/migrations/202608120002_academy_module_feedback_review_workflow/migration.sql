ALTER TABLE "academy_module_feedback" ADD COLUMN IF NOT EXISTS "adminNote" TEXT;
ALTER TABLE "academy_module_feedback" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "academy_module_feedback" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "academy_module_feedback_status_idx" ON "academy_module_feedback"("status");
