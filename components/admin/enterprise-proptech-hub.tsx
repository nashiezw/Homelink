"use client";

import { BarChart3, CalendarCheck, Download, FileSignature, MailCheck, RefreshCw, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminDataTable, AdminPanel, AdminStatusBadge, AdminTabStrip } from "@/components/admin/ui/admin-ui";
import { AdminKpiCard } from "@/components/admin/kpi-card";
import { apiFetch } from "@/lib/api/client";
import { formatPrice } from "@/lib/utils";
import type { MarketInsight } from "@/lib/types";

type AppointmentRow = {
  id: string;
  referenceNumber: string;
  listingTitle: string;
  location: string;
  seekerName: string;
  agentName?: string | null;
  startAt: string;
  endAt: string;
  status: string;
  reminderAt?: string;
};

type SignedAgreementRow = {
  id: string;
  title: string;
  subjectType: string;
  listingTitle?: string;
  signerName: string;
  signerRole: string;
  contentHash: string;
  signedAt: string;
  downloadUrl: string;
};

type TourAnalyticsRow = {
  id: string;
  tourId: string;
  listingId: string;
  tourTitle: string;
  listingTitle: string;
  location: string;
  totalEvents: number;
  views: number;
  sceneViews: number;
  hotspotClicks: number;
  fullscreenOpens: number;
  lastViewedAt?: string;
};

type NotificationRow = {
  id: string;
  channel: string;
  status: string;
  subject: string;
  createdAt: string;
  sentAt?: string;
};

type PropTechData = {
  appointments: AppointmentRow[];
  signedAgreements: SignedAgreementRow[];
  insights: MarketInsight[];
  tourAnalytics: TourAnalyticsRow[];
  notifications: NotificationRow[];
};

export function EnterprisePropTechHub() {
  const [data, setData] = useState<PropTechData | null>(null);
  const [active, setActive] = useState("appointments");
  const [loading, setLoading] = useState(true);
  const [reminderState, setReminderState] = useState<string>("");

  async function load() {
    setLoading(true);
    const result = await apiFetch<PropTechData>("/api/v1/admin/proptech");
    if (result.data) setData(result.data);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function queueReminders() {
    setReminderState("Checking due reminders...");
    const result = await apiFetch<{ queued: number; checked: number }>("/api/v1/notifications/reminders", { method: "POST" });
    setReminderState(result.data ? `Queued ${result.data.queued} reminder notifications from ${result.data.checked} due appointments.` : "Reminder job could not run.");
    await load();
  }

  const weekAppointments = useMemo(() => {
    if (!data) return [];
    const now = Date.now();
    const end = now + 7 * 24 * 60 * 60 * 1000;
    return data.appointments.filter((item) => {
      const time = new Date(item.startAt).getTime();
      return time >= now && time <= end && item.status !== "CANCELLED";
    });
  }, [data]);

  if (loading && !data) return <p className="text-sm text-slate-400">Loading PropTech suite...</p>;
  if (!data) return <p className="text-sm text-slate-400">PropTech records are not available yet.</p>;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <AdminKpiCard compact label="Week viewings" value={weekAppointments.length} icon={CalendarCheck} tone="success" />
        <AdminKpiCard compact label="Signed vault" value={data.signedAgreements.length} icon={FileSignature} />
        <AdminKpiCard compact label="Insight snapshots" value={data.insights.length} icon={BarChart3} />
        <AdminKpiCard compact label="Tour events" value={data.tourAnalytics.reduce((sum, item) => sum + item.totalEvents, 0)} icon={Video} />
        <AdminKpiCard compact label="Queued notifications" value={data.notifications.filter((item) => item.status === "QUEUED").length} icon={MailCheck} tone="warning" />
      </div>

      <AdminTabStrip
        active={active}
        onChange={setActive}
        tabs={[
          { id: "appointments", label: "Appointments", count: weekAppointments.length },
          { id: "signatures", label: "Signed Vault", count: data.signedAgreements.length },
          { id: "insights", label: "Market Intelligence", count: data.insights.length },
          { id: "tours", label: "Tour Analytics", count: data.tourAnalytics.length },
          { id: "notifications", label: "Notifications", count: data.notifications.filter((item) => item.status === "QUEUED").length },
        ]}
      />

      {active === "appointments" && (
        <AdminPanel
          title="Appointments calendar"
          description="Durable PostgreSQL bookings with conflict-aware slots, status, reminders, and calendar exports."
          action={
            <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/5">
              <RefreshCw className="size-4" /> Refresh
            </button>
          }
        >
          <div className="mb-4 grid gap-2 sm:grid-cols-7">
            {Array.from({ length: 7 }).map((_, index) => {
              const date = new Date();
              date.setDate(date.getDate() + index);
              const dayRows = data.appointments.filter((item) => new Date(item.startAt).toDateString() === date.toDateString());
              return (
                <div key={date.toISOString()} className="min-h-28 rounded-xl border border-white/10 bg-slate-950/60 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{date.toLocaleDateString(undefined, { weekday: "short" })}</p>
                  <p className="text-sm font-semibold text-white">{date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
                  <div className="mt-3 space-y-2">
                    {dayRows.slice(0, 3).map((item) => (
                      <div key={item.id} className="rounded-lg bg-emerald-500/10 px-2 py-1.5 text-xs text-emerald-100">
                        <p className="truncate font-semibold">{new Date(item.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} {item.seekerName}</p>
                        <p className="truncate text-emerald-200/70">{item.listingTitle}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <AdminDataTable
            rows={data.appointments}
            columns={[
              { key: "ref", header: "Reference", render: (row) => <span>{row.referenceNumber}</span> },
              { key: "listing", header: "Listing", render: (row) => <span>{row.listingTitle}</span> },
              { key: "client", header: "Client", render: (row) => <span>{row.seekerName}</span> },
              { key: "time", header: "Time", render: (row) => <span>{new Date(row.startAt).toLocaleString()}</span> },
              { key: "status", header: "Status", render: (row) => <AdminStatusBadge status={row.status} variant={row.status === "CANCELLED" ? "danger" : "info"} /> },
              { key: "export", header: "Calendar", render: (row) => <a href={`/api/v1/appointments/${row.id}/ics`} className="text-emerald-300 hover:text-emerald-200">ICS</a> },
            ]}
          />
        </AdminPanel>
      )}

      {active === "signatures" && (
        <AdminPanel title="Signed documents vault" description="Locked signed records with content hash, signer identity, timestamps, and downloadable PDFs.">
          <AdminDataTable
            rows={data.signedAgreements}
            columns={[
              { key: "title", header: "Document", render: (row) => <span>{row.title}</span> },
              { key: "signer", header: "Signer", render: (row) => <span>{row.signerName} - {row.signerRole}</span> },
              { key: "listing", header: "Listing", render: (row) => <span>{row.listingTitle ?? row.subjectType}</span> },
              { key: "hash", header: "Hash", render: (row) => <span className="font-mono text-xs">{row.contentHash.slice(0, 12)}...</span> },
              { key: "date", header: "Signed", render: (row) => <span>{new Date(row.signedAt).toLocaleString()}</span> },
              { key: "download", header: "PDF", render: (row) => <a href={row.downloadUrl} className="inline-flex items-center gap-1 text-emerald-300"><Download className="size-4" /> PDF</a> },
            ]}
          />
        </AdminPanel>
      )}

      {active === "insights" && (
        <AdminPanel title="Market intelligence dashboard" description="Comparable matching, confidence scores, demand signals, rent bands, and price trend snapshots.">
          <div className="grid gap-4 lg:grid-cols-2">
            {data.insights.map((insight) => (
              <article key={insight.id} className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{insight.suburb}, {insight.city}</p>
                    <p className="text-xs text-slate-500">{insight.propertyType} - {insight.sampleSize} comparables - confidence {insight.confidenceScore ?? 0}/100</p>
                  </div>
                  <AdminStatusBadge status={insight.vacancyRisk} variant={insight.vacancyRisk === "LOW" ? "success" : insight.vacancyRisk === "HIGH" ? "danger" : "warning"} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <MiniMetric label="Median" value={formatPrice(insight.medianPrice)} />
                  <MiniMetric label="Band low" value={formatPrice(insight.recommendedPriceMin)} />
                  <MiniMetric label="Band high" value={formatPrice(insight.recommendedPriceMax)} />
                </div>
                {insight.priceTrend?.length ? (
                  <div className="mt-4 flex h-20 items-end gap-2">
                    {insight.priceTrend.map((point) => {
                      const max = Math.max(...(insight.priceTrend ?? []).map((item) => item.medianPrice), 1);
                      return <div key={point.period} className="flex-1 rounded-t bg-cyan-500/70" style={{ height: `${Math.max(14, (point.medianPrice / max) * 72)}px` }} title={`${point.period}: ${formatPrice(point.medianPrice)}`} />;
                    })}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </AdminPanel>
      )}

      {active === "tours" && (
        <AdminPanel title="Virtual tour analytics" description="Per-listing tour views, room navigation, hotspot engagement, and fullscreen usage.">
          <AdminDataTable
            rows={data.tourAnalytics}
            columns={[
              { key: "tour", header: "Tour", render: (row) => <span>{row.tourTitle}</span> },
              { key: "listing", header: "Listing", render: (row) => <span>{row.listingTitle}</span> },
              { key: "views", header: "Views", render: (row) => <span>{row.views}</span> },
              { key: "rooms", header: "Rooms", render: (row) => <span>{row.sceneViews}</span> },
              { key: "hotspots", header: "Hotspots", render: (row) => <span>{row.hotspotClicks}</span> },
              { key: "last", header: "Last viewed", render: (row) => <span>{row.lastViewedAt ? new Date(row.lastViewedAt).toLocaleString() : "Never"}</span> },
            ]}
          />
        </AdminPanel>
      )}

      {active === "notifications" && (
        <AdminPanel
          title="Notification operations"
          description="Email/SMS/WhatsApp-ready queue records for booking confirmations, reminders, and admin follow-ups."
          action={
            <button type="button" onClick={() => void queueReminders()} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
              <MailCheck className="size-4" /> Queue due reminders
            </button>
          }
        >
          {reminderState && <p className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">{reminderState}</p>}
          <AdminDataTable
            rows={data.notifications}
            columns={[
              { key: "subject", header: "Subject", render: (row) => <span>{row.subject}</span> },
              { key: "channel", header: "Channel", render: (row) => <span>{row.channel}</span> },
              { key: "status", header: "Status", render: (row) => <AdminStatusBadge status={row.status} variant={row.status === "FAILED" ? "danger" : row.status === "SENT" ? "success" : "warning"} /> },
              { key: "created", header: "Created", render: (row) => <span>{new Date(row.createdAt).toLocaleString()}</span> },
            ]}
          />
        </AdminPanel>
      )}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}
