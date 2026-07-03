export type PMRequestStatus =
  | "SUBMITTED"
  | "PENDING_ASSIGNMENT"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "APPROVED"
  | "REJECTED"
  | "PAUSED"
  | "CLOSED"
  | "ARCHIVED";

export type PMDocumentStatus = "PENDING" | "UPLOADED" | "APPROVED" | "REJECTED" | "REQUESTED";

export type PMInspectionStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "RESCHEDULED";

export type PMNote = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  internal: boolean;
  createdAt: string;
};

export type PMDocument = {
  id: string;
  name: string;
  type: string;
  url?: string;
  status: PMDocumentStatus;
  uploadedBy?: string;
  reviewedBy?: string;
  requestedBy?: string;
  requestedFrom?: string;
  dueDate?: string;
  instructions?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type PMInspection = {
  id: string;
  scheduledAt: string;
  status: PMInspectionStatus;
  notes?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
};

export type PMValuation = {
  id: string;
  amount: number;
  currency: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  notes?: string;
  approvedBy?: string;
  createdAt: string;
};

export type PMQuotation = {
  id: string;
  title: string;
  lineItems: Array<{ label: string; amount: number }>;
  total: number;
  currency: string;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED";
  createdAt: string;
};

export type PMAgreement = {
  id: string;
  type: "MANAGEMENT" | "TENANCY";
  title: string;
  content: string;
  status: "DRAFT" | "SENT" | "SIGNED";
  createdAt: string;
};

export type PMInvoice = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";
  paymentId?: string;
  dueDate: string;
  createdAt: string;
};

export type PMOffer = {
  id: string;
  partyName: string;
  partyType: "BUYER" | "TENANT";
  amount: number;
  currency: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
  message?: string;
  createdAt: string;
};

export type InterestedParty = {
  id: string;
  name: string;
  type: "BUYER" | "TENANT";
  phone?: string;
  email?: string;
  notes?: string;
  createdAt: string;
};

export type PMTimelineEntry = {
  id: string;
  label: string;
  description?: string;
  status: "completed" | "current" | "upcoming";
  at?: string;
};

export type PMActivity = {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  detail: string;
  createdAt: string;
};

export type CRMLead = {
  id: string;
  requestId: string;
  requestNumber: string;
  ownerId: string;
  ownerName: string;
  city: string;
  serviceType: string;
  source: string;
  status: string;
  assignedConsultantId?: string;
  score: number;
  createdAt: string;
  updatedAt: string;
};

export type PropertyManagementRequest = {
  id: string;
  requestNumber: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  propertyAddress: string;
  city: string;
  suburb?: string;
  propertyType: string;
  serviceType: string;
  bedrooms?: number;
  description: string;
  status: PMRequestStatus;
  consultantId?: string;
  consultantName?: string;
  agencyId?: string;
  agencyName?: string;
  branchId?: string;
  branchName?: string;
  regionalManagerId?: string;
  aiRecommendedConsultantId?: string;
  slaDeadline: string;
  slaBreached: boolean;
  progressPercent: number;
  internalNotes: PMNote[];
  documents: PMDocument[];
  inspections: PMInspection[];
  valuations: PMValuation[];
  quotations: PMQuotation[];
  agreements: PMAgreement[];
  invoices: PMInvoice[];
  offers: PMOffer[];
  interestedParties: InterestedParty[];
  timeline: PMTimelineEntry[];
  activityLog: PMActivity[];
  paymentIds: string[];
  deletedAt?: string;
  mergedIntoId?: string;
  createdAt: string;
  updatedAt: string;
};

export type SubmitPMRequestInput = {
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  propertyAddress: string;
  city: string;
  suburb?: string;
  propertyType: string;
  serviceType: string;
  bedrooms?: number;
  description: string;
};

export type ConsultantProfile = {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  city: string;
  agencyId?: string;
  agencyName?: string;
  performanceScore: number;
  activeLeads: number;
  completedRequests: number;
};
