import type { Prisma } from "@prisma/client";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import {
  confirmTenancyRecord,
  sanitizeResidenceRecord,
  syncPairConfirmation,
} from "@/lib/residence/tenancy-service";
import type {
  PublicResidenceRecord,
  ResidenceRecord,
  TenancyDispute,
  TenancyDisputeStatus,
  TenancyReference,
} from "@/lib/residence/types";

export function shouldUsePostgresTenancies() {
  return isPostgresStoreEnabled();
}

export async function listResidenceHistoryFromPostgres(userId: string, viewerId?: string): Promise<PublicResidenceRecord[]> {
  const rows = await getMainPrisma().residenceRecordRow.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  const tenancyIds = rows.map((row) => row.tenancyId);
  const [references, disputes] = await Promise.all([
    listReferencesForTenancies(tenancyIds),
    listDisputesForTenancies(tenancyIds),
  ]);
  return rows.map((row) => sanitizeResidenceRecord(toResidenceRecord(row.payload), viewerId, references, disputes));
}

export async function listUserTenanciesFromPostgres(userId: string) {
  const rows = await getMainPrisma().residenceRecordRow.findMany({
    where: { OR: [{ userId }, { counterpartyId: userId }] },
    orderBy: { createdAt: "desc" },
  });
  const grouped = new Map<string, ResidenceRecord[]>();
  for (const row of rows) {
    const records = grouped.get(row.tenancyId) ?? [];
    records.push(toResidenceRecord(row.payload));
    grouped.set(row.tenancyId, records);
  }
  return [...grouped.entries()].map(([tenancyId, records]) => {
    const myRecord = records.find((record) => record.userId === userId) ?? records[0];
    const counterparty = records.find((record) => record.userId !== userId) ?? records[0];
    return {
      tenancyId,
      record: sanitizeResidenceRecord(myRecord, userId, [], []),
      counterparty: sanitizeResidenceRecord(counterparty, userId, [], []),
      needsMyConfirmation: !myRecord.userConfirmed,
    };
  });
}

export async function getTenancyDetailFromPostgres(tenancyId: string, userId: string) {
  const rows = await getMainPrisma().residenceRecordRow.findMany({ where: { tenancyId } });
  const records = rows.map((row) => toResidenceRecord(row.payload));
  if (!records.some((record) => record.userId === userId || record.counterpartyUserId === userId)) return null;
  const [references, disputes] = await Promise.all([
    listReferencesForTenancies([tenancyId]),
    listDisputesForTenancies([tenancyId]),
  ]);
  return {
    tenancyId,
    records: records.map((record) => sanitizeResidenceRecord(record, userId, references, disputes)),
    references,
    disputes,
  };
}

export async function addManualResidenceHistoryInPostgres(userId: string, input: {
  propertyTitle: string;
  city: string;
  suburb: string;
  role: ResidenceRecord["role"];
  startDate: string;
  endDate?: string;
  visibility: ResidenceRecord["visibility"];
  notes?: string;
}) {
  const now = new Date().toISOString();
  const record: ResidenceRecord = {
    id: `res_${crypto.randomUUID()}`,
    tenancyId: `ten_manual_${crypto.randomUUID()}`,
    userId,
    counterpartyUserId: "",
    propertyTitle: input.propertyTitle,
    fullAddress: `${input.suburb}, ${input.city}`,
    city: input.city,
    suburb: input.suburb,
    role: input.role,
    startDate: input.startDate,
    endDate: input.endDate,
    status: "pending_confirmation",
    verificationSource: "manual",
    userConfirmed: true,
    counterpartyConfirmed: false,
    userConfirmedAt: now,
    verified: false,
    userAddressConsent: false,
    counterpartyAddressConsent: false,
    visibility: input.visibility,
    createdAt: now,
    notes: input.notes,
  };
  await upsertResidenceRecord(record);
  return sanitizeResidenceRecord(record, userId, [], []);
}

export async function confirmTenancyInPostgres(tenancyId: string, userId: string) {
  const records = await loadTenancyRecords(tenancyId);
  const mine = records.find((record) => record.userId === userId);
  const pair = records.find((record) => record.userId !== userId);
  if (!mine || !pair) return null;
  confirmTenancyRecord(mine, pair);
  await Promise.all(records.map(upsertResidenceRecord));
  return { records };
}

export async function setTenancyAddressConsentInPostgres(tenancyId: string, userId: string, consent: boolean) {
  const records = await loadTenancyRecords(tenancyId);
  const mine = records.find((record) => record.userId === userId);
  const pair = records.find((record) => record.userId !== userId);
  if (!mine || !pair) return null;
  mine.userAddressConsent = consent;
  syncPairConfirmation(mine, pair);
  await Promise.all(records.map(upsertResidenceRecord));
  return { records };
}

export async function addTenancyReferenceInPostgres(tenancyId: string, userId: string, input: { note: string; rating?: number }) {
  const records = await loadTenancyRecords(tenancyId);
  const author = records.find((record) => record.userId === userId);
  const target = records.find((record) => record.userId !== userId);
  if (!author || !target) return null;
  const reference: TenancyReference = {
    id: `ref_${crypto.randomUUID()}`,
    tenancyId,
    authorUserId: userId,
    authorName: "HomeLink user",
    targetUserId: target.userId,
    authorRole: author.role,
    note: input.note,
    rating: input.rating,
    createdAt: new Date().toISOString(),
  };
  await getMainPrisma().tenancyReferenceRow.create({
    data: { id: reference.id, tenancyId, targetUserId: reference.targetUserId, payload: toJson(reference) },
  });
  return reference;
}

export async function addTenancyDisputeInPostgres(tenancyId: string, userId: string, reason: string, details: string) {
  const records = await loadTenancyRecords(tenancyId);
  if (!records.some((record) => record.userId === userId)) return null;
  const dispute: TenancyDispute = {
    id: `dispute_${crypto.randomUUID()}`,
    tenancyId,
    reportedByUserId: userId,
    reportedByName: "HomeLink user",
    reason,
    details,
    status: "open",
    createdAt: new Date().toISOString(),
  };
  await getMainPrisma().tenancyDisputeRow.create({
    data: { id: dispute.id, tenancyId, status: dispute.status, payload: toJson(dispute) },
  });
  return dispute;
}

export async function listTenancyDisputesFromPostgres(status?: TenancyDisputeStatus) {
  const rows = await getMainPrisma().tenancyDisputeRow.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => toTenancyDispute(row.payload));
}

export async function upsertResidenceRecord(record: ResidenceRecord) {
  await getMainPrisma().residenceRecordRow.upsert({
    where: { id: record.id },
    update: {
      tenancyId: record.tenancyId,
      userId: record.userId,
      counterpartyId: record.counterpartyUserId,
      listingId: record.listingId,
      status: record.status,
      verified: record.verified,
      payload: toJson(record),
    },
    create: {
      id: record.id,
      tenancyId: record.tenancyId,
      userId: record.userId,
      counterpartyId: record.counterpartyUserId,
      listingId: record.listingId,
      status: record.status,
      verified: record.verified,
      payload: toJson(record),
    },
  });
}

export async function upsertTenancyReference(reference: TenancyReference) {
  await getMainPrisma().tenancyReferenceRow.upsert({
    where: { id: reference.id },
    update: { tenancyId: reference.tenancyId, targetUserId: reference.targetUserId, payload: toJson(reference) },
    create: { id: reference.id, tenancyId: reference.tenancyId, targetUserId: reference.targetUserId, payload: toJson(reference) },
  });
}

export async function upsertTenancyDispute(dispute: TenancyDispute) {
  await getMainPrisma().tenancyDisputeRow.upsert({
    where: { id: dispute.id },
    update: { tenancyId: dispute.tenancyId, status: dispute.status, payload: toJson(dispute) },
    create: { id: dispute.id, tenancyId: dispute.tenancyId, status: dispute.status, payload: toJson(dispute) },
  });
}

async function loadTenancyRecords(tenancyId: string) {
  const rows = await getMainPrisma().residenceRecordRow.findMany({ where: { tenancyId } });
  return rows.map((row) => toResidenceRecord(row.payload));
}

async function listReferencesForTenancies(tenancyIds: string[]) {
  if (!tenancyIds.length) return [];
  const rows = await getMainPrisma().tenancyReferenceRow.findMany({ where: { tenancyId: { in: tenancyIds } } });
  return rows.map((row) => toTenancyReference(row.payload));
}

async function listDisputesForTenancies(tenancyIds: string[]) {
  if (!tenancyIds.length) return [];
  const rows = await getMainPrisma().tenancyDisputeRow.findMany({ where: { tenancyId: { in: tenancyIds } } });
  return rows.map((row) => toTenancyDispute(row.payload));
}

function toResidenceRecord(value: Prisma.JsonValue) {
  return value as unknown as ResidenceRecord;
}

function toTenancyReference(value: Prisma.JsonValue) {
  return value as unknown as TenancyReference;
}

function toTenancyDispute(value: Prisma.JsonValue) {
  return value as unknown as TenancyDispute;
}

function toJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}
