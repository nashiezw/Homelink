import type { PublicPlatformConfig } from "@/lib/settings/types";
import type { PropertyType } from "@/lib/types";

const PROPERTY_LABELS: Record<string, string> = {
  room: "Room",
  house: "House",
  flat: "Flat / Apartment",
  cottage: "Cottage",
  holiday_home: "Holiday Home",
  commercial: "Commercial",
  land: "Land",
};

export function getPropertyTypeOptions(config: PublicPlatformConfig | null): Array<{ value: PropertyType; label: string }> {
  const types = config?.propertyTypes?.length
    ? config.propertyTypes
    : ["room", "house", "flat", "cottage", "holiday_home", "commercial", "land"];
  return types
    .filter((t): t is PropertyType => t in PROPERTY_LABELS || true)
    .map((value) => ({
      value: value as PropertyType,
      label: PROPERTY_LABELS[value] ?? value.replace(/_/g, " "),
    }));
}

export function getAmenityOptions(config: PublicPlatformConfig | null): string[] {
  if (!config?.amenities?.length) {
    return ["Furnished", "Wi-Fi", "Parking", "Borehole", "Solar backup", "Pet friendly", "Security", "Garden"];
  }
  return config.amenities.map((a) => a.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
}
