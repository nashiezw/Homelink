export type EscrowHold = {
  id: string;
  paymentId: string;
  userId: string;
  userName: string;
  amount: number;
  listingId?: string;
  listingTitle?: string;
  status: "HELD" | "RELEASED" | "DISPUTED" | "REFUNDED";
  holdReason: string;
  createdAt: string;
  releaseAt?: string;
};

export type Chargeback = {
  id: string;
  paymentId: string;
  userName: string;
  amount: number;
  reason: string;
  status: "OPEN" | "UNDER_REVIEW" | "WON" | "LOST" | "ACCEPTED";
  gateway: string;
  dueDate: string;
  createdAt: string;
};

export type Coupon = {
  id: string;
  code: string;
  label: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  maxUses: number;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  appliesTo: "all" | "listings" | "subscriptions" | "holiday";
  active: boolean;
};

export type ScheduledCampaign = {
  id: string;
  name: string;
  channel: "email" | "sms" | "whatsapp" | "push";
  subject: string;
  body: string;
  audience: "all" | "seekers" | "landlords" | "agents";
  scheduledAt: string;
  status: "draft" | "scheduled" | "sent" | "cancelled";
  createdAt: string;
};

export type CmsBlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  author: string;
  status: "draft" | "published";
  publishedAt?: string;
  tags: string[];
};

export type CmsFaq = {
  id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  published: boolean;
};

export type CmsMediaAsset = {
  id: string;
  name: string;
  url: string;
  type: "image" | "video" | "document";
  sizeKb: number;
  uploadedAt: string;
  tags: string[];
};

export type AgentDocument = {
  id: string;
  agentUserId: string;
  agentName: string;
  type: "license" | "id" | "certificate" | "contract";
  label: string;
  url: string;
  status: "pending" | "verified" | "rejected" | "expired";
  expiresAt?: string;
  uploadedAt: string;
};

export type AgentBranch = {
  id: string;
  name: string;
  city: string;
  province: string;
  address: string;
  phone: string;
  managerName: string;
  agentCount: number;
  active: boolean;
};

export type SeasonalRate = {
  id: string;
  listingId: string;
  listingTitle: string;
  label: string;
  startDate: string;
  endDate: string;
  nightlyRate: number;
  minStay: number;
};

export type RefundRequest = {
  id: string;
  enquiryId: string;
  guestName: string;
  listingTitle: string;
  amount: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "processed";
  createdAt: string;
};

export type EnterpriseOpsState = {
  escrowHolds: EscrowHold[];
  chargebacks: Chargeback[];
  coupons: Coupon[];
  scheduledCampaigns: ScheduledCampaign[];
  blogPosts: CmsBlogPost[];
  faqs: CmsFaq[];
  mediaAssets: CmsMediaAsset[];
  agentDocuments: AgentDocument[];
  agentBranches: AgentBranch[];
  seasonalRates: SeasonalRate[];
  refundRequests: RefundRequest[];
};
