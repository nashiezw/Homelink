"use client";

import { Building2, Crown, Search, ShieldCheck, Trash2, Users, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import { AdminActionDialog, type AdminDialogConfig } from "@/components/admin/action-dialog";
import type { AgencySummary, AgentProfile, LandlordProfile } from "@/lib/admin/user-management-types";

type LandlordResponse = {
  landlords: LandlordProfile[];
  summary: Record<string, number>;
};

type AgencyResponse = {
  agencies: AgencySummary[];
  agents: AgentProfile[];
  summary: Record<string, number>;
};

type HubTab = "landlords" | "agents" | "agencies";

export function LandlordAgentHub() {
  const { showToast } = useApp();
  const [hubTab, setHubTab] = useState<HubTab>("landlords");
  const [q, setQ] = useState("");
  const [landlords, setLandlords] = useState<LandlordResponse | null>(null);
  const [agencyData, setAgencyData] = useState<AgencyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<AdminDialogConfig | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [landlordRes, agencyRes] = await Promise.all([
      apiFetch<LandlordResponse>(`/api/v1/admin/landlords?q=${encodeURIComponent(q)}`),
      apiFetch<AgencyResponse>("/api/v1/admin/agencies"),
    ]);
    if (landlordRes.data) setLandlords(landlordRes.data);
    if (agencyRes.data) setAgencyData(agencyRes.data);
    setLoading(false);
  }, [q]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 200);
    return () => clearTimeout(timer);
  }, [load]);

  async function userAction(userId: string, action: string, extra?: Record<string, unknown>) {
    const result = await apiFetch(`/api/v1/admin/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ action, ...extra }),
    });
    if (result.error) {
      showToast(result.error.message ?? "Action failed.", "error");
      return;
    }
    showToast("Action applied.");
    void load();
  }

  async function agencyAction(agencyId: string, action: string, extra?: Record<string, unknown>) {
    const result = await apiFetch("/api/v1/admin/agencies", {
      method: "PATCH",
      body: JSON.stringify({ agencyId, action, ...extra }),
    });
    if (result.error) {
      showToast(result.error.message, "error");
      return;
    }
    showToast(`Agency ${action.replace(/_/g, " ")} applied.`);
    void load();
  }

  function reasonedUserAction(userId: string, action: string, label: string) {
    setDialog({
      title: label,
      message: `Enter a clear admin reason before applying ${label.toLowerCase()}. This keeps the account history useful and auditable.`,
      tone: action === "suspend" ? "warning" : "info",
      confirmLabel: label,
      fields: [{ name: "reason", label: "Admin reason", type: "textarea", required: true }],
      onConfirm: (values) => userAction(userId, action, { reason: values.reason }),
    });
  }

  function reasonedAgencyAction(agencyId: string, action: string, label: string, tone: "warning" | "danger" = "warning") {
    setDialog({
      title: label,
      message: `Enter a clear admin reason before applying ${label.toLowerCase()} to this agency.`,
      tone,
      confirmLabel: label,
      fields: [{ name: "reason", label: "Admin reason", type: "textarea", required: true }],
      onConfirm: (values) => agencyAction(agencyId, action, { reason: values.reason }),
    });
  }

  const filteredAgents =
    agencyData?.agents.filter((agent) => {
      if (!q.trim()) return true;
      const needle = q.toLowerCase();
      return (
        agent.name.toLowerCase().includes(needle) ||
        agent.agencyName.toLowerCase().includes(needle) ||
        (agent.city?.toLowerCase().includes(needle) ?? false)
      );
    }) ?? [];

  return (
    <div className="space-y-4">
      <AdminActionDialog config={dialog} onClose={() => setDialog(null)} />
      <div className="grid gap-2 sm:flex sm:flex-wrap">
        <button
          type="button"
          onClick={() => setHubTab("landlords")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${hubTab === "landlords" ? "bg-cyan-600 text-white" : "bg-white/10 text-slate-300"}`}
        >
          Landlords
        </button>
        <button
          type="button"
          onClick={() => setHubTab("agents")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${hubTab === "agents" ? "bg-cyan-600 text-white" : "bg-white/10 text-slate-300"}`}
        >
          Estate agents
        </button>
        <button
          type="button"
          onClick={() => setHubTab("agencies")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${hubTab === "agencies" ? "bg-cyan-600 text-white" : "bg-white/10 text-slate-300"}`}
        >
          Agencies
        </button>
      </div>

      {(hubTab === "landlords" || hubTab === "agents") && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-lg border border-white/10 bg-slate-950 py-2 pl-10 pr-3 text-sm text-white"
          />
        </div>
      )}

      {loading && <p className="text-slate-400">Loading...</p>}

      {hubTab === "landlords" && landlords && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {Object.entries(landlords.summary).map(([key, value]) => (
              <div key={key} className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                <p className="text-xs uppercase text-slate-500">{key}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {landlords.landlords.map((landlord) => (
              <article key={landlord.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 font-semibold text-white">
                      {landlord.name}
                      {landlord.premium && <Crown className="size-4 text-amber-400" />}
                    </h3>
                    <p className="text-sm text-slate-400">{landlord.email}</p>
                    <p className="text-xs text-slate-500">{landlord.city}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      landlord.accountStatus === "ACTIVE"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {landlord.accountStatus}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-lg bg-slate-950/50 p-2">
                    <p className="text-xs text-slate-500">Active</p>
                    <p className="font-bold text-white">{landlord.activeListings}</p>
                  </div>
                  <div className="rounded-lg bg-slate-950/50 p-2">
                    <p className="text-xs text-slate-500">Enquiries</p>
                    <p className="font-bold text-white">{landlord.totalEnquiries}</p>
                  </div>
                  <div className="rounded-lg bg-slate-950/50 p-2">
                    <p className="text-xs text-slate-500">Score</p>
                    <p className="font-bold text-white">{landlord.performanceScore}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                  <span>Views: {landlord.totalViews}</span>
                  <span>Occupancy: {landlord.occupancyRate}%</span>
                  <span>Response: ~{landlord.avgResponseMin}m</span>
                  {landlord.complaints > 0 && <span className="text-amber-400">{landlord.complaints} open complaints</span>}
                </div>
                <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                  {landlord.verification.identity !== "VERIFIED" && (
                    <Button onClick={() => void userAction(landlord.id, "verify")}>
                      <ShieldCheck className="size-4" /> Verify
                    </Button>
                  )}
                  {landlord.accountStatus === "ACTIVE" ? (
                    <Button variant="secondary" onClick={() => reasonedUserAction(landlord.id, "suspend", "Suspend landlord")}>
                      Suspend
                    </Button>
                  ) : (
                    <Button onClick={() => void userAction(landlord.id, "activate")}>Activate</Button>
                  )}
                  <Button variant="secondary" onClick={() => reasonedUserAction(landlord.id, "warn", "Issue warning")}>
                    Issue warning
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {hubTab === "agents" && agencyData && (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredAgents.map((agent) => (
            <article key={agent.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-white">{agent.name}</h3>
                  <p className="text-sm text-slate-400">{agent.agencyName}</p>
                  <p className="text-xs text-slate-500">{agent.city}</p>
                </div>
                <Users className="size-5 text-cyan-400" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-lg bg-slate-950/50 p-2">
                  <p className="text-xs text-slate-500">Managed</p>
                  <p className="font-bold text-white">{agent.propertiesManaged}</p>
                </div>
                <div className="rounded-lg bg-slate-950/50 p-2">
                  <p className="text-xs text-slate-500">Rentals</p>
                  <p className="font-bold text-white">{agent.rentals}</p>
                </div>
                <div className="rounded-lg bg-slate-950/50 p-2">
                  <p className="text-xs text-slate-500">Conversion</p>
                  <p className="font-bold text-white">{agent.leadConversion}%</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => void userAction(agent.id, "set_premium", { premium: !agent.premium })}
                >
                  {agent.premium ? "Remove premium" : "Grant premium"}
                </Button>
                <Button variant="secondary" onClick={() => reasonedUserAction(agent.id, "warn", "Warn agent")}>
                  Warn
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {hubTab === "agencies" && agencyData && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Object.entries(agencyData.summary).map(([key, value]) => (
              <div key={key} className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                <p className="text-xs uppercase text-slate-500">{key}</p>
                <p className="text-2xl font-bold text-white">{typeof value === "number" && key.includes("Revenue") ? `$${value}` : value}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {agencyData.agencies.map((agency) => (
              <article key={agency.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
                <div className="flex items-start gap-3">
                  <Building2 className="size-5 shrink-0 text-cyan-400" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-white">{agency.name}</h3>
                    <p className="text-sm text-slate-400">{agency.city}</p>
                    <p className="truncate text-xs text-slate-500">{agency.email}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tier</span>
                    <span className="text-white">{agency.subscriptionTier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Agents</span>
                    <span className="text-white">{agency.agentCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Listings</span>
                    <span className="text-white">{agency.listingCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Revenue</span>
                    <span className="text-emerald-400">${agency.revenue}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Verification</span>
                    <span className={agency.verificationStatus === "VERIFIED" ? "text-emerald-400" : "text-amber-400"}>
                      {agency.verificationStatus}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Account</span>
                    <span className={agency.accountStatus === "ACTIVE" ? "text-emerald-400" : "text-amber-400"}>
                      {agency.accountStatus ?? "ACTIVE"}
                    </span>
                  </div>
                </div>
                {agency.topAgents.length > 0 && (
                  <div className="mt-4 border-t border-white/10 pt-3">
                    <p className="mb-2 text-xs uppercase text-slate-500">Top agents</p>
                    {agency.topAgents.map((a) => (
                      <p key={a.name} className="text-xs text-slate-400">
                        {a.name} - {a.listings} listings
                      </p>
                    ))}
                  </div>
                )}
                <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                  {agency.verificationStatus !== "VERIFIED" && (
                    <Button onClick={() => void agencyAction(agency.id, "verify")}>
                      <ShieldCheck className="size-4" /> Verify
                    </Button>
                  )}
                  {agency.verificationStatus === "PENDING" && (
                    <Button variant="secondary" onClick={() => reasonedAgencyAction(agency.id, "reject", "Reject agency")}>
                      <XCircle className="size-4" /> Reject
                    </Button>
                  )}
                  {agency.accountStatus !== "SUSPENDED" && agency.accountStatus !== "DELETED" && (
                    <Button variant="secondary" onClick={() => reasonedAgencyAction(agency.id, "suspend", "Suspend agency")}>
                      Suspend
                    </Button>
                  )}
                  {agency.accountStatus === "SUSPENDED" && (
                    <Button onClick={() => void agencyAction(agency.id, "activate")}>Activate</Button>
                  )}
                  <Button variant="secondary" onClick={() => void agencyAction(agency.id, "feature")}>
                    <Crown className="size-4" /> Enterprise tier
                  </Button>
                  <Button variant="secondary" onClick={() => reasonedAgencyAction(agency.id, "delete", "Delete agency", "danger")}>
                    <Trash2 className="size-4" /> Delete
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
