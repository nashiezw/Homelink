"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import type { TenancyDispute } from "@/lib/residence/types";

export function TenancyDisputesHub() {
  const { showToast } = useApp();
  const [disputes, setDisputes] = useState<TenancyDispute[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [resolving, setResolving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const query = filter === "open" ? "?status=open" : "";
    const [result, openRes] = await Promise.all([
      apiFetch<{ disputes: TenancyDispute[] }>(`/api/v1/admin/tenancy-disputes${query}`),
      apiFetch<{ disputes: TenancyDispute[] }>("/api/v1/admin/tenancy-disputes?status=open"),
    ]);
    setDisputes(result.data?.disputes ?? []);
    setOpenCount(openRes.data?.disputes.length ?? 0);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function resolve(disputeId: string, resolution: "upheld" | "removed") {
    setResolving(disputeId);
    const result = await apiFetch(`/api/v1/admin/tenancy-disputes/${disputeId}`, {
      method: "PATCH",
      body: JSON.stringify({ resolution, adminNote: notes[disputeId] ?? "" }),
    });
    setResolving(null);
    if (result.data) {
      showToast(resolution === "upheld" ? "Dispute upheld — record stays visible." : "Record removed from public history.");
      void load();
    } else {
      showToast(result.error?.message ?? "Could not resolve dispute.", "error");
    }
  }

  if (loading) {
    return <p className="text-slate-400">Loading tenancy disputes...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant={filter === "open" ? "primary" : "secondary"} onClick={() => setFilter("open")}>
          Open ({openCount})
        </Button>
        <Button variant={filter === "all" ? "primary" : "secondary"} onClick={() => setFilter("all")}>
          All disputes
        </Button>
      </div>

      {disputes.length === 0 ? (
        <p className="text-sm text-slate-400">No tenancy disputes in this queue.</p>
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => (
            <article
              key={d.id}
              className="rounded-lg border border-white/5 bg-slate-950/50 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase text-amber-400">
                    <AlertTriangle className="size-3.5" />
                    Tenancy dispute
                  </p>
                  <p className="mt-1 font-medium text-white">{d.reason}</p>
                  <p className="mt-1 text-sm text-slate-400">Reported by {d.reportedByName}</p>
                  <p className="mt-2 text-sm text-slate-300">{d.details}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Tenancy {d.tenancyId} · {d.status} · {new Date(d.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="rounded-full bg-amber-500/20 px-2 py-1 text-xs text-amber-300">{d.status}</span>
              </div>

              {(d.status === "open" || d.status === "under_review") && (
                <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
                  <textarea
                    rows={2}
                    placeholder="Admin note (optional)"
                    value={notes[d.id] ?? ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [d.id]: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={resolving === d.id}
                      onClick={() => void resolve(d.id, "upheld")}
                    >
                      <CheckCircle2 className="size-4" />
                      Uphold record
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={resolving === d.id}
                      onClick={() => void resolve(d.id, "removed")}
                    >
                      <XCircle className="size-4" />
                      Remove record
                    </Button>
                  </div>
                </div>
              )}

              {d.adminNote && (
                <p className="mt-3 text-xs text-slate-500">Admin note: {d.adminNote}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
