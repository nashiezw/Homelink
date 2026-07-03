"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";

const SERVICE_TYPES = [
  { id: "full_management", label: "Full property management" },
  { id: "tenant_find", label: "Tenant finding only" },
  { id: "rental_collection", label: "Rental collection" },
  { id: "sale_management", label: "Sale management" },
  { id: "vacant_care", label: "Vacant property care" },
];

const PROPERTY_TYPES = ["house", "flat", "cottage", "room", "land", "commercial"];

export function PropertyManagementForm() {
  const { user, showToast } = useApp();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    propertyAddress: "",
    city: "Harare",
    suburb: "",
    propertyType: "house",
    serviceType: "full_management",
    bedrooms: "",
    description: "",
    ownerPhone: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      showToast("Please sign in first.", "info");
      router.push("/auth?next=/dashboard/owner/submit");
      return;
    }
    setSubmitting(true);
    const result = await apiFetch<{ request: { id: string; requestNumber: string } }>("/api/v1/property-management/requests", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (result.data) {
      showToast(`Request ${result.data.request.requestNumber} submitted!`);
      router.push("/dashboard/owner");
    } else {
      showToast(result.error?.message ?? "Submission failed.", "error");
    }
  }

  return (
    <PageShell
      eyebrow="Property Management"
      title="Let HomeLink manage your property"
      description="Submit your property for professional management. Our AI will match you with the best consultant in your area."
    >
      <form onSubmit={(e) => void submit(e)} className="mx-auto max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <label className="block">
          <span className="text-sm font-medium">Property address *</span>
          <input required value={form.propertyAddress} onChange={(e) => setForm({ ...form, propertyAddress: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-800" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">City *</span>
            <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-800" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Suburb</span>
            <input value={form.suburb} onChange={(e) => setForm({ ...form, suburb: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-800" />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">Property type *</span>
            <select value={form.propertyType} onChange={(e) => setForm({ ...form, propertyType: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-800">
              {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Bedrooms</span>
            <input type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-800" />
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-medium">Service required *</span>
          <select value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-800">
            {SERVICE_TYPES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Contact phone</span>
          <input value={form.ownerPhone} onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-800" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Description *</span>
          <textarea required rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-800" placeholder="Tell us about your property and requirements..." />
        </label>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit property management request"}
        </Button>
        <p className="text-center text-xs text-slate-500">
          On submit: request number generated, CRM lead created, consultant assigned by AI, notifications sent.
        </p>
      </form>
    </PageShell>
  );
}
