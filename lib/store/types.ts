import type { Listing } from "@/lib/types";

export type UserRole =
  | "SEEKER"
  | "LANDLORD"
  | "AGENT"
  | "AGENCY_ADMIN"
  | "ADMIN"
  | "SUPER_ADMIN"
  | "ACADEMY_ADMIN"
  | "TRAINER"
  | "PUBLIC_LEARNER"
  | "MODERATOR"
  | "CONSULTANT"
  | "SUPPORT"
  | "BILLING"
  | "TECH_SUPPORT"
  | "TRUST_SAFETY";

export type AccountStatus = "ACTIVE" | "SUSPENDED" | "BLOCKED" | "DELETED";

export type StoreUser = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  phone?: string;
  city?: string;
  roles: UserRole[];
  accountStatus: AccountStatus;
  premium: boolean;
  performanceScore: number;
  warnings: number;
  agencyId?: string;
  verification: {
    identity: "PENDING" | "VERIFIED" | "REJECTED";
    phone: "PENDING" | "VERIFIED";
    email: "PENDING" | "VERIFIED";
  };
  createdAt: string;
  lastLoginAt: string;
};

export type Agency = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  subscriptionTier: "FREE" | "PRO" | "ENTERPRISE";
  accountStatus: "ACTIVE" | "SUSPENDED" | "DELETED";
  agentCount: number;
  listingCount: number;
  revenue: number;
  leadConversion: number;
  createdAt: string;
};

export type AuditLogEntry = {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  target: string;
  targetType: string;
  metadata: Record<string, unknown>;
  ip: string;
  createdAt: string;
};

export type PublicAdminUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  roles: UserRole[];
  accountStatus: AccountStatus;
  premium: boolean;
  performanceScore: number;
  warnings: number;
  agencyId?: string;
  agencyName?: string;
  verification: StoreUser["verification"];
  createdAt: string;
  lastLoginAt: string;
  listingCount?: number;
  enquiryCount?: number;
  revenue?: number;
};

export type SavedSearch = {
  id: string;
  userId: string;
  name: string;
  channels: string[];
  filters: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
};

export type Enquiry = import("@/lib/enquiries/types").PropertyEnquiry;

export type Report = {
  id: string;
  listingId: string;
  reporterId?: string;
  reason: string;
  details: string;
  status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";
  priority: "HIGH" | "MEDIUM" | "LOW";
  adminNotes?: string;
  createdAt: string;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
};

export type Conversation = {
  id: string;
  listingId: string;
  listingTitle: string;
  participantIds: string[];
  participantNames: string[];
  updatedAt: string;
};

export type RoommateProfile = {
  id: string;
  userId: string;
  lookingFor: "room" | "roommate";
  budgetMin: number;
  budgetMax: number;
  occupation: string;
  preferredLocations: string[];
  lifestyle: string;
  smoking: boolean;
  pets: boolean;
  furnished: boolean;
  availableNow: boolean;
  gender: string;
  genderPreference: string;
  age: number;
  preferredAgeMin: number;
  preferredAgeMax: number;
  religion: string;
  religionPreference: string;
  maritalStatus: string;
  maritalStatusPreference: string;
  householdType: string;
  householdSize: number;
  moveInDate?: string;
  bio?: string;
  photoUrl?: string;
  photos?: string[];
  active?: boolean;
  verified?: boolean;
  featured?: boolean;
  moderationStatus?: "active" | "pending" | "suspended";
  moderationNotes?: string;
  suburb?: string;
  createdAt: string;
  updatedAt?: string;
};

export type RoommateMatch = {
  id: string;
  kind: "room" | "roommate";
  name: string;
  title?: string;
  budget: string;
  city: string;
  lifestyle: string;
  compatibility: number;
  matchReasons: string[];
  listingId?: string;
  image?: string;
  gender?: string;
  age?: number;
  religion?: string;
  maritalStatus?: string;
  householdType?: string;
};

export type PaymentMethod =
  | "stripe"
  | "paynow"
  | "ecocash"
  | "onemoney"
  | "bank_transfer"
  | "cash"
  | "zipit"
  | "innbucks"
  | "manual"
  | (string & {});

export type PaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "REVERSED"
  | "AWAITING_PROOF"
  | "MANUAL_REVIEW";

export type FinanceNote = {
  id: string;
  authorId: string;
  authorName: string;
  note: string;
  createdAt: string;
};

export type Payment = {
  id: string;
  userId: string;
  userName?: string;
  provider: string;
  method: PaymentMethod;
  plan: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  manual: boolean;
  referenceNumber?: string;
  proofUrl?: string;
  proofStatus?: "NONE" | "REQUESTED" | "UPLOADED" | "VERIFIED" | "REJECTED";
  financeNotes: FinanceNote[];
  listingId?: string;
  tenantUserId?: string;
  landlordUserId?: string;
  receiptNumber?: string;
  externalId?: string;
  adminApprovedBy?: string;
  subscriptionDays?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type SupportTicket = {
  id: string;
  userId: string;
  userName: string;
  subject: string;
  category: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: "OPEN" | "PENDING" | "WAITING" | "RESOLVED" | "ESCALATED";
  body: string;
  team?: "Support Team" | "Billing Team" | "Trust & Safety" | "Technical Support";
  assignee?: string;
  customerEmail?: string;
  escalationReason?: string;
  resolutionNote?: string;
  createdAt: string;
  updatedAt: string;
};

export type VerificationRequest = {
  id: string;
  userId: string;
  userName: string;
  type: "IDENTITY" | "LANDLORD" | "AGENCY" | "LISTING";
  subject: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: "PENDING" | "APPROVED" | "REJECTED";
  documentUrl?: string;
  createdAt: string;
};

export type UserSubscription = {
  userId: string;
  plan: string;
  startsAt: string;
  endsAt: string;
  complimentary: boolean;
  grantedBy?: string;
};

export type ListingRecord = Listing & {
  ownerId: string;
  status: "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "VIEWING_IN_PROGRESS" | "RENTED" | "SOLD" | "EXPIRED" | "REJECTED" | "ARCHIVED" | "DELETED";
  latitude: number;
  longitude: number;
  leadSource?: "HOMELINK" | "AGENT";
  leadCreatedById?: string;
  assignedAgentId?: string;
  propertyOwnerName?: string;
  propertyOwnerEmail?: string;
  propertyOwnerPhone?: string;
  duplicateOwnerReviewStatus?: "NOT_REQUIRED" | "PENDING_ADMIN_REVIEW" | "CLEARED" | "DUPLICATE_BLOCKED";
  duplicateOwnerMatchId?: string;
  ownerAgreementAccepted?: boolean;
  ownerAgreementSignedAt?: string;
  ownerAgreementSignerName?: string;
  ownerAgreementVersion?: string;
  ownerAgreementBypassedAt?: string;
  ownerAgreementBypassedById?: string;
  ownerAgreementBypassedByName?: string;
  ownerAgreementBypassedByEmail?: string;
  ownerAgreementBypassReason?: string;
  featured?: boolean;
  featuredUntil?: string;
  adminNotes?: string;
};

export type Notification = {
  id: string;
  userId: string;
  channel: string;
  subject: string;
  body: string;
  status: "QUEUED" | "SENT";
  createdAt: string;
};

export type ReviewQueueItem = {
  id: string;
  type: string;
  priority: string;
  title: string;
  status: "OPEN" | "RESOLVED";
  targetId?: string;
  targetType?: string;
  details?: Array<{ label: string; value: string }>;
  resolutionNote?: string;
};
