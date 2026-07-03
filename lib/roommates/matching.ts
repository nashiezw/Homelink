import type { Listing } from "@/lib/types";
import type { RoommateProfile, RoommateMatch } from "@/lib/store/types";
import type {
  GenderPreference,
  HouseholdType,
  MaritalStatus,
  ReligionPreference,
} from "@/lib/roommates/types";
import { householdOccupants } from "@/lib/roommates/types";

type RoommateCandidate = {
  id: string;
  name: string;
  budgetMin: number;
  budgetMax: number;
  city: string;
  lifestyle: string;
  smoking: boolean;
  pets: boolean;
  gender: string;
  age: number;
  religion: string;
  maritalStatus: string;
  genderPreference: GenderPreference;
  religionPreference: ReligionPreference;
  maritalStatusPreference: string;
  preferredAgeMin: number;
  preferredAgeMax: number;
};

export const ROOMMATE_CANDIDATES: RoommateCandidate[] = [
  {
    id: "user_seeker_taku",
    name: "Taku",
    budgetMin: 120,
    budgetMax: 180,
    city: "Gweru",
    lifestyle: "Quiet student, non-smoker",
    smoking: false,
    pets: false,
    gender: "male",
    age: 22,
    religion: "christian",
    maritalStatus: "single",
    genderPreference: "any",
    religionPreference: "any",
    maritalStatusPreference: "any",
    preferredAgeMin: 20,
    preferredAgeMax: 28,
  },
  {
    id: "user_seeker_noma",
    name: "Noma",
    budgetMin: 180,
    budgetMax: 260,
    city: "Bulawayo",
    lifestyle: "Professional, pet friendly",
    smoking: false,
    pets: true,
    gender: "female",
    age: 29,
    religion: "christian",
    maritalStatus: "single",
    genderPreference: "female",
    religionPreference: "any",
    maritalStatusPreference: "single",
    preferredAgeMin: 24,
    preferredAgeMax: 35,
  },
  {
    id: "user_seeker_rudo",
    name: "Rudo",
    budgetMin: 220,
    budgetMax: 320,
    city: "Harare",
    lifestyle: "Hybrid worker, early mornings",
    smoking: false,
    pets: false,
    gender: "female",
    age: 27,
    religion: "christian",
    maritalStatus: "single",
    genderPreference: "any",
    religionPreference: "christian",
    maritalStatusPreference: "any",
    preferredAgeMin: 23,
    preferredAgeMax: 32,
  },
  {
    id: "user_seeker_farai",
    name: "Farai",
    budgetMin: 150,
    budgetMax: 220,
    city: "Harare",
    lifestyle: "Muslim professional, quiet household",
    smoking: false,
    pets: false,
    gender: "male",
    age: 31,
    religion: "muslim",
    maritalStatus: "married",
    genderPreference: "male",
    religionPreference: "muslim",
    maritalStatusPreference: "any",
    preferredAgeMin: 25,
    preferredAgeMax: 40,
  },
];

function prefMatches(preference: string, value: string) {
  return preference === "any" || !preference || preference === value;
}

function ageInRange(age: number, min: number, max: number) {
  return age >= min && age <= max;
}

function scoreRoommatePair(profile: RoommateProfile, candidate: RoommateCandidate): { score: number; reasons: string[] } {
  let score = 62;
  const reasons: string[] = [];

  const budgetOverlap =
    candidate.budgetMax >= profile.budgetMin && candidate.budgetMin <= profile.budgetMax;
  if (budgetOverlap) {
    score += 12;
    reasons.push("Budget overlap");
  }

  if (
    profile.preferredLocations.some((loc) =>
      loc.toLowerCase().includes(candidate.city.toLowerCase()),
    )
  ) {
    score += 10;
    reasons.push("Preferred location");
  }

  if (profile.pets === candidate.pets) {
    score += 4;
    reasons.push(profile.pets ? "Both pet friendly" : "No pets");
  }

  if (profile.smoking === candidate.smoking) {
    score += 4;
    reasons.push(profile.smoking ? "Smoking preference aligned" : "Non-smoking");
  }

  if (prefMatches(profile.genderPreference, candidate.gender)) {
    score += 5;
    reasons.push("Gender preference match");
  }

  if (prefMatches(candidate.genderPreference, profile.gender)) {
    score += 4;
  }

  if (prefMatches(profile.religionPreference, candidate.religion)) {
    score += 4;
    reasons.push("Religion preference match");
  }

  if (prefMatches(profile.maritalStatusPreference, candidate.maritalStatus)) {
    score += 4;
    reasons.push("Marital status aligned");
  }

  if (ageInRange(candidate.age, profile.preferredAgeMin, profile.preferredAgeMax)) {
    score += 6;
    reasons.push("Age within your range");
  }

  if (ageInRange(profile.age, candidate.preferredAgeMin, candidate.preferredAgeMax)) {
    score += 4;
    reasons.push("You fit their age range");
  }

  if (profile.lifestyle && candidate.lifestyle.toLowerCase().includes(profile.lifestyle.toLowerCase())) {
    score += 3;
    reasons.push("Similar lifestyle");
  }

  return { score: Math.min(score, 98), reasons };
}

export function matchRoommates(
  profile: RoommateProfile,
  extraCandidates: Array<RoommateCandidate & { photoUrl?: string }> = [],
): RoommateMatch[] {
  const all: Array<RoommateCandidate & { photoUrl?: string }> = [...ROOMMATE_CANDIDATES, ...extraCandidates];
  return all
    .map((candidate) => {
      const { score, reasons } = scoreRoommatePair(profile, candidate);
      return {
        id: candidate.id,
        kind: "roommate" as const,
        name: candidate.name,
        budget: `$${candidate.budgetMin} - $${candidate.budgetMax}`,
        city: candidate.city,
        lifestyle: candidate.lifestyle,
        compatibility: score,
        matchReasons: reasons,
        gender: candidate.gender,
        age: candidate.age,
        religion: candidate.religion,
        maritalStatus: candidate.maritalStatus,
        image: candidate.photoUrl,
      };
    })
    .filter((m) => m.compatibility >= 70)
    .sort((a, b) => b.compatibility - a.compatibility);
}

export function listingAcceptsProfile(listing: Listing, profile: RoommateProfile): { ok: boolean; reasons: string[] } {
  const prefs = listing.tenantPreferences;
  if (!prefs) {
    return { ok: true, reasons: ["Open to all tenants"] };
  }

  const reasons: string[] = [];
  const occupants = profile.householdSize || householdOccupants(profile.householdType as HouseholdType);

  if (!prefs.acceptedHouseholdTypes.includes(profile.householdType as HouseholdType)) {
    return { ok: false, reasons: [] };
  }
  reasons.push(`Accepts ${profile.householdType.replace("_", " ")}`);

  if (!prefs.acceptedMaritalStatuses.includes(profile.maritalStatus as MaritalStatus)) {
    return { ok: false, reasons: [] };
  }
  reasons.push("Marital status accepted");

  if (occupants > prefs.maxOccupants) {
    return { ok: false, reasons: [] };
  }
  reasons.push(`Fits max ${prefs.maxOccupants} occupants`);

  if (prefs.genderPreference && prefs.genderPreference !== "any" && prefs.genderPreference !== profile.gender) {
    return { ok: false, reasons: [] };
  }
  if (prefs.genderPreference && prefs.genderPreference !== "any") {
    reasons.push("Gender preference match");
  }

  if (prefs.minAge && profile.age < prefs.minAge) return { ok: false, reasons: [] };
  if (prefs.maxAge && profile.age > prefs.maxAge) return { ok: false, reasons: [] };
  if (prefs.minAge || prefs.maxAge) reasons.push("Age requirement met");

  return { ok: true, reasons };
}

export function scoreRoomListing(listing: Listing, profile: RoommateProfile): RoommateMatch | null {
  const { ok, reasons } = listingAcceptsProfile(listing, profile);
  if (!ok) return null;

  let score = 68;
  if (listing.price >= profile.budgetMin && listing.price <= profile.budgetMax) {
    score += 14;
    reasons.push("Within budget");
  } else if (listing.price <= profile.budgetMax * 1.1) {
    score += 6;
    reasons.push("Near budget");
  } else {
    return null;
  }

  if (
    profile.preferredLocations.some(
      (loc) =>
        loc.toLowerCase().includes(listing.city.toLowerCase()) ||
        loc.toLowerCase().includes(listing.suburb.toLowerCase()),
    )
  ) {
    score += 10;
    reasons.push("Preferred area");
  }

  if (listing.verified) {
    score += 4;
    reasons.push("Verified listing");
  }

  return {
    id: listing.id,
    kind: "room" as const,
    name: listing.landlordName,
    title: listing.title,
    budget: `$${listing.price}/month`,
    city: `${listing.suburb}, ${listing.city}`,
    lifestyle: listing.highlight,
    compatibility: Math.min(score, 98),
    matchReasons: reasons,
    listingId: listing.id,
    image: listing.image,
    householdType: profile.householdType,
    maritalStatus: profile.maritalStatus,
  };
}

export function matchRooms(listings: Listing[], profile: RoommateProfile): RoommateMatch[] {
  return listings
    .filter((l) => l.intent === "rent" && (l.type === "room" || l.type === "flat" || l.type === "cottage"))
    .map((listing) => scoreRoomListing(listing, profile))
    .filter((m): m is RoommateMatch => m !== null)
    .sort((a, b) => b.compatibility - a.compatibility);
}
