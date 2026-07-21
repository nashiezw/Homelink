"use client";

import { BellRing, MessageCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import type { TenantRequestRecord } from "@/lib/tenant-requests/types";

export function AgentPropertyRequestsPanel() {
  const [requests, setRequests] = useState<TenantRequestRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const selected = useMemo(() => requests.find((request) => request.id === selectedId) ?? requests[0], [requests, selectedId]);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await apiFetch<{ requests: TenantRequestRecord[] }>("/api/v1/agents/property-requests");
    setRequests(result.data?.requests ?? []);
    if (!selectedId && result.data?.requests?.[0]) setSelectedId(result.data.requests[0].id);
    setLoading(false);
  }, [selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function action(body: Record<string, unknown>) {
    if (!selected) return;
    setBusy(true);
    const result = await apiFetch<{ request: TenantRequestRecord; message?: string }>("/api/v1/agents/property-requests", {
      method: "PATCH",
      body: JSON.stringify({ requestId: selected.id, ...body }),
    });
    if (result.data?.request) {
      setRequests((current) => current.map((request) => (request.id === result.data?.request.id ? result.data.request : request)));
    }
    if (result.data?.message) setMessage(result.data.message);
    setBusy(false);
  }

  async function template(actionName: "whatsapp_template" | "still_looking_template") {
    if (!selected) return;
    setBusy(true);
    const result = await apiFetch<{ message: string }>("/api/v1/agents/property-requests", {
      method: "PATCH",
      body: JSON.stringify({ requestId: selected.id, action: actionName, listingIds: selected.matches.slice(0, 3).map((match) => match.listingId) }),
    });
    setMessage(result.data?.message ?? "");
    setBusy(false);
  }

  if (loading) return <p className="text-sm text-slate-500">Loading assigned property requests...</p>;
  if (!requests.length) return <p className="premium-card rounded-xl p-5 text-sm text-slate-500">No property requests assigned to you yet.</p>;

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-2">
        {requests.map((request) => (
          <button
            key={request.id}
            type="button"
            onClick={() => {
              setSelectedId(request.id);
              setMessage("");
            }}
            className={`w-full rounded-lg border p-4 text-left transition ${
              selected?.id === request.id
                ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                : "border-slate-200 bg-white hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-ink dark:text-white">{request.name}</p>
              <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-[11px] font-semibold text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-200">{request.status}</span>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {request.intent === "buy" ? "Buy" : request.propertyType === "holiday_home" ? "Holiday stay" : "Rent"} - {request.bedrooms ?? "Any"} bed {formatPropertyType(request.propertyType)}
            </p>
            <p className="mt-1 text-xs text-slate-500">{request.matches.length} matches - expires {new Date(request.expiresAt).toLocaleDateString()}</p>
          </button>
        ))}
      </aside>

      {selected && (
        <section className="premium-card rounded-xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Assigned request</p>
              <h2 className="mt-1 text-xl font-semibold text-ink dark:text-white">{selected.name}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{selected.phone}{selected.email ? ` - ${selected.email}` : ""}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" disabled={busy} onClick={() => action({ action: "refresh_matches" })}>
                <RefreshCw className="size-4" />
                Refresh
              </Button>
              <Button disabled={busy || !selected.matches.length} onClick={() => action({ action: "notify", listingIds: selected.matches.slice(0, 3).map((match) => match.listingId) })}>
                <BellRing className="size-4" />
                Mark notified
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Intent" value={selected.intent === "buy" ? "Buying" : "Renting"} />
            <Detail label="Budget" value={selected.maxBudget ? `$${selected.maxBudget}` : "Not set"} />
            <Detail label="Areas" value={[...selected.preferredAreas, ...selected.alternativeAreas].join(", ")} />
            <Detail label="Features" value={selected.mustHaves.join(", ") || "None"} />
          </div>

          {selected.notes && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{selected.notes}</p>}

          <div className="mt-5 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Best matches</h3>
            {selected.matches.length ? selected.matches.slice(0, 6).map((match) => (
              <article key={match.listingId} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink dark:text-white">{match.listingTitle}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{match.suburb}, {match.city} - ${match.price}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">{labelize(match.label)} - {match.score}%</span>
                </div>
              </article>
            )) : <p className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-700">No matches yet.</p>}
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <Button variant="secondary" disabled={busy} onClick={() => void template("whatsapp_template")}>
              <MessageCircle className="size-4" />
              Match message
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => void template("still_looking_template")}>Still looking?</Button>
            <Button variant="secondary" disabled={busy} onClick={() => action({ action: "extend", days: 30 })}>Extend 30 days</Button>
          </div>

          {message && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">WhatsApp-ready message</p>
                <a href={`https://wa.me/${phoneToWhatsApp(selected.phone)}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500">
                  Open WhatsApp
                </a>
              </div>
              <textarea readOnly value={message} className="mt-3 min-h-32 w-full rounded-lg border border-emerald-200 bg-white p-3 text-sm leading-6 text-slate-700 dark:border-emerald-900 dark:bg-slate-950 dark:text-slate-100" />
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function labelize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatPropertyType(value: string) {
  return value === "holiday_home" ? "holiday home" : value.replace(/-/g, " ");
}

function phoneToWhatsApp(value: string) {
  return value.replace(/[^\d]/g, "");
}
