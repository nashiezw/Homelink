import type { AdminPermission, AdminRbacSettings, PlatformSettings } from "@/lib/settings/types";
import type { StoreUser } from "@/lib/store/types";

export function getAdminPermissions(user: StoreUser, settings: PlatformSettings): AdminPermission[] {
  const operationalRoleKeys = [
    user.roles.includes("SUPPORT") ? "support" : "",
    user.roles.includes("BILLING") ? "billing_support" : "",
    user.roles.includes("TECH_SUPPORT") ? "technical_support" : "",
    user.roles.includes("TRUST_SAFETY") ? "trust_safety" : "",
  ].filter(Boolean);
  if (!user.roles.includes("ADMIN") && !operationalRoleKeys.length) return [];
  const assigned = user.roles.includes("ADMIN")
    ? settings.rbac.userRoleKeys[user.id] ?? (user.id === "user_admin" ? ["super_admin"] : ["viewer"])
    : operationalRoleKeys;
  const permissions = new Set<AdminPermission>();
  for (const roleKey of assigned) {
    const role = settings.rbac.roles[roleKey];
    if (!role) continue;
    for (const permission of role.permissions) {
      permissions.add(permission);
    }
  }
  if (permissions.has("super")) {
    return ["super"];
  }
  return [...permissions];
}

export function hasAdminPermission(
  user: StoreUser,
  settings: PlatformSettings,
  permission: AdminPermission,
): boolean {
  const permissions = getAdminPermissions(user, settings);
  return permissions.includes("super") || permissions.includes(permission);
}

export function requireAdminPermission(
  user: StoreUser,
  settings: PlatformSettings,
  permission: AdminPermission,
): { ok: true } | { ok: false; message: string } {
  const hasOperationalRole = user.roles.some((role) => ["SUPPORT", "BILLING", "TECH_SUPPORT", "TRUST_SAFETY"].includes(role));
  if (!user.roles.includes("ADMIN") && !hasOperationalRole) {
    return { ok: false, message: "Admin access required." };
  }
  if (!hasAdminPermission(user, settings, permission)) {
    return { ok: false, message: `Missing permission: ${permission}` };
  }
  return { ok: true };
}

export function listAssignableRoles(rbac: AdminRbacSettings) {
  return Object.entries(rbac.roles).map(([key, role]) => ({ key, ...role }));
}
