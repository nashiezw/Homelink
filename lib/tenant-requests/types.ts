import type { Listing } from "@/lib/types";

export type TenantRequestStatus = "NEW" | "MATCHED" | "CONTACTED" | "CLOSED" | "CANCELLED" | "EXPIRED";

export type TenantRequestInput = {
  intent: "rent" | "buy";
  name: string;
  phone: string;
  email?: string;
  clientType?: "individual" | "family" | "company" | "investor" | "diaspora" | "other";
  propertyType: "house" | "cottage" | "flat" | "room" | "room-share" | "land" | "commercial" | "holiday_home" | "other";
  bedrooms?: number;
  bathrooms?: number;
  ensuite: "required" | "preferred" | "not_needed";
  preferredAreas: string[];
  alternativeAreas: string[];
  maxBudget?: number;
  minBudget?: number;
  moveInDate?: string;
  checkOutDate?: string;
  leaseLength?: string;
  purchaseReadiness?: "cash_ready" | "mortgage" | "payment_plan" | "still_browsing" | "other";
  timeline?: "ready_now" | "one_to_three_months" | "three_to_six_months" | "flexible";
  adults?: number;
  children?: number;
  mustHaves: string[];
  notes?: string;
  source?: string;
};

export type TenantRequestMatch = {
  listingId: string;
  listingTitle: string;
  slug?: string;
  city: string;
  suburb: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  score: number;
  label: "strong_match" | "possible_match" | "nearby" | "over_budget";
  reasons: string[];
  notifiedAt?: string;
  manuallyNotifiedAt?: string;
};

export type TenantRequestRecord = TenantRequestInput & {
  id: string;
  seekerId: string;
  status: TenantRequestStatus;
  assignedAgentId?: string;
  assignedAgentName?: string;
  expiresAt: string;
  matches: TenantRequestMatch[];
  activities: Array<{
    id: string;
    type: "CREATED" | "MATCHED" | "NOTIFIED" | "STATUS_CHANGED" | "NOTE_ADDED" | "ASSIGNED" | "EXTENDED";
    message: string;
    actorId?: string;
    actorName?: string;
    listingId?: string;
    createdAt: string;
  }>;
  adminNotes: Array<{
    id: string;
    body: string;
    authorId: string;
    authorName: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type TenantRequestWithMatches = TenantRequestRecord & {
  recommendedListings: Array<TenantRequestMatch & { listing?: Listing }>;
};
