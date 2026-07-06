import { Prisma, type AgentTrainingModuleRecord, type AgentTrainingProgressRecord } from "@prisma/client";
import { createDefaultAgentSettings, defaultAgentTrainingModules } from "@/lib/agents/defaults";
import type { AgentSystemSettings, AgentTrainingModule, AgentTrainingProgress } from "@/lib/agents/types";
import { getMainPrisma } from "@/lib/db/main-prisma";

const SNAPSHOT_ID = "singleton";
const SNAPSHOT_VERSION = 1;

type AgentSnapshotPayload = {
  agentSettings?: Partial<AgentSystemSettings>;
};

type TrainingCompletionInput = {
  score?: number;
  answers?: Record<string, string>;
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

export async function completePostgresAgentTraining(agentId: string, moduleId: string, input: TrainingCompletionInput = {}): Promise<AgentTrainingProgress> {
  await ensureDefaultTrainingModules();
  const trainingModule = await getMainPrisma().agentTrainingModuleRecord.findUnique({ where: { id: moduleId } });
  if (!trainingModule || !trainingModule.active) {
    throw new Error("Training module not found.");
  }
  const modulePayload = readObject(trainingModule.payload);
  const result = scoreTrainingModule(modulePayload, input);
  const now = new Date().toISOString();
  const payload: Prisma.InputJsonObject = {
    moduleTitle: trainingModule.title,
    completedAt: now,
    score: result.score,
    passed: result.passed,
    passMark: result.passMark,
    certificateUrl: result.passed ? "/uploads/agents/training-certificate.pdf" : null,
    ...(Object.keys(result.answers).length ? { submittedAnswers: result.answers } : {}),
  };
  const row = await getMainPrisma().agentTrainingProgressRecord.upsert({
    where: { agentId_moduleId: { agentId, moduleId } },
    update: {
      status: result.passed ? "COMPLETED" : "IN_PROGRESS",
      payload,
    },
    create: {
      agentId,
      moduleId,
      status: result.passed ? "COMPLETED" : "IN_PROGRESS",
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
  const payload = readObject(row.payload);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: isTrainingType(row.type) ? row.type : "DOCUMENT",
    contentUrl: row.contentUrl ?? undefined,
    durationMinutes: row.durationMinutes,
    required: row.required,
    order: row.order,
    lessons: readLessons(payload.lessons),
    quiz: readQuiz(payload.quiz),
    resources: readResources(payload.resources),
    certificateTitle: stringValue(payload.certificateTitle),
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
    passed: booleanValue(payload.passed),
    submittedAnswers: readStringRecord(payload.submittedAnswers),
    completedAt: stringValue(payload.completedAt) ?? row.updatedAt.toISOString(),
    certificateUrl: stringValue(payload.certificateUrl),
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
    ...(module.certificateTitle ? { certificateTitle: module.certificateTitle } : {}),
    lessons: module.lessons ?? [],
    ...(module.quiz ? { quiz: module.quiz, answerKey: defaultAnswerKey(module.id) } : {}),
    resources: module.resources ?? [],
  };
}

function scoreTrainingModule(payload: Record<string, unknown>, input: TrainingCompletionInput) {
  const passMark = numberValue(readObject(payload.quiz).passMark) ?? 100;
  const answerKey = readStringRecord(payload.answerKey);
  const answers = readStringRecord(input.answers);
  if (Object.keys(answerKey).length) {
    const total = Object.keys(answerKey).length;
    const correct = Object.entries(answerKey).filter(([questionId, correctAnswer]) => answers[questionId] === correctAnswer).length;
    const score = total ? Math.round((correct / total) * 100) : 100;
    return { score, passed: score >= passMark, passMark, answers };
  }
  const score = Number.isFinite(input.score) ? Number(input.score) : 100;
  return { score, passed: score >= passMark, passMark, answers };
}

function defaultAnswerKey(moduleId: string): Record<string, string> {
  if (moduleId !== "train_leads") return {};
  return {
    lead_q1: "Confirm property details and safe due diligence first",
    lead_q2: "Inside the HomeLink lead workflow",
    lead_q3: "Pressure to send money urgently to an unverified account",
    lead_q4: "Lead status, notes, next step, and outcome",
    lead_q5: "Escalate or flag it for review",
  };
}

function readLessons(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value.map((lesson) => {
    const item = readObject(lesson);
    return {
      id: stringValue(item.id) ?? "",
      title: stringValue(item.title) ?? "",
      summary: stringValue(item.summary) ?? "",
      durationMinutes: numberValue(item.durationMinutes) ?? 0,
      keyPoints: readStringArray(item.keyPoints),
    };
  }).filter((lesson) => lesson.id && lesson.title);
}

function readQuiz(value: unknown) {
  const quiz = readObject(value);
  const questions = Array.isArray(quiz.questions) ? quiz.questions.map((question) => {
    const item = readObject(question);
    return {
      id: stringValue(item.id) ?? "",
      prompt: stringValue(item.prompt) ?? "",
      options: readStringArray(item.options),
    };
  }).filter((question) => question.id && question.prompt && question.options.length) : [];
  if (!questions.length) return undefined;
  return {
    passMark: numberValue(quiz.passMark) ?? 80,
    questions,
  };
}

function readResources(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value.map((resource) => {
    const item = readObject(resource);
    return {
      id: stringValue(item.id) ?? "",
      title: stringValue(item.title) ?? "",
      description: stringValue(item.description) ?? "",
      url: stringValue(item.url) ?? "",
      type: readResourceType(item.type),
    };
  }).filter((resource) => resource.id && resource.title && resource.url);
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0) : [];
}

function readStringRecord(value: unknown): Record<string, string> {
  const record = readObject(value);
  return Object.fromEntries(Object.entries(record).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function booleanValue(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function readResourceType(value: unknown): "PDF" | "DOC" | "CHECKLIST" | "TEMPLATE" | "LINK" {
  return isResourceType(value) ? value : "LINK";
}

function isResourceType(value: unknown): value is "PDF" | "DOC" | "CHECKLIST" | "TEMPLATE" | "LINK" {
  return value === "PDF" || value === "DOC" || value === "CHECKLIST" || value === "TEMPLATE" || value === "LINK";
}
