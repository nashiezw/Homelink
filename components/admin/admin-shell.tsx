"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  CalendarCheck,
  Activity,
  Award,
  Brain,
  Briefcase,
  Building2,
  BookOpen,
  ClipboardCheck,
  Command,
  CreditCard,
  FileText,
  FolderOpen,
  Headphones,
  Home,
  LayoutDashboard,
  GraduationCap,
  Megaphone,
  Menu,
  MessageSquare,
  PlayCircle,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { HomeLinkLogoLink } from "@/components/brand/homelink-logo";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { AdminBreadcrumb } from "@/components/admin/ui/admin-ui";
import type { Notification } from "@/lib/store/types";

export type AdminTab =
  | "overview"
  | "users"
  | "properties"
  | "verification"
  | "moderation"
  | "support"
  | "landlords"
  | "agents"
  | "academy"
  | "property-management"
  | "holiday-homes"
  | "bookings"
  | "payments"
  | "settings"
  | "overrides"
  | "marketing"
  | "ai"
  | "system"
  | "security"
  | "reports"
  | "enquiries"
  | "roommates";

type AdminSummary = {
  pendingListings: number;
  openTickets: number;
  pendingVerification: number;
  openDisputes: number;
  pendingAgents: number;
  openPmRequests: number;
  flaggedReports: number;
  pendingRoommates: number;
};

type NavItem = {
  id: AdminTab;
  label: string;
  icon: typeof LayoutDashboard;
  badgeKey?: keyof AdminSummary;
  academyView?: string;
};

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Operations",
    items: [
      { id: "overview", label: "Command Center", icon: LayoutDashboard },
      { id: "enquiries", label: "Enquiry CRM", icon: MessageSquare },
      { id: "reports", label: "Reports", icon: FileText },
    ],
  },
  {
    label: "HomeLink Agent Academy",
    items: [
      { id: "academy", label: "Dashboard", icon: GraduationCap, academyView: "Dashboard" },
      { id: "academy", label: "Courses", icon: BookOpen, academyView: "Courses" },
      { id: "academy", label: "Lessons", icon: FileText, academyView: "Lessons" },
      { id: "academy", label: "Learning Paths", icon: FolderOpen, academyView: "Learning Paths" },
      { id: "academy", label: "Quizzes", icon: ShieldCheck, academyView: "Quizzes" },
      { id: "academy", label: "Assignments", icon: ClipboardCheck, academyView: "Assignments" },
      { id: "academy", label: "Final Exams", icon: GraduationCap, academyView: "Final Exams" },
      { id: "academy", label: "Certificates", icon: Award, academyView: "Certificates" },
      { id: "academy", label: "Training Resources", icon: FileText, academyView: "Training Resources" },
      { id: "academy", label: "Video Library", icon: PlayCircle, academyView: "Video Library" },
      { id: "academy", label: "Announcements", icon: Megaphone, academyView: "Announcements" },
      { id: "academy", label: "Discussion Board", icon: MessageSquare, academyView: "Discussion Board" },
      { id: "academy", label: "Leaderboard", icon: Trophy, academyView: "Leaderboard" },
      { id: "academy", label: "Badges", icon: Award, academyView: "Badges" },
      { id: "academy", label: "Training Analytics", icon: Activity, academyView: "Analytics" },
      { id: "academy", label: "Training Settings", icon: Settings, academyView: "Settings" },
    ],
  },
  {
    label: "People",
    items: [
      { id: "users", label: "Users & Directory", icon: Users },
      { id: "landlords", label: "Landlords & Agents", icon: Building2 },
      { id: "agents", label: "Agent Management", icon: Briefcase, badgeKey: "pendingAgents" as const },
      { id: "verification", label: "Verification", icon: ShieldCheck, badgeKey: "pendingVerification" as const },
      { id: "roommates", label: "Roommates", icon: Users, badgeKey: "pendingRoommates" as const },
    ],
  },
  {
    label: "Properties",
    items: [
      { id: "properties", label: "Listings Hub", icon: Home, badgeKey: "pendingListings" as const },
      { id: "property-management", label: "Property Requests", icon: Building2, badgeKey: "openPmRequests" as const },
      { id: "holiday-homes", label: "Holiday Homes", icon: Building2 },
      { id: "bookings", label: "Bookings", icon: CalendarCheck },
    ],
  },
  {
    label: "Trust & Revenue",
    items: [
      { id: "moderation", label: "Moderation", icon: Shield, badgeKey: "flaggedReports" as const },
      { id: "support", label: "Support CRM", icon: Headphones, badgeKey: "openTickets" as const },
      { id: "payments", label: "Payments", icon: CreditCard },
    ],
  },
  {
    label: "Platform",
    items: [
      { id: "settings", label: "Platform Settings", icon: Settings },
      { id: "overrides", label: "Admin Overrides", icon: ShieldAlert },
      { id: "marketing", label: "Marketing & CMS", icon: Megaphone },
      { id: "ai", label: "AI Control", icon: Brain },
      { id: "system", label: "System Health", icon: Activity },
      { id: "security", label: "Security & Audit", icon: Wrench },
    ],
  },
] ;

const TAB_LABELS: Record<AdminTab, string> = {
  overview: "Command Center",
  users: "Users & Directory",
  properties: "Listings Hub",
  verification: "Verification Queue",
  moderation: "Moderation Center",
  support: "Support CRM",
  landlords: "Landlords & Agents",
  agents: "Agent Management",
  academy: "HomeLink Agent Academy",
  "property-management": "Property Requests",
  "holiday-homes": "Holiday Homes",
  bookings: "Bookings & Reservations",
  payments: "Payments",
  settings: "Platform Settings",
  overrides: "Admin Overrides",
  marketing: "Marketing & CMS",
  ai: "AI Control",
  system: "System Health",
  security: "Security & Audit",
  reports: "Reports & Exports",
  enquiries: "Enquiry CRM",
  roommates: "Roommate Seekers",
};

export function getAdminTabLabel(tab: AdminTab) {
  return TAB_LABELS[tab] ?? tab;
}

const ALL_NAV = NAV_GROUPS.flatMap((g) => g.items);
const VALID_TABS = new Set(ALL_NAV.map((n) => n.id));

function findNavGroup(tab: AdminTab) {
  return NAV_GROUPS.find((g) => g.items.some((i) => i.id === tab));
}

function allowedTabsForRoles(roles: string[]): Set<AdminTab> | null {
  if (roles.includes("ADMIN")) return null;
  const tabs = new Set<AdminTab>();
  if (roles.includes("SUPPORT")) ["overview", "support", "enquiries", "reports"].forEach((tab) => tabs.add(tab as AdminTab));
  if (roles.includes("BILLING")) ["overview", "support", "payments", "reports"].forEach((tab) => tabs.add(tab as AdminTab));
  if (roles.includes("TECH_SUPPORT")) ["overview", "support", "system", "security", "reports"].forEach((tab) => tabs.add(tab as AdminTab));
  if (roles.includes("TRUST_SAFETY")) ["overview", "support", "verification", "moderation", "users", "reports"].forEach((tab) => tabs.add(tab as AdminTab));
  return tabs;
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { user } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") ?? "overview") as AdminTab;
  const activeTab = VALID_TABS.has(tab) ? tab : "overview";
  const activeAcademyView = searchParams.get("academyView") ?? "Dashboard";
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const navigate = useCallback(
    (item: NavItem | AdminTab) => {
      const id = typeof item === "string" ? item : item.id;
      const next = new URLSearchParams();
      next.set("tab", id);
      if (typeof item !== "string" && item.academyView) {
        next.set("academyView", item.academyView);
      }
      router.push(`${pathname}?${next.toString()}`);
      setPaletteOpen(false);
      setMobileOpen(false);
    },
    [pathname, router],
  );

  useEffect(() => {
    void apiFetch<AdminSummary>("/api/v1/admin/summary").then((r) => {
      if (r.data) setSummary(r.data);
    });
    void apiFetch<{ permissions: string[]; roles: string[] }>("/api/v1/admin/me").then((r) => {
      if (r.data?.permissions) setPermissions(r.data.permissions);
    });
    void apiFetch<Notification[]>("/api/v1/notifications").then((r) => {
      if (r.data) setNotifications(r.data);
    });
  }, [tab]);

  async function toggleNotifications() {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    if (nextOpen) {
      const result = await apiFetch<Notification[]>("/api/v1/notifications");
      if (result.data) setNotifications(result.data);
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!user) return;
    const allowed = allowedTabsForRoles(user.roles);
    if (allowed && !allowed.has(activeTab)) {
      router.replace(`${pathname}?tab=${allowed.values().next().value ?? "support"}`);
    }
  }, [activeTab, pathname, router, user]);

  if (!user) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-950 px-4 text-center text-slate-300">
        <div>
          <p className="text-lg font-semibold text-white">Admin access required</p>
          <p className="mt-2 text-sm">Sign in with an administrator account to continue.</p>
          <Link href="/auth" className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  const allowedTabs = allowedTabsForRoles(user.roles);
  if (allowedTabs && allowedTabs.size === 0) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-950 text-slate-300">
        <p>You do not have permission to access the admin control center.</p>
      </div>
    );
  }

  const filteredNav = ALL_NAV.filter((item) =>
    (!allowedTabs || allowedTabs.has(item.id)) && (query ? item.label.toLowerCase().includes(query.toLowerCase()) : true),
  );
  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !allowedTabs || allowedTabs.has(item.id)),
  })).filter((group) => group.items.length > 0);

  const sidebar = (
    <>
      <div className="border-b border-white/[0.06] p-5">
        <HomeLinkLogoLink variant="nav" className="mb-4" />
        <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400/90">Enterprise</p>
          <h1 className="mt-1 text-base font-bold text-white">Control Centre</h1>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">Property marketplace operations hub</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        {visibleGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">{group.label}</p>
            {group.items.map((item) => (
              <NavButton
                key={`${item.id}-${item.academyView ?? item.label}`}
                item={item}
                active={activeTab === item.id && (item.id !== "academy" || item.academyView === activeAcademyView)}
                badge={item.badgeKey && summary ? summary[item.badgeKey] : 0}
                onClick={() => navigate(item)}
              />
            ))}
          </div>
        ))}
      </nav>
      <div className="border-t border-white/[0.06] p-4">
        <div className="rounded-xl border border-white/[0.06] bg-slate-900/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Signed in</p>
          <p className="mt-1 truncate text-sm font-medium text-white">{user.name}</p>
          <p className="truncate text-xs text-slate-500">{user.email}</p>
          {permissions.length > 0 && !permissions.includes("super") && (
            <p className="mt-2 text-[10px] text-cyan-500/80">RBAC: {permissions.slice(0, 3).join(", ")}{permissions.length > 3 ? "..." : ""}</p>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#05080f] text-slate-100">
      <div className="pointer-events-none fixed inset-0 z-0 hidden bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,_rgba(16,185,129,0.12),_transparent),radial-gradient(ellipse_at_bottom_right,_rgba(6,182,212,0.08),_transparent_50%)] lg:block" />
      <div className="relative z-10 flex">
        <aside className="sticky top-0 hidden h-screen w-[18rem] shrink-0 flex-col border-r border-white/[0.06] bg-slate-950/90 backdrop-blur-2xl lg:flex">
          {sidebar}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {summary && (
            <div className="hidden border-b border-white/[0.06] bg-slate-950/50 px-4 py-2 lg:block lg:px-8">
              <div className="grid gap-2 sm:flex sm:flex-wrap">
                <ExecutivePill label="Pending listings" value={summary.pendingListings} tone="warning" />
                <ExecutivePill label="Open tickets" value={summary.openTickets} tone="danger" />
                <ExecutivePill label="Verifications" value={summary.pendingVerification} />
                <ExecutivePill label="Agents pending" value={summary.pendingAgents} />
                <ExecutivePill label="PM requests" value={summary.openPmRequests} />
                <ExecutivePill label="Flagged reports" value={summary.flaggedReports} tone="danger" />
              </div>
            </div>
          )}

          <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-slate-950 lg:bg-slate-950/90 lg:backdrop-blur-2xl">
            <div className="grid gap-3 px-4 py-3 sm:px-5 lg:flex lg:items-center lg:px-8 lg:py-4">
              <div className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 lg:contents">
                <button
                  type="button"
                  className="inline-flex size-10 items-center justify-center rounded-xl border border-white/10 text-slate-300 lg:hidden"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open navigation"
                >
                  <Menu className="size-5" />
                </button>
                <div className="min-w-0 lg:order-1 lg:flex-1">
                  <div className="hidden sm:block">
                    <AdminBreadcrumb
                      items={[
                        { label: "Admin", href: "/dashboard/admin?tab=overview" },
                        { label: findNavGroup(activeTab)?.label ?? "Platform", href: undefined },
                        { label: getAdminTabLabel(activeTab) },
                      ]}
                    />
                  </div>
                  <p className="truncate text-base font-bold text-white sm:mt-1 sm:text-lg lg:text-lg">{getAdminTabLabel(activeTab)}</p>
                </div>
                <div className="relative justify-self-end lg:order-4">
                  <button
                    type="button"
                    onClick={() => void toggleNotifications()}
                    className="relative inline-flex size-10 items-center justify-center rounded-xl border border-white/10 text-slate-300 transition hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-white"
                    aria-label="Open notifications"
                    aria-expanded={notificationsOpen}
                  >
                    <Bell className="size-4" />
                    {summary && summary.pendingListings + summary.openTickets + summary.pendingVerification + summary.openPmRequests > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-black">
                        {Math.min(9, summary.pendingListings + summary.openTickets + summary.pendingVerification + summary.openPmRequests)}
                      </span>
                    )}
                  </button>
                  {notificationsOpen && (
                    <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/50">
                      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                        <div>
                          <p className="text-sm font-bold text-white">Notifications</p>
                          <p className="text-xs text-slate-500">Live admin work queue</p>
                        </div>
                        <button type="button" onClick={() => setNotificationsOpen(false)} className="rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-white" aria-label="Close notifications">
                          <X className="size-4" />
                        </button>
                      </div>
                      {summary && (
                        <div className="grid grid-cols-2 gap-2 border-b border-white/10 p-3">
                          <NotificationShortcut label="Listings" value={summary.pendingListings} onClick={() => navigate("properties")} />
                          <NotificationShortcut label="Tickets" value={summary.openTickets} onClick={() => navigate("support")} />
                          <NotificationShortcut label="Verifications" value={summary.pendingVerification} onClick={() => navigate("verification")} />
                          <NotificationShortcut label="PM requests" value={summary.openPmRequests} onClick={() => navigate("property-management")} />
                        </div>
                      )}
                      <div className="max-h-80 overflow-y-auto p-2">
                        {notifications.slice(0, 8).map((notification) => (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => {
                              navigate(notification.subject.toLowerCase().includes("pm") || notification.subject.toLowerCase().includes("property management") ? "property-management" : "overview");
                              setNotificationsOpen(false);
                            }}
                            className="w-full rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.04]"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-semibold text-white">{notification.subject}</p>
                              <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">{notification.channel}</span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">{notification.body}</p>
                            <p className="mt-1 text-[10px] text-slate-600">{new Date(notification.createdAt).toLocaleString()}</p>
                          </button>
                        ))}
                        {notifications.length === 0 && <p className="px-3 py-6 text-center text-sm text-slate-500">No notifications yet.</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-slate-400 transition hover:border-emerald-500/30 hover:bg-emerald-500/5 lg:order-2 lg:max-w-md lg:flex-1"
              >
                <Search className="size-4 shrink-0" />
                <span className="truncate">Search modules, actions...</span>
                <span className="ml-auto hidden rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] sm:inline">Ctrl+K</span>
              </button>
              <div className="hidden items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs xl:order-3 xl:flex">
                <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
                <span className="font-medium text-emerald-300">Live platform</span>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-5 sm:px-5 lg:p-8 xl:p-10">{children}</main>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-72 flex-col bg-slate-950 shadow-2xl">
            <button
              type="button"
              className="absolute right-3 top-3 rounded-lg p-2 text-slate-400"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            >
              <X className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      {paletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[15vh]" onClick={() => setPaletteOpen(false)}>
          <div className="w-full max-w-lg rounded-xl border border-white/10 bg-slate-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-white/10 p-4">
              <Command className="size-4 text-cyan-400" />
              <input
                autoFocus
                className="flex-1 bg-transparent text-white outline-none"
                placeholder="Jump to section..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {filteredNav.map((item) => (
                <button
                key={`${item.id}-${item.academyView ?? item.label}`}
                type="button"
                onClick={() => navigate(item)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-300 hover:bg-white/5"
                >
                  <item.icon className="size-4 text-cyan-400" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationShortcut({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition hover:border-emerald-500/30 hover:bg-emerald-500/5"
    >
      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <span className="text-lg font-bold text-white">{value}</span>
    </button>
  );
}

function ExecutivePill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warning" | "danger";
}) {
  if (value <= 0) return null;
  const styles = {
    default: "border-white/10 bg-white/[0.03] text-slate-300",
    warning: "border-amber-500/25 bg-amber-500/10 text-amber-200",
    danger: "border-red-500/25 bg-red-500/10 text-red-200",
  };
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium", styles[tone])}>
      <span className="opacity-70">{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </span>
  );
}

function NavButton({
  item,
  active,
  badge,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  badge: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mb-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
        active
          ? "bg-gradient-to-r from-emerald-600/25 to-emerald-600/5 font-semibold text-emerald-200 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.2)]"
          : "text-slate-400 hover:bg-white/[0.04] hover:text-white",
      )}
    >
      <item.icon className="size-4 shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {badge > 0 && (
        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">{badge}</span>
      )}
    </button>
  );
}
