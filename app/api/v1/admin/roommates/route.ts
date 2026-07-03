import { requireAdmin } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const lookingFor = searchParams.get("lookingFor") ?? undefined;

  const store = getStore();
  return ok({
    analytics: store.getRoommateAdminAnalytics(),
    profiles: store.listRoommateProfilesAdmin({ q, status, lookingFor }),
  });
}

export async function PATCH(request: Request) {
  const auth = requireAdmin(request);
  if (auth.error || !auth.user) return auth.error ?? problem(401, "UNAUTHORIZED", "Admin required.");

  const body = await request.json();
  const { userId, action, bio, notes } = body as {
    userId?: string;
    action?: string;
    bio?: string;
    notes?: string;
  };

  if (!userId || !action) {
    return problem(400, "INVALID_INPUT", "userId and action are required.");
  }

  const allowed = ["verify", "suspend", "activate", "feature", "unfeature", "update_bio", "delete"];
  if (!allowed.includes(action)) {
    return problem(400, "INVALID_ACTION", `Unknown action: ${action}`);
  }

  const store = getStore();
  const result = store.moderateRoommateProfile(
    userId,
    action as "verify" | "suspend" | "activate" | "feature" | "unfeature" | "update_bio" | "delete",
    { id: auth.user.id, name: auth.user.name },
    { bio, notes },
  );

  if (!result) return problem(404, "NOT_FOUND", "Roommate profile not found.");

  return ok({ profile: result });
}
