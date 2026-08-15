"use client";

import { RefreshCw, Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  target: string;
  createdAt: string;
  ip?: string;
  metadata?: Record<string, unknown> | null;
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
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async (offset = 0) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50", offset: String(offset) });
    if (q.trim()) params.set("q", q.trim());
    const result = await fetch(`/api/v1/admin/audit?${params}`);
    const json = await result.json();
    if (json.data) setData(json.data);
    setLoading(false);
  }, [q]);

  async function resendFailedEmail(entry: AuditEntry) {
    setResendingId(entry.id);
    setResendMessage(null);
    try {
      const response = await fetch(`/api/v1/admin/audit/${entry.id}/resend-email`, { method: "POST" });
      const json = await response.json();
      if (!response.ok || json.error) {
        setResendMessage({ ok: false, text: json.error?.message || "Email could not be resent." });
        return;
      }
      setResendMessage({ ok: true, text: json.data?.message || "Email resent." });
      await load(data?.offset ?? 0);
    } catch {
      setResendMessage({ ok: false, text: "Email could not be resent. Please try again." });
    } finally {
      setResendingId(null);
    }
  }

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
              <button
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className="w-full rounded-lg bg-slate-950/50 px-3 py-2.5 text-sm text-left hover:bg-slate-950/80 transition-colors cursor-pointer"
              >
                <p className="font-medium text-white">
                  {entry.actor} - {entry.action.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-slate-500">
                  Target: {entry.target} - {new Date(entry.createdAt).toLocaleString()}
                </p>
                {entry.metadata && (
                  <p className="text-xs text-emerald-400 mt-1">
                    Click to view details
                  </p>
                )}
              </button>
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

      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-2xl w-full rounded-xl bg-slate-900 border border-white/10 p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Audit Entry Details</h3>
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedEntry(null);
                  setResendMessage(null);
                }}
              >
                <X className="size-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Action</p>
                <p className="text-white font-medium">{selectedEntry.action.replace(/_/g, " ")}</p>
              </div>
              
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Actor</p>
                <p className="text-white">{selectedEntry.actor}</p>
              </div>
              
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Target</p>
                <p className="text-white">{selectedEntry.target}</p>
              </div>
              
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Timestamp</p>
                <p className="text-white">{new Date(selectedEntry.createdAt).toLocaleString()}</p>
              </div>
              
              {selectedEntry.ip && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">IP Address</p>
                  <p className="text-white">{selectedEntry.ip}</p>
                </div>
              )}
              
              {selectedEntry.metadata && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Metadata</p>
                  <pre className="bg-slate-950 rounded-lg p-3 text-xs text-slate-300 overflow-x-auto">
                    {JSON.stringify(selectedEntry.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {canResendEmail(selectedEntry) && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-amber-100">Resend failed email</p>
                      <p className="mt-1 text-xs text-amber-100/70">
                        Sends through the current Platform Settings SMTP configuration and writes a new audit event.
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      loading={resendingId === selectedEntry.id}
                      loadingText="Resending..."
                      onClick={() => void resendFailedEmail(selectedEntry)}
                    >
                      <RefreshCw className="size-4" />
                      Resend email
                    </Button>
                  </div>
                  {resendMessage && (
                    <p className={`mt-3 rounded-md border px-3 py-2 text-sm ${resendMessage.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100" : "border-red-500/30 bg-red-500/10 text-red-100"}`}>
                      {resendMessage.text}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function canResendEmail(entry: AuditEntry) {
  const emailType = typeof entry.metadata?.emailType === "string" ? entry.metadata.emailType : "";
  return entry.action === "EMAIL_SEND_FAILED" && ["email_verification", "welcome_email"].includes(emailType);
}
