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
