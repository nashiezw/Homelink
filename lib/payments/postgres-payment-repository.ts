import { PaymentProvider, PaymentStatus, type Prisma } from "@prisma/client";
import { defaultPaymentSettings } from "@/lib/settings/defaults";
import { getPlanPrice } from "@/lib/payments/plans";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import type { PaymentSettings } from "@/lib/settings/types";

const PROVIDERS = new Set<string>(Object.values(PaymentProvider));

export function shouldUsePostgresPayments() {
  return isPostgresStoreEnabled();
}

export function getProductionPaymentSettings(): PaymentSettings {
  return defaultPaymentSettings;
}

export async function createPaymentInPostgres(
  userId: string,
  input: {
    provider: string;
    plan: string;
    amount?: number;
    listingId?: string;
    tenantUserId?: string;
    landlordUserId?: string;
    method?: string;
  },
) {
  const settings = getProductionPaymentSettings();
  const amount = input.plan === "tenancy_payment"
    ? Number(input.amount) || getPlanPrice(input.plan, settings.fees)
    : getPlanPrice(input.plan, settings.fees);
  const isManual = ["bank_transfer", "cash", "zipit"].includes(input.provider);
  const row = await getMainPrisma().payment.create({
    data: {
      userId,
      listingId: input.listingId || null,
      provider: normalizeProvider(input.provider),
      status: PaymentStatus.PENDING,
      amount,
      currency: settings.currency,
      description: input.plan.replace(/_/g, " "),
      plan: input.plan,
      method: input.method ?? input.provider,
      manual: isManual,
      proofStatus: isManual ? "REQUESTED" : "NONE",
      metadata: {
        tenantUserId: input.tenantUserId,
        landlordUserId: input.landlordUserId,
        referenceNumber: `HL-${Date.now()}`,
      } as Prisma.InputJsonObject,
    },
  });
  return toPayment(row);
}

export async function listPaymentsFromPostgres(userId: string) {
  const rows = await getMainPrisma().payment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toPayment);
}

export async function getPaymentFromPostgres(id: string) {
  const row = await getMainPrisma().payment.findUnique({ where: { id } });
  return row ? toPayment(row) : null;
}

export async function uploadPaymentProofInPostgres(id: string, userId: string, proofUrl: string) {
  const existing = await getMainPrisma().payment.findUnique({ where: { id } });
  if (!existing) return null;
  if (existing.userId !== userId) return "FORBIDDEN" as const;
  if (!existing.manual) return "NOT_MANUAL" as const;
  const row = await getMainPrisma().payment.update({
    where: { id },
    data: { proofUrl, proofStatus: "UPLOADED" },
  });
  return toPayment(row);
}

export async function completePaymentInPostgres(id: string) {
  const row = await getMainPrisma().payment.update({
    where: { id },
    data: { status: PaymentStatus.PAID, proofStatus: "VERIFIED" },
  }).catch(() => null);
  return row ? toPayment(row) : null;
}

export function toPayment(row: {
  id: string;
  userId: string;
  listingId: string | null;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: Prisma.Decimal | number;
  currency: string;
  description: string;
  externalId: string | null;
  plan: string | null;
  method: string | null;
  manual: boolean;
  proofUrl: string | null;
  proofStatus: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    userId: row.userId,
    listingId: row.listingId ?? undefined,
    provider: row.provider.toLowerCase(),
    status: row.status,
    amount: Number(row.amount),
    currency: row.currency,
    description: row.description,
    externalId: row.externalId ?? undefined,
    plan: row.plan ?? row.description,
    method: row.method ?? row.provider.toLowerCase(),
    manual: row.manual,
    proofUrl: row.proofUrl ?? undefined,
    proofStatus: row.proofStatus ?? undefined,
    referenceNumber: metadata.referenceNumber,
    tenantUserId: metadata.tenantUserId,
    landlordUserId: metadata.landlordUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function normalizeProvider(provider: string) {
  const normalized = provider.trim().toUpperCase();
  if (normalized === "BANK_TRANSFER" || normalized === "CASH" || normalized === "ZIPIT" || normalized === "INNBUCKS") {
    return PaymentProvider.PAYNOW;
  }
  if (PROVIDERS.has(normalized)) return normalized as PaymentProvider;
  return PaymentProvider.PAYNOW;
}
