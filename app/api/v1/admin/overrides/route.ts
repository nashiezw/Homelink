import { requireAdmin } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = requireAdmin(request);
  if (auth.error || !auth.user) return auth.error ?? problem(401, "UNAUTHORIZED", "Admin required.");

  const body = await request.json();
  const { action, targetId, ...params } = body as {
    action: string;
    targetId: string;
    reason?: string;
    days?: number;
    newOwnerId?: string;
    updates?: Record<string, unknown>;
    plan?: string;
    credits?: number;
    listingId?: string;
    confirmed?: boolean;
  };

  if (!action) {
    return problem(400, "INVALID_INPUT", "action is required.");
  }
  if (!targetId && action !== "force_logout_all") {
    return problem(400, "INVALID_INPUT", "targetId is required.");
  }

  if (!body.confirmed) {
    return problem(400, "CONFIRMATION_REQUIRED", "Admin override requires confirmed: true.");
  }

  const store = getStore();
  const actor = { id: auth.user.id, name: auth.user.name };

  switch (action) {
    case "approve_listing":
      return ok({ listing: store.adminApproveListing(targetId, actor) });
    case "reject_listing":
      return ok({ listing: store.adminRejectListing(targetId, actor, params.reason) });
    case "edit_listing":
      return ok({ listing: store.adminEditListing(targetId, params.updates ?? {}, actor) });
    case "transfer_listing":
      if (!params.newOwnerId) return problem(400, "INVALID_INPUT", "newOwnerId required.");
      return ok({ listing: store.transferListingOwnership(targetId, params.newOwnerId, actor) });
    case "feature_listing":
      return ok({ listing: store.featureListing(targetId, params.days ?? 7, actor) });
    case "feature_agency":
      return ok({ agency: store.featureAgency(targetId, actor) });
    case "extend_subscription":
      return ok({ subscription: store.extendSubscription(targetId, params.days ?? 30, actor) });
    case "grant_complimentary":
      return ok({
        result: store.grantComplimentary(
          { userId: targetId, plan: params.plan ?? "landlord_pro", days: params.days, listingId: params.listingId, credits: params.credits },
          actor,
        ),
      });
    case "adjust_credits":
      return ok({ credits: store.adjustUserCredits(targetId, params.credits ?? 0, actor, params.reason) });
    case "terminate_sessions":
      return ok({ terminated: store.terminateUserSessions(targetId, actor) });
    case "force_logout_all":
      return ok({ terminated: store.terminateAllSessions(actor) });
    case "reset_verification":
      return ok({ user: store.resetUserVerification(targetId, actor) });
    case "reverse_payment":
      return ok({ payment: store.reversePayment(targetId, actor, params.reason) });
    case "refund_payment":
      return ok({ payment: store.refundPayment(targetId, actor, params.reason) });
    case "activate_listing":
      return ok({ listing: store.adminApproveListing(targetId, actor) });
    case "delete_listing":
      return ok({ listing: store.adminDeleteListing(targetId, actor, params.reason) });
    case "archive_listing":
      return ok({ listing: store.adminArchiveListing(targetId, actor, params.reason) });
    case "restore_listing":
      return ok({ listing: store.adminRestoreListing(targetId, actor) });
    case "unfeature_listing":
      return ok({ listing: store.adminUnfeatureListing(targetId, actor) });
    case "verify_listing":
      return ok({ listing: store.adminSetListingVerified(targetId, true, actor) });
    case "unverify_listing":
      return ok({ listing: store.adminSetListingVerified(targetId, false, actor) });
    case "suspend_agency":
      return ok({ agency: store.suspendAgency(targetId, actor, params.reason) });
    case "activate_agency":
      return ok({ agency: store.activateAgency(targetId, actor) });
    case "delete_agency":
      return ok({ agency: store.deleteAgency(targetId, actor, params.reason) });
    case "verify_agency":
      return ok({ agency: store.verifyAgency(targetId, actor) });
    case "reject_agency":
      return ok({ agency: store.rejectAgency(targetId, actor, params.reason) });
    case "delete_user": {
      const deleted = store.deleteUser(targetId, actor, params.reason);
      if (!deleted) return problem(404, "NOT_FOUND", "User not found.");
      return ok({ user: store.toPublicAdminUser(deleted) });
    }
  }

  return problem(400, "UNKNOWN_ACTION", `Unknown override: ${action}`);
}
