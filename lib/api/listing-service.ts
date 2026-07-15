import { getStore, toPublicListing } from "@/lib/store/app-store";
import type { Listing, PropertyType } from "@/lib/types";
import type { GenderPreference, HouseholdType, MaritalStatus } from "@/lib/roommates/types";
import { householdOccupants } from "@/lib/roommates/types";
import { isPublicListingStatus } from "@/lib/listings/status";

export type ListingQuery = {
  location?: string;
  city?: string;
  suburb?: string;
  intent?: "rent" | "buy";
  type?: PropertyType;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  nearby?: string;
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

export type ListingPagination = {
  limit: number;
  cursor?: string;
};

export type ListingSort = "newest" | "price_asc" | "price_desc" | "verified";

export const DEFAULT_LISTINGS_LIMIT = 24;
export const MAX_LISTINGS_LIMIT = 60;

export function listListings(query: ListingQuery = {}) {
  const listings = getStore()
    .listListings()
    .filter((listing) => isPublicListingStatus(listing.status))
    .map(toPublicListing);
  return listings.filter((listing) => matchesListing(listing, query));
}

export function paginateListings<T extends { id: string }>(
  listings: T[],
  pagination: ListingPagination,
) {
  const offset = pagination.cursor ? decodeOffsetCursor(pagination.cursor) : 0;
  const safeOffset = Math.max(0, Math.min(offset, listings.length));
  const page = listings.slice(safeOffset, safeOffset + pagination.limit);
  const nextOffset = safeOffset + page.length;
  return {
    items: page,
    nextCursor: nextOffset < listings.length ? encodeOffsetCursor(nextOffset) : null,
    hasMore: nextOffset < listings.length,
  };
}

export function sortListings<T extends Listing>(listings: T[], sort: ListingSort) {
  return [...listings].sort((a, b) => {
    if (sort === "price_asc") return a.price - b.price || a.title.localeCompare(b.title);
    if (sort === "price_desc") return b.price - a.price || a.title.localeCompare(b.title);
    if (sort === "verified") {
      const aVerified = Number(Boolean(a.verified || a.landlordVerified));
      const bVerified = Number(Boolean(b.verified || b.landlordVerified));
      return bVerified - aVerified || a.title.localeCompare(b.title);
    }
    return 0;
  });
}

export function getListing(id: string, options: { incrementViews?: boolean } = {}) {
  const listing = getStore().getListing(id);
  if (!listing) {
    return undefined;
  }
  if (options.incrementViews && isPublicListingStatus(listing.status)) {
    getStore().incrementListingMetric(id, "views");
  }
  return toPublicListing(listing);
}

export function matchesListing(listing: Listing, query: ListingQuery) {
  const normalAmenities = listing.amenities.map(normalize);

  if (query.location) {
    const location = normalize(query.location);
    const locationTokens = location.split(" ").filter(Boolean);
    const locationHaystack = normalize([
      listing.city,
      listing.suburb,
      listing.title,
      ...listing.nearby,
    ].join(" "));
    if (!locationTokens.every((token) => locationHaystack.includes(token))) {
      return false;
    }
  }

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

  if (query.nearby && !matchesNearbyLayer(listing, query.nearby)) {
    return false;
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
    location: optional(searchParams.get("location")),
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
    nearby: nearbyLayer(searchParams.get("nearby")),
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

export function parseListingPagination(searchParams: URLSearchParams): ListingPagination {
  return {
    limit: clampLimit(searchParams.get("limit")),
    cursor: optional(searchParams.get("cursor")),
  };
}

export function parseListingSort(searchParams: URLSearchParams): ListingSort {
  const value = searchParams.get("sort");
  return value === "price_asc" || value === "price_desc" || value === "verified" ? value : "newest";
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

function clampLimit(value: string | null) {
  const parsed = numberParam(value);
  if (!parsed) return DEFAULT_LISTINGS_LIMIT;
  return Math.min(Math.max(Math.floor(parsed), 1), MAX_LISTINGS_LIMIT);
}

function encodeOffsetCursor(offset: number) {
  return Buffer.from(JSON.stringify({ offset }), "utf8").toString("base64url");
}

function decodeOffsetCursor(cursor: string) {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as { offset?: unknown };
    return typeof parsed.offset === "number" && Number.isFinite(parsed.offset) ? Math.max(0, Math.floor(parsed.offset)) : 0;
  } catch {
    return 0;
  }
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

function nearbyLayer(value: string | null) {
  const allowed = ["schools", "hospitals", "shops", "transport", "cbd", "security"];
  return allowed.includes(value ?? "") ? value ?? undefined : undefined;
}

function matchesNearbyLayer(listing: Listing, layer: string) {
  if (layer === "cbd") {
    return Number.isFinite(listing.distanceToCbdKm);
  }
  const patterns: Record<string, RegExp> = {
    schools: /\b(school|college|university|campus|uz|msu|teacher)/i,
    hospitals: /\b(hospital|clinic|medical|mater dei|health)/i,
    shops: /\b(shop|shops|centre|center|mall|village|ok |market|retail|cbd)/i,
    transport: /\b(transport|kombi|bus|road|walk|walking|commute|access|route)/i,
    security: /\b(security|secure|wall|walled|gate|gated|guard|safe)/i,
  };
  const pattern = patterns[layer];
  if (!pattern) return true;
  const haystack = [
    listing.title,
    listing.description,
    listing.highlight,
    listing.city,
    listing.suburb,
    ...listing.amenities,
    ...listing.nearby,
  ].join(" ");
  return pattern.test(haystack);
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
