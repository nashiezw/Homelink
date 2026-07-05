"use client";

import {
  Archive,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import { AdminActionFeedback } from "@/components/admin/action-feedback";
import { AdminActionDialog, type AdminDialogConfig } from "@/components/admin/action-dialog";
import { AdminKpiCard } from "@/components/admin/kpi-card";
import {
  AdminFilterBar,
  AdminPanel,
  AdminSearchInput,
  AdminSelect,
  AdminTabStrip,
  AdminToolbar,
} from "@/components/admin/ui/admin-ui";

type AdminListing = {
  id: string;
  slug?: string | null;
  title: string;
  city: string;
  suburb: string;
  type: string;
  intent: string;
  price: number;
  status: string;
  verified: boolean;
  featured: boolean;
  views: number;
  saves: number;
  enquiries: number;
  ownerId: string;
  ownerName: string;
  ownerEmail?: string;
};

type ListingsResponse = {
  listings: AdminListing[];
  summary: Record<string, number>;
};

const STATUSES = ["", "ACTIVE", "PENDING_REVIEW", "REJECTED", "ARCHIVED", "DRAFT", "EXPIRED", "RENTED", "SOLD", "DELETED"];
const TYPES = ["", "room", "house", "flat", "cottage", "commercial", "land", "holiday_home"];
const INTENTS = ["", "rent", "buy"];

export function PropertiesManagementHub() {
  const { showToast } = useApp();
  const [data, setData] = useState<ListingsResponse | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [intent, setIntent] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedListing, setSelectedListing] = useState<AdminListing | null>(null);
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<{
    title: string;
    message: string;
    tone?: "success" | "warning" | "danger" | "info";
    details?: Array<{ label: string; value: string | number | undefined }>;
  } | null>(null);
  const [dialog, setDialog] = useState<AdminDialogConfig | null>(null);

  const [workflowTab, setWorkflowTab] = useState("all");

  const [transferOwnerId, setTransferOwnerId] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (intent) params.set("intent", intent);
    if (includeDeleted) params.set("includeDeleted", "true");
    const result = await apiFetch<ListingsResponse>(`/api/v1/admin/listings?${params}`);
    if (result.data) {
      setData(result.data);
      if (selectedListing) {
        const updated = result.data.listings.find((l) => l.id === selectedListing.id);
        setSelectedListing(updated ?? null);
      }
    }
  }, [q, status, type, intent, includeDeleted, selectedListing]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [load]);

  async function listingAction(action: string, listingId?: string, extra?: Record<string, unknown>) {
    const ids = listingId ? [listingId] : [...selected];
    if (!ids.length) {
      showToast("Select at least one listing.", "error");
      return;
    }
    if (["reject", "archive", "delete", "transfer"].includes(action) && !reason.trim() && !extra?.newOwnerId) {
      showToast("Add a reason before applying this action.", "error");
      return;
    }
    if (["archive", "delete", "transfer"].includes(action)) {
      setDialog({
        title: `${action.replace(/_/g, " ")} listing${ids.length > 1 ? "s" : ""}`,
        message: `Confirm ${action.replace(/_/g, " ")} for ${ids.length} listing(s). This will be logged in the admin audit trail.`,
        tone: action === "delete" ? "danger" : "warning",
        confirmLabel: "Confirm",
        onConfirm: () => applyListingAction(action, ids, extra),
      });
      return;
    }
    await applyListingAction(action, ids, extra);
  }

  async function applyListingAction(action: string, ids: string[], extra?: Record<string, unknown>) {
    const result = await apiFetch("/api/v1/admin/listings", {
      method: "PATCH",
      body: JSON.stringify(
        ids.length === 1
          ? { listingId: ids[0], action, reason: reason || undefined, ...extra }
          : { listingIds: ids, action, reason: reason || undefined, ...extra },
      ),
    });

    if (result.error) {
      showToast(result.error.message, "error");
      return;
    }

    showToast(`${action.replace(/_/g, " ")} applied to ${ids.length} listing(s).`);
    setFeedback({
      title: "Listing action completed",
      message: `${action.replace(/_/g, " ")} was applied successfully.`,
      tone: action === "delete" ? "danger" : action === "archive" || action === "reject" ? "warning" : "success",
      details: [
        { label: "Action", value: action.replace(/_/g, " ") },
        { label: "Listings affected", value: ids.length },
        { label: "Reason", value: reason || "Not provided" },
      ],
    });
    setSelected(new Set());
    void load();
  }

  function toggleSelect(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!data) return;
    const currentListings = workflowTab === "featured" ? data.listings.filter((listing) => listing.featured) : data.listings;
    if (currentListings.length && currentListings.every((listing) => selected.has(listing.id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(currentListings.map((listing) => listing.id)));
    }
  }

  const visibleListings = workflowTab === "featured" ? (data?.listings ?? []).filter((listing) => listing.featured) : data?.listings ?? [];
  const allVisibleSelected = visibleListings.length > 0 && visibleListings.every((listing) => selected.has(listing.id));

  return (
    <div className="space-y-6">
      <AdminActionDialog config={dialog} onClose={() => setDialog(null)} />
      <AdminActionFeedback
        open={Boolean(feedback)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
        tone={feedback?.tone}
        details={feedback?.details}
        onClose={() => setFeedback(null)}
      />
      {data?.summary && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
          <AdminKpiCard label="Total live" value={data.summary.active} icon={CheckCircle2} tone="success" compact />
          <AdminKpiCard label="Pending approval" value={data.summary.pending} icon={XCircle} tone="warning" compact />
          <AdminKpiCard label="Featured" value={data.summary.featured} icon={Star} compact />
          <AdminKpiCard label="Holiday homes" value={data.summary.holiday ?? 0} icon={Star} compact />
          <AdminKpiCard label="Unverified live" value={data.summary.unverified} icon={ShieldCheck} tone="warning" compact />
          <AdminKpiCard label="Drafts" value={data.summary.draft ?? 0} icon={Archive} compact />
        </div>
      )}

      <AdminTabStrip
        active={workflowTab}
        onChange={(id) => {
          setWorkflowTab(id);
          if (id === "all") setStatus("");
          else if (id === "featured") {
            setStatus("ACTIVE");
          } else if (id === "holiday") {
            setType("holiday_home");
            setStatus("");
          } else {
            setStatus(id);
            if (id !== "holiday_home") setType(type === "holiday_home" && id !== "all" ? "" : type);
          }
        }}
        tabs={[
          { id: "all", label: "All", count: data?.summary?.total },
          { id: "PENDING_REVIEW", label: "Pending", count: data?.summary?.pending },
          { id: "ACTIVE", label: "Live", count: data?.summary?.active },
          { id: "DRAFT", label: "Drafts", count: data?.summary?.draft },
          { id: "REJECTED", label: "Rejected", count: data?.summary?.rejected },
          { id: "EXPIRED", label: "Expired", count: data?.summary?.expired },
          { id: "featured", label: "Featured", count: data?.summary?.featured },
          { id: "holiday", label: "Holiday", count: data?.summary?.holiday },
        ]}
      />

      <AdminFilterBar>
        <div className="relative min-w-0 flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <AdminSearchInput value={q} onChange={setQ} placeholder="Search title, city, suburb, ID..." className="pl-10" />
        </div>
        <AdminSelect value={status} onChange={setStatus} options={STATUSES.map((s) => ({ value: s, label: s || "All statuses" }))} />
        <AdminSelect value={type} onChange={setType} options={TYPES.map((t) => ({ value: t, label: t || "All types" }))} />
        <AdminSelect value={intent} onChange={setIntent} options={INTENTS.map((i) => ({ value: i, label: i || "All intents" }))} />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={includeDeleted} onChange={(e) => setIncludeDeleted(e.target.checked)} />
          Deleted
        </label>
        <Button variant="secondary" onClick={() => void load()}><RefreshCw className="size-4" /></Button>
      </AdminFilterBar>

      {selected.size > 0 && (
        <AdminToolbar>
          <span className="text-sm font-medium text-cyan-200">{selected.size} listings selected</span>
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <Button onClick={() => void listingAction("approve")}><CheckCircle2 className="size-4" /> Approve</Button>
            <Button variant="secondary" onClick={() => void listingAction("reject")}><XCircle className="size-4" /> Reject</Button>
            <Button variant="secondary" onClick={() => void listingAction("verify")}><ShieldCheck className="size-4" /> Verify</Button>
            <Button variant="secondary" onClick={() => void listingAction("feature", undefined, { days: 14 })}><Star className="size-4" /> Feature</Button>
            <Button variant="secondary" onClick={() => void listingAction("archive")}><Archive className="size-4" /> Archive</Button>
            <Button variant="secondary" onClick={() => void listingAction("delete")}><Trash2 className="size-4" /> Delete</Button>
          </div>
        </AdminToolbar>
      )}

      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason for reject/delete/archive (optional)"
        className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <AdminPanel title="Listing inventory" description="Select rows for bulk actions or click to manage" className="lg:col-span-2">
          <div className="space-y-3 md:hidden">
            {visibleListings.map((listing) => (
              <article
                key={listing.id}
                className={`cursor-pointer rounded-xl border p-3 transition ${
                  selectedListing?.id === listing.id
                    ? "border-cyan-400/40 bg-cyan-500/10"
                    : "border-white/[0.06] bg-slate-950/45 hover:border-white/10"
                }`}
                onClick={() => setSelectedListing(listing)}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(listing.id)}
                    onChange={() => toggleSelect(listing.id)}
                    onClick={(event) => event.stopPropagation()}
                    className="mt-1 shrink-0"
                    aria-label={`Select ${listing.title}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">{listing.title}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {listing.suburb}, {listing.city}
                        </p>
                      </div>
                      <StatusBadge status={listing.status} />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-white/[0.04] px-2 py-1.5">
                        <p className="text-slate-500">Type</p>
                        <p className="font-medium capitalize text-slate-200">{listing.type}</p>
                      </div>
                      <div className="rounded-lg bg-white/[0.04] px-2 py-1.5">
                        <p className="text-slate-500">Price</p>
                        <p className="font-medium text-slate-200">${listing.price.toLocaleString()}</p>
                      </div>
                      <div className="rounded-lg bg-white/[0.04] px-2 py-1.5">
                        <p className="text-slate-500">Owner</p>
                        <p className="truncate font-medium text-slate-200">{listing.ownerName}</p>
                      </div>
                      <div className="rounded-lg bg-white/[0.04] px-2 py-1.5">
                        <p className="text-slate-500">Stats</p>
                        <p className="font-medium text-slate-200">{listing.views} views / {listing.enquiries} enquiries</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {listing.verified && <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-300">Verified</span>}
                      {listing.featured && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-300">Featured</span>}
                      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium capitalize text-slate-300">{listing.intent}</span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3">
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} />
                  </th>
                  <th className="px-3 py-3">Property</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Owner</th>
                  <th className="px-3 py-3">Stats</th>
                </tr>
              </thead>
              <tbody>
                {visibleListings.map((listing) => (
                  <tr
                    key={listing.id}
                    className={`cursor-pointer border-b border-white/5 hover:bg-white/5 ${selectedListing?.id === listing.id ? "bg-cyan-500/10" : ""}`}
                    onClick={() => setSelectedListing(listing)}
                  >
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(listing.id)} onChange={() => toggleSelect(listing.id)} />
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-white">{listing.title}</p>
                      <p className="text-xs text-slate-500">{listing.suburb}, {listing.city} - ${listing.price}</p>
                      <div className="mt-1 flex gap-1">
                        {listing.verified && <span className="rounded bg-emerald-500/20 px-1.5 text-xs text-emerald-300">Verified</span>}
                        {listing.featured && <span className="rounded bg-amber-500/20 px-1.5 text-xs text-amber-300">Featured</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-300">{listing.type}</td>
                    <td className="px-3 py-3"><StatusBadge status={listing.status} /></td>
                    <td className="px-3 py-3 text-xs text-slate-400">{listing.ownerName}</td>
                    <td className="px-3 py-3 text-xs text-slate-500">{listing.views}v - {listing.enquiries}e</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!visibleListings.length && <p className="py-8 text-center text-sm text-slate-500">No listings match your filters.</p>}
        </AdminPanel>

        <AdminPanel title="Listing detail" description={selectedListing ? selectedListing.title : "Select a listing"}>
          {!selectedListing ? (
            <p className="text-sm text-slate-500">Select a listing to manage it.</p>
          ) : (
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="text-lg font-semibold text-white">{selectedListing.title}</h3>
                <p className="text-slate-400">{selectedListing.suburb}, {selectedListing.city}</p>
                <StatusBadge status={selectedListing.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded bg-slate-950/50 p-2"><p className="text-slate-500">Owner</p><p className="text-white">{selectedListing.ownerName}</p></div>
                <div className="rounded bg-slate-950/50 p-2"><p className="text-slate-500">Price</p><p className="text-white">${selectedListing.price}</p></div>
                <div className="rounded bg-slate-950/50 p-2"><p className="text-slate-500">Views</p><p className="text-white">{selectedListing.views}</p></div>
                <div className="rounded bg-slate-950/50 p-2"><p className="text-slate-500">Enquiries</p><p className="text-white">{selectedListing.enquiries}</p></div>
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedListing.status !== "ACTIVE" && (
                  <Button onClick={() => void listingAction("approve", selectedListing.id)}>Approve</Button>
                )}
                {selectedListing.status === "ACTIVE" && (
                  <>
                    <Button variant="secondary" onClick={() => void listingAction("reject", selectedListing.id)}>Reject</Button>
                    <Button variant="secondary" onClick={() => void listingAction(!selectedListing.verified ? "verify" : "unverify", selectedListing.id)}>
                      {selectedListing.verified ? "Unverify" : "Verify"}
                    </Button>
                  </>
                )}
                <Button variant="secondary" onClick={() => void listingAction(selectedListing.featured ? "unfeature" : "feature", selectedListing.id, { days: 14 })}>
                  {selectedListing.featured ? "Unfeature" : "Feature"}
                </Button>
                {["ARCHIVED", "DELETED", "REJECTED"].includes(selectedListing.status) ? (
                  <Button variant="secondary" onClick={() => void listingAction("restore", selectedListing.id)}>Restore</Button>
                ) : (
                  <Button variant="secondary" onClick={() => void listingAction("archive", selectedListing.id)}>Archive</Button>
                )}
                {selectedListing.status !== "DELETED" && (
                  <Button variant="secondary" onClick={() => void listingAction("delete", selectedListing.id)}>Delete</Button>
                )}
              </div>
              <Link href={`/listings/${selectedListing.slug ?? selectedListing.id}`} target="_blank" className="inline-flex items-center gap-1 text-cyan-400 hover:underline">
                <ExternalLink className="size-3.5" /> View public page
              </Link>
              <div className="border-t border-white/[0.06] pt-4">
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Transfer ownership</p>
                <input
                  value={transferOwnerId}
                  onChange={(e) => setTransferOwnerId(e.target.value)}
                  placeholder="New owner user ID"
                  className="mb-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
                />
                <Button
                  variant="secondary"
                  disabled={!transferOwnerId.trim()}
                  onClick={() => void listingAction("transfer", selectedListing.id, { newOwnerId: transferOwnerId.trim() })}
                >
                  Transfer listing
                </Button>
              </div>
            </div>
          )}
        </AdminPanel>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-emerald-500/20 text-emerald-300",
    PENDING_REVIEW: "bg-amber-500/20 text-amber-300",
    REJECTED: "bg-red-500/20 text-red-300",
    ARCHIVED: "bg-slate-500/20 text-slate-300",
    DELETED: "bg-red-900/30 text-red-400",
    RENTED: "bg-purple-500/20 text-purple-300",
    SOLD: "bg-blue-500/20 text-blue-300",
  };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${colors[status] ?? "bg-white/10 text-slate-300"}`}>{status}</span>;
}
