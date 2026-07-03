import { requireAdmin } from "@/lib/admin/require-admin";
import type { ScheduledCampaign } from "@/lib/admin/enterprise-types";
import { ok, problem } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = requireAdmin(request, "marketing:write");
  if (auth.error) return auth.error;

  const store = getStore();
  return ok({
    coupons: store.listCoupons(),
    campaigns: store.listScheduledCampaigns(),
  });
}

export async function PATCH(request: Request) {
  const auth = requireAdmin(request, "marketing:write");
  if (auth.error) return auth.error;

  const body = await request.json();
  const store = getStore();
  const { action } = body as { action?: string };

  switch (action) {
    case "upsert_coupon": {
      const coupon = body.coupon as { code?: string; label?: string; discountValue?: number; maxUses?: number; validUntil?: string } | undefined;
      if (!coupon?.code?.trim()) return problem(400, "CODE_REQUIRED", "Coupon code is required.");
      if (!coupon.label?.trim()) return problem(400, "LABEL_REQUIRED", "Coupon label is required.");
      if (!Number.isFinite(Number(coupon.discountValue)) || Number(coupon.discountValue) <= 0) {
        return problem(400, "INVALID_DISCOUNT", "Discount value must be greater than zero.");
      }
      return ok({ coupon: store.upsertCoupon(body.coupon) });
    }
    case "remove_coupon": {
      const removed = store.removeCoupon(body.couponId);
      if (!removed) return problem(404, "NOT_FOUND", "Coupon not found.");
      return ok({ coupon: removed });
    }
    case "upsert_campaign": {
      const campaign = body.campaign as Partial<ScheduledCampaign> | undefined;
      const validAudiences: ScheduledCampaign["audience"][] = ["all", "seekers", "landlords", "agents"];
      const validChannels: ScheduledCampaign["channel"][] = ["email", "sms", "whatsapp", "push"];
      if (!campaign?.name?.trim()) return problem(400, "NAME_REQUIRED", "Campaign name is required.");
      if (!campaign.subject?.trim()) return problem(400, "SUBJECT_REQUIRED", "Campaign subject is required.");
      if (!campaign.body?.trim()) return problem(400, "BODY_REQUIRED", "Campaign body is required.");
      if (campaign.audience && !validAudiences.includes(campaign.audience)) return problem(400, "INVALID_AUDIENCE", "Campaign audience is not supported.");
      if (campaign.channel && !validChannels.includes(campaign.channel)) return problem(400, "INVALID_CHANNEL", "Campaign channel is not supported.");
      return ok({ campaign: store.upsertScheduledCampaign(body.campaign) });
    }
    case "cancel_campaign": {
      const campaign = store.cancelScheduledCampaign(body.campaignId);
      if (!campaign) return problem(404, "NOT_FOUND", "Campaign not found.");
      return ok({ campaign });
    }
    case "send_campaign_now": {
      const campaign = store.listScheduledCampaigns().find((c) => c.id === body.campaignId);
      if (!campaign) return problem(404, "NOT_FOUND", "Campaign not found.");
      if (campaign.status === "cancelled") return problem(409, "CAMPAIGN_CANCELLED", "Cancelled campaigns cannot be sent.");
      if (!campaign.subject.trim() || !campaign.body.trim()) return problem(400, "INVALID_CAMPAIGN", "Campaign subject and body are required before sending.");
      const { broadcastPlatformNotification } = await import("@/lib/admin/broadcast");
      const result = broadcastPlatformNotification(store, {
        channel: campaign.channel.toUpperCase(),
        subject: campaign.subject,
        body: campaign.body,
        audience: campaign.audience,
      });
      store.upsertScheduledCampaign({ ...campaign, status: "sent" });
      return ok(result);
    }
    default:
      return problem(400, "INVALID_ACTION", "Unknown action.");
  }
}
