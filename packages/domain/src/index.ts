export type ListingIntent = "rent" | "buy";

export type PropertyType =
  | "room"
  | "house"
  | "flat"
  | "cottage"
  | "commercial"
  | "land";

export type ApiEnvelope<T> = {
  data: T;
  meta: {
    requestId: string;
    nextCursor?: string | null;
  };
};

export type ListingSearchFilters = {
  city?: string;
  suburb?: string;
  intent?: ListingIntent;
  type?: PropertyType;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  verifiedOnly?: boolean;
  availableNow?: boolean;
};
