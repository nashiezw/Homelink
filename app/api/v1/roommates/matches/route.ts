import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { isRoommateMatchingEnabled } from "@/lib/features";
import { created, ok, problem } from "@/lib/api/response";
import { householdOccupants } from "@/lib/roommates/types";
import { getStore } from "@/lib/store/app-store";
import type { RoommateProfile } from "@/lib/store/types";

function parseProfileBody(body: Record<string, unknown>): Partial<RoommateProfile> {
  const householdType = typeof body.householdType === "string" ? body.householdType : "single";
  const householdSize =
    body.householdSize !== undefined && body.householdSize !== ""
      ? Number(body.householdSize)
      : householdOccupants(householdType as import("@/lib/roommates/types").HouseholdType);

  return {
    lookingFor: body.lookingFor === "room" ? "room" : "roommate",
    budgetMin: Number(body.budgetMin) || 100,
    budgetMax: Number(body.budgetMax) || 300,
    occupation: typeof body.occupation === "string" ? body.occupation : "",
    preferredLocations: Array.isArray(body.preferredLocations)
      ? (body.preferredLocations as string[])
      : String(body.preferredLocations ?? "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
    lifestyle: typeof body.lifestyle === "string" ? body.lifestyle : "",
    smoking: Boolean(body.smoking),
    pets: Boolean(body.pets),
    furnished: Boolean(body.furnished),
    availableNow: Boolean(body.availableNow),
    gender: typeof body.gender === "string" ? body.gender : "prefer_not_to_say",
    genderPreference: typeof body.genderPreference === "string" ? body.genderPreference : "any",
    age: Number(body.age) || 25,
    preferredAgeMin: Number(body.preferredAgeMin) || 20,
    preferredAgeMax: Number(body.preferredAgeMax) || 35,
    religion: typeof body.religion === "string" ? body.religion : "prefer_not_to_say",
    religionPreference: typeof body.religionPreference === "string" ? body.religionPreference : "any",
    maritalStatus: typeof body.maritalStatus === "string" ? body.maritalStatus : "single",
    maritalStatusPreference:
      typeof body.maritalStatusPreference === "string" ? body.maritalStatusPreference : "any",
    householdType,
    householdSize: Number.isFinite(householdSize) ? householdSize : 1,
    moveInDate: typeof body.moveInDate === "string" ? body.moveInDate : undefined,
    bio: typeof body.bio === "string" ? body.bio : "",
    photoUrl: typeof body.photoUrl === "string" ? body.photoUrl : undefined,
    photos: Array.isArray(body.photos) ? (body.photos as string[]) : undefined,
    active: body.active !== false,
    suburb: typeof body.suburb === "string" ? body.suburb : "",
  };
}

export function GET(request: Request) {
  if (!isRoommateMatchingEnabled()) {
    return problem(503, "FEATURE_DISABLED", "Roommate matching is currently disabled.");
  }
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to view roommate matches.");
  }
  const store = getStore();
  const profile = store.getRoommateProfile(userId);
  const matches = store.getRoommateMatches(userId);
  return ok({ profile, matches, count: matches.length });
}

export async function POST(request: Request) {
  if (!isRoommateMatchingEnabled()) {
    return problem(503, "FEATURE_DISABLED", "Roommate matching is currently disabled.");
  }
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return problem(401, "UNAUTHORIZED", "Sign in to save your roommate profile.");
  }
  const body = await request.json();
  const store = getStore();
  const profile = store.saveRoommateProfile(userId, parseProfileBody(body));
  const matches = store.getRoommateMatches(userId);
  return created({ profile, matches, count: matches.length });
}
