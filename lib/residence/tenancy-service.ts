import type {
  PublicResidenceRecord,
  ResidenceRecord,
  ResidenceRole,
  TenancyDispute,
  TenancyReference,
  TenancyStatus,
  VerificationSource,
} from "@/lib/residence/types";

export type TenancyPairInput = {
  listingId: string;
  landlordUserId: string;
  tenantUserId: string;
  propertyTitle: string;
  fullAddress: string;
  city: string;
  suburb: string;
  tenantRole?: ResidenceRole;
  landlordRole?: ResidenceRole;
  startDate?: string;
  verificationSource: VerificationSource;
  paymentId?: string;
  leaseSignedAt?: string;
  visibility?: ResidenceRecord["visibility"];
  notes?: string;
};

export function canBecomeVerified(source: VerificationSource): boolean {
  return source === "payment" || source === "lease";
}

export function computeVerified(
  source: VerificationSource,
  userConfirmed: boolean,
  counterpartyConfirmed: boolean,
  status: TenancyStatus,
): boolean {
  if (status === "disputed" || status === "rejected") return false;
  if (!canBecomeVerified(source)) return false;
  return userConfirmed && counterpartyConfirmed;
}

export function computeShareFullAddress(
  userConsent: boolean,
  counterpartyConsent: boolean,
): boolean {
  return userConsent && counterpartyConsent;
}

export function createTenancyPair(input: TenancyPairInput): ResidenceRecord[] {
  const tenancyId = `ten_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const startDate = input.startDate ?? now.slice(0, 10);
  const tenantRole = input.tenantRole ?? "tenant";
  const landlordRole = input.landlordRole ?? "landlord";
  const visibility = input.visibility ?? "public";

  const landlordRecord: ResidenceRecord = {
    id: `res_${crypto.randomUUID()}`,
    tenancyId,
    userId: input.landlordUserId,
    counterpartyUserId: input.tenantUserId,
    listingId: input.listingId,
    propertyTitle: input.propertyTitle,
    fullAddress: input.fullAddress,
    city: input.city,
    suburb: input.suburb,
    role: landlordRole,
    startDate,
    status: "pending_confirmation",
    verificationSource: input.verificationSource,
    userConfirmed: false,
    counterpartyConfirmed: false,
    verified: false,
    paymentId: input.paymentId,
    leaseSignedAt: input.leaseSignedAt,
    userAddressConsent: false,
    counterpartyAddressConsent: false,
    visibility,
    createdAt: now,
    notes: input.notes,
  };

  const tenantRecord: ResidenceRecord = {
    ...landlordRecord,
    id: `res_${crypto.randomUUID()}`,
    userId: input.tenantUserId,
    counterpartyUserId: input.landlordUserId,
    role: tenantRole,
  };

  syncPairConfirmation(landlordRecord, tenantRecord);
  return [landlordRecord, tenantRecord];
}

export function syncPairConfirmation(a: ResidenceRecord, b: ResidenceRecord) {
  a.counterpartyConfirmed = b.userConfirmed;
  a.counterpartyConfirmedAt = b.userConfirmedAt;
  b.counterpartyConfirmed = a.userConfirmed;
  b.counterpartyConfirmedAt = a.userConfirmedAt;

  for (const record of [a, b]) {
    record.verified = computeVerified(
      record.verificationSource,
      record.userConfirmed,
      record.counterpartyConfirmed,
      record.status,
    );
    if (record.verified && record.status === "pending_confirmation") {
      record.status = "active";
    }
  }
}

export function confirmTenancyRecord(record: ResidenceRecord, pair: ResidenceRecord): ResidenceRecord {
  const now = new Date().toISOString();
  record.userConfirmed = true;
  record.userConfirmedAt = now;
  syncPairConfirmation(record, pair);
  return record;
}

export function applyAddressConsent(record: ResidenceRecord, pair: ResidenceRecord, consent: boolean) {
  record.userAddressConsent = consent;
  syncPairConfirmation(record, pair);
}

export function sanitizeResidenceRecord(
  record: ResidenceRecord,
  viewerId: string | undefined,
  references: TenancyReference[],
  disputes: TenancyDispute[],
): PublicResidenceRecord {
  const isParty = viewerId === record.userId || viewerId === record.counterpartyUserId;
  const shareAddress =
    computeShareFullAddress(record.userAddressConsent, record.counterpartyAddressConsent) && isParty;

  const { fullAddress, ...rest } = record;
  const openDispute = disputes.some(
    (d) => d.tenancyId === record.tenancyId && (d.status === "open" || d.status === "under_review"),
  );

  return {
    ...rest,
    fullAddress: shareAddress ? fullAddress : undefined,
    references: references.filter((r) => r.tenancyId === record.tenancyId && r.targetUserId === record.userId),
    hasOpenDispute: openDispute,
  };
}

export function markTenancyDisputed(records: ResidenceRecord[]) {
  for (const record of records) {
    record.status = "disputed";
    record.verified = false;
  }
}

export function resolveDisputeRemoved(records: ResidenceRecord[]) {
  for (const record of records) {
    record.status = "rejected";
    record.verified = false;
    record.visibility = "private";
  }
}

export function resolveDisputeUpheld(records: ResidenceRecord[]) {
  for (const record of records) {
    if (record.status === "disputed") {
      record.status = record.userConfirmed && record.counterpartyConfirmed ? "active" : "pending_confirmation";
      record.verified = computeVerified(
        record.verificationSource,
        record.userConfirmed,
        record.counterpartyConfirmed,
        record.status,
      );
    }
  }
}
