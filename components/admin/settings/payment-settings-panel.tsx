"use client";

import { CheckCircle2, Plus, Save, Trash2, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import type { ManualPaymentMethodConfig, PaymentGatewayConfig, PaymentHealth, PaymentSettings } from "@/lib/settings/types";

type PaymentSettingsResponse = {
  settings: PaymentSettings;
  health: PaymentHealth[];
  webhooks: Array<{ id: string; gateway: string; event: string; status: string; createdAt: string }>;
};

export function PaymentSettingsPanel() {
  const { showToast } = useApp();
  const [data, setData] = useState<PaymentSettingsResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const result = await apiFetch<PaymentSettingsResponse>("/api/v1/admin/settings?section=payments");
    if (result.error) setError(result.error.message);
    if (result.data) setData(result.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function updateGateway(index: number, patch: Partial<PaymentGatewayConfig>) {
    if (!data) return;
    const gateways = [...data.settings.gateways];
    gateways[index] = { ...gateways[index], ...patch };
    setData({ ...data, settings: { ...data.settings, gateways } });
  }

  function updateFees(key: keyof PaymentSettings["fees"], value: number) {
    if (!data) return;
    setData({ ...data, settings: { ...data.settings, fees: { ...data.settings.fees, [key]: value } } });
  }

  async function save() {
    if (!data) return;
    setSaving(true);
    const result = await apiFetch("/api/v1/admin/settings", {
      method: "PATCH",
      body: JSON.stringify({ section: "payments", settings: data.settings }),
    });
    setSaving(false);
    if (result.error) {
      showToast(result.error.message ?? "Could not save payment settings.", "error");
      return;
    }
    showToast("Payment settings saved.");
    void load();
  }

  function updateManualMethod(index: number, patch: Partial<ManualPaymentMethodConfig>) {
    if (!data) return;
    const manualMethods = [...data.settings.manualMethods];
    manualMethods[index] = { ...manualMethods[index], ...patch };
    setData({ ...data, settings: { ...data.settings, manualMethods } });
  }

  function addManualMethod() {
    if (!data) return;
    const id = `manual_${Date.now()}`;
    setData({
      ...data,
      settings: {
        ...data.settings,
        manualMethods: [
          ...data.settings.manualMethods,
          {
            id,
            label: "New manual method",
            type: "other",
            enabled: true,
            requiresProof: true,
            instructions: "Enter payment instructions and require customers to upload proof.",
          },
        ],
      },
    });
  }

  function removeManualMethod(index: number) {
    if (!data) return;
    setData({
      ...data,
      settings: {
        ...data.settings,
        manualMethods: data.settings.manualMethods.filter((_, i) => i !== index),
      },
    });
  }

  if (error) return <PaymentSettingsLoadError message={error} onRetry={() => void load()} />;
  if (!data) return <p className="text-slate-400">Loading payment settings...</p>;

  const s = data.settings;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/[0.08] bg-slate-950/70 p-3 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] sm:p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
            <label className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-slate-300">
              <input type="checkbox" checked={s.sandboxMode} onChange={(e) => setData({ ...data, settings: { ...s, sandboxMode: e.target.checked } })} />
              Sandbox mode
            </label>
            <label className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-slate-300">
              <input type="checkbox" checked={s.liveMode} onChange={(e) => setData({ ...data, settings: { ...s, liveMode: e.target.checked } })} />
              Live mode
            </label>
            <label className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-slate-300">
              <input type="checkbox" checked={s.autoRetryEnabled} onChange={(e) => setData({ ...data, settings: { ...s, autoRetryEnabled: e.target.checked } })} />
              Auto-retry
            </label>
            <label className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-slate-300">
              <input type="checkbox" checked={s.failedPaymentRecoveryEnabled} onChange={(e) => setData({ ...data, settings: { ...s, failedPaymentRecoveryEnabled: e.target.checked } })} />
              Failed payment recovery
            </label>
          </div>
          <Button className="w-full justify-center lg:w-auto" onClick={() => void save()} disabled={saving}>
            <Save className="size-4" /> {saving ? "Saving..." : "Save all"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Default gateway">
          <select value={s.defaultGateway} onChange={(e) => setData({ ...data, settings: { ...s, defaultGateway: e.target.value as PaymentSettings["defaultGateway"] } })} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">
            {s.gateways.map((g) => (
              <option key={g.id} value={g.id}>{g.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Currency">
          <input value={s.currency} onChange={(e) => setData({ ...data, settings: { ...s, currency: e.target.value } })} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
        </Field>
        <Field label="USD  ZWL rate">
          <input type="number" value={s.exchangeRateUsdToZwl} onChange={(e) => setData({ ...data, settings: { ...s, exchangeRateUsdToZwl: Number(e.target.value) } })} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
        </Field>
        <Field label="Trial period (days)">
          <input type="number" value={s.trialPeriodDays} onChange={(e) => setData({ ...data, settings: { ...s, trialPeriodDays: Number(e.target.value) } })} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
        </Field>
      </div>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase text-slate-400">Fees & commission</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(s.fees) as Array<keyof PaymentSettings["fees"]>).map((key) => (
            <Field key={key} label={key.replace(/([A-Z])/g, " $1")}>
              <input type="number" step="0.1" value={s.fees[key]} onChange={(e) => updateFees(key, Number(e.target.value))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
            </Field>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase text-slate-400">Payment gateways</h3>
        <div className="space-y-4">
          {s.gateways.map((gw, i) => (
            <div key={gw.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={gw.enabled} onChange={(e) => updateGateway(i, { enabled: e.target.checked })} />
                  <span className="font-semibold text-white">{gw.label}</span>
                  {data.health.find((h) => h.gateway === gw.id) && (
                    <HealthBadge health={data.health.find((h) => h.gateway === gw.id)!} />
                  )}
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-400">
                  <input type="checkbox" checked={gw.sandbox} onChange={(e) => updateGateway(i, { sandbox: e.target.checked })} />
                  Sandbox
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="API key">
                  <input value={gw.apiKey} onChange={(e) => updateGateway(i, { apiKey: e.target.value })} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" placeholder="pk_..." />
                </Field>
                <Field label="Secret key">
                  <input type="password" value={gw.secretKey} onChange={(e) => updateGateway(i, { secretKey: e.target.value })} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" placeholder="sk_..." />
                </Field>
                <Field label="Webhook URL">
                  <input value={gw.webhookUrl} onChange={(e) => updateGateway(i, { webhookUrl: e.target.value })} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
                </Field>
                <Field label="Callback URL">
                  <input value={gw.callbackUrl} onChange={(e) => updateGateway(i, { callbackUrl: e.target.value })} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
                </Field>
                <Field label="Success URL">
                  <input value={gw.successUrl} onChange={(e) => updateGateway(i, { successUrl: e.target.value })} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
                </Field>
                <Field label="Failed URL">
                  <input value={gw.failedUrl} onChange={(e) => updateGateway(i, { failedUrl: e.target.value })} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
                </Field>
                <Field label="Timeout (minutes)">
                  <input type="number" value={gw.timeoutMinutes} onChange={(e) => updateGateway(i, { timeoutMinutes: Number(e.target.value) })} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase text-slate-400">Bank details (manual transfers)</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(s.bankDetails).map(([key, value]) => (
            <Field key={key} label={key}>
              <input
                value={value}
                onChange={(e) => setData({ ...data, settings: { ...s, bankDetails: { ...s.bankDetails, [key]: e.target.value } } })}
                className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </Field>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase text-slate-400">Manual payment methods</h3>
          <Button variant="secondary" onClick={addManualMethod}>
            <Plus className="size-4" /> Add manual method
          </Button>
        </div>
        <div className="space-y-4">
          {s.manualMethods.map((method, i) => (
            <div key={method.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-white">
                  <input type="checkbox" checked={method.enabled} onChange={(e) => updateManualMethod(i, { enabled: e.target.checked })} />
                  {method.label}
                </label>
                <Button variant="secondary" onClick={() => removeManualMethod(i)}>
                  <Trash2 className="size-4" /> Remove
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Method ID">
                  <input value={method.id} onChange={(e) => updateManualMethod(i, { id: e.target.value })} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
                </Field>
                <Field label="Label">
                  <input value={method.label} onChange={(e) => updateManualMethod(i, { label: e.target.value })} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
                </Field>
                <Field label="Type">
                  <select value={method.type} onChange={(e) => updateManualMethod(i, { type: e.target.value as ManualPaymentMethodConfig["type"] })} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">
                    <option value="bank">Bank</option>
                    <option value="mobile_money">Mobile money</option>
                    <option value="cash">Cash</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-300">
                  <input type="checkbox" checked={method.requiresProof} onChange={(e) => updateManualMethod(i, { requiresProof: e.target.checked })} />
                  Require proof upload
                </label>
                <Field label="Account name">
                  <input value={method.accountName ?? ""} onChange={(e) => updateManualMethod(i, { accountName: e.target.value })} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
                </Field>
                <Field label="Account / phone number">
                  <input value={method.accountNumber ?? method.phoneNumber ?? ""} onChange={(e) => updateManualMethod(i, method.type === "mobile_money" ? { phoneNumber: e.target.value } : { accountNumber: e.target.value })} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
                </Field>
                <Field label="Bank name">
                  <input value={method.bankName ?? ""} onChange={(e) => updateManualMethod(i, { bankName: e.target.value })} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
                </Field>
                <Field label="Branch">
                  <input value={method.branch ?? ""} onChange={(e) => updateManualMethod(i, { branch: e.target.value })} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
                </Field>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-xs text-slate-500">Customer instructions</span>
                  <textarea value={method.instructions} onChange={(e) => updateManualMethod(i, { instructions: e.target.value })} rows={3} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      {data.webhooks.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase text-slate-400">Recent webhooks</h3>
          <div className="space-y-2">
            {data.webhooks.map((w) => (
              <div key={w.id} className="flex justify-between rounded-lg bg-slate-950/50 px-3 py-2 text-sm">
                <span className="text-slate-300">{w.gateway} - {w.event}</span>
                <span className={w.status === "SUCCESS" ? "text-emerald-400" : "text-amber-400"}>{w.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PaymentSettingsLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
      <p>{message}</p>
      <Button variant="secondary" className="mt-3" onClick={onRetry}>Retry</Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function HealthBadge({ health }: { health: PaymentHealth }) {
  const colors = { healthy: "text-emerald-400", degraded: "text-amber-400", down: "text-red-400" };
  return (
    <span className={`flex items-center gap-1 text-xs ${colors[health.status]}`}>
      {health.status === "healthy" ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
      {health.successRate}% success
    </span>
  );
}
