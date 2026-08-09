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

type CertificateCourseOption = {
  id: string;
  title: string;
  status: string;
};

type CertificateTemplatePayload = {
  templates: CertificateTemplate[];
  courses: CertificateCourseOption[];
};

type TemplateFormData = {
  name: string;
  backgroundUrl: string;
  logoUrl: string;
  signatureUrl: string;
  secondSignatureUrl: string;
  sealUrl: string;
  leftLaurelUrl: string;
  rightLaurelUrl: string;
  courseIds: string[];
  certificateNumberPrefix: string;
  title: string;
  designation: string;
  signatureName: string;
  signatureTitle: string;
  secondSignatureName: string;
  secondSignatureTitle: string;
  customHtml: string;
  customCss: string;
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
  secondSignatureUrl: "",
  sealUrl: "",
  leftLaurelUrl: "",
  rightLaurelUrl: "",
  courseIds: [],
  certificateNumberPrefix: "HLZA",
  title: "Certificate of Completion - HouseLink Training Programme",
  designation: "Certified HouseLink Agent",
  signatureName: "T. Ndudzo",
  signatureTitle: "Director of Training & Certification",
  secondSignatureName: "W. Tigere",
  secondSignatureTitle: "Academy Director",
  customHtml: "",
  customCss: "",
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
  const [courses, setCourses] = useState<CertificateCourseOption[]>([]);
  const [uploadingField, setUploadingField] = useState<"backgroundUrl" | "logoUrl" | "signatureUrl" | "secondSignatureUrl" | "sealUrl" | "leftLaurelUrl" | "rightLaurelUrl" | null>(null);

  const activeTemplates = useMemo(() => templates.filter((template) => template.active).length, [templates]);

  useEffect(() => {
    void loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadTemplates() {
    setLoading(true);
    const result = await apiFetch<CertificateTemplatePayload>("/api/v1/admin/academy/certificates/templates?includeCourses=1");
    if (result.data) {
      setTemplates(result.data.templates);
      setCourses(result.data.courses.map((course) => ({ id: course.id, title: course.title, status: course.status })));
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
        courseIds: formData.courseIds,
        title: trainingCertificateTitle(formData.title.trim() || "Certificate of Completion - HouseLink Training Programme"),
        designation: formData.designation.trim() || "Certified HouseLink Agent",
        signatureName: formData.signatureName.trim() || "T. Ndudzo",
        signatureTitle: formData.signatureTitle.trim() || "Director of Training & Certification",
        secondSignatureUrl: formData.secondSignatureUrl.trim() || null,
        secondSignatureName: formData.secondSignatureName.trim() || "W. Tigere",
        secondSignatureTitle: formData.secondSignatureTitle.trim() || "Academy Director",
        sealUrl: formData.sealUrl.trim() || null,
        leftLaurelUrl: formData.leftLaurelUrl.trim() || null,
        rightLaurelUrl: formData.rightLaurelUrl.trim() || null,
        customHtml: formData.customHtml.trim(),
        customCss: formData.customCss.trim(),
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
      secondSignatureUrl: String(templateJson.secondSignatureUrl ?? ""),
      sealUrl: String(templateJson.sealUrl ?? ""),
      leftLaurelUrl: String(templateJson.leftLaurelUrl ?? ""),
      rightLaurelUrl: String(templateJson.rightLaurelUrl ?? ""),
      courseIds: Array.isArray(templateJson.courseIds) ? templateJson.courseIds.filter((id): id is string => typeof id === "string") : [],
      certificateNumberPrefix: String(templateJson.certificateNumberPrefix ?? "HLA"),
      title: trainingCertificateTitle(String(templateJson.title ?? "Certificate of Completion - HouseLink Training Programme")),
      designation: String(templateJson.designation ?? "Certified HouseLink Agent"),
      signatureName: String(templateJson.signatureName ?? "T. Ndudzo"),
      signatureTitle: String(templateJson.signatureTitle ?? "Director of Training & Certification"),
      secondSignatureName: String(templateJson.secondSignatureName ?? "W. Tigere"),
      secondSignatureTitle: String(templateJson.secondSignatureTitle ?? "Academy Director"),
      customHtml: String(templateJson.customHtml ?? ""),
      customCss: String(templateJson.customCss ?? ""),
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

  async function uploadTemplateAsset(field: "backgroundUrl" | "logoUrl" | "signatureUrl" | "secondSignatureUrl" | "sealUrl" | "leftLaurelUrl" | "rightLaurelUrl", files: FileList | null) {
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
                  <TemplateMeta template={template} courses={courses} />
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
              <FormSectionEyebrow title="Certificate wording" description="The visible title, graduate line, certificate number prefix, and expiry rules." />
              <div className="grid gap-4 rounded-xl border border-white/10 bg-slate-950/40 p-4">
                <TextField label="Template Name" value={formData.name} onChange={(name) => setFormData({ ...formData, name })} placeholder="HouseLink Agent Foundations Certificate" />
                <TextField label="Certificate Title" value={formData.title} onChange={(title) => setFormData({ ...formData, title })} placeholder="Certificate of Completion - HouseLink Agent Foundations" />
                <TextField label="Certificate Designation Line" value={formData.designation} onChange={(designation) => setFormData({ ...formData, designation })} placeholder="Certified HouseLink Agent" />
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
              </div>

              <FormSectionEyebrow title="Course assignment" description="Choose which course uses this certificate. Leave empty only when this should be the global fallback." />
              <CourseAssignmentField
                courses={courses}
                selectedIds={formData.courseIds}
                onChange={(courseIds) => setFormData({ ...formData, courseIds })}
              />

              <FormSectionEyebrow title="Brand artwork" description="Upload transparent artwork where possible so the certificate remains clean on download." />
              <div className="grid gap-4 rounded-xl border border-white/10 bg-slate-950/40 p-4">
                <TemplateImageField
                  label="Background Image"
                  ratio="Best ratio: 1.414:1 landscape, ideally 2800 x 1980px or larger"
                  description="Use a subtle certificate paper texture or full artwork background. Avoid busy images behind text."
                  value={formData.backgroundUrl}
                  uploading={uploadingField === "backgroundUrl"}
                  onChange={(backgroundUrl) => setFormData({ ...formData, backgroundUrl })}
                  onUpload={(files) => void uploadTemplateAsset("backgroundUrl", files)}
                />
                <TemplateImageField
                  label="Logo"
                  ratio="Best ratio: 4:1 horizontal, transparent PNG or SVG"
                  description="Use the full HouseLink lockup for the top of the certificate."
                  value={formData.logoUrl}
                  uploading={uploadingField === "logoUrl"}
                  onChange={(logoUrl) => setFormData({ ...formData, logoUrl })}
                  onUpload={(files) => void uploadTemplateAsset("logoUrl", files)}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <ColorField label="Primary Color" value={formData.primaryColor} onChange={(primaryColor) => setFormData({ ...formData, primaryColor })} />
                  <ColorField label="Accent Color" value={formData.accentColor} onChange={(accentColor) => setFormData({ ...formData, accentColor })} />
                </div>
              </div>

              <FormSectionEyebrow title="Signatures, seal and laurels" description="These assets sit in the lower certificate band and side ornaments." />
              <div className="grid gap-4 sm:grid-cols-2">
                <AdminPanel title="Left Signature" description="Director or academy signatory on the lower-left side.">
                  <div className="grid gap-4">
                    <TextField label="Left Signature Name" value={formData.secondSignatureName} onChange={(secondSignatureName) => setFormData({ ...formData, secondSignatureName })} />
                    <TextField label="Left Signature Title" value={formData.secondSignatureTitle} onChange={(secondSignatureTitle) => setFormData({ ...formData, secondSignatureTitle })} />
                    <TemplateImageField
                      label="Left Signature Image"
                      ratio="Best ratio: 4:1 to 5:1, transparent PNG, around 900 x 220px"
                      description="Upload only the signature mark with transparent background."
                      value={formData.secondSignatureUrl}
                      uploading={uploadingField === "secondSignatureUrl"}
                      onChange={(secondSignatureUrl) => setFormData({ ...formData, secondSignatureUrl })}
                      onUpload={(files) => void uploadTemplateAsset("secondSignatureUrl", files)}
                    />
                  </div>
                </AdminPanel>
                <AdminPanel title="Right Signature" description="Director or certification signatory on the lower-right side.">
                  <div className="grid gap-4">
                    <TextField label="Right Signature Name" value={formData.signatureName} onChange={(signatureName) => setFormData({ ...formData, signatureName })} />
                    <TextField label="Right Signature Title" value={formData.signatureTitle} onChange={(signatureTitle) => setFormData({ ...formData, signatureTitle })} />
                    <TemplateImageField
                      label="Right Signature Image"
                      ratio="Best ratio: 4:1 to 5:1, transparent PNG, around 900 x 220px"
                      description="Upload only the signature mark with transparent background."
                      value={formData.signatureUrl}
                      uploading={uploadingField === "signatureUrl"}
                      onChange={(signatureUrl) => setFormData({ ...formData, signatureUrl })}
                      onUpload={(files) => void uploadTemplateAsset("signatureUrl", files)}
                    />
                  </div>
                </AdminPanel>
              </div>
              <AdminPanel title="Certificate Ornaments" description="Optional custom seal and side laurels. Leave blank to use the generated HouseLink artwork.">
                <div className="grid gap-4">
                  <TemplateImageField
                    label="Centre Seal Image"
                    ratio="Best ratio: 1:1 square, transparent PNG, 800 x 800px"
                    description="Use a circular seal or badge. Transparent background works best."
                    value={formData.sealUrl}
                    uploading={uploadingField === "sealUrl"}
                    onChange={(sealUrl) => setFormData({ ...formData, sealUrl })}
                    onUpload={(files) => void uploadTemplateAsset("sealUrl", files)}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TemplateImageField
                      label="Left Laurel Image"
                      ratio="Best ratio: 2:5 vertical, transparent PNG, around 500 x 1250px"
                      description="Upload one slim left-side ornament. Keep empty space trimmed tightly."
                      value={formData.leftLaurelUrl}
                      uploading={uploadingField === "leftLaurelUrl"}
                      onChange={(leftLaurelUrl) => setFormData({ ...formData, leftLaurelUrl })}
                      onUpload={(files) => void uploadTemplateAsset("leftLaurelUrl", files)}
                    />
                    <TemplateImageField
                      label="Right Laurel Image"
                      ratio="Best ratio: 2:5 vertical, transparent PNG, around 500 x 1250px"
                      description="Upload a matching right-side ornament. Use the same visual height as the left laurel."
                      value={formData.rightLaurelUrl}
                      uploading={uploadingField === "rightLaurelUrl"}
                      onChange={(rightLaurelUrl) => setFormData({ ...formData, rightLaurelUrl })}
                      onUpload={(files) => void uploadTemplateAsset("rightLaurelUrl", files)}
                    />
                  </div>
                </div>
              </AdminPanel>
              <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
                <div>
                  <p className="font-semibold text-white">Advanced Design</p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">Optional HTML/CSS override. Use tokens like {"{{learnerName}}"}, {"{{courseTitle}}"}, {"{{certificateTitle}}"}, {"{{designation}}"}, {"{{certificateNumber}}"}, {"{{issuedAt}}"}, {"{{expiresAt}}"}, {"{{verifyUrl}}"}, {"{{signatureUrl}}"}, {"{{secondSignatureUrl}}"}, {"{{sealUrl}}"}, {"{{leftLaurelUrl}}"}, and {"{{rightLaurelUrl}}"}. Leave blank to use the standard HouseLink design.</p>
                </div>
                <div className="grid gap-4">
                  <TextAreaField label="Custom HTML" value={formData.customHtml} onChange={(customHtml) => setFormData({ ...formData, customHtml })} rows={8} placeholder="<section class='certificate'>...</section>" />
                  <TextAreaField label="Custom CSS" value={formData.customCss} onChange={(customCss) => setFormData({ ...formData, customCss })} rows={6} placeholder=".certificate { ... }" />
                </div>
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

function TemplateMeta({ template, courses }: { template: CertificateTemplate; courses: CertificateCourseOption[] }) {
  const templateJson = template.templateJson ?? {};
  const courseIds = Array.isArray(templateJson.courseIds) ? templateJson.courseIds.filter((id): id is string => typeof id === "string") : [];
  const courseNames = courseIds
    .map((id) => courses.find((course) => course.id === id)?.title ?? id)
    .join(", ");
  return (
    <>
      <p><span className="text-slate-500">Prefix:</span> {String(templateJson.certificateNumberPrefix ?? "N/A")}</p>
      <p><span className="text-slate-500">Expiry:</span> {String(templateJson.expiryDays ?? 365)} days</p>
      <p><span className="text-slate-500">Courses:</span> {courseIds.length ? courseNames : "Global fallback"}</p>
      <p><span className="text-slate-500">Signatures:</span> {template.signatureUrl || templateJson.secondSignatureUrl ? "Configured" : "Default typed names"}</p>
      <p><span className="text-slate-500">Seal:</span> {templateJson.sealUrl ? "Custom image" : "Generated HouseLink seal"}</p>
      <p><span className="text-slate-500">Laurels:</span> {templateJson.leftLaurelUrl || templateJson.rightLaurelUrl ? "Custom images" : "Generated gold laurels"}</p>
      {templateJson.customHtml ? <p><span className="text-slate-500">Design:</span> Custom HTML</p> : null}
    </>
  );
}

function trainingCertificateTitle(title: string) {
  if (/^Certified HouseLink Agent$/i.test(title.trim())) return "Certificate of Completion - HouseLink Agent Foundations";
  if (/HouseLink Certified Agent - Foundations/i.test(title)) return "Certificate of Completion - HouseLink Agent Foundations";
  if (/HouseLink Certified Agent - Listing & Client Mastery/i.test(title)) return "Certificate of Completion - HouseLink Listing & Client Mastery";
  if (/HouseLink Certified Professional Agent/i.test(title)) return "Certificate of Completion - HouseLink Professional Training";
  return title;
}

function TemplatePreview({ template, form, compact }: { template?: CertificateTemplate; form?: TemplateFormData; compact?: boolean }) {
  const templateJson = template?.templateJson ?? {};
  const colours = (templateJson.colours as Record<string, string> | undefined) ?? {};
  const title = form?.title ?? String(templateJson.title ?? "Certificate of Achievement");
  const designation = form?.designation ?? String(templateJson.designation ?? "Certified HouseLink Agent");
  const name = form?.name ?? template?.name ?? "HouseLink Agent Foundations Certificate";
  const primary = form?.primaryColor ?? colours.primary ?? "#008b68";
  const accent = form?.accentColor ?? colours.accent ?? "#c6a15b";
  const logoUrl = form?.logoUrl ?? template?.logoUrl ?? "";
  const signatureUrl = form?.signatureUrl ?? template?.signatureUrl ?? "";
  const secondSignatureUrl = form?.secondSignatureUrl ?? String(templateJson.secondSignatureUrl ?? "");
  const sealUrl = form?.sealUrl ?? String(templateJson.sealUrl ?? "");
  const leftLaurelUrl = form?.leftLaurelUrl ?? String(templateJson.leftLaurelUrl ?? "");
  const rightLaurelUrl = form?.rightLaurelUrl ?? String(templateJson.rightLaurelUrl ?? "");
  const backgroundUrl = form?.backgroundUrl ?? template?.backgroundUrl ?? "";
  const prefix = form?.certificateNumberPrefix ?? String(templateJson.certificateNumberPrefix ?? "HLA");
  const hasCustomDesign = Boolean(form?.customHtml?.trim() || templateJson.customHtml);

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
          <p className="mt-2 break-words text-sm font-bold uppercase tracking-wider text-emerald-300 [overflow-wrap:anywhere]">{designation}</p>
          {hasCustomDesign ? <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-amber-200">Custom HTML design enabled</p> : null}
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
          {secondSignatureUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={secondSignatureUrl} alt="" className="h-8 max-w-24 object-contain" />
          )}
          {sealUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sealUrl} alt="" className="size-10 object-contain" />
          )}
          {leftLaurelUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={leftLaurelUrl} alt="" className="h-10 max-w-8 object-contain" />
          )}
          {rightLaurelUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={rightLaurelUrl} alt="" className="h-10 max-w-8 object-contain" />
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

function CourseAssignmentField({
  courses,
  selectedIds,
  onChange,
}: {
  courses: CertificateCourseOption[];
  selectedIds: string[];
  onChange: (courseIds: string[]) => void;
}) {
  function toggle(courseId: string) {
    onChange(selectedIds.includes(courseId) ? selectedIds.filter((id) => id !== courseId) : [...selectedIds, courseId]);
  }

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Assigned Courses</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">Select one or more courses for this template. If none are selected, it becomes the global fallback template.</p>
        </div>
        {selectedIds.length ? (
          <Button type="button" variant="secondary" onClick={() => onChange([])}>Use as Global</Button>
        ) : null}
      </div>
      <div className="mt-4 grid gap-2">
        {courses.length ? courses.map((course) => (
          <label key={course.id} className="flex min-w-0 items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={selectedIds.includes(course.id)}
              onChange={() => toggle(course.id)}
              className="mt-1 rounded border-white/10 bg-slate-950"
            />
            <span className="min-w-0">
              <span className="block break-words font-semibold text-white [overflow-wrap:anywhere]">{course.title}</span>
              <span className="text-xs uppercase tracking-wider text-slate-500">{course.status}</span>
            </span>
          </label>
        )) : (
          <p className="rounded-lg border border-dashed border-white/10 p-3 text-sm text-slate-500">Courses could not be loaded. You can still save this as a global fallback template.</p>
        )}
      </div>
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

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-300">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full min-w-0 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 font-mono text-sm text-white placeholder:text-slate-600 focus:border-emerald-500/40 focus:outline-none"
      />
    </label>
  );
}

function FormSectionEyebrow({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/[0.04] px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function TemplateImageField({
  label,
  ratio,
  description,
  value,
  uploading,
  onChange,
  onUpload,
}: {
  label: string;
  ratio: string;
  description?: string;
  value: string;
  uploading: boolean;
  onChange: (value: string) => void;
  onUpload: (files: FileList | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="block min-w-0 rounded-xl border border-white/10 bg-slate-950/60 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <span className="text-sm font-semibold text-white">{label}</span>
          <p className="mt-1 text-xs font-medium text-emerald-300">{ratio}</p>
          {description ? <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={uploading} onClick={() => inputRef.current?.click()} className="min-w-28">
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
      <div className="mt-3 grid gap-3 sm:grid-cols-[96px_minmax(0,1fr)]">
        <div className="flex h-20 w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-white/10 bg-slate-900/70 sm:w-24">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-contain p-2" />
          ) : (
            <Upload className="size-5 text-slate-600" />
          )}
        </div>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Paste an image URL or upload a file"
          className="w-full min-w-0 self-center rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-600 focus:border-emerald-500/40 focus:outline-none"
        />
      </div>
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
