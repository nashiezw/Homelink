import type { LeadAssignmentStrategy } from "@/lib/agents/types";
import type { ListingIntent, PropertyType } from "@/lib/types";

export type EnquiryStatus =
  | "NEW"
  | "ASSIGNED"
  | "CONTACTED"
  | "CUSTOMER_RESPONDED"
  | "VIEWING_SCHEDULED"
  | "VIEWING_COMPLETED"
  | "FOLLOW_UP_REQUIRED"
  | "NEGOTIATING"
  | "OFFER_SUBMITTED"
  | "OFFER_ACCEPTED"
  | "OFFER_DECLINED"
  | "BOOKING_CONFIRMED"
  | "RENTAL_APPROVED"
  | "SALE_COMPLETED"
  | "CLOSED"
  | "CANCELLED"
  | "LOST_LEAD";

export type EnquiryType =
  | "REQUEST_VIEWING"
  | "SCHEDULE_VIEWING"
  | "BOOK_INSPECTION"
  | "ENQUIRE_PROPERTY"
  | "TALK_TO_CONSULTANT"
  | "REQUEST_INFO"
  | "ASK_QUESTION"
  | "BOOK_HOLIDAY"
  | "CHECK_AVAILABILITY"
  | "REQUEST_ROOM_VIEWING"
  | "CONTACT_HOMELINK"
  | "ROOMMATE_MATCH";

export type EnquirySubjectType = "LISTING" | "ROOMMATE" | "HOLIDAY";

export type EnquiryPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type EnquiryActivityType =
  | "CREATED"
  | "STATUS_CHANGED"
  | "ASSIGNED"
  | "REASSIGNED"
  | "NOTE_ADDED"
  | "CONTACTED"
  | "VIEWING_SCHEDULED"
  | "VIEWING_COMPLETED"
  | "OFFER_SUBMITTED"
  | "OFFER_UPDATED"
  | "BOOKING_CONFIRMED"
  | "COMMISSION_RECORDED"
  | "DOCUMENT_UPLOADED"
  | "MERGED"
  | "CANCELLED";

export type EnquiryActivity = {
  id: string;
  type: EnquiryActivityType;
  actorId: string;
  actorName: string;
  message: string;
  fromStatus?: EnquiryStatus;
  toStatus?: EnquiryStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type EnquiryNote = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  internal: boolean;
  createdAt: string;
};

export type EnquiryFollowUpTask = {
  id: string;
  viewingId: string;
  referenceNumber: string;
  title: string;
  description?: string;
  dueAt: string;
  status: "OPEN" | "DONE" | "CANCELLED";
  createdAt: string;
  completedAt?: string;
};

export type EnquiryViewing = {
  id: string;
  referenceNumber: string;
  scheduledAt: string;
  location: string;
  agentId?: string;
  agentName?: string;
  outcome?: "COMPLETED" | "NO_SHOW" | "RESCHEDULED" | "CANCELLED";
  feedback?: string;
  followUpDate?: string;
  clientInterested?: boolean;
  createdAt: string;
  completedAt?: string;
};

export type EnquiryOffer = {
  id: string;
  amount: number;
  currency: string;
  terms?: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "WITHDRAWN";
  submittedById: string;
  submittedByName: string;
  createdAt: string;
  respondedAt?: string;
};

export type EnquiryDocument = {
  id: string;
  name: string;
  url: string;
  uploadedById: string;
  uploadedByName: string;
  createdAt: string;
};

/** Canonical CRM enquiry record — replaces the legacy thin Enquiry type. */
export type PropertyEnquiry = {
  id: string;
  subjectType: EnquirySubjectType;
  listingId: string;
  listingTitle: string;
  listingType: PropertyType | string;
  listingIntent: ListingIntent | string;
  roommateUserId?: string;
  holidayBookingId?: string;
  estimatedNights?: number;
  estimatedTotal?: number;
  ownerId: string;
  ownerName: string;
  seekerId: string;
  seekerName: string;
  seekerEmail?: string;
  seekerPhone?: string;
  enquiryType: EnquiryType;
  channel: "WEB" | "MOBILE" | "PHONE" | "WHATSAPP" | "EMAIL";
  message: string;
  status: EnquiryStatus;
  priority: EnquiryPriority;
  assignedAgentId?: string;
  assignedAgentName?: string;
  agentLeadId?: string;
  conversationId?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  preferredDate?: string;
  preferredTime?: string;
  source: string;
  tags: string[];
  notes: EnquiryNote[];
  activities: EnquiryActivity[];
  viewings: EnquiryViewing[];
  followUpTasks: EnquiryFollowUpTask[];
  offers: EnquiryOffer[];
  documents: EnquiryDocument[];
  commissionRecorded: boolean;
  commissionAmount?: number;
  responseTimeMinutes?: number;
  firstContactedAt?: string;
  closedAt?: string;
  closedReason?: string;
  mergedIntoId?: string;
  createdAt: string;
  updatedAt: string;
};

/** @deprecated Use PropertyEnquiry */
export type Enquiry = PropertyEnquiry;

export type EnquirySettings = {
  requireManagedEnquiries: boolean;
  showPublicContactDetails: boolean;
  autoAssignAgents: boolean;
  assignmentStrategy: LeadAssignmentStrategy;
  responseTimeTargetMinutes: number;
  followUpReminderHours: number;
  viewingWorkflowEnabled: boolean;
  bookingWorkflowEnabled: boolean;
  commissionRulesEnabled: boolean;
  notifyAdminOnNewEnquiry: boolean;
  notifyOwnerOnNewEnquiry: boolean;
  notifyAgentOnAssignment: boolean;
};

export type PublicEnquiryConfig = {
  requireManagedEnquiries: boolean;
  showPublicContactDetails: boolean;
  viewingWorkflowEnabled: boolean;
  bookingWorkflowEnabled: boolean;
};

export type CreateEnquiryInput = {
  listingId: string;
  seekerId: string;
  seekerName: string;
  seekerEmail?: string;
  seekerPhone?: string;
  enquiryType: EnquiryType;
  message: string;
  preferredDate?: string;
  preferredTime?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  channel?: PropertyEnquiry["channel"];
  source?: string;
  subjectType?: EnquirySubjectType;
  roommateUserId?: string;
  holidayBookingId?: string;
  estimatedNights?: number;
  estimatedTotal?: number;
};

export type CreateRoommateEnquiryInput = {
  roommateUserId: string;
  roommateName: string;
  seekerId: string;
  seekerName: string;
  seekerEmail?: string;
  seekerPhone?: string;
  enquiryType?: EnquiryType;
  message: string;
  preferredDate?: string;
  channel?: PropertyEnquiry["channel"];
};

export type EnquiryListFilters = {
  status?: EnquiryStatus | EnquiryStatus[];
  subjectType?: EnquirySubjectType;
  listingId?: string;
  ownerId?: string;
  assignedAgentId?: string;
  seekerId?: string;
  enquiryType?: EnquiryType;
  roommateUserId?: string;
  holidayBookingId?: string;
  q?: string;
  from?: string;
  to?: string;
};

export type EnquiryAnalytics = {
  total: number;
  newCount: number;
  activeCount: number;
  closedWonCount: number;
  lostCount: number;
  avgResponseMinutes: number;
  conversionRate: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
};
