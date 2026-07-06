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
);

CREATE INDEX IF NOT EXISTS "AgentTrainingModuleRecord_active_idx" ON "AgentTrainingModuleRecord"("active");
CREATE INDEX IF NOT EXISTS "AgentTrainingModuleRecord_required_idx" ON "AgentTrainingModuleRecord"("required");
CREATE INDEX IF NOT EXISTS "AgentTrainingModuleRecord_order_idx" ON "AgentTrainingModuleRecord"("order");
