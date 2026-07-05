import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getPublicRoommateProfileFromPostgres, shouldUsePostgresRoommates } from "@/lib/roommates/postgres-roommate-repository";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const viewerId = getSessionUserIdFromRequest(request);
  if (shouldUsePostgresRoommates()) {
    const publicProfile = await getPublicRoommateProfileFromPostgres(userId);
    if (!publicProfile) {
      return problem(404, "PROFILE_NOT_FOUND", "This profile is not available.");
    }
    return ok(publicProfile);
  }
  const publicProfile = getStore().getPublicRoommateProfile(userId);

  if (!publicProfile) {
    return problem(404, "PROFILE_NOT_FOUND", "This profile is not available.");
  }

  const history = getStore().listResidenceHistory(userId, viewerId ?? undefined);
  return ok({ ...publicProfile, residenceHistory: history });
}
