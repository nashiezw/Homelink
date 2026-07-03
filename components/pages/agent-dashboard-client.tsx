"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  GraduationCap,
  Star,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { AgentEnquiryWorkbench } from "@/components/agents/agent-enquiry-workbench";
import { CloseLeadModal } from "@/components/agents/close-lead-modal";
import { apiFetch } from "@/lib/api/client";
import type {
  AgentAppointment,
  AgentCommission,
  AgentDashboardStats,
  AgentLead,
  AgentProfile,
  AgentRating,
  AgentTask,
  AgentTrainingModule,
  AgentTrainingProgress,
  AgentWalletEntry,
} from "@/lib/agents/types";

type AgentData = {
  profile: AgentProfile | null;
  stats: AgentDashboardStats;
  leads: AgentLead[];
  commissions: AgentCommission[];
  training: { modules: AgentTrainingModule[]; progress: AgentTrainingProgress[] };
  appointments: AgentAppointment[];
  tasks: AgentTask[];
  wallet: AgentWalletEntry[];
  ratings: AgentRating[];
};

const TABS = [
  "Dashboard",
  "Enquiries",
  "Leads",
  "Listings",
  "Commissions",
  "Training",
  "Calendar",
  "Reviews",
  "Wallet",
] as const;

type Tab = (typeof TABS)[number];

const TERMINAL_LEAD_STATUSES: AgentLead["status"][] = ["CLOSED_WON", "CLOSED_LOST"];

export function AgentDashboardClient() {
  const { user, showToast } = useApp();
  const [tab, setTab] = useState<Tab>("Dashboard");
  const [data, setData] = useState<AgentData | null>(null);
  const [application, setApplication] = useState<{ status: string } | null>(null);
  const [closingLead, setClosingLead] = useState<AgentLead | null>(null);

  const load = useCallback(async () => {
    const [me, app] = await Promise.all([
      apiFetch<AgentData>("/api/v1/agents/me"),
      apiFetch<{ status: string } | null>("/api/v1/agents/applications"),
    ]);
    if (me.data) setData(me.data);
    if (app.data) setApplication(app.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateLead(leadId: string, status: AgentLead["status"]) {
    await apiFetch("/api/v1/agents/leads", {
      method: "PATCH",
      body: JSON.stringify({ leadId, status }),
    });
    showToast(`Lead marked as ${status.replace(/_/g, " ").toLowerCase()}.`);
    void load();
  }

  async function completeTraining(moduleId: string) {
    await apiFetch("/api/v1/agents/training", {
      method: "POST",
      body: JSON.stringify({ moduleId, score: 100 }),
    });
    showToast("Training module completed.");
    void load();
  }

  if (!user) {
    return (
      <PageShell eyebrow="Agent" title="Sign in required" description="Sign in to access your agent dashboard.">
        <Link href="/auth?next=/dashboard/agent" className="text-emerald-700 font-semibold hover:underline">
          Sign in
        </Link>
      </PageShell>
    );
  }

  if (!data?.profile && application) {
    return (
      <PageShell
        eyebrow="Agent application"
        title="Application in progress"
        description={`Your application status: ${application.status.replace(/_/g, " ")}`}
        actions={
          <Link href="/become-agent/apply">
            <Button>Continue application</Button>
          </Link>
        }
      >
        <p className="text-sm text-slate-600">Track your progress here. You will receive notifications at each stage.</p>
      </PageShell>
    );
  }

  if (!data?.profile) {
    return (
      <PageShell
        eyebrow="Agent"
        title="Become a HomeLink agent"
        description="You don't have an active agent profile yet."
        actions={
          <Link href="/become-agent/apply">
            <Button>Start application</Button>
          </Link>
        }
      >
        <p className="text-sm text-slate-600">Complete the application to join Zimbabwe&apos;s trusted agent network.</p>
      </PageShell>
    );
  }

  const { profile, stats, leads, commissions, training, appointments, tasks, wallet, ratings } = data;

  return (
    <PageShell
      eyebrow="Agent dashboard"
      title={`Welcome, ${user.name}`}
      description={`${profile.agentIdCode} · ${profile.level} agent · ${profile.status}`}
      highlights={[
        { value: String(stats.activeLeads), label: "active leads" },
        { value: `$${stats.walletBalance.toFixed(0)}`, label: "wallet" },
        { value: stats.averageRating.toFixed(1), label: "rating" },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href={`/agents/${profile.publicSlug}`}>
            <Button variant="secondary">Public profile</Button>
          </Link>
          <Link href="/dashboard/landlord/new">
            <Button>List property</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              tab === t ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Dashboard" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Active leads" value={String(stats.activeLeads)} icon={TrendingUp} helper="Assigned to you" />
            <StatCard label="Active listings" value={`${stats.activeListings}/${stats.totalListings}`} icon={Briefcase} helper="Live portfolio" />
            <StatCard label="Expected earnings" value={`$${stats.expectedEarnings.toFixed(0)}`} icon={Wallet} helper="Pending + approved + paid" />
            <StatCard label="Open tasks" value={String(stats.openTasks)} icon={CheckCircle2} helper="Follow-ups" />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="HomeLink leads" value={String(stats.homelinkLeads)} icon={TrendingUp} helper="Company generated" />
            <StatCard label="Agent leads" value={String(stats.agentLeads)} icon={BadgeCheck} helper="Personally sourced" />
            <StatCard label="Pending commission" value={`$${stats.pendingCommissionAmount.toFixed(0)}`} icon={Wallet} helper={`${stats.pendingCommissions} awaiting action`} />
            <StatCard label="Paid commission" value={`$${stats.paidCommissionAmount.toFixed(0)}`} icon={CheckCircle2} helper={`${stats.leadConversionRate}% conversion`} />
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <section className="premium-card rounded-xl p-5">
              <h2 className="font-semibold">Digital agent card</h2>
              <p className="mt-2 text-sm text-slate-600">Agent ID: {profile.agentNumber}</p>
              <p className="text-sm text-slate-600">QR: {profile.qrCodeData}</p>
              <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                <BadgeCheck className="size-4" /> Verified HomeLink badge active
              </p>
            </section>
            <section className="premium-card rounded-xl p-5">
              <h2 className="font-semibold">Performance</h2>
              <p className="mt-2 text-3xl font-semibold">{profile.level}</p>
              <p className="text-sm text-slate-600">{profile.completedDeals} completed deals · {profile.ratingCount} reviews</p>
            </section>
          </div>
        </>
      )}

      {tab === "Enquiries" && <AgentEnquiryWorkbench />}

      {tab === "Leads" && (
        <div className="grid gap-4">
          {leads.map((lead) => (
            <article key={lead.id} className="premium-card rounded-xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{lead.clientName}</p>
                  <p className="text-sm text-slate-600">{lead.listingTitle ?? lead.clientType} · {lead.status}</p>
                  <p className="mt-1 text-sm text-slate-500">{lead.notes}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {lead.status !== "ACCEPTED" && !TERMINAL_LEAD_STATUSES.includes(lead.status) && (
                    <Button variant="secondary" onClick={() => void updateLead(lead.id, "ACCEPTED")}>Accept</Button>
                  )}
                  {lead.status !== "CONTACTED" && !TERMINAL_LEAD_STATUSES.includes(lead.status) && (
                    <Button variant="secondary" onClick={() => void updateLead(lead.id, "CONTACTED")}>Contacted</Button>
                  )}
                  {!TERMINAL_LEAD_STATUSES.includes(lead.status) && (
                    <Button onClick={() => setClosingLead(lead)}>Close won</Button>
                  )}
                </div>
              </div>
            </article>
          ))}
          {!leads.length && <p className="text-sm text-slate-500">No leads yet. New enquiries will be assigned automatically.</p>}
        </div>
      )}

      {tab === "Listings" && (
        <div className="premium-card rounded-xl p-6 text-center">
          <p className="font-semibold">Manage your listings</p>
          <p className="mt-2 text-sm text-slate-600">Create and edit listings from the landlord tools.</p>
          <Link href="/dashboard/landlord" className="mt-4 inline-flex text-emerald-700 font-semibold hover:underline">
            Open listings dashboard
          </Link>
        </div>
      )}

      {tab === "Commissions" && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Lead source</th>
                <th className="px-4 py-3 text-left">Rule & split</th>
                <th className="px-4 py-3 text-left">Deal</th>
                <th className="px-4 py-3 text-left">HomeLink share</th>
                <th className="px-4 py-3 text-left">Agent gross</th>
                <th className="px-4 py-3 text-left">Agent net payout</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((c) => (
                <tr key={c.id} className="border-t border-slate-200 dark:border-slate-700">
                  <td className="px-4 py-3">{c.type}</td>
                  <td className="px-4 py-3">{c.leadSource ?? "HOMELINK"}</td>
                  <td className="px-4 py-3">
                    <p>{c.commissionRuleLabel ?? c.ruleSnapshot.ruleLabel ?? "Configured commission rule"}</p>
                    <p className="text-xs text-slate-500">HomeLink {c.ruleSnapshot.homelinkSplitPercent}% / Agent {c.ruleSnapshot.agentSplitPercent}%</p>
                  </td>
                  <td className="px-4 py-3">{c.dealRef}</td>
                  <td className="px-4 py-3">${c.homelinkAmount.toFixed(2)}</td>
                  <td className="px-4 py-3">${c.agentAmount.toFixed(2)}</td>
                  <td className="px-4 py-3">${c.netAgentAmount.toFixed(2)}</td>
                  <td className="px-4 py-3">{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Training" && (
        <div className="grid gap-4">
          {training.modules.map((module) => {
            const done = training.progress.some((p) => p.moduleId === module.id && p.status === "COMPLETED");
            return (
              <article key={module.id} className="premium-card flex items-center justify-between gap-4 rounded-xl p-5">
                <div>
                  <p className="font-semibold">{module.title}</p>
                  <p className="text-sm text-slate-600">{module.description}</p>
                </div>
                {done ? (
                  <span className="text-sm font-medium text-emerald-700">Completed</span>
                ) : (
                  <Button onClick={() => void completeTraining(module.id)}>
                    <GraduationCap className="size-4" /> Complete
                  </Button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {tab === "Calendar" && (
        <div className="grid gap-3">
          {appointments.map((a) => (
            <div key={a.id} className="premium-card rounded-xl p-4">
              <p className="font-semibold">{a.title}</p>
              <p className="text-sm text-slate-600">{new Date(a.startsAt).toLocaleString()} · {a.location}</p>
            </div>
          ))}
          {!appointments.length && <p className="text-sm text-slate-500">No appointments scheduled.</p>}
          {tasks.map((t) => (
            <div key={t.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
              Task: {t.title} · {t.status}
            </div>
          ))}
        </div>
      )}

      {tab === "Reviews" && (
        <div className="grid gap-4">
          {ratings.map((r) => (
            <article key={r.id} className="premium-card rounded-xl p-5">
              <div className="flex items-center gap-2">
                <Star className="size-4 text-amber-500" />
                <p className="font-semibold">{r.overall.toFixed(1)} — {r.customerName}</p>
              </div>
              <p className="mt-2 text-sm text-slate-600">{r.comment}</p>
            </article>
          ))}
        </div>
      )}

      {tab === "Wallet" && (
        <div className="grid gap-3">
          {wallet.map((e) => (
            <div key={e.id} className="premium-card flex justify-between rounded-xl p-4 text-sm">
              <span>{e.description}</span>
              <span className={e.type === "CREDIT" ? "text-emerald-700 font-semibold" : "text-red-600"}>
                {e.type === "CREDIT" ? "+" : "-"}${e.amount.toFixed(2)}
              </span>
            </div>
          ))}
          {!wallet.length && <p className="text-sm text-slate-500">No wallet transactions yet.</p>}
        </div>
      )}

      {closingLead && (
        <CloseLeadModal
          lead={closingLead}
          onClose={() => setClosingLead(null)}
          onSuccess={() => {
            showToast("Deal closed — commission recorded.");
            void load();
          }}
        />
      )}
    </PageShell>
  );
}
