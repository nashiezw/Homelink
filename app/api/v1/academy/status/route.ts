import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getAcademyUserStatus } from "@/lib/academy/academy-user-status";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to view your Academy status.");

  try {
    return ok(await getAcademyUserStatus(userId));
  } catch (error) {
    console.error("Failed to load Academy user status", error);
    return problem(500, "ACADEMY_STATUS_FAILED", "Your Academy status could not be loaded.");
  }
}
