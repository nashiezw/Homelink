"use client";

import { Calendar, CheckCircle2, Clock, Download, RefreshCw, Search, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AdminKpiCard } from "@/components/admin/kpi-card";
import {
  AdminEmptyState,
  AdminFilterBar,
  AdminPanel,
  AdminSearchInput,
  AdminSelect,
  AdminStatusBadge,
  AdminTabStrip,
} from "@/components/admin/ui/admin-ui";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { AdminActionDialog, type AdminDialogConfig } from "@/components/admin/action-dialog";

type BookingEnquiry = {
  id: string;
  listingId: string;
  listingTitle: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  estimatedNights: number;
  estimatedTotal: number;
  status: string;
  createdAt: string;
};

type BookingsData = {
  enquiries: BookingEnquiry[];
  analytics: {
    bookingEnquiries: number;
    conversionRate: number;
    views: number;
  };
};

export function BookingsAdminHub() {
  const { showToast } = useApp();
  const [data, setData] = useState<BookingsData | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [view, setView] = useState<"timeline" | "calendar">("timeline");
  const [selected, setSelected] = useState<BookingEnquiry | null>(null);
  const [dialog, setDialog] = useState<AdminDialogConfig | null>(null);

  const load = useCallback(async () => {
    const result = await apiFetch<BookingsData & { enquiries: BookingEnquiry[] }>("/api/v1/admin/holiday-homes");
    if (result.data) {
      setData({
        enquiries: result.data.enquiries,
        analytics: result.data.analytics,
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(enquiryId: string, status: string, note?: string) {
    const result = await apiFetch("/api/v1/admin/holiday-homes", {
      method: "PATCH",
      body: JSON.stringify({ enquiryId, enquiryStatus: status, note }),
    });
    if (result.error) {
      showToast(result.error.message ?? "Update failed.", "error");
      return;
    }
    showToast(`Booking marked ${status.toLowerCase()}.`);
    void load();
  }

  function requestStatusUpdate(enquiry: BookingEnquiry, status: "ACCEPTED" | "DECLINED" | "CANCELLED") {
    setDialog({
      title: `${status === "ACCEPTED" ? "Approve" : status === "DECLINED" ? "Decline" : "Cancel"} booking`,
      message: `Send a clear response for ${enquiry.guestName}'s booking request at ${enquiry.listingTitle}.`,
      tone: status === "ACCEPTED" ? "success" : "warning",
      confirmLabel: status === "ACCEPTED" ? "Approve booking" : status === "DECLINED" ? "Decline booking" : "Cancel booking",
      fields: [
        {
          name: "note",
          label: status === "ACCEPTED" ? "Guest message or check-in note" : "Reason",
          type: "textarea",
          required: status !== "ACCEPTED",
          placeholder: status === "ACCEPTED" ? "Confirmed. We will share check-in details shortly." : "Explain the reason clearly",
        },
      ],
      onConfirm: (values) => updateStatus(enquiry.id, status, values.note || undefined),
    });
  }

  const enquiries = (data?.enquiries ?? []).filter((e) => {
    if (statusFilter && e.status !== statusFilter) return false;
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return (
      e.listingTitle.toLowerCase().includes(needle) ||
      e.guestName.toLowerCase().includes(needle) ||
      e.id.toLowerCase().includes(needle)
    );
  });

  const pending = data?.enquiries.filter((e) => e.status === "PENDING").length ?? 0;
  const accepted = data?.enquiries.filter((e) => e.status === "ACCEPTED").length ?? 0;
  const declined = data?.enquiries.filter((e) => e.status === "DECLINED").length ?? 0;

  function statusVariant(status: string): "warning" | "success" | "danger" | "muted" {
    if (status === "PENDING") return "warning";
    if (status === "ACCEPTED") return "success";
    if (status === "DECLINED" || status === "CANCELLED") return "danger";
    return "muted";
  }

  return (
    <div className="space-y-6">
      <AdminActionDialog config={dialog} onClose={() => setDialog(null)} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard label="Total enquiries" value={data?.enquiries.length ?? 0} icon={Calendar} />
        <AdminKpiCard label="Pending approval" value={pending} icon={Clock} tone="warning" />
        <AdminKpiCard label="Confirmed" value={accepted} icon={CheckCircle2} tone="success" />
        <AdminKpiCard
          label="Conversion rate"
          value={`${data?.analytics.conversionRate ?? 0}%`}
          icon={Download}
        />
      </div>

      <AdminTabStrip
        active={view}
        onChange={(id) => setView(id as "timeline" | "calendar")}
        tabs={[
          { id: "timeline", label: "Timeline", count: enquiries.length },
          { id: "calendar", label: "Calendar view" },
        ]}
      />

      <AdminFilterBar>
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <AdminSearchInput
            value={q}
            onChange={setQ}
            placeholder="Search guest, listing, or booking ID..."
            className="pl-10"
          />
        </div>
        <AdminSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "", label: "All statuses" },
            { value: "PENDING", label: "Pending" },
            { value: "ACCEPTED", label: "Accepted" },
            { value: "DECLINED", label: "Declined" },
            { value: "CANCELLED", label: "Cancelled" },
          ]}
        />
        <Button variant="secondary" onClick={() => void load()}>
          <RefreshCw className="size-4" />
        </Button>
      </AdminFilterBar>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {view === "calendar" ? (
            <AdminPanel title="Upcoming check-ins" description="Grouped by arrival date">
              <div className="space-y-4">
                {Object.entries(
                  enquiries.reduce<Record<string, BookingEnquiry[]>>((acc, e) => {
                    (acc[e.checkIn] ??= []).push(e);
                    return acc;
                  }, {}),
                )
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, items]) => (
                    <div key={date}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                        {new Date(date).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                      </p>
                      <div className="space-y-2">
                        {items.map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => setSelected(e)}
                            className="flex w-full items-center justify-between rounded-lg border border-white/[0.06] bg-slate-950/40 px-4 py-3 text-left text-sm hover:border-emerald-500/20"
                          >
                            <span className="font-medium text-white">{e.guestName}</span>
                            <AdminStatusBadge status={e.status} variant={statusVariant(e.status)} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                {!enquiries.length && (
                  <AdminEmptyState icon={Calendar} title="No bookings in this view" description="Adjust filters or wait for new enquiries." />
                )}
              </div>
            </AdminPanel>
          ) : (
            <AdminPanel title="Booking timeline" description="Holiday home & short-stay enquiries">
              {!enquiries.length ? (
                <AdminEmptyState icon={Calendar} title="No bookings match your filters" />
              ) : (
                <div className="space-y-3">
                  {enquiries.map((e) => (
                    <article
                      key={e.id}
                      className={`cursor-pointer rounded-xl border p-4 transition ${
                        selected?.id === e.id
                          ? "border-emerald-500/40 bg-emerald-500/5"
                          : "border-white/[0.06] bg-slate-950/40 hover:border-white/10"
                      }`}
                      onClick={() => setSelected(e)}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{e.listingTitle}</p>
                          <p className="text-sm text-slate-400">{e.guestName}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {e.checkIn} → {e.checkOut} · {e.guests} guests · {e.estimatedNights} nights
                          </p>
                        </div>
                        <AdminStatusBadge status={e.status} variant={statusVariant(e.status)} />
                      </div>
                      <p className="mt-2 text-sm font-medium text-emerald-400">${e.estimatedTotal} estimated</p>
                    </article>
                  ))}
                </div>
              )}
            </AdminPanel>
          )}
        </div>

        <AdminPanel title="Booking detail" description={selected ? selected.id : "Select a booking"}>
          {!selected ? (
            <p className="text-sm text-slate-500">Select a booking from the timeline to manage check-in, payments, and status.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-lg font-semibold text-white">{selected.listingTitle}</p>
                <p className="text-sm text-slate-400">{selected.guestName}</p>
                {selected.guestEmail && <p className="text-xs text-slate-500">{selected.guestEmail}</p>}
                {selected.guestPhone && <p className="text-xs text-slate-500">{selected.guestPhone}</p>}
              </div>
              <div className="rounded-lg bg-slate-950/50 p-3 text-sm">
                <Metric label="Check-in" value={selected.checkIn} />
                <Metric label="Check-out" value={selected.checkOut} />
                <Metric label="Guests" value={String(selected.guests)} />
                <Metric label="Total" value={`$${selected.estimatedTotal}`} />
                <Metric label="Submitted" value={new Date(selected.createdAt).toLocaleString()} />
              </div>
              <div className="flex flex-wrap gap-2">
                {selected.status === "PENDING" && (
                  <>
                    <Button onClick={() => requestStatusUpdate(selected, "ACCEPTED")}>
                      <CheckCircle2 className="size-4" /> Approve
                    </Button>
                    <Button variant="secondary" onClick={() => requestStatusUpdate(selected, "DECLINED")}>
                      <XCircle className="size-4" /> Decline
                    </Button>
                  </>
                )}
                {selected.status === "ACCEPTED" && (
                  <Button variant="secondary" onClick={() => requestStatusUpdate(selected, "CANCELLED")}>
                    Cancel booking
                  </Button>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {declined} declined · {accepted} confirmed across all listings
              </p>
            </div>
          )}
        </AdminPanel>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-white/5 py-2 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-200">{value}</span>
    </div>
  );
}
