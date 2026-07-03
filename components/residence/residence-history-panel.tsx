"use client";

import { BadgeCheck, Calendar, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import {
  RESIDENCE_ROLE_LABELS,
  TENANCY_STATUS_LABELS,
  VERIFICATION_SOURCE_LABELS,
  type PublicResidenceRecord,
  type ResidenceRole,
} from "@/lib/residence/types";

export function ResidenceHistoryPanel() {
  const { user, showToast } = useApp();
  const [records, setRecords] = useState<PublicResidenceRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    propertyTitle: "",
    city: "Harare",
    suburb: "",
    role: "tenant" as ResidenceRole,
    startDate: "",
    endDate: "",
  });

  async function load() {
    const result = await apiFetch<{ records: PublicResidenceRecord[] }>("/api/v1/users/me/residence-history");
    setRecords(result.data?.records ?? []);
  }

  useEffect(() => {
    if (user) void load();
  }, [user]);

  async function addRecord(e: React.FormEvent) {
    e.preventDefault();
    const result = await apiFetch("/api/v1/users/me/residence-history", {
      method: "POST",
      body: JSON.stringify(form),
    });
    if (result.data) {
      showToast("Past stay added (unverified — use payment or lease for verified records).");
      setOpen(false);
      void load();
    }
  }

  if (!user) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-ink">Where I&apos;ve lived</h3>
          <p className="mt-1 text-xs text-slate-500">
            Public view shows suburb & city only. Verified stays require payment or lease + mutual confirmation.{" "}
            <Link href="/dashboard/tenancies" className="font-medium text-emerald-700 hover:underline">
              Manage tenancies
            </Link>
          </p>
        </div>
        <Button type="button" variant="secondary" className="h-9 shrink-0" onClick={() => setOpen((o) => !o)}>
          <Plus className="size-4" />
          Add past stay
        </Button>
      </div>

      {open && (
        <form onSubmit={(e) => void addRecord(e)} className="mt-4 space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-4">
          <input
            required
            placeholder="Area or property name"
            value={form.propertyTitle}
            onChange={(e) => setForm({ ...form, propertyTitle: e.target.value })}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" className="rounded-lg border px-3 py-2 text-sm" />
            <input value={form.suburb} onChange={(e) => setForm({ ...form, suburb: e.target.value })} placeholder="Suburb" className="rounded-lg border px-3 py-2 text-sm" />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as ResidenceRole })} className="rounded-lg border px-3 py-2 text-sm">
              {Object.entries(RESIDENCE_ROLE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" />
            <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" />
          </div>
          <Button type="submit" className="h-9">Save (unverified)</Button>
        </form>
      )}

      <ul className="mt-4 space-y-2">
        {records.length === 0 ? (
          <li className="text-sm text-slate-500">No stay history yet.</li>
        ) : (
          records.map((r) => (
            <li key={r.id} className="flex gap-3 rounded-lg border border-slate-100 px-3 py-2.5 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <div>
                <p className="font-medium text-ink">
                  {r.suburb}, {r.city}
                  {r.verified ? (
                    <BadgeCheck className="ml-1 inline size-3.5 text-emerald-600" />
                  ) : (
                    <span className="ml-2 text-xs font-normal text-slate-400">(unverified)</span>
                  )}
                </p>
                <p className="text-slate-500">
                  {RESIDENCE_ROLE_LABELS[r.role]} · {VERIFICATION_SOURCE_LABELS[r.verificationSource]}
                </p>
                <p className="flex items-center gap-1 text-xs text-slate-400">
                  <Calendar className="size-3" />
                  {TENANCY_STATUS_LABELS[r.status]} · {r.startDate}
                  {r.endDate ? ` → ${r.endDate}` : ""}
                </p>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
