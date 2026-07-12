import type { TenantPreferences } from "@/lib/roommates/types";
import type { HolidayHomeDetails } from "@/lib/holiday-homes/types";
import type { ListingWorkflowStatus } from "@/lib/listings/status";

export type ListingIntent = "rent" | "buy";

export type PropertyType =
  | "room"
  | "house"
  | "flat"
  | "cottage"
  | "commercial"
  | "land"
  | "holiday_home";

export type VirtualTourScene = {
  id: string;
  title: string;
  imageUrl: string;
  sortOrder: number;
  hotspots?: Array<{
    id: string;
    label: string;
    targetSceneId?: string;
    x: number;
    y: number;
  }>;
};

export type ListingVirtualTour = {
  id?: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "HIDDEN";
  provider: "INTERNAL" | "EXTERNAL";
  externalUrl?: string;
  coverSceneId?: string;
  adminVerifiedAt?: string;
  scenes: VirtualTourScene[];
  analytics?: {
    totalViews: number;
    uniqueScenesViewed: number;
    lastViewedAt?: string;
  };
};

export type ViewingAppointmentStatus =
  | "REQUESTED"
  | "CONFIRMED"
  | "RESCHEDULED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

export type ViewingAppointment = {
  id: string;
  referenceNumber: string;
  listingId: string;
  enquiryId?: string;
  seekerId?: string;
  seekerName: string;
  seekerEmail?: string;
  seekerPhone?: string;
  agentId?: string;
  agentName?: string;
  startAt: string;
  endAt: string;
  status: ViewingAppointmentStatus;
  location: string;
  notes?: string;
  reminderAt?: string;
  confirmedAt?: string;
  rescheduledAt?: string;
  cancelledAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type MarketInsight = {
  id?: string;
  city: string;
  suburb: string;
  propertyType: string;
  intent: ListingIntent;
  listingId?: string;
  sampleSize: number;
  medianPrice: number;
  averagePrice: number;
  recommendedPriceMin: number;
  recommendedPriceMax: number;
  demandScore: number;
  vacancyRisk: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  confidenceScore?: number;
  priceTrend?: Array<{ period: string; medianPrice: number; sampleSize: number }>;
  comparableListingIds: string[];
  notes: string[];
  createdAt?: string;
};

export type Listing = {
  id: string;
  slug?: string;
  title: string;
  city: string;
  suburb: string;
  price: number;
  currency: "USD";
  intent: ListingIntent;
  type: PropertyType;
  bedrooms: number;
  bathrooms: number;
  image: string;
  images?: string[];
  videos?: string[];
  virtualTour?: ListingVirtualTour;
  verified: boolean;
  availableFrom: string;
  amenities: string[];
  description: string;
  landlordName: string;
  landlordVerified: boolean;
  phone: string;
  whatsapp: string;
  distanceToCbdKm: number;
  nearby: string[];
  views: number;
  saves: number;
  enquiries: number;
  trustScore: number;
  highlight: string;
  tenantPreferences?: TenantPreferences;
  holidayHome?: HolidayHomeDetails;
  listingDetails?: {
    priceBasis?: "monthly" | "total" | "nightly" | "per_sqm";
    depositAmount?: number;
    leaseTerm?: string;
    utilitiesIncluded?: boolean;
    sharedBathroom?: boolean;
    kitchenAccess?: boolean;
    childrenAllowed?: boolean;
    smokingAllowed?: boolean;
    petsAllowed?: boolean;
    parkingSpaces?: number;
    floorAreaSqm?: number;
    landSizeSqm?: number;
    zoning?: string;
    roadAccess?: string;
    waterSource?: string;
    powerAvailable?: boolean;
    commercialUse?: string;
  };
  latitude?: number;
  longitude?: number;
  status?: ListingWorkflowStatus;
};

export type CityMarket = {
  name: string;
  listingCount: number;
  averageRent: string;
  highlights: string[];
};
