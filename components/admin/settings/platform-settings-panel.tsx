"use client";

import { ExternalLink, Plus, Save, TestTube2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import { syncGeoToFlatLists } from "@/lib/settings/geo";
import type { CareerRole, GeoCity, GeoProvince, PlatformSettings } from "@/lib/settings/types";

type SettingsTab = "general" | "contact" | "careers" | "locations" | "integrations" | "notifications" | "legal" | "rbac" | "features" | "security";

type AdminUser = { id: string; name: string; email: string };
type AdminMe = { permissions: string[]; roles: string[] };

export function PlatformSettingsPanel({ defaultTab = "general" }: { defaultTab?: SettingsTab }) {
  const { showToast } = useApp();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [eligibleUsers, setEligibleUsers] = useState<AdminUser[]>([]);
  const [me, setMe] = useState<AdminMe | null>(null);
  const [tab, setTab] = useState<SettingsTab>(defaultTab);
  const [saving, setSaving] = useState(false);
  const [testingIntegration, setTestingIntegration] = useState<"smtp" | "maps" | "cloudinary" | null>(null);
  const [integrationTestResult, setIntegrationTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [smtpTestEmail, setSmtpTestEmail] = useState("");
  const [promotingAdmin, setPromotingAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const [platform, rbac, currentAdmin] = await Promise.all([
      apiFetch<{ settings: PlatformSettings }>("/api/v1/admin/settings"),
      apiFetch<{ admins: AdminUser[]; eligibleUsers: AdminUser[] }>("/api/v1/admin/settings?section=rbac"),
      apiFetch<AdminMe>("/api/v1/admin/me"),
    ]);
    const firstError = platform.error ?? rbac.error ?? currentAdmin.error;
    if (firstError) setError(firstError.message);
    if (platform.data) setSettings(platform.data.settings);
    if (rbac.data) setAdmins(rbac.data.admins);
    if (rbac.data) setEligibleUsers(rbac.data.eligibleUsers);
    if (currentAdmin.data) setMe(currentAdmin.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    const synced = syncGeoToFlatLists(settings);
    const result = await apiFetch<{ settings: PlatformSettings }>("/api/v1/admin/settings", {
      method: "PATCH",
      body: JSON.stringify({ settings: synced }),
    });
    setSaving(false);
    if (result.error) {
      showToast(result.error.message, "error");
      return;
    }
    setSettings(result.data?.settings ? mergeSavedSettingsForForm(result.data.settings, synced) : synced);
    showToast("Platform settings saved.");
  }

  async function promoteAdmin(userId: string, makeSuperAdmin: boolean) {
    if (!settings) return;
    setPromotingAdmin(true);
    const userResult = await apiFetch(`/api/v1/admin/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "assign_role", role: "ADMIN" }),
    });
    if (userResult.error) {
      setPromotingAdmin(false);
      showToast(userResult.error.message, "error");
      return;
    }

    const nextRoleKeys = makeSuperAdmin ? ["super_admin"] : ["viewer"];
    const nextSettings = syncGeoToFlatLists({
      ...settings,
      rbac: {
        ...settings.rbac,
        userRoleKeys: {
          ...settings.rbac.userRoleKeys,
          [userId]: nextRoleKeys,
        },
      },
    });
    const settingsResult = await apiFetch("/api/v1/admin/settings", {
      method: "PATCH",
      body: JSON.stringify({ settings: nextSettings }),
    });
    setPromotingAdmin(false);
    if (settingsResult.error) {
      showToast(settingsResult.error.message, "error");
      return;
    }
    showToast(makeSuperAdmin ? "Super admin added." : "Admin added with viewer access.");
    void load();
  }

  async function testIntegration(type: "smtp" | "maps" | "cloudinary") {
    if (!settings) return;
    setTestingIntegration(type);
    setIntegrationTestResult(null);
    try {
      const result = await apiFetch<{ ok: boolean; message: string; sample?: string }>("/api/v1/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          settings: syncGeoToFlatLists(settings),
          test: { type, email: type === "smtp" ? smtpTestEmail.trim() || undefined : undefined },
        }),
      });
      const message = result.data?.sample
        ? `${result.data.message} (${result.data.sample})`
        : result.data?.message ?? result.error?.message ?? "Test complete.";
      const ok = result.data?.ok ?? false;
      setIntegrationTestResult({ ok, message });
      showToast(message, ok ? "success" : "error");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Integration test failed.";
      setIntegrationTestResult({ ok: false, message });
      showToast(message, "error");
    } finally {
      setTestingIntegration(null);
    }
  }

  if (error) return <SettingsLoadError message={error} onRetry={() => void load()} />;
  if (!settings) return <p className="text-slate-400">Loading platform settings...</p>;

  const tabs: Array<{ id: SettingsTab; label: string }> = [
    { id: "general", label: "General" },
    { id: "contact", label: "Contact" },
    { id: "careers", label: "Careers" },
    { id: "locations", label: "Locations" },
    { id: "integrations", label: "Integrations" },
    { id: "notifications", label: "Notifications" },
    { id: "legal", label: "Legal" },
    { id: "rbac", label: "Access" },
    { id: "features", label: "Features" },
    { id: "security", label: "Security" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Related controls</p>
          <p className="mt-1 text-sm text-slate-400">
            AI toggles and security policies are managed in dedicated ops hubs to avoid duplication.
          </p>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <Link href="/dashboard/admin?tab=ai" rel="nofollow" className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15">
            AI Control <ExternalLink className="size-3.5" />
          </Link>
          <Link href="/dashboard/admin?tab=security" rel="nofollow" className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15">
            Security & Audit <ExternalLink className="size-3.5" />
          </Link>
          <Link href="/dashboard/admin?tab=payments" rel="nofollow" className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15">
            Payments <ExternalLink className="size-3.5" />
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-slate-950/70 p-2 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 gap-1 overflow-x-auto rounded-xl bg-black/20 p-1 [scrollbar-width:none]">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  tab === t.id
                    ? "bg-cyan-500 text-white shadow-sm shadow-cyan-950/40"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Button className="w-full shrink-0 justify-center sm:w-auto" onClick={() => void save()} disabled={saving}>
            <Save className="size-4" /> {saving ? "Saving..." : "Save settings"}
          </Button>
        </div>
      </div>

      {tab === "general" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Platform name" value={settings.platformName} onChange={(v) => setSettings({ ...settings, platformName: v })} />
          <Input label="Logo URL" value={settings.logoUrl} onChange={(v) => setSettings({ ...settings, logoUrl: v })} />
          <Input label="Primary colour" value={settings.primaryColor} onChange={(v) => setSettings({ ...settings, primaryColor: v })} />
          <Input label="Secondary colour" value={settings.secondaryColor} onChange={(v) => setSettings({ ...settings, secondaryColor: v })} />
          <Input label="Default language" value={settings.defaultLanguage} onChange={(v) => setSettings({ ...settings, defaultLanguage: v })} />
          <Input label="Timezone" value={settings.timezone} onChange={(v) => setSettings({ ...settings, timezone: v })} />
          <Toggle label="Maintenance mode" checked={settings.maintenanceMode} onChange={(v) => setSettings({ ...settings, maintenanceMode: v })} />
          <Toggle label="Registration open" checked={settings.registrationOpen} onChange={(v) => setSettings({ ...settings, registrationOpen: v })} />
          <Toggle label="Dark mode enabled" checked={settings.darkModeEnabled} onChange={(v) => setSettings({ ...settings, darkModeEnabled: v })} />
          <Input label="Maintenance message" value={settings.maintenanceMessage} onChange={(v) => setSettings({ ...settings, maintenanceMessage: v })} className="sm:col-span-2" />
          <TextArea label="SEO title" value={settings.seo.title} onChange={(v) => setSettings({ ...settings, seo: { ...settings.seo, title: v } })} className="sm:col-span-2" />
          <TextArea label="SEO description" value={settings.seo.description} onChange={(v) => setSettings({ ...settings, seo: { ...settings.seo, description: v } })} className="sm:col-span-2" />
          <TextArea label="SEO keywords" value={settings.seo.keywords} onChange={(v) => setSettings({ ...settings, seo: { ...settings.seo, keywords: v } })} className="sm:col-span-2" />
        </div>
      )}

      {tab === "contact" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Support email"
            value={settings.contact.supportEmail}
            onChange={(v) => setSettings({ ...settings, contact: { ...settings.contact, supportEmail: v } })}
          />
          <Input
            label="Careers email"
            value={settings.contact.careersEmail}
            onChange={(v) => setSettings({ ...settings, contact: { ...settings.contact, careersEmail: v } })}
          />
          <Input
            label="Phone number"
            value={settings.contact.phoneNumber}
            onChange={(v) => setSettings({ ...settings, contact: { ...settings.contact, phoneNumber: v } })}
          />
          <Input
            label="Phone display label"
            value={settings.contact.phoneLabel}
            onChange={(v) => setSettings({ ...settings, contact: { ...settings.contact, phoneLabel: v } })}
          />
          <Input
            label="WhatsApp number"
            value={settings.contact.whatsappNumber}
            onChange={(v) => setSettings({ ...settings, contact: { ...settings.contact, whatsappNumber: v } })}
          />
          <Input
            label="WhatsApp display label"
            value={settings.contact.whatsappLabel}
            onChange={(v) => setSettings({ ...settings, contact: { ...settings.contact, whatsappLabel: v } })}
          />
          <TextArea
            label="Office address"
            value={settings.contact.officeAddress}
            onChange={(v) => setSettings({ ...settings, contact: { ...settings.contact, officeAddress: v } })}
            className="sm:col-span-2"
          />
          <TextArea
            label="Support hours and priority note"
            value={settings.contact.supportHours}
            onChange={(v) => setSettings({ ...settings, contact: { ...settings.contact, supportHours: v } })}
            className="sm:col-span-2"
          />
        </div>
      )}

      {tab === "careers" && (
        <CareersEditor
          roles={settings.careers.roles}
          onChange={(roles) => setSettings({ ...settings, careers: { ...settings.careers, roles } })}
        />
      )}

      {tab === "locations" && (
        <GeoEditor
          geo={settings.geo}
          propertyTypes={settings.propertyTypes}
          amenities={settings.amenities}
          onGeoChange={(geo) => setSettings(syncGeoToFlatLists({ ...settings, geo }))}
          onPropertyTypesChange={(propertyTypes) => setSettings({ ...settings, propertyTypes })}
          onAmenitiesChange={(amenities) => setSettings({ ...settings, amenities })}
        />
      )}

      {tab === "integrations" && (
        <div className="space-y-4">
          <div className="space-y-3 rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto_auto_auto] lg:items-end">
              <Input
                label="SMTP test recipient email"
                value={smtpTestEmail}
                onChange={setSmtpTestEmail}
                type="email"
              />
              <Button className="w-full whitespace-nowrap lg:w-auto" variant="secondary" onClick={() => void testIntegration("smtp")} disabled={testingIntegration !== null}>
                <TestTube2 className="size-4" /> {testingIntegration === "smtp" ? "Testing SMTP..." : "Test SMTP"}
              </Button>
              <Button className="w-full whitespace-nowrap lg:w-auto" variant="secondary" onClick={() => void testIntegration("maps")} disabled={testingIntegration !== null}>
                <TestTube2 className="size-4" /> {testingIntegration === "maps" ? "Testing Maps..." : "Test Maps key"}
              </Button>
              <Button className="w-full whitespace-nowrap lg:w-auto" variant="secondary" onClick={() => void testIntegration("cloudinary")} disabled={testingIntegration !== null}>
                <TestTube2 className="size-4" /> {testingIntegration === "cloudinary" ? "Testing Cloudinary..." : "Test Cloudinary"}
              </Button>
            </div>
            {integrationTestResult && (
              <p className={`rounded-lg border px-3 py-2 text-sm ${integrationTestResult.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-red-500/30 bg-red-500/10 text-red-200"}`}>
                {integrationTestResult.message}
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(settings.integrations).map(([key, value]) => (
              <Input
                key={key}
                label={key}
                value={String(value)}
                secret={key.toLowerCase().includes("secret") || key.toLowerCase().includes("pass")}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    integrations: { ...settings.integrations, [key]: key === "smtpPort" ? Number(v) : v },
                  })
                }
                type={key === "smtpPort" ? "number" : "text"}
              />
            ))}
          </div>
        </div>
      )}

      {tab === "notifications" && (
        <div className="space-y-6">
          <TemplateEditor
            title="Email templates"
            templates={settings.notifications.emailTemplates}
            onChange={(emailTemplates) => setSettings({ ...settings, notifications: { ...settings.notifications, emailTemplates } })}
          />
          <TemplateEditor
            title="SMS templates"
            templates={settings.notifications.smsTemplates}
            onChange={(smsTemplates) => setSettings({ ...settings, notifications: { ...settings.notifications, smsTemplates } })}
          />
          <TemplateEditor
            title="WhatsApp templates"
            templates={settings.notifications.whatsappTemplates}
            onChange={(whatsappTemplates) => setSettings({ ...settings, notifications: { ...settings.notifications, whatsappTemplates } })}
          />
        </div>
      )}

      {tab === "legal" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Terms version" value={settings.legal.termsVersion} onChange={(v) => setSettings({ ...settings, legal: { ...settings.legal, termsVersion: v } })} />
          <Input label="Privacy version" value={settings.legal.privacyVersion} onChange={(v) => setSettings({ ...settings, legal: { ...settings.legal, privacyVersion: v } })} />
          <Input label="Data retention (days)" type="number" value={String(settings.legal.dataRetentionDays)} onChange={(v) => setSettings({ ...settings, legal: { ...settings.legal, dataRetentionDays: Number(v) } })} />
          <Toggle label="Cookie consent required" checked={settings.legal.cookieConsentRequired} onChange={(v) => setSettings({ ...settings, legal: { ...settings.legal, cookieConsentRequired: v } })} />
          <Toggle label="Allow data export" checked={settings.legal.allowDataExport} onChange={(v) => setSettings({ ...settings, legal: { ...settings.legal, allowDataExport: v } })} />
          <Toggle label="Allow account deletion" checked={settings.legal.allowAccountDeletion} onChange={(v) => setSettings({ ...settings, legal: { ...settings.legal, allowAccountDeletion: v } })} />
        </div>
      )}

      {tab === "rbac" && (
        <RbacEditor
          settings={settings}
          admins={admins}
          eligibleUsers={eligibleUsers}
          canManageAccess={me?.permissions.includes("super") ?? false}
          promotingAdmin={promotingAdmin}
          onChange={(rbac) => setSettings({ ...settings, rbac })}
          onPromoteUser={promoteAdmin}
        />
      )}

      {tab === "features" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="mb-3 text-sm font-semibold text-white">Platform feature flags</p>
            <div className="space-y-2">
              {Object.entries(settings.featureFlags).map(([key, enabled]) => (
                <Toggle
                  key={key}
                  label={key.replace(/_/g, " ")}
                  checked={enabled}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      featureFlags: { ...settings.featureFlags, [key]: v },
                    })
                  }
                />
              ))}
            </div>
          </div>
          <div className="space-y-3 rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-sm font-semibold text-white">Registration & access</p>
            <Toggle label="Registration open" checked={settings.registrationOpen} onChange={(v) => setSettings({ ...settings, registrationOpen: v })} />
            <Toggle label="Email verification required" checked={settings.emailVerificationRequired} onChange={(v) => setSettings({ ...settings, emailVerificationRequired: v })} />
            <Toggle label="Phone verification required" checked={settings.phoneVerificationRequired} onChange={(v) => setSettings({ ...settings, phoneVerificationRequired: v })} />
            <Toggle label="Maintenance mode" checked={settings.maintenanceMode} onChange={(v) => setSettings({ ...settings, maintenanceMode: v })} />
            <Input label="Maintenance message" value={settings.maintenanceMessage} onChange={(v) => setSettings({ ...settings, maintenanceMessage: v })} />
          </div>
        </div>
      )}

      {tab === "security" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Min password length" value={String(settings.minPasswordLength)} onChange={(v) => setSettings({ ...settings, minPasswordLength: Number(v) || 8 })} />
          <Input label="Session timeout (minutes)" value={String(settings.sessionTimeoutMinutes)} onChange={(v) => setSettings({ ...settings, sessionTimeoutMinutes: Number(v) || 60 })} />
          <Input label="Max upload (MB)" value={String(settings.maxUploadMb)} onChange={(v) => setSettings({ ...settings, maxUploadMb: Number(v) || 10 })} />
          <Input label="Rate limit per minute" value={String(settings.rateLimitPerMinute)} onChange={(v) => setSettings({ ...settings, rateLimitPerMinute: Number(v) || 60 })} />
          <div className="sm:col-span-2 rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="mb-2 text-sm font-semibold text-white">Data & privacy</p>
            <Toggle label="Allow data export" checked={settings.legal.allowDataExport} onChange={(v) => setSettings({ ...settings, legal: { ...settings.legal, allowDataExport: v } })} />
            <Toggle label="Allow account deletion" checked={settings.legal.allowAccountDeletion} onChange={(v) => setSettings({ ...settings, legal: { ...settings.legal, allowAccountDeletion: v } })} />
            <Input label="Data retention (days)" value={String(settings.legal.dataRetentionDays)} onChange={(v) => setSettings({ ...settings, legal: { ...settings.legal, dataRetentionDays: Number(v) || 365 } })} />
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
      <p>{message}</p>
      <Button variant="secondary" className="mt-3" onClick={onRetry}>Retry</Button>
    </div>
  );
}

function mergeSavedSettingsForForm(serverSettings: PlatformSettings, submittedSettings: PlatformSettings): PlatformSettings {
  const integrations = { ...serverSettings.integrations };
  for (const key of ["cloudinarySecret", "smtpPass"] as const) {
    if (isMaskedSecret(integrations[key])) {
      integrations[key] = submittedSettings.integrations[key];
    }
  }
  return { ...serverSettings, integrations };
}

function isMaskedSecret(value: string) {
  return value.length > 0 && !/[A-Za-z0-9]/.test(value);
}

function CareersEditor({ roles, onChange }: { roles: CareerRole[]; onChange: (roles: CareerRole[]) => void }) {
  function updateRole(id: string, patch: Partial<CareerRole>) {
    onChange(roles.map((role) => (role.id === id ? { ...role, ...patch } : role)));
  }

  function addRole() {
    onChange([
      ...roles,
      {
        id: `career_${Date.now()}`,
        title: "New role",
        location: "Harare / remote",
        type: "Full-time",
        body: "Describe the role, responsibilities, and ideal candidate.",
        published: false,
      },
    ]);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-cyan-500/20 bg-slate-950/60 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Careers page roles</p>
            <p className="mt-1 text-sm text-slate-400">
              Add, edit, publish, or remove roles shown on the public Careers page.
            </p>
          </div>
          <Button variant="secondary" onClick={addRole}>
            <Plus className="size-4" /> Add role
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {roles.map((role) => (
          <article key={role.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{role.title || "Untitled role"}</p>
                <p className="mt-1 text-xs text-slate-500">{role.published ? "Published on careers page" : "Hidden from careers page"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={role.published}
                    onChange={(event) => updateRole(role.id, { published: event.target.checked })}
                  />
                  Published
                </label>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/10"
                  onClick={() => onChange(roles.filter((item) => item.id !== role.id))}
                >
                  <Trash2 className="size-4" /> Delete
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Role title" value={role.title} onChange={(title) => updateRole(role.id, { title })} />
              <Input label="Employment type" value={role.type} onChange={(type) => updateRole(role.id, { type })} />
              <Input label="Location" value={role.location} onChange={(location) => updateRole(role.id, { location })} />
              <Input label="Internal ID" value={role.id} onChange={(id) => updateRole(role.id, { id: id.trim() || role.id })} />
              <TextArea
                label="Role description"
                value={role.body}
                onChange={(body) => updateRole(role.id, { body })}
                className="sm:col-span-2"
              />
            </div>
          </article>
        ))}
        {!roles.length && (
          <div className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">
            No roles yet. Add a role to publish jobs on the Careers page.
          </div>
        )}
      </div>
    </div>
  );
}

function GeoEditor({
  geo,
  propertyTypes,
  amenities,
  onGeoChange,
  onPropertyTypesChange,
  onAmenitiesChange,
}: {
  geo: GeoProvince[];
  propertyTypes: string[];
  amenities: string[];
  onGeoChange: (geo: GeoProvince[]) => void;
  onPropertyTypesChange: (items: string[]) => void;
  onAmenitiesChange: (items: string[]) => void;
}) {
  function updateProvince(pIndex: number, patch: Partial<GeoProvince>) {
    const next = [...geo];
    next[pIndex] = { ...next[pIndex], ...patch };
    onGeoChange(next);
  }

  function updateCity(pIndex: number, cIndex: number, patch: Partial<GeoCity>) {
    const next = [...geo];
    const cities = [...next[pIndex].cities];
    cities[cIndex] = { ...cities[cIndex], ...patch };
    next[pIndex] = { ...next[pIndex], cities };
    onGeoChange(next);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {geo.map((province, pIndex) => (
          <div key={`${province.name}-${pIndex}`} className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Input label="Province" value={province.name} onChange={(v) => updateProvince(pIndex, { name: v })} />
              <button
                type="button"
                className="mt-5 rounded p-2 text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                onClick={() => onGeoChange(geo.filter((_, i) => i !== pIndex))}
                aria-label={`Remove ${province.name} province`}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            {province.cities.map((city, cIndex) => (
              <div key={`${city.name}-${cIndex}`} className="mb-3 rounded-lg border border-white/5 p-3">
                <Input label="City" value={city.name} onChange={(v) => updateCity(pIndex, cIndex, { name: v })} />
                <ListEditor label="Suburbs" items={city.suburbs} onChange={(suburbs) => updateCity(pIndex, cIndex, { suburbs })} />
              </div>
            ))}
            <Button
              variant="secondary"
              onClick={() => {
                const cities = [...province.cities, { name: "New city", suburbs: [] }];
                updateProvince(pIndex, { cities });
              }}
            >
              <Plus className="size-4" /> Add city
            </Button>
          </div>
        ))}
        <Button variant="secondary" onClick={() => onGeoChange([...geo, { name: "New province", cities: [] }])}>
          <Plus className="size-4" /> Add province
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ListEditor label="Property types" items={propertyTypes} onChange={onPropertyTypesChange} />
        <ListEditor label="Amenities" items={amenities} onChange={onAmenitiesChange} />
      </div>
    </div>
  );
}

function TemplateEditor({
  title,
  templates,
  onChange,
}: {
  title: string;
  templates: Record<string, string>;
  onChange: (templates: Record<string, string>) => void;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase text-slate-400">{title}</h3>
      {Object.entries(templates).map(([key, value]) => (
        <div key={key} className="rounded-lg border border-white/10 p-3">
          <p className="mb-2 text-xs font-medium text-slate-500">{key}</p>
          <textarea
            value={value}
            onChange={(e) => onChange({ ...templates, [key]: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>
      ))}
      <Button
        variant="secondary"
        onClick={() => onChange({ ...templates, [`template_${Object.keys(templates).length + 1}`]: "Hello {{name}}" })}
      >
        <Plus className="size-4" /> Add template
      </Button>
    </div>
  );
}

function RbacEditor({
  settings,
  admins,
  eligibleUsers,
  canManageAccess,
  promotingAdmin,
  onChange,
  onPromoteUser,
}: {
  settings: PlatformSettings;
  admins: AdminUser[];
  eligibleUsers: AdminUser[];
  canManageAccess: boolean;
  promotingAdmin: boolean;
  onChange: (rbac: PlatformSettings["rbac"]) => void;
  onPromoteUser: (userId: string, makeSuperAdmin: boolean) => Promise<void>;
}) {
  const roles = Object.entries(settings.rbac.roles);
  const [newAdminId, setNewAdminId] = useState("");
  const [makeSuperAdmin, setMakeSuperAdmin] = useState(true);

  function setUserRoles(userId: string, roleKeys: string[]) {
    onChange({ ...settings.rbac, userRoleKeys: { ...settings.rbac.userRoleKeys, [userId]: roleKeys } });
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase text-slate-400">Roles</h3>
        <div className="grid gap-3 lg:grid-cols-2">
          {roles.map(([key, role]) => (
            <div key={key} className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
              <p className="font-medium text-white">{role.label}</p>
              <p className="text-xs text-slate-500">{role.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {role.permissions.map((permission) => (
                  <span key={permission} className="rounded-full border border-cyan-500/15 bg-cyan-500/10 px-2 py-1 text-[11px] font-medium leading-none text-cyan-200">
                    {permission}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase text-slate-400">Admin assignments</h3>
        <div className="mb-4 rounded-xl border border-cyan-500/20 bg-slate-950/60 p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Add admin user</span>
              <select
                value={newAdminId}
                onChange={(event) => setNewAdminId(event.target.value)}
                disabled={!canManageAccess || promotingAdmin || eligibleUsers.length === 0}
                className="min-h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white disabled:opacity-60"
              >
                <option value="">{eligibleUsers.length ? "Select an active user" : "No active non-admin users"}</option>
                {eligibleUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} - {user.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={makeSuperAdmin}
                disabled={!canManageAccess || promotingAdmin}
                onChange={(event) => setMakeSuperAdmin(event.target.checked)}
              />
              Make Super Admin
            </label>
            <Button
              className="w-full lg:w-auto"
              onClick={() => void onPromoteUser(newAdminId, makeSuperAdmin)}
              disabled={!canManageAccess || !newAdminId || promotingAdmin}
            >
              {promotingAdmin ? "Adding..." : makeSuperAdmin ? "Add Super Admin" : "Add Admin"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Super-admin access can only be granted by an existing super admin and is recorded in the audit log.
          </p>
        </div>
        <div className="space-y-3">
          {admins.map((admin) => {
            const assigned = settings.rbac.userRoleKeys[admin.id] ?? [];
            return (
              <div key={admin.id} className="rounded-xl border border-white/10 bg-slate-950/35 p-3">
                <p className="font-medium text-white">{admin.name}</p>
                <p className="text-xs text-slate-500">{admin.email}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {roles.map(([key, role]) => (
                    <label key={key} className="flex min-h-10 items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={assigned.includes(key)}
                        disabled={!canManageAccess}
                        onChange={(e) => {
                          const next = e.target.checked ? [...assigned, key] : assigned.filter((r) => r !== key);
                          setUserRoles(admin.id, next.length ? next : ["viewer"]);
                        }}
                      />
                      {role.label}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  className,
  secret,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
  secret?: boolean;
}) {
  return (
    <label className={className}>
      <span className="mb-1 block text-xs text-slate-500">{label}</span>
      <input
        type={secret ? "password" : type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, className }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <label className={className}>
      <span className="mb-1 block text-xs text-slate-500">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
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

function ListEditor({ label, items, onChange }: { label: string; items: string[]; onChange: (items: string[]) => void }) {
  const [text, setText] = useState(items.join(", "));
  useEffect(() => {
    setText(items.join(", "));
  }, [items]);
  return (
    <label>
      <span className="mb-1 block text-xs text-slate-500">{label}</span>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(
            e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          );
        }}
        rows={4}
        className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
      />
      <p className="mt-1 text-xs text-slate-600">Comma-separated</p>
    </label>
  );
}
