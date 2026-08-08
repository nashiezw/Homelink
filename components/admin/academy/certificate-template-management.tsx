"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";

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

export function CertificateTemplateManagement() {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<CertificateTemplate | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [formData, setFormData] = useState({
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
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/admin/academy/certificates/templates");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data || []);
      }
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await fetch("/api/v1/admin/academy/certificates/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          backgroundUrl: formData.backgroundUrl || null,
          logoUrl: formData.logoUrl || null,
          signatureUrl: formData.signatureUrl || null,
          templateJson: {
            certificateNumberPrefix: formData.certificateNumberPrefix,
            title: formData.title,
            colours: {
              primary: formData.primaryColor,
              accent: formData.accentColor,
            },
            expiryDays: formData.expiryDays,
          },
          active: formData.active,
        }),
      });

      if (response.ok) {
        setShowCreateForm(false);
        resetForm();
        loadTemplates();
      }
    } catch (error) {
      console.error("Failed to create template:", error);
    }
  };

  const handleUpdate = async () => {
    if (!editingTemplate) return;

    try {
      const response = await fetch(`/api/v1/admin/academy/certificates/templates/${editingTemplate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          backgroundUrl: formData.backgroundUrl || null,
          logoUrl: formData.logoUrl || null,
          signatureUrl: formData.signatureUrl || null,
          templateJson: {
            certificateNumberPrefix: formData.certificateNumberPrefix,
            title: formData.title,
            colours: {
              primary: formData.primaryColor,
              accent: formData.accentColor,
            },
            expiryDays: formData.expiryDays,
          },
          active: formData.active,
        }),
      });

      if (response.ok) {
        setEditingTemplate(null);
        resetForm();
        loadTemplates();
      }
    } catch (error) {
      console.error("Failed to update template:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const response = await fetch(`/api/v1/admin/academy/certificates/templates/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        loadTemplates();
      }
    } catch (error) {
      console.error("Failed to delete template:", error);
    }
  };

  const handleEdit = (template: CertificateTemplate) => {
    setEditingTemplate(template);
    const templateJson = template.templateJson as Record<string, unknown>;
    const colours = templateJson.colours as Record<string, string> || {};
    
    setFormData({
      name: template.name,
      backgroundUrl: template.backgroundUrl || "",
      logoUrl: template.logoUrl || "",
      signatureUrl: template.signatureUrl || "",
      certificateNumberPrefix: (templateJson.certificateNumberPrefix as string) || "HLA",
      title: (templateJson.title as string) || "Certificate of Achievement",
      primaryColor: colours.primary || "#008b68",
      accentColor: colours.accent || "#c6a15b",
      expiryDays: (templateJson.expiryDays as number) || 365,
      active: template.active,
    });
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setFormData({
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
    });
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-400">Loading templates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Certificate Templates</h3>
          <p className="text-sm text-slate-400">Manage certificate designs and configurations</p>
        </div>
        <Button onClick={() => { setShowCreateForm(true); resetForm(); }}>
          <Plus className="mr-2 size-4" />
          Create Template
        </Button>
      </div>

      {showCreateForm && (
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6 space-y-4">
          <div>
            <h4 className="text-lg font-bold text-white">
              {editingTemplate ? "Edit Template" : "Create New Template"}
            </h4>
            <p className="text-sm text-slate-400">Configure certificate design and settings</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm text-white mb-1">Template Name</label>
              <input
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Certified HouseLink Agent"
                className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-white mb-1">Certificate Title</label>
              <input
                value={formData.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Certificate of Achievement"
                className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm text-white mb-1">Certificate Number Prefix</label>
              <input
                value={formData.certificateNumberPrefix}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, certificateNumberPrefix: e.target.value })}
                placeholder="e.g., HLA"
                className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-white mb-1">Expiry Days</label>
              <input
                type="number"
                value={formData.expiryDays}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, expiryDays: parseInt(e.target.value) })}
                placeholder="365"
                className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm text-white mb-1">Primary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="w-16 h-10 rounded"
                />
                <input
                  value={formData.primaryColor}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, primaryColor: e.target.value })}
                  placeholder="#008b68"
                  className="flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-white mb-1">Accent Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.accentColor}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, accentColor: e.target.value })}
                  className="w-16 h-10 rounded"
                />
                <input
                  value={formData.accentColor}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, accentColor: e.target.value })}
                  placeholder="#c6a15b"
                  className="flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-white mb-1">Background Image URL</label>
            <input
              value={formData.backgroundUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, backgroundUrl: e.target.value })}
              placeholder="https://example.com/background.jpg"
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm text-white mb-1">Logo URL</label>
              <input
                value={formData.logoUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-white mb-1">Signature URL</label>
              <input
                value={formData.signatureUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, signatureUrl: e.target.value })}
                placeholder="https://example.com/signature.png"
                className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, active: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="active" className="text-sm text-white">Active</label>
          </div>

          <div className="flex gap-2">
            <Button onClick={editingTemplate ? handleUpdate : handleCreate}>
              {editingTemplate ? "Update Template" : "Create Template"}
            </Button>
            <Button variant="secondary" onClick={() => { setShowCreateForm(false); setEditingTemplate(null); resetForm(); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <div key={template.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-white text-base">{template.name}</h4>
                <p className="text-xs text-slate-400">{new Date(template.updatedAt).toLocaleDateString()}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${template.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                {template.active ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="space-y-1 text-sm mb-4">
              <p className="text-slate-300">
                <span className="text-slate-500">Prefix:</span> {(template.templateJson as Record<string, unknown>).certificateNumberPrefix as string || "N/A"}
              </p>
              <p className="text-slate-300">
                <span className="text-slate-500">Expiry:</span> {(template.templateJson as Record<string, unknown>).expiryDays as string || "365"} days
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => handleEdit(template)}>
                <Edit className="size-3 mr-1" />
                Edit
              </Button>
              <Button variant="secondary" onClick={() => handleDelete(template.id)}>
                <Trash2 className="size-3 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-8 text-center text-slate-400">
          No certificate templates found. Create your first template to get started.
        </div>
      )}
    </div>
  );
}
