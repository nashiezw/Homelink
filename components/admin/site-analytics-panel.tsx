"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Download, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api/client";

type AdvancedReport = {
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
  live: {
    online: number;
    libraryShoppers: number;
    onCheckout: number;
    openBags: number;
    bagValue: number;
    visitors: Array<{
      visitorId: string;
      path: string;
      title: string;
      deviceType: string;
      productTitle: string;
      cartItemCount: number;
      cartValue: number;
      cartCurrency: string;
      lastSeenAt: string;
      userId: string | null;
    }>;
    alerts: string[];
  };
  products: Array<{
    productId: string;
    title: string;
    views: number;
    uniqueViewers: number;
    adds: number;
    removes: number;
    purchases: number;
    samples: number;
    addRate: number;
    purchaseRate: number;
    formats: Record<string, number>;
  }>;
  cartHeat: {
    mostAdded: Array<{ label: string; value: number }>;
    mostRemoved: Array<{ label: string; value: number }>;
  };
  cartActivity: Array<{
    at: string;
    name: string;
    title: string;
    visitorId: string;
    quantity: number;
    formatLabel: string;
    path: string;
  }>;
  journeys: Array<{
    sessionId: string;
    visitorId: string;
    userId: string | null;
    startedAt: string;
    steps: Array<{ at: string; name: string; detail: string }>;
    whatsappAssisted: boolean;
    purchased: boolean;
  }>;
  revenueByProduct: Array<{ label: string; value: number }>;
  revenueByFormat: Array<{ label: string; value: number }>;
  proofFunnel: Array<{ label: string; value: number }>;
  marketplace: Array<{ label: string; value: number }>;
  engagement: Array<{ label: string; value: number }>;
  cohorts: { newVisitors: number; returningVisitors: number; knownBuyersOnline: number };
  alerts: string[];
};

type Tab = "live" | "products" | "carts" | "journeys" | "revenue" | "overview";

function BarList({ rows, color = "bg-emerald-500" }: { rows: Array<{ label: string; value: number }>; color?: string }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  if (!rows.length) return <p className="text-sm text-slate-400">No data in this period yet.</p>;
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={`${row.label}-${row.value}`}>
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
  const [tab, setTab] = useState<Tab>("live");
  const [report, setReport] = useState<AdvancedReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedJourney, setSelectedJourney] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const result = await apiFetch<AdvancedReport>(`/api/v1/admin/site-analytics?days=${days}`);
    setLoading(false);
    if (result.error || !result.data) {
      setError(result.error?.message || "Could not load advanced analytics.");
      return;
    }
    setError("");
    setReport(result.data);
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (tab === "live") void load();
    }, 20000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, tab]);

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "live", label: "Live now" },
    { id: "products", label: "Products" },
    { id: "carts", label: "Carts" },
    { id: "journeys", label: "Journeys" },
    { id: "revenue", label: "Revenue & proof" },
    { id: "overview", label: "Overview" },
  ];

  return (
    <div className="grid gap-5 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Advanced site analytics</h3>
          <p className="mt-1 text-xs text-slate-400">
            Live presence, product performance, cart add/remove, session journeys, revenue attribution, and proof SLA — first-party only.
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
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-sm font-semibold text-slate-200 hover:bg-white/5"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <a
            href={`/api/v1/admin/site-analytics/export?days=${days}`}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-sm font-semibold text-slate-200 hover:bg-white/5"
          >
            <Download className="size-4" />
            Export CSV
          </a>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
              tab === item.id ? "bg-emerald-500/20 text-emerald-200" : "border border-white/10 text-slate-400 hover:bg-white/5"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {(report?.alerts?.length || report?.live.alerts?.length) ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
          <p className="font-semibold uppercase tracking-wide">Alerts</p>
          <ul className="mt-2 space-y-1">
            {[...(report?.live.alerts ?? []), ...(report?.alerts ?? [])].slice(0, 8).map((alert) => (
              <li key={alert}>• {alert}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {tab === "live" && (
        <div className="grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Metric label="Online now" value={report?.live.online ?? "—"} />
            <Metric label="Library shoppers" value={report?.live.libraryShoppers ?? "—"} />
            <Metric label="On checkout" value={report?.live.onCheckout ?? "—"} />
            <Metric label="Open bags" value={report?.live.openBags ?? "—"} />
            <Metric label="Open bag value" value={report ? `USD ${report.live.bagValue.toFixed(2)}` : "—"} />
          </div>
          <Panel title="Who is online (last 5 minutes)">
            <div className="max-h-96 space-y-2 overflow-y-auto text-xs text-slate-300">
              {(report?.live.visitors ?? []).length ? (
                report!.live.visitors.map((row) => (
                  <div key={`${row.visitorId}-${row.lastSeenAt}`} className="rounded-lg border border-white/10 px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-white">{row.path}</p>
                      <span className="text-slate-500">{row.deviceType}{row.userId ? " · signed in" : ""}</span>
                    </div>
                    {row.productTitle ? <p className="mt-1 text-emerald-300">{row.productTitle}</p> : null}
                    <p className="mt-1 text-slate-500">
                      Bag: {row.cartItemCount} · {row.cartCurrency} {row.cartValue.toFixed(2)} · {new Date(row.lastSeenAt).toLocaleTimeString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-400">No live visitors in the last 5 minutes.</p>
              )}
            </div>
          </Panel>
        </div>
      )}

      {tab === "products" && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs text-slate-300">
            <thead className="border-b border-white/10 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-3">Product</th>
                <th className="py-2 pr-3">Views</th>
                <th className="py-2 pr-3">Uniques</th>
                <th className="py-2 pr-3">Adds</th>
                <th className="py-2 pr-3">Removes</th>
                <th className="py-2 pr-3">Purchases</th>
                <th className="py-2 pr-3">Add %</th>
                <th className="py-2 pr-3">Buy %</th>
                <th className="py-2">Samples</th>
              </tr>
            </thead>
            <tbody>
              {(report?.products ?? []).length ? (
                report!.products.map((row) => (
                  <tr key={row.productId} className="border-b border-white/5">
                    <td className="max-w-[16rem] truncate py-2 pr-3 font-semibold text-white" title={row.title}>
                      {row.title}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{row.views}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.uniqueViewers}</td>
                    <td className="py-2 pr-3 tabular-nums text-emerald-300">{row.adds}</td>
                    <td className="py-2 pr-3 tabular-nums text-amber-300">{row.removes}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.purchases}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.addRate}%</td>
                    <td className="py-2 pr-3 tabular-nums">{row.purchaseRate}%</td>
                    <td className="py-2 tabular-nums">{row.samples}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-4 text-slate-400">
                    Product views and cart events will appear as shoppers browse Library titles.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "carts" && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Most added">
            <BarList rows={report?.cartHeat.mostAdded ?? []} />
          </Panel>
          <Panel title="Most removed">
            <BarList rows={report?.cartHeat.mostRemoved ?? []} color="bg-amber-500" />
          </Panel>
          <Panel title="Recent cart activity">
            <div className="max-h-80 space-y-2 overflow-y-auto text-xs">
              {(report?.cartActivity ?? []).length ? (
                report!.cartActivity.map((row, index) => (
                  <div key={`${row.at}-${row.title}-${index}`} className="rounded-lg border border-white/10 px-3 py-2 text-slate-300">
                    <p className="font-semibold text-white">
                      {row.name.replace(/^library_/, "").replaceAll("_", " ")} · {row.title}
                    </p>
                    <p className="mt-1 text-slate-500">
                      qty {row.quantity} · {row.formatLabel} · {new Date(row.at).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-400">No cart activity yet.</p>
              )}
            </div>
          </Panel>
          <Panel title="Live open bags">
            <div className="max-h-80 space-y-2 overflow-y-auto text-xs">
              {(report?.live.visitors ?? [])
                .filter((row) => row.cartItemCount > 0)
                .map((row) => (
                  <div key={`bag-${row.visitorId}`} className="rounded-lg border border-white/10 px-3 py-2 text-slate-300">
                    <p className="font-semibold text-white">
                      {row.cartItemCount} items · {row.cartCurrency} {row.cartValue.toFixed(2)}
                    </p>
                    <p className="mt-1 text-slate-500">{row.path}</p>
                  </div>
                ))}
              {!report?.live.visitors.some((row) => row.cartItemCount > 0) ? (
                <p className="text-slate-400">No open bags online right now.</p>
              ) : null}
            </div>
          </Panel>
        </div>
      )}

      {tab === "journeys" && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <Panel title="Recent sessions">
            <div className="max-h-[28rem] space-y-2 overflow-y-auto text-xs">
              {(report?.journeys ?? []).map((journey) => (
                <button
                  key={journey.sessionId}
                  type="button"
                  onClick={() => setSelectedJourney(journey.sessionId)}
                  className={`block w-full rounded-lg border px-3 py-2 text-left ${
                    selectedJourney === journey.sessionId ? "border-emerald-400/40 bg-emerald-500/10" : "border-white/10 hover:bg-white/5"
                  }`}
                >
                  <p className="font-semibold text-white">
                    {journey.steps.length} steps · {journey.purchased ? "purchased" : "browsing"}
                    {journey.whatsappAssisted ? " · WhatsApp" : ""}
                  </p>
                  <p className="mt-1 text-slate-500">
                    {new Date(journey.startedAt).toLocaleString()}
                    {journey.userId ? " · known buyer" : ""}
                  </p>
                </button>
              ))}
              {!report?.journeys?.length ? <p className="text-slate-400">Session journeys will appear as events stream in.</p> : null}
            </div>
          </Panel>
          <Panel title="Session timeline">
            {(() => {
              const journey = report?.journeys.find((row) => row.sessionId === selectedJourney) ?? report?.journeys[0];
              if (!journey) return <p className="text-sm text-slate-400">Select a session.</p>;
              return (
                <div className="max-h-[28rem] space-y-2 overflow-y-auto text-xs text-slate-300">
                  {journey.steps.map((step, index) => (
                    <div key={`${step.at}-${index}`} className="rounded-lg border border-white/10 px-3 py-2">
                      <p className="font-semibold text-white">{step.name.replace(/^library_/, "").replaceAll("_", " ")}</p>
                      <p className="mt-1 text-slate-400">{step.detail || "—"}</p>
                      <p className="mt-1 text-slate-500">{new Date(step.at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </Panel>
        </div>
      )}

      {tab === "revenue" && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Revenue by product">
            <BarList rows={report?.revenueByProduct ?? []} />
          </Panel>
          <Panel title="Revenue by format">
            <BarList rows={report?.revenueByFormat ?? []} color="bg-cyan-500" />
          </Panel>
          <Panel title="Proof funnel">
            <BarList rows={report?.proofFunnel ?? []} color="bg-amber-500" />
          </Panel>
          <Panel title="Marketplace engagement">
            <BarList rows={report?.marketplace ?? []} color="bg-violet-500" />
          </Panel>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:col-span-2">
            <Metric label="Proofs pending" value={report?.proofSla.pending ?? "—"} />
            <Metric label="Overdue 24h+" value={report?.proofSla.overdue ?? "—"} />
            <Metric label="Median wait (h)" value={report?.proofSla.medianWaitHours ?? "—"} />
            <Metric label="Known buyers online" value={report?.cohorts.knownBuyersOnline ?? "—"} />
          </div>
        </div>
      )}

      {tab === "overview" && (
        <div className="grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Page views" value={report?.pageViews ?? "—"} />
            <Metric label="Unique visitors" value={report?.uniqueVisitors ?? "—"} />
            <Metric label="Avg time / page" value={report ? `${report.avgDurationSec}s` : "—"} />
            <Metric label="New / returning" value={report ? `${report.cohorts.newVisitors} / ${report.cohorts.returningVisitors}` : "—"} />
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
            <Panel title="WhatsApp sources">
              <BarList rows={report?.whatsappSources ?? []} color="bg-[#25D366]" />
            </Panel>
            <Panel title="Engagement depth">
              <BarList rows={report?.engagement ?? []} color="bg-sky-500" />
            </Panel>
            <Panel title="Top pages">
              <BarList rows={report?.topPages ?? []} />
            </Panel>
            <Panel title="Devices">
              <BarList rows={report?.devices ?? []} color="bg-violet-500" />
            </Panel>
            <Panel title="UTM sources">
              <BarList rows={report?.utmSources ?? []} color="bg-rose-500" />
            </Panel>
          </div>
        </div>
      )}
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
