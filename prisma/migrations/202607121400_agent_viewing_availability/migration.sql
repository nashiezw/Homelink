-- CreateTable
CREATE TABLE "AgentViewingAvailability" (
    "agentId" TEXT NOT NULL,
    "schedule" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentViewingAvailability_pkey" PRIMARY KEY ("agentId")
);

-- AddForeignKey
ALTER TABLE "AgentViewingAvailability" ADD CONSTRAINT "AgentViewingAvailability_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
