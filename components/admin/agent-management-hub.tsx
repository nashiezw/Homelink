"use client";

/* eslint-disable @next/next/no-img-element -- admin previews render arbitrary uploaded document/image URLs */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AgentAdminAnalytics, AgentApplication, AgentCommission, AgentLead, AgentProfile, AgentSystemSettings, AgentTerritory, CommissionRule } from "@/lib/agents/types";
import { TerritoryEditor } from "@/components/admin/agent-territory-editor";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { AdminActionFeedback } from "@/components/admin/action-feedback";
import { AdminActionDialog, type AdminDialogConfig } from "@/components/admin/action-dialog";
import { AdminKpiCard } from "@/components/admin/kpi-card";
import { BarChart, MetricRow } from "@/components/admin/charts";
import { Eye, Users, Wallet, FileText, ShieldCheck } from "lucide-react";

type AdminAgentData = {
  analytics: AgentAdminAnalytics;
  applications: AgentApplication[];
  profiles: Array<AgentProfile & { userName?: string; userEmail?: string }>;
  leads: AgentLead[];
  commissions: AgentCommission[];
  territories: AgentTerritory[];
  settings: AgentSystemSettings;
  documents?: AgentDocumentRow[];
  branches?: Array<{ id: string; name: string; city: string; province: string; managerName: string; agentCount: number; active: boolean }>;
};

type AgentDocumentRow = {
  id: string;
  agentName: string;
  type: string;
  label: string;
  status: string;
  url: string;
  expiresAt?: string;
  uploadedAt?: string;
};

const DEFAULT_COMMISSION_TYPES = ["SALE", "RENTAL", "MANAGEMENT"] as const;

export function AgentManagementHub() {
  const { showToast } = useApp();
  const [data, setData] = useState<AdminAgentData | null>(null);
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [subTab, setSubTab] = useState<"overview" | "applications" | "leads" | "commissions" | "territories" | "documents" | "branches" | "settings">("overview");
  const [feedback, setFeedback] = useState<{
    title: string;
    message: string;
    tone?: "success" | "warning" | "danger" | "info";
    details?: Array<{ label: string; value: string | number | undefined }>;
  } | null>(null);
  const [dialog, setDialog] = useState<AdminDialogConfig | null>(null);
  const [documentPreview, setDocumentPreview] = useState<AgentDocumentRow | null>(null);
  const defaultRuleGroups = useMemo(
    () =>
      DEFAULT_COMMISSION_TYPES.map((type) => ({
        type,
        homelink: rules.find((rule) => rule.type === type && rule.scope === "DEFAULT" && rule.leadSource === "HOMELINK"),
        agent: rules.find((rule) => rule.type === type && rule.scope === "DEFAULT" && rule.leadSource === "AGENT"),
      })),
    [rules],
  );
  const advancedRules = useMemo(
    () =>
      rules.filter(
        (rule) =>
          !(
            DEFAULT_COMMISSION_TYPES.includes(rule.type as (typeof DEFAULT_COMMISSION_TYPES)[number]) &&
            rule.scope === "DEFAULT" &&
            (rule.leadSource === "HOMELINK" || rule.leadSource === "AGENT")
          ),
      ),
    [rules],
  );

  function updateRule(ruleId: string, updates: Partial<CommissionRule>) {
    setRules((current) => current.map((rule) => (rule.id === ruleId ? { ...rule, ...updates } : rule)));
  }

  function updateRuleSplit(ruleId: string, owner: "HOMELINK" | "AGENT", value: number) {
    const bounded = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
    updateRule(
      ruleId,
      owner === "HOMELINK"
        ? { homelinkSplitPercent: bounded, agentSplitPercent: 100 - bounded }
        : { agentSplitPercent: bounded, homelinkSplitPercent: 100 - bounded },
    );
  }

  const load = useCallback(async () => {
    const result = await apiFetch<AdminAgentData>("/api/v1/admin/agents");
    if (result.data) {
      setData(result.data);
      setRules(result.data.settings.commissionRules);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function adminAction(body: Record<string, unknown>) {
    const action = String(body.action ?? "update");
    if (["approve_application", "delete_territory"].includes(action)) {
      setDialog({
        title: action.replace(/_/g, " "),
        message: "Confirm this agent workflow action. The admin record will update immediately.",
        tone: action === "delete_territory" ? "danger" : "warning",
        confirmLabel: "Confirm",
        onConfirm: () => applyAgentAction(body),
      });
      return;
    }
    if (action === "pay_commission") {
      openCommissionPayout(String(body.commissionId ?? ""));
      return;
    }
    if (body.status === "DECLINED" || body.status === "rejected" || action === "update_profile" && (body.updates as { status?: string } | undefined)?.status === "SUSPENDED") {
      setDialog({
        title: "Confirm rejection or suspension",
        message: "This action can affect an agent's access and public profile. Confirm to continue.",
        tone: "danger",
        confirmLabel: "Apply action",
        onConfirm: () => applyAgentAction(body),
      });
      return;
    }
    await applyAgentAction(body);
  }

  function openCommissionPayout(commissionId: string) {
    const commission = data?.commissions.find((item) => item.id === commissionId);
    if (!commission) {
      showToast("Commission not found.", "error");
      return;
    }
    setDialog({
      title: "Pay agent commission",
      message: `Record the actual payout for ${commission.agentName}. Agent net payout: $${commission.netAgentAmount.toFixed(2)}.`,
      tone: "warning",
      confirmLabel: "Record payout",
      fields: [
        {
          name: "method",
          label: "Payment method",
          type: "select",
          required: true,
          options: [
            { label: "Bank transfer", value: "bank_transfer" },
            { label: "EcoCash", value: "ecocash" },
            { label: "OneMoney", value: "onemoney" },
            { label: "InnBucks", value: "innbucks" },
            { label: "Cash", value: "cash" },
          ],
        },
        { name: "sourceAccount", label: "HomeLink paying account", required: true, placeholder: "e.g. CBZ operating account" },
        { name: "destinationAccount", label: "Agent destination account", required: true, placeholder: "Bank/mobile wallet/account number" },
        { name: "reference", label: "Payment reference", required: true, placeholder: "Bank ref, transaction id, or receipt number" },
        { name: "note", label: "Finance note", type: "textarea", placeholder: "Optional payout note" },
      ],
      onConfirm: (values) =>
        applyAgentAction({
          action: "pay_commission",
          commissionId,
          payout: {
            method: values.method,
            sourceAccount: values.sourceAccount,
            destinationAccount: values.destinationAccount,
            reference: values.reference,
            note: values.note || undefined,
          },
        }),
    });
  }

  async function applyAgentAction(body: Record<string, unknown>) {
    const action = String(body.action ?? "update");
    const result = await apiFetch("/api/v1/admin/agents", { method: "PATCH", body: JSON.stringify(body) });
    if (result.error) showToast(result.error.message ?? "Action failed.", "error");
    else {
      showToast("Updated successfully.");
      setFeedback({
        title: "Agent workflow updated",
        message: `${action.replace(/_/g, " ")} completed successfully.`,
        tone: body.status === "DECLINED" || body.status === "rejected" ? "warning" : "success",
        details: [
          { label: "Action", value: action.replace(/_/g, " ") },
          { label: "Target", value: String(body.applicationId ?? body.userId ?? body.commissionId ?? body.documentId ?? body.territoryId ?? "Settings") },
        ],
      });
      void load();
    }
  }

  function suspendAgentProfile(userId: string, name?: string) {
    setDialog({
      title: "Suspend agent profile",
      message: `Enter why ${name ?? "this agent"} is being suspended. This reason is kept with the admin workflow.`,
      tone: "danger",
      confirmLabel: "Suspend agent",
      fields: [{ name: "reason", label: "Suspension reason", type: "textarea", required: true }],
      onConfirm: (values) => applyAgentAction({ action: "update_profile", userId, updates: { status: "SUSPENDED", suspensionReason: values.reason } }),
    });
  }

  function declineApplication(applicationId: string, name?: string) {
    setDialog({
      title: "Decline application",
      message: `Enter the reason ${name ?? "this applicant"} is being declined.`,
      tone: "warning",
      confirmLabel: "Decline application",
      fields: [{ name: "note", label: "Decline reason", type: "textarea", required: true }],
      onConfirm: (values) => applyAgentAction({ action: "update_application_status", applicationId, status: "DECLINED", note: values.note }),
    });
  }

  function reviewAgentDocument(documentId: string, status: "verified" | "rejected") {
    setDialog({
      title: status === "verified" ? "Verify document" : "Reject document",
      message: status === "verified" ? "Confirm this document has been checked and is valid." : "Enter why this document is being rejected.",
      tone: status === "verified" ? "success" : "warning",
      confirmLabel: status === "verified" ? "Verify" : "Reject",
      fields: status === "verified" ? [] : [{ name: "reason", label: "Rejection reason", type: "textarea", required: true }],
      onConfirm: (values) => applyAgentAction({ action: "verify_document", documentId, status, reason: values.reason || undefined }),
    });
  }

  function addBranch() {
    setDialog({
      title: "Add branch",
      message: "Create an actual branch with location and manager details.",
      tone: "info",
      confirmLabel: "Add branch",
      fields: [
        { name: "name", label: "Branch name", required: true },
        { name: "city", label: "City", required: true },
        { name: "province", label: "Province", required: true },
        { name: "address", label: "Address", required: true },
        { name: "phone", label: "Phone number", required: true },
        { name: "managerName", label: "Manager name", required: true },
      ],
      onConfirm: (values) =>
        applyAgentAction({
          action: "upsert_branch",
          branch: {
            name: values.name,
            city: values.city,
            province: values.province,
            address: values.address,
            phone: values.phone,
            managerName: values.managerName,
            agentCount: 0,
          },
        }),
    });
  }

  if (!data) return <p className="text-slate-400">Loading agent management...</p>;

  const { analytics, applications, profiles, leads, commissions, territories } = data;

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
      {documentPreview && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setDocumentPreview(null)}>
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">{documentPreview.type}</p>
                <h3 className="mt-1 text-lg font-semibold text-white">{documentPreview.label}</h3>
                <p className="text-sm text-slate-400">
                  {documentPreview.agentName}
                  {documentPreview.uploadedAt ? ` - uploaded ${new Date(documentPreview.uploadedAt).toLocaleDateString()}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={documentPreview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
                >
                  <Eye className="size-4" /> Open file
                </a>
                <Button variant="secondary" onClick={() => setDocumentPreview(null)}>Close</Button>
              </div>
            </div>
            <div className="bg-slate-900/70 p-4">
              {documentPreview.url.toLowerCase().match(/\.(png|jpg|jpeg|webp|gif)$/) ? (
                <img src={documentPreview.url} alt={documentPreview.label} className="max-h-[70vh] w-full rounded-xl object-contain" />
              ) : (
                <iframe title={documentPreview.label} src={documentPreview.url} className="h-[70vh] w-full rounded-xl border border-white/10 bg-white" />
              )}
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {(["overview", "applications", "leads", "commissions", "territories", "documents", "branches", "settings"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSubTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
              subTab === t ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {subTab === "overview" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminKpiCard label="Total agents" value={analytics.totalAgents} icon={Users} />
            <AdminKpiCard label="Pending applications" value={analytics.pendingApplications} icon={FileText} tone="warning" />
            <AdminKpiCard label="Company commission" value={`$${analytics.totalCompanyCommission.toFixed(0)}`} icon={Wallet} />
            <AdminKpiCard label="Lead conversion" value={`${analytics.leadConversionRate}%`} icon={ShieldCheck} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminKpiCard label="Awaiting approval" value={`$${analytics.commissionAwaitingApproval.toFixed(0)}`} icon={Wallet} tone="warning" />
            <AdminKpiCard label="Agent commission" value={`$${analytics.totalAgentCommission.toFixed(0)}`} icon={Users} />
            <AdminKpiCard label="Outstanding" value={`$${analytics.outstandingCommission.toFixed(0)}`} icon={FileText} />
            <AdminKpiCard label="Already paid" value={`$${analytics.commissionAlreadyPaid.toFixed(0)}`} icon={ShieldCheck} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Top agents</h3>
              {analytics.topAgents.map((a) => (
                <MetricRow key={a.id} label={a.name} value={`${a.deals} deals · $${a.revenue.toFixed(0)}`} />
              ))}
            </section>
            <BarChart
              data={analytics.provincePerformance.map((p) => ({ label: p.province, value: p.closed }))}
            />
          </div>
          <section className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Active agents</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {profiles.map((p) => (
                <div key={p.id} className="rounded-lg border border-white/10 p-4">
                  <p className="font-semibold text-white">{p.userName}</p>
                  <p className="text-sm text-slate-400">{p.agentIdCode} · {p.level} · {p.status}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => void adminAction({ action: "update_profile", userId: p.userId, updates: { level: "GOLD" } })}>
                      Promote to Gold
                    </Button>
                    <Button variant="secondary" onClick={() => suspendAgentProfile(p.userId, p.userName)}>
                      Suspend
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {subTab === "applications" && (
        <div className="grid gap-4">
          {applications.map((app) => (
            <article key={app.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{app.personal.fullName || "Unnamed applicant"}</p>
                  <p className="text-sm text-slate-400">{app.personal.email} · {app.status.replace(/_/g, " ")}</p>
                  <p className="text-sm text-slate-500">{app.professional.city}, {app.professional.province}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void adminAction({ action: "update_application_status", applicationId: app.id, status: "PENDING_REVIEW" })}>Review</Button>
                  <Button onClick={() => void adminAction({ action: "update_application_status", applicationId: app.id, status: "TRAINING" })}>Send to training</Button>
                  <Button onClick={() => void adminAction({ action: "approve_application", applicationId: app.id })}>Approve</Button>
                  <Button variant="secondary" onClick={() => declineApplication(app.id, app.personal.fullName)}>Decline</Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {subTab === "leads" && (
        <div className="space-y-3">
          {leads.length === 0 ? (
            <p className="text-sm text-slate-400">No agent leads in the pipeline.</p>
          ) : (
            leads.map((lead) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                agents={profiles}
                onAction={adminAction}
              />
            ))
          )}
        </div>
      )}

      {subTab === "commissions" && (
        <>
        <div className="space-y-3 md:hidden">
          {commissions.map((c, index) => (
            <article key={`${c.id}-${index}`} className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-white">{c.agentName}</p>
                  <p className="text-xs text-slate-500">{c.type} / {c.leadSource ?? "HOMELINK"}</p>
                </div>
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold text-slate-300">{c.status}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-white/[0.04] px-2 py-1.5">
                  <p className="text-slate-500">HomeLink share</p>
                  <p className="font-medium text-slate-200">${c.homelinkAmount.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-white/[0.04] px-2 py-1.5">
                  <p className="text-slate-500">Agent gross</p>
                  <p className="font-medium text-slate-200">${c.agentAmount.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-white/[0.04] px-2 py-1.5">
                  <p className="text-slate-500">Net payout</p>
                  <p className="font-medium text-slate-200">${c.netAgentAmount.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-white/[0.04] px-2 py-1.5">
                  <p className="text-slate-500">Split</p>
                  <p className="font-medium text-slate-200">{c.ruleSnapshot.homelinkSplitPercent}% / {c.ruleSnapshot.agentSplitPercent}%</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-400">{c.commissionRuleLabel ?? c.ruleSnapshot.ruleLabel ?? "Configured commission rule"}</p>
              {c.payout && (
                <p className="mt-1 text-xs text-slate-500">
                  {c.payout.method.replace(/_/g, " ")} - {c.payout.reference}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {c.status === "PENDING" && (
                  <Button variant="secondary" onClick={() => void adminAction({ action: "approve_commission", commissionId: c.id })}>
                    Approve
                  </Button>
                )}
                {c.status !== "PAID" && c.status !== "CANCELLED" && (
                  <Button variant="secondary" onClick={() => void adminAction({ action: "pay_commission", commissionId: c.id })}>
                    Pay
                  </Button>
                )}
                {c.status !== "PAID" && c.status !== "CANCELLED" && (
                  <Button variant="secondary" onClick={() => void adminAction({ action: "update_commission_status", commissionId: c.id, status: "DISPUTED", reason: "Marked disputed by administrator." })}>
                    Dispute
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto rounded-xl border border-white/10 md:block">
          <table className="min-w-[920px] text-sm text-slate-300">
            <thead className="bg-slate-900">
              <tr>
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Source</th>
                <th className="px-4 py-3 text-left">Rule & split</th>
                <th className="px-4 py-3 text-left">HomeLink share</th>
                <th className="px-4 py-3 text-left">Agent gross</th>
                <th className="px-4 py-3 text-left">Agent net payout</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left" />
              </tr>
            </thead>
            <tbody>
              {commissions.map((c, index) => (
                <tr key={`${c.id}-${index}`} className="border-t border-white/10">
                  <td className="px-4 py-3">{c.agentName}</td>
                  <td className="px-4 py-3">{c.type}</td>
                  <td className="px-4 py-3">{c.leadSource ?? "HOMELINK"}</td>
                  <td className="px-4 py-3">
                    <p>{c.commissionRuleLabel ?? c.ruleSnapshot.ruleLabel ?? "Configured commission rule"}</p>
                    <p className="text-xs text-slate-500">HomeLink {c.ruleSnapshot.homelinkSplitPercent}% / Agent {c.ruleSnapshot.agentSplitPercent}%</p>
                  </td>
                  <td className="px-4 py-3">${c.homelinkAmount.toFixed(2)}</td>
                  <td className="px-4 py-3">${c.agentAmount.toFixed(2)}</td>
                  <td className="px-4 py-3">${c.netAgentAmount.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <p>{c.status}</p>
                    {c.payout && (
                      <p className="mt-1 text-xs text-slate-500">
                        {c.payout.method.replace(/_/g, " ")} - {c.payout.reference}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                    {c.status === "PENDING" && (
                      <Button variant="secondary" onClick={() => void adminAction({ action: "approve_commission", commissionId: c.id })}>
                        Approve
                      </Button>
                    )}
                    {c.status !== "PAID" && c.status !== "CANCELLED" && (
                      <Button variant="secondary" onClick={() => void adminAction({ action: "pay_commission", commissionId: c.id })}>
                        Pay
                      </Button>
                    )}
                    {c.status !== "PAID" && c.status !== "CANCELLED" && (
                      <Button variant="secondary" onClick={() => void adminAction({ action: "update_commission_status", commissionId: c.id, status: "DISPUTED", reason: "Marked disputed by administrator." })}>
                        Dispute
                      </Button>
                    )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {subTab === "territories" && (
        <TerritoryEditor
          territories={territories}
          profiles={profiles}
          onSave={async (territory) => {
            await adminAction({ action: "save_territory", territory });
          }}
          onDelete={async (territoryId) => {
            await adminAction({ action: "delete_territory", territoryId });
          }}
        />
      )}

      {subTab === "documents" && (
        <section className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Licences & verification documents</h3>
          <div className="space-y-3">
            {(data.documents ?? []).map((doc) => (
              <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-800/50 px-4 py-3">
                <div>
                  <p className="font-medium text-white">{doc.agentName} — {doc.label}</p>
                  <p className="text-xs text-slate-500">{doc.type} {doc.expiresAt ? `· Expires ${new Date(doc.expiresAt).toLocaleDateString()}` : ""}</p>
                </div>
                <div className="flex gap-2">
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">{doc.status}</span>
                  <Button variant="secondary" onClick={() => setDocumentPreview(doc)}>
                    <Eye className="size-4" /> View
                  </Button>
                  {doc.status === "pending" && (
                    <>
                      <Button variant="secondary" onClick={() => reviewAgentDocument(doc.id, "verified")}>Verify</Button>
                      <Button variant="secondary" onClick={() => reviewAgentDocument(doc.id, "rejected")}>Reject</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {subTab === "branches" && (
        <section className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Branch hierarchy</h3>
          <Button className="mb-4" onClick={addBranch}>
            Add branch
          </Button>
          <div className="grid gap-3 md:grid-cols-2">
            {(data.branches ?? []).map((b) => (
              <div key={b.id} className="rounded-lg border border-white/10 p-4">
                <p className="font-semibold text-white">{b.name}</p>
                <p className="text-sm text-slate-400">{b.city}, {b.province}</p>
                <p className="text-xs text-slate-500">Manager: {b.managerName} · {b.agentCount} agents</p>
                <p className="text-xs text-slate-600">{b.active ? "Active" : "Inactive"}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {subTab === "settings" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Default lead-source commission splits</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Separate settings for HomeLink-generated leads and Agent-generated leads. Changing one side never changes the other.
                </p>
              </div>
              <Button onClick={() => void adminAction({ action: "update_commission_rules", rules, reason: "Admin updated separate HomeLink and Agent lead commission settings." })}>
                Save commission rules
              </Button>
            </div>
            <div className="mt-5 space-y-4">
              {defaultRuleGroups.map(({ type, homelink, agent }) => (
                <div key={type} className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-white">{type.replace(/_/g, " ")}</p>
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">Source-specific defaults</span>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {homelink ? (
                      <SourceRuleEditor
                        title="HomeLink generated lead"
                        description="HomeLink generated the client, so this rule controls the HomeLink-led split only."
                        rule={homelink}
                        primaryOwner="HOMELINK"
                        onRateChange={(value) => updateRule(homelink.id, { ratePercent: value })}
                        onSplitChange={(owner, value) => updateRuleSplit(homelink.id, owner, value)}
                        onActiveChange={(active) => updateRule(homelink.id, { active })}
                      />
                    ) : (
                      <MissingRuleNotice label={`${type} HomeLink lead rule`} />
                    )}
                    {agent ? (
                      <SourceRuleEditor
                        title="Agent generated lead"
                        description="The agent sourced the client, so this rule controls the agent-led split only."
                        rule={agent}
                        primaryOwner="AGENT"
                        onRateChange={(value) => updateRule(agent.id, { ratePercent: value })}
                        onSplitChange={(owner, value) => updateRuleSplit(agent.id, owner, value)}
                        onActiveChange={(active) => updateRule(agent.id, { active })}
                      />
                    ) : (
                      <MissingRuleNotice label={`${type} Agent lead rule`} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {advancedRules.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Advanced overrides</h3>
              <div className="mt-4 space-y-3">
                {advancedRules.map((rule) => (
                  <div key={rule.id} className="grid gap-3 rounded-lg border border-white/10 bg-slate-950/60 p-4 md:grid-cols-5">
                    <div className="md:col-span-5">
                      <p className="font-semibold text-white">{rule.label}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {(rule.leadSource ?? "ANY").replace(/_/g, " ")} - {(rule.scope ?? "DEFAULT").replace(/_/g, " ")} - {rule.reason ?? "Configurable database-driven rule"}
                      </p>
                    </div>
                    <label className="text-sm">
                      Rate %
                      <input type="number" value={rule.ratePercent} onChange={(e) => updateRule(rule.id, { ratePercent: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
                    </label>
                    <label className="text-sm">
                      HomeLink split %
                      <input type="number" value={rule.homelinkSplitPercent} onChange={(e) => updateRuleSplit(rule.id, "HOMELINK", Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
                    </label>
                    <label className="text-sm">
                      Agent split %
                      <input type="number" value={rule.agentSplitPercent} onChange={(e) => updateRuleSplit(rule.id, "AGENT", Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
                    </label>
                    <label className="flex items-end gap-2 text-sm">
                      <input type="checkbox" checked={rule.active} onChange={(e) => updateRule(rule.id, { active: e.target.checked })} className="mb-3 size-4 rounded border-slate-600 bg-slate-950" />
                      Active
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
            <label className="text-sm text-slate-300">
              Lead assignment strategy
              <select
                value={data.settings.leadAssignmentStrategy}
                onChange={(e) => void adminAction({ action: "update_settings", settings: { leadAssignmentStrategy: e.target.value } })}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              >
                {["ROUND_ROBIN", "TERRITORY", "HIGHEST_RATED", "PREMIUM_PRIORITY", "MANUAL"].map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

function SourceRuleEditor({
  title,
  description,
  rule,
  primaryOwner,
  onRateChange,
  onSplitChange,
  onActiveChange,
}: {
  title: string;
  description: string;
  rule: CommissionRule;
  primaryOwner: "HOMELINK" | "AGENT";
  onRateChange: (value: number) => void;
  onSplitChange: (owner: "HOMELINK" | "AGENT", value: number) => void;
  onActiveChange: (active: boolean) => void;
}) {
  return (
    <div className={`rounded-lg border p-4 ${primaryOwner === "HOMELINK" ? "border-emerald-400/30 bg-emerald-500/5" : "border-cyan-400/30 bg-cyan-500/5"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-200">
          {rule.active ? "Active" : "Disabled"}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm text-slate-300">
          Commission rate %
          <input
            type="number"
            min={0}
            value={rule.ratePercent}
            onChange={(e) => onRateChange(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
          />
        </label>
        <label className="text-sm text-slate-300">
          HomeLink share %
          <input
            type="number"
            min={0}
            max={100}
            value={rule.homelinkSplitPercent}
            onChange={(e) => onSplitChange("HOMELINK", Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
          />
        </label>
        <label className="text-sm text-slate-300">
          Agent share %
          <input
            type="number"
            min={0}
            max={100}
            value={rule.agentSplitPercent}
            onChange={(e) => onSplitChange("AGENT", Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-400">
          Saved as: {rule.label} - HomeLink {rule.homelinkSplitPercent}% / Agent {rule.agentSplitPercent}%
        </p>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={rule.active}
            onChange={(e) => onActiveChange(e.target.checked)}
            className="size-4 rounded border-slate-600 bg-slate-950"
          />
          Enabled
        </label>
      </div>
    </div>
  );
}

function MissingRuleNotice({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
      Missing {label}. Save commission rules to regenerate the required default rule.
    </div>
  );
}

function LeadRow({
  lead,
  agents,
  onAction,
}: {
  lead: AgentLead;
  agents: Array<AgentProfile & { userName?: string }>;
  onAction: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [status, setStatus] = useState(lead.status);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [agentUserId, setAgentUserId] = useState(lead.assignedAgentId ?? "");
  const [leadSource, setLeadSource] = useState(lead.leadSource ?? "HOMELINK");
  const assignmentChanged = Boolean(agentUserId) && agentUserId !== (lead.assignedAgentId ?? "");
  const statusChanged = status !== lead.status || notes !== (lead.notes ?? "");
  const ownershipChanged = leadSource !== (lead.leadSource ?? "HOMELINK") || assignmentChanged;

  return (
    <article className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-white">{lead.clientName}</p>
          <p className="text-sm text-slate-400">
            {lead.listingTitle ?? "General enquiry"} - {lead.clientType} - {lead.leadSource ?? "HOMELINK"} lead
          </p>
          {lead.duplicateOwnerReview?.status === "PENDING_ADMIN_REVIEW" && (
            <p className="mt-1 text-xs font-semibold text-amber-300">Possible duplicate owner - admin review required</p>
          )}
          <p className="text-sm text-slate-500">
            {lead.city}
            {lead.suburb ? `, ${lead.suburb}` : ""}
          </p>
          {lead.assignedAgentName && (
            <p className="mt-1 text-xs text-emerald-400">Assigned to {lead.assignedAgentName}</p>
          )}
        </div>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-300">{lead.status}</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <label className="text-sm text-slate-400">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AgentLead["status"])}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
          >
            {["NEW", "ASSIGNED", "ACCEPTED", "REJECTED", "CONTACTED", "VIEWING_SCHEDULED", "OFFER", "CLOSED_WON", "CLOSED_LOST"].map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-400">
          Lead source
          <select
            value={leadSource}
            onChange={(e) => setLeadSource(e.target.value as "HOMELINK" | "AGENT")}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
          >
            <option value="HOMELINK">HomeLink</option>
            <option value="AGENT">Agent</option>
          </select>
        </label>
        <label className="text-sm text-slate-400">
          Assign agent
          <select
            value={agentUserId}
            onChange={(e) => setAgentUserId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
          >
            <option value="">Unassigned</option>
            {agents.map((a) => (
              <option key={a.userId} value={a.userId}>
                {a.userName ?? a.agentIdCode}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-400 md:col-span-1">
          Notes
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
            placeholder="Internal notes"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={!statusChanged}
          onClick={() =>
            void onAction({ action: "update_lead", leadId: lead.id, status, notes })
          }
        >
          Save status
        </Button>
        {assignmentChanged && (
          <Button
            onClick={() =>
              void onAction({ action: "assign_lead", leadId: lead.id, agentUserId })
            }
          >
            Assign agent
          </Button>
        )}
        {ownershipChanged && (
          <Button
            onClick={() =>
              void onAction({
                action: "update_lead_ownership",
                leadId: lead.id,
                updates: { leadSource, assignedAgentId: agentUserId || undefined },
                reason: "Admin reviewed lead ownership and assignment.",
              })
            }
          >
            Save ownership
          </Button>
        )}
      </div>
    </article>
  );
}
