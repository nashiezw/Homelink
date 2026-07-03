import type { HolidayHomeDetails, HolidayHomeSettings } from "@/lib/holiday-homes/types";

export const defaultHolidayHomeSettings: HolidayHomeSettings = {
  minNightlyRate: 25,
  maxNightlyRate: 2500,
  defaultCheckInTime: "14:00",
  defaultCheckOutTime: "10:00",
  requireAdminApproval: true,
  allowInstantEnquiry: true,
};

export const HOLIDAY_AMENITY_LABELS: Record<keyof Pick<
  HolidayHomeDetails,
  | "wifiAvailable"
  | "swimmingPool"
  | "airConditioning"
  | "kitchen"
  | "braaiArea"
  | "parking"
  | "petFriendly"
  | "wheelchairAccessible"
>, string> = {
  wifiAvailable: "Wi-Fi available",
  swimmingPool: "Swimming pool",
  airConditioning: "Air conditioning",
  kitchen: "Kitchen",
  braaiArea: "Braai area",
  parking: "Parking",
  petFriendly: "Pet friendly",
  wheelchairAccessible: "Wheelchair accessible",
};

export function createDefaultHolidayHomeDetails(
  nightlyRate: number,
  partial?: Partial<HolidayHomeDetails>,
): HolidayHomeDetails {
  return {
    nightlyRate,
    weeklyRate: partial?.weeklyRate,
    monthlyRate: partial?.monthlyRate,
    minimumStay: partial?.minimumStay ?? 2,
    maximumGuests: partial?.maximumGuests ?? 4,
    checkInTime: partial?.checkInTime ?? defaultHolidayHomeSettings.defaultCheckInTime,
    checkOutTime: partial?.checkOutTime ?? defaultHolidayHomeSettings.defaultCheckOutTime,
    cleaningFee: partial?.cleaningFee,
    securityDeposit: partial?.securityDeposit,
    houseRules: partial?.houseRules,
    nearbyAttractions: partial?.nearbyAttractions,
    destination: partial?.destination,
    wifiAvailable: partial?.wifiAvailable ?? true,
    swimmingPool: partial?.swimmingPool ?? false,
    airConditioning: partial?.airConditioning ?? false,
    kitchen: partial?.kitchen ?? true,
    braaiArea: partial?.braaiArea ?? false,
    parking: partial?.parking ?? true,
    petFriendly: partial?.petFriendly ?? false,
    wheelchairAccessible: partial?.wheelchairAccessible ?? false,
  };
}
