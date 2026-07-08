"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Calendar, CheckCircle2, Clock } from "lucide-react";
import { AdminKpiCard } from "@/components/admin/kpi-card";
import type { AgentActivityRow } from "@/lib/enquiries/agent-activity";
import { apiFetch } from "@/lib/api/client";

export function AgentActivityPanel() {
  const [rows, setRows] = useState<AgentActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await apiFetch<{ rows: AgentActivityRow[] }>("/api/v1/admin/agents/activity");
    setRows(result.data?.rows ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = rows.reduce(
    (acc, row) => ({
      pendingViewings: acc.pendingViewings + row.pendingViewings,
      overdueFollowUps: acc.overdueFollowUps + row.overdueFollowUps,
      dealsClosed: acc.dealsClosed + row.dealsClosed,
    }),
    { pendingViewings: 0, overdueFollowUps: 0, dealsClosed: 0 },
  );

  if (loading) {
    return <p className="text-sm text-slate-400">Loading agent activity...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <AdminKpiCard label="Pending viewings" value={totals.pendingViewings} icon={Calendar} tone="warning" />
        <AdminKpiCard label="Overdue follow-ups" value={totals.overdueFollowUps} icon={AlertTriangle} tone="danger" />
        <AdminKpiCard label="Deals closed" value={totals.dealsClosed} icon={CheckCircle2} />
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">No assigned agent activity yet.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <article key={row.agentId} className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{row.agentName}</p>
                  <p className="text-sm text-slate-400">
                    {row.pendingViewings} pending viewings · {row.overdueFollowUps} overdue follow-ups · {row.dealsClosed}{" "}
                    deals closed
                  </p>
                </div>
              </div>

              {row.upcomingViewings.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Upcoming viewings</p>
                  {row.upcomingViewings.map((viewing) => (
                    <div
                      key={`${viewing.enquiryId}-${viewing.referenceNumber}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-950/50 px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium text-emerald-300">{viewing.referenceNumber}</p>
                        <p className="text-slate-400">
                          {viewing.propertyTitle} · {viewing.customerName}
                        </p>
                      </div>
                      <p className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="size-3.5" />
                        {new Date(viewing.scheduledAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
