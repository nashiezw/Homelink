"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Award, Edit, Eye, Loader2, Palette, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { useApp } from "@/components/providers/app-provider";
import {
  AdminConfirmDialog,
  AdminDrawer,
  AdminEmptyState,
  AdminMetricGrid,
  AdminPanel,
  AdminStatPill,
  AdminStatusBadge,
} from "@/components/admin/ui/admin-ui";

type CertificateTemplate = {
  id: string;
  name: string;
  backgroundUrl: string | null;
  logoUrl: string | null;
  signatureUrl: string | null;
  templateJson: Record<string, unknown>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type TemplateFormData = {
  name: string;
  backgroundUrl: string;
  logoUrl: string;
  signatureUrl: string;
  certificateNumberPrefix: string;
  title: string;
  primaryColor: string;
  accentColor: string;
  expiryDays: number;
  active: boolean;
};

const emptyForm: TemplateFormData = {
  name: "",
  backgroundUrl: "",
  logoUrl: "",
  signatureUrl: "",
  certificateNumberPrefix: "HLA",
  title: "Certificate of Achievement",
  primaryColor: "#008b68",
  accentColor: "#c6a15b",
  expiryDays: 365,
  active: true,
};

export function CertificateTemplateManagement() {
  const { showToast } = useApp();
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CertificateTemplate | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CertificateTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(emptyForm);
  const [uploadingField, setUploadingField] = useState<"backgroundUrl" | "logoUrl" | "signatureUrl" | null>(null);

  const activeTemplates = useMemo(() => templates.filter((template) => template.active).length, [templates]);

  useEffect(() => {
    void loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadTemplates() {
    setLoading(true);
    const result = await apiFetch<CertificateTemplate[]>("/api/v1/admin/academy/certificates/templates");
    if (result.data) {
      setTemplates(result.data);
    } else {
      showToast(result.error?.message ?? "Certificate templates could not be loaded.", "error");
    }
    setLoading(false);
  }

  function payloadFromForm() {
    return {
      name: formData.name.trim(),
      backgroundUrl: formData.backgroundUrl.trim() || null,
      logoUrl: formData.logoUrl.trim() || null,
      signatureUrl: formData.signatureUrl.trim() || null,
      templateJson: {
        certificateNumberPrefix: formData.certificateNumberPrefix.trim() || "HLA",
        title: formData.title.trim() || "Certificate of Achievement",
        colours: {
          primary: formData.primaryColor,
          accent: formData.accentColor,
        },
        expiryDays: Math.max(0, Number(formData.expiryDays) || 0),
      },
      active: formData.active,
    };
  }

  async function saveTemplate() {
    if (!formData.name.trim()) {
      showToast("Template name is required.", "error");
      return;
    }
    setSaving(true);
    const endpoint = editingTemplate
      ? `/api/v1/admin/academy/certificates/templates/${editingTemplate.id}`
      : "/api/v1/admin/academy/certificates/templates";
    const result = await apiFetch(endpoint, {
      method: editingTemplate ? "PUT" : "POST",
      body: JSON.stringify(payloadFromForm()),
    });
    if (result.data) {
      showToast(editingTemplate ? "Certificate template updated." : "Certificate template created.");
      closeDrawer();
      await loadTemplates();
    } else {
      showToast(result.error?.message ?? "Certificate template could not be saved.", "error");
    }
    setSaving(false);
  }

  async function deleteTemplate() {
    if (!deleteTarget) return;
    const result = await apiFetch(`/api/v1/admin/academy/certificates/templates/${deleteTarget.id}`, { method: "DELETE" });
    if (result.data) {
      showToast("Certificate template deleted.");
      setDeleteTarget(null);
      await loadTemplates();
    } else {
      showToast(result.error?.message ?? "Certificate template could not be deleted.", "error");
    }
  }

  function openCreate() {
    setEditingTemplate(null);
    setFormData(emptyForm);
    setDrawerOpen(true);
  }

  function openEdit(template: CertificateTemplate) {
    const templateJson = template.templateJson ?? {};
    const colours = (templateJson.colours as Record<string, string> | undefined) ?? {};
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      backgroundUrl: template.backgroundUrl ?? "",
      logoUrl: template.logoUrl ?? "",
      signatureUrl: template.signatureUrl ?? "",
      certificateNumberPrefix: String(templateJson.certificateNumberPrefix ?? "HLA"),
      title: String(templateJson.title ?? "Certificate of Achievement"),
      primaryColor: colours.primary ?? "#008b68",
      accentColor: colours.accent ?? "#c6a15b",
      expiryDays: Number(templateJson.expiryDays ?? 365),
      active: template.active,
    });
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingTemplate(null);
    setFormData(emptyForm);
  }

  async function uploadTemplateAsset(field: "backgroundUrl" | "logoUrl" | "signatureUrl", files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploadingField(field);
    try {
      const dataUrl = await readTemplateFile(file);
      const result = await apiFetch<{ url: string }>("/api/v1/uploads", {
        method: "POST",
        body: JSON.stringify({ dataUrl, kind: "image", folder: "academy/certificates" }),
      });
      if (!result.data?.url) {
        showToast(result.error?.message ?? "Certificate image upload failed.", "error");
        return;
      }
      setFormData((current) => ({ ...current, [field]: result.data!.url }));
      showToast("Certificate image uploaded. Save the template to keep it.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Certificate image upload failed.", "error");
    } finally {
      setUploadingField(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="size-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-white">Certificate Templates</h3>
          <p className="text-sm text-slate-400">Design, preview, and manage certificate issuance templates.</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={openCreate}>
          <Plus className="mr-2 size-4" />
          Create Template
        </Button>
      </div>

      <AdminMetricGrid cols={3}>
        <AdminStatPill label="Templates" value={templates.length} />
        <AdminStatPill label="Active" value={activeTemplates} tone="success" />
        <AdminStatPill label="Inactive" value={templates.length - activeTemplates} tone={templates.length - activeTemplates ? "warning" : "default"} />
      </AdminMetricGrid>

      {templates.length === 0 ? (
        <AdminEmptyState
          icon={Award}
          title="No certificate templates yet"
          description="Create a template before issuing styled certificates to learners."
          action={<Button onClick={openCreate}><Plus className="mr-2 size-4" />Create Template</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <article key={template.id} className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-slate-900/60">
              <TemplatePreview template={template} compact />
              <div className="space-y-4 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h4 className="break-words font-semibold text-white [overflow-wrap:anywhere]">{template.name}</h4>
                    <p className="text-xs text-slate-500">Updated {new Date(template.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <AdminStatusBadge status={template.active ? "Active" : "Inactive"} variant={template.active ? "success" : "muted"} />
                </div>
                <div className="grid gap-2 text-sm text-slate-300">
                  <TemplateMeta template={template} />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button variant="secondary" onClick={() => openEdit(template)}>
                    <Edit className="mr-2 size-4" />
                    Edit
                  </Button>
                  <Button variant="secondary" onClick={() => setDeleteTarget(template)}>
                    <Trash2 className="mr-2 size-4 text-red-300" />
                    Delete
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <AdminDrawer
        open={drawerOpen}
        width="xl"
        title={editingTemplate ? "Edit Certificate Template" : "Create Certificate Template"}
        description="Preview changes before saving so certificates stay consistent."
        onClose={closeDrawer}
      >
        <div className="space-y-5">
          <TemplatePreview form={formData} />
          <AdminPanel title="Template Details" description="Core certificate text and numbering.">
            <div className="grid gap-4">
              <TextField label="Template Name" value={formData.name} onChange={(name) => setFormData({ ...formData, name })} placeholder="Certified HouseLink Agent" />
              <TextField label="Certificate Title" value={formData.title} onChange={(title) => setFormData({ ...formData, title })} placeholder="Certificate of Achievement" />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Number Prefix" value={formData.certificateNumberPrefix} onChange={(certificateNumberPrefix) => setFormData({ ...formData, certificateNumberPrefix })} placeholder="HLA" />
                <TextField
                  label="Expiry Days"
                  type="number"
                  value={String(formData.expiryDays)}
                  onChange={(expiryDays) => setFormData({ ...formData, expiryDays: Math.max(0, Number(expiryDays) || 0) })}
                  placeholder="365"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorField label="Primary Color" value={formData.primaryColor} onChange={(primaryColor) => setFormData({ ...formData, primaryColor })} />
                <ColorField label="Accent Color" value={formData.accentColor} onChange={(accentColor) => setFormData({ ...formData, accentColor })} />
              </div>
              <TemplateImageField
                label="Background Image"
                value={formData.backgroundUrl}
                uploading={uploadingField === "backgroundUrl"}
                onChange={(backgroundUrl) => setFormData({ ...formData, backgroundUrl })}
                onUpload={(files) => void uploadTemplateAsset("backgroundUrl", files)}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TemplateImageField
                  label="Logo"
                  value={formData.logoUrl}
                  uploading={uploadingField === "logoUrl"}
                  onChange={(logoUrl) => setFormData({ ...formData, logoUrl })}
                  onUpload={(files) => void uploadTemplateAsset("logoUrl", files)}
                />
                <TemplateImageField
                  label="Signature"
                  value={formData.signatureUrl}
                  uploading={uploadingField === "signatureUrl"}
                  onChange={(signatureUrl) => setFormData({ ...formData, signatureUrl })}
                  onUpload={(files) => void uploadTemplateAsset("signatureUrl", files)}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(event) => setFormData({ ...formData, active: event.target.checked })}
                  className="rounded border-white/10 bg-slate-950"
                />
                Active template
              </label>
              <div className="grid gap-2 sm:flex sm:justify-end">
                <Button variant="secondary" onClick={closeDrawer}>Cancel</Button>
                <Button onClick={saveTemplate} disabled={saving}>
                  {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {editingTemplate ? "Update Template" : "Create Template"}
                </Button>
              </div>
            </div>
          </AdminPanel>
        </div>
      </AdminDrawer>

      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
        danger
        title="Delete Certificate Template"
        description={`Delete "${deleteTarget?.name}"? Existing certificate records remain, but this design can no longer be used.`}
        confirmLabel="Delete Template"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={deleteTemplate}
      />
    </div>
  );
}

function TemplateMeta({ template }: { template: CertificateTemplate }) {
  const templateJson = template.templateJson ?? {};
  return (
    <>
      <p><span className="text-slate-500">Prefix:</span> {String(templateJson.certificateNumberPrefix ?? "N/A")}</p>
      <p><span className="text-slate-500">Expiry:</span> {String(templateJson.expiryDays ?? 365)} days</p>
    </>
  );
}

function TemplatePreview({ template, form, compact }: { template?: CertificateTemplate; form?: TemplateFormData; compact?: boolean }) {
  const templateJson = template?.templateJson ?? {};
  const colours = (templateJson.colours as Record<string, string> | undefined) ?? {};
  const title = form?.title ?? String(templateJson.title ?? "Certificate of Achievement");
  const name = form?.name ?? template?.name ?? "Certified HouseLink Agent";
  const primary = form?.primaryColor ?? colours.primary ?? "#008b68";
  const accent = form?.accentColor ?? colours.accent ?? "#c6a15b";
  const logoUrl = form?.logoUrl ?? template?.logoUrl ?? "";
  const signatureUrl = form?.signatureUrl ?? template?.signatureUrl ?? "";
  const backgroundUrl = form?.backgroundUrl ?? template?.backgroundUrl ?? "";
  const prefix = form?.certificateNumberPrefix ?? String(templateJson.certificateNumberPrefix ?? "HLA");

  return (
    <div
      className="relative min-h-44 overflow-hidden bg-slate-950 p-4"
      style={{
        backgroundImage: backgroundUrl ? `linear-gradient(rgba(2,6,23,.84), rgba(2,6,23,.9)), url(${backgroundUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: primary }} />
      <div className="rounded-xl border border-white/10 bg-slate-950/80 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="size-10 shrink-0 rounded-lg object-contain" />
            ) : (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${primary}22`, color: primary }}>
                <Award className="size-5" />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{prefix}-000001</p>
              <h4 className="break-words text-base font-bold text-white [overflow-wrap:anywhere]">{title}</h4>
            </div>
          </div>
          <Palette className="size-4 shrink-0" style={{ color: accent }} />
        </div>
        <div className={compact ? "mt-5" : "mt-8"}>
          <p className="text-xs uppercase tracking-wider text-slate-500">Presented to</p>
          <p className="mt-1 text-xl font-bold text-white">Learner Name</p>
          <p className="mt-2 text-sm text-slate-300">For successfully completing {name || "the selected course"}.</p>
        </div>
        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <div className="h-0.5 w-24" style={{ backgroundColor: accent }} />
            <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">Issued by HouseLink Academy</p>
          </div>
          {signatureUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={signatureUrl} alt="" className="h-8 max-w-24 object-contain" />
          )}
        </div>
      </div>
      {!compact && (
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <Eye className="size-3" />
          Live preview
        </div>
      )}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-600 focus:border-emerald-500/40 focus:outline-none"
      />
    </label>
  );
}

function TemplateImageField({
  label,
  value,
  uploading,
  onChange,
  onUpload,
}: {
  label: string;
  value: string;
  uploading: boolean;
  onChange: (value: string) => void;
  onUpload: (files: FileList | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="block min-w-0">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {uploading ? "Uploading..." : "Upload"}
          </Button>
          {value ? (
            <Button type="button" variant="secondary" disabled={uploading} onClick={() => onChange("")}>
              Clear
            </Button>
          ) : null}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(event) => onUpload(event.currentTarget.files)} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste an image URL or upload a file"
        className="w-full min-w-0 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-600 focus:border-emerald-500/40 focus:outline-none"
      />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-300">{label}</span>
      <div className="flex min-w-0 gap-2">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-12 shrink-0 rounded border border-white/10 bg-slate-950" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500/40 focus:outline-none"
        />
      </div>
    </label>
  );
}

function readTemplateFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("File could not be read."));
    reader.readAsDataURL(file);
  });
}
