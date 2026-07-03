"use client";

import { Building2, ListChecks, MessageSquare, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageShell } from "@/components/layout/page-shell";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";

type AgencyDashboard = {
  agency: { id: string; name: string; city: string; verificationStatus: string };
  agents: Array<{
    id: string;
    name: string;
    email: string;
    listings: number;
    enquiries: number;
    views: number;
    performanceScore: number;
  }>;
  listings: Array<{
    id: string;
    title: string;
    suburb: string;
    city: string;
    type: string;
    verified: boolean;
    trustScore: number;
    views: number;
    enquiries: number;
    status: string;
    ownerName: string;
  }>;
  totals: {
    listings: number;
    agents: number;
    enquiries: number;
    views: number;
    verifiedListings: number;
    approvalRate: number;
  };
};

export function AgencyDashboardClient() {
  const { user, showToast } = useApp();
  const [data, setData] = useState<AgencyDashboard | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: "", email: "" });
  const [inviting, setInviting] = useState(false);
  const [lastInvite, setLastInvite] = useState<{ email: string; temporaryPassword: string } | null>(null);

  const load = useCallback(async () => {
    const result = await apiFetch<AgencyDashboard>("/api/v1/agencies/me");
    if (result.data) setData(result.data);
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function addAgent(e: React.FormEvent) {
    e.preventDefault();
    if (!newAgent.name.trim() || !newAgent.email.trim()) return;
    setInviting(true);
    const result = await apiFetch<{ dashboard: AgencyDashboard; temporaryPassword?: string }>("/api/v1/agencies/me", {
      method: "POST",
      body: JSON.stringify(newAgent),
    });
    setInviting(false);

    if (result.data?.dashboard) {
      setData(result.data.dashboard);
      showToast(`Agent invited: ${newAgent.email}. They can finish setup from their account email.`);
      if (result.data.temporaryPassword) {
        setLastInvite({ email: newAgent.email, temporaryPassword: result.data.temporaryPassword });
      }
      setNewAgent({ name: "", email: "" });
      setModalOpen(false);
    } else {
      showToast(result.error?.message ?? "Could not invite agent.", "error");
    }
  }

  if (!user) {
    return (
      <PageShell eyebrow="Agency dashboard" title="Sign in required" description="Sign in with your agency admin account.">
        <Link href="/auth?next=/dashboard/agency" className="font-semibold text-emerald-700 hover:underline">
          Sign in to continue
        </Link>
      </PageShell>
    );
  }

  if (!user.roles.includes("AGENCY_ADMIN")) {
    return (
      <PageShell eyebrow="Agency dashboard" title="Access denied" description="This dashboard is for agency administrators.">
        <p className="text-sm text-slate-600">Ask an administrator to add agency admin access to your account.</p>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Agency dashboard"
      title={data?.agency.name ?? "Your agency"}
      description="Manage agents, portfolio listings, enquiries, and verification from one place."
      highlights={[
        { value: String(data?.totals.listings ?? 0), label: "portfolio listings" },
        { value: String(data?.totals.agents ?? 0), label: "active agents" },
        { value: `${data?.totals.approvalRate ?? 0}%`, label: "verified rate" },
      ]}
      actions={
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="size-4" />
          Invite agent
        </Button>
      }
    >
      <div className="mb-6 grid overflow-hidden rounded-lg border border-ocean/20 bg-ocean text-white shadow-soft lg:grid-cols-[1fr_320px]">
        <div className="p-6">
          <p className="text-sm font-semibold uppercase tracking-normal text-cyan-100">Portfolio momentum</p>
          <h2 className="mt-2 text-2xl font-semibold">
            {data?.agency.city ?? "Your city"} — {data?.totals.views ?? 0} views and {data?.totals.enquiries ?? 0} enquiries across your team.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-cyan-50">
            Listing quality, agent responsiveness, and verification status are visible in one workflow.
          </p>
          <Link href="/dashboard/landlord/new" className="mt-4 inline-flex text-sm font-semibold text-cyan-100 underline">
            Add agency listing
          </Link>
        </div>
        <div className="grid border-t border-white/10 p-6 text-sm lg:border-l lg:border-t-0">
          {[
            { label: "Shared lead queue", ready: true },
            { label: "Agent-level analytics", ready: true },
            { label: "Bulk verification", ready: data?.agency.verificationStatus === "VERIFIED" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3 border-b border-white/10 py-3 first:pt-0 last:border-b-0 last:pb-0"
            >
              <span className="text-cyan-50">{item.label}</span>
              <span className="rounded-full bg-white/12 px-2 py-1 text-xs font-semibold">
                {item.ready ? "Ready" : "Pending"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Listings" value={String(data?.totals.listings ?? 0)} helper="Across all agents" icon={Building2} />
        <StatCard label="Agents" value={String(data?.totals.agents ?? 0)} helper="Active team members" icon={Users} />
        <StatCard label="Enquiries" value={String(data?.totals.enquiries ?? 0)} helper="All portfolio" icon={MessageSquare} />
        <StatCard label="Verified" value={`${data?.totals.approvalRate ?? 0}%`} helper="Listing quality" icon={ListChecks} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="surface-panel overflow-hidden rounded-lg">
          <div className="border-b border-slate-200 bg-gradient-to-r from-white to-emerald-50 p-5 dark:border-slate-700 dark:from-slate-900 dark:to-emerald-950/20">
            <h2 className="font-semibold text-ink dark:text-white">Portfolio snapshot</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Listings managed by your agents — prioritise verification and pricing updates.
            </p>
          </div>
          {(data?.listings ?? []).length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">No agent listings yet.</p>
          ) : (
            data?.listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="grid gap-3 border-b border-slate-200 p-5 transition last:border-b-0 hover:bg-emerald-50/60 dark:border-slate-700 dark:hover:bg-slate-800 md:grid-cols-[1fr_auto] md:items-center"
              >
                <div>
                  <p className="font-semibold text-ink dark:text-white">{listing.title}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {listing.suburb}, {listing.city} · {listing.ownerName}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-800">
                    {listing.verified ? "Verified" : "Needs verification"}
                  </span>
                  <span className="rounded-full bg-cyan-50 px-3 py-1 text-sm text-ocean">
                    {listing.enquiries} enquiries
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
        <aside className="surface-panel h-fit rounded-lg p-5">
          <h2 className="font-semibold text-ink dark:text-white">Agent performance</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Team response and listing ownership at a glance.</p>
          <div className="mt-4 grid gap-3">
            {(data?.agents ?? []).map((agent) => (
              <div key={agent.id} className="rounded-md border border-slate-200 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-950/60">
                <p className="font-medium text-ink dark:text-white">{agent.name}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {agent.listings} listings · {agent.enquiries} enquiries
                </p>
                <p className="text-xs text-slate-400">{agent.email}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={(e) => void addAgent(e)} className="surface-panel w-full max-w-md rounded-lg p-6">
            <h3 className="text-lg font-semibold">Invite agent</h3>
            <p className="mt-1 text-sm text-slate-500">Creates an agent account linked to your agency and sends onboarding instructions.</p>
            <label className="mt-4 block text-sm font-medium">
              Full name
              <input
                required
                value={newAgent.name}
                onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>
            <label className="mt-3 block text-sm font-medium">
              Email
              <input
                required
                type="email"
                value={newAgent.email}
                onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>
            <div className="mt-5 flex gap-2">
              <Button type="submit" disabled={inviting}>{inviting ? "Inviting..." : "Send invite"}</Button>
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
      {lastInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="surface-panel w-full max-w-md rounded-lg p-6">
            <h3 className="text-lg font-semibold">Agent invited</h3>
            <p className="mt-2 text-sm text-slate-500">
              Share this temporary setup password with {lastInvite.email}. They should change it after signing in.
            </p>
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 font-mono text-sm font-semibold text-emerald-900">
              {lastInvite.temporaryPassword}
            </div>
            <Button className="mt-5 w-full" onClick={() => setLastInvite(null)}>
              Done
            </Button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
