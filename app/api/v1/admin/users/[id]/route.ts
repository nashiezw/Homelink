import { requireAdmin } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";
import type { UserRole } from "@/lib/store/types";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  const store = getStore();
  const user = store.getUserById(id);
  if (!user) {
    return problem(404, "NOT_FOUND", "User not found.");
  }

  const listings = store.listListings().filter((l) => l.ownerId === id);
  const payments = store.getPayments(id);
  const enquiries = store.getEnquiriesForOwner(id);

  return ok({
    user: store.toPublicAdminUser(user),
    listings: listings.map((l) => ({
      id: l.id,
      title: l.title,
      city: l.city,
      status: l.status,
      views: l.views,
      enquiries: l.enquiries,
      price: l.price,
    })),
    payments: payments.slice(0, 10),
    enquiries: enquiries.slice(0, 10),
    activity: store.getAuditLog(20).filter((e) => e.target === id),
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = requireAdmin(request);
  if (auth.error || !auth.user) {
    return auth.error ?? problem(401, "UNAUTHORIZED", "Admin required.");
  }

  const { id } = await context.params;
  const body = await request.json();
  const store = getStore();
  const actor = { id: auth.user.id, name: auth.user.name };

  if (id === auth.user.id && body.accountStatus && body.accountStatus !== "ACTIVE") {
    return problem(400, "INVALID_ACTION", "You cannot suspend or block your own admin account.");
  }

  const user = store.getUserById(id);
  if (!user) {
    return problem(404, "NOT_FOUND", "User not found.");
  }
  const actorIsSuperAdmin = store.getAdminPermissionsForUser(auth.user.id).includes("super");

  if (body.action) {
    if (id === auth.user.id && ["suspend", "block", "delete"].includes(body.action as string)) {
      return problem(400, "INVALID_ACTION", "You cannot suspend, block, or delete your own admin account.");
    }
    switch (body.action as string) {
      case "suspend":
        store.suspendUser(id, actor, body.reason);
        break;
      case "block":
        store.blockUser(id, actor, body.reason);
        break;
      case "activate":
        store.activateUser(id, actor);
        break;
      case "verify":
        store.verifyLandlord(id, actor);
        break;
      case "warn":
        store.warnUser(id, actor, body.reason);
        break;
      case "set_premium":
        store.setPremium(id, Boolean(body.premium), actor);
        break;
      case "assign_role":
        if (typeof body.role === "string") {
          if (body.role === "ADMIN" && !actorIsSuperAdmin) {
            return problem(403, "FORBIDDEN", "Only a super admin can grant admin access.");
          }
          store.assignRole(id, body.role as UserRole, actor);
          if (body.role === "ADMIN") {
            const settings = store.getPlatformSettings();
            if (!settings.rbac.userRoleKeys[id]) {
              store.updatePlatformSettings(
                { rbac: { ...settings.rbac, userRoleKeys: { ...settings.rbac.userRoleKeys, [id]: ["viewer"] } } },
                actor,
              );
            }
          }
        }
        break;
      case "remove_role":
        if (typeof body.role === "string") {
          if (body.role === "ADMIN" && !actorIsSuperAdmin) {
            return problem(403, "FORBIDDEN", "Only a super admin can remove admin access.");
          }
          store.removeRole(id, body.role as UserRole, actor);
        }
        break;
      case "delete":
        if (id === auth.user.id) {
          return problem(400, "INVALID_ACTION", "You cannot delete your own admin account.");
        }
        store.deleteUser(id, actor, body.reason);
        break;
      case "terminate_sessions":
        store.terminateUserSessions(id, actor);
        break;
      default:
        return problem(400, "UNKNOWN_ACTION", `Unknown action: ${body.action}`);
    }
    return ok({ user: store.toPublicAdminUser(store.getUserById(id)!) });
  }

  const updated = store.updateUser(
    id,
    {
      name: body.name,
      phone: body.phone,
      city: body.city,
      premium: body.premium,
      performanceScore: body.performanceScore,
    },
    actor,
  );

  if (!updated) {
    return problem(404, "NOT_FOUND", "User not found.");
  }

  return ok({ user: store.toPublicAdminUser(updated) });
}
