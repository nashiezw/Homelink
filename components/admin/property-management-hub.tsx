"use client";

import { CheckCircle2, ClipboardCheck, Download, Eye, FileSignature, FileText, Mail, RefreshCw, Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AdminActionDialog, type AdminDialogConfig } from "@/components/admin/action-dialog";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import type {
  PMAgreement,
  PMDocument,
  PMInspection,
  PMInvoice,
  PMQuotation,
  PMValuation,
  PropertyManagementRequest,
} from "@/lib/property-management/types";

type PMResponse = {
  requests: PropertyManagementRequest[];
  summary: Record<string, number>;
  consultants: Array<{ userId: string; name: string; city: string; activeLeads: number }>;
};

type PMActionResponse = {
  request: PropertyManagementRequest;
  result: PMActionResult;
};

type PMActionResult = PMDocument | PMInspection | PMValuation | PMQuotation | PMAgreement | PMInvoice | PropertyManagementRequest;

type PreviewItem =
  | { kind: "inspection"; item: PMInspection }
  | { kind: "valuation"; item: PMValuation }
  | { kind: "quotation"; item: PMQuotation }
  | { kind: "agreement"; item: PMAgreement }
  | { kind: "invoice"; item: PMInvoice }
  | { kind: "document"; item: PMDocument }
  | { kind: "request"; item: PropertyManagementRequest };

export function PropertyManagementHub() {
  const { showToast } = useApp();
  const [data, setData] = useState<PMResponse | null>(null);
  const [selected, setSelected] = useState<PropertyManagementRequest | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");
  const [consultantId, setConsultantId] = useState("");
  const [actionBusy, setActionBusy] = useState("");
  const [preview, setPreview] = useState<PreviewItem | null>(null);
  const [dialog, setDialog] = useState<AdminDialogConfig | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    const result = await apiFetch<PMResponse>(`/api/v1/admin/property-management?${params}`);
    if (result.data) {
      setData(result.data);
      if (selected) {
        const updated = result.data.requests.find((r) => r.id === selected.id);
        if (updated) setSelected(updated);
      }
    }
  }, [q, status, selected]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [load]);

  async function action(actionName: string, extra?: Record<string, unknown>) {
    if (!selected) return;
    setActionBusy(actionName);
    const result = await apiFetch<PMActionResponse>(`/api/v1/property-management/requests/${selected.id}/actions`, {
      method: "POST",
      body: JSON.stringify({ action: actionName, ...extra }),
    });
    setActionBusy("");
    if (result.error) {
      showToast(result.error.message, "error");
      return;
    }
    if (result.data?.request) {
      setSelected(result.data.request);
      if (actionName === "add_note") setNote("");
      const item = previewFromAction(actionName, result.data.result, result.data.request);
      if (item) setPreview(item);
    }
    showToast(`${actionName.replace(/_/g, " ")} completed.`);
    void load();
  }

  function actionWithPrompt(actionName: string) {
    if (!selected) return;
    if (actionName === "approve") {
      setDialog({
        title: "Approve request",
        message: `Approve ${selected.requestNumber} and move it forward in the property management workflow.`,
        tone: "success",
        confirmLabel: "Approve",
        fields: [{ name: "reason", label: "Approval note", type: "textarea", placeholder: "Ready for management workflow" }],
        onConfirm: (values) => action("approve", { reason: values.reason || undefined }),
      });
      return;
    }
    if (actionName === "reject") {
      setDialog({
        title: "Reject request",
        message: `Tell the owner why ${selected.requestNumber} is being rejected. This reason is saved on the request timeline.`,
        tone: "danger",
        confirmLabel: "Reject request",
        fields: [{ name: "reason", label: "Rejection reason", type: "textarea", placeholder: "Explain why this request cannot proceed", required: true }],
        onConfirm: (values) => action("reject", { reason: values.reason }),
      });
      return;
    }
    if (actionName === "pause") {
      setDialog({
        title: "Pause request",
        message: `Pause ${selected.requestNumber}. Add a clear reason so the team knows why work is stopped.`,
        tone: "warning",
        confirmLabel: "Pause request",
        fields: [{ name: "reason", label: "Pause reason", type: "textarea", required: true }],
        onConfirm: (values) => action("pause", { reason: values.reason }),
      });
      return;
    }
    if (actionName === "resume") {
      setDialog({
        title: "Resume request",
        message: `Resume ${selected.requestNumber} and return it to active work.`,
        tone: "success",
        confirmLabel: "Resume request",
        fields: [{ name: "reason", label: "Resume note", type: "textarea", placeholder: "Issue resolved, continue workflow" }],
        onConfirm: (values) => action("resume", { reason: values.reason || undefined }),
      });
      return;
    }
    if (actionName === "restore") {
      setDialog({
        title: "Restore request",
        message: `Restore ${selected.requestNumber} back into the admin queue.`,
        tone: "warning",
        confirmLabel: "Restore request",
        onConfirm: () => action("restore"),
      });
      return;
    }
    if (actionName === "delete" || actionName === "archive" || actionName === "close") {
      setDialog({
        title: `${labelAction(actionName)} request`,
        message: `Confirm ${labelAction(actionName).toLowerCase()} for ${selected.requestNumber}. The action will be recorded in the activity log.`,
        tone: actionName === "delete" ? "danger" : "warning",
        confirmLabel: labelAction(actionName),
        onConfirm: () => action(actionName),
      });
      return;
    }
    void action(actionName);
  }

  function scheduleInspection() {
    if (!selected) return;
    setDialog({
      title: "Schedule inspection",
      message: "Set the exact inspection date, time, and responsible consultant. The owner and consultant will be notified.",
      tone: "info",
      confirmLabel: "Schedule inspection",
      fields: [
        { name: "scheduledAt", label: "Inspection date and time", type: "datetime-local", defaultValue: defaultDateTimeLocal(3), required: true },
        {
          name: "assignedTo",
          label: "Assign to",
          type: "select",
          defaultValue: selected.consultantId ?? "",
          options: (data?.consultants ?? []).map((consultant) => ({ label: `${consultant.name} (${consultant.city})`, value: consultant.userId })),
        },
        { name: "note", label: "Internal scheduling note", type: "textarea", placeholder: "Access instructions, owner availability, or inspection focus" },
      ],
      onConfirm: async (values) => {
        await action("schedule_inspection", {
          scheduledAt: new Date(values.scheduledAt).toISOString(),
          assignedTo: values.assignedTo || undefined,
        });
        if (values.note?.trim()) await action("add_note", { body: `Inspection note: ${values.note.trim()}`, internal: true });
      },
    });
  }

  function generateValuation() {
    setDialog({
      title: "Create valuation",
      message: "Enter the valuation amount. The valuation will be saved and visible from the request details.",
      tone: "info",
      confirmLabel: "Create valuation",
      fields: [{ name: "amount", label: "Property valuation amount (USD)", type: "number", defaultValue: 150000, required: true, min: 0 }],
      onConfirm: (values) => action("assign_valuation", { amount: Number(values.amount), currency: "USD" }),
    });
  }

  function generateQuotation() {
    setDialog({
      title: "Generate quotation",
      message: "Build a quotation with clear line items. It will be stored on the request and can be downloaded as a PDF.",
      tone: "info",
      confirmLabel: "Generate quotation",
      fields: [
        { name: "title", label: "Quotation title", defaultValue: "Management package", required: true },
        { name: "monthly", label: "Monthly management fee (USD)", type: "number", defaultValue: 49, required: true, min: 0 },
        { name: "inspection", label: "Inspection fee (USD)", type: "number", defaultValue: 25, required: true, min: 0 },
      ],
      onConfirm: (values) => action("generate_quotation", {
        title: values.title,
        lineItems: [
          { label: "Monthly management fee", amount: Number(values.monthly) },
          { label: "Inspection", amount: Number(values.inspection) },
        ],
        currency: "USD",
      }),
    });
  }

  function generateAgreement() {
    setDialog({
      title: "Generate agreement",
      message: "Choose the agreement type and title. The generated agreement will be saved on this request for review, download, email, and signing.",
      tone: "info",
      confirmLabel: "Generate agreement",
      fields: [
        {
          name: "type",
          label: "Agreement type",
          type: "select",
          defaultValue: "MANAGEMENT",
          required: true,
          options: [
            { label: "Property management agreement", value: "MANAGEMENT" },
            { label: "Tenancy agreement", value: "TENANCY" },
          ],
        },
        { name: "title", label: "Agreement title", defaultValue: "Property Management Agreement", required: true },
      ],
      onConfirm: (values) => action("generate_agreement", { type: values.type, title: values.title }),
    });
  }

  function signAgreement() {
    if (!selected) return;
    const unsigned = selected.agreements.filter((agreement) => agreement.status !== "SIGNED");
    setDialog({
      title: "Mark agreement signed",
      message: "Select the exact agreement that has been signed. This updates the request and notifies the owner.",
      tone: "warning",
      confirmLabel: "Mark signed",
      fields: [
        {
          name: "agreementId",
          label: "Agreement",
          type: "select",
          defaultValue: unsigned[0]?.id ?? selected.agreements[0]?.id ?? "",
          required: true,
          options: selected.agreements.map((agreement) => ({ label: `${agreement.title} - ${agreement.status}`, value: agreement.id })),
        },
      ],
      onConfirm: (values) => action("sign_agreement", { agreementId: values.agreementId }),
    });
  }

  function activateManagement() {
    if (!selected) return;
    setDialog({
      title: "Activate property management",
      message: "Confirm the signed agreement is in place and the property is ready to move into active management.",
      tone: "success",
      confirmLabel: "Activate management",
      fields: [{ name: "note", label: "Activation note", type: "textarea", placeholder: "Handover confirmed, keys received, owner approved" }],
      onConfirm: async (values) => {
        await action("activate_management");
        if (values.note?.trim()) await action("add_note", { body: `Activation note: ${values.note.trim()}`, internal: true });
      },
    });
  }

  function generateInvoice() {
    setDialog({
      title: "Generate invoice",
      message: "Create a payable invoice. It will be saved, emailed to the owner, and available for PDF download.",
      tone: "info",
      confirmLabel: "Generate invoice",
      fields: [
        { name: "title", label: "Invoice title", defaultValue: "Inspection fee", required: true },
        { name: "amount", label: "Invoice amount (USD)", type: "number", defaultValue: 25, required: true, min: 0 },
        { name: "dueDate", label: "Due date", type: "date", defaultValue: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10), required: true },
      ],
      onConfirm: (values) => action("generate_invoice", { title: values.title, amount: Number(values.amount), currency: "USD", dueDate: values.dueDate }),
    });
  }

  function requestDocument() {
    setDialog({
      title: "Request document",
      message: "Ask the right party for a missing document with a deadline and upload instructions. The request will be emailed and tracked.",
      tone: "info",
      confirmLabel: "Request document",
      fields: [
        { name: "name", label: "Document name", defaultValue: "Title deed / proof of ownership", required: true },
        {
          name: "type",
          label: "Document type",
          type: "select",
          defaultValue: "proof_of_ownership",
          required: true,
          options: [
            { label: "Proof of ownership", value: "proof_of_ownership" },
            { label: "National ID / passport", value: "identity" },
            { label: "Utility bill", value: "utility_bill" },
            { label: "Bank details", value: "bank_details" },
            { label: "Signed mandate", value: "signed_mandate" },
            { label: "Tax clearance", value: "tax_clearance" },
            { label: "Other", value: "other" },
          ],
        },
        {
          name: "requestedFrom",
          label: "Request from",
          type: "select",
          defaultValue: "owner",
          required: true,
          options: [
            { label: "Property owner", value: "owner" },
            { label: "Assigned consultant", value: "consultant" },
            { label: "Tenant / occupant", value: "tenant" },
            { label: "Agent / agency", value: "agent" },
          ],
        },
        { name: "dueDate", label: "Due date", type: "date", defaultValue: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10), required: true },
        { name: "instructions", label: "Upload instructions", type: "textarea", placeholder: "Example: Upload a clear PDF or photo showing the full document, matching owner name, and property address.", required: true },
      ],
      onConfirm: (values) => action("request_document", {
        name: values.name,
        type: values.type,
        requestedFrom: values.requestedFrom,
        dueDate: values.dueDate,
        instructions: values.instructions,
      }),
    });
  }

  async function emailPreviewDocument(item: PreviewItem) {
    if (!selected) return;
    const documentId = "id" in item.item ? item.item.id : "";
    if (!documentId) return;
    await action("email_document", { documentType: item.kind, documentId });
    showToast(`${previewTitle(item)} emailed to ${selected.ownerName}.`);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {data?.summary &&
          Object.entries(data.summary).map(([k, v]) => (
            <div key={k} className="rounded-xl border border-white/10 bg-slate-900/60 p-3 text-center">
              <p className="text-xs uppercase text-slate-500">{k}</p>
              <p className="text-xl font-bold text-white">{v}</p>
            </div>
          ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search requests..." className="w-full rounded-lg border border-white/10 bg-slate-950 py-2 pl-10 pr-3 text-sm text-white" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">
          <option value="">All statuses</option>
          {["SUBMITTED", "PENDING_ASSIGNMENT", "ASSIGNED", "IN_PROGRESS", "APPROVED", "PAUSED", "REJECTED", "CLOSED", "ARCHIVED"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <Button variant="secondary" onClick={() => void load()}><RefreshCw className="size-4" /></Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-2 max-h-[600px] overflow-y-auto">
          {(data?.requests ?? []).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelected(r)}
              className={`w-full rounded-xl border p-4 text-left transition ${selected?.id === r.id ? "border-cyan-500 bg-cyan-500/10" : "border-white/10 bg-slate-900/60 hover:bg-white/5"}`}
            >
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-semibold text-white">{r.requestNumber}</p>
                  <p className="text-sm text-slate-400">{r.ownerName} - {r.city}</p>
                  <p className="text-xs text-slate-500">{r.serviceType} / {r.propertyType}</p>
                </div>
                <div className="text-right">
                  <StatusBadge status={r.status} />
                  {r.slaBreached && <p className="mt-1 text-xs text-red-400">SLA breached</p>}
                  <p className="mt-1 text-xs text-slate-500">{r.progressPercent}%</p>
                </div>
              </div>
              {r.consultantName && <p className="mt-2 text-xs text-cyan-400">Consultant: {r.consultantName}</p>}
            </button>
          ))}
          {data?.requests.length === 0 && <p className="text-slate-500">No requests yet. Owners can submit at /property-management</p>}
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
          {!selected ? (
            <p className="text-sm text-slate-500">Select a request to manage.</p>
          ) : (
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="text-lg font-semibold text-white">{selected.requestNumber}</h3>
                <p className="text-slate-400">{selected.propertyAddress}, {selected.city}</p>
                <StatusBadge status={selected.status} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded bg-slate-950/50 p-2"><p className="text-slate-500">Owner</p><p className="text-white">{selected.ownerName}</p></div>
                <div className="rounded bg-slate-950/50 p-2"><p className="text-slate-500">Consultant</p><p className="text-white">{selected.consultantName ?? "Unassigned"}</p></div>
              </div>

              <div>
                <p className="mb-1 text-xs uppercase text-slate-500">Assign consultant</p>
                <div className="flex gap-2">
                  <select value={consultantId} onChange={(e) => setConsultantId(e.target.value)} className="flex-1 rounded border border-white/10 bg-slate-950 px-2 py-1 text-white">
                    <option value="">Select...</option>
                    {(data?.consultants ?? []).map((c) => (
                      <option key={c.userId} value={c.userId}>{c.name} ({c.city})</option>
                    ))}
                  </select>
                  <Button onClick={() => void action("assign_consultant", { consultantId })} disabled={!consultantId || actionBusy === "assign_consultant"}>
                    {actionBusy === "assign_consultant" ? "Assigning..." : "Assign"}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                <Button onClick={() => actionWithPrompt("approve")} disabled={actionBusy === "approve"}>Approve</Button>
                <Button variant="secondary" onClick={() => actionWithPrompt("reject")} disabled={actionBusy === "reject"}>Reject</Button>
                <Button variant="secondary" onClick={() => actionWithPrompt("pause")} disabled={actionBusy === "pause"}>Pause</Button>
                <Button variant="secondary" onClick={() => actionWithPrompt("resume")} disabled={actionBusy === "resume"}>Resume</Button>
                <Button variant="secondary" onClick={() => actionWithPrompt("close")} disabled={actionBusy === "close"}>Close</Button>
                <Button variant="secondary" onClick={() => actionWithPrompt("archive")} disabled={actionBusy === "archive"}>Archive</Button>
                <Button variant="secondary" onClick={() => actionWithPrompt("delete")} disabled={actionBusy === "delete"}>Delete</Button>
                {selected.deletedAt && (
                  <Button variant="secondary" onClick={() => actionWithPrompt("restore")} disabled={actionBusy === "restore"}>Restore</Button>
                )}
              </div>

              <div className="flex flex-wrap gap-1">
                <Button variant="secondary" onClick={scheduleInspection} disabled={actionBusy === "schedule_inspection"}>Schedule inspection</Button>
                <Button variant="secondary" onClick={generateValuation} disabled={actionBusy === "assign_valuation"}>Valuation</Button>
                <Button variant="secondary" onClick={generateQuotation} disabled={actionBusy === "generate_quotation"}>Quotation</Button>
                <Button variant="secondary" onClick={generateAgreement} disabled={actionBusy === "generate_agreement"}>Agreement</Button>
                <Button variant="secondary" onClick={signAgreement} disabled={!selected.agreements.length || actionBusy === "sign_agreement"}>Mark signed</Button>
                <Button variant="secondary" onClick={activateManagement} disabled={!selected.agreements.some((a) => a.status === "SIGNED") || actionBusy === "activate_management"}>Activate management</Button>
                <Button variant="secondary" onClick={generateInvoice} disabled={actionBusy === "generate_invoice"}>Invoice</Button>
                <Button variant="secondary" onClick={requestDocument} disabled={actionBusy === "request_document"}>Request doc</Button>
              </div>

              <div>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Internal note..." className="w-full rounded border border-white/10 bg-slate-950 px-2 py-1 text-white" rows={2} />
                <Button className="mt-1" variant="secondary" onClick={() => void action("add_note", { body: note, internal: true })} disabled={!note.trim() || actionBusy === "add_note"}>Add note</Button>
              </div>

              <div className="grid gap-2">
                <DetailSection
                  icon={ClipboardCheck}
                  title="Inspections"
                  empty="No inspection scheduled yet."
                  items={selected.inspections.map((item) => ({
                    id: item.id,
                    label: `${new Date(item.scheduledAt).toLocaleString()} - ${item.status}`,
                    onView: () => setPreview({ kind: "inspection", item }),
                  }))}
                />
                <DetailSection
                  icon={CheckCircle2}
                  title="Valuations & quotations"
                  empty="No valuation or quotation yet."
                  items={[
                    ...selected.valuations.map((item) => ({
                      id: item.id,
                      label: `${item.currency} ${item.amount.toLocaleString()} - ${item.status}`,
                      onView: () => setPreview({ kind: "valuation", item }),
                    })),
                    ...selected.quotations.map((item) => ({
                      id: item.id,
                      label: `${item.title}: ${item.currency} ${item.total.toLocaleString()} - ${item.status}`,
                      onView: () => setPreview({ kind: "quotation", item }),
                    })),
                  ]}
                />
                <DetailSection
                  icon={FileSignature}
                  title="Agreements"
                  empty="No agreement generated yet."
                  items={selected.agreements.map((item) => ({
                    id: item.id,
                    label: `${item.title} - ${item.status}`,
                    onView: () => setPreview({ kind: "agreement", item }),
                  }))}
                />
                <DetailSection
                  icon={FileText}
                  title="Documents & invoices"
                  empty="No documents or invoices yet."
                  items={[
                    ...selected.documents.map((item) => ({
                      id: item.id,
                      label: `${item.name} - ${item.status}`,
                      onView: () => setPreview({ kind: "document", item }),
                    })),
                    ...selected.invoices.map((item) => ({
                      id: item.id,
                      label: `${item.title}: ${item.currency} ${item.amount.toLocaleString()} - ${item.status}`,
                      onView: () => setPreview({ kind: "invoice", item }),
                    })),
                  ]}
                />
              </div>

              <div>
                <p className="mb-1 text-xs uppercase text-slate-500">Timeline</p>
                {selected.timeline.map((t) => (
                  <p key={t.id} className={`text-xs ${t.status === "completed" ? "text-emerald-400" : t.status === "current" ? "text-cyan-400" : "text-slate-500"}`}>
                    {t.label} {t.at ? `- ${new Date(t.at).toLocaleDateString()}` : ""}
                  </p>
                ))}
              </div>

              <div>
                <p className="mb-1 text-xs uppercase text-slate-500">Activity</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {selected.activityLog.slice(0, 10).map((a) => (
                    <p key={a.id} className="text-xs text-slate-400">{a.actorName}: {a.detail}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AdminActionDialog config={dialog} onClose={() => setDialog(null)} />
      {preview && <ActionPreviewModal preview={preview} request={selected} onClose={() => setPreview(null)} onEmail={(item) => void emailPreviewDocument(item)} />}
    </div>
  );
}

type DetailItem = {
  id: string;
  label: string;
  onView: () => void;
};

function DetailSection({
  icon: Icon,
  title,
  empty,
  items,
}: {
  icon: typeof ClipboardCheck;
  title: string;
  empty: string;
  items: DetailItem[];
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/40 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
        <Icon className="size-4 text-cyan-400" />
        {title}
      </div>
      {items.length > 0 ? (
        <div className="space-y-1">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2 rounded bg-white/[0.03] px-2 py-1 text-xs text-slate-300">
              <span className="min-w-0 truncate">{item.label}</span>
              <button
                type="button"
                onClick={item.onView}
                className="inline-flex shrink-0 items-center gap-1 rounded border border-white/10 px-2 py-1 text-[11px] font-semibold text-cyan-300 transition hover:border-cyan-400/60 hover:bg-cyan-400/10"
              >
                <Eye className="size-3" /> View
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-600">{empty}</p>
      )}
    </div>
  );
}

function previewFromAction(
  actionName: string,
  result: PMActionResult,
  request: PropertyManagementRequest,
): PreviewItem | null {
  if (actionName === "schedule_inspection" && isInspection(result)) return { kind: "inspection", item: result };
  if (actionName === "assign_valuation" && isValuation(result)) return { kind: "valuation", item: result };
  if (actionName === "generate_quotation" && isQuotation(result)) return { kind: "quotation", item: result };
  if (actionName === "generate_agreement" && isAgreement(result)) return { kind: "agreement", item: result };
  if (actionName === "sign_agreement" && isAgreement(result)) return { kind: "agreement", item: result };
  if (actionName === "generate_invoice" && isInvoice(result)) return { kind: "invoice", item: result };
  if (actionName === "request_document" && isDocument(result)) return { kind: "document", item: result };
  if (["approve", "reject", "pause", "resume", "close", "archive", "delete", "restore", "activate_management"].includes(actionName)) {
    return { kind: "request", item: request };
  }
  return null;
}

function isInspection(item: PMActionResult): item is PMInspection {
  return "scheduledAt" in item && "assignedTo" in item;
}

function isValuation(item: PMActionResult): item is PMValuation {
  return "amount" in item && "currency" in item && !("dueDate" in item) && !("total" in item);
}

function isQuotation(item: PMActionResult): item is PMQuotation {
  return "lineItems" in item && "total" in item;
}

function isAgreement(item: PMActionResult): item is PMAgreement {
  return "content" in item && "type" in item;
}

function isInvoice(item: PMActionResult): item is PMInvoice {
  return "dueDate" in item && "amount" in item;
}

function isDocument(item: PMActionResult): item is PMDocument {
  return "name" in item && "updatedAt" in item;
}

function ActionPreviewModal({
  preview,
  request,
  onClose,
  onEmail,
}: {
  preview: PreviewItem;
  request: PropertyManagementRequest | null;
  onClose: () => void;
  onEmail: (preview: PreviewItem) => void;
}) {
  const title = previewTitle(preview);
  const canDeliver = preview.kind !== "request";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-950 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-white/10 bg-slate-950/95 p-5 backdrop-blur">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Action result</p>
            <h3 className="mt-1 text-xl font-semibold text-white">{title}</h3>
            {request ? <p className="mt-1 text-sm text-slate-400">{request.requestNumber} - {request.propertyAddress}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 p-2 text-slate-300 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
            aria-label="Close preview"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <PreviewContent preview={preview} request={request} />
          {canDeliver && (
            <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <Button onClick={() => downloadPreviewPdf(preview, request)}>
                <Download className="size-4" /> Download PDF
              </Button>
              <Button variant="secondary" onClick={() => onEmail(preview)}>
                <Mail className="size-4" /> Email owner
              </Button>
            </div>
          )}
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm text-cyan-100">
            This record is saved on the request. You can reopen it with the View button, download it as a PDF, or email it to the owner.
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewContent({ preview, request }: { preview: PreviewItem; request: PropertyManagementRequest | null }) {
  if (preview.kind === "invoice") {
    const invoice = preview.item;
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
        <DocumentHeader label="Invoice" id={invoice.id} status={invoice.status} />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <PreviewField label="Title" value={invoice.title} />
          <PreviewField label="Amount" value={`${invoice.currency} ${invoice.amount.toLocaleString()}`} />
          <PreviewField label="Due date" value={invoice.dueDate} />
          <PreviewField label="Payment" value={invoice.paymentId ?? "Awaiting payment"} />
        </div>
        <p className="mt-5 text-sm leading-6 text-slate-300">
          Invoice issued to {request?.ownerName ?? "owner"} for {request?.propertyAddress ?? "this property"}.
        </p>
      </div>
    );
  }

  if (preview.kind === "quotation") {
    const quotation = preview.item;
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
        <DocumentHeader label="Quotation" id={quotation.id} status={quotation.status} />
        <PreviewField className="mt-5" label="Title" value={quotation.title} />
        <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
          {quotation.lineItems.map((line) => (
            <div key={line.label} className="flex justify-between gap-3 border-b border-white/10 px-3 py-2 text-sm last:border-0">
              <span className="text-slate-300">{line.label}</span>
              <span className="font-semibold text-white">{quotation.currency} {line.amount.toLocaleString()}</span>
            </div>
          ))}
          <div className="flex justify-between gap-3 bg-emerald-500/10 px-3 py-3 text-sm">
            <span className="font-semibold text-emerald-200">Total</span>
            <span className="font-bold text-emerald-100">{quotation.currency} {quotation.total.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }

  if (preview.kind === "agreement") {
    const agreement = preview.item;
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
        <DocumentHeader label={agreement.type === "MANAGEMENT" ? "Management agreement" : "Tenancy agreement"} id={agreement.id} status={agreement.status} />
        <PreviewField className="mt-5" label="Title" value={agreement.title} />
        <div className="mt-4 rounded-lg border border-white/10 bg-slate-950 p-4 text-sm leading-7 text-slate-200">
          {agreement.content}
        </div>
      </div>
    );
  }

  if (preview.kind === "inspection") {
    const inspection = preview.item;
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
        <DocumentHeader label="Inspection" id={inspection.id} status={inspection.status} />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <PreviewField label="Scheduled for" value={new Date(inspection.scheduledAt).toLocaleString()} />
          <PreviewField label="Assigned to" value={inspection.assignedTo ?? request?.consultantName ?? "Consultant"} />
          <PreviewField label="Notes" value={inspection.notes ?? "No notes yet"} />
        </div>
      </div>
    );
  }

  if (preview.kind === "valuation") {
    const valuation = preview.item;
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
        <DocumentHeader label="Valuation" id={valuation.id} status={valuation.status} />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <PreviewField label="Amount" value={`${valuation.currency} ${valuation.amount.toLocaleString()}`} />
          <PreviewField label="Created" value={new Date(valuation.createdAt).toLocaleString()} />
          <PreviewField label="Notes" value={valuation.notes ?? "No notes yet"} />
        </div>
      </div>
    );
  }

  if (preview.kind === "document") {
    const document = preview.item;
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
        <DocumentHeader label="Document request" id={document.id} status={document.status} />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <PreviewField label="Name" value={document.name} />
          <PreviewField label="Type" value={document.type} />
          <PreviewField label="URL" value={document.url ?? "Awaiting upload"} />
          <PreviewField label="Updated" value={new Date(document.updatedAt).toLocaleString()} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
      <DocumentHeader label="Request updated" id={preview.item.id} status={preview.item.status} />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <PreviewField label="Owner" value={preview.item.ownerName} />
        <PreviewField label="Service" value={preview.item.serviceType} />
        <PreviewField label="Progress" value={`${preview.item.progressPercent}%`} />
        <PreviewField label="Updated" value={new Date(preview.item.updatedAt).toLocaleString()} />
      </div>
    </div>
  );
}

function DocumentHeader({ label, id, status }: { label: string; id: string; status: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="mt-1 break-all text-xs text-slate-500">{id}</p>
      </div>
      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-200">{status}</span>
    </div>
  );
}

function PreviewField({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-lg border border-white/10 bg-slate-950/70 p-3 ${className}`}>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm text-white">{value}</p>
    </div>
  );
}

function previewTitle(preview: PreviewItem) {
  switch (preview.kind) {
    case "inspection":
      return "Inspection scheduled";
    case "valuation":
      return "Valuation created";
    case "quotation":
      return "Quotation generated";
    case "agreement":
      return "Agreement generated";
    case "invoice":
      return "Invoice generated";
    case "document":
      return "Document requested";
    default:
      return "Request updated";
  }
}

function labelAction(actionName: string) {
  return actionName
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function defaultDateTimeLocal(daysFromNow: number) {
  const date = new Date(Date.now() + daysFromNow * 86400000);
  date.setMinutes(0, 0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function downloadPreviewPdf(preview: PreviewItem, request: PropertyManagementRequest | null) {
  const title = previewTitle(preview);
  const lines = buildPreviewPdfLines(preview, request);
  const pdf = createBrandedPdf(title, lines, request);
  const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${request?.requestNumber ?? "homelink"}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildPreviewPdfLines(preview: PreviewItem, request: PropertyManagementRequest | null) {
  const lines = [
    "HomeLink Property Management",
    previewTitle(preview),
    request ? `Request: ${request.requestNumber}` : "",
    request ? `Owner: ${request.ownerName}` : "",
    request ? `Property: ${request.propertyAddress}, ${request.city}` : "",
    "",
  ].filter(Boolean);

  if (preview.kind === "invoice") {
    lines.push(
      `Invoice ID: ${preview.item.id}`,
      `Title: ${preview.item.title}`,
      `Amount: ${preview.item.currency} ${preview.item.amount.toLocaleString()}`,
      `Due date: ${preview.item.dueDate}`,
      `Status: ${preview.item.status}`,
    );
  } else if (preview.kind === "quotation") {
    lines.push(`Quotation ID: ${preview.item.id}`, `Title: ${preview.item.title}`);
    preview.item.lineItems.forEach((item) => lines.push(`${item.label}: ${preview.item.currency} ${item.amount.toLocaleString()}`));
    lines.push(`Total: ${preview.item.currency} ${preview.item.total.toLocaleString()}`, `Status: ${preview.item.status}`);
  } else if (preview.kind === "agreement") {
    lines.push(`Agreement ID: ${preview.item.id}`, `Title: ${preview.item.title}`, `Type: ${preview.item.type}`, `Status: ${preview.item.status}`, "", preview.item.content);
  } else if (preview.kind === "valuation") {
    lines.push(`Valuation ID: ${preview.item.id}`, `Amount: ${preview.item.currency} ${preview.item.amount.toLocaleString()}`, `Status: ${preview.item.status}`, `Notes: ${preview.item.notes ?? "N/A"}`);
  } else if (preview.kind === "inspection") {
    lines.push(`Inspection ID: ${preview.item.id}`, `Scheduled: ${new Date(preview.item.scheduledAt).toLocaleString()}`, `Assigned to: ${preview.item.assignedTo ?? request?.consultantName ?? "Consultant"}`, `Status: ${preview.item.status}`);
  } else if (preview.kind === "document") {
    lines.push(`Document ID: ${preview.item.id}`, `Name: ${preview.item.name}`, `Type: ${preview.item.type}`, `Status: ${preview.item.status}`, `URL: ${preview.item.url ?? "Awaiting upload"}`);
  }

  lines.push("", `Generated: ${new Date().toLocaleString()}`);
  return lines;
}

function createBrandedPdf(title: string, lines: string[], request: PropertyManagementRequest | null) {
  const bodyLines = lines.filter((line) => !["HomeLink Property Management", title].includes(line));
  const content = [
    "q",
    fill(0.965, 0.985, 0.975),
    "0 0 612 792 re f",
    fill(0.02, 0.17, 0.15),
    "0 704 612 88 re f",
    fill(0, 0.64, 0.47),
    "48 728 34 34 re f",
    text(59, 740, 18, "H", "F2", [1, 1, 1]),
    text(94, 748, 20, "HomeLink", "F2", [1, 1, 1]),
    text(95, 730, 9, "Zimbabwe Property Management", "F1", [0.7, 0.95, 0.86]),
    text(430, 748, 11, request?.requestNumber ?? "Generated document", "F2", [0.85, 1, 0.94]),
    text(430, 731, 9, new Date().toLocaleString(), "F1", [0.68, 0.86, 0.8]),
    "Q",

    fill(1, 1, 1),
    stroke(0.78, 0.9, 0.86),
    "38 562 536 112 re B",
    text(58, 640, 11, "DOCUMENT", "F2", [0, 0.52, 0.4]),
    text(58, 610, 25, title, "F2", [0.02, 0.11, 0.15]),
    text(58, 586, 10, "Generated from the HomeLink admin workflow and saved to the property management request.", "F1", [0.32, 0.42, 0.5]),
    fill(0.9, 0.99, 0.95),
    "454 612 82 28 re f",
    text(472, 622, 10, "Official PDF", "F2", [0, 0.48, 0.36]),

    fill(1, 1, 1),
    stroke(0.82, 0.89, 0.92),
    "38 402 536 132 re B",
    text(58, 506, 11, "REQUEST DETAILS", "F2", [0.42, 0.5, 0.58]),
    ...pdfDetailRows([
      ["Owner", request?.ownerName ?? "N/A"],
      ["Property", request ? `${request.propertyAddress}, ${request.city}` : "N/A"],
      ["Service", request?.serviceType ?? "Property management"],
      ["Status", request?.status ?? "Saved"],
    ], 58, 482),

    fill(1, 1, 1),
    stroke(0.82, 0.89, 0.92),
    "38 88 536 284 re B",
    text(58, 344, 11, "DOCUMENT CONTENT", "F2", [0.42, 0.5, 0.58]),
    ...pdfBodyText(bodyLines, 58, 318),

    fill(0.02, 0.17, 0.15),
    "38 42 536 26 re f",
    text(56, 51, 8, "HomeLink Zimbabwe - real property workflows, verified records, and tracked owner communication.", "F1", [0.78, 0.95, 0.88]),
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}

function pdfDetailRows(rows: Array<[string, string]>, x: number, startY: number) {
  return rows.flatMap(([label, value], index) => {
    const y = startY - index * 24;
    return [
      text(x, y, 8, label.toUpperCase(), "F2", [0.46, 0.54, 0.62]),
      text(x + 112, y, 10, pdfShort(value, 64), "F1", [0.05, 0.13, 0.18]),
    ];
  });
}

function pdfBodyText(lines: string[], x: number, startY: number) {
  const usefulLines = lines
    .flatMap((line) => wrapPdfLine(line, 86))
    .filter((line, index, all) => line.trim() || all[index - 1]?.trim())
    .slice(0, 22);

  return usefulLines.map((line, index) => {
    const isLabel = /^[A-Za-z ]+:.+/.test(line);
    return text(x, startY - index * 15, isLabel ? 10 : 9, line || " ", isLabel ? "F2" : "F1", isLabel ? [0.02, 0.32, 0.26] : [0.16, 0.24, 0.31]);
  });
}

function fill(r: number, g: number, b: number) {
  return `${r} ${g} ${b} rg`;
}

function stroke(r: number, g: number, b: number) {
  return `${r} ${g} ${b} RG`;
}

function text(x: number, y: number, size: number, value: string, font: "F1" | "F2", color: [number, number, number]) {
  return `BT ${color.join(" ")} rg /${font} ${size} Tf ${x} ${y} Td ${pdfText(value)} Tj ET`;
}

function wrapPdfLine(line: string, width: number) {
  const words = line.split(" ");
  const wrapped: string[] = [];
  let current = "";
  words.forEach((word) => {
    if (`${current} ${word}`.trim().length > width) {
      wrapped.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  });
  if (current || !wrapped.length) wrapped.push(current);
  return wrapped;
}

function pdfText(value: string) {
  const safe = value
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "-")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
  return `(${safe})`;
}

function pdfShort(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING_ASSIGNMENT: "bg-amber-500/20 text-amber-300",
    ASSIGNED: "bg-cyan-500/20 text-cyan-300",
    IN_PROGRESS: "bg-blue-500/20 text-blue-300",
    APPROVED: "bg-emerald-500/20 text-emerald-300",
    REJECTED: "bg-red-500/20 text-red-300",
    PAUSED: "bg-slate-500/20 text-slate-300",
    CLOSED: "bg-purple-500/20 text-purple-300",
    ARCHIVED: "bg-slate-600/20 text-slate-400",
  };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${colors[status] ?? "bg-white/10 text-slate-300"}`}>{status}</span>;
}
