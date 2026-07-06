import { ok, problem } from "@/lib/api/response";
import {
  listPublicRoommateProfilesFromPostgres,
  shouldUsePostgresRoommates,
} from "@/lib/roommates/postgres-roommate-repository";
import { getStore } from "@/lib/store/app-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 12) || 12, 50);
    if (shouldUsePostgresRoommates()) {
      return ok({ profiles: await listPublicRoommateProfilesFromPostgres(limit) });
    }

    const profiles = getStore()
      .listRoommateProfilesAdmin()
      .filter((profile) => profile.active !== false)
      .slice(0, limit)
      .map((profile) => ({
        userId: profile.userId,
        name: getStore().getUserById(profile.userId)?.name ?? "HomeLink member",
        city: Array.isArray(profile.preferredLocations) ? profile.preferredLocations[0] : undefined,
        profile,
      }));
    return ok({ profiles });
  } catch (error) {
    console.error("Failed to list roommate profiles", error);
    return problem(500, "ROOMMATE_PROFILES_READ_FAILED", "Roommate profiles could not be loaded.");
  }
}
