"use client";

import {
  Building2,
  CheckCircle2,
  ChevronDown,
  Globe2,
  Home,
  KeyRound,
  MapPin,
  Sparkles,
  Star,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";

const SERVICES = [
  { id: "sell", label: "Sell Property", icon: Home },
  { id: "rent", label: "Rent Out Property", icon: KeyRound },
  { id: "manage", label: "Property Management", icon: Building2 },
  { id: "tenants", label: "Find Tenants", icon: Users },
  { id: "valuation", label: "Property Valuation", icon: Sparkles },
  { id: "commercial", label: "Commercial Property", icon: Building2 },
  { id: "diaspora", label: "Diaspora Services", icon: Globe2 },
] as const;

type Stats = {
  consultants: number;
  propertiesManaged: number;
  rating: number;
  transactionValue: string;
};

type SuccessData = {
  requestNumber: string;
  requestId: string;
};

const inputClass =
  "w-full rounded-xl border border-slate-200/80 bg-white/90 px-4 py-2.5 text-sm shadow-inner placeholder:text-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800/80";

export function PropertyManagementHeroCard() {
  const { user, showToast } = useApp();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [service, setService] = useState("manage");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [form, setForm] = useState({ fullName: "", phone: "", location: "" });

  const activeService = SERVICES.find((s) => s.id === service) ?? SERVICES[2];
  const ActiveIcon = activeService.icon;

  useEffect(() => {
    void apiFetch<Stats>("/api/v1/property-management/stats").then((r) => {
      if (r.data) setStats(r.data);
    });
  }, []);

  useEffect(() => {
    if (user?.name) setForm((f) => ({ ...f, fullName: user.name, phone: user.phone ?? f.phone }));
  }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const result = await apiFetch<SuccessData & { requestNumber: string; request: { id: string } }>(
      "/api/v1/property-management/requests/public",
      {
        method: "POST",
        body: JSON.stringify({
          fullName: form.fullName,
          phone: form.phone,
          location: form.location,
          services: [service],
        }),
      },
    );
    setSubmitting(false);
    if (result.data) {
      setSuccess({
        requestNumber: result.data.requestNumber,
        requestId: result.data.request?.id ?? "",
      });
    } else {
      showToast(result.error?.message ?? "Submission failed.", "error");
    }
  }

  if (success) {
    return (
      <div className="hero-pm-card hero-pm-float relative w-full max-w-md">
        <div className="overflow-hidden rounded-3xl border border-white/50 bg-white/90 shadow-2xl shadow-emerald-900/15 backdrop-blur-xl dark:bg-slate-900/90">
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400" />
          <div className="p-7">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-700 shadow-inner">
              <CheckCircle2 className="size-8" />
            </div>
            <h3 className="mt-4 text-center text-2xl font-bold text-ink dark:text-white">Request Received</h3>
            <p className="mt-2 text-center text-slate-600 dark:text-slate-300">
              Reference <span className="font-semibold text-emerald-700">{success.requestNumber}</span>
            </p>
            <p className="mt-1 text-center text-sm text-slate-500">
              A HomeLink Property Consultant will contact you shortly.
            </p>
            <div className="mt-6 space-y-3">
              {[
                { label: "Request Submitted", done: true },
                { label: "Being Reviewed", done: true },
                { label: "Consultant Assignment", done: true },
                { label: "Contact Within 24 Hours", done: false },
              ].map((step, i) => (
                <div key={step.label} className="flex items-center gap-3">
                  <span
                    className={`flex size-6 items-center justify-center rounded-full text-xs ${
                      step.done ? "bg-emerald-600 text-white" : "border border-slate-300 text-slate-400"
                    }`}
                  >
                    {step.done ? "check" : i + 1}
                  </span>
                  <span className={step.done ? "text-slate-800 dark:text-slate-200" : "text-slate-500"}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-8 grid gap-2">
              {user ? (
                <Button className="w-full" onClick={() => router.push("/dashboard/owner")}>
                  View Dashboard
                </Button>
              ) : (
                <Button className="w-full" onClick={() => router.push("/auth")}>
                  Sign in to Track Request
                </Button>
              )}
              <Button variant="secondary" className="w-full" onClick={() => router.push("/property-management")}>
                Full Request Form
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => setSuccess(null)}>
                Return Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hero-pm-card hero-pm-float relative w-full max-w-md">
      <div className="pointer-events-none absolute -right-4 -top-4 size-24 rounded-full bg-emerald-400/25 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 size-28 rounded-full bg-cyan-400/20 blur-2xl" />
      <MapPin className="pointer-events-none absolute -left-1 top-1/3 size-5 text-emerald-500/35 animate-pulse" />
      <Sparkles className="pointer-events-none absolute right-3 top-10 size-4 text-amber-400/50" />

      <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/90 shadow-2xl shadow-emerald-900/20 backdrop-blur-xl transition hover:shadow-emerald-900/25 dark:border-white/10 dark:bg-slate-900/90">
        <div className="h-1.5 bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-400" />

        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-lg shadow-lg shadow-emerald-900/25">
              HL
            </span>
            <div>
              <h2 className="text-lg font-bold leading-tight text-ink dark:text-white sm:text-xl">
                Let HomeLink Manage Your Property
              </h2>
              <p className="mt-1 text-sm leading-snug text-slate-600 dark:text-slate-300">
                Expert consultants for selling, renting &amp; managing across Zimbabwe.
              </p>
            </div>
          </div>

          <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Service required
              </span>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600">
                  <ActiveIcon className="size-4" />
                </span>
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className={`${inputClass} appearance-none pl-10 pr-10 font-medium text-slate-800`}
                >
                  {SERVICES.map(({ id, label }) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              </div>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                required
                placeholder="Full name"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className={inputClass}
              />
              <input
                required
                type="tel"
                placeholder="Phone number"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputClass}
              />
            </div>

            <input
              required
              placeholder="Property location (e.g. Avondale, Harare)"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className={inputClass}
            />

            <Button
              type="submit"
              className="h-11 w-full bg-gradient-to-r from-emerald-700 to-teal-700 text-sm font-semibold shadow-lg shadow-emerald-900/25 hover:from-emerald-800 hover:to-teal-800"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Request a Property Consultant"}
            </Button>

            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-500">
              {["Free consultation", "Verified consultants", "Fast response"].map((item) => (
                <span key={item} className="inline-flex items-center gap-1">
                  <CheckCircle2 className="size-3 text-emerald-500" />
                  {item}
                </span>
              ))}
            </div>
          </form>

          {stats && (
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-200/60 pt-4 dark:border-slate-700 sm:grid-cols-4">
              <TrustStat icon={Users} value={stats.consultants.toLocaleString()} label="Consultants" />
              <TrustStat icon={Home} value={stats.propertiesManaged.toLocaleString()} label="Managed" />
              <TrustStat icon={Star} value={`${stats.rating}/5`} label="Rating" />
              <TrustStat icon={Wallet} value={stats.transactionValue} label="Volume" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TrustStat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-emerald-100/80 bg-gradient-to-br from-emerald-50/90 to-white p-2.5 text-center shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/40 dark:to-slate-900/40">
      <span className="mx-auto flex size-7 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-slate-800">
        <Icon className="size-3.5 text-emerald-600" />
      </span>
      <p className="mt-1.5 text-sm font-bold leading-tight text-ink dark:text-white">{value}</p>
      <p className="text-[10px] leading-tight text-slate-500">{label}</p>
    </div>
  );
}
