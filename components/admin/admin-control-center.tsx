"use client";

import {
  AlertTriangle,
  DollarSign,
  Home,
  ShieldAlert,
  Timer,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AgentManagementHub } from "@/components/admin/agent-management-hub";
import { AgentAcademyHub } from "@/components/admin/agent-academy-hub";
import { BookingsAdminHub } from "@/components/admin/bookings-admin-hub";
import { EnquiryCrmHub } from "@/components/admin/enquiry-crm-hub";
import { EnterprisePropTechHub } from "@/components/admin/enterprise-proptech-hub";
import { ExecutiveDashboard } from "@/components/admin/executive-dashboard";
import { AdminPageHeader, AdminPanel, AdminLoadingSkeleton } from "@/components/admin/ui/admin-ui";
import { ContentModerationHub } from "@/components/admin/content-moderation-hub";
import { ReportsHub } from "@/components/admin/reports-hub";
import { VerificationQueue } from "@/components/admin/verification-queue";
import { getAdminTabLabel, type AdminTab } from "@/components/admin/admin-shell";
import { HolidayHomesAdminHub } from "@/components/admin/holiday-homes-admin-hub";
import { MarketingCmsHub } from "@/components/admin/marketing-cms-hub";
import { PropertiesManagementHub } from "@/components/admin/properties-management-hub";
import { PropertyManagementHub } from "@/components/admin/property-management-hub";
import { SupportCrmHub } from "@/components/admin/support-crm-hub";
import { SystemOpsHub } from "@/components/admin/system-ops-hub";
import { UserDirectory } from "@/components/admin/user-directory";
import { LandlordAgentHub } from "@/components/admin/landlord-agent-hub";
import { PaymentSettingsPanel } from "@/components/admin/settings/payment-settings-panel";
import { PlatformSettingsPanel } from "@/components/admin/settings/platform-settings-panel";
import { PaymentsAdminHub } from "@/components/admin/payments/payments-admin-hub";
import { AdminOverridesHub } from "@/components/admin/overrides/admin-overrides-hub";
import { TenancyDisputesHub } from "@/components/admin/tenancy-disputes-hub";
import { RoommatesAdminHub } from "@/components/admin/roommates-admin-hub";
import { AdminKpiCard } from "@/components/admin/kpi-card";
import { BarChart, DonutChart, MetricRow } from "@/components/admin/charts";
import { apiFetch } from "@/lib/api/client";
import type {
  ActivityItem,
  AdminOverview,
  AdminPropertyAnalytics,
  AdminUserAnalytics,
  ModerationItem,
  SupportTicket,
  SystemHealth,
  VerificationItem,
} from "@/lib/admin/types";
import type { AdminSummary } from "@/lib/admin/compute-analytics";

type ControlCenterData = {
  overview?: AdminOverview;
  users?: AdminUserAnalytics;
  properties?: AdminPropertyAnalytics;
  verification?: VerificationItem[];
  moderation?: ModerationItem[];
  support?: SupportTicket[];
  payments?: Record<string, unknown>;
  system?: SystemHealth;
  activity?: ActivityItem[];
  audit?: Array<{ id: string; actor: string; action: string; target: string; createdAt: string }>;
  summary?: AdminSummary;
  bookingStats?: { total: number; pending: number; accepted: number; conversionRate: number };
  agentStats?: { totalAgents: number; pendingApplications: number; leadConversionRate: number };
};

const SECTION_BY_TAB: Partial<Record<AdminTab, string>> = {
  overview: "overview",
  users: "users",
  properties: "properties",
  verification: "verification",
  moderation: "moderation",
  support: "support",
  payments: "payments",
  system: "system",
  security: "security",
};

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-white/10 bg-slate-900/60 p-4 sm:p-5 ${className ?? ""}`}>
      <h2 className="mb-4 break-words text-sm font-semibold uppercase tracking-wider text-slate-400">{title}</h2>
      {children}
    </section>
  );
}

export function AdminControlCenter() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pathTab = pathname.match(/^\/dashboard\/admin\/([^/]+)/)?.[1] as AdminTab | undefined;
  const tab = (pathTab ?? searchParams.get("tab") ?? "overview") as AdminTab;
  const [data, setData] = useState<ControlCenterData>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const section = SECTION_BY_TAB[tab];
    if (section) {
      const result = await apiFetch<ControlCenterData>(`/api/v1/admin/control-center?section=${section}`);
      if (result.data) setData((prev) => ({ ...prev, ...result.data }));
    }
    if (tab === "overview" || tab === "reports") {
      const [all, agents, holiday] = await Promise.all([
        apiFetch<ControlCenterData>("/api/v1/admin/control-center?section=all"),
        apiFetch<{ analytics: { totalAgents: number; pendingApplications: number; leadConversionRate: number } }>("/api/v1/admin/agents"),
        apiFetch<{ enquiries: Array<{ status: string }>; analytics: { conversionRate: number } }>("/api/v1/admin/holiday-homes"),
      ]);
      if (all.data) {
        const enquiries = holiday.data?.enquiries ?? [];
        setData({
          ...all.data,
          agentStats: agents.data?.analytics,
          bookingStats: {
            total: enquiries.length,
            pending: enquiries.filter((e) => e.status === "PENDING").length,
            accepted: enquiries.filter((e) => e.status === "ACCEPTED").length,
            conversionRate: holiday.data?.analytics.conversionRate ?? 0,
          },
        });
      }
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const o = data.overview;

  return (
    <div className="space-y-6 sm:space-y-8">
      <AdminPageHeader
        eyebrow="HouseLink Zimbabwe - Enterprise Control Centre"
        title={getAdminTabLabel(tab)}
        description={tabDescriptions[tab]}
      />

      {tab === "overview" && o && data.summary && (
        <ExecutiveDashboard
          overview={o}
          summary={data.summary}
          activity={data.activity ?? []}
          userGrowth={data.users?.growth}
          propertyAnalytics={data.properties}
          bookingStats={data.bookingStats}
          agentStats={data.agentStats}
        />
      )}

      {tab === "overview" && !o && loading && <AdminLoadingSkeleton rows={8} />}

      {tab === "users" && loading && !data.users && <AdminLoadingSkeleton rows={10} />}

      {tab === "users" && data.users && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Object.entries(data.users.totals).slice(0, 8).map(([key, value]) => (
              <AdminKpiCard key={key} label={formatLabel(key)} value={value} icon={Users} />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Registration growth">
              <BarChart data={data.users.growth} color="bg-cyan-500" />
            </Panel>
            <Panel title="Device types">
              <DonutChart data={data.users.devices} />
            </Panel>
            <Panel title="Top cities">
              <BarChart data={data.users.topCities} color="bg-emerald-500" />
            </Panel>
            <Panel title="Registration sources">
              <DonutChart data={data.users.registrationSources} />
            </Panel>
          </div>
          <Panel title="User directory">
            <UserDirectory />
          </Panel>
        </>
      )}

      {tab === "properties" && loading && !data.properties && <AdminLoadingSkeleton rows={10} />}

      {tab === "properties" && data.properties && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AdminKpiCard label="Avg Rent" value={`$${data.properties.avgRent}`} icon={Home} />
            <AdminKpiCard label="Avg Sale" value={`$${data.properties.avgSale}`} icon={DollarSign} />
            <AdminKpiCard label="Missing Photos" value={data.properties.qualityIssues.missingPhotos} icon={AlertTriangle} tone="warning" />
            <AdminKpiCard label="Awaiting Verification" value={data.properties.qualityIssues.awaitingVerification} icon={ShieldAlert} tone="warning" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Listings by city">
              <BarChart data={data.properties.byCity} />
            </Panel>
            <Panel title="Listings by type">
              <DonutChart data={data.properties.byType} />
            </Panel>
            <Panel title="Most viewed">
              {data.properties.mostViewed.map((l) => (
                <MetricRow key={l.id} label={l.title.slice(0, 40)} value={l.views} />
              ))}
            </Panel>
            <Panel title="Most saved">
              {data.properties.mostSaved.map((l) => (
                <MetricRow key={l.id} label={l.title.slice(0, 40)} value={l.saves} />
              ))}
            </Panel>
          </div>
          <Panel title="Listing operations">
            <PropertiesManagementHub />
          </Panel>
        </>
      )}

      {tab === "verification" && (
        <Panel title="Verification queue">
          <VerificationQueue items={data.verification ?? []} onRefresh={() => void load()} />
        </Panel>
      )}

      {tab === "moderation" && (
        <div className="grid gap-4">
          <Panel title="Tenancy dispute queue">
            <TenancyDisputesHub />
          </Panel>
          <Panel title="Content moderation">
            <ContentModerationHub items={data.moderation ?? []} onRefresh={() => void load()} />
          </Panel>
        </div>
      )}

      {tab === "support" && <SupportCrmHub />}

      {tab === "enquiries" && <EnquiryCrmHub />}

      {tab === "proptech" && (
        <Panel title="Enterprise PropTech operations">
          <EnterprisePropTechHub />
        </Panel>
      )}

      {tab === "payments" && (
        <>
          {data.payments && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <AdminKpiCard label="MRR" value={`$${(data.payments.mrr as number)?.toLocaleString()}`} icon={DollarSign} />
              <AdminKpiCard label="ARR" value={`$${(data.payments.arr as number)?.toLocaleString()}`} icon={TrendingUp} />
              <AdminKpiCard label="Failed Payments" value={data.payments.failed as number} icon={XCircle} tone="danger" />
              <AdminKpiCard label="Pending" value={data.payments.pending as number} icon={Timer} tone="warning" />
            </div>
          )}
          <Panel title="Payment ledger">
            <PaymentsAdminHub />
          </Panel>
          <Panel title="Payment gateway settings">
            <PaymentSettingsPanel />
          </Panel>
        </>
      )}

      {tab === "settings" && <PlatformSettingsPanel />}

      {tab === "overrides" && (
        <Panel title="Super admin authority">
          <AdminOverridesHub />
        </Panel>
      )}

      {tab === "system" && <SystemOpsHub mode="system" />}
      {tab === "ai" && <SystemOpsHub mode="ai" />}
      {tab === "security" && <SystemOpsHub mode="security" />}
      {tab === "marketing" && <MarketingCmsHub />}

      {tab === "landlords" && (
        <Panel title="Landlords, estate agents & agencies">
          <LandlordAgentHub />
        </Panel>
      )}

      {tab === "agents" && (
        <Panel title="Agent recruitment, commissions & territories">
          <AgentManagementHub />
        </Panel>
      )}

      {tab === "academy" && <AgentAcademyHub />}

      {tab === "property-management" && (
        <Panel title="Property management CRM">
          <PropertyManagementHub />
        </Panel>
      )}

      {tab === "holiday-homes" && (
        <AdminPanel title="Holiday home operations">
          <HolidayHomesAdminHub />
        </AdminPanel>
      )}

      {tab === "bookings" && <BookingsAdminHub />}

      {tab === "roommates" && <RoommatesAdminHub />}

      {tab === "reports" && (
        <ReportsHub />
      )}
    </div>
  );
}

const tabDescriptions: Record<AdminTab, string> = {
  overview: "Executive command centre - revenue, growth, bookings, agents, and live platform intelligence.",
  users: "Search accounts, manage roles, suspend users, and review growth analytics.",
  properties: "Analyse listing quality and run bulk approve, verify, feature, archive, or delete actions.",
  verification: "Review landlord, agency, and identity verification submissions.",
  moderation: "Resolve tenancy disputes and content moderation items from reports and review queue.",
  support: "Manage customer support tickets with assignment, escalation, and resolution.",
  enquiries: "Full enquiry CRM - assign agents, track pipeline, merge duplicates, and configure routing.",
  proptech: "Appointment booking, signed documents, AI market intelligence, virtual tour analytics, and notification operations in one enterprise dashboard.",
  landlords: "Verify landlords, manage agencies, and control premium tiers.",
  agents: "Recruit agents, approve applications, pay commissions, and manage territories.",
  academy: "Standalone enterprise LMS for HouseLink agent training, certification, documents, videos, live learning, and analytics.",
  "property-management": "Full property management request workflow from intake to completion.",
  "holiday-homes": "Manage holiday listings, seasonal settings, host reviews, and featured placement.",
  bookings: "End-to-end booking operations: enquiries, approvals, calendar view, guest details, and status tracking.",
  payments: "Revenue dashboard, ledger, manual payments, refunds, escrow-style reviews, and gateway health.",
  settings: "Brand, locations, integrations, notifications, legal, and admin access roles.",
  overrides: "Emergency super-admin actions with audit trail.",
  marketing: "Full homepage CMS: hero, featured listings/agents, trust metrics, banners, SEO, and campaigns.",
  ai: "Control AI search, fraud detection, roommate matching, and duplicate detection.",
  system: "Monitor service health, infrastructure load, and queue depth.",
  security: "Review sessions, blocked accounts, and full audit log.",
  reports: "Download revenue, user, property, and audit exports.",
  roommates: "Verify seeker profiles, moderate bios, feature top matches, and manage roommate discovery.",
};

function formatLabel(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}
