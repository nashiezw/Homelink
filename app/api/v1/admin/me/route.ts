import { requireAdmin } from "@/lib/admin/require-admin";
import { ok } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth.error) return auth.error;

  const store = getStore();
  const user = auth.user!;
  const operationalRoles = [
    user.roles.includes("SUPPORT") ? "support" : "",
    user.roles.includes("BILLING") ? "billing_support" : "",
    user.roles.includes("TECH_SUPPORT") ? "technical_support" : "",
    user.roles.includes("TRUST_SAFETY") ? "trust_safety" : "",
  ].filter(Boolean);
  return ok({
    permissions: store.getAdminPermissionsForUser(user.id),
    roles: store.getPlatformSettings().rbac.userRoleKeys[user.id] ?? (user.roles.includes("ADMIN") ? (user.id === "user_admin" ? ["super_admin"] : ["viewer"]) : operationalRoles),
  });
}
