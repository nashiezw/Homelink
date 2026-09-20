"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, MessageCircle, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api/client";

type Lead = {
  id: string;
  productTitle: string;
  name: string | null;
  email: string;
  phone: string | null;
  message: string | null;
  status: string;
  assignedToId: string | null;
  nextFollowUpAt: string | null;
  lastContactedAt: string | null;
  followUpNote: string | null;
  helpType: string | null;
  sourceSurface: string | null;
  sourcePath: string | null;
  customerNote: string | null;
  closeReason: string | null;
  mergedIntoId: string | null;
  confirmedOrderId: string | null;
  retentionReviewedAt: string | null;
  retentionDecision: string | null;
  relatedLeads: Array<{ id: string; createdAt: string }>;
  activity: Array<{ id: string; action: string; message: string; actorId: string | null; createdAt: string }>;
  supportChats: Array<{ id: string; publicId: string; subject: string | null; status: string; createdAt: string }>;
  relatedRequests: number;
  paidOrders: Array<{ id: string; orderNumber: string; total: number; createdAt: string; matchesProduct: boolean }>;
  createdAt: string;
};
type LeadPage = {
  leads: Lead[]; page: number; pageSize: number; total: number;
  admins: Array<{ id: string; name: string; email: string }>;
  canExport: boolean;
  reviewDays: number;
  metrics: {
    shown: number; submitted: number; contacted: number; confirmedConversions: number; overdue: number;
    notificationFailures: number; submissionErrors: number; retentionReviewDue: number; averageResponseMinutes: number | null;
    responseMedianMinutes: number | null; responseP90Minutes: number | null;
    byHelpType: Array<{ label: string; value: number }>;
    bySource: Array<{ label: string; value: number }>;
    byProduct: Array<{ label: string; value: number }>;
  };
};
const statuses = ["NEW", "CONTACTED", "QUOTED", "WON", "LOST", "CLOSED"];

function localDateTime(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function LibraryLeadsInbox() {
  const searchParams = useSearchParams();
  const [requestedId, setRequestedId] = useState(searchParams?.get("leadId") || "");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [assignment, setAssignment] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<LeadPage | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [followUpAt, setFollowUpAt] = useState("");
  const [note, setNote] = useState("");
  const [closeReason, setCloseReason] = useState("");
  const [mergeTarget, setMergeTarget] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState("");
  const [exportFrom, setExportFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [exportTo, setExportTo] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const timer = window.setTimeout(() => { setPage(1); setSearch(query.trim()); }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ type: "exit-leads", page: String(page), query: search, status, assignment });
    if (requestedId) params.set("id", requestedId);
    void apiFetch<LeadPage>(`/api/v1/admin/library?${params}`).then((result) => {
      if (!active) return;
      setLoading(false);
      if (result.error || !result.data) {
        setError(result.error?.message || "Could not load Library leads.");
      } else {
        setError("");
        setData(result.data);
        if (requestedId && result.data.leads[0]) {
          setSelectedId(requestedId);
          setFollowUpAt(result.data.leads[0].nextFollowUpAt ? localDateTime(result.data.leads[0].nextFollowUpAt) : "");
          setNote(result.data.leads[0].followUpNote || "");
          setCloseReason(result.data.leads[0].closeReason || "");
        }
      }
    });
    return () => { active = false; };
  }, [page, search, status, assignment, requestedId, revision]);

  async function saveFollowUp(id: string, fields: Record<string, unknown>) {
    setSavingId(id);
    const result = await apiFetch<{ lead: Lead }>("/api/v1/admin/library", {
      method: "POST",
      body: JSON.stringify({ action: "update_exit_lead", id, ...fields }),
    });
    setSavingId(null);
    if (result.error || !result.data) {
      setError(result.error?.message || "Could not save follow-up details.");
      return;
    }
    setError("");
    setRevision((value) => value + 1);
  }

  async function updateStatus(id: string, nextStatus: string) {
    if (nextStatus === "CONTACTED") {
      await saveFollowUp(id, { markContacted: true, followUpNote: note });
      return;
    }
    if (["LOST", "CLOSED"].includes(nextStatus) && !closeReason.trim()) {
      setError("Enter a close reason before closing this lead.");
      return;
    }
    await saveFollowUp(id, { status: nextStatus, closeReason: ["LOST", "CLOSED"].includes(nextStatus) ? closeReason : null, activityNote: `Status changed to ${nextStatus}${closeReason ? `: ${closeReason}` : ""}` });
  }

  const selected = data?.leads.find((lead) => lead.id === selectedId) || null;
  const selectedAdmin = data?.admins.find((admin) => admin.id === selected?.assignedToId);
  function selectLead(lead: Lead) {
    setSelectedId(lead.id);
    setFollowUpAt(lead.nextFollowUpAt ? localDateTime(lead.nextFollowUpAt) : "");
    setNote(lead.followUpNote || "");
    setCloseReason(lead.closeReason || "");
    setMergeTarget("");
    setConfirmedOrder(lead.confirmedOrderId || "");
  }
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Prompt shown (30 days)" value={data?.metrics.shown ?? "—"} />
        <Summary label="Leads submitted" value={data?.metrics.submitted ?? "—"} />
        <Summary label="Contacted" value={data?.metrics.contacted ?? "—"} />
        <Summary label="Confirmed order links" value={data?.metrics.confirmedConversions ?? "—"} />
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 border-b border-white/10 pb-3 text-xs text-slate-400">
        <span>Median first response: {data?.metrics.responseMedianMinutes == null ? "—" : `${Math.round(data.metrics.responseMedianMinutes / 60)}h`}</span>
        <span>90th percentile: {data?.metrics.responseP90Minutes == null ? "—" : `${Math.round(data.metrics.responseP90Minutes / 60)}h`}</span>
        <span>Overdue: {data?.metrics.overdue ?? "—"}</span>
        <span>Notification failures: {data?.metrics.notificationFailures ?? "—"}</span>
        <span>Tracked submission errors: {data?.metrics.submissionErrors ?? "—"}</span>
        <span>Retention review: {data?.metrics.retentionReviewDue ?? "—"}</span>
      </div>
      <details className="text-xs text-slate-300"><summary className="cursor-pointer font-semibold">Lead breakdown</summary><div className="mt-2 grid gap-3 sm:grid-cols-3">{([ ["Help requested", data?.metrics.byHelpType], ["Source", data?.metrics.bySource], ["Product", data?.metrics.byProduct] ] as const).map(([label, rows]) => <div key={label}><p className="font-semibold text-white">{label}</p>{rows?.map((row) => <p key={row.label} className="mt-1">{row.label}: {row.value}</p>)}</div>)}</div></details>
      <p className="text-xs text-slate-500">Prompt views are events; confirmed conversions require an admin-linked paid order. Later orders shown on a lead are contact matches, not attribution.</p>
      <div className="flex flex-wrap items-center gap-3">
        <input aria-label="Search Library leads" placeholder="Search name, contact, product or request" value={query} onChange={(event) => { setRequestedId(""); setQuery(event.target.value); }} className="h-10 min-w-0 flex-1 rounded-md border border-white/15 bg-slate-950 px-3 text-sm text-white" />
        <select aria-label="Filter Library leads by status" value={status} onChange={(event) => { setRequestedId(""); setPage(1); setStatus(event.target.value); }} className="h-10 rounded-md border border-white/15 bg-slate-950 px-3 text-sm text-white">
          <option value="">All statuses</option>
          {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select aria-label="Filter Library leads by assignment" value={assignment} onChange={(event) => { setRequestedId(""); setPage(1); setAssignment(event.target.value); }} className="h-10 rounded-md border border-white/15 bg-slate-950 px-3 text-sm text-white">
          <option value="">All assignments</option><option value="mine">Mine</option><option value="unassigned">Unassigned</option><option value="due">Due for follow-up</option><option value="review">Retention review</option><option value="merged">Merged</option>{data?.admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.name}</option>)}
        </select>
        <button type="button" title="Refresh leads" aria-label="Refresh leads" onClick={() => { setLoading(true); setRevision((value) => value + 1); }} className="grid size-10 place-items-center rounded-md border border-white/15 text-white hover:bg-white/10"><RefreshCw className="size-4" /></button>
      </div>
      {data?.canExport && <div className="flex flex-wrap items-end gap-2 border-b border-white/10 pb-3 text-xs text-slate-300"><label>Export from<input aria-label="Export from" type="date" value={exportFrom} onChange={(event) => setExportFrom(event.target.value)} className="ml-2 rounded border border-white/15 bg-slate-950 p-2 text-white" /></label><label>to<input aria-label="Export to" type="date" value={exportTo} onChange={(event) => setExportTo(event.target.value)} className="ml-2 rounded border border-white/15 bg-slate-950 p-2 text-white" /></label><a href={`/api/v1/admin/library?${new URLSearchParams({ type: "exit-leads-export", from: exportFrom, to: exportTo })}`} className="rounded border border-white/20 px-3 py-2 font-semibold text-white">Export CSV</a></div>}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <p className="text-xs text-slate-400">{loading ? "Loading leads..." : `${data?.total ?? 0} lead${data?.total === 1 ? "" : "s"} found`}</p>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.9fr)]">
        <div className="min-w-0 divide-y divide-white/10 border-y border-white/10">
          {!loading && !data?.leads.length && <p className="py-5 text-sm text-slate-400">No leads match these filters.</p>}
          {data?.leads.map((lead) => (
            <button key={lead.id} type="button" onClick={() => selectLead(lead)} className={`w-full p-3 text-left hover:bg-white/5 ${selectedId === lead.id ? "bg-emerald-500/10" : ""}`}>
              <span className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-white">{lead.name || lead.email}</strong><span className="text-xs text-emerald-300">{lead.status}</span></span>
              <span className="mt-1 block text-xs text-slate-300">{lead.productTitle}</span>
              <span className="mt-1 block text-xs text-slate-500">{new Date(lead.createdAt).toLocaleString()} · {lead.phone || lead.email}{lead.nextFollowUpAt ? ` · Follow up ${new Date(lead.nextFollowUpAt).toLocaleString()}` : ""}</span>
            </button>
          ))}
          <div className="flex items-center justify-between gap-2 py-3 text-sm text-slate-300">
            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)} className="disabled:opacity-40">Previous</button>
            <span>Page {page} of {Math.max(1, Math.ceil((data?.total ?? 0) / (data?.pageSize || 20)))}</span>
            <button type="button" disabled={loading || page * (data?.pageSize || 20) >= (data?.total ?? 0)} onClick={() => setPage(page + 1)} className="disabled:opacity-40">Next</button>
          </div>
        </div>
        <div className="min-w-0 border-t border-white/10 pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
          {selected ? <div className="space-y-3 text-sm text-slate-200">
            <h3 className="font-semibold text-white">{selected.name || selected.email}</h3>
            <p>{selected.productTitle} · {new Date(selected.createdAt).toLocaleString()}</p>
            <div className="flex flex-wrap gap-3">
              <a href={`mailto:${selected.email}`} className="inline-flex items-center gap-1 text-emerald-300 hover:underline"><Mail className="size-4" /> {selected.email}</a>
              {selected.phone && <a href={`https://wa.me/${selected.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-300 hover:underline"><MessageCircle className="size-4" /> {selected.phone}</a>}
            </div>
            <p className="text-xs text-slate-400">{selected.relatedRequests} other request{selected.relatedRequests === 1 ? "" : "s"} from this contact · {selected.paidOrders.length} paid order{selected.paidOrders.length === 1 ? "" : "s"} after this request</p>
            <p className="text-xs text-slate-400">Help: {selected.helpType || "Not recorded"} · Source: {selected.sourceSurface || "Not recorded"}</p>
            {selected.paidOrders.length > 0 && <p className="text-xs text-slate-300">{selected.paidOrders.map((order) => `${order.orderNumber} (USD ${order.total.toFixed(2)})`).join(" · ")}</p>}
            {selected.relatedLeads.length > 0 && <div className="text-xs"><p className="font-semibold text-white">Earlier requests</p>{selected.relatedLeads.map((lead) => <button key={lead.id} type="button" onClick={() => { setRequestedId(lead.id); setPage(1); }} className="mr-3 mt-1 text-emerald-300 hover:underline">{new Date(lead.createdAt).toLocaleDateString()}</button>)}</div>}
            <label className="block text-xs text-slate-400">Assigned to
              <select aria-label="Assign Library lead" value={selected.assignedToId || ""} disabled={savingId === selected.id} onChange={(event) => void saveFollowUp(selected.id, { assignedToId: event.target.value || null })} className="mt-1 block h-10 w-full rounded-md border border-white/15 bg-slate-950 px-3 text-sm text-white">
                <option value="">Unassigned</option>{data?.admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.name} ({admin.email})</option>)}
              </select>
            </label>
            {selectedAdmin && <p className="text-xs text-slate-400">Owner: {selectedAdmin.name}</p>}
            <label className="block text-xs text-slate-400">Follow-up status
              <select value={selected.status} disabled={savingId === selected.id} onChange={(event) => void updateStatus(selected.id, event.target.value)} className="mt-1 block h-10 w-full rounded-md border border-white/15 bg-slate-950 px-3 text-sm text-white">
                {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="block text-xs text-slate-400">Close reason
              <input aria-label="Close reason" value={closeReason} onChange={(event) => setCloseReason(event.target.value)} maxLength={500} className="mt-1 block h-10 w-full rounded-md border border-white/15 bg-slate-950 px-3 text-sm text-white" placeholder="Required when lost or closed" />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs text-slate-400">Next follow-up
                <input aria-label="Next follow-up" type="datetime-local" value={followUpAt} onChange={(event) => setFollowUpAt(event.target.value)} className="mt-1 block h-10 w-full rounded-md border border-white/15 bg-slate-950 px-3 text-sm text-white" />
              </label>
              <div className="flex items-end"><button type="button" disabled={savingId === selected.id} onClick={() => void saveFollowUp(selected.id, { nextFollowUpAt: followUpAt ? new Date(followUpAt).toISOString() : null, followUpNote: note, activityNote: note || "Follow-up scheduled" })} className="h-10 rounded-md bg-emerald-700 px-3 text-xs font-semibold text-white disabled:opacity-50">Save follow-up</button></div>
            </div>
            <label className="block text-xs text-slate-400">Internal follow-up note
              <textarea aria-label="Internal follow-up note" value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={1000} className="mt-1 block w-full rounded-md border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white" />
            </label>
            <div className="flex items-center justify-between gap-2 text-xs text-slate-400"><span>{selected.lastContactedAt ? `Last contacted ${new Date(selected.lastContactedAt).toLocaleString()}` : "Not contacted yet"}</span><button type="button" disabled={savingId === selected.id} onClick={() => void saveFollowUp(selected.id, { markContacted: true, followUpNote: note, activityNote: note || "Customer contacted" })} className="rounded-md border border-emerald-500/40 px-3 py-2 font-semibold text-emerald-300 disabled:opacity-50">Mark contacted</button></div>
            {selected.paidOrders.some((order) => order.matchesProduct) && !selected.mergedIntoId && <div className="flex gap-2"><select aria-label="Confirm paid order" value={confirmedOrder} onChange={(event) => setConfirmedOrder(event.target.value)} className="min-w-0 flex-1 rounded border border-white/15 bg-slate-950 px-2 text-xs text-white"><option value="">No confirmed order</option>{selected.paidOrders.filter((order) => order.matchesProduct).map((order) => <option key={order.id} value={order.id}>{order.orderNumber}</option>)}</select><button type="button" disabled={!confirmedOrder || savingId === selected.id} onClick={() => void saveFollowUp(selected.id, { confirmedOrderId: confirmedOrder })} className="rounded border border-emerald-500/40 px-2 py-2 text-xs text-emerald-300 disabled:opacity-50">Confirm link</button></div>}
            {selected.relatedLeads.length > 0 && !selected.mergedIntoId && <div className="flex gap-2"><select aria-label="Merge into lead" value={mergeTarget} onChange={(event) => setMergeTarget(event.target.value)} className="min-w-0 flex-1 rounded border border-white/15 bg-slate-950 px-2 text-xs text-white"><option value="">Link duplicate to...</option>{selected.relatedLeads.map((lead) => <option key={lead.id} value={lead.id}>{new Date(lead.createdAt).toLocaleString()}</option>)}</select><button type="button" disabled={!mergeTarget || savingId === selected.id} onClick={() => { if (window.confirm("Link this request as a duplicate? Its original submission and history will remain available.")) void saveFollowUp(selected.id, { mergedIntoId: mergeTarget }); }} className="rounded border border-white/20 px-2 py-2 text-xs text-white disabled:opacity-50">Link duplicate</button></div>}
            {selected.mergedIntoId && <p className="text-xs text-amber-300">Linked as a duplicate of another lead.</p>}
            {Date.now() - new Date(selected.createdAt).getTime() >= data!.reviewDays * 86400000 && <div className="border-t border-white/10 pt-3 text-xs"><p className="font-semibold text-white">Retention review</p><p className="mt-1 text-slate-400">{selected.retentionReviewedAt ? `Last reviewed ${new Date(selected.retentionReviewedAt).toLocaleString()} · ${selected.retentionDecision}` : "Review linked records and applicable requirements before deciding."}</p>{data?.canExport && <div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={savingId === selected.id} onClick={() => void saveFollowUp(selected.id, { retentionDecision: "RETAIN", activityNote: "Retention reviewed; keep pending next review cycle." })} className="rounded border border-white/20 px-2 py-1 disabled:opacity-50">Reviewed: retain</button><button type="button" disabled={savingId === selected.id} onClick={() => void saveFollowUp(selected.id, { retentionDecision: "ERASURE_REQUEST", activityNote: "Escalated for privacy erasure review; no records removed automatically." })} className="rounded border border-white/20 px-2 py-1 disabled:opacity-50">Escalate erasure</button></div>}</div>}
            <div className="border-t border-white/10 pt-3"><h4 className="mb-2 font-semibold text-white">Customer submission</h4><p className="whitespace-pre-wrap break-words text-sm leading-6">{selected.message || "No message provided."}</p></div>
            {selected.supportChats.length > 0 && <div className="border-t border-white/10 pt-3 text-xs"><h4 className="font-semibold text-white">Support chats</h4>{selected.supportChats.map((chat) => <p key={chat.id} className="mt-1">{new Date(chat.createdAt).toLocaleDateString()} · {chat.subject || "Conversation"} · {chat.status}</p>)}</div>}
            <div className="border-t border-white/10 pt-3 text-xs"><h4 className="font-semibold text-white">Activity history</h4>{selected.activity.length ? selected.activity.map((event) => <p key={event.id} className="mt-2"><span className="text-slate-500">{new Date(event.createdAt).toLocaleString()} · {event.action.replaceAll("_", " ")}</span><br />{event.message}</p>) : <p className="mt-1 text-slate-500">No follow-up activity yet.</p>}</div>
          </div> : <p className="text-sm text-slate-400">Select a lead to view the complete request and contact details.</p>}
        </div>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return <div className="border-b border-white/10 pb-2"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-lg font-bold tabular-nums text-white">{value}</p></div>;
}
