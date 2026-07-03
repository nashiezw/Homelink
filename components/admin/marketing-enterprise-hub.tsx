"use client";

import { Calendar, Megaphone, Tag } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AdminKpiCard } from "@/components/admin/kpi-card";
import { AdminPanel, AdminStatusBadge, AdminTabStrip } from "@/components/admin/ui/admin-ui";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import type { Coupon, ScheduledCampaign } from "@/lib/admin/enterprise-types";
import { AdminActionFeedback } from "@/components/admin/action-feedback";
import { AdminActionDialog, type AdminDialogConfig } from "@/components/admin/action-dialog";

type MarketingData = {
  coupons: Coupon[];
  campaigns: ScheduledCampaign[];
};

export function MarketingEnterpriseHub() {
  const { showToast } = useApp();
  const [data, setData] = useState<MarketingData | null>(null);
  const [tab, setTab] = useState<"coupons" | "campaigns">("coupons");
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    label: "",
    discountValue: 10,
    discountType: "percent" as "percent" | "fixed",
    appliesTo: "all" as "all" | "listings" | "subscriptions" | "holiday",
    maxUses: 100,
  });
  const [feedback, setFeedback] = useState<{
    title: string;
    message: string;
    tone?: "success" | "warning" | "danger" | "info";
    details?: Array<{ label: string; value: string | number | undefined }>;
  } | null>(null);
  const [dialog, setDialog] = useState<AdminDialogConfig | null>(null);

  const load = useCallback(async () => {
    const result = await apiFetch<MarketingData>("/api/v1/admin/marketing");
    if (result.data) setData(result.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function action(act: string, payload: Record<string, unknown>) {
    if (act === "send_campaign_now") {
      setDialog({
        title: "Send campaign now",
        message: "Confirm campaign send. The campaign status and delivery record will update immediately.",
        tone: "warning",
        confirmLabel: "Send campaign",
        onConfirm: () => applyMarketingAction(act, payload),
      });
      return;
    }
    if (act === "cancel_campaign" || act === "remove_coupon") {
      setDialog({
        title: act === "cancel_campaign" ? "Cancel campaign" : "Remove coupon",
        message: act === "cancel_campaign"
          ? "Cancelled campaigns cannot be sent later. Confirm this campaign should stop."
          : "Remove this coupon only if it should no longer be available to customers.",
        tone: "warning",
        confirmLabel: act === "cancel_campaign" ? "Cancel campaign" : "Remove coupon",
        onConfirm: () => applyMarketingAction(act, payload),
      });
      return;
    }
    await applyMarketingAction(act, payload);
  }

  async function applyMarketingAction(act: string, payload: Record<string, unknown>) {
    const result = await apiFetch("/api/v1/admin/marketing", {
      method: "PATCH",
      body: JSON.stringify({ action: act, ...payload }),
    });
    if (result.error) showToast(result.error.message ?? "Failed.", "error");
    else {
      showToast("Updated.");
      setFeedback({
        title: "Marketing action completed",
        message: `${act.replace(/_/g, " ")} completed successfully.`,
        tone: act === "send_campaign_now" ? "warning" : "success",
        details: [
          { label: "Action", value: act.replace(/_/g, " ") },
          { label: "Target", value: String(payload.campaignId ?? (payload.coupon as { code?: string } | undefined)?.code ?? "New record") },
        ],
      });
      void load();
    }
  }

  function scheduleCampaign() {
    setDialog({
      title: "Schedule campaign",
      message: "Create a real campaign with channel, audience, subject, body, and send time.",
      tone: "info",
      confirmLabel: "Schedule campaign",
      fields: [
        { name: "name", label: "Campaign name", required: true },
        {
          name: "channel",
          label: "Channel",
          type: "select",
          defaultValue: "email",
          required: true,
          options: [
            { label: "Email", value: "email" },
            { label: "SMS", value: "sms" },
            { label: "WhatsApp", value: "whatsapp" },
            { label: "Push notification", value: "push" },
          ],
        },
        {
          name: "audience",
          label: "Audience",
          type: "select",
          defaultValue: "all",
          required: true,
          options: [
            { label: "All users", value: "all" },
            { label: "Room seekers", value: "seekers" },
            { label: "Landlords", value: "landlords" },
            { label: "Agents", value: "agents" },
          ],
        },
        { name: "subject", label: "Subject", required: true },
        { name: "body", label: "Message body", type: "textarea", required: true },
        { name: "scheduledAt", label: "Send date and time", type: "datetime-local", defaultValue: defaultCampaignDateTime(), required: true },
      ],
      onConfirm: (values) =>
        action("upsert_campaign", {
          campaign: {
            name: values.name,
            channel: values.channel,
            subject: values.subject,
            body: values.body,
            audience: values.audience,
            scheduledAt: new Date(values.scheduledAt).toISOString(),
            status: "scheduled",
          },
        }),
    });
  }

  if (!data) return <p className="text-slate-400">Loading marketing...</p>;

  const activeCoupons = data.coupons.filter((c) => c.active).length;

  return (
    <div className="space-y-6">
      <AdminActionDialog config={dialog} onClose={() => setDialog(null)} />
      <AdminActionFeedback
        open={Boolean(feedback)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
        tone={feedback?.tone}
        details={feedback?.details}
        onClose={() => setFeedback(null)}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <AdminKpiCard label="Active coupons" value={activeCoupons} icon={Tag} />
        <AdminKpiCard label="Scheduled campaigns" value={data.campaigns.filter((c) => c.status === "scheduled").length} icon={Calendar} tone="warning" />
        <AdminKpiCard label="Total redemptions" value={data.coupons.reduce((s, c) => s + c.usedCount, 0)} icon={Megaphone} />
      </div>

      <AdminTabStrip
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: "coupons", label: "Coupons", count: data.coupons.length },
          { id: "campaigns", label: "Campaigns", count: data.campaigns.length },
        ]}
      />

      {tab === "coupons" && (
        <AdminPanel title="Coupon engine" description="Promotional codes for listings, subscriptions, and holiday homes">
          <div className="mb-4 grid gap-2 lg:grid-cols-6">
            <input value={newCoupon.code} onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })} placeholder="CODE" className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
            <input value={newCoupon.label} onChange={(e) => setNewCoupon({ ...newCoupon, label: e.target.value })} placeholder="Label" className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
            <input type="number" value={newCoupon.discountValue} onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: Number(e.target.value) })} className="w-24 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
            <select value={newCoupon.discountType} onChange={(e) => setNewCoupon({ ...newCoupon, discountType: e.target.value as typeof newCoupon.discountType })} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">
              <option value="percent">Percent off</option>
              <option value="fixed">Fixed USD off</option>
            </select>
            <select value={newCoupon.appliesTo} onChange={(e) => setNewCoupon({ ...newCoupon, appliesTo: e.target.value as typeof newCoupon.appliesTo })} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">
              <option value="all">All products</option>
              <option value="listings">Listings</option>
              <option value="subscriptions">Subscriptions</option>
              <option value="holiday">Holiday homes</option>
            </select>
            <input type="number" value={newCoupon.maxUses} onChange={(e) => setNewCoupon({ ...newCoupon, maxUses: Number(e.target.value) })} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
            <Button
              onClick={() => void action("upsert_coupon", { coupon: { ...newCoupon, active: true } }).then(() => setNewCoupon({ code: "", label: "", discountValue: 10, discountType: "percent", appliesTo: "all", maxUses: 100 }))}
              disabled={!newCoupon.code.trim() || !newCoupon.label.trim() || newCoupon.discountValue <= 0 || newCoupon.maxUses <= 0}
            >
              Create coupon
            </Button>
          </div>
          <div className="space-y-2">
            {data.coupons.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-slate-950/50 p-3">
                <div>
                  <p className="font-mono font-bold text-emerald-300">{c.code}</p>
                  <p className="text-sm text-slate-400">{c.label} · {c.discountType === "percent" ? `${c.discountValue}%` : `$${c.discountValue}`} off</p>
                  <p className="text-xs text-slate-600">{c.usedCount}/{c.maxUses} uses · {c.appliesTo}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <AdminStatusBadge status={c.active ? "active" : "inactive"} variant={c.active ? "success" : "muted"} />
                  <Button variant="secondary" onClick={() => void action("upsert_coupon", { coupon: { ...c, active: !c.active } })}>
                    {c.active ? "Pause" : "Reactivate"}
                  </Button>
                  <Button variant="secondary" onClick={() => void action("remove_coupon", { couponId: c.id })}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>
      )}

      {tab === "campaigns" && (
        <AdminPanel title="Campaign scheduler" description="Schedule email, SMS, and push broadcasts">
          <Button
            className="mb-4"
            onClick={scheduleCampaign}
          >
            Schedule campaign
          </Button>
          <div className="space-y-3">
            {data.campaigns.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-slate-950/50 p-4">
                <div>
                  <p className="font-semibold text-white">{c.name}</p>
                  <p className="text-sm text-slate-400">{c.channel} · {c.audience} · {new Date(c.scheduledAt).toLocaleString()}</p>
                  <p className="text-xs text-slate-500">{c.subject}</p>
                </div>
                <div className="flex items-center gap-2">
                  <AdminStatusBadge status={c.status} variant={c.status === "scheduled" ? "info" : c.status === "sent" ? "success" : "muted"} />
                  {c.status === "scheduled" && (
                    <>
                      <Button variant="secondary" onClick={() => void action("send_campaign_now", { campaignId: c.id })}>Send now</Button>
                      <Button variant="secondary" onClick={() => void action("cancel_campaign", { campaignId: c.id })}>Cancel</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>
      )}
    </div>
  );
}

function defaultCampaignDateTime() {
  const date = new Date(Date.now() + 7 * 86400000);
  date.setMinutes(0, 0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
