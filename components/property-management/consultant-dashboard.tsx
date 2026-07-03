"use client";

import { Briefcase, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { AdminActionDialog, type AdminDialogConfig } from "@/components/admin/action-dialog";
import type { PropertyManagementRequest } from "@/lib/property-management/types";

export function ConsultantDashboard() {
  const { user, showToast } = useApp();
  const [requests, setRequests] = useState<PropertyManagementRequest[]>([]);
  const [metrics, setMetrics] = useState<Record<string, number> | null>(null);
  const [selected, setSelected] = useState<PropertyManagementRequest | null>(null);
  const [dialog, setDialog] = useState<AdminDialogConfig | null>(null);

  const load = useCallback(async () => {
    const result = await apiFetch<{ requests: PropertyManagementRequest[]; metrics: Record<string, number> }>("/api/v1/property-management/requests");
    if (result.data) {
      setRequests(result.data.requests);
      setMetrics(result.data.metrics);
      if (selected) {
        const u = result.data.requests.find((r) => r.id === selected.id);
        if (u) setSelected(u);
      }
    }
  }, [selected]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 10000);
    return () => clearInterval(interval);
  }, [load]);

  async function action(actionName: string, extra?: Record<string, unknown>) {
    if (!selected) return;
    await apiFetch(`/api/v1/property-management/requests/${selected.id}/actions`, {
      method: "POST",
      body: JSON.stringify({ action: actionName, ...extra }),
    });
    showToast("Action completed.");
    void load();
  }

  function scheduleInspection() {
    setDialog({
      title: "Schedule inspection",
      message: "Set the exact date and time for this property inspection. The owner will be notified.",
      tone: "info",
      confirmLabel: "Schedule inspection",
      fields: [
        { name: "scheduledAt", label: "Inspection date and time", type: "datetime-local", defaultValue: defaultDateTimeLocal(2), required: true },
        { name: "note", label: "Inspection note", type: "textarea", placeholder: "Access instructions, focus areas, or owner availability" },
      ],
      onConfirm: async (values) => {
        await action("schedule_inspection", { scheduledAt: new Date(values.scheduledAt).toISOString(), assignedTo: user?.id });
        if (values.note?.trim()) await action("add_note", { body: `Inspection note: ${values.note.trim()}`, internal: true });
      },
    });
  }

  function addValuation() {
    setDialog({
      title: "Add valuation",
      message: "Enter the valuation amount and any supporting note.",
      tone: "info",
      confirmLabel: "Add valuation",
      fields: [
        { name: "amount", label: "Valuation amount (USD)", type: "number", required: true, min: 0 },
        { name: "note", label: "Valuation note", type: "textarea", placeholder: "Comparable sales, condition, or assumptions" },
      ],
      onConfirm: async (values) => {
        await action("assign_valuation", { amount: Number(values.amount), currency: "USD" });
        if (values.note?.trim()) await action("add_note", { body: `Valuation note: ${values.note.trim()}`, internal: true });
      },
    });
  }

  function generateQuote() {
    setDialog({
      title: "Generate quote",
      message: "Build a quote from actual fees instead of a default amount.",
      tone: "info",
      confirmLabel: "Generate quote",
      fields: [
        { name: "title", label: "Quote title", defaultValue: "Management quote", required: true },
        { name: "monthly", label: "Monthly management fee (USD)", type: "number", required: true, min: 0 },
        { name: "inspection", label: "Inspection or onboarding fee (USD)", type: "number", defaultValue: 0, required: true, min: 0 },
      ],
      onConfirm: (values) =>
        action("generate_quotation", {
          title: values.title,
          lineItems: [
            { label: "Monthly management", amount: Number(values.monthly) },
            { label: "Inspection or onboarding", amount: Number(values.inspection) },
          ],
          currency: "USD",
        }),
    });
  }

  function addInterestedParty() {
    setDialog({
      title: "Add interested party",
      message: "Record the actual buyer or tenant lead connected to this property.",
      tone: "info",
      confirmLabel: "Add party",
      fields: [
        { name: "name", label: "Full name", required: true },
        {
          name: "type",
          label: "Party type",
          type: "select",
          defaultValue: "TENANT",
          required: true,
          options: [
            { label: "Tenant", value: "TENANT" },
            { label: "Buyer", value: "BUYER" },
          ],
        },
        { name: "phone", label: "Phone number" },
        { name: "email", label: "Email address" },
        { name: "notes", label: "Notes", type: "textarea" },
      ],
      onConfirm: (values) =>
        action("add_interested_party", {
          name: values.name,
          type: values.type,
          phone: values.phone || undefined,
          email: values.email || undefined,
          notes: values.notes || undefined,
        }),
    });
  }

  function logOffer() {
    setDialog({
      title: "Log offer",
      message: "Capture the real offer details for this property.",
      tone: "info",
      confirmLabel: "Log offer",
      fields: [
        { name: "partyName", label: "Party name", required: true },
        {
          name: "partyType",
          label: "Party type",
          type: "select",
          defaultValue: "BUYER",
          required: true,
          options: [
            { label: "Buyer", value: "BUYER" },
            { label: "Tenant", value: "TENANT" },
          ],
        },
        { name: "amount", label: "Offer amount (USD)", type: "number", required: true, min: 0 },
        { name: "message", label: "Offer terms or message", type: "textarea" },
      ],
      onConfirm: (values) =>
        action("add_offer", {
          partyName: values.partyName,
          partyType: values.partyType,
          amount: Number(values.amount),
          currency: "USD",
          message: values.message || undefined,
        }),
    });
  }

  if (!user) {
    return <p className="py-12 text-center">Sign in with a consultant account to manage assigned property management requests.</p>;
  }

  if (!user.roles.includes("CONSULTANT") && !user.roles.includes("ADMIN")) {
    return <p className="py-12 text-center text-red-500">Consultant access required.</p>;
  }

  return (
    <div className="space-y-6">
      <AdminActionDialog config={dialog} onClose={() => setDialog(null)} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Consultant Dashboard</h1>
          <p className="text-sm text-slate-500">Welcome, {user.name}</p>
        </div>
        <Button variant="secondary" onClick={() => void load()}><RefreshCw className="size-4" /></Button>
      </div>

      {metrics && (
        <div className="grid gap-4 sm:grid-cols-4">
          <MetricCard label="Total leads" value={metrics.totalLeads} />
          <MetricCard label="Active" value={metrics.activeLeads} />
          <MetricCard label="Completed" value={metrics.completedRequests} />
          <MetricCard label="Conversion" value={`${metrics.conversionRate}%`} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-500">Assigned requests</p>
          {requests.map((r) => (
            <button key={r.id} type="button" onClick={() => setSelected(r)} className={`w-full rounded-lg border p-3 text-left ${selected?.id === r.id ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/20" : ""}`}>
              <p className="font-medium">{r.requestNumber}</p>
              <p className="text-xs text-slate-500">{r.ownerName} - {r.city}</p>
              <p className="text-xs">{r.status}</p>
            </button>
          ))}
          {requests.length === 0 && <p className="text-sm text-slate-500">No assigned leads yet.</p>}
        </div>

        {selected && (
          <div className="lg:col-span-2 rounded-xl border p-5 space-y-4">
            <h2 className="text-xl font-bold">{selected.requestNumber}</h2>
            <p>{selected.propertyAddress}, {selected.city}</p>
            <p className="text-sm text-slate-500">Owner: {selected.ownerName} / {selected.ownerPhone}</p>
            <p className="text-sm">{selected.description}</p>

            <div className="flex flex-wrap gap-2">
              <Button onClick={scheduleInspection}>Schedule inspection</Button>
              <Button variant="secondary" onClick={addValuation}>Add valuation</Button>
              <Button variant="secondary" onClick={generateQuote}>Generate quote</Button>
              <Button variant="secondary" onClick={addInterestedParty}>Add interested party</Button>
              <Button variant="secondary" onClick={logOffer}>Log offer</Button>
            </div>

            <div>
              <p className="mb-1 text-sm font-semibold">Required actions</p>
              {selected.documents.filter((d) => d.status === "REQUESTED").map((d) => (
                <p key={d.id} className="text-sm text-amber-600">Awaiting: {d.name}</p>
              ))}
              {selected.inspections.filter((i) => i.status === "SCHEDULED").map((i) => (
                <p key={i.id} className="text-sm text-cyan-600">Inspection: {new Date(i.scheduledAt).toLocaleString()}</p>
              ))}
            </div>

            <Link href={`/messages`} className="text-sm text-emerald-600">Message owner </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function defaultDateTimeLocal(daysFromNow: number) {
  const date = new Date(Date.now() + daysFromNow * 86400000);
  date.setMinutes(0, 0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-white p-4 dark:bg-slate-900">
      <Briefcase className="size-5 text-cyan-600" />
      <p className="mt-2 text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
