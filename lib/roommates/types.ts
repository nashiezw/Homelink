export type LookingFor = "room" | "roommate";

export type Gender = "male" | "female" | "non_binary" | "prefer_not_to_say";
export type GenderPreference = "any" | Gender;

export type MaritalStatus = "single" | "married" | "divorced" | "widowed" | "partnered";
export type MaritalPreference = "any" | MaritalStatus;

export type Religion =
  | "christian"
  | "muslim"
  | "traditional"
  | "hindu"
  | "other"
  | "prefer_not_to_say";
export type ReligionPreference = "any" | Religion;

export type HouseholdType = "single" | "couple" | "small_family" | "large_family";

export type TenantPreferences = {
  acceptedHouseholdTypes: HouseholdType[];
  acceptedMaritalStatuses: MaritalStatus[];
  maxOccupants: number;
  genderPreference?: GenderPreference;
  minAge?: number;
  maxAge?: number;
};

export const GENDER_OPTIONS: Array<{ value: Gender; label: string }> = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export const MARITAL_OPTIONS: Array<{ value: MaritalStatus; label: string }> = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "partnered", label: "Partnered" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
];

export const RELIGION_OPTIONS: Array<{ value: Religion; label: string }> = [
  { value: "christian", label: "Christian" },
  { value: "muslim", label: "Muslim" },
  { value: "traditional", label: "Traditional" },
  { value: "hindu", label: "Hindu" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export const HOUSEHOLD_OPTIONS: Array<{ value: HouseholdType; label: string; occupants: number }> = [
  { value: "single", label: "Single person", occupants: 1 },
  { value: "couple", label: "Couple", occupants: 2 },
  { value: "small_family", label: "Small family (3-4)", occupants: 4 },
  { value: "large_family", label: "Large family (5+)", occupants: 6 },
];

export function householdOccupants(type: HouseholdType): number {
  return HOUSEHOLD_OPTIONS.find((o) => o.value === type)?.occupants ?? 1;
}

export function labelGender(value?: string) {
  return GENDER_OPTIONS.find((o) => o.value === value)?.label ?? "Any";
}

export function labelMarital(value?: string) {
  return MARITAL_OPTIONS.find((o) => o.value === value)?.label ?? "Any";
}

export function labelReligion(value?: string) {
  return RELIGION_OPTIONS.find((o) => o.value === value)?.label ?? "Any";
}

export function labelHousehold(value?: string) {
  return HOUSEHOLD_OPTIONS.find((o) => o.value === value)?.label ?? value ?? "";
}
