"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Clock,
  Download,
  Filter,
  Merge,
  Search,
  UserCheck,
} from "lucide-react";
import { EnquiryStatusBadge } from "@/components/enquiries/enquiry-status-badge";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { AdminKpiCard } from "@/components/admin/kpi-card";
import { ENQUIRY_STATUS_LABELS, ENQUIRY_TYPE_LABELS } from "@/lib/enquiries/labels";
import type { EnquiryAnalytics, EnquirySettings, EnquiryStatus, PropertyEnquiry } from "@/lib/enquiries/types";
import { apiFetch } from "@/lib/api/client";
import { AdminActionFeedback } from "@/components/admin/action-feedback";
import { AdminActionDialog, type AdminDialogConfig } from "@/components/admin/action-dialog";

const PIPELINE_STATUSES: EnquiryStatus[] = [
  "NEW",
  "ASSIGNED",
  "CONTACTED",
  "VIEWING_SCHEDULED",
  "VIEWING_COMPLETED",
  "NEGOTIATING",
  "OFFER_SUBMITTED",
  "OFFER_ACCEPTED",
  "BOOKING_CONFIRMED",
  "RENTAL_APPROVED",
  "SALE_COMPLETED",
  "CLOSED",
  "CANCELLED",
  "LOST_LEAD",
];

type AdminEnquiryData = {
  enquiries: PropertyEnquiry[];
  analytics: EnquiryAnalytics;
  agents: Array<{ id: string; name: string; email: string }>;
  settings: EnquirySettings;
};

export function EnquiryCrmHub() {
  const { showToast } = useApp();
  const [data, setData] = useState<AdminEnquiryData | null>(null);
  const [filter, setFilter] = useState<string>("ALL");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<PropertyEnquiry | null>(null);
  const [subTab, setSubTab] = useState<"queue" | "settings">("queue");
  const [feedback, setFeedback] = useState<{
    title: string;
    message: string;
    tone?: "success" | "warning" | "danger" | "info";
    details?: Array<{ label: string; value: string | number | undefined }>;
  } | null>(null);
  const [dialog, setDialog] = useState<AdminDialogConfig | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter !== "ALL") params.set("status", filter);
    if (q) params.set("q", q);
    const result = await apiFetch<AdminEnquiryData>(`/api/v1/admin/enquiries?${params}`);
    if (result.data) setData(result.data);
  }, [filter, q]);

  useEffect(() => {
    void load();
  }, [load]);

  async function action(body: Record<string, unknown>) {
    if (body.action === "status" && ["CANCELLED", "LOST_LEAD", "CLOSED"].includes(String(body.status))) {
      setDialog({
        title: "Close enquiry workflow",
        message: `Enter the reason before marking this enquiry ${String(body.status).replace(/_/g, " ").toLowerCase()}.`,
        tone: String(body.status) === "CLOSED" ? "success" : "warning",
        confirmLabel: "Update status",
        fields: [{ name: "reason", label: "Reason", type: "textarea", required: true }],
        onConfirm: (values) => applyEnquiryAction({ ...body, reason: values.reason }),
      });
      return;
    }
    if (body.action === "merge") {
      setDialog({
        title: "Merge duplicate enquiry",
        message: "Confirm this duplicate merge. CRM history will be consolidated into the selected enquiry.",
        tone: "warning",
        confirmLabel: "Merge enquiry",
        onConfirm: () => applyEnquiryAction(body),
      });
      return;
    }
    await applyEnquiryAction(body);
  }

  async function applyEnquiryAction(body: Record<string, unknown>) {
    const result = await apiFetch("/api/v1/admin/enquiries", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    if (result.error) showToast(result.error.message ?? "Action failed.", "error");
    else {
      showToast("Updated.");
      setFeedback({
        title: "Enquiry workflow updated",
        message: `${String(body.action ?? "update").replace(/_/g, " ")} completed successfully.`,
        tone: body.status === "CANCELLED" || body.status === "LOST_LEAD" ? "warning" : "success",
        details: [
          { label: "Action", value: String(body.action ?? "update").replace(/_/g, " ") },
          { label: "Enquiry", value: String(body.enquiryId ?? "Settings") },
          { label: "Status", value: String(body.status ?? "Updated") },
        ],
      });
      void load();
      if (selected && body.enquiryId === selected.id && result.data) {
        setSelected((result.data as { enquiry: PropertyEnquiry }).enquiry);
      }
    }
  }

  if (!data) return <p className="text-slate-400">Loading enquiry CRM...</p>;

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
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSubTab("queue")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${subTab === "queue" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-300"}`}
        >
          Enquiry queue
        </button>
        <button
          type="button"
          onClick={() => setSubTab("settings")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${subTab === "settings" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-300"}`}
        >
          Routing settings
        </button>
      </div>

      {subTab === "settings" && (
        <section className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
          <h3 className="font-semibold text-white">Enquiry & contact settings</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {(
              [
                ["requireManagedEnquiries", "Require HomeLink-managed enquiries"],
                ["showPublicContactDetails", "Show public contact details on listings"],
                ["autoAssignAgents", "Auto-assign agents"],
                ["notifyAdminOnNewEnquiry", "Notify admin on new enquiry"],
                ["notifyOwnerOnNewEnquiry", "Notify owner on new enquiry"],
                ["notifyAgentOnAssignment", "Notify agent on assignment"],
                ["viewingWorkflowEnabled", "Enable viewing workflow"],
                ["bookingWorkflowEnabled", "Enable booking workflow"],
                ["commissionRulesEnabled", "Enable commission tracking"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(data.settings[key])}
                  onChange={(e) =>
                    void action({
                      action: "update_settings",
                      settings: { ...data.settings, [key]: e.target.checked },
                    })
                  }
                  className="accent-emerald-500"
                />
                {label}
              </label>
            ))}
            <label className="block text-sm text-slate-300">
              Response time target (minutes)
              <input
                type="number"
                value={data.settings.responseTimeTargetMinutes}
                onChange={(e) =>
                  void action({
                    action: "update_settings",
                    settings: { ...data.settings, responseTimeTargetMinutes: Number(e.target.value) },
                  })
                }
                className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-slate-950 px-3"
              />
            </label>
            <label className="block text-sm text-slate-300">
              Assignment strategy
              <select
                value={data.settings.assignmentStrategy}
                onChange={(e) =>
                  void action({
                    action: "update_settings",
                    settings: { ...data.settings, assignmentStrategy: e.target.value },
                  })
                }
                className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-slate-950 px-3"
              >
                <option value="ROUND_ROBIN">Round robin</option>
                <option value="TERRITORY">Territory</option>
                <option value="HIGHEST_RATED">Highest rated</option>
                <option value="PREMIUM_PRIORITY">Premium priority</option>
                <option value="MANUAL">Manual only</option>
              </select>
            </label>
          </div>
        </section>
      )}

      {subTab === "queue" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminKpiCard label="Total enquiries" value={data.analytics.total} icon={Search} />
            <AdminKpiCard label="New" value={data.analytics.newCount} icon={Filter} tone="warning" />
            <AdminKpiCard label="Active pipeline" value={data.analytics.activeCount} icon={Clock} />
            <AdminKpiCard label="Conversion" value={`${data.analytics.conversionRate}%`} icon={UserCheck} />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[12rem] flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void load()}
                placeholder="Search enquiries..."
                className="h-10 w-full rounded-lg border border-white/10 bg-slate-900 pl-9 pr-3 text-sm text-white"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-10 rounded-lg border border-white/10 bg-slate-900 px-3 text-sm text-white"
            >
              <option value="ALL">All statuses</option>
              {PIPELINE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ENQUIRY_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <Button variant="secondary" onClick={() => void load()}>
              Apply
            </Button>
            <a
              href={`/api/v1/admin/enquiries/export?${new URLSearchParams({
                ...(filter !== "ALL" ? { status: filter } : {}),
                ...(q ? { q } : {}),
              }).toString()}`}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-slate-800 px-4 text-sm font-medium text-white hover:bg-slate-700"
            >
              <Download className="size-4" />
              Export CSV
            </a>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="space-y-3">
              {data.enquiries.length === 0 ? (
                <p className="text-sm text-slate-400">No enquiries match your filters.</p>
              ) : (
                data.enquiries.map((enquiry) => (
                  <button
                    key={enquiry.id}
                    type="button"
                    onClick={() => setSelected(enquiry)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selected?.id === enquiry.id
                        ? "border-emerald-500 bg-emerald-950/30"
                        : "border-white/10 bg-slate-900/60 hover:border-white/20"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-white">{enquiry.seekerName}</p>
                        <p className="text-sm text-slate-400">{enquiry.listingTitle}</p>
                      </div>
                      <EnquiryStatusBadge status={enquiry.status} />
                    </div>
                    <p className="mt-2 text-sm text-slate-300 line-clamp-2">{enquiry.message}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>{ENQUIRY_TYPE_LABELS[enquiry.enquiryType]}</span>
                      <span>{new Date(enquiry.createdAt).toLocaleString()}</span>
                      {enquiry.assignedAgentName && <span>Agent: {enquiry.assignedAgentName}</span>}
                    </div>
                  </button>
                ))
              )}
            </div>

            {selected && (
              <aside className="rounded-xl border border-white/10 bg-slate-900/60 p-5 lg:sticky lg:top-4 lg:self-start">
                <h3 className="font-semibold text-white">Enquiry detail</h3>
                <p className="mt-1 text-sm text-slate-400">{selected.id}</p>
                <div className="mt-4 space-y-3 text-sm">
                  <p className="text-slate-300">
                    <span className="text-slate-500">Customer:</span> {selected.seekerName}
                  </p>
                  <p className="text-slate-300">
                    <span className="text-slate-500">Property:</span> {selected.listingTitle}
                  </p>
                  <p className="text-slate-300">
                    <span className="text-slate-500">Owner:</span> {selected.ownerName}
                  </p>
                  <EnquiryStatusBadge status={selected.status} />
                </div>

                <label className="mt-4 block text-sm text-slate-400">
                  Assign agent
                  <select
                    value={selected.assignedAgentId ?? ""}
                    onChange={(e) => {
                      if (!e.target.value || e.target.value === selected.assignedAgentId) return;
                      void action({ action: "assign", enquiryId: selected.id, agentId: e.target.value });
                    }}
                    className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-white"
                  >
                    <option value="">Unassigned</option>
                    {data.agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="mt-3 block text-sm text-slate-400">
                  Update status
                  <select
                    value={selected.status}
                    onChange={(e) =>
                      void action({
                        action: "status",
                        enquiryId: selected.id,
                        status: e.target.value,
                      })
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-white"
                  >
                    {PIPELINE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {ENQUIRY_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="mt-4 max-h-48 overflow-y-auto space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Activity</p>
                  {selected.activities.slice(0, 8).map((a) => (
                    <div key={a.id} className="rounded-lg bg-slate-950/50 p-2 text-xs text-slate-400">
                      <p className="text-slate-300">{a.message}</p>
                      <p className="mt-1">{new Date(a.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                <Button
                  className="mt-4 w-full"
                  variant="secondary"
                  onClick={() =>
                    setDialog({
                      title: "Merge duplicate enquiry",
                      message: "Enter the duplicate enquiry ID to merge into this selected CRM record.",
                      tone: "warning",
                      confirmLabel: "Merge enquiry",
                      fields: [{ name: "sourceId", label: "Duplicate enquiry ID", required: true }],
                      onConfirm: (values) => applyEnquiryAction({ action: "merge", enquiryId: selected.id, sourceId: values.sourceId }),
                    })
                  }
                >
                  <Merge className="size-4" />
                  Merge duplicate
                </Button>
              </aside>
            )}
          </div>
        </>
      )}
    </div>
  );
}
