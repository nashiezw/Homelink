"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Download } from "lucide-react";
import { apiFetch } from "@/lib/api/client";

type SiteReport = {
  days: number;
  pageViews: number;
  uniqueVisitors: number;
  avgDurationSec: number;
  topPages: Array<{ label: string; value: number }>;
  devices: Array<{ label: string; value: number }>;
  referrers: Array<{ label: string; value: number }>;
  utmSources: Array<{ label: string; value: number }>;
  funnel: Array<{ label: string; value: number }>;
  funnelDropoff: Array<{ label: string; value: number; pctOfPrevious: number | null; pctOfFirst: number | null }>;
  whatsappSources: Array<{ label: string; value: number }>;
  channels: Array<{ label: string; value: number }>;
  proofSla: {
    pending: number;
    overdue: number;
    overduePct: number;
    medianWaitHours: number;
    stuck: Array<{ orderNumber: string; waitHours: number }>;
  };
  recentPaths: Array<{ path: string; minutes: number; deviceType: string; referrer: string; at: string }>;
};

function BarList({ rows, color = "bg-emerald-500" }: { rows: Array<{ label: string; value: number }>; color?: string }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  if (!rows.length) {
    return <p className="text-sm text-slate-400">No data in this period yet.</p>;
  }
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs text-slate-300">
            <span className="min-w-0 truncate font-medium">{row.label}</span>
            <span className="shrink-0 tabular-nums">{row.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SiteAnalyticsPanel() {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<SiteReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void apiFetch<SiteReport>(`/api/v1/admin/site-analytics?days=${days}`).then((result) => {
      if (cancelled) return;
      if (result.error || !result.data) {
        setError(result.error?.message || "Could not load site analytics.");
        return;
      }
      setError("");
      setReport(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const whatsappClicks = report?.funnel.find((row) => /whatsapp/i.test(row.label))?.value ?? 0;

  return (
    <div className="grid gap-5 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Site visitor analytics</h3>
          <p className="mt-1 text-xs text-slate-400">
            First-party tracking with opt-out / Do Not Track. Funnel drop-off, WhatsApp attribution, proof SLA, and channel cohorts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-9 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <a
            href={`/api/v1/admin/site-analytics/export?days=${days}`}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-sm font-semibold text-slate-200 hover:bg-white/5"
          >
            <Download className="size-4" />
            Export CSV
          </a>
        </div>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Page views" value={report?.pageViews ?? "—"} />
        <Metric label="Unique visitors" value={report?.uniqueVisitors ?? "—"} />
        <Metric label="Avg time / page" value={report ? `${report.avgDurationSec}s` : "—"} />
        <Metric label="WhatsApp clicks" value={whatsappClicks} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Proofs pending" value={report?.proofSla.pending ?? "—"} />
        <Metric label="Proofs overdue (24h+)" value={report?.proofSla.overdue ?? "—"} />
        <Metric label="Overdue %" value={report ? `${report.proofSla.overduePct}%` : "—"} />
        <Metric label="Median wait (hours)" value={report?.proofSla.medianWaitHours ?? "—"} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Library funnel drop-off">
          {(report?.funnelDropoff ?? []).length ? (
            <div className="space-y-2">
              {report!.funnelDropoff.map((row) => (
                <div key={row.label} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-white">{row.label}</span>
                    <span className="tabular-nums">{row.value}</span>
                  </div>
                  <p className="mt-1 text-slate-500">
                    {row.pctOfPrevious != null ? `${row.pctOfPrevious}% of previous · ` : ""}
                    {row.pctOfFirst != null ? `${row.pctOfFirst}% of first step` : "—"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No funnel data yet.</p>
          )}
        </Panel>
        <Panel title="WhatsApp click sources">
          <BarList rows={report?.whatsappSources ?? []} color="bg-[#25D366]" />
        </Panel>
        <Panel title="Channel cohorts">
          <BarList rows={report?.channels ?? []} color="bg-sky-500" />
        </Panel>
        <Panel title="Proof queue (stuck)">
          {(report?.proofSla.stuck ?? []).length ? (
            <div className="space-y-2 text-xs text-slate-300">
              {report!.proofSla.stuck.map((row) => (
                <div key={row.orderNumber} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
                  <span className="font-semibold text-white">{row.orderNumber}</span>
                  <span className={row.waitHours >= 24 ? "font-bold text-amber-300" : ""}>{row.waitHours}h</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No proofs waiting right now.</p>
          )}
        </Panel>
        <Panel title="Top pages">
          <BarList rows={report?.topPages ?? []} />
        </Panel>
        <Panel title="Devices">
          <BarList rows={report?.devices ?? []} color="bg-violet-500" />
        </Panel>
        <Panel title="Referrers">
          <BarList rows={report?.referrers ?? []} color="bg-amber-500" />
        </Panel>
        <Panel title="UTM sources">
          <BarList rows={report?.utmSources ?? []} color="bg-rose-500" />
        </Panel>
        <Panel title="Recent page visits">
          <div className="max-h-64 space-y-2 overflow-y-auto text-xs text-slate-300">
            {(report?.recentPaths ?? []).length ? (
              report!.recentPaths.map((row, index) => (
                <div key={`${row.path}-${row.at}-${index}`} className="rounded-lg border border-white/10 px-3 py-2">
                  <p className="truncate font-semibold text-white">{row.path}</p>
                  <p className="mt-1 text-slate-400">
                    {row.deviceType} · {row.minutes} min · {row.referrer}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-slate-400">Visits will appear as shoppers browse the site.</p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-white">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-300">{title}</h4>
      <div className="mt-3">{children}</div>
    </div>
  );
}
