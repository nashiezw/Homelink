import type { AdminPermission } from "@/lib/settings/types";
import { requireAdminPermission } from "@/lib/settings/rbac";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export function requireAdmin(request: Request, permission?: AdminPermission) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return { error: problem(401, "UNAUTHORIZED", "Sign in to access admin.") };
  }
  const store = getStore();
  const user = store.getUserById(userId);
  if (!user) {
    return { error: problem(403, "FORBIDDEN", "Admin access required.") };
  }
  const canEnterAdmin = user.roles.some((role) => ["ADMIN", "SUPPORT", "BILLING", "TECH_SUPPORT", "TRUST_SAFETY"].includes(role));
  if (!canEnterAdmin) {
    return { error: problem(403, "FORBIDDEN", "Admin access required.") };
  }
  if (permission) {
    const settings = store.getPlatformSettings();
    const check = requireAdminPermission(user, settings, permission);
    if (!check.ok) {
      return { error: problem(403, "FORBIDDEN", check.message) };
    }
  }
  return { user };
}
