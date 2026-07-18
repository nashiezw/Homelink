"use client";

import {
  ArrowUpRight,
  Building2,
  CalendarCheck,
  DollarSign,
  Globe2,
  Home,
  MapPin,
  Megaphone,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { AdminKpiCard } from "@/components/admin/kpi-card";
import { BarChart, DonutChart, MetricRow, Sparkline } from "@/components/admin/charts";
import {
  AdminMetricGrid,
  AdminPanel,
  AdminStatPill,
} from "@/components/admin/ui/admin-ui";
import type { ActivityItem, AdminOverview, AdminPropertyAnalytics, ChartPoint } from "@/lib/admin/types";
import type { AdminSummary } from "@/lib/admin/compute-analytics";

type ExecutiveDashboardProps = {
  overview: AdminOverview;
  summary: AdminSummary;
  activity: ActivityItem[];
  userGrowth?: ChartPoint[];
  propertyAnalytics?: AdminPropertyAnalytics;
  bookingStats?: {
    total: number;
    pending: number;
    accepted: number;
    conversionRate: number;
  };
  agentStats?: {
    totalAgents: number;
    pendingApplications: number;
    leadConversionRate: number;
  };
};

export function ExecutiveDashboard({
  overview: o,
  summary,
  activity,
  userGrowth = [],
  propertyAnalytics,
  bookingStats,
  agentStats,
}: ExecutiveDashboardProps) {
  const revenueSpark = [
    o.revenue.today,
    o.revenue.monthly * 0.25,
    o.revenue.monthly * 0.45,
    o.revenue.monthly * 0.65,
    o.revenue.monthly * 0.85,
    o.revenue.monthly,
    o.revenue.forecast,
  ].map((v) => Math.max(v / 100, 1));

  const growthData = userGrowth.length
    ? userGrowth
    : [{ label: "-", value: o.users.registrationsToday }];

  const healthColor =
    o.systemHealth === "healthy" ? "text-emerald-400" : o.systemHealth === "degraded" ? "text-amber-400" : "text-red-400";

  const actionTotal =
    summary.pendingListings +
    summary.openTickets +
    summary.pendingVerification +
    summary.openDisputes +
    summary.pendingAgents;

  return (
    <div className="space-y-5 sm:space-y-8">
      <AdminMetricGrid cols={4}>
        <AdminStatPill label="Action required" value={actionTotal} tone="warning" />
        <AdminStatPill label="Verification queue" value={summary.pendingVerification} tone="info" />
        <AdminStatPill label="Open disputes" value={summary.openDisputes} tone="danger" />
        <AdminStatPill
          label="Platform health"
          value={o.systemHealth}
          tone={o.systemHealth === "healthy" ? "success" : "warning"}
        />
      </AdminMetricGrid>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        <AdminKpiCard label="Monthly revenue" value={`$${o.revenue.mrr.toLocaleString()}`} icon={DollarSign} tone="success" change={`$${o.revenue.today.toLocaleString()} today`} />
        <AdminKpiCard label="ARR run-rate" value={`$${o.revenue.arr.toLocaleString()}`} icon={TrendingUp} />
        <AdminKpiCard label="Total users" value={o.users.total.toLocaleString()} icon={Users} change={`+${o.users.registrationsToday} today`} />
        <AdminKpiCard label="Active listings" value={o.properties.active} icon={Home} />
        <AdminKpiCard label="Pending approvals" value={o.properties.pendingApprovals} icon={Building2} tone="warning" />
        {bookingStats && (
          <AdminKpiCard
            label="Booking enquiries"
            value={bookingStats.total}
            icon={CalendarCheck}
            tone={bookingStats.pending > 0 ? "warning" : "default"}
            change={`${bookingStats.conversionRate}% conversion`}
          />
        )}
        {agentStats && (
          <AdminKpiCard
            label="Active agents"
            value={agentStats.totalAgents}
            icon={Users}
            change={`${agentStats.pendingApplications} applications pending`}
          />
        )}
      </div>

      <div className="grid gap-3 sm:gap-4 xl:grid-cols-3">
        <AdminPanel title="Revenue intelligence" description="Transactions, subscriptions & forecast" className="xl:col-span-2">
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            <div>
              <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl">${o.revenue.forecast.toLocaleString()}</p>
              <p className="mt-1 text-sm text-slate-400">30-day revenue forecast</p>
              <div className="mt-4 text-emerald-400">
                <Sparkline values={revenueSpark} />
              </div>
            </div>
            <div className="space-y-1">
              <MetricRow label="Today's revenue" value={`$${o.revenue.today.toLocaleString()}`} />
              <MetricRow label="Monthly total" value={`$${o.revenue.monthly.toLocaleString()}`} />
              <MetricRow label="MRR" value={`$${o.revenue.mrr.toLocaleString()}`} />
              <MetricRow label="Properties sold" value={o.properties.sold} />
              <MetricRow label="Properties rented" value={o.properties.rented} />
              <MetricRow label="Expired listings" value={o.properties.expired} />
            </div>
          </div>
        </AdminPanel>

        <CommandQuickActions summary={summary} />
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <AdminPanel title="Marketplace pulse">
          <div className="space-y-1">
            <MetricRow label="Total properties" value={o.properties.total} />
            <MetricRow label="Added today" value={o.properties.addedToday} />
            <MetricRow label="Flagged / reports" value={o.properties.flagged} />
            <MetricRow label="Duplicate alerts" value={o.properties.duplicates} />
            <MetricRow label="Fraud signals" value={o.properties.fakeDetected} />
            <MetricRow label="Active sessions" value={o.users.online} />
            <MetricRow label="Roommate profiles" value={summary.pendingRoommates} />
          </div>
        </AdminPanel>

        <AdminPanel title="Listings by status">
          <DonutChart
            data={[
              { label: "Active", value: o.properties.active },
              { label: "Pending", value: o.properties.pendingApprovals },
              { label: "Sold", value: o.properties.sold },
              { label: "Rented", value: o.properties.rented },
              { label: "Expired", value: o.properties.expired },
            ].filter((d) => d.value > 0)}
          />
        </AdminPanel>

        <AdminPanel title="Operations health">
          <p className={`text-lg font-semibold capitalize ${healthColor}`}>{o.systemHealth}</p>
          <p className="mt-1 text-xs text-slate-500">Payments, queues & platform configuration</p>
          <div className="mt-4 space-y-1">
            <MetricRow label="Open support tickets" value={summary.openTickets} />
            <MetricRow label="PM requests" value={summary.openPmRequests} />
            <MetricRow label="Pending agents" value={summary.pendingAgents} />
            <MetricRow label="Flagged reports" value={summary.flaggedReports} />
            {bookingStats && <MetricRow label="Pending bookings" value={bookingStats.pending} />}
          </div>
          <Link href="/dashboard/admin/system" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-cyan-400 hover:underline">
            System health details <ArrowUpRight className="size-3" />
          </Link>
        </AdminPanel>

        <AdminPanel title="Agent performance">
          {agentStats ? (
            <div className="space-y-1">
              <MetricRow label="Total agents" value={agentStats.totalAgents} />
              <MetricRow label="Pending applications" value={agentStats.pendingApplications} />
              <MetricRow label="Lead conversion" value={`${agentStats.leadConversionRate}%`} />
            </div>
          ) : (
            <p className="text-sm text-slate-500">Agent analytics loading...</p>
          )}
          <Link href="/dashboard/admin/agents" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-cyan-400 hover:underline">
            Agent management <ArrowUpRight className="size-3" />
          </Link>
        </AdminPanel>
      </div>

      {propertyAnalytics && (
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
          <AdminPanel title="Geographic performance" description="Listings by province">
            <div className="mb-4 flex items-center gap-2 text-slate-400">
              <Globe2 className="size-4" />
              <span className="text-xs">Top markets across Zimbabwe</span>
            </div>
            <BarChart data={propertyAnalytics.byProvince.slice(0, 8)} color="bg-cyan-500" />
          </AdminPanel>
          <AdminPanel title="Property types" description="Inventory mix">
            <div className="mb-4 flex items-center gap-2 text-slate-400">
              <MapPin className="size-4" />
              <span className="text-xs">Avg rent ${propertyAnalytics.avgRent} - Avg sale ${propertyAnalytics.avgSale}</span>
            </div>
            <DonutChart data={propertyAnalytics.byType.filter((d) => d.value > 0)} />
          </AdminPanel>
        </div>
      )}

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <AdminPanel title="User registrations" description="Registrations by day of week (platform data)">
          <BarChart data={growthData} color="bg-emerald-500" />
        </AdminPanel>

        <AdminPanel title="Live activity feed" description="Latest admin & platform events">
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {activity.length === 0 ? (
              <p className="text-sm text-slate-500">No recent activity recorded.</p>
            ) : (
              activity.map((item) => (
                <div key={item.id} className="flex gap-3 rounded-xl border border-white/[0.04] bg-slate-950/50 px-3 py-2.5 text-sm">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-emerald-400" />
                  <div className="min-w-0">
                    <p className="text-slate-200">{item.message}</p>
                    <p className="text-xs text-slate-500">{item.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <Link href="/dashboard/admin/security" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-cyan-400 hover:underline">
            Full audit log <ArrowUpRight className="size-3" />
          </Link>
        </AdminPanel>
      </div>
    </div>
  );
}

function CommandQuickActions({ summary }: { summary: AdminSummary }) {
  const actions = [
    {
      icon: ShieldCheck,
      label: "Verification queue",
      description: `${summary.pendingVerification} pending`,
      href: "/dashboard/admin/verification",
    },
    {
      icon: Home,
      label: "Listing approvals",
      description: `${summary.pendingListings} awaiting review`,
      href: "/dashboard/admin/properties",
    },
    {
      icon: Wallet,
      label: "Payments & escrow",
      description: "Ledger, refunds, payouts",
      href: "/dashboard/admin/payments",
    },
    {
      icon: Users,
      label: "User directory",
      description: "Roles, suspend, audit trail",
      href: "/dashboard/admin/users",
    },
    {
      icon: Megaphone,
      label: "Marketing & CMS",
      description: "Homepage, campaigns, SEO",
      href: "/dashboard/admin/marketing",
    },
    {
      icon: Zap,
      label: "Reports & exports",
      description: "Revenue, users, compliance",
      href: "/dashboard/admin/reports",
    },
  ];

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#07111f] p-3 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] sm:p-4">
      <div className="mb-3 px-1">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Command quick actions</h2>
        <p className="mt-1 text-xs text-slate-500">High-priority operational workflows</p>
      </div>
      <div className="grid gap-2 sm:gap-3">
        {actions.map(({ icon: Icon, label, description, href }) => (
          <Link
            key={href}
            href={href}
            rel={href.includes("?") ? "nofollow" : undefined}
            className="relative isolate grid min-h-[4rem] w-full grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 rounded-xl border border-white/[0.08] bg-[#0b1424] px-3 py-2.5 text-left transition hover:border-emerald-500/30 hover:bg-[#0d1a2d] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 sm:min-h-[4.25rem] sm:grid-cols-[2.75rem_minmax(0,1fr)]"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-300 sm:size-11">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-5 text-white sm:text-base">{label}</span>
              <span className="mt-1 block text-xs leading-4 text-slate-500 sm:text-sm">{description}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
