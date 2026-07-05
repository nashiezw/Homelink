"use client";

import { AlertTriangle, Shield } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import { AdminActionFeedback } from "@/components/admin/action-feedback";
import { AdminActionDialog, type AdminDialogConfig } from "@/components/admin/action-dialog";

type ListingRow = { id: string; title: string; city: string; status: string; featured?: boolean; ownerId: string };
type AgencyRow = { id: string; name: string; city: string };

export function AdminOverridesHub() {
  const { showToast } = useApp();
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [agencies, setAgencies] = useState<AgencyRow[]>([]);
  const [targetId, setTargetId] = useState("");
  const [agencyTargetId, setAgencyTargetId] = useState("");
  const [newOwnerId, setNewOwnerId] = useState("");
  const [days, setDays] = useState(30);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [feedback, setFeedback] = useState<{
    title: string;
    message: string;
    tone?: "success" | "warning" | "danger" | "info";
    details?: Array<{ label: string; value: string | number | undefined }>;
  } | null>(null);
  const [dialog, setDialog] = useState<AdminDialogConfig | null>(null);

  const load = useCallback(async () => {
    const [propsRes, usersRes, agenciesRes] = await Promise.all([
      apiFetch<{ rows: ListingRow[] }>("/api/v1/admin/reports?type=properties"),
      apiFetch<{ rows: Array<{ id: string; name: string; email: string }> }>("/api/v1/admin/reports?type=users"),
      apiFetch<{ agencies: AgencyRow[] }>("/api/v1/admin/agencies"),
    ]);
    if (propsRes.data) setListings(propsRes.data.rows);
    if (usersRes.data) setUsers(usersRes.data.rows);
    if (agenciesRes.data) setAgencies(agenciesRes.data.agencies);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function override(action: string, extra?: Record<string, unknown>) {
    const useAgencyTarget = Boolean(extra?.useAgencyTarget);
    const { useAgencyTarget: _drop, ...rest } = extra ?? {};
    const id = useAgencyTarget ? agencyTargetId : targetId;
    if (!id && action !== "force_logout_all") {
      showToast("Select a target first.", "error");
      return;
    }
    if (!confirmed) {
      showToast("Confirm the override action first.", "error");
      return;
    }
    setDialog({
      title: "Final override confirmation",
      message: `Apply ${action.replace(/_/g, " ")}? This is a sensitive admin override and will be logged.`,
      tone: "danger",
      confirmLabel: "Apply override",
      onConfirm: () => applyOverride(action, id, rest),
    });
  }

  async function applyOverride(action: string, id: string, rest: Record<string, unknown>) {
    const result = await apiFetch("/api/v1/admin/overrides", {
      method: "POST",
      body: JSON.stringify({ action, targetId: id, confirmed: true, reason, ...rest }),
    });
    if (result.error) {
      showToast(result.error.message, "error");
      return;
    }
    showToast(`Override: ${action.replace(/_/g, " ")} applied.`);
    setFeedback({
      title: "Override applied",
      message: `${action.replace(/_/g, " ")} was applied and logged to the audit trail.`,
      tone: action.includes("delete") || action.includes("suspend") || action.includes("reject") ? "danger" : "warning",
      details: [
        { label: "Override", value: action.replace(/_/g, " ") },
        { label: "Target", value: id || "All users" },
        { label: "Reason", value: reason || "Not provided" },
      ],
    });
    setConfirmed(false);
    void load();
  }

  return (
    <div className="space-y-6">
      <AdminActionDialog config={dialog} onClose={() => setDialog(null)} />
      <AdminActionFeedback
        open={Boolean(feedback)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
        tone={feedback?.tone}
        details={feedback?.details}
        onClose={() => setFeedback(null)}
      />
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="size-5 shrink-0 text-amber-400" />
          <div>
            <p className="font-semibold text-amber-200">Super Admin overrides</p>
            <p className="text-sm text-amber-200/80">All actions require confirmation and are permanently logged in the audit trail.</p>
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        I confirm this admin override action
      </label>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-white">
            <Shield className="size-4 text-cyan-400" /> Listing controls
          </h3>
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="mb-3 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">
            <option value="">Select listing...</option>
            {listings.map((l) => (
              <option key={l.id} value={l.id}>{l.title} ({l.status})</option>
            ))}
          </select>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" className="mb-3 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <Button onClick={() => void override("approve_listing")}>Approve listing</Button>
            <Button variant="secondary" onClick={() => void override("reject_listing")}>Reject listing</Button>
            <Button variant="secondary" onClick={() => void override("feature_listing", { days: 7 })}>Feature 7 days</Button>
            <Button variant="secondary" onClick={() => void override("unfeature_listing")}>Unfeature</Button>
            <Button variant="secondary" onClick={() => void override("verify_listing")}>Verify listing</Button>
            <Button variant="secondary" onClick={() => void override("activate_listing")}>Activate listing</Button>
            <Button variant="secondary" onClick={() => void override("archive_listing")}>Archive listing</Button>
            <Button variant="secondary" onClick={() => void override("restore_listing")}>Restore listing</Button>
            <Button variant="secondary" onClick={() => void override("delete_listing")}>Delete listing</Button>
          </div>
          <div className="mt-3 flex gap-2">
            <select value={newOwnerId} onChange={(e) => setNewOwnerId(e.target.value)} className="flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">
              <option value="">Transfer to user...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <Button variant="secondary" onClick={() => void override("transfer_listing", { newOwnerId })}>Transfer</Button>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
          <h3 className="mb-3 font-semibold text-white">User & subscription overrides</h3>
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="mb-3 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">
            <option value="">Select user...</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} - {u.email}</option>
            ))}
          </select>
          <div className="mb-3 flex items-center gap-2">
            <input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-24 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
            <span className="text-sm text-slate-400">days</span>
          </div>
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <Button onClick={() => void override("extend_subscription", { days })}>Extend subscription</Button>
            <Button variant="secondary" onClick={() => void override("grant_complimentary", { plan: "landlord_pro", days })}>Complimentary Pro</Button>
            <Button variant="secondary" onClick={() => void override("grant_complimentary", { plan: "featured_listing", listingId: listings[0]?.id })}>Complimentary featured</Button>
            <Button variant="secondary" onClick={() => void override("adjust_credits", { credits: 50 })}>Add 50 credits</Button>
            <Button variant="secondary" onClick={() => void override("terminate_sessions")}>Force logout</Button>
            <Button variant="secondary" onClick={() => void override("reset_verification")}>Reset verification</Button>
            <Button variant="secondary" onClick={() => void override("delete_user")}>Delete user</Button>
          </div>
          <Button className="mt-4" variant="secondary" onClick={() => void override("force_logout_all")}>
            Force logout all users
          </Button>
        </section>

        <section className="rounded-xl border border-white/10 bg-slate-900/60 p-4 lg:col-span-2">
          <h3 className="mb-3 font-semibold text-white">Agency controls</h3>
          <select value={agencyTargetId} onChange={(e) => setAgencyTargetId(e.target.value)} className="mb-3 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">
            <option value="">Select agency...</option>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>{a.name} ({a.city})</option>
            ))}
          </select>
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <Button onClick={() => void override("verify_agency", { useAgencyTarget: true })}>Verify agency</Button>
            <Button variant="secondary" onClick={() => void override("reject_agency", { useAgencyTarget: true })}>Reject agency</Button>
            <Button variant="secondary" onClick={() => void override("feature_agency", { useAgencyTarget: true })}>Enterprise tier</Button>
            <Button variant="secondary" onClick={() => void override("suspend_agency", { useAgencyTarget: true })}>Suspend agency</Button>
            <Button variant="secondary" onClick={() => void override("activate_agency", { useAgencyTarget: true })}>Activate agency</Button>
            <Button variant="secondary" onClick={() => void override("delete_agency", { useAgencyTarget: true })}>Delete agency</Button>
          </div>
        </section>
      </div>
    </div>
  );
}
