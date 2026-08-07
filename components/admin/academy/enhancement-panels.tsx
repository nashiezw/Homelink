"use client";

import { useState, useEffect, useCallback } from "react";
import { Mail, Users, CreditCard, Plus, Pencil, Trash2, CheckCircle2, XCircle, Download, RefreshCw } from "lucide-react";
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

export function EmailTemplatesManagementPanel() {
  const { showToast } = useApp();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState<"create" | "edit" | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState({
    templateKey: "",
    language: "en",
    subject: "",
    htmlContent: "",
    textContent: "",
    active: true,
  });

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

  const handleCreate = async () => {
    const result = await apiFetch("/api/v1/admin/academy/email-templates", {
      method: "POST",
      body: JSON.stringify(formData),
    });
    if (result.data) {
      showToast("Email template created successfully");
      setDrawer(null);
      setFormData({ templateKey: "", language: "en", subject: "", htmlContent: "", textContent: "", active: true });
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

  const handleDelete = async (id: string) => {
    const result = await apiFetch(`/api/v1/admin/academy/email-templates?id=${id}`, {
      method: "DELETE",
    });
    if (result.data) {
      showToast("Email template deleted successfully");
      void loadTemplates();
    } else {
      showToast(result.error?.message ?? "Failed to delete template", "error");
    }
  };

  const filteredTemplates = templates.filter((t) =>
    t.templateKey.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <AdminFilterBar>
        <AdminSearchInput value={search} onChange={setSearch} placeholder="Search templates..." className="lg:flex-1" />
        <Button onClick={() => { setFormData({ templateKey: "", language: "en", subject: "", htmlContent: "", textContent: "", active: true }); setDrawer("create"); }}>
          <Plus className="size-4" /> New Template
        </Button>
      </AdminFilterBar>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="size-8 animate-spin text-slate-400" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <AdminEmptyState icon={Mail} title="No email templates found" description="Create your first email template to get started" />
      ) : (
        <AdminDataTable
          rows={filteredTemplates}
          columns={[
            { key: "templateKey", header: "Template Key", render: (t) => <span className="font-mono text-sm">{t.templateKey}</span> },
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
                  <Button variant="ghost" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="size-4 text-red-400" />
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}

      <AdminDrawer open={Boolean(drawer)} onClose={() => setDrawer(null)} title={drawer === "create" ? "Create Email Template" : "Edit Email Template"}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Template Key</label>
            <input
              type="text"
              value={formData.templateKey}
              onChange={(e) => setFormData({ ...formData, templateKey: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white"
              placeholder="e.g., course_welcome"
              disabled={drawer === "edit"}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Language</label>
            <select
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Subject</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white"
              placeholder="Email subject line"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">HTML Content</label>
            <textarea
              value={formData.htmlContent}
              onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white min-h-[200px]"
              placeholder="HTML email content"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Text Content (Optional)</label>
            <textarea
              value={formData.textContent}
              onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white min-h-[100px]"
              placeholder="Plain text fallback"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="rounded border-white/10 bg-slate-900"
            />
            <label htmlFor="active" className="text-sm text-slate-300">Active</label>
          </div>
          <Button onClick={drawer === "create" ? handleCreate : handleUpdate} className="w-full">
            {drawer === "create" ? "Create Template" : "Update Template"}
          </Button>
        </div>
      </AdminDrawer>
    </div>
  );
}

export function BrandingManagementPanel() {
  const { showToast } = useApp();
  const [branding, setBranding] = useState<BrandingSettings>({});
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Academy Branding</h3>
        <Button variant="ghost" onClick={handleReset}>
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
            <label className="block text-sm font-medium text-slate-300 mb-1">Logo URL</label>
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

  const handleDelete = async (id: string) => {
    const result = await apiFetch(`/api/v1/admin/academy/instructors?id=${id}`, {
      method: "DELETE",
    });
    if (result.data) {
      showToast("Instructor removed successfully");
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
                <Button variant="ghost" onClick={() => handleDelete(i.id)}>
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
    </div>
  );
}

export function RefundsManagementPanel() {
  const { showToast } = useApp();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

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

  const handleProcess = async (refundId: string, actionType: "approve" | "reject" | "process") => {
    const result = await apiFetch("/api/v1/admin/academy/refunds", {
      method: "PATCH",
      body: JSON.stringify({ refundId, action: actionType }),
    });
    if (result.data) {
      showToast(`Refund ${actionType}d successfully`);
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
                    <Button variant="ghost" onClick={() => handleProcess(r.id, "approve")}>
                      <CheckCircle2 className="size-4 text-green-400" />
                    </Button>
                    <Button variant="ghost" onClick={() => handleProcess(r.id, "reject")}>
                      <XCircle className="size-4 text-red-400" />
                    </Button>
                  </div>
                ) : r.status === "APPROVED" ? (
                  <Button onClick={() => handleProcess(r.id, "process")}>
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
    </div>
  );
}
