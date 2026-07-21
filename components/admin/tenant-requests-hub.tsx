"use client";

import { BellRing, CheckCircle2, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import type { TenantRequestRecord } from "@/lib/tenant-requests/types";

type ResponseShape = {
  requests: TenantRequestRecord[];
  agents: Array<{ id: string; name: string; email: string }>;
  analytics: {
    total: number;
    rentCount: number;
    buyCount: number;
    newCount: number;
    matchedCount: number;
    contactedCount: number;
    expiringSoonCount: number;
    expiredCount: number;
  };
};

export function TenantRequestsHub() {
  const [requests, setRequests] = useState<TenantRequestRecord[]>([]);
  const [analytics, setAnalytics] = useState<ResponseShape["analytics"] | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [agents, setAgents] = useState<ResponseShape["agents"]>([]);
  const [whatsappMessage, setWhatsappMessage] = useState("");

  const selected = useMemo(() => requests.find((request) => request.id === selectedId) ?? requests[0], [requests, selectedId]);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await apiFetch<ResponseShape>(`/api/v1/admin/tenant-requests${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    if (result.data) {
      setRequests(result.data.requests);
      setAnalytics(result.data.analytics);
      setAgents(result.data.agents);
      if (!selectedId && result.data.requests[0]) setSelectedId(result.data.requests[0].id);
    }
    setLoading(false);
  }, [query, selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function action(body: Record<string, unknown>) {
    if (!selected) return;
    setBusy(true);
    const result = await apiFetch<{ request: TenantRequestRecord }>("/api/v1/admin/tenant-requests", {
      method: "PATCH",
      body: JSON.stringify({ requestId: selected.id, ...body }),
    });
    if (result.data?.request) {
      setRequests((current) => current.map((request) => (request.id === result.data?.request.id ? result.data.request : request)));
    }
    setBusy(false);
  }

  async function loadWhatsappTemplate(actionName: "whatsapp_template" | "still_looking_template" = "whatsapp_template") {
    if (!selected) return;
    setBusy(true);
    const result = await apiFetch<{ message: string }>("/api/v1/admin/tenant-requests", {
      method: "PATCH",
      body: JSON.stringify({ requestId: selected.id, action: actionName, listingIds: selected.matches.slice(0, 3).map((match) => match.listingId) }),
    });
    setWhatsappMessage(result.data?.message ?? "");
    setBusy(false);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <aside className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Requests" value={analytics?.total ?? 0} />
          <Metric label="Matched" value={analytics?.matchedCount ?? 0} />
          <Metric label="Rent" value={analytics?.rentCount ?? 0} />
          <Metric label="Buy" value={analytics?.buyCount ?? 0} />
          <Metric label="Expiring" value={analytics?.expiringSoonCount ?? 0} />
          <Metric label="Expired" value={analytics?.expiredCount ?? 0} />
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void load();
          }}
          className="flex gap-2"
        >
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search requests"
              className="min-h-11 w-full rounded-lg border border-white/10 bg-slate-950 pl-9 pr-3 text-sm text-white"
            />
          </label>
          <Button type="submit" variant="secondary">Search</Button>
        </form>

        <div className="max-h-[650px] space-y-2 overflow-y-auto pr-1">
          {loading ? (
            <p className="rounded-lg border border-white/10 bg-slate-950 p-4 text-sm text-slate-400">Loading property requests...</p>
          ) : requests.length === 0 ? (
            <p className="rounded-lg border border-white/10 bg-slate-950 p-4 text-sm text-slate-400">No property requests yet.</p>
          ) : (
            requests.map((request) => (
              <button
                key={request.id}
                type="button"
                onClick={() => setSelectedId(request.id)}
                className={`w-full rounded-lg border p-4 text-left transition ${
                  selected?.id === request.id ? "border-emerald-400 bg-emerald-500/10" : "border-white/10 bg-slate-950 hover:border-emerald-500/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-white">{request.name}</p>
                    <p className="mt-1 text-xs text-slate-400">{request.phone}</p>
                  </div>
                  <Status status={request.status} />
                </div>
                <p className="mt-3 text-sm text-slate-300">
                  {request.intent === "buy" ? "Buy" : "Rent"} - {request.bedrooms ?? "Any"} bed {request.propertyType} in {[...request.preferredAreas, ...request.alternativeAreas].join(", ")}
                </p>
                <p className="mt-1 text-xs text-slate-500">Budget: {request.maxBudget ? `$${request.maxBudget}` : "Not set"} - {request.matches.length} matches</p>
                <p className="mt-1 text-xs text-slate-500">Assigned: {request.assignedAgentName ?? "Unassigned"} - Expires {new Date(request.expiresAt).toLocaleDateString()}</p>
              </button>
            ))
          )}
        </div>
      </aside>

      {selected && (
        <section className="rounded-lg border border-white/10 bg-slate-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Property request</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">{selected.name}</h2>
              <p className="mt-2 text-sm text-slate-400">{selected.phone}{selected.email ? ` - ${selected.email}` : ""}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" disabled={busy} onClick={() => action({ action: "refresh_matches" })}>
                <RefreshCw className="size-4" />
                Refresh
              </Button>
              <Button disabled={busy || selected.matches.length === 0} onClick={() => action({ action: "notify", listingIds: selected.matches.slice(0, 3).map((match) => match.listingId) })}>
                <BellRing className="size-4" />
                Notify top matches
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Detail label="Intent" value={selected.intent === "buy" ? "Buying" : "Renting"} />
            <Detail label="Property" value={`${selected.bedrooms ?? "Any"} bed ${selected.propertyType}`} />
            <Detail label="Budget" value={selected.maxBudget ? `$${selected.maxBudget}` : "Not set"} />
            <Detail label={selected.intent === "buy" ? "Timeline" : "Move-in"} value={selected.intent === "buy" ? labelize(selected.timeline ?? "flexible") : selected.moveInDate ?? "Flexible"} />
            <Detail label="Areas" value={[...selected.preferredAreas, ...selected.alternativeAreas].join(", ")} className="md:col-span-2" />
            <Detail label="Features" value={[selected.intent === "rent" && selected.ensuite !== "not_needed" ? `${selected.ensuite} ensuite` : "", ...selected.mustHaves].filter(Boolean).join(", ") || "None"} />
            {selected.intent === "buy" && <Detail label="Readiness" value={labelize(selected.purchaseReadiness ?? "not specified")} />}
            <Detail label="Assigned agent" value={selected.assignedAgentName ?? "Unassigned"} />
            <Detail label="Expires" value={new Date(selected.expiresAt).toLocaleDateString()} />
          </div>

          {selected.notes && (
            <div className="mt-4 rounded-lg border border-white/10 bg-slate-900 p-4 text-sm leading-6 text-slate-300">
              {selected.notes}
            </div>
          )}

          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Matched listings</h3>
            <div className="mt-3 space-y-3">
              {selected.matches.length === 0 ? (
                <p className="rounded-lg border border-dashed border-white/10 p-5 text-sm text-slate-400">No matching listings yet. Refresh after adding new properties.</p>
              ) : (
                selected.matches.map((match) => (
                  <article key={match.listingId} className="rounded-lg border border-white/10 bg-slate-900 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{match.listingTitle}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {match.suburb}, {match.city} - ${match.price} - {match.bedrooms} bed
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <MatchLabel label={match.label} />
                        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">{match.score}% match</span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {match.reasons.map((reason) => (
                        <span key={reason} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-300">{reason}</span>
                      ))}
                      {(match.notifiedAt || match.manuallyNotifiedAt) && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 px-2.5 py-1 text-xs text-emerald-200">
                          <CheckCircle2 className="size-3" />
                          Notified
                        </span>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add internal note"
              className="min-h-11 rounded-lg border border-white/10 bg-slate-900 px-3 text-sm text-white"
            />
            <Button
              variant="secondary"
              disabled={busy || !note.trim()}
              onClick={() => {
                void action({ action: "note", body: note });
                setNote("");
              }}
            >
              Add note
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => action({ action: "status", status: "CLOSED" })}>Close request</Button>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
            <select
              value={selected.assignedAgentId ?? ""}
              onChange={(event) => event.target.value && action({ action: "assign", agentId: event.target.value })}
              className="min-h-11 rounded-lg border border-white/10 bg-slate-900 px-3 text-sm text-white"
            >
              <option value="">Assign to agent</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>
            <Button variant="secondary" disabled={busy} onClick={() => action({ action: "extend", days: 30 })}>Extend 30 days</Button>
            <Button variant="secondary" disabled={busy} onClick={() => void loadWhatsappTemplate("whatsapp_template")}>Match text</Button>
            <Button variant="secondary" disabled={busy} onClick={() => void loadWhatsappTemplate("still_looking_template")}>Still looking?</Button>
          </div>

          {whatsappMessage && (
            <div className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-emerald-100">WhatsApp-ready message</p>
                <a
                  href={`https://wa.me/${phoneToWhatsApp(selected.phone)}?text=${encodeURIComponent(whatsappMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-400"
                >
                  Open WhatsApp
                </a>
              </div>
              <textarea readOnly value={whatsappMessage} className="mt-3 min-h-32 w-full rounded-lg border border-white/10 bg-slate-950 p-3 text-sm leading-6 text-slate-100" />
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950 p-3">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function Detail({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-lg border border-white/10 bg-slate-900 p-3 ${className ?? ""}`}>
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-100">{value}</p>
    </div>
  );
}

function Status({ status }: { status: string }) {
  return <span className="rounded-full bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-200">{status}</span>;
}

function MatchLabel({ label }: { label: string }) {
  const styles: Record<string, string> = {
    strong_match: "bg-emerald-500/15 text-emerald-200",
    possible_match: "bg-cyan-500/15 text-cyan-200",
    nearby: "bg-amber-500/15 text-amber-200",
    over_budget: "bg-rose-500/15 text-rose-200",
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[label] ?? styles.possible_match}`}>{labelize(label)}</span>;
}

function labelize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function phoneToWhatsApp(value: string) {
  return value.replace(/[^\d]/g, "");
}
