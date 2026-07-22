"use client";

import { BarChart3, BellRing, CheckCircle2, RefreshCw, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminActionDialog, type AdminDialogConfig } from "@/components/admin/action-dialog";
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

export function TenantRequestsHub({ propertyTypeFilter = "" }: { propertyTypeFilter?: string } = {}) {
  const [requests, setRequests] = useState<TenantRequestRecord[]>([]);
  const [analytics, setAnalytics] = useState<ResponseShape["analytics"] | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [agents, setAgents] = useState<ResponseShape["agents"]>([]);
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [dialog, setDialog] = useState<AdminDialogConfig | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [requesterFilter, setRequesterFilter] = useState("");
  const [mustHaveFilter, setMustHaveFilter] = useState("");

  const visibleRequests = useMemo(
    () => requests.filter((request) => {
      if (propertyTypeFilter && request.propertyType !== propertyTypeFilter) return false;
      if (statusFilter && request.status !== statusFilter) return false;
      if (requesterFilter && request.clientType !== requesterFilter) return false;
      if (mustHaveFilter) {
        const haystack = [request.notes ?? "", ...request.mustHaves, ...request.preferredAreas, ...request.alternativeAreas].join(" ").toLowerCase();
        if (!haystack.includes(mustHaveFilter.toLowerCase())) return false;
      }
      return true;
    }),
    [mustHaveFilter, propertyTypeFilter, requesterFilter, requests, statusFilter],
  );
  const selected = useMemo(() => visibleRequests.find((request) => request.id === selectedId) ?? visibleRequests[0], [selectedId, visibleRequests]);
  const scopedRequests = propertyTypeFilter ? requests.filter((request) => request.propertyType === propertyTypeFilter) : requests;
  const scopedAnalytics = useMemo(
    () => ({
      total: scopedRequests.length,
      rentCount: scopedRequests.filter((item) => item.intent === "rent").length,
      buyCount: scopedRequests.filter((item) => item.intent === "buy").length,
      matchedCount: scopedRequests.filter((item) => item.matches.length > 0).length,
      expiringSoonCount: scopedRequests.filter((item) => {
        const days = (new Date(item.expiresAt).getTime() - Date.now()) / 86_400_000;
        return item.status !== "CLOSED" && item.status !== "CANCELLED" && days >= 0 && days <= 7;
      }).length,
      expiredCount: scopedRequests.filter((item) => item.status === "EXPIRED").length,
    }),
    [scopedRequests],
  );
  const studentDemand = useMemo(() => buildStudentDemandInsights(scopedRequests), [scopedRequests]);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await apiFetch<ResponseShape>(`/api/v1/admin/tenant-requests${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    if (result.data) {
      setRequests(result.data.requests);
      setAnalytics(result.data.analytics);
      setAgents(result.data.agents);
      const nextVisible = propertyTypeFilter
        ? result.data.requests.filter((request) => request.propertyType === propertyTypeFilter)
        : result.data.requests;
      if (!selectedId && nextVisible[0]) setSelectedId(nextVisible[0].id);
    }
    setLoading(false);
  }, [propertyTypeFilter, query, selectedId]);

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
    if (body.action === "delete" && !result.error) {
      setRequests((current) => current.filter((request) => request.id !== selected.id));
      setSelectedId("");
      setWhatsappMessage("");
    }
    setBusy(false);
  }

  function confirmDelete() {
    if (!selected) return;
    setDialog({
      title: "Delete property request",
      message: `Permanently delete ${selected.id} for ${selected.name}. It will be removed from the admin queue and database.`,
      tone: "danger",
      confirmLabel: "Delete request",
      fields: [{ name: "reason", label: "Admin reason", type: "textarea", required: true }],
      onConfirm: () => action({ action: "delete" }),
    });
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
      <AdminActionDialog config={dialog} onClose={() => setDialog(null)} />
      <aside className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Requests" value={propertyTypeFilter ? scopedAnalytics.total : analytics?.total ?? 0} />
          <Metric label="Matched" value={propertyTypeFilter ? scopedAnalytics.matchedCount : analytics?.matchedCount ?? 0} />
          <Metric label="Rent" value={propertyTypeFilter ? scopedAnalytics.rentCount : analytics?.rentCount ?? 0} />
          <Metric label="Buy" value={propertyTypeFilter ? scopedAnalytics.buyCount : analytics?.buyCount ?? 0} />
          <Metric label="Expiring" value={propertyTypeFilter ? scopedAnalytics.expiringSoonCount : analytics?.expiringSoonCount ?? 0} />
          <Metric label="Expired" value={propertyTypeFilter ? scopedAnalytics.expiredCount : analytics?.expiredCount ?? 0} />
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
        <Button type="button" variant="secondary" onClick={() => exportRequestsCsv(visibleRequests)} disabled={!visibleRequests.length}>
          Export CSV
        </Button>
        {propertyTypeFilter === "boarding_house" && (
          <>
            <div className="grid gap-2 sm:grid-cols-3">
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white">
                <option value="">All statuses</option>
                <option value="NEW">New</option>
                <option value="MATCHED">Matched</option>
                <option value="CONTACTED">Contacted</option>
                <option value="CLOSED">Closed</option>
                <option value="EXPIRED">Expired</option>
              </select>
              <select value={requesterFilter} onChange={(event) => setRequesterFilter(event.target.value)} className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white">
                <option value="">All requesters</option>
                <option value="student">Student</option>
                <option value="guardian">Parent / guardian</option>
                <option value="school_admin">School admin</option>
                <option value="individual">Individual</option>
              </select>
              <select value={mustHaveFilter} onChange={(event) => setMustHaveFilter(event.target.value)} className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white">
                <option value="">All student needs</option>
                <option value="Near campus">Near campus</option>
                <option value="WiFi">WiFi</option>
                <option value="Study area">Study area</option>
                <option value="Bills included">Bills included</option>
                <option value="Meals included">Meals included</option>
                <option value="Shared kitchen">Shared kitchen</option>
              </select>
            </div>
            <StudentDemandPanel insights={studentDemand} />
          </>
        )}

        <div className="max-h-[650px] space-y-2 overflow-y-auto pr-1">
          {loading ? (
            <p className="rounded-lg border border-white/10 bg-slate-950 p-4 text-sm text-slate-400">Loading property requests...</p>
          ) : visibleRequests.length === 0 ? (
            <p className="rounded-lg border border-white/10 bg-slate-950 p-4 text-sm text-slate-400">No property requests yet.</p>
          ) : (
            visibleRequests.map((request) => (
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
                  {request.intent === "buy" ? "Buy" : request.propertyType === "holiday_home" ? "Holiday stay" : "Rent"} - {request.bedrooms ?? "Any"} bed {formatPropertyType(request.propertyType)} in {[...request.preferredAreas, ...request.alternativeAreas].join(", ")}
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
            <Detail label="Intent" value={selected.intent === "buy" ? "Buying" : selected.propertyType === "holiday_home" ? "Holiday stay" : "Renting"} />
            <Detail label="Property" value={`${selected.bedrooms ?? "Any"} bed ${formatPropertyType(selected.propertyType)}`} />
            <Detail label="Budget" value={selected.maxBudget ? `$${selected.maxBudget}` : "Not set"} />
            <Detail
              label={selected.intent === "buy" ? "Timeline" : selected.propertyType === "holiday_home" ? "Stay dates" : "Move-in"}
              value={selected.intent === "buy" ? labelize(selected.timeline ?? "flexible") : selected.propertyType === "holiday_home" ? [selected.moveInDate, selected.checkOutDate].filter(Boolean).join(" to ") || "Flexible" : selected.moveInDate ?? "Flexible"}
            />
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
            <Button variant="secondary" disabled={busy} onClick={confirmDelete}>
              <Trash2 className="size-4" />
              Delete request
            </Button>
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

function StudentDemandPanel({ insights }: { insights: ReturnType<typeof buildStudentDemandInsights> }) {
  return (
    <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-3">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-200">
        <BarChart3 className="size-4" aria-hidden="true" />
        Student demand
      </p>
      <div className="mt-3 grid gap-2">
        <InsightRow label="Top areas" value={insights.areas} />
        <InsightRow label="Requester mix" value={insights.requesters} />
        <InsightRow label="Common needs" value={insights.needs} />
        <InsightRow label="Typical budget" value={insights.budget} />
      </div>
    </div>
  );
}

function InsightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950 p-2.5">
      <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-200">{value || "Not enough data yet"}</p>
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

function formatPropertyType(value: string) {
  if (value === "holiday_home") return "holiday home";
  if (value === "boarding_house") return "boarding house";
  return value.replace(/[-_]/g, " ");
}

function exportRequestsCsv(requests: TenantRequestRecord[]) {
  const headers = ["Reference", "Name", "Phone", "Email", "Requester", "Status", "Budget", "Areas", "Must haves", "Created"];
  const rows = requests.map((request) => [
    request.id,
    request.name,
    request.phone,
    request.email ?? "",
    labelize(request.clientType ?? "individual"),
    request.status,
    request.maxBudget ? `$${request.maxBudget}` : "",
    [...request.preferredAreas, ...request.alternativeAreas].join("; "),
    request.mustHaves.join("; "),
    new Date(request.createdAt).toISOString(),
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `houselink-student-accommodation-requests-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function buildStudentDemandInsights(requests: TenantRequestRecord[]) {
  const budgets = requests.map((request) => request.maxBudget).filter((value): value is number => Boolean(value));
  const medianBudget = budgets.length ? budgets.sort((a, b) => a - b)[Math.floor(budgets.length / 2)] : null;
  return {
    areas: topValues(requests.flatMap((request) => [...request.preferredAreas, ...request.alternativeAreas]), 3),
    requesters: topValues(requests.map((request) => labelize(request.clientType ?? "individual")), 3),
    needs: topValues(requests.flatMap((request) => request.mustHaves), 4),
    budget: medianBudget ? `$${medianBudget} median max budget` : "",
  };
}

function topValues(values: string[], limit: number) {
  const counts = new Map<string, number>();
  values.map((value) => value.trim()).filter(Boolean).forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value, count]) => `${value} (${count})`)
    .join(", ");
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function phoneToWhatsApp(value: string) {
  return value.replace(/[^\d]/g, "");
}
