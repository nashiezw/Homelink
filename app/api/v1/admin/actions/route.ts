import { requireAdmin } from "@/lib/admin/require-admin";
import { broadcastPlatformNotification, type BroadcastAudience } from "@/lib/admin/broadcast";
import { ok, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = requireAdmin(request);
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
