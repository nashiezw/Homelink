import { requireAdmin } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { getPostgresUserById, recordPostgresAuditEvent, shouldUsePostgresAuth, toPublicPostgresUser } from "@/lib/auth/postgres-auth";
import { getMainPrisma } from "@/lib/db/main-prisma";
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
  if (shouldUsePostgresAuth()) {
    const viewerId = getSessionUserIdFromRequest(request);
    const viewer = viewerId ? await getPostgresUserById(viewerId) : null;
    if (!viewer?.roles.includes("ADMIN")) return problem(403, "FORBIDDEN", "Admin only.");
    const prisma = getMainPrisma();
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return problem(404, "NOT_FOUND", "User not found.");
    const [listings, payments, enquiries] = await Promise.all([
      prisma.listing.findMany({ where: { ownerId: id }, select: { id: true, title: true, city: true, status: true, views: true, price: true }, take: 20 }),
      prisma.payment.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 10 }),
      prisma.propertyEnquiryRecord.findMany({ where: { ownerId: id }, orderBy: { createdAt: "desc" }, take: 10 }),
    ]);
    return ok({
      user: toPublicPostgresUser(user),
      listings: listings.map((l) => ({ ...l, price: Number(l.price), enquiries: 0 })),
      payments: payments.map((p) => ({ ...p, amount: Number(p.amount), createdAt: p.createdAt.toISOString() })),
      enquiries,
      activity: [],
    });
  }
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
  const auth = shouldUsePostgresAuth() ? await requireUserPatchAdmin(request) : requireAdmin(request);
  if (auth.error || !auth.user) {
    return auth.error ?? problem(401, "UNAUTHORIZED", "Admin required.");
  }

  const { id } = await context.params;
  const body = await request.json();
  if (shouldUsePostgresAuth()) {
    const prisma = getMainPrisma();
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return problem(404, "NOT_FOUND", "User not found.");
    if (body.action) {
      if (id === auth.user.id && ["suspend", "block", "delete"].includes(body.action as string)) {
        return problem(400, "INVALID_ACTION", "You cannot suspend, block, or delete your own admin account.");
      }
      const roles = new Set(existing.roles);
      switch (body.action as string) {
        case "suspend":
          await prisma.user.update({ where: { id }, data: { accountStatus: "SUSPENDED" } });
          break;
        case "block":
          await prisma.user.update({ where: { id }, data: { accountStatus: "BLOCKED" } });
          break;
        case "activate":
          await prisma.user.update({ where: { id }, data: { accountStatus: "ACTIVE" } });
          break;
        case "verify":
          await prisma.user.update({ where: { id }, data: { identityStatus: "VERIFIED" } });
          break;
        case "assign_role":
          if (typeof body.role === "string") roles.add(body.role as never);
          await prisma.user.update({ where: { id }, data: { roles: [...roles] as never[] } });
          break;
        case "remove_role":
          if (typeof body.role === "string") roles.delete(body.role as never);
          await prisma.user.update({ where: { id }, data: { roles: [...roles] as never[] } });
          break;
        case "delete":
          await hardDeletePostgresUser(id, auth.user.id);
          await recordPostgresAuditEvent({
            actorId: auth.user.id,
            action: "DELETE_USER",
            target: id,
            metadata: {
              reason: typeof body.reason === "string" ? body.reason : undefined,
              previousEmail: existing.email,
              previousRoles: existing.roles,
            },
          });
          return ok({ deleted: true, userId: id });
          break;
        case "warn":
        case "set_premium":
        case "terminate_sessions":
          break;
        default:
          return problem(400, "UNKNOWN_ACTION", `Unknown action: ${body.action}`);
      }
      const user = await prisma.user.findUniqueOrThrow({ where: { id } });
      return ok({ user: toPublicPostgresUser(user) });
    }
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(typeof body.name === "string" ? { name: body.name } : {}),
        ...(typeof body.phone === "string" ? { phone: body.phone } : {}),
      },
    });
    return ok({ user: toPublicPostgresUser(updated) });
  }
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
        return ok({ deleted: true, userId: id });
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

async function hardDeletePostgresUser(id: string, replacementOwnerId: string) {
  const prisma = getMainPrisma();
  await prisma.$transaction(
    async (tx) => {
      await tx.appSession.deleteMany({ where: { userId: id } });
      await tx.auditEvent.updateMany({ where: { actorId: id }, data: { actorId: null } });
      await tx.report.updateMany({ where: { reporterId: id }, data: { reporterId: null } });
      await tx.listing.updateMany({
        where: { ownerId: id },
        data: {
          ownerId: replacementOwnerId,
          status: "DELETED",
          adminNotes: "Owner account was permanently deleted by admin.",
        },
      });

      await tx.propertyEnquiryRecord.deleteMany({
        where: {
          OR: [{ seekerId: id }, { ownerId: id }, { assignedAgentId: id }],
        },
      });
      await tx.residenceRecordRow.deleteMany({
        where: { OR: [{ userId: id }, { counterpartyId: id }] },
      });
      await tx.tenancyReferenceRow.deleteMany({ where: { targetUserId: id } });
      await tx.tenancyDisputeRow.deleteMany({
        where: {
          payload: {
            path: ["reportedByUserId"],
            equals: id,
          },
        },
      });
      await tx.propertyManagementRequestRow.deleteMany({
        where: { OR: [{ ownerId: id }, { consultantId: id }] },
      });
      await tx.holidayBookingRecord.deleteMany({
        where: { OR: [{ guestUserId: id }, { ownerId: id }, { agentId: id }] },
      });
      await tx.agentApplicationRecord.deleteMany({ where: { userId: id } });
      await tx.agentTrainingProgressRecord.deleteMany({ where: { agentId: id } });
      await tx.academyLearnerApplication.deleteMany({ where: { learnerId: id } });
      await tx.academyResourceAccess.deleteMany({ where: { learnerId: id } });
      await tx.courseEnrolment.deleteMany({ where: { agentId: id } });
      await tx.lessonProgress.deleteMany({ where: { agentId: id } });
      await tx.courseProgress.deleteMany({ where: { agentId: id } });
      await tx.quizAttempt.deleteMany({ where: { agentId: id } });
      await tx.examAttempt.deleteMany({ where: { agentId: id } });
      await tx.assignmentSubmission.deleteMany({ where: { agentId: id } });
      await tx.videoProgress.deleteMany({ where: { agentId: id } });
      await tx.discussionThread.deleteMany({ where: { authorId: id } });
      await tx.trainingNotification.deleteMany({ where: { userId: id } });
      await tx.trainingAuditLog.updateMany({ where: { actorId: id }, data: { actorId: null } });

      await tx.user.delete({ where: { id } });
    },
    { timeout: 20_000 },
  );
}

async function requireUserPatchAdmin(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return { error: problem(401, "UNAUTHORIZED", "Admin required.") };
  const user = await getPostgresUserById(userId);
  if (!user?.roles.includes("ADMIN")) return { error: problem(403, "FORBIDDEN", "Admin only.") };
  return { user: { id: user.id, name: user.name }, error: undefined };
}
