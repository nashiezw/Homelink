"use client";

import { CheckCircle2, Download, ExternalLink, Landmark, Plus, RefreshCw, Scale, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AdminKpiCard } from "@/components/admin/kpi-card";
import { AdminPanel, AdminStatusBadge, AdminTabStrip } from "@/components/admin/ui/admin-ui";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { AdminActionFeedback } from "@/components/admin/action-feedback";
import { AdminActionDialog, type AdminDialogConfig } from "@/components/admin/action-dialog";
import { PLAN_DEFINITIONS } from "@/lib/payments/plans";
import type { Chargeback, EscrowHold } from "@/lib/admin/enterprise-types";
import type { Payment } from "@/lib/store/types";
import type { PaymentHealth, PaymentSettings } from "@/lib/settings/types";

type PaymentsResponse = {
  payments: Payment[];
  escrowHolds: EscrowHold[];
  chargebacks: Chargeback[];
  taxSummary: {
    platformCommissionPercent: number;
    taxPercent: number;
    heldInEscrow: number;
    openChargebacks: number;
  };
  summary: Record<string, number>;
  settings: PaymentSettings;
  health: PaymentHealth[];
};

export function PaymentsAdminHub() {
  const { showToast } = useApp();
  const [data, setData] = useState<PaymentsResponse | null>(null);
  const [subTab, setSubTab] = useState<"ledger" | "escrow" | "chargebacks" | "tax">("ledger");
  const [filter, setFilter] = useState<"all" | "manual" | "pending">("all");
  const [selected, setSelected] = useState<Payment | null>(null);
  const [note, setNote] = useState("");
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({
    userId: "",
    plan: "landlord_pro",
    amount: 49,
    method: "bank_transfer",
    referenceNumber: "",
    proofUrl: "",
    autoApprove: false,
  });
  const [userOptions, setUserOptions] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [feedback, setFeedback] = useState<{
    title: string;
    message: string;
    tone?: "success" | "warning" | "danger" | "info";
    details?: Array<{ label: string; value: string | number | undefined }>;
  } | null>(null);
  const [dialog, setDialog] = useState<AdminDialogConfig | null>(null);

  const load = useCallback(async () => {
    const params = filter === "manual" ? "?manual=true" : filter === "pending" ? "?status=MANUAL_REVIEW" : "";
    const result = await apiFetch<PaymentsResponse>(`/api/v1/admin/payments${params}`);
    if (result.data) setData(result.data);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void apiFetch<{ users: Array<{ id: string; name: string; email: string }> }>("/api/v1/admin/users").then((r) => {
      if (r.data?.users) setUserOptions(r.data.users);
    });
  }, []);

  async function paymentAction(action: string, extra?: Record<string, unknown>) {
    if (!selected) return;
    if (["approve", "reject", "refund"].includes(action)) {
      setDialog({
        title: `Payment ${action.replace(/_/g, " ")}`,
        message: `Confirm payment ${action.replace(/_/g, " ")} for $${selected.amount}. This will update the ledger.`,
        tone: action === "approve" ? "success" : "warning",
        confirmLabel: "Confirm",
        fields: action === "approve" ? [] : [{ name: "reason", label: `${action === "reject" ? "Rejection" : "Refund"} reason`, type: "textarea", required: true }],
        onConfirm: (values) => applyPaymentAction(action, { ...extra, reason: values.reason || extra?.reason }),
      });
      return;
    }
    await applyPaymentAction(action, extra);
  }

  async function applyPaymentAction(action: string, extra?: Record<string, unknown>) {
    if (!selected) return;
    const result = await apiFetch(`/api/v1/admin/payments/${selected.id}`, {
      method: "PATCH",
      body: JSON.stringify({ action, ...extra }),
    });
    if (result.error) {
      showToast(result.error.message ?? "Payment action failed.", "error");
      return;
    }
    showToast(`Payment ${action.replace(/_/g, " ")} completed.`);
    setFeedback({
      title: "Payment action completed",
      message: `Payment ${action.replace(/_/g, " ")} was applied successfully.`,
      tone: action === "reject" || action === "refund" ? "warning" : "success",
      details: [
        { label: "Payment", value: selected.id },
        { label: "User", value: selected.userName },
        { label: "Amount", value: `$${selected.amount}` },
        { label: "Action", value: action.replace(/_/g, " ") },
      ],
    });
    setNote("");
    setSelected(null);
    void load();
  }

  async function enterpriseAction(action: string, id: string, status: string) {
    setDialog({
      title: "Update finance record",
      message: `Confirm ${status.toLowerCase()} for this finance record. The status will update immediately.`,
      tone: status === "DISPUTED" || status === "LOST" || status === "ACCEPTED" ? "warning" : "success",
      confirmLabel: "Update",
      onConfirm: () => applyEnterpriseAction(action, id, status),
    });
  }

  async function applyEnterpriseAction(action: string, id: string, status: string) {
    const result = await apiFetch("/api/v1/admin/payments", {
      method: "PATCH",
      body: JSON.stringify({ action, id, status }),
    });
    if (result.error) {
      showToast(result.error.message ?? "Update failed.", "error");
      return;
    }
    showToast("Updated.");
    setFeedback({
      title: "Finance workflow updated",
      message: `${action.replace(/_/g, " ")} was updated to ${status}.`,
      tone: status === "DISPUTED" || status === "LOST" || status === "ACCEPTED" ? "warning" : "success",
      details: [
        { label: "Record", value: id },
        { label: "Status", value: status },
      ],
    });
    void load();
  }

  async function recordManual() {
    if (!manualForm.userId) {
      showToast("Select a user for this payment.", "error");
      return;
    }
    const result = await apiFetch("/api/v1/admin/payments", {
      method: "POST",
      body: JSON.stringify(manualForm),
    });
    if (result.error) {
      showToast(result.error.message ?? "Could not record payment.", "error");
      return;
    }
    showToast("Manual payment recorded.");
    setFeedback({
      title: "Manual payment recorded",
      message: "The offline payment has been added to the ledger.",
      tone: manualForm.autoApprove ? "success" : "info",
      details: [
        { label: "User", value: userOptions.find((u) => u.id === manualForm.userId)?.name ?? manualForm.userId },
        { label: "Plan", value: manualForm.plan },
        { label: "Amount", value: `$${manualForm.amount}` },
        { label: "Auto approve", value: manualForm.autoApprove ? "Yes" : "No" },
      ],
    });
    setShowManualForm(false);
    void load();
  }

  function downloadReceipt(payment: Payment) {
    const html = buildPaymentReceiptHtml(payment);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `homelink-receipt-${payment.receiptNumber ?? payment.id}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!data) return <p className="text-slate-400">Loading payments...</p>;
  const manualMethods = data.settings.manualMethods.filter((method) => method.enabled);

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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard label="Revenue (paid)" value={`$${data.summary.revenue}`} icon={Landmark} tone="success" />
        <AdminKpiCard label="In escrow" value={`$${data.taxSummary.heldInEscrow}`} icon={ShieldAlert} tone="warning" />
        <AdminKpiCard label="Open chargebacks" value={data.taxSummary.openChargebacks} icon={Scale} tone="danger" />
        <AdminKpiCard label="Tax rate" value={`${data.taxSummary.taxPercent}%`} icon={Landmark} />
      </div>

      <AdminTabStrip
        active={subTab}
        onChange={(id) => setSubTab(id as typeof subTab)}
        tabs={[
          { id: "ledger", label: "Ledger", count: data.payments.length },
          { id: "escrow", label: "Escrow", count: data.escrowHolds.length },
          { id: "chargebacks", label: "Chargebacks", count: data.chargebacks.length },
          { id: "tax", label: "Tax & fees" },
        ]}
      />

      {subTab === "ledger" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {(["all", "manual", "pending"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded-lg px-3 py-1.5 text-sm capitalize ${filter === f ? "bg-emerald-600 text-white" : "bg-white/10 text-slate-300"}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => void load()}><RefreshCw className="size-4" /></Button>
              <Button onClick={() => setShowManualForm(!showManualForm)}><Plus className="size-4" /> Record manual</Button>
            </div>
          </div>

          {showManualForm && (
            <AdminPanel title="Record offline payment">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <select value={manualForm.userId} onChange={(e) => setManualForm({ ...manualForm, userId: e.target.value })} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">
                  <option value="">Select user...</option>
                  {userOptions.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <select value={manualForm.plan} onChange={(e) => setManualForm({ ...manualForm, plan: e.target.value })} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">
                  {PLAN_DEFINITIONS.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <input type="number" value={manualForm.amount} onChange={(e) => setManualForm({ ...manualForm, amount: Number(e.target.value) })} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
                <select value={manualForm.method} onChange={(e) => setManualForm({ ...manualForm, method: e.target.value })} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">
                  {manualMethods.map((method) => (
                    <option key={method.id} value={method.id}>{method.label}</option>
                  ))}
                </select>
                {manualMethods.find((method) => method.id === manualForm.method)?.instructions && (
                  <p className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100 lg:col-span-3">
                    {manualMethods.find((method) => method.id === manualForm.method)?.instructions}
                  </p>
                )}
                <input value={manualForm.referenceNumber} onChange={(e) => setManualForm({ ...manualForm, referenceNumber: e.target.value })} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" placeholder="Transaction/reference number" />
                <input value={manualForm.proofUrl} onChange={(e) => setManualForm({ ...manualForm, proofUrl: e.target.value })} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" placeholder="Proof URL or uploaded receipt path" />
                <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-300">
                  <input type="checkbox" checked={manualForm.autoApprove} onChange={(e) => setManualForm({ ...manualForm, autoApprove: e.target.checked })} />
                  Approve immediately
                </label>
              </div>
              <Button className="mt-3" onClick={() => void recordManual()}>Record payment</Button>
            </AdminPanel>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <AdminPanel title="Payment ledger" className="lg:col-span-2">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-white/10 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Payment</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payments.map((p) => (
                      <tr key={p.id} onClick={() => setSelected(p)} className={`cursor-pointer border-b border-white/5 hover:bg-white/5 ${selected?.id === p.id ? "bg-emerald-500/10" : ""}`}>
                        <td className="px-3 py-2"><p className="text-white">{p.plan}</p><p className="text-xs text-slate-500">{p.userName}</p></td>
                        <td className="px-3 py-2 text-emerald-400">${p.amount}</td>
                        <td className="px-3 py-2"><StatusPill status={p.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AdminPanel>
            <AdminPanel title="Payment actions">
              {!selected ? (
                <p className="text-sm text-slate-500">Select a payment.</p>
              ) : (
                <div className="space-y-3 text-sm">
                  <p className="text-2xl font-bold text-emerald-400">${selected.amount}</p>
                  <StatusPill status={selected.status} />
                  <div className="rounded-lg border border-white/10 bg-slate-950/50 p-3 text-xs text-slate-400">
                    <p>Method: <span className="text-slate-200">{selected.method.replace(/_/g, " ")}</span></p>
                    <p>Reference: <span className="text-slate-200">{selected.referenceNumber ?? "Not supplied"}</span></p>
                    <p>Proof: <span className="text-slate-200">{selected.proofStatus ?? "Not required"}</span></p>
                    {selected.proofUrl && (
                      <a href={selected.proofUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-cyan-300 hover:underline">
                        <ExternalLink className="size-3" /> Open proof
                      </a>
                    )}
                  </div>
                  {["MANUAL_REVIEW", "AWAITING_PROOF", "PENDING"].includes(selected.status) && (
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => void paymentAction("approve")}><CheckCircle2 className="size-4" /> Approve</Button>
                      <Button variant="secondary" onClick={() => void paymentAction("reject")}>Reject</Button>
                      <Button variant="secondary" onClick={() => void paymentAction("request_proof")}>Request proof</Button>
                    </div>
                  )}
                  {selected.status === "PAID" && (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => downloadReceipt(selected)}><Download className="size-4" /> Receipt</Button>
                      <Button variant="secondary" onClick={() => void paymentAction("refund")}>Refund</Button>
                    </div>
                  )}
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white" placeholder="Finance note..." />
                  <Button variant="secondary" onClick={() => void paymentAction("add_note", { note })} disabled={!note.trim()}>Add note</Button>
                </div>
              )}
            </AdminPanel>
          </div>
        </>
      )}

      {subTab === "escrow" && (
        <AdminPanel title="Escrow management" description="Held funds pending release or dispute resolution">
          <div className="space-y-3">
            {data.escrowHolds.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-slate-950/50 p-4">
                <div>
                  <p className="font-medium text-white">${e.amount} — {e.userName}</p>
                  <p className="text-xs text-slate-500">{e.listingTitle ?? "General hold"} · {e.holdReason}</p>
                </div>
                <div className="flex items-center gap-2">
                  <AdminStatusBadge status={e.status} variant={e.status === "HELD" ? "warning" : e.status === "DISPUTED" ? "danger" : "success"} />
                  {e.status === "HELD" && (
                    <>
                      <Button variant="secondary" onClick={() => void enterpriseAction("update_escrow", e.id, "RELEASED")}>Release</Button>
                      <Button variant="secondary" onClick={() => void enterpriseAction("update_escrow", e.id, "DISPUTED")}>Dispute</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>
      )}

      {subTab === "chargebacks" && (
        <AdminPanel title="Chargeback workflow" description="Gateway disputes and resolution">
          <div className="space-y-3">
            {data.chargebacks.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-slate-950/50 p-4">
                <div>
                  <p className="font-medium text-white">${c.amount} — {c.userName}</p>
                  <p className="text-xs text-slate-500">{c.reason} · Due {new Date(c.dueDate).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <AdminStatusBadge status={c.status} variant={c.status === "UNDER_REVIEW" ? "warning" : "default"} />
                  {["OPEN", "UNDER_REVIEW"].includes(c.status) && (
                    <>
                      <Button variant="secondary" onClick={() => void enterpriseAction("update_chargeback", c.id, "WON")}>Won</Button>
                      <Button variant="secondary" onClick={() => void enterpriseAction("update_chargeback", c.id, "LOST")}>Lost</Button>
                      <Button variant="secondary" onClick={() => void enterpriseAction("update_chargeback", c.id, "ACCEPTED")}>Accept</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>
      )}

      {subTab === "tax" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <AdminPanel title="Tax & commission configuration">
            <div className="space-y-2 text-sm">
              <p className="text-slate-400">Platform commission: <span className="font-bold text-white">{data.taxSummary.platformCommissionPercent}%</span></p>
              <p className="text-slate-400">Tax (VAT): <span className="font-bold text-white">{data.taxSummary.taxPercent}%</span></p>
              <p className="text-slate-400">Service fee: <span className="font-bold text-white">{data.settings.fees.serviceFeePercent}%</span></p>
              <p className="mt-4 text-xs text-slate-500">Adjust rates in Payment gateway settings panel below the ledger.</p>
            </div>
          </AdminPanel>
          <AdminPanel title="Gateway health">
            <div className="grid gap-2 sm:grid-cols-2">
              {data.health.map((h) => (
                <div key={h.gateway} className="rounded-lg bg-slate-950/50 p-3 text-sm">
                  <p className="font-medium capitalize text-white">{h.gateway}</p>
                  <p className={h.status === "healthy" ? "text-emerald-400" : "text-amber-400"}>{h.status}</p>
                  <p className="text-xs text-slate-500">{h.successRate}% success</p>
                </div>
              ))}
            </div>
          </AdminPanel>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PAID: "bg-emerald-500/20 text-emerald-300",
    PENDING: "bg-amber-500/20 text-amber-300",
    MANUAL_REVIEW: "bg-cyan-500/20 text-cyan-300",
    FAILED: "bg-red-500/20 text-red-300",
    REFUNDED: "bg-slate-500/20 text-slate-300",
  };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${colors[status] ?? "bg-white/10 text-slate-300"}`}>{status}</span>;
}

function buildPaymentReceiptHtml(payment: Payment) {
  const receiptNumber = payment.receiptNumber ?? payment.id;
  const issuedAt = new Date(payment.completedAt ?? payment.updatedAt ?? payment.createdAt).toLocaleString();
  const planName = PLAN_DEFINITIONS.find((plan) => plan.id === payment.plan)?.name ?? payment.plan;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>HomeLink Receipt ${escapeHtml(receiptNumber)}</title>
  <style>
    body { margin: 0; background: #eef7f3; color: #0f172a; font-family: Inter, Arial, sans-serif; }
    .page { max-width: 760px; margin: 36px auto; background: white; border: 1px solid #cde7dd; border-radius: 24px; overflow: hidden; box-shadow: 0 24px 70px rgba(15, 23, 42, 0.16); }
    .hero { background: linear-gradient(135deg, #053d35, #047857); color: white; padding: 34px 42px; display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; }
    .brand { display: flex; align-items: center; gap: 14px; }
    .mark { width: 52px; height: 52px; border-radius: 16px; background: #10b981; display: grid; place-items: center; font-weight: 900; font-size: 24px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.35); }
    .brand h1 { margin: 0; font-size: 26px; letter-spacing: -0.02em; }
    .brand p, .hero-meta { margin: 4px 0 0; color: #c7f7e5; font-size: 13px; }
    .hero-meta { text-align: right; line-height: 1.6; }
    .content { padding: 34px 42px 40px; }
    .status { display: inline-flex; border-radius: 999px; background: #dcfce7; color: #166534; padding: 8px 14px; font-weight: 800; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; }
    .amount { margin: 18px 0 6px; font-size: 44px; line-height: 1; letter-spacing: -0.04em; color: #064e3b; }
    .subtle { color: #64748b; }
    .grid { margin-top: 28px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .field { border: 1px solid #dbe7e2; border-radius: 16px; padding: 16px; background: #fbfefc; }
    .label { color: #64748b; font-size: 11px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
    .value { margin-top: 7px; font-weight: 750; overflow-wrap: anywhere; }
    .footer { border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 18px; color: #64748b; font-size: 12px; line-height: 1.7; }
    @media print { body { background: white; } .page { box-shadow: none; margin: 0; border-radius: 0; } }
  </style>
</head>
<body>
  <main class="page">
    <section class="hero">
      <div class="brand">
        <div class="mark">HL</div>
        <div>
          <h1>HomeLink Zimbabwe</h1>
          <p>Verified property marketplace</p>
        </div>
      </div>
      <div class="hero-meta">
        <strong>Official Receipt</strong><br />
        ${escapeHtml(receiptNumber)}<br />
        ${escapeHtml(issuedAt)}
      </div>
    </section>
    <section class="content">
      <span class="status">${escapeHtml(payment.status)}</span>
      <h2 class="amount">$${Number(payment.amount).toLocaleString()}</h2>
      <p class="subtle">Payment received from ${escapeHtml(payment.userName ?? payment.userId)} for ${escapeHtml(planName)}.</p>
      <div class="grid">
        ${receiptField("Receipt number", receiptNumber)}
        ${receiptField("Payment ID", payment.id)}
        ${receiptField("Customer", payment.userName ?? payment.userId)}
        ${receiptField("Plan", planName)}
        ${receiptField("Method", payment.method.replace(/_/g, " "))}
        ${receiptField("Reference", payment.referenceNumber ?? "Not supplied")}
        ${receiptField("Proof status", payment.proofStatus ?? "Not required")}
        ${receiptField("Currency", payment.currency ?? "USD")}
      </div>
      <p class="footer">
        This receipt was generated by HomeLink Zimbabwe. Keep it for your records. For questions, contact HomeLink support and quote the receipt number above.
      </p>
    </section>
  </main>
</body>
</html>`;
}

function receiptField(label: string, value: string) {
  return `<div class="field"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div></div>`;
}

function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
