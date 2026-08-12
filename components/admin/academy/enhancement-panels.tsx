"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Mail, Users, CreditCard, Plus, Pencil, Trash2, CheckCircle2, XCircle, Download, RefreshCw, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { useApp } from "@/components/providers/app-provider";
import {
  AdminDataTable,
  AdminDrawer,
  AdminFilterBar,
  AdminSearchInput,
  AdminSelect,
  AdminStatusBadge,
  AdminEmptyState,
  AdminConfirmDialog,
} from "@/components/admin/ui/admin-ui";

type EmailTemplate = {
  id: string;
  templateKey: string;
  language: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type BrandingSettings = {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  customCss?: string;
  headerText?: string;
  footerText?: string;
};

type Instructor = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  _count: {
    instructedCourses: number;
  };
};

type Refund = {
  id: string;
  amount: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
  createdAt: string;
  processedAt?: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  payment: {
    id: string;
    amount: number;
    currency: string;
    provider: string;
  };
};

const ACADEMY_EMAIL_TEMPLATE_PURPOSES = [
  {
    key: "registration_confirmation",
    label: "Registration confirmation",
    description: "Sent after a learner registers for a paid Academy course.",
    icon: Users,
    variables: ["{{learnerName}}", "{{courseTitle}}", "{{amount}}", "{{currency}}", "{{registrationId}}", "{{paymentInstructions}}", "{{logoUrl}}", "{{primaryColor}}"],
    subject: "Registration Confirmation: {{courseTitle}}",
    htmlContent:
      `<h2 style="margin:0 0 12px;color:#0f172a;font-size:24px;line-height:1.25;">Registration received</h2><p style="margin:0 0 16px;color:#334155;line-height:1.7;">Hello {{learnerName}}, your registration for <strong>{{courseTitle}}</strong> has been received.</p><div style="margin:22px 0;padding:18px;border-radius:12px;background:#ecfdf5;border:1px solid #bbf7d0;"><p style="margin:0 0 6px;color:#047857;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">Amount due</p><p style="margin:0;color:#0f172a;font-size:28px;font-weight:800;">{{currency}} {{amount}}</p><p style="margin:10px 0 0;color:#475569;">Reference: <strong>{{registrationId}}</strong></p></div><h3 style="margin:24px 0 10px;color:#0f172a;font-size:16px;">Payment instructions</h3><p style="margin:0;color:#334155;line-height:1.7;">{{paymentInstructions}}</p>`,
    textContent:
      "Hello {{learnerName}}, your registration for {{courseTitle}} has been received. Amount due: {{currency}} {{amount}}. Reference: {{registrationId}}. Payment instructions: {{paymentInstructions}}",
  },
  {
    key: "email_verification",
    label: "Email verification",
    description: "Sent when an Academy learner must verify their email address.",
    icon: Mail,
    variables: ["{{userName}}", "{{verificationLink}}", "{{logoUrl}}", "{{primaryColor}}", "{{secondaryColor}}"],
    subject: "Verify Your Email - HouseLink Academy",
    htmlContent:
      `<h2 style="margin:0 0 12px;color:#0f172a;font-size:24px;line-height:1.25;">Verify your email</h2><p style="margin:0 0 16px;color:#334155;line-height:1.7;">Hello {{userName}}, please confirm your email address to continue with HouseLink Academy.</p><p style="margin:24px 0;"><a href="{{verificationLink}}" style="display:inline-block;border-radius:10px;background:#047857;padding:12px 18px;color:#ffffff;font-weight:800;text-decoration:none;">Verify email address</a></p><p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">If the button does not work, copy this link into your browser: {{verificationLink}}</p>`,
    textContent: "Hello {{userName}}, verify your email address here: {{verificationLink}}",
  },
  {
    key: "payment_reminder",
    label: "Payment reminder",
    description: "Sent to learners who registered but have not completed payment proof.",
    icon: CreditCard,
    variables: ["{{learnerName}}", "{{courseTitle}}", "{{amount}}", "{{currency}}", "{{registrationId}}", "{{reminderDay}}", "{{paymentInstructions}}", "{{logoUrl}}"],
    subject: "Payment Reminder: {{courseTitle}}",
    htmlContent:
      `<h2 style="margin:0 0 12px;color:#0f172a;font-size:24px;line-height:1.25;">Payment reminder</h2><p style="margin:0 0 16px;color:#334155;line-height:1.7;">Hello {{learnerName}}, your payment for <strong>{{courseTitle}}</strong> is still pending.</p><div style="margin:22px 0;padding:18px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;"><p style="margin:0 0 6px;color:#c2410c;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">Payment due</p><p style="margin:0;color:#0f172a;font-size:28px;font-weight:800;">{{currency}} {{amount}}</p><p style="margin:10px 0 0;color:#475569;">Reference: <strong>{{registrationId}}</strong></p></div><p style="margin:0;color:#334155;line-height:1.7;">{{paymentInstructions}}</p>`,
    textContent: "Hello {{learnerName}}, your payment for {{courseTitle}} is still pending. Amount: {{currency}} {{amount}}. Reference: {{registrationId}}.",
  },
  {
    key: "waitlist_notification",
    label: "Waitlist spot available",
    description: "Sent when a course spot opens for a learner on the waitlist.",
    icon: CheckCircle2,
    variables: ["{{learnerName}}", "{{courseTitle}}", "{{courseUrl}}", "{{logoUrl}}", "{{primaryColor}}"],
    subject: "Spot Available: {{courseTitle}}",
    htmlContent:
      `<h2 style="margin:0 0 12px;color:#0f172a;font-size:24px;line-height:1.25;">A course spot is available</h2><p style="margin:0 0 16px;color:#334155;line-height:1.7;">Hello {{learnerName}}, a place has opened for <strong>{{courseTitle}}</strong>.</p><p style="margin:24px 0;"><a href="{{courseUrl}}" style="display:inline-block;border-radius:10px;background:#047857;padding:12px 18px;color:#ffffff;font-weight:800;text-decoration:none;">Register now</a></p><p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">Places may be limited, so complete your registration when you are ready.</p>`,
    textContent: "Hello {{learnerName}}, a spot has opened for {{courseTitle}}. Register here: {{courseUrl}}",
  },
] as const;

type AcademyEmailTemplatePurposeKey = (typeof ACADEMY_EMAIL_TEMPLATE_PURPOSES)[number]["key"];

const SAMPLE_EMAIL_VARIABLES: Record<string, string> = {
  learnerName: "HouseLink Learner",
  userName: "HouseLink Learner",
  courseTitle: "Zimbabwe Real Estate Foundations",
  amount: "30.00",
  currency: "USD",
  registrationId: "HLA-1234567890",
  paymentInstructions: "EcoCash or bank transfer details will appear here with your HouseLink payment reference.",
  verificationLink: "https://www.houselink.co.zw/auth/verify-email?token=sample",
  courseUrl: "https://www.houselink.co.zw/academy",
  reminderDay: "2",
  logoUrl: "https://www.houselink.co.zw/brand/houselink-full-lockup.png",
  primaryColor: "#047857",
  secondaryColor: "#0f172a",
};

function renderEmailPreviewValue(value: string) {
  return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => SAMPLE_EMAIL_VARIABLES[key] ?? match);
}

export function EmailTemplatesManagementPanel({ action }: { action?: (body: Record<string, unknown>, success: string) => Promise<unknown> }) {
  const { showToast } = useApp();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState<"create" | "edit" | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState({
    templateKey: "registration_confirmation",
    language: "en",
    subject: "",
    htmlContent: "",
    textContent: "",
    active: true,
  });
  const [testRecipient, setTestRecipient] = useState("");

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    const result = await apiFetch<{ templates: EmailTemplate[] }>("/api/v1/admin/academy/email-templates");
    if (result.data) setTemplates(result.data.templates);
    else showToast(result.error?.message ?? "Failed to load templates", "error");
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const templatesByKey = new Map(templates.map((template) => [`${template.templateKey}:${template.language}`, template]));
  const selectedPurpose = ACADEMY_EMAIL_TEMPLATE_PURPOSES.find((purpose) => purpose.key === formData.templateKey) ?? ACADEMY_EMAIL_TEMPLATE_PURPOSES[0];

  function templateForPurpose(key: AcademyEmailTemplatePurposeKey, language = "en") {
    return templatesByKey.get(`${key}:${language}`) ?? templates.find((template) => template.templateKey === key);
  }

  function openTemplateEditor(key: AcademyEmailTemplatePurposeKey, language = "en") {
    const purpose = ACADEMY_EMAIL_TEMPLATE_PURPOSES.find((item) => item.key === key) ?? ACADEMY_EMAIL_TEMPLATE_PURPOSES[0];
    const existing = templateForPurpose(key, language);
    if (existing) {
      setSelectedTemplate(existing);
      setFormData({
        templateKey: existing.templateKey,
        language: existing.language,
        subject: existing.subject,
        htmlContent: existing.htmlContent,
        textContent: existing.textContent || "",
        active: existing.active,
      });
      setDrawer("edit");
      return;
    }
    setSelectedTemplate(null);
    setFormData({
      templateKey: purpose.key,
      language,
      subject: purpose.subject,
      htmlContent: purpose.htmlContent,
      textContent: purpose.textContent,
      active: true,
    });
    setDrawer("create");
  }

  function handlePurposeChange(key: string) {
    const purpose = ACADEMY_EMAIL_TEMPLATE_PURPOSES.find((item) => item.key === key) ?? ACADEMY_EMAIL_TEMPLATE_PURPOSES[0];
    const existing = templateForPurpose(purpose.key, formData.language);
    if (existing) {
      setSelectedTemplate(existing);
      setDrawer("edit");
      setFormData({
        templateKey: existing.templateKey,
        language: existing.language,
        subject: existing.subject,
        htmlContent: existing.htmlContent,
        textContent: existing.textContent || "",
        active: existing.active,
      });
      return;
    }
    setSelectedTemplate(null);
    setDrawer("create");
    setFormData({
      templateKey: purpose.key,
      language: formData.language,
      subject: purpose.subject,
      htmlContent: purpose.htmlContent,
      textContent: purpose.textContent,
      active: true,
    });
  }

  function handleLanguageChange(language: string) {
    const existing = templateForPurpose(formData.templateKey as AcademyEmailTemplatePurposeKey, language);
    if (existing) {
      setSelectedTemplate(existing);
      setDrawer("edit");
      setFormData({
        templateKey: existing.templateKey,
        language: existing.language,
        subject: existing.subject,
        htmlContent: existing.htmlContent,
        textContent: existing.textContent || "",
        active: existing.active,
      });
      return;
    }
    setSelectedTemplate(null);
    setDrawer("create");
    setFormData((current) => ({ ...current, language }));
  }

  function insertVariable(variable: string) {
    setFormData((current) => ({ ...current, htmlContent: `${current.htmlContent}${current.htmlContent.endsWith(" ") ? "" : " "}${variable}` }));
  }

  async function handleSendTest() {
    if (!action) {
      showToast("Test email action is not available in this context.", "error");
      return;
    }
    if (!testRecipient.trim()) {
      showToast("Enter a recipient email for the test.", "error");
      return;
    }
    await action({
      action: "send_test_email_template",
      to: testRecipient.trim(),
      templateKey: formData.templateKey,
      subject: formData.subject,
      htmlContent: formData.htmlContent,
    }, "Test email sent.");
  }

  const handleCreate = async () => {
    const result = await apiFetch("/api/v1/admin/academy/email-templates", {
      method: "POST",
      body: JSON.stringify(formData),
    });
    if (result.data) {
      showToast("Email template created successfully");
      setDrawer(null);
      setSelectedTemplate(null);
      void loadTemplates();
    } else {
      showToast(result.error?.message ?? "Failed to create template", "error");
    }
  };

  const handleUpdate = async () => {
    if (!selectedTemplate) return;
    const result = await apiFetch("/api/v1/admin/academy/email-templates", {
      method: "PATCH",
      body: JSON.stringify({ id: selectedTemplate.id, ...formData }),
    });
    if (result.data) {
      showToast("Email template updated successfully");
      setDrawer(null);
      setSelectedTemplate(null);
      void loadTemplates();
    } else {
      showToast(result.error?.message ?? "Failed to update template", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteTemplate) return;
    const result = await apiFetch(`/api/v1/admin/academy/email-templates?id=${deleteTemplate.id}`, {
      method: "DELETE",
    });
    if (result.data) {
      showToast("Email template deleted successfully");
      setDeleteTemplate(null);
      void loadTemplates();
    } else {
      showToast(result.error?.message ?? "Failed to delete template", "error");
    }
  };

  const filteredTemplates = templates.filter((t) =>
    t.templateKey.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase())
  );
  const previewSubject = renderEmailPreviewValue(formData.subject || "No subject yet");
  const previewHtml = renderEmailPreviewValue(formData.htmlContent || "<p>No HTML content yet.</p>");

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-emerald-400/15 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Academy messaging</p>
            <h3 className="mt-2 text-2xl font-bold text-white">Transactional email templates</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Edit the real email templates used by Academy registration, verification, payment reminders, and waitlist alerts. Variables are shown per template so admins do not have to guess keys.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:items-center">
            <AdminSearchInput value={search} onChange={setSearch} placeholder="Search saved templates..." className="lg:w-80" />
            <Button className="w-full sm:w-auto" onClick={() => openTemplateEditor("registration_confirmation")}>
              <Plus className="size-4" /> New template override
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {ACADEMY_EMAIL_TEMPLATE_PURPOSES.map((purpose) => {
          const Icon = purpose.icon;
          const existing = templateForPurpose(purpose.key);
          return (
            <button
              key={purpose.key}
              type="button"
              onClick={() => openTemplateEditor(purpose.key)}
              className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-left transition hover:border-emerald-400/40 hover:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                  <Icon className="size-5" />
                </span>
                <AdminStatusBadge status={existing?.active === false ? "Inactive" : existing ? "Configured" : "Default"} variant={existing?.active === false ? "muted" : existing ? "success" : "warning"} />
              </div>
              <p className="mt-4 text-sm font-bold text-white">{purpose.label}</p>
              <p className="mt-2 min-h-12 text-xs leading-5 text-slate-400">{purpose.description}</p>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{purpose.key}</p>
              <p className={`mt-4 rounded-xl border px-3 py-2 text-xs leading-5 ${existing ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100" : "border-amber-400/20 bg-amber-400/10 text-amber-100"}`}>
                {existing ? "Saved database template. Click to edit, deactivate, test, or delete this override." : "System default. Click to edit and save it as the admin-managed template."}
              </p>
            </button>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
          <div>
            <h3 className="font-semibold text-white">Saved database overrides</h3>
            <p className="mt-1 text-sm text-slate-400">
              These rows are the templates Academy emails will use before falling back to the system defaults.
            </p>
          </div>
          <AdminStatusBadge status={`${filteredTemplates.length} saved`} variant="info" />
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="size-8 animate-spin text-slate-400" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="m-4 rounded-xl border border-dashed border-white/15 bg-slate-950/50 p-6 text-center">
            <Mail className="mx-auto size-9 text-slate-500" />
            <p className="mt-3 font-semibold text-white">No saved overrides yet</p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">
              The system defaults are still editable. Click any card above, adjust the wording, then save it to make that template admin-managed.
            </p>
          </div>
        ) : (
          <AdminDataTable
            rows={filteredTemplates}
            columns={[
              { key: "templateKey", header: "Purpose", render: (t) => <span className="font-semibold text-white">{ACADEMY_EMAIL_TEMPLATE_PURPOSES.find((purpose) => purpose.key === t.templateKey)?.label ?? t.templateKey}</span> },
              { key: "language", header: "Language", render: (t) => t.language.toUpperCase() },
              { key: "subject", header: "Subject", render: (t) => t.subject },
              { key: "status", header: "Status", render: (t) => <AdminStatusBadge status={t.active ? "Active" : "Inactive"} variant={t.active ? "success" : "muted"} /> },
              { key: "updatedAt", header: "Last Updated", render: (t) => new Date(t.updatedAt).toLocaleDateString() },
              {
                key: "actions",
                header: "Actions",
                render: (t) => (
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => { setSelectedTemplate(t); setFormData({ ...t, textContent: t.textContent || "" }); setDrawer("edit"); }}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" onClick={() => setDeleteTemplate(t)}>
                      <Trash2 className="size-4 text-red-400" />
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </section>

      <AdminDrawer open={Boolean(drawer)} onClose={() => { setDrawer(null); setSelectedTemplate(null); }} title={drawer === "create" ? "Create Template Override" : "Edit Saved Template"} width="xl">
        <div className="space-y-5">
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4">
            <p className="text-sm font-bold text-white">{selectedPurpose.label}</p>
            <p className="mt-1 text-xs leading-5 text-emerald-50/80">{selectedPurpose.description}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.85fr)]">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-300">Template purpose
                  <select value={formData.templateKey} onChange={(e) => handlePurposeChange(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white">
                    {ACADEMY_EMAIL_TEMPLATE_PURPOSES.map((purpose) => <option key={purpose.key} value={purpose.key}>{purpose.label}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-300">Language
                  <select value={formData.language} onChange={(e) => handleLanguageChange(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white">
                    <option value="en">English</option>
                    <option value="sn">Shona</option>
                    <option value="nd">Ndebele</option>
                    <option value="fr">French</option>
                  </select>
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-300">Subject
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white"
                  placeholder="Email subject line"
                />
              </label>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <label className="text-sm font-medium text-slate-300">Available variables</label>
                  <span className="text-xs text-slate-500">Click to insert into HTML</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedPurpose.variables.map((variable) => (
                    <button key={variable} type="button" onClick={() => insertVariable(variable)} className="rounded-full border border-white/10 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:border-emerald-400/40">
                      {variable}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block text-sm font-medium text-slate-300">HTML content
                <textarea
                  value={formData.htmlContent}
                  onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                  className="mt-1 min-h-[260px] w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 font-mono text-sm text-white"
                  placeholder="Write the HTML body used for this email"
                />
              </label>

              <label className="block text-sm font-medium text-slate-300">Plain text fallback
                <textarea
                  value={formData.textContent}
                  onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
                  className="mt-1 min-h-[110px] w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white"
                  placeholder="Short fallback for inboxes that do not render HTML"
                />
              </label>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-white">Email preview</p>
                    <p className="mt-1 text-xs text-slate-500">Preview uses realistic sample values. Live emails use each learner's real records.</p>
                  </div>
                  <AdminStatusBadge status={formData.active ? "Active" : "Inactive"} variant={formData.active ? "success" : "muted"} />
                </div>
                <p className="mt-4 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white">{previewSubject}</p>
                <iframe title="Email template preview" srcDoc={previewHtml} className="mt-3 h-80 w-full rounded-lg border border-white/10 bg-white" />
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded border-white/10 bg-slate-900"
                />
                Active template
              </label>

              <Button disabled={!formData.templateKey || !formData.language || !formData.subject.trim() || !formData.htmlContent.trim()} onClick={drawer === "create" ? handleCreate : handleUpdate} className="w-full">
                {drawer === "create" ? "Create Template" : "Update Template"}
              </Button>

              <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
                <p className="text-sm font-bold text-white">Send test email</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Uses live SMTP and sample learner values so the inbox shows a finished email, not template code.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={testRecipient}
                    onChange={(event) => setTestRecipient(event.target.value)}
                    className="min-h-10 flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 text-sm text-white"
                    placeholder="admin@example.com"
                  />
                  <Button variant="secondary" disabled={!formData.subject.trim() || !formData.htmlContent.trim()} onClick={() => void handleSendTest()}>
                    <Mail className="size-4" /> Send test
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminDrawer>
      <AdminConfirmDialog
        open={Boolean(deleteTemplate)}
        danger
        title="Delete Email Template"
        description={`Delete "${deleteTemplate?.templateKey}"? Emails using this template will fall back to the system default.`}
        confirmLabel="Delete Template"
        onCancel={() => setDeleteTemplate(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export function BrandingManagementPanel() {
  const { showToast } = useApp();
  const [branding, setBranding] = useState<BrandingSettings>({});
  const [loading, setLoading] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const loadBranding = useCallback(async () => {
    setLoading(true);
    const result = await apiFetch<BrandingSettings>("/api/v1/admin/academy/branding");
    if (result.data) setBranding(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadBranding();
  }, [loadBranding]);

  const handleUpdate = async () => {
    const result = await apiFetch("/api/v1/admin/academy/branding", {
      method: "PATCH",
      body: JSON.stringify(branding),
    });
    if (result.data) {
      showToast("Branding settings updated successfully");
    } else {
      showToast(result.error?.message ?? "Failed to update branding", "error");
    }
  };

  const handleReset = async () => {
    const result = await apiFetch("/api/v1/admin/academy/branding", {
      method: "POST",
      body: JSON.stringify({ action: "reset" }),
    });
    if (result.data) {
      showToast("Branding reset to defaults");
      void loadBranding();
    } else {
      showToast(result.error?.message ?? "Failed to reset branding", "error");
    }
  };

  const uploadLogo = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const dataUrl = await readEnhancementFile(file);
      const result = await apiFetch<{ url: string }>("/api/v1/uploads", {
        method: "POST",
        body: JSON.stringify({ dataUrl, kind: "image", folder: "academy/branding" }),
      });
      if (!result.data?.url) {
        showToast(result.error?.message ?? "Logo upload failed.", "error");
        return;
      }
      setBranding((current) => ({ ...current, logoUrl: result.data!.url }));
      showToast("Logo uploaded. Save branding to keep it.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Logo upload failed.", "error");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Academy Branding</h3>
        <Button variant="ghost" onClick={() => setConfirmReset(true)}>
          <RefreshCw className="size-4 mr-2" /> Reset to Defaults
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="size-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6 space-y-4">
          <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <label className="block text-sm font-medium text-slate-300">Logo</label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" disabled={logoUploading} onClick={() => logoInputRef.current?.click()}>
                  {logoUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  {logoUploading ? "Uploading..." : "Upload"}
                </Button>
                {branding.logoUrl ? (
                  <Button type="button" variant="secondary" disabled={logoUploading} onClick={() => setBranding({ ...branding, logoUrl: "" })}>
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void uploadLogo(event.currentTarget.files)} />
            <input
              type="text"
              value={branding.logoUrl || ""}
              onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white"
              placeholder="https://example.com/logo.png"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Primary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={branding.primaryColor || "#10b981"}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  className="w-12 h-10 rounded border border-white/10"
                />
                <input
                  type="text"
                  value={branding.primaryColor || "#10b981"}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Secondary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={branding.secondaryColor || "#3b82f6"}
                  onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                  className="w-12 h-10 rounded border border-white/10"
                />
                <input
                  type="text"
                  value={branding.secondaryColor || "#3b82f6"}
                  onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                  className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Accent Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={branding.accentColor || "#f59e0b"}
                  onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                  className="w-12 h-10 rounded border border-white/10"
                />
                <input
                  type="text"
                  value={branding.accentColor || "#f59e0b"}
                  onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                  className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Font Family</label>
            <select
              value={branding.fontFamily || "Inter"}
              onChange={(e) => setBranding({ ...branding, fontFamily: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white"
            >
              <option value="Inter">Inter</option>
              <option value="Roboto">Roboto</option>
              <option value="Open Sans">Open Sans</option>
              <option value="Lato">Lato</option>
              <option value="Montserrat">Montserrat</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Header Text</label>
            <input
              type="text"
              value={branding.headerText || ""}
              onChange={(e) => setBranding({ ...branding, headerText: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white"
              placeholder="Academy header text"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Footer Text</label>
            <input
              type="text"
              value={branding.footerText || ""}
              onChange={(e) => setBranding({ ...branding, footerText: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white"
              placeholder="Academy footer text"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Custom CSS</label>
            <textarea
              value={branding.customCss || ""}
              onChange={(e) => setBranding({ ...branding, customCss: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white min-h-[150px] font-mono text-sm"
              placeholder="Additional CSS rules..."
            />
          </div>
          <Button onClick={handleUpdate} className="w-full">
            Save Branding Settings
          </Button>
        </div>
      )}
      <AdminConfirmDialog
        open={confirmReset}
        title="Reset Academy Branding"
        description="This will replace the current logo, colour, font, and custom CSS settings with platform defaults."
        confirmLabel="Reset Branding"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          void handleReset();
        }}
      />
    </div>
  );
}

export function InstructorsManagementPanel() {
  const { showToast } = useApp();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState<"create" | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [deleteInstructor, setDeleteInstructor] = useState<Instructor | null>(null);

  const loadInstructors = useCallback(async () => {
    setLoading(true);
    const result = await apiFetch<{ instructors: Instructor[] }>("/api/v1/admin/academy/instructors");
    if (result.data) setInstructors(result.data.instructors);
    else showToast(result.error?.message ?? "Failed to load instructors", "error");
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    void loadInstructors();
  }, [loadInstructors]);

  const handleCreate = async () => {
    const result = await apiFetch("/api/v1/admin/academy/instructors", {
      method: "POST",
      body: JSON.stringify(formData),
    });
    if (result.data) {
      showToast("Instructor created successfully");
      setDrawer(null);
      setFormData({ name: "", email: "", phone: "" });
      void loadInstructors();
    } else {
      showToast(result.error?.message ?? "Failed to create instructor", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteInstructor) return;
    const result = await apiFetch(`/api/v1/admin/academy/instructors?id=${deleteInstructor.id}`, {
      method: "DELETE",
    });
    if (result.data) {
      showToast("Instructor removed successfully");
      setDeleteInstructor(null);
      void loadInstructors();
    } else {
      showToast(result.error?.message ?? "Failed to remove instructor", "error");
    }
  };

  const filteredInstructors = instructors.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <AdminFilterBar>
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Search instructors..." className="lg:flex-1" />
        <Button onClick={() => { setFormData({ name: "", email: "", phone: "" }); setDrawer("create"); }}>
          <Plus className="size-4" /> Add Instructor
        </Button>
      </AdminFilterBar>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="size-8 animate-spin text-slate-400" />
        </div>
      ) : filteredInstructors.length === 0 ? (
        <AdminEmptyState icon={Users} title="No instructors found" description="Add instructors to manage course assignments" />
      ) : (
        <AdminDataTable
          rows={filteredInstructors}
          columns={[
            { key: "name", header: "Name", render: (i) => <span className="font-semibold text-white">{i.name}</span> },
            { key: "email", header: "Email", render: (i) => i.email },
            { key: "phone", header: "Phone", render: (i) => i.phone || "-" },
            { key: "courses", header: "Courses", render: (i) => i._count.instructedCourses },
            { key: "createdAt", header: "Added", render: (i) => new Date(i.createdAt).toLocaleDateString() },
            {
              key: "actions",
              header: "Actions",
              render: (i) => (
                <Button variant="ghost" onClick={() => setDeleteInstructor(i)}>
                  <Trash2 className="size-4 text-red-400" />
                </Button>
              ),
            },
          ]}
        />
      )}

      <AdminDrawer open={Boolean(drawer)} onClose={() => setDrawer(null)} title="Add Instructor">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white"
              placeholder="Instructor name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white"
              placeholder="instructor@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Phone (Optional)</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white"
              placeholder="+1 234 567 890"
            />
          </div>
          <Button onClick={handleCreate} className="w-full">
            Add Instructor
          </Button>
        </div>
      </AdminDrawer>
      <AdminConfirmDialog
        open={Boolean(deleteInstructor)}
        danger
        title="Remove Instructor"
        description={`Remove ${deleteInstructor?.name}? Course history remains, but this instructor row will no longer be available.`}
        confirmLabel="Remove Instructor"
        onCancel={() => setDeleteInstructor(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export function RefundsManagementPanel() {
  const { showToast } = useApp();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [pendingAction, setPendingAction] = useState<{ refund: Refund; actionType: "approve" | "reject" | "process" } | null>(null);

  const loadRefunds = useCallback(async () => {
    setLoading(true);
    const result = await apiFetch<{ refunds: Refund[] }>(`/api/v1/admin/academy/refunds?status=${statusFilter}`);
    if (result.data) setRefunds(result.data.refunds);
    else showToast(result.error?.message ?? "Failed to load refunds", "error");
    setLoading(false);
  }, [statusFilter, showToast]);

  useEffect(() => {
    void loadRefunds();
  }, [loadRefunds]);

  const handleProcess = async () => {
    if (!pendingAction) return;
    const result = await apiFetch("/api/v1/admin/academy/refunds", {
      method: "PATCH",
      body: JSON.stringify({ refundId: pendingAction.refund.id, action: pendingAction.actionType }),
    });
    if (result.data) {
      showToast(`Refund ${pendingAction.actionType}d successfully`);
      setPendingAction(null);
      void loadRefunds();
    } else {
      showToast(result.error?.message ?? "Failed to process refund", "error");
    }
  };

  const filteredRefunds = statusFilter === "ALL" ? refunds : refunds.filter((r) => r.status === statusFilter);

  return (
    <div className="space-y-4">
      <AdminFilterBar>
        <AdminSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "ALL", label: "All Status" },
            { value: "PENDING", label: "Pending" },
            { value: "APPROVED", label: "Approved" },
            { value: "REJECTED", label: "Rejected" },
            { value: "COMPLETED", label: "Completed" },
          ]}
        />
      </AdminFilterBar>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="size-8 animate-spin text-slate-400" />
        </div>
      ) : filteredRefunds.length === 0 ? (
        <AdminEmptyState icon={CreditCard} title="No refund requests found" description="Refund requests will appear here" />
      ) : (
        <AdminDataTable
          rows={filteredRefunds}
          columns={[
            { key: "user", header: "User", render: (r) => <div><p className="font-semibold text-white">{r.user.name}</p><p className="text-sm text-slate-400">{r.user.email}</p></div> },
            { key: "amount", header: "Amount", render: (r) => `${r.payment.currency} ${r.amount.toFixed(2)}` },
            { key: "reason", header: "Reason", render: (r) => r.reason },
            { key: "status", header: "Status", render: (r) => (
              <AdminStatusBadge
                status={r.status}
                variant={r.status === "COMPLETED" ? "success" : r.status === "APPROVED" ? "success" : r.status === "REJECTED" ? "danger" : "warning"}
              />
            )},
            { key: "createdAt", header: "Requested", render: (r) => new Date(r.createdAt).toLocaleDateString() },
            {
              key: "actions",
              header: "Actions",
              render: (r) => (
                r.status === "PENDING" ? (
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setPendingAction({ refund: r, actionType: "approve" })}>
                      <CheckCircle2 className="size-4 text-green-400" />
                    </Button>
                    <Button variant="ghost" onClick={() => setPendingAction({ refund: r, actionType: "reject" })}>
                      <XCircle className="size-4 text-red-400" />
                    </Button>
                  </div>
                ) : r.status === "APPROVED" ? (
                  <Button onClick={() => setPendingAction({ refund: r, actionType: "process" })}>
                    <Download className="size-4 mr-2" /> Process Refund
                  </Button>
                ) : (
                  <span className="text-sm text-slate-500">{r.status}</span>
                )
              ),
            },
          ]}
        />
      )}
      <AdminConfirmDialog
        open={Boolean(pendingAction)}
        danger={pendingAction?.actionType === "reject"}
        title={
          pendingAction?.actionType === "approve"
            ? "Approve Refund"
            : pendingAction?.actionType === "reject"
              ? "Reject Refund"
              : "Process Refund"
        }
        description={
          pendingAction
            ? `${pendingAction.actionType === "process" ? "Mark" : "Set"} refund ${pendingAction.refund.payment.currency} ${pendingAction.refund.amount.toFixed(2)} for ${pendingAction.refund.user.email}.`
            : undefined
        }
        confirmLabel={pendingAction?.actionType === "process" ? "Process Refund" : pendingAction?.actionType === "reject" ? "Reject Refund" : "Approve Refund"}
        onCancel={() => setPendingAction(null)}
        onConfirm={handleProcess}
      />
    </div>
  );
}

function readEnhancementFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("File could not be read."));
    reader.readAsDataURL(file);
  });
}
