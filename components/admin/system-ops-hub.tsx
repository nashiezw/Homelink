"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Brain, ExternalLink, Save, Shield } from "lucide-react";
import Link from "next/link";
import { AuditLogExplorer } from "@/components/admin/audit-log-explorer";
import { MetricRow } from "@/components/admin/charts";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import type { PlatformSettings } from "@/lib/settings/types";
import type { SystemHealth } from "@/lib/admin/types";

type SecuritySnapshot = {
  activeSessions: number;
  blockedUsers: number;
  suspendedUsers: number;
  failedSecurityEvents: number;
  adminAccounts: number;
  twoFactorCoverage: string;
  webhookFailures: number;
};

type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  target: string;
  createdAt: string;
};

type OpsData = {
  system?: SystemHealth;
  security?: SecuritySnapshot;
  audit?: AuditEntry[];
};

export function SystemOpsHub({ mode }: { mode: "system" | "ai" | "security" }) {
  const { showToast } = useApp();
  const [data, setData] = useState<OpsData>({});
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const section = mode === "security" ? "security" : mode === "ai" ? "all" : "system";
    const result = await apiFetch<OpsData>(`/api/v1/admin/control-center?section=${section}`);
    if (result.error) setError(result.error.message);
    if (result.data) setData(result.data);
    if (mode === "ai" || mode === "security") {
      const platform = await apiFetch<{ settings: PlatformSettings }>("/api/v1/admin/settings");
      if (platform.error) setError(platform.error.message);
      if (platform.data) setSettings(platform.data.settings);
    }
  }, [mode]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveAiOrSecurity(patch: Partial<PlatformSettings>) {
    if (!settings) return;
    setSaving(true);
    const merged = { ...settings, ...patch };
    const result = await apiFetch("/api/v1/admin/settings", {
      method: "PATCH",
      body: JSON.stringify({ settings: merged }),
    });
    setSaving(false);
    if (result.error) {
      showToast(result.error.message ?? "Could not update settings.", "error");
      return;
    }
    showToast("Settings updated.");
    void load();
  }

  if (mode === "system" && data.system) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
            <Activity className="size-4" />
            Service status
          </h3>
          {Object.entries(data.system)
            .filter(([k]) => !["cpu", "memory", "storage", "queueDepth"].includes(k))
            .map(([service, status]) => (
              <MetricRow key={service} label={formatLabel(service)} value={String(status)} />
            ))}
        </section>
        <section className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Infrastructure</h3>
          <MetricRow label="CPU load" value={`${data.system.cpu}%`} />
          <MetricRow label="Memory" value={`${data.system.memory}%`} />
          <MetricRow label="Storage" value={`${data.system.storage}%`} />
          <MetricRow label="Queue depth" value={data.system.queueDepth} />
        </section>
      </div>
    );
  }

  if (mode === "ai" && settings) {
    return (
      <div className="space-y-6">
        <section className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
              <Brain className="size-4" />
              AI controls
            </h3>
            <Link href="/dashboard/admin/settings" className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:underline">
              Platform settings <ExternalLink className="size-3" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle label="AI search" checked={settings.ai.searchEnabled} onChange={(v) => setSettings({ ...settings, ai: { ...settings.ai, searchEnabled: v } })} />
            <Toggle label="Fraud detection" checked={settings.ai.fraudDetectionEnabled} onChange={(v) => setSettings({ ...settings, ai: { ...settings.ai, fraudDetectionEnabled: v } })} />
            <Toggle label="Roommate matching" checked={settings.ai.roommateMatchingEnabled} onChange={(v) => setSettings({ ...settings, ai: { ...settings.ai, roommateMatchingEnabled: v } })} />
            <Toggle label="Duplicate detection" checked={settings.ai.duplicateDetectionEnabled} onChange={(v) => setSettings({ ...settings, ai: { ...settings.ai, duplicateDetectionEnabled: v } })} />
            <Input label="Model" value={settings.ai.modelName} onChange={(v) => setSettings({ ...settings, ai: { ...settings.ai, modelName: v } })} />
            <Input label="Max tokens" type="number" value={String(settings.ai.maxTokens)} onChange={(v) => setSettings({ ...settings, ai: { ...settings.ai, maxTokens: Number(v) } })} />
          </div>
          <p className="mb-2 mt-4 text-xs font-semibold uppercase text-slate-500">Feature flags</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(settings.featureFlags).map(([key, enabled]) => (
              <Toggle
                key={key}
                label={key}
                checked={enabled}
                onChange={(v) => setSettings({ ...settings, featureFlags: { ...settings.featureFlags, [key]: v } })}
              />
            ))}
          </div>
          <Button className="mt-4 w-full justify-center sm:w-auto" onClick={() => void saveAiOrSecurity({ ai: settings.ai, featureFlags: settings.featureFlags })} disabled={saving}>
            <Save className="size-4" /> {saving ? "Saving..." : "Save AI settings"}
          </Button>
        </section>
      </div>
    );
  }

  if (mode === "security" && data.security && settings) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
                <Shield className="size-4" />
                Security policies
              </h3>
              <Link href="/dashboard/admin/settings" className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:underline">
                Platform settings <ExternalLink className="size-3" />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Min password length" type="number" value={String(settings.minPasswordLength)} onChange={(v) => setSettings({ ...settings, minPasswordLength: Number(v) })} />
              <Input label="Session timeout (min)" type="number" value={String(settings.sessionTimeoutMinutes)} onChange={(v) => setSettings({ ...settings, sessionTimeoutMinutes: Number(v) })} />
              <Input label="Max upload (MB)" type="number" value={String(settings.maxUploadMb)} onChange={(v) => setSettings({ ...settings, maxUploadMb: Number(v) })} />
              <Input label="Rate limit / minute" type="number" value={String(settings.rateLimitPerMinute)} onChange={(v) => setSettings({ ...settings, rateLimitPerMinute: Number(v) })} />
              <Toggle label="Email verification required" checked={settings.emailVerificationRequired} onChange={(v) => setSettings({ ...settings, emailVerificationRequired: v })} />
              <Toggle label="Phone verification required" checked={settings.phoneVerificationRequired} onChange={(v) => setSettings({ ...settings, phoneVerificationRequired: v })} />
            </div>
            <Button
              className="mt-4 w-full justify-center sm:w-auto"
              onClick={() =>
                void saveAiOrSecurity({
                  minPasswordLength: settings.minPasswordLength,
                  sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
                  maxUploadMb: settings.maxUploadMb,
                  rateLimitPerMinute: settings.rateLimitPerMinute,
                  emailVerificationRequired: settings.emailVerificationRequired,
                  phoneVerificationRequired: settings.phoneVerificationRequired,
                })
              }
              disabled={saving}
            >
              <Save className="size-4" /> {saving ? "Saving..." : "Save security policies"}
            </Button>
          </section>
          <section className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Security snapshot</h3>
            <MetricRow label="Active sessions" value={data.security.activeSessions} />
            <MetricRow label="Blocked users" value={data.security.blockedUsers} />
            <MetricRow label="Suspended users" value={data.security.suspendedUsers} />
            <MetricRow label="Security events (audit)" value={data.security.failedSecurityEvents} />
            <MetricRow label="Admin accounts" value={data.security.adminAccounts} />
            <MetricRow label="Verified admin coverage" value={data.security.twoFactorCoverage} />
            <MetricRow label="Webhook failures" value={data.security.webhookFailures} />
          </section>
        </div>
        <AuditLogExplorer />
      </div>
    );
  }

  if (error) return <LoadError message={error} onRetry={() => void load()} />;
  return <p className="text-slate-400">Loading operations data...</p>;
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
      <p>{message}</p>
      <Button variant="secondary" className="mt-3" onClick={onRetry}>Retry</Button>
    </div>
  );
}

function formatLabel(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label>
      <span className="mb-1 block text-xs text-slate-500">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-300">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
