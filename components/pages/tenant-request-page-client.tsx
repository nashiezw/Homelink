"use client";

import { CheckCircle2, Home, Loader2, Send, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import type { TenantRequestRecord } from "@/lib/tenant-requests/types";

const rentTypes = [
  ["house", "House"],
  ["cottage", "Cottage"],
  ["flat", "Flat"],
  ["room", "Room"],
  ["room-share", "Room share"],
  ["commercial", "Commercial"],
];

const buyTypes = [
  ["house", "House"],
  ["cottage", "Cottage"],
  ["flat", "Flat"],
  ["land", "Land / stand"],
  ["commercial", "Commercial"],
  ["other", "Other"],
];

const rentMustHaves = ["Ensuite", "Walled and gated", "Borehole", "Solar backup", "Parking", "Pet friendly", "Close to transport", "Close to schools"];
const buyMustHaves = ["Title deeds", "Walled and gated", "Borehole", "Solar backup", "Main road access", "Near schools", "Subdivision potential", "Ready to transfer"];

type FormState = {
  intent: "rent" | "buy";
  name: string;
  phone: string;
  email: string;
  clientType: string;
  propertyType: string;
  bedrooms: string;
  bathrooms: string;
  ensuite: "required" | "preferred" | "not_needed";
  preferredAreas: string;
  alternativeAreas: string;
  maxBudget: string;
  minBudget: string;
  moveInDate: string;
  leaseLength: string;
  purchaseReadiness: string;
  timeline: string;
  adults: string;
  children: string;
  mustHaves: string[];
  notes: string;
};

const initialForm: FormState = {
  intent: "rent",
  name: "",
  phone: "",
  email: "",
  clientType: "individual",
  propertyType: "house",
  bedrooms: "3",
  bathrooms: "",
  ensuite: "preferred",
  preferredAreas: "",
  alternativeAreas: "",
  maxBudget: "",
  minBudget: "",
  moveInDate: "",
  leaseLength: "12 months",
  purchaseReadiness: "cash_ready",
  timeline: "ready_now",
  adults: "",
  children: "",
  mustHaves: ["Ensuite"],
  notes: "",
};

export function TenantRequestPageClient() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<TenantRequestRecord | null>(null);

  const typeOptions = form.intent === "buy" ? buyTypes : rentTypes;
  const featureOptions = useMemo(() => (form.intent === "buy" ? buyMustHaves : rentMustHaves), [form.intent]);

  useEffect(() => {
    const intent = new URLSearchParams(window.location.search).get("intent");
    if (intent === "buy" || intent === "rent") {
      setForm((current) => ({
        ...current,
        intent,
        propertyType: intent === "buy" && ["room", "room-share"].includes(current.propertyType) ? "house" : current.propertyType,
        mustHaves: intent === "buy" ? ["Title deeds"] : ["Ensuite"],
      }));
    }
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setIntent(intent: "rent" | "buy") {
    setForm((current) => ({
      ...current,
      intent,
      propertyType: intent === "buy" && ["room", "room-share"].includes(current.propertyType) ? "house" : current.propertyType,
      mustHaves: intent === "buy" ? ["Title deeds"] : ["Ensuite"],
    }));
  }

  function toggleMustHave(item: string) {
    setForm((current) => ({
      ...current,
      mustHaves: current.mustHaves.includes(item)
        ? current.mustHaves.filter((value) => value !== item)
        : [...current.mustHaves, item],
    }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const result = await apiFetch<{ request: TenantRequestRecord }>("/api/v1/property-requests", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (result.data?.request) {
      setCreated(result.data.request);
      setForm(initialForm);
    }
  }

  return (
    <PageShell
      eyebrow="Property request"
      title="Tell HouseLink what you are looking for"
      description="Complete this once and our team can match you with rental or sale listings that fit your area, budget, and must-haves."
    >
      {created ? (
        <section className="rounded-lg border border-emerald-200 bg-white p-6 shadow-sm dark:border-emerald-900/50 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-1 size-6 shrink-0 text-emerald-600" />
            <div>
              <h2 className="text-xl font-semibold text-ink dark:text-white">Request received</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Thank you, {created.name}. HouseLink stored your {created.intent === "buy" ? "buying" : "rental"} request and found {created.matches.length} current match{created.matches.length === 1 ? "" : "es"}.
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                We will contact you using {created.phone}. Your reference is <span className="font-semibold">{created.id}</span>.
              </p>
              <Button className="mt-5" onClick={() => setCreated(null)}>
                Submit another request
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="premium-card space-y-5 rounded-lg p-5 sm:p-6">
            <div className="flex items-start gap-3 border-b border-slate-100 pb-5 dark:border-slate-800">
              <span className="grid size-11 shrink-0 place-items-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                <Home className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="font-semibold text-ink dark:text-white">Client and property details</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  The clearer the request, the better the matches HouseLink can shortlist.
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">I want to</label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {(["rent", "buy"] as const).map((intent) => (
                  <button
                    key={intent}
                    type="button"
                    onClick={() => setIntent(intent)}
                    className={`min-h-11 rounded-lg border px-3 text-sm font-semibold capitalize transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                      form.intent === intent
                        ? "border-emerald-600 bg-emerald-700 text-white shadow-md shadow-emerald-950/15 dark:border-emerald-500 dark:bg-emerald-600"
                        : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                    }`}
                  >
                    {intent}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Full name" value={form.name} onChange={(value) => update("name", value)} required />
              <TextInput label="WhatsApp / phone" value={form.phone} onChange={(value) => update("phone", value)} required />
              <TextInput label="Email" type="email" value={form.email} onChange={(value) => update("email", value)} />
              {form.intent === "rent" ? (
                <TextInput label="Move-in date" type="date" value={form.moveInDate} onChange={(value) => update("moveInDate", value)} />
              ) : (
                <SelectInput label="Buying as" value={form.clientType} onChange={(value) => update("clientType", value)} options={[
                  ["individual", "Individual"],
                  ["family", "Family"],
                  ["company", "Company"],
                  ["investor", "Investor"],
                  ["diaspora", "Diaspora buyer"],
                  ["other", "Other"],
                ]} />
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Property type</label>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {typeOptions.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update("propertyType", value)}
                    className={`min-h-11 rounded-lg border px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                      form.propertyType === value
                        ? "border-emerald-600 bg-emerald-700 text-white shadow-md shadow-emerald-950/15 dark:border-emerald-500 dark:bg-emerald-600"
                        : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <TextInput label="Bedrooms" type="number" value={form.bedrooms} onChange={(value) => update("bedrooms", value)} />
              <TextInput label="Bathrooms" type="number" value={form.bathrooms} onChange={(value) => update("bathrooms", value)} />
              <TextInput label="Min budget" type="number" value={form.minBudget} onChange={(value) => update("minBudget", value)} />
              <TextInput label="Max budget" type="number" value={form.maxBudget} onChange={(value) => update("maxBudget", value)} required />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <TextArea label="Preferred areas" value={form.preferredAreas} onChange={(value) => update("preferredAreas", value)} placeholder="Pumula South, Nkulumane 12" required />
              <TextArea label="Alternative areas" value={form.alternativeAreas} onChange={(value) => update("alternativeAreas", value)} placeholder="Nearby suburbs or second choices" />
            </div>

            {form.intent === "rent" ? (
              <div className="grid gap-4 sm:grid-cols-4">
                <SelectInput label="Ensuite" value={form.ensuite} onChange={(value) => update("ensuite", value as FormState["ensuite"])} options={[
                  ["required", "Required"],
                  ["preferred", "Preferred"],
                  ["not_needed", "Not needed"],
                ]} />
                <TextInput label="Lease length" value={form.leaseLength} onChange={(value) => update("leaseLength", value)} />
                <TextInput label="Adults" type="number" value={form.adults} onChange={(value) => update("adults", value)} />
                <TextInput label="Children" type="number" value={form.children} onChange={(value) => update("children", value)} />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectInput label="Buyer readiness" value={form.purchaseReadiness} onChange={(value) => update("purchaseReadiness", value)} options={[
                  ["cash_ready", "Cash buyer"],
                  ["mortgage", "Mortgage / bank finance"],
                  ["payment_plan", "Needs payment plan"],
                  ["still_browsing", "Still browsing"],
                  ["other", "Other"],
                ]} />
                <SelectInput label="Timeline" value={form.timeline} onChange={(value) => update("timeline", value)} options={[
                  ["ready_now", "Ready now"],
                  ["one_to_three_months", "1-3 months"],
                  ["three_to_six_months", "3-6 months"],
                  ["flexible", "Flexible"],
                ]} />
              </div>
            )}

            <TextArea
              label="Extra notes"
              value={form.notes}
              onChange={(value) => update("notes", value)}
              placeholder={form.intent === "buy" ? "Example: Looking to buy a 4-bedroom house in Bulawayo with title deeds. Budget..." : "Example: Looking for a 3-bedroom house with ensuite around Pumula South or Nkulumane 12. Budget..."}
            />
          </section>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <section className="overflow-hidden rounded-lg border border-emerald-200 bg-white shadow-sm dark:border-emerald-900/50 dark:bg-slate-900">
              <div className="h-1.5 bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500" />
              <div className="p-5 text-emerald-950 dark:text-emerald-50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5" />
                <h2 className="font-semibold">How HouseLink uses this</h2>
              </div>
              <div className="mt-4 grid gap-3 text-sm leading-6">
                <p>We save your request, compare it with current listings, and notify you when there is a close fit.</p>
                <p>Admins can also review matches and contact you manually by WhatsApp or phone.</p>
              </div>
              </div>
            </section>

            <section className="premium-card rounded-lg p-5">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-5 text-emerald-700" />
                <h2 className="font-semibold text-ink dark:text-white">Must-have features</h2>
              </div>
              <div className="mt-4 space-y-2">
                {featureOptions.map((item) => (
                  <label key={item} className="flex min-h-10 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm transition hover:border-emerald-300 hover:bg-emerald-50/60 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900">
                    <input type="checkbox" checked={form.mustHaves.includes(item)} onChange={() => toggleMustHave(item)} className="size-4 accent-emerald-700" />
                    {item}
                  </label>
                ))}
              </div>
            </section>

            {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm transition hover:border-emerald-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <input required type="checkbox" className="mt-1 size-4 shrink-0 accent-emerald-700" />
              I agree that HouseLink Zimbabwe may store this request and contact me about matching properties.
            </label>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Send property request
            </Button>
          </aside>
        </form>
      )}
    </PageShell>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
      {label}
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      >
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>{labelText}</option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
      {label}
      <textarea
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
    </label>
  );
}
