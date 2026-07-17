export type ResidenceRole = "tenant" | "roommate" | "owner" | "landlord";

export type ResidenceVisibility = "public" | "matches_only" | "private";

export type TenancyStatus =
  | "pending_confirmation"
  | "active"
  | "ended"
  | "disputed"
  | "rejected";

export type VerificationSource = "manual" | "payment" | "lease";

export type ResidenceRecord = {
  id: string;
  tenancyId: string;
  userId: string;
  counterpartyUserId: string;
  listingId?: string;
  propertyTitle: string;
  fullAddress: string;
  city: string;
  suburb: string;
  role: ResidenceRole;
  startDate: string;
  endDate?: string;
  status: TenancyStatus;
  verificationSource: VerificationSource;
  userConfirmed: boolean;
  counterpartyConfirmed: boolean;
  userConfirmedAt?: string;
  counterpartyConfirmedAt?: string;
  verified: boolean;
  paymentId?: string;
  leaseSignedAt?: string;
  userAddressConsent: boolean;
  counterpartyAddressConsent: boolean;
  visibility: ResidenceVisibility;
  createdAt: string;
  notes?: string;
};

export type PublicResidenceRecord = Omit<ResidenceRecord, "fullAddress"> & {
  fullAddress?: string;
  references?: TenancyReference[];
  hasOpenDispute?: boolean;
};

export type TenancyReference = {
  id: string;
  tenancyId: string;
  authorUserId: string;
  authorName: string;
  targetUserId: string;
  authorRole: ResidenceRole;
  note: string;
  rating?: number;
  createdAt: string;
};

export type TenancyDisputeStatus = "open" | "under_review" | "resolved_upheld" | "resolved_removed";

export type TenancyDispute = {
  id: string;
  tenancyId: string;
  reportedByUserId: string;
  reportedByName: string;
  reason: string;
  details: string;
  status: TenancyDisputeStatus;
  createdAt: string;
  resolvedAt?: string;
  adminNote?: string;
  resolvedBy?: string;
};

export const RESIDENCE_ROLE_LABELS: Record<ResidenceRole, string> = {
  tenant: "Tenant",
  roommate: "Roommate",
  owner: "Owner-occupier",
  landlord: "Landlord / host",
};

export const TENANCY_STATUS_LABELS: Record<TenancyStatus, string> = {
  pending_confirmation: "Awaiting confirmation",
  active: "Active",
  ended: "Ended",
  disputed: "Disputed",
  rejected: "Rejected",
};

export const VERIFICATION_SOURCE_LABELS: Record<VerificationSource, string> = {
  manual: "Manual entry (unverified)",
  payment: "Payment via HouseLink",
  lease: "Lease signed on HouseLink",
};
