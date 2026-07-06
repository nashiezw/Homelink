import { Prisma, type AgentTrainingModuleRecord, type AgentTrainingProgressRecord } from "@prisma/client";
import { createDefaultAgentSettings, defaultAgentTrainingModules } from "@/lib/agents/defaults";
import type { AgentSystemSettings, AgentTrainingModule, AgentTrainingProgress } from "@/lib/agents/types";
import { getMainPrisma } from "@/lib/db/main-prisma";

const SNAPSHOT_ID = "singleton";
const SNAPSHOT_VERSION = 1;

type AgentSnapshotPayload = {
  agentSettings?: Partial<AgentSystemSettings>;
};

export async function getPostgresAgentSettings(): Promise<AgentSystemSettings> {
  const payload = await readAgentSnapshotPayload();
  return mergeAgentSettings(createDefaultAgentSettings(), payload.agentSettings ?? {});
}

export async function savePostgresAgentSettings(settings: Partial<AgentSystemSettings>): Promise<AgentSystemSettings> {
  const current = await getPostgresAgentSettings();
  const merged = mergeAgentSettings(current, settings);
  await patchAgentSnapshotPayload({ agentSettings: merged });
  return merged;
}

export async function listPostgresAgentTrainingModules(): Promise<AgentTrainingModule[]> {
  await ensureDefaultTrainingModules();
  const rows = await getMainPrisma().agentTrainingModuleRecord.findMany({
    where: { active: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toTrainingModule);
}

export async function listPostgresAgentTrainingProgress(agentId: string): Promise<AgentTrainingProgress[]> {
  const rows = await getMainPrisma().agentTrainingProgressRecord.findMany({
    where: { agentId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toTrainingProgress);
}

export async function completePostgresAgentTraining(agentId: string, moduleId: string, score?: number): Promise<AgentTrainingProgress> {
  await ensureDefaultTrainingModules();
  const trainingModule = await getMainPrisma().agentTrainingModuleRecord.findUnique({ where: { id: moduleId } });
  if (!trainingModule || !trainingModule.active) {
    throw new Error("Training module not found.");
  }
  const now = new Date().toISOString();
  const payload: Prisma.InputJsonObject = {
    moduleTitle: trainingModule.title,
    completedAt: now,
    ...(Number.isFinite(score) ? { score: Number(score) } : {}),
  };
  const row = await getMainPrisma().agentTrainingProgressRecord.upsert({
    where: { agentId_moduleId: { agentId, moduleId } },
    update: {
      status: "COMPLETED",
      payload,
    },
    create: {
      agentId,
      moduleId,
      status: "COMPLETED",
      payload,
    },
  });
  return toTrainingProgress(row);
}

export async function hasCompletedRequiredTraining(agentId: string) {
  const [settings, modules, progress] = await Promise.all([
    getPostgresAgentSettings(),
    listPostgresAgentTrainingModules(),
    listPostgresAgentTrainingProgress(agentId),
  ]);
  if (!settings.approvalWorkflow.trainingRequired) return true;
  const required = modules.filter((module) => module.required);
  if (!required.length) return true;
  return required.every((module) =>
    progress.some((entry) => entry.moduleId === module.id && entry.status === "COMPLETED"),
  );
}

export async function ensureDefaultTrainingModules() {
  const prisma = getMainPrisma();
  await prisma.$transaction(
    defaultAgentTrainingModules().map((trainingModule) => {
      const payload = toTrainingModulePayload(trainingModule);
      return prisma.agentTrainingModuleRecord.upsert({
        where: { id: trainingModule.id },
        update: {
          title: trainingModule.title,
          description: trainingModule.description,
          type: trainingModule.type,
          contentUrl: trainingModule.contentUrl ?? null,
          durationMinutes: trainingModule.durationMinutes,
          required: trainingModule.required,
          order: trainingModule.order,
          active: true,
          payload,
        },
        create: {
          id: trainingModule.id,
          title: trainingModule.title,
          description: trainingModule.description,
          type: trainingModule.type,
          contentUrl: trainingModule.contentUrl ?? null,
          durationMinutes: trainingModule.durationMinutes,
          required: trainingModule.required,
          order: trainingModule.order,
          active: true,
          payload,
        },
      });
    }),
  );
}

function toTrainingModule(row: AgentTrainingModuleRecord): AgentTrainingModule {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: isTrainingType(row.type) ? row.type : "DOCUMENT",
    contentUrl: row.contentUrl ?? undefined,
    durationMinutes: row.durationMinutes,
    required: row.required,
    order: row.order,
  };
}

function toTrainingProgress(row: AgentTrainingProgressRecord): AgentTrainingProgress {
  const payload = readObject(row.payload);
  return {
    id: row.id,
    agentId: row.agentId,
    moduleId: row.moduleId,
    status: row.status === "IN_PROGRESS" || row.status === "COMPLETED" ? row.status : "NOT_STARTED",
    score: numberValue(payload.score),
    completedAt: stringValue(payload.completedAt) ?? row.updatedAt.toISOString(),
  };
}

async function readAgentSnapshotPayload(): Promise<AgentSnapshotPayload> {
  const row = await getMainPrisma().appStoreSnapshot.findUnique({
    where: { id: SNAPSHOT_ID },
    select: { payload: true },
  }).catch(() => null);
  return readObject(row?.payload) as AgentSnapshotPayload;
}

async function patchAgentSnapshotPayload(patch: AgentSnapshotPayload) {
  const current = await readAgentSnapshotPayload();
  const payload = {
    ...current,
    ...patch,
    agentSettings: patch.agentSettings ? { ...(current.agentSettings ?? {}), ...patch.agentSettings } : current.agentSettings,
  };
  await getMainPrisma().appStoreSnapshot.upsert({
    where: { id: SNAPSHOT_ID },
    create: { id: SNAPSHOT_ID, version: SNAPSHOT_VERSION, payload: payload as Prisma.InputJsonObject },
    update: { payload: payload as Prisma.InputJsonObject, version: SNAPSHOT_VERSION },
  });
}

function mergeAgentSettings(current: AgentSystemSettings, updates: Partial<AgentSystemSettings>): AgentSystemSettings {
  return {
    ...current,
    ...updates,
    approvalWorkflow: { ...current.approvalWorkflow, ...updates.approvalWorkflow },
    levelThresholds: { ...current.levelThresholds, ...updates.levelThresholds },
    levelBenefits: { ...current.levelBenefits, ...updates.levelBenefits },
    applicationFormFields: { ...current.applicationFormFields, ...updates.applicationFormFields },
    notificationTemplates: { ...current.notificationTemplates, ...updates.notificationTemplates },
    commissionRules: updates.commissionRules ?? current.commissionRules,
    futureAgentLevels: updates.futureAgentLevels ?? current.futureAgentLevels,
    updatedAt: new Date().toISOString(),
  };
}

function isTrainingType(value: string): value is AgentTrainingModule["type"] {
  return value === "VIDEO" || value === "DOCUMENT" || value === "QUIZ" || value === "ASSIGNMENT";
}

function toTrainingModulePayload(module: AgentTrainingModule): Prisma.InputJsonObject {
  return {
    id: module.id,
    title: module.title,
    description: module.description,
    type: module.type,
    ...(module.contentUrl ? { contentUrl: module.contentUrl } : {}),
    durationMinutes: module.durationMinutes,
    required: module.required,
    order: module.order,
  };
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}
