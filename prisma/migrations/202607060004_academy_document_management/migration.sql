ALTER TABLE "document_library"
ADD COLUMN IF NOT EXISTS "visible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "downloadCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "document_library_visible_idx" ON "document_library"("visible");
CREATE INDEX IF NOT EXISTS "document_library_sortOrder_idx" ON "document_library"("sortOrder");
