"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminKpiCard } from "@/components/admin/kpi-card";
import { AdminPanel, AdminStatusBadge, AdminTabStrip } from "@/components/admin/ui/admin-ui";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, Home, Star } from "lucide-react";
import { AdminActionFeedback } from "@/components/admin/action-feedback";
import { AdminActionDialog, type AdminDialogConfig } from "@/components/admin/action-dialog";
import type { RefundRequest, SeasonalRate } from "@/lib/admin/enterprise-types";

type HolidayAdminData = {
  listings: Array<{
    id: string;
    title: string;
    city: string;
    status: string;
    verified?: boolean;
    nightlyRate: number;
    featured?: boolean;
  }>;
  enquiries: Array<{
    id: string;
    listingTitle: string;
    guestName: string;
    status: string;
    checkIn: string;
    checkOut: string;
  }>;
  reviews: Array<{ id: string; listingTitle: string; guestName: string; rating: number; comment: string }>;
  analytics: {
    views: number;
    bookingEnquiries: number;
    conversionRate: number;
    averageNightlyPrice: number;
  };
  settings: {
    minNightlyRate: number;
    maxNightlyRate: number;
    defaultCheckInTime: string;
    defaultCheckOutTime: string;
    requireAdminApproval?: boolean;
  };
  seasonalRates?: SeasonalRate[];
  refundRequests?: RefundRequest[];
};

export function HolidayHomesAdminHub() {
  const { showToast } = useApp();
  const [data, setData] = useState<HolidayAdminData | null>(null);
  const [settings, setSettings] = useState<HolidayAdminData["settings"] | null>(null);
  const [tab, setTab] = useState<"listings" | "calendar" | "seasonal" | "refunds" | "settings">("listings");
  const [feedback, setFeedback] = useState<{
    title: string;
    message: string;
    tone?: "success" | "warning" | "danger" | "info";
    details?: Array<{ label: string; value: string | number | undefined }>;
  } | null>(null);
  const [dialog, setDialog] = useState<AdminDialogConfig | null>(null);

  const load = useCallback(async () => {
    const result = await apiFetch<HolidayAdminData>("/api/v1/admin/holiday-homes");
    if (result.data) {
      setData(result.data);
      setSettings(result.data.settings);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(body: Record<string, unknown>) {
    if (body.refundStatus || body.status || body.enquiryStatus) {
      setDialog({
        title: "Confirm holiday homes update",
        message: `Confirm ${String(body.refundStatus ?? body.status ?? body.enquiryStatus).toLowerCase()}. Guests, owners, or listing status may be affected.`,
        tone: body.refundStatus === "rejected" || body.enquiryStatus === "DECLINED" || body.status === "REJECTED" || body.status === "ARCHIVED" ? "warning" : "success",
        confirmLabel: "Confirm",
        onConfirm: () => applyHolidayPatch(body),
      });
      return;
    }
    await applyHolidayPatch(body);
  }

  async function applyHolidayPatch(body: Record<string, unknown>) {
    const result = await apiFetch("/api/v1/admin/holiday-homes", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    if (result.error) {
      showToast(result.error.message ?? "Action failed.", "error");
      return;
    }
    showToast("Updated.");
    setFeedback({
      title: "Holiday homes updated",
      message: "The holiday homes workflow was updated successfully.",
      tone: body.refundStatus === "rejected" || body.enquiryStatus === "DECLINED" ? "warning" : "success",
      details: [
        { label: "Listing", value: String(body.listingId ?? body.enquiryId ?? body.refundId ?? "Settings") },
        { label: "Status", value: String(body.status ?? body.enquiryStatus ?? body.refundStatus ?? body.action ?? "Updated") },
      ],
    });
    void load();
  }

  async function saveSettings() {
    if (!settings) return;
    await patch({ settings });
  }

  function addSeasonalRate() {
    if (!data?.listings.length) {
      showToast("Add or approve a holiday listing before creating seasonal rates.", "error");
      return;
    }
    const first = data.listings[0];
    setDialog({
      title: "Add seasonal rate",
      message: "Choose the listing, season label, price, dates, and minimum stay. This will update the holiday pricing calendar.",
      tone: "info",
      confirmLabel: "Add rate",
      fields: [
        {
          name: "listingId",
          label: "Listing",
          type: "select",
          defaultValue: first.id,
          required: true,
          options: data.listings.map((listing) => ({ label: `${listing.title} - ${listing.city}`, value: listing.id })),
        },
        { name: "label", label: "Season label", defaultValue: "Peak season", required: true },
        { name: "nightlyRate", label: "Nightly rate (USD)", type: "number", defaultValue: first.nightlyRate, required: true, min: 1 },
        { name: "startDate", label: "Start date", type: "date", defaultValue: new Date().toISOString().slice(0, 10), required: true },
        { name: "endDate", label: "End date", type: "date", required: true },
        { name: "minStay", label: "Minimum stay", type: "number", defaultValue: 2, required: true, min: 1 },
      ],
      onConfirm: (values) => {
        const listing = data.listings.find((item) => item.id === values.listingId) ?? first;
        return patch({
          action: "upsert_seasonal_rate",
          rate: {
            listingId: listing.id,
            listingTitle: listing.title,
            label: values.label,
            nightlyRate: Number(values.nightlyRate),
            startDate: values.startDate,
            endDate: values.endDate,
            minStay: Number(values.minStay),
          },
        });
      },
    });
  }

  if (!data || !settings) {
    return <p className="text-sm text-slate-400">Loading holiday home management...</p>;
  }

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
      <div className="grid gap-4 sm:grid-cols-4">
        <AdminKpiCard label="Holiday listings" value={data.listings.length} icon={Home} />
        <AdminKpiCard label="Booking enquiries" value={data.analytics.bookingEnquiries} icon={Calendar} />
        <AdminKpiCard label="Avg nightly rate" value={`$${data.analytics.averageNightlyPrice}`} icon={DollarSign} />
        <AdminKpiCard label="Conversion" value={`${data.analytics.conversionRate}%`} icon={Star} />
      </div>

      <AdminTabStrip
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: "listings", label: "Listings", count: data.listings.length },
          { id: "calendar", label: "Calendar", count: data.enquiries.length },
          { id: "seasonal", label: "Seasonal pricing", count: data.seasonalRates?.length },
          { id: "refunds", label: "Refunds", count: data.refundRequests?.filter((r) => r.status === "pending").length },
          { id: "settings", label: "Settings" },
        ]}
      />

      {tab === "listings" && (
        <AdminPanel title="Holiday listings">
          <div className="space-y-3">
            {data.listings.map((listing) => (
              <div key={listing.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-950/50 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-white">{listing.title}</p>
                  <p className="text-slate-400">{listing.city} - ${listing.nightlyRate}/night - {listing.status}</p>
                </div>
                <div className="flex gap-2">
                  {listing.status === "PENDING_REVIEW" && (
                    <>
                      <Button onClick={() => void patch({ listingId: listing.id, status: "ACTIVE", verified: true })}>Approve</Button>
                      <Button variant="secondary" onClick={() => void patch({ listingId: listing.id, status: "REJECTED" })}>Reject</Button>
                    </>
                  )}
                  {listing.status === "ACTIVE" && (
                    <Button variant="secondary" onClick={() => void patch({ listingId: listing.id, status: "ARCHIVED" })}>Archive</Button>
                  )}
                  {listing.status === "ARCHIVED" && (
                    <Button onClick={() => void patch({ listingId: listing.id, status: "ACTIVE" })}>Restore</Button>
                  )}
                  <Button variant="secondary" onClick={() => void patch({ listingId: listing.id, verified: !listing.verified })}>
                    {listing.verified ? "Unverify" : "Verify"}
                  </Button>
                  <Button variant="secondary" onClick={() => void patch({ listingId: listing.id, featured: !listing.featured })}>
                    {listing.featured ? "Unfeature" : "Feature"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>
      )}

      {tab === "calendar" && (
        <AdminPanel title="Availability & booking calendar" description="Enquiries mapped to check-in dates">
          <div className="mb-4 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-slate-500">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="space-y-2">
            {data.enquiries.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-slate-950/50 p-3">
                <div>
                  <p className="font-medium text-white">{e.listingTitle}</p>
                  <p className="text-sm text-slate-400">{e.guestName} - {e.checkIn} to {e.checkOut}</p>
                </div>
                <select
                  className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-xs text-white"
                  value={e.status}
                  onChange={(ev) => void patch({ enquiryId: e.id, enquiryStatus: ev.target.value })}
                >
                  {["PENDING", "ACCEPTED", "DECLINED", "CANCELLED"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </AdminPanel>
      )}

      {tab === "seasonal" && (
        <AdminPanel title="Seasonal pricing" description="Peak and low season rates per listing">
          <Button
            className="mb-4"
            onClick={addSeasonalRate}
          >
            Add seasonal rate
          </Button>
          <div className="space-y-2">
            {(data.seasonalRates ?? []).map((s) => (
              <div key={s.id} className="rounded-xl border border-white/[0.06] bg-slate-950/50 p-4">
                <p className="font-semibold text-white">{s.listingTitle} - {s.label}</p>
                <p className="text-sm text-slate-400">${s.nightlyRate}/night - Min {s.minStay} nights</p>
                <p className="text-xs text-slate-600">{s.startDate} to {s.endDate}</p>
              </div>
            ))}
          </div>
        </AdminPanel>
      )}

      {tab === "refunds" && (
        <AdminPanel title="Refund approvals" description="Guest cancellation refund queue">
          <div className="space-y-3">
            {(data.refundRequests ?? []).map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-slate-950/50 p-4">
                <div>
                  <p className="font-medium text-white">${r.amount} - {r.guestName}</p>
                  <p className="text-sm text-slate-400">{r.listingTitle}</p>
                  <p className="text-xs text-slate-500">{r.reason}</p>
                </div>
                <div className="flex items-center gap-2">
                  <AdminStatusBadge status={r.status} variant={r.status === "pending" ? "warning" : r.status === "approved" ? "success" : "danger"} />
                  {r.status === "pending" && (
                    <>
                      <Button onClick={() => void patch({ action: "update_refund", refundId: r.id, refundStatus: "approved" })}>Approve</Button>
                      <Button variant="secondary" onClick={() => void patch({ action: "update_refund", refundId: r.id, refundStatus: "rejected" })}>Reject</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>
      )}

      {tab === "settings" && (
        <AdminPanel title="Platform settings">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm text-slate-400">
              Min nightly rate
              <input type="number" className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white" value={settings.minNightlyRate} onChange={(e) => setSettings({ ...settings, minNightlyRate: Number(e.target.value) })} />
            </label>
            <label className="text-sm text-slate-400">
              Max nightly rate
              <input type="number" className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white" value={settings.maxNightlyRate} onChange={(e) => setSettings({ ...settings, maxNightlyRate: Number(e.target.value) })} />
            </label>
            <label className="text-sm text-slate-400">
              Check-in
              <input className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white" value={settings.defaultCheckInTime} onChange={(e) => setSettings({ ...settings, defaultCheckInTime: e.target.value })} />
            </label>
            <label className="text-sm text-slate-400">
              Check-out
              <input className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white" value={settings.defaultCheckOutTime} onChange={(e) => setSettings({ ...settings, defaultCheckOutTime: e.target.value })} />
            </label>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={settings.requireAdminApproval ?? false} onChange={(e) => setSettings({ ...settings, requireAdminApproval: e.target.checked })} />
            Require admin approval before listings go live
          </label>
          <Button className="mt-4 w-full justify-center sm:w-auto" onClick={() => void saveSettings()}>Save settings</Button>
        </AdminPanel>
      )}
    </div>
  );
}
