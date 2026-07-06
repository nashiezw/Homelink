import { Prisma, type AgentTrainingModuleRecord, type AgentTrainingProgressRecord } from "@prisma/client";
import { createDefaultAgentSettings, defaultAgentTrainingModules } from "@/lib/agents/defaults";
import type {
  AgentSystemSettings,
  AgentTrainingAnalytics,
  AgentTrainingModule,
  AgentTrainingProgress,
  AgentTrainingTrack,
  AgentTrainingTrackCertificate,
} from "@/lib/agents/types";
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

export async function savePostgresAgentTrainingModule(module: AgentTrainingModule): Promise<AgentTrainingModule> {
  const payload = toTrainingModulePayload(module);
  const row = await getMainPrisma().agentTrainingModuleRecord.upsert({
    where: { id: module.id },
    update: {
      title: module.title,
      description: module.description,
      type: module.type,
      contentUrl: module.contentUrl ?? null,
      durationMinutes: module.durationMinutes,
      required: module.required,
      order: module.order,
      active: module.active ?? true,
      payload,
    },
    create: {
      id: module.id,
      title: module.title,
      description: module.description,
      type: module.type,
      contentUrl: module.contentUrl ?? null,
      durationMinutes: module.durationMinutes,
      required: module.required,
      order: module.order,
      active: module.active ?? true,
      payload,
    },
  });
  return toTrainingModule(row);
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
  const prisma = getMainPrisma();
  const [trainingModule, existing] = await Promise.all([
    prisma.agentTrainingModuleRecord.findUnique({ where: { id: moduleId } }),
    prisma.agentTrainingProgressRecord.findUnique({ where: { agentId_moduleId: { agentId, moduleId } } }).catch(() => null),
  ]);
  if (!trainingModule || !trainingModule.active) {
    throw new Error("Training module not found.");
  }
  const modulePayload = readObject(trainingModule.payload);
  const result = scoreTrainingModule(modulePayload, input);
  const completedAt = new Date();
  const completedAtIso = completedAt.toISOString();
  const expiresAfterDays = numberValue(modulePayload.expiresAfterDays);
  const expiresAt = result.passed && expiresAfterDays ? new Date(completedAt.getTime() + expiresAfterDays * 86400000).toISOString() : undefined;
  const attemptCount = (numberValue(readObject(existing?.payload).attemptCount) ?? 0) + 1;
  const payload: Prisma.InputJsonObject = {
    moduleTitle: trainingModule.title,
    track: stringValue(modulePayload.track) ?? "BEGINNER",
    certificateTitle: stringValue(modulePayload.certificateTitle) ?? trainingModule.title,
    completedAt: completedAtIso,
    ...(expiresAt ? { expiresAt } : {}),
    score: result.score,
    passed: result.passed,
    passMark: result.passMark,
    attemptCount,
    certificateUrl: result.passed ? stringValue(modulePayload.certificateUrl) ?? certificateUrlForTrack(readTrack(modulePayload.track)) : null,
    ...(Object.keys(result.answers).length ? { submittedAnswers: result.answers } : {}),
  };
  const row = await prisma.agentTrainingProgressRecord.upsert({
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
    progress.some((entry) => entry.moduleId === module.id && entry.status === "COMPLETED" && !isExpired(entry.expiresAt)),
  );
}

export async function getPostgresAgentTrainingCertificates(agentId: string): Promise<AgentTrainingTrackCertificate[]> {
  const [modules, progress] = await Promise.all([
    listPostgresAgentTrainingModules(),
    listPostgresAgentTrainingProgress(agentId),
  ]);
  return buildTrackCertificates(modules, progress);
}

export async function getPostgresAgentTrainingAnalytics(agentIds: string[]): Promise<AgentTrainingAnalytics> {
  const [modules, rows] = await Promise.all([
    listPostgresAgentTrainingModules(),
    getMainPrisma().agentTrainingProgressRecord.findMany(),
  ]);
  const progress = rows.map(toTrainingProgress);
  const completed = progress.filter((entry) => entry.status === "COMPLETED" && !isExpired(entry.expiresAt));
  const scored = progress.filter((entry) => Number.isFinite(entry.score));
  const required = modules.filter((module) => module.required);
  const incompleteAgents = agentIds.filter((agentId) =>
    required.some((module) => !progress.some((entry) => entry.agentId === agentId && entry.moduleId === module.id && entry.status === "COMPLETED" && !isExpired(entry.expiresAt))),
  ).length;
  const tracks = uniqueTracks(modules);
  return {
    totalModules: modules.length,
    requiredModules: required.length,
    activeModules: modules.filter((module) => module.active !== false).length,
    agentsTrained: new Set(completed.map((entry) => entry.agentId)).size,
    averageScore: scored.length ? Math.round(scored.reduce((sum, entry) => sum + (entry.score ?? 0), 0) / scored.length) : 0,
    failedAttempts: progress.filter((entry) => entry.passed === false || entry.status === "IN_PROGRESS").reduce((sum, entry) => sum + Math.max(1, entry.attemptCount ?? 1), 0),
    incompleteAgents,
    expiredCompletions: progress.filter((entry) => entry.status === "COMPLETED" && isExpired(entry.expiresAt)).length,
    trackCompletion: tracks.map((track) => {
      const trackModules = modules.filter((module) => module.track === track);
      const completedAgents = agentIds.filter((agentId) =>
        trackModules.every((module) => progress.some((entry) => entry.agentId === agentId && entry.moduleId === module.id && entry.status === "COMPLETED" && !isExpired(entry.expiresAt))),
      ).length;
      return {
        track,
        completedAgents,
        totalAgents: agentIds.length,
        percent: agentIds.length ? Math.round((completedAgents / agentIds.length) * 100) : 0,
      };
    }),
  };
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
    track: readTrack(payload.track),
    level: readLevel(payload.level),
    contentUrl: row.contentUrl ?? undefined,
    durationMinutes: row.durationMinutes,
    required: row.required,
    active: row.active,
    order: row.order,
    lessons: readLessons(payload.lessons),
    quiz: readQuiz(payload.quiz),
    resources: readResources(payload.resources),
    certificateTitle: stringValue(payload.certificateTitle),
    certificateUrl: stringValue(payload.certificateUrl),
    expiresAfterDays: numberValue(payload.expiresAfterDays),
    manualSections: readManualSections(payload.manualSections),
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
    attemptCount: numberValue(payload.attemptCount),
    submittedAnswers: readStringRecord(payload.submittedAnswers),
    completedAt: stringValue(payload.completedAt) ?? row.updatedAt.toISOString(),
    expiresAt: stringValue(payload.expiresAt),
    certificateUrl: stringValue(payload.certificateUrl),
    certificateTitle: stringValue(payload.certificateTitle),
    track: readTrack(payload.track),
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
    track: module.track,
    level: module.level,
    ...(module.contentUrl ? { contentUrl: module.contentUrl } : {}),
    durationMinutes: module.durationMinutes,
    required: module.required,
    active: module.active ?? true,
    order: module.order,
    ...(module.certificateTitle ? { certificateTitle: module.certificateTitle } : {}),
    ...(module.certificateUrl ? { certificateUrl: module.certificateUrl } : {}),
    ...(module.expiresAfterDays ? { expiresAfterDays: module.expiresAfterDays } : {}),
    lessons: module.lessons ?? [],
    ...(module.quiz ? { quiz: module.quiz, answerKey: defaultAnswerKey(module.id) } : {}),
    resources: module.resources ?? [],
    manualSections: module.manualSections ?? [],
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

function readManualSections(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value.map((section) => {
    const item = readObject(section);
    return {
      id: stringValue(item.id) ?? "",
      title: stringValue(item.title) ?? "",
      body: stringValue(item.body) ?? "",
    };
  }).filter((section) => section.id && section.title);
}

function buildTrackCertificates(modules: AgentTrainingModule[], progress: AgentTrainingProgress[]): AgentTrainingTrackCertificate[] {
  return uniqueTracks(modules).map((track) => {
    const trackModules = modules.filter((module) => module.track === track);
    const matching = trackModules.map((module) => progress.find((entry) => entry.moduleId === module.id && entry.status === "COMPLETED" && !isExpired(entry.expiresAt)));
    const completed = matching.every(Boolean) && trackModules.length > 0;
    const completedDates = matching.map((entry) => entry?.completedAt).filter((value): value is string => Boolean(value));
    const expiryDates = matching.map((entry) => entry?.expiresAt).filter((value): value is string => Boolean(value)).sort();
    return {
      track,
      title: certificateTitleForTrack(track),
      completed,
      completedAt: completedDates.sort().at(-1),
      expiresAt: expiryDates[0],
      certificateUrl: completed ? certificateUrlForTrack(track) : undefined,
      requiredModuleIds: trackModules.map((module) => module.id),
    };
  });
}

function uniqueTracks(modules: AgentTrainingModule[]) {
  return Array.from(new Set(modules.map((module) => module.track))).sort();
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

function isExpired(value?: string) {
  return Boolean(value && new Date(value).getTime() < Date.now());
}

function readTrack(value: unknown): AgentTrainingTrack {
  return value === "VERIFIED_AGENT" || value === "SENIOR_AGENT" || value === "PROPERTY_MANAGER" ? value : "BEGINNER";
}

function readLevel(value: unknown) {
  return value === "INTERMEDIATE" || value === "ADVANCED" ? value : "BEGINNER";
}

function certificateTitleForTrack(track: AgentTrainingTrack) {
  if (track === "VERIFIED_AGENT") return "Verified HomeLink Agent Certificate";
  if (track === "SENIOR_AGENT") return "Senior HomeLink Agent Certificate";
  if (track === "PROPERTY_MANAGER") return "HomeLink Property Manager Certificate";
  return "Beginner HomeLink Agent Certificate";
}

function certificateUrlForTrack(track: AgentTrainingTrack) {
  if (track === "VERIFIED_AGENT") return "/dashboard/admin?tab=academy";
  if (track === "SENIOR_AGENT") return "/dashboard/admin?tab=academy";
  if (track === "PROPERTY_MANAGER") return "/dashboard/admin?tab=academy";
  return "/dashboard/admin?tab=academy";
}

function readResourceType(value: unknown): "PDF" | "DOC" | "CHECKLIST" | "TEMPLATE" | "LINK" {
  return isResourceType(value) ? value : "LINK";
}

function isResourceType(value: unknown): value is "PDF" | "DOC" | "CHECKLIST" | "TEMPLATE" | "LINK" {
  return value === "PDF" || value === "DOC" || value === "CHECKLIST" || value === "TEMPLATE" || value === "LINK";
}
