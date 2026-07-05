import type { Prisma } from "@prisma/client";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";

type PMPayload = Record<string, unknown> & {
  id: string;
  requestNumber: string;
  ownerId: string;
  status: string;
  consultantId?: string;
  paymentIds?: string[];
  createdAt: string;
};

export function shouldUsePostgresPM() {
  return isPostgresStoreEnabled();
}

export async function listPMRequestsFromPostgres(filters: { ownerId?: string; consultantId?: string; status?: string; q?: string } = {}) {
  const rows = await getMainPrisma().propertyManagementRequestRow.findMany({
    where: {
      ...(filters.ownerId ? { ownerId: filters.ownerId } : {}),
      ...(filters.consultantId ? { consultantId: filters.consultantId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  const q = filters.q?.toLowerCase();
  const requests = rows.map((row) => row.payload as PMPayload);
  return q
    ? requests.filter((request) => JSON.stringify(request).toLowerCase().includes(q))
    : requests;
}

export async function getPMRequestFromPostgres(id: string) {
  const row = await getMainPrisma().propertyManagementRequestRow.findUnique({ where: { id } });
  return row?.payload as PMPayload | undefined;
}

export async function createPMRequestInPostgres(input: Record<string, unknown>) {
  const now = new Date().toISOString();
  const id = `pm_${crypto.randomUUID()}`;
  const requestNumber = `PM-${Date.now().toString().slice(-6)}`;
  const payload: PMPayload = {
    id,
    requestNumber,
    ownerId: String(input.ownerId),
    ownerName: input.ownerName,
    ownerEmail: input.ownerEmail,
    ownerPhone: input.ownerPhone,
    propertyAddress: input.propertyAddress,
    city: input.city,
    suburb: input.suburb,
    propertyType: input.propertyType,
    serviceType: input.serviceType,
    bedrooms: input.bedrooms,
    description: input.description,
    status: "PENDING_ASSIGNMENT",
    paymentIds: [],
    documents: [],
    slaBreached: false,
    createdAt: now,
    updatedAt: now,
  };
  await upsertPMRequest(payload);
  return { request: payload, requestNumber, recommendation: null, lead: null };
}

export async function upsertPMRequest(payload: PMPayload) {
  await getMainPrisma().propertyManagementRequestRow.upsert({
    where: { id: payload.id },
    update: {
      requestNumber: payload.requestNumber,
      ownerId: payload.ownerId,
      status: payload.status,
      consultantId: payload.consultantId,
      payload: toJson(payload),
    },
    create: {
      id: payload.id,
      requestNumber: payload.requestNumber,
      ownerId: payload.ownerId,
      status: payload.status,
      consultantId: payload.consultantId,
      payload: toJson(payload),
    },
  });
}

function toJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}
