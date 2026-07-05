import type { AdminPermission } from "@/lib/settings/types";
import { requireAdminPermission } from "@/lib/settings/rbac";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { getPostgresPublicUserById, shouldUsePostgresAuth } from "@/lib/auth/postgres-auth";
import { problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";
import type { StoreUser } from "@/lib/store/types";

type AdminAuthUser =
  | StoreUser
  | {
      id: string;
      email: string;
      phone: string | null;
      name: string;
      roles: string[];
      identityStatus: string;
      phoneVerifiedAt: Date | null;
      emailVerifiedAt: Date | null;
      createdAt: Date;
    };

type AdminAuthResult = { error: Response; user?: undefined } | { user: AdminAuthUser; error?: undefined };

const ADMIN_ROLES = ["ADMIN", "SUPPORT", "BILLING", "TECH_SUPPORT", "TRUST_SAFETY"];

export function requireAdmin(request: Request, permission?: AdminPermission): AdminAuthResult {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return { error: problem(401, "UNAUTHORIZED", "Sign in to access admin.") };
  }
  const store = getStore();
  const user = store.getUserById(userId);
  if (!user) {
    return { error: problem(403, "FORBIDDEN", "Admin access required.") };
  }
  const canEnterAdmin = user.roles.some((role) => ADMIN_ROLES.includes(role));
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

export async function requireAdminAsync(request: Request, permission?: AdminPermission): Promise<AdminAuthResult> {
  if (!shouldUsePostgresAuth()) return requireAdmin(request, permission);
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    return { error: problem(401, "UNAUTHORIZED", "Sign in to access admin.") };
  }
  const user = await getPostgresPublicUserById(userId);
  if (!user || !user.roles.some((role) => ADMIN_ROLES.includes(role))) {
    return { error: problem(403, "FORBIDDEN", "Admin access required.") };
  }
  if (permission && !user.roles.includes("ADMIN")) {
    return { error: problem(403, "FORBIDDEN", "Admin permission required.") };
  }
  return { user };
}
