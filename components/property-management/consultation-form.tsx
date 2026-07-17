"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import {
  pmFormTrust,
  pmHelpOptions,
  pmPropertyTypes,
} from "@/lib/property-management/content";

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/15";

const labelClass = "mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500";

type ConsultationFormProps = {
  id?: string;
  className?: string;
  onSuccess?: (requestNumber: string) => void;
};

export function ConsultationForm({ id, className, onSuccess }: ConsultationFormProps) {
  const { user, showToast } = useApp();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    location: "",
    propertyType: "house",
    helpType: "manage",
  });

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        fullName: user.name ?? f.fullName,
        phone: user.phone ?? f.phone,
        email: user.email ?? f.email,
      }));
    }
  }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const result = await apiFetch<{ requestNumber: string; request: { id: string } }>(
      "/api/v1/property-management/requests/public",
      {
        method: "POST",
        body: JSON.stringify({
          fullName: form.fullName,
          phone: form.phone,
          email: form.email,
          location: form.location,
          propertyType: form.propertyType,
          services: [form.helpType],
        }),
      },
    );
    setSubmitting(false);

    if (result.data) {
      const ref = result.data.requestNumber;
      setSuccess(ref);
      onSuccess?.(ref);
      showToast(`Consultation request ${ref} received!`);
    } else {
      showToast(result.error?.message ?? "Submission failed.", "error");
    }
  }

  if (success) {
    return (
      <div
        id={id}
        className={`rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_16px_48px_rgba(16,32,36,0.14)] sm:p-7 ${className ?? ""}`}
      >
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="size-7" />
        </div>
        <h3 className="mt-4 text-center text-xl font-bold text-ink">Request Received</h3>
        <p className="mt-2 text-center text-sm text-slate-600">
          Reference <span className="font-semibold text-emerald-700">{success}</span>
        </p>
        <p className="mt-1 text-center text-sm text-slate-500">
          A HouseLink consultant will contact you within 24 hours.
        </p>
        <div className="mt-6 space-y-2">
          {user ? (
            <Button className="w-full" onClick={() => router.push("/dashboard/owner")}>
              View Dashboard
            </Button>
          ) : (
            <Button className="w-full" onClick={() => router.push("/auth")}>
              Sign in to Track Request
            </Button>
          )}
          <Button variant="secondary" className="w-full" onClick={() => setSuccess(null)}>
            Submit Another Request
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      id={id}
      className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_16px_48px_rgba(16,32,36,0.14)] sm:p-6 ${className ?? ""}`}
    >
      <h2 className="text-lg font-bold text-ink sm:text-xl">
        Get a Free Property Management Consultation
      </h2>

      <form onSubmit={(e) => void submit(e)} className="mt-5 space-y-3">
        <label className="block">
          <span className={labelClass}>Full name</span>
          <input
            required
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            placeholder="Your full name"
            className={fieldClass}
          />
        </label>

        <label className="block">
          <span className={labelClass}>Phone number</span>
          <input
            required
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+263 77 000 0000"
            className={fieldClass}
          />
        </label>

        <label className="block">
          <span className={labelClass}>Email address</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@email.com"
            className={fieldClass}
          />
        </label>

        <label className="block">
          <span className={labelClass}>Property location</span>
          <input
            required
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="e.g. Avondale, Harare"
            className={fieldClass}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Type of property</span>
            <select
              value={form.propertyType}
              onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
              className={fieldClass}
            >
              {pmPropertyTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>How can we help you?</span>
            <select
              value={form.helpType}
              onChange={(e) => setForm({ ...form, helpType: e.target.value })}
              className={fieldClass}
            >
              {pmHelpOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <Button
          type="submit"
          className="mt-1 h-12 w-full rounded-lg bg-emerald-800 text-sm font-semibold hover:bg-emerald-900"
          disabled={submitting}
        >
          {submitting ? "Submitting..." : "Request Free Consultation"}
        </Button>

        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 pt-1">
          {pmFormTrust.map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <Icon className="size-3.5 text-emerald-600" />
              {label}
            </span>
          ))}
        </div>
      </form>
    </div>
  );
}
