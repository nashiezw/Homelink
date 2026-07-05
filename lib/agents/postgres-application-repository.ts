import type { Prisma } from "@prisma/client";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";

export type AgentApplicationPayload = Record<string, unknown> & {
  id: string;
  userId: string;
  status: string;
};

export function shouldUsePostgresAgentApplications() {
  return isPostgresStoreEnabled();
}

export async function getAgentApplicationByUserFromPostgres(userId: string) {
  const row = await getMainPrisma().agentApplicationRecord.findUnique({ where: { userId } });
  return row ? row.payload as unknown as AgentApplicationPayload : null;
}

export async function getAgentApplicationFromPostgres(id: string) {
  const row = await getMainPrisma().agentApplicationRecord.findUnique({ where: { id } });
  return row ? row.payload as unknown as AgentApplicationPayload : null;
}

export async function saveAgentApplicationInPostgres(payload: AgentApplicationPayload | Record<string, unknown>) {
  const application = payload as AgentApplicationPayload;
  await getMainPrisma().agentApplicationRecord.upsert({
    where: { id: application.id },
    update: { userId: application.userId, status: application.status, payload: toJson(application) },
    create: { id: application.id, userId: application.userId, status: application.status, payload: toJson(application) },
  });
  return application;
}

function toJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}
