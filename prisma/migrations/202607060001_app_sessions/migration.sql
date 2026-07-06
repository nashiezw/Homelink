CREATE TABLE IF NOT EXISTS "AppSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "AppSession_pkey" PRIMARY KEY ("id")
);

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
END $$;

CREATE INDEX IF NOT EXISTS "AppSession_userId_idx" ON "AppSession"("userId");
CREATE INDEX IF NOT EXISTS "AppSession_expiresAt_idx" ON "AppSession"("expiresAt");
CREATE INDEX IF NOT EXISTS "AppSession_revokedAt_idx" ON "AppSession"("revokedAt");
