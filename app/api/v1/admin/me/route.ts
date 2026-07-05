import { requireAdminAsync } from "@/lib/admin/require-admin";
import { ok } from "@/lib/api/response";
import { isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminAsync(request);
  if ("error" in auth && auth.error) return auth.error;

  const user = auth.user!;
  const roles = user.roles.map(String);
  if (isPostgresStoreEnabled()) {
    const isAdmin = roles.includes("ADMIN");
    return ok({
      permissions: isAdmin ? ["super"] : [],
      roles: isAdmin ? ["super_admin"] : roles.map((role) => role.toLowerCase()),
    });
  }

  const store = getStore();
  const operationalRoles = [
    roles.includes("SUPPORT") ? "support" : "",
    roles.includes("BILLING") ? "billing_support" : "",
    roles.includes("TECH_SUPPORT") ? "technical_support" : "",
    roles.includes("TRUST_SAFETY") ? "trust_safety" : "",
  ].filter(Boolean);
  return ok({
    permissions: store.getAdminPermissionsForUser(user.id),
    roles: store.getPlatformSettings().rbac.userRoleKeys[user.id] ?? (roles.includes("ADMIN") ? (user.id === "user_admin" ? ["super_admin"] : ["viewer"]) : operationalRoles),
  });
}
