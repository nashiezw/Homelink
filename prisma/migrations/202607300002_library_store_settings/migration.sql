-- CreateTable
CREATE TABLE IF NOT EXISTS "library_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "payload" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_settings_pkey" PRIMARY KEY ("id")
);
