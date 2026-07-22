import type { ListingQuery } from "@/lib/api/listing-service";
import type { PropertyType } from "@/lib/types";

const knownCities = ["harare", "bulawayo", "gweru", "kwekwe", "mutare"];
const propertyTypes: PropertyType[] = [
  "room",
  "boarding_house",
  "house",
  "flat",
  "cottage",
  "commercial",
  "land",
  "holiday_home",
];
const amenities = [
  "solar",
  "borehole",
  "wifi",
  "wi-fi",
  "parking",
  "water tank",
  "security",
  "garden",
  "furnished",
  "pets",
];

export function parseNaturalLanguageSearch(query: string): ListingQuery & {
  originalQuery: string;
  confidence: number;
} {
  const normalized = query.toLowerCase();
  const maxPrice = normalized.match(/(?:under|below|less than|max|maximum)\s*\$?\s*(\d+)/);
  const bedrooms = normalized.match(/(\d+)\s*(?:bed|bedroom)/);
  const bathrooms = normalized.match(/(\d+)\s*(?:bath|bathroom)/);
  const city = knownCities.find((candidate) => normalized.includes(candidate));
  let type = propertyTypes.find((candidate) => normalized.includes(candidate.replace("_", " ")));
  if (normalized.includes("holiday") || normalized.includes("vacation") || normalized.includes("getaway")) {
    type = "holiday_home";
  }
  if (normalized.match(/\b(boarding|student|campus|university|college|school|hostel|dorm)\b/)) {
    type = "boarding_house";
  }
  const suburb = normalized.includes("cbd")
    ? normalized.includes("kwekwe")
      ? "Newtown"
      : "CBD"
    : undefined;
  const extractedAmenities = amenities
    .filter((amenity) => normalized.includes(amenity))
    .map((amenity) => (amenity === "wifi" ? "Wi-Fi" : amenity));

  return {
    originalQuery: query,
    confidence: 0.78,
    city: city ? titleCase(city) : undefined,
    suburb,
    intent: normalized.includes("buy") || normalized.includes("purchase") ? "buy" : "rent",
    type,
    maxPrice: maxPrice ? Number(maxPrice[1]) : undefined,
    bedrooms: bedrooms ? Number(bedrooms[1]) : undefined,
    bathrooms: bathrooms ? Number(bathrooms[1]) : undefined,
    amenities: extractedAmenities,
    availableNow: normalized.includes("available now") ? true : undefined,
  };
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
