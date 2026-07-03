"use client";

import { Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";

type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  target: string;
  createdAt: string;
  ip?: string;
};

type AuditResponse = {
  entries: AuditEntry[];
  total: number;
  limit: number;
  offset: number;
};

export function AuditLogExplorer() {
  const [q, setQ] = useState("");
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (offset = 0) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50", offset: String(offset) });
    if (q.trim()) params.set("q", q.trim());
    const result = await apiFetch<AuditResponse>(`/api/v1/admin/audit?${params}`);
    if (result.data) setData(result.data);
    setLoading(false);
  }, [q]);

  useEffect(() => {
    const timer = setTimeout(() => void load(0), 250);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Audit log explorer</h3>
        {data && (
          <p className="text-xs text-slate-500">
            Showing {data.entries.length} of {data.total} entries
          </p>
        )}
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search actor, action, or target..."
          className="w-full rounded-lg border border-white/10 bg-slate-950 py-2 pl-10 pr-3 text-sm text-white"
        />
      </div>

      {loading && <p className="text-sm text-slate-400">Loading audit log...</p>}

      {!loading && data && (
        <>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {data.entries.map((entry) => (
              <div key={entry.id} className="rounded-lg bg-slate-950/50 px-3 py-2.5 text-sm">
                <p className="font-medium text-white">
                  {entry.actor} — {entry.action.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-slate-500">
                  Target: {entry.target} · {new Date(entry.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
            {!data.entries.length && (
              <p className="text-sm text-slate-400">No audit entries match your search.</p>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              variant="secondary"
              disabled={!data.offset}
              onClick={() => void load(Math.max(0, data.offset - data.limit))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              disabled={data.offset + data.limit >= data.total}
              onClick={() => void load(data.offset + data.limit)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
