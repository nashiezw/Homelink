import { NotificationChannel, Prisma, Role, VerificationStatus } from "@prisma/client";
import { requireAdminAsync } from "@/lib/admin/require-admin";
import { broadcastPlatformNotification, type BroadcastAudience } from "@/lib/admin/broadcast";
import { ok, problem } from "@/lib/api/response";
import { recordPostgresAuditEvent, shouldUsePostgresAuth } from "@/lib/auth/postgres-auth";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { getStore } from "@/lib/store/app-store";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireAdminAsync(request);
  if (auth.error) {
    return auth.error;
  }

  const body = await request.json();
  const { action, id, userId, reason, role, premium, channel, subject, body: notifBody } = body as {
    action: string;
    id?: string;
    userId?: string;
    reason?: string;
    role?: string;
    premium?: boolean;
    channel?: string;
    subject?: string;
    body?: string;
    audience?: BroadcastAudience;
  };

  const targetId = userId ?? id;
  if (!action) {
    return problem(400, "INVALID_ACTION", "action is required.");
  }
  if (!targetId && !["broadcast_notification", "create_ticket"].includes(action)) {
    return problem(400, "INVALID_ACTION", "id or userId is required.");
  }

  if (shouldUsePostgresAuth()) {
    return handlePostgresAdminAction({
      action,
      targetId,
      reason,
      role,
      premium,
      channel,
      subject,
      notifBody,
      audience: (body as { audience?: BroadcastAudience }).audience,
      userIds: (body as { userIds?: string[] }).userIds,
      actor: { id: auth.user!.id, name: auth.user!.name },
    });
  }

  const store = getStore();
  const actor = { id: auth.user!.id, name: auth.user!.name };

  switch (action) {
    case "approve_verification":
      store.approveVerification(targetId!, actor);
      return ok({ id: targetId, status: "APPROVED" });
    case "reject_verification":
      store.rejectVerification(targetId!, actor, reason);
      return ok({ id: targetId, status: "REJECTED" });
    case "resolve_moderation":
      if (!reason?.trim()) return problem(400, "REASON_REQUIRED", "Resolution note is required.");
      store.resolveReviewItem(targetId!, reason);
      return ok({ id: targetId, status: "RESOLVED" });
    case "dismiss_moderation":
      if (!reason?.trim()) return problem(400, "REASON_REQUIRED", "Dismissal reason is required.");
      store.dismissModerationItem(targetId!, reason);
      return ok({ id: targetId, status: "DISMISSED" });
    case "resolve_ticket":
      store.resolveSupportTicket(targetId!, actor, reason);
      return ok({ id: targetId, status: "RESOLVED" });
    case "escalate_ticket":
      store.escalateSupportTicket(targetId!, actor, {
        team: (body as { team?: string }).team,
        reason,
      });
      return ok({ id: targetId, status: "ESCALATED", team: (body as { team?: string }).team });
    case "assign_ticket": {
      const assignee = (body as { assignee?: string }).assignee;
      if (!assignee) return problem(400, "INVALID_INPUT", "assignee is required.");
      store.assignSupportTicket(targetId!, assignee, actor);
      return ok({ id: targetId, assignee });
    }
    case "create_ticket": {
      const ticket = (body as {
        userId?: string;
        userName?: string;
        customerEmail?: string;
        subject?: string;
        category?: string;
        team?: import("@/lib/store/types").SupportTicket["team"];
        priority?: "HIGH" | "MEDIUM" | "LOW";
        body?: string;
      });
      if (!ticket.subject || !ticket.userName) {
        return problem(400, "INVALID_INPUT", "subject and userName are required.");
      }
      const created = store.createSupportTicket(
        {
          userId: ticket.userId ?? "support_unassigned",
          userName: ticket.userName,
          subject: ticket.subject,
          category: ticket.category ?? "General",
          team: ticket.team,
          customerEmail: ticket.customerEmail,
          priority: ticket.priority ?? "MEDIUM",
          status: "OPEN",
          body: ticket.body ?? "",
        },
        actor,
      );
      return ok({ ticket: created });
    }
    case "suspend_user":
      store.suspendUser(targetId!, actor, reason);
      return ok({ id: targetId, status: "SUSPENDED" });
    case "block_user":
      store.blockUser(targetId!, actor, reason);
      return ok({ id: targetId, status: "BLOCKED" });
    case "activate_user":
      store.activateUser(targetId!, actor);
      return ok({ id: targetId, status: "ACTIVE" });
    case "verify_landlord":
      store.verifyLandlord(targetId!, actor);
      return ok({ id: targetId, status: "VERIFIED" });
    case "warn_user":
      store.warnUser(targetId!, actor, reason);
      return ok({ id: targetId, warned: true });
    case "set_premium":
      store.setPremium(targetId!, Boolean(premium), actor);
      return ok({ id: targetId, premium: Boolean(premium) });
    case "assign_role":
      if (role) store.assignRole(targetId!, role as import("@/lib/store/types").UserRole, actor);
      return ok({ id: targetId, role });
    case "broadcast_notification": {
      const result = broadcastPlatformNotification(store, {
        channel: channel ?? "IN_APP",
        subject: subject ?? "HomeLink announcement",
        body: notifBody ?? "",
        audience: (body as { audience?: BroadcastAudience }).audience ?? "all",
        userIds: (body as { userIds?: string[] }).userIds,
      });
      return ok(result);
    }
    default:
      return problem(400, "UNKNOWN_ACTION", `Unknown action: ${action}`);
  }
}

async function handlePostgresAdminAction(input: {
  action: string;
  targetId?: string;
  reason?: string;
  role?: string;
  premium?: boolean;
  channel?: string;
  subject?: string;
  notifBody?: string;
  audience?: BroadcastAudience;
  userIds?: string[];
  actor: { id: string; name: string };
}) {
  const prisma = getMainPrisma();
  const targetId = input.targetId;

  switch (input.action) {
    case "approve_verification":
    case "verify_landlord": {
      if (!targetId) return problem(400, "INVALID_ACTION", "id or userId is required.");
      const user = await prisma.user.update({
        where: { id: targetId },
        data: { identityStatus: VerificationStatus.VERIFIED },
      }).catch(() => null);
      if (!user) return problem(404, "NOT_FOUND", "User not found.");
      await audit(input.actor.id, input.action, targetId, { reason: input.reason });
      return ok({ id: targetId, status: "APPROVED" });
    }
    case "reject_verification": {
      if (!targetId) return problem(400, "INVALID_ACTION", "id or userId is required.");
      const user = await prisma.user.update({
        where: { id: targetId },
        data: { identityStatus: VerificationStatus.REJECTED },
      }).catch(() => null);
      if (!user) return problem(404, "NOT_FOUND", "User not found.");
      await audit(input.actor.id, input.action, targetId, { reason: input.reason });
      return ok({ id: targetId, status: "REJECTED" });
    }
    case "suspend_user":
    case "block_user":
    case "activate_user": {
      if (!targetId) return problem(400, "INVALID_ACTION", "id or userId is required.");
      if (targetId === input.actor.id && input.action !== "activate_user") {
        return problem(400, "INVALID_ACTION", "You cannot suspend or block your own admin account.");
      }
      const accountStatus = input.action === "activate_user" ? "ACTIVE" : input.action === "block_user" ? "BLOCKED" : "SUSPENDED";
      const user = await prisma.user.update({
        where: { id: targetId },
        data: { accountStatus },
      }).catch(() => null);
      if (!user) return problem(404, "NOT_FOUND", "User not found.");
      await audit(input.actor.id, input.action, targetId, { reason: input.reason, accountStatus });
      return ok({ id: targetId, status: accountStatus });
    }
    case "warn_user": {
      if (!targetId) return problem(400, "INVALID_ACTION", "id or userId is required.");
      const user = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!user) return problem(404, "NOT_FOUND", "User not found.");
      await prisma.notification.create({
        data: {
          userId: targetId,
          channel: NotificationChannel.PUSH,
          subject: "Account warning",
          body: input.reason?.trim() || "An administrator added a warning to your account.",
        },
      });
      await audit(input.actor.id, input.action, targetId, { reason: input.reason });
      return ok({ id: targetId, warned: true });
    }
    case "assign_role": {
      if (!targetId) return problem(400, "INVALID_ACTION", "id or userId is required.");
      const role = parseRole(input.role);
      if (!role) return problem(400, "INVALID_ROLE", "Choose a valid role.");
      const existing = await prisma.user.findUnique({ where: { id: targetId }, select: { roles: true } });
      if (!existing) return problem(404, "NOT_FOUND", "User not found.");
      const roles = [...new Set([...existing.roles, role])];
      await prisma.user.update({ where: { id: targetId }, data: { roles } });
      await audit(input.actor.id, input.action, targetId, { role });
      return ok({ id: targetId, role });
    }
    case "set_premium": {
      if (!targetId) return problem(400, "INVALID_ACTION", "id or userId is required.");
      return problem(
        501,
        "PREMIUM_NOT_MIGRATED",
        "Premium flags need a durable subscription field before production admin edits.",
      );
    }
    case "broadcast_notification": {
      const audience = input.audience ?? "all";
      const recipients = await prisma.user.findMany({
        where: {
          accountStatus: "ACTIVE",
          ...(input.userIds?.length ? { id: { in: input.userIds } } : audienceWhere(audience)),
        },
        select: { id: true },
      });
      if (!recipients.length) return ok({ sent: 0, audience });
      const channel = parseNotificationChannel(input.channel);
      await prisma.notification.createMany({
        data: recipients.map((recipient) => ({
          userId: recipient.id,
          channel,
          subject: input.subject ?? "HomeLink announcement",
          body: input.notifBody ?? "",
        })),
      });
      await audit(input.actor.id, input.action, "broadcast_notification", {
        audience,
        sent: recipients.length,
        channel,
      });
      return ok({ sent: recipients.length, audience });
    }
    case "resolve_moderation":
    case "dismiss_moderation":
      return problem(501, "MODERATION_ACTION_NOT_MIGRATED", "Use the durable listing, report, or verification endpoints for production moderation.");
    case "resolve_ticket":
    case "escalate_ticket":
    case "assign_ticket":
    case "create_ticket":
      return problem(501, "SUPPORT_TICKETS_NOT_MIGRATED", "Support tickets need a durable ticket model before production use.");
    default:
      return problem(400, "UNKNOWN_ACTION", `Unknown action: ${input.action}`);
  }
}

function parseRole(value?: string) {
  return Object.values(Role).find((role) => role === value);
}

function parseNotificationChannel(value?: string) {
  return Object.values(NotificationChannel).find((channel) => channel === value?.toUpperCase()) ?? NotificationChannel.PUSH;
}

function audienceWhere(audience: BroadcastAudience) {
  if (audience === "admins") return { roles: { hasSome: [Role.ADMIN, Role.SUPER_ADMIN, Role.ACADEMY_ADMIN, Role.MODERATOR] } };
  if (audience === "landlords") return { roles: { has: Role.LANDLORD } };
  if (audience === "agents") return { roles: { hasSome: [Role.AGENT, Role.AGENCY_ADMIN] } };
  if (audience === "seekers") return { roles: { has: Role.SEEKER } };
  return {};
}

async function audit(actorId: string, action: string, target: string, metadata: Record<string, unknown>) {
  const jsonMetadata = Object.fromEntries(
    Object.entries(metadata).filter((entry): entry is [string, Prisma.InputJsonValue] => entry[1] !== undefined),
  );
  await recordPostgresAuditEvent({ actorId, action: action.toUpperCase(), target, metadata: jsonMetadata });
}
