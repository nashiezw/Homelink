import { getStore, toPublicListing } from "@/lib/store/app-store";
import type { Listing, PropertyType } from "@/lib/types";
import type { GenderPreference, HouseholdType, MaritalStatus } from "@/lib/roommates/types";
import { householdOccupants } from "@/lib/roommates/types";

export type ListingQuery = {
  city?: string;
  suburb?: string;
  intent?: "rent" | "buy";
  type?: PropertyType;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  verifiedOnly?: boolean;
  availableNow?: boolean;
  gender?: GenderPreference;
  maritalStatus?: MaritalStatus;
  householdType?: HouseholdType;
  householdSize?: number;
  ageMin?: number;
  ageMax?: number;
  religion?: string;
  destination?: string;
  minGuests?: number;
  pool?: boolean;
  wifi?: boolean;
  petFriendly?: boolean;
  checkIn?: string;
};

export function listListings(query: ListingQuery = {}) {
  const listings = getStore()
    .listListings()
    .filter((listing) => listing.status === "ACTIVE" || listing.status === "PENDING_REVIEW")
    .map(toPublicListing);
  return listings.filter((listing) => matchesListing(listing, query));
}

export function getListing(id: string) {
  const listing = getStore().getListing(id);
  if (!listing) {
    return undefined;
  }
  if (listing.status === "ACTIVE" || listing.status === "PENDING_REVIEW") {
    getStore().incrementListingMetric(id, "views");
  }
  return toPublicListing(listing);
}

export function matchesListing(listing: Listing, query: ListingQuery) {
  const normalAmenities = listing.amenities.map(normalize);

  if (query.city && !normalize(listing.city).includes(normalize(query.city))) {
    return false;
  }

  if (query.suburb && !normalize(listing.suburb).includes(normalize(query.suburb))) {
    return false;
  }

  if (query.intent && listing.intent !== query.intent) {
    return false;
  }

  if (query.type && listing.type !== query.type) {
    return false;
  }

  if (query.minPrice && listing.price < query.minPrice) {
    return false;
  }

  if (query.maxPrice && listing.price > query.maxPrice) {
    return false;
  }

  if (query.bedrooms && listing.bedrooms < query.bedrooms) {
    return false;
  }

  if (query.bathrooms && listing.bathrooms < query.bathrooms) {
    return false;
  }

  if (query.verifiedOnly && !listing.verified) {
    return false;
  }

  if (query.availableNow && normalize(listing.availableFrom) !== "available now") {
    return false;
  }

  if (query.amenities?.length) {
    const amenityMatch = query.amenities.every((amenity) =>
      normalAmenities.some((candidate) => candidate.includes(normalize(amenity))),
    );
    if (!amenityMatch) return false;
  }

  if (query.householdType || query.maritalStatus || query.gender || query.householdSize || query.ageMin) {
    const prefs = listing.tenantPreferences;
    if (!prefs) return true;

    if (query.householdType && !prefs.acceptedHouseholdTypes.includes(query.householdType)) {
      return false;
    }
    if (query.maritalStatus && !prefs.acceptedMaritalStatuses.includes(query.maritalStatus)) {
      return false;
    }
    const occupants =
      query.householdSize ??
      (query.householdType ? householdOccupants(query.householdType) : undefined);
    if (occupants && occupants > prefs.maxOccupants) {
      return false;
    }
    if (
      query.gender &&
      query.gender !== "any" &&
      prefs.genderPreference &&
      prefs.genderPreference !== "any" &&
      prefs.genderPreference !== query.gender
    ) {
      return false;
    }
    if (query.ageMin && prefs.maxAge && query.ageMin > prefs.maxAge) return false;
    if (query.ageMax && prefs.minAge && query.ageMax < prefs.minAge) return false;
  }

  if (listing.type === "holiday_home" && listing.holidayHome) {
    const hh = listing.holidayHome;
    if (query.destination) {
      const dest = `${hh.destination ?? listing.city}`.toLowerCase();
      if (!dest.includes(query.destination.toLowerCase())) return false;
    }
    if (query.maxPrice && hh.nightlyRate > query.maxPrice) return false;
    if (query.minGuests && hh.maximumGuests < query.minGuests) return false;
    if (query.pool && !hh.swimmingPool) return false;
    if (query.wifi && !hh.wifiAvailable) return false;
    if (query.petFriendly && !hh.petFriendly) return false;
  }

  return true;
}

export function parseListingQuery(searchParams: URLSearchParams): ListingQuery {
  return {
    city: optional(searchParams.get("city")),
    suburb: optional(searchParams.get("suburb")),
    intent: intent(searchParams.get("intent")),
    type: propertyType(searchParams.get("type")),
    minPrice: numberParam(searchParams.get("minPrice")),
    maxPrice: numberParam(searchParams.get("maxPrice")),
    bedrooms: numberParam(searchParams.get("bedrooms")),
    bathrooms: numberParam(searchParams.get("bathrooms")),
    amenities: searchParams.getAll("amenities").length
      ? searchParams.getAll("amenities")
      : searchParams.get("amenities")?.split(",").filter(Boolean),
    verifiedOnly:
      booleanParam(searchParams.get("verifiedOnly")) ??
      booleanParam(searchParams.get("verified")),
    availableNow: booleanParam(searchParams.get("availableNow")),
    gender: genderParam(searchParams.get("gender")),
    maritalStatus: maritalParam(searchParams.get("maritalStatus")),
    householdType: householdParam(searchParams.get("householdType")),
    householdSize: numberParam(searchParams.get("householdSize")),
    ageMin: numberParam(searchParams.get("ageMin")),
    ageMax: numberParam(searchParams.get("ageMax")),
    religion: optional(searchParams.get("religion")),
    destination: optional(searchParams.get("destination")),
    minGuests: numberParam(searchParams.get("minGuests")),
    pool: booleanParam(searchParams.get("pool")),
    wifi: booleanParam(searchParams.get("wifi")),
    petFriendly: booleanParam(searchParams.get("petFriendly")),
    checkIn: optional(searchParams.get("checkIn")),
  };
}

function optional(value: string | null) {
  return value?.trim() || undefined;
}

function numberParam(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function booleanParam(value: string | null) {
  return value === "true" ? true : undefined;
}

function intent(value: string | null) {
  return value === "rent" || value === "buy" ? value : undefined;
}

function propertyType(value: string | null): PropertyType | undefined {
  const allowed = ["room", "house", "flat", "cottage", "commercial", "land", "holiday_home"];
  return allowed.includes(value ?? "") ? (value as PropertyType) : undefined;
}

function genderParam(value: string | null): GenderPreference | undefined {
  const allowed = ["any", "male", "female", "non_binary", "prefer_not_to_say"];
  return allowed.includes(value ?? "") ? (value as GenderPreference) : undefined;
}

function maritalParam(value: string | null): MaritalStatus | undefined {
  const allowed = ["single", "married", "divorced", "widowed", "partnered"];
  return allowed.includes(value ?? "") ? (value as MaritalStatus) : undefined;
}

function householdParam(value: string | null): HouseholdType | undefined {
  const allowed = ["single", "couple", "small_family", "large_family"];
  return allowed.includes(value ?? "") ? (value as HouseholdType) : undefined;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
