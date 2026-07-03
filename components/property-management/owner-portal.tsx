"use client";

import { Building2, CheckCircle2, Clock, FileText, MessageSquare, Upload } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import type { PropertyManagementRequest } from "@/lib/property-management/types";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export function OwnerPortal() {
  const { user, showToast } = useApp();
  const [requests, setRequests] = useState<PropertyManagementRequest[]>([]);
  const [selected, setSelected] = useState<PropertyManagementRequest | null>(null);
  const [poll, setPoll] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const result = await apiFetch<{ requests: PropertyManagementRequest[] }>("/api/v1/property-management/requests");
    if (result.data) {
      setRequests(result.data.requests);
      if (selected) {
        const u = result.data.requests.find((r) => r.id === selected.id);
        if (u) setSelected(u);
      }
    }
  }, [selected]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => setPoll((p) => p + 1), 10000);
    return () => clearInterval(interval);
  }, [load, poll]);

  async function uploadDoc(file: File) {
    if (!selected) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast("Document must be under 10 MB.", "error");
      return;
    }

    setUploading(true);
    const dataUrl = await readFileAsDataUrl(file);
    const upload = await apiFetch<{ url: string }>("/api/v1/uploads", {
      method: "POST",
      body: JSON.stringify({ dataUrl, folder: "property-management", kind: "document" }),
    });

    if (!upload.data?.url) {
      setUploading(false);
      showToast(upload.error?.message ?? "Upload failed.", "error");
      return;
    }

    await apiFetch(`/api/v1/property-management/requests/${selected.id}/actions`, {
      method: "POST",
      body: JSON.stringify({
        action: "upload_document",
        name: file.name,
        type: "owner_upload",
        url: upload.data.url,
      }),
    });
    setUploading(false);
    showToast("Document uploaded.");
    void load();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await uploadDoc(file);
    e.target.value = "";
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 dark:text-slate-300">Sign in to view your property management requests.</p>
        <Link href="/auth" className="mt-4 inline-block text-emerald-600">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink dark:text-white">Property Owner Portal</h1>
          <p className="text-sm text-slate-500">Track your property management requests in real time.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/owner/submit">
            <Button>Submit full request</Button>
          </Link>
          <Link href="/property-management">
            <Button variant="secondary">Free consultation</Button>
          </Link>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
          <Building2 className="mx-auto size-10 text-emerald-600" />
          <p className="mt-4 font-medium">No requests yet</p>
          <p className="text-sm text-slate-500">Submit a property management request to get started.</p>
          <Link href="/property-management" className="mt-4 inline-block"><Button>Get started</Button></Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-2">
            {requests.map((r) => (
              <button key={r.id} type="button" onClick={() => setSelected(r)} className={`w-full rounded-lg border p-4 text-left ${selected?.id === r.id ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : "border-slate-200 dark:border-slate-700"}`}>
                <p className="font-semibold">{r.requestNumber}</p>
                <p className="text-sm text-slate-500">{r.city} - {r.status}</p>
                <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
                  <div className="h-full rounded-full bg-emerald-600" style={{ width: `${r.progressPercent}%` }} />
                </div>
              </button>
            ))}
          </div>

          {selected && (
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex justify-between">
                  <h2 className="text-xl font-bold">{selected.requestNumber}</h2>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">{selected.status}</span>
                </div>
                <p className="mt-2 text-slate-600 dark:text-slate-300">{selected.propertyAddress}, {selected.city}</p>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <InfoCard icon={CheckCircle2} label="Consultant" value={selected.consultantName ?? "Pending assignment"} />
                  <InfoCard icon={Clock} label="SLA deadline" value={new Date(selected.slaDeadline).toLocaleString()} />
                  <InfoCard icon={Building2} label="Agency" value={selected.agencyName ?? "-"} />
                </div>

                <div className="mt-6">
                  <p className="mb-2 text-sm font-semibold">Progress tracker</p>
                  {selected.timeline.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 py-1 text-sm">
                      <span className={`size-2 rounded-full ${t.status === "completed" ? "bg-emerald-500" : t.status === "current" ? "bg-cyan-500" : "bg-slate-300"}`} />
                      <span className={t.status === "completed" ? "text-emerald-700 dark:text-emerald-300" : ""}>{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Section title="Inspections" icon={Clock}>
                  {selected.inspections.length === 0 ? <p className="text-sm text-slate-500">None scheduled</p> : selected.inspections.map((i) => (
                    <p key={i.id} className="text-sm">{new Date(i.scheduledAt).toLocaleString()} - {i.status}</p>
                  ))}
                </Section>
                <Section title="Documents" icon={FileText}>
                  {selected.documents.map((d) => (
                    <div key={d.id} className="flex justify-between text-sm">
                      <span>{d.name}</span>
                      <span className="text-slate-500">{d.status}</span>
                    </div>
                  ))}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={(e) => void handleFileChange(e)}
                  />
                  <Button
                    className="mt-2"
                    variant="secondary"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-1.5 size-4" />
                    {uploading ? "Uploading..." : "Upload document"}
                  </Button>
                </Section>
                <Section title="Invoices" icon={FileText}>
                  {selected.invoices.map((inv) => (
                    <div key={inv.id} className="flex justify-between text-sm">
                      <span>{inv.title}</span>
                      <span>${inv.amount} - {inv.status}</span>
                    </div>
                  ))}
                </Section>
                <Section title="Offers" icon={MessageSquare}>
                  {selected.offers.map((o) => (
                    <p key={o.id} className="text-sm">{o.partyName}: ${o.amount} ({o.status})</p>
                  ))}
                </Section>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <p className="mb-2 text-sm font-semibold">Activity history</p>
                {selected.activityLog.slice(0, 15).map((a) => (
                  <p key={a.id} className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleString()} - {a.detail}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
      <Icon className="size-4 text-emerald-600" />
      <p className="mt-1 text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Building2; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="size-4 text-emerald-600" />
        <p className="font-semibold text-sm">{title}</p>
      </div>
      {children}
    </div>
  );
}
