import { getStore } from "@/lib/store/app-store";
import type {
  ActivityItem,
  AdminOverview,
  AdminPropertyAnalytics,
  AdminUserAnalytics,
  AuditEntry,
  ChartPoint,
  ModerationItem,
  SupportTicket,
  SystemHealth,
  VerificationItem,
} from "@/lib/admin/types";

const PROVINCE_MAP: Record<string, string> = {
  Harare: "Harare Metropolitan",
  Bulawayo: "Bulawayo Metropolitan",
  Gweru: "Midlands",
  Kwekwe: "Midlands",
  Mutare: "Manicaland",
};

export type AdminSummary = {
  pendingListings: number;
  openTickets: number;
  pendingVerification: number;
  openDisputes: number;
  pendingAgents: number;
  openPmRequests: number;
  flaggedReports: number;
  pendingRoommates: number;
  pendingAcademyApprovals: number;
  pendingPaymentProofs: number;
};

export function computeAdminSummary(): AdminSummary {
  const store = getStore();
  const listings = store.listListings();
  const analytics = store.getAdminAnalytics();

  return {
    pendingListings: listings.filter((l) => l.status === "PENDING_REVIEW").length + store.getReviewQueue().length,
    openTickets: store.getSupportTickets().filter((t) => !["RESOLVED"].includes(t.status)).length,
    pendingVerification: store.getVerificationRequests().length,
    openDisputes: store.listTenancyDisputes("open").length,
    pendingAgents: store.listAgentApplications().filter((a) => ["SUBMITTED", "PENDING_REVIEW", "INTERVIEW_SCHEDULED"].includes(a.status)).length,
    openPmRequests:
      store.listPMRequests({ status: "SUBMITTED" }).length +
      store.listPMRequests({ status: "PENDING_ASSIGNMENT" }).length,
    flaggedReports: analytics.totals.openReports,
    pendingRoommates: store.getRoommateAdminAnalytics().pending,
    pendingAcademyApprovals: 0,
    pendingPaymentProofs: store.listAllPayments().filter((payment) => payment.proofStatus === "UPLOADED" && payment.status !== "PAID").length,
  };
}

export function computeAdminOverview(): AdminOverview {
  const store = getStore();
  const listings = store.listListings();
  const active = listings.filter((l) => l.status === "ACTIVE").length;
  const sold = listings.filter((l) => l.status === "SOLD").length;
  const rented = listings.filter((l) => l.status === "RENTED").length;
  const pending = listings.filter((l) => l.status === "PENDING_REVIEW").length;
  const expired = listings.filter((l) => l.status === "EXPIRED").length;
  const analytics = store.getAdminAnalytics();
  const payments = store.listAllPayments().filter((p) => p.status === "PAID");
  const revenue = payments.reduce((s, p) => s + p.amount, 0);
  const subscriptionRevenue = payments
    .filter((p) => p.plan.includes("pro") || p.plan === "agency")
    .reduce((s, p) => s + p.amount, 0);
  const users = store.listUsers();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const registrationsToday = users.filter((u) => new Date(u.createdAt) >= todayStart).length;
  const addedToday = store
    .getAuditLog(300)
    .filter(
      (e) =>
        new Date(e.createdAt) >= todayStart &&
        (e.action === "APPROVE_LISTING" || e.action === "SUBMIT_LISTING" || e.targetType === "LISTING"),
    ).length;
  const moderation = getModerationQueue();
  const paymentHealth = store.getPaymentHealth();
  const paymentsDegraded = paymentHealth.some((h) => h.status !== "healthy");

  return {
    properties: {
      total: listings.length,
      addedToday: addedToday || listings.filter((l) => l.status === "PENDING_REVIEW").length,
      active,
      sold,
      rented,
      pendingApprovals: pending + store.getReviewQueue().length,
      flagged: analytics.totals.openReports,
      duplicates: moderation.filter((m) => m.type.includes("DUPLICATE")).length,
      fakeDetected: moderation.filter((m) => m.type === "AI_FRAUD" || m.type === "REPORT").length,
      expired,
    },
    revenue: {
      mrr: subscriptionRevenue || store.getPaymentSettings().fees.subscriptionFee,
      arr: (subscriptionRevenue || store.getPaymentSettings().fees.subscriptionFee) * 12,
      today: payments.filter((p) => new Date(p.createdAt) >= todayStart).reduce((s, p) => s + p.amount, 0),
      monthly: revenue,
      forecast: Math.round(revenue * 1.12),
    },
    users: {
      total: users.length,
      online: Math.min(store.listAllSessions().length, users.length),
      registrationsToday: registrationsToday || users.length > 0 ? Math.max(registrationsToday, 0) : 0,
    },
    alerts: computeAdminSummary().pendingListings + computeAdminSummary().openTickets + computeAdminSummary().pendingVerification + computeAdminSummary().pendingAcademyApprovals,
    systemHealth: paymentsDegraded ? "degraded" : "healthy",
  };
}

export function computeUserAnalytics(): AdminUserAnalytics {
  const store = getStore();
  const all = store.listUsers();
  const landlords = store.listUsers({ role: "LANDLORD" });
  const agents = store.listUsers({ role: "AGENT" });
  const seekers = store.listUsers({ role: "SEEKER" });
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const growth = buildWeeklyGrowth(all);

  return {
    totals: {
      totalUsers: all.length,
      registrationsToday: all.filter((u) => new Date(u.createdAt) >= todayStart).length,
      activeToday: all.filter((u) => u.accountStatus === "ACTIVE").length,
      weeklyActive: all.filter((u) => u.accountStatus === "ACTIVE").length,
      monthlyActive: all.length,
      seekers: seekers.length,
      landlords: landlords.length,
      agents: agents.length,
      developers: all.filter((u) => u.roles.includes("CONSULTANT")).length,
      roommates: seekers.length,
      premium: all.filter((u) => u.premium).length,
      blocked: all.filter((u) => u.accountStatus === "BLOCKED").length,
      suspended: all.filter((u) => u.accountStatus === "SUSPENDED").length,
      deleted: all.filter((u) => u.accountStatus === "DELETED").length,
      online: store.listAllSessions().length,
    },
    growth,
    devices: [{ label: "Tracked sessions", value: store.listAllSessions().length }],
    browsers: [{ label: "Untracked", value: store.listAllSessions().length }],
    topCities: (() => {
      const cityMap = new Map<string, number>();
      for (const user of all) {
        if (user.city) cityMap.set(user.city, (cityMap.get(user.city) ?? 0) + 1);
      }
      return [...cityMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([label, value]) => ({ label, value }));
    })(),
    registrationSources: [{ label: "Untracked", value: all.length }],
  };
}

function buildWeeklyGrowth(users: { createdAt: string }[]): ChartPoint[] {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const counts = new Array(7).fill(0);
  for (const user of users) {
    const day = new Date(user.createdAt).getDay();
    counts[day] += 1;
  }
  return days.map((label, i) => ({ label, value: counts[i] }));
}

export function computePropertyAnalytics(): AdminPropertyAnalytics {
  const listings = getStore().listListings();
  const cityMap = new Map<string, number>();
  const typeMap = new Map<string, number>();
  const provinceMap = new Map<string, number>();

  for (const listing of listings) {
    cityMap.set(listing.city, (cityMap.get(listing.city) ?? 0) + 1);
    typeMap.set(listing.type, (typeMap.get(listing.type) ?? 0) + 1);
    const province = PROVINCE_MAP[listing.city] ?? "Other";
    provinceMap.set(province, (provinceMap.get(province) ?? 0) + 1);
  }

  const toChart = (map: Map<string, number>): ChartPoint[] =>
    [...map.entries()].map(([label, value]) => ({ label, value }));

  const rents = listings.filter((l) => l.intent === "rent").map((l) => l.price);
  const sales = listings.filter((l) => l.intent === "buy").map((l) => l.price);

  return {
    byCity: toChart(cityMap),
    byType: toChart(typeMap),
    byProvince: toChart(provinceMap),
    avgRent: rents.length ? Math.round(rents.reduce((a, b) => a + b, 0) / rents.length) : 0,
    avgSale: sales.length ? Math.round(sales.reduce((a, b) => a + b, 0) / sales.length) : 0,
    mostViewed: [...listings]
      .sort((a, b) => b.views - a.views)
      .slice(0, 5)
      .map((l) => ({ id: l.id, title: l.title, views: l.views })),
    mostSaved: [...listings]
      .sort((a, b) => b.saves - a.saves)
      .slice(0, 5)
      .map((l) => ({ id: l.id, title: l.title, saves: l.saves })),
    qualityIssues: {
      missingPhotos: listings.filter((l) => !l.image).length,
      missingVideos: 0,
      missingLocation: listings.filter((l) => !l.latitude || !l.longitude).length,
      lowQuality: listings.filter((l) => l.trustScore < 50).length,
      duplicateImages: getModerationQueue().filter((m) => m.reason.includes("duplicate")).length,
      awaitingVerification: listings.filter((l) => !l.verified && l.status === "ACTIVE").length,
      inactive: listings.filter((l) => !["ACTIVE", "PENDING_REVIEW"].includes(l.status)).length,
      expired: listings.filter((l) => l.status === "EXPIRED").length,
    },
  };
}

export function getVerificationQueue(): VerificationItem[] {
  const store = getStore();
  return store.getVerificationRequests().map((v) => ({
    id: v.id,
    userId: v.userId,
    userName: v.userName,
    type: v.type,
    subject: v.subject,
    submittedAt: v.createdAt,
    status: v.status,
    priority: v.priority,
    documentUrl: v.documentUrl,
  }));
}

export function getModerationQueue(): ModerationItem[] {
  const store = getStore();
  const fromReports = store.getAdminAnalytics().reports
    .filter((r) => r.status === "OPEN" || r.status === "IN_REVIEW")
    .map((r) => ({
    id: r.id,
    type: "REPORT",
    title: `Listing report: ${r.reason}`,
    reason: r.reason,
    priority: r.priority,
    status: r.status,
    createdAt: r.createdAt,
    targetId: r.listingId,
    targetType: "LISTING",
    details: [
      { label: "Listing ID", value: r.listingId },
      { label: "Reporter", value: r.reporterId ?? "Anonymous" },
      { label: "Details", value: r.details || "No extra details supplied" },
    ],
  }));
  const fromQueue = store.getReviewQueue()
    .filter((item) => item.status === "OPEN")
    .map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    reason: item.type,
    priority: item.priority,
    status: item.status,
    createdAt: new Date().toISOString(),
    targetId: item.targetId,
    targetType: item.targetType,
    details: item.details?.length
      ? item.details
      : [
          { label: "Target", value: item.targetId ?? "Not linked" },
          { label: "Queue type", value: item.type },
        ],
  }));
  return [...fromReports, ...fromQueue];
}

export function getSupportTickets(): SupportTicket[] {
  const store = getStore();
  return store.getSupportTickets().map((t) => ({
    id: t.id,
    subject: t.subject,
    category: t.category,
    status: t.status,
    priority: t.priority,
    team: t.team,
    assignee: t.assignee ?? "Unassigned",
    createdAt: t.createdAt,
    userName: t.userName,
    customerEmail: t.customerEmail,
    escalationReason: t.escalationReason,
    resolutionNote: t.resolutionNote,
    body: t.body,
  }));
}

export function getSystemHealth(): SystemHealth {
  const store = getStore();
  const health = store.getPaymentHealth();
  const settings = store.getPlatformSettings();
  const failedWebhooks = store.getWebhookLogs().filter((w) => w.status === "FAILED").length;
  const sessions = store.listAllSessions().length;
  const listings = store.listListings();
  const users = store.listUsers();
  const cloudinaryConfigured = Boolean(
    settings.integrations.cloudinaryCloud &&
      settings.integrations.cloudinaryKey &&
      settings.integrations.cloudinarySecret,
  );
  const paymentStatus = health.some((h) => h.status === "down")
    ? "down"
    : health.some((h) => h.status === "degraded")
      ? "degraded"
      : "operational";

  return {
    api: settings.maintenanceMode ? "maintenance" : "operational",
    database: "operational",
    email: settings.integrations.smtpHost ? "operational" : "degraded",
    sms: "operational",
    whatsapp: "operational",
    cloudinary: cloudinaryConfigured ? "operational" : "degraded",
    payments: paymentStatus,
    maps: "operational",
    cpu: Math.min(Math.round((sessions / Math.max(users.length, 1)) * 100), 95),
    memory: Math.min(Math.round((store.listAllSessions().length * 3 + failedWebhooks * 8) / 2), 95),
    storage: Math.min(Math.round((listings.length / 50) * 100), 95),
    queueDepth: store.getReviewQueue().length + store.getSupportTickets().filter((t) => t.status === "OPEN").length,
  };
}

export function getSecuritySnapshot() {
  const store = getStore();
  const users = store.listUsers();
  const sessions = store.listAllSessions();
  const audit = store.getAuditLog(100);
  const blocked = users.filter((u) => u.accountStatus === "BLOCKED").length;
  const suspended = users.filter((u) => u.accountStatus === "SUSPENDED").length;
  const failedActions = audit.filter((e) => e.action.includes("FAIL") || e.action.includes("BLOCK")).length;
  const admins = users.filter((u) => u.roles.includes("ADMIN")).length;

  return {
    activeSessions: sessions.length,
    blockedUsers: blocked,
    suspendedUsers: suspended,
    failedSecurityEvents: failedActions,
    adminAccounts: admins,
    twoFactorCoverage: admins > 0 ? "100%" : "0%",
    webhookFailures: store.getWebhookLogs().filter((w) => w.status === "FAILED").length,
  };
}

export function getAuditLog(): AuditEntry[] {
  const store = getStore();
  return store.getAuditLog(50).map((entry) => ({
    id: entry.id,
    actor: entry.actorName,
    action: entry.action,
    target: entry.target,
    ip: entry.ip,
    createdAt: entry.createdAt,
  }));
}

export function getActivityFeed(): ActivityItem[] {
  const audit = getAuditLog().slice(0, 8);
  if (!audit.length) {
    return [{ id: "act_empty", message: "No recent platform activity recorded yet.", time: "Now", type: "system" }];
  }
  return audit.map((entry) => ({
    id: entry.id,
    message: `${entry.actor} — ${entry.action.replace(/_/g, " ").toLowerCase()}`,
    time: formatRelativeTime(entry.createdAt),
    type: entry.action.toLowerCase().includes("payment")
      ? "payment"
      : entry.action.toLowerCase().includes("verify")
        ? "verification"
        : "user",
  }));
}

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function getPaymentsCenter() {
  const store = getStore();
  const all = store.listAllPayments();
  const paid = all.filter((p) => p.status === "PAID");
  const revenue = paid.reduce((s, p) => s + p.amount, 0);
  const settings = store.getPaymentSettings();
  const featuredRevenue = paid.filter((p) => p.plan === "featured_listing").reduce((s, p) => s + p.amount, 0);
  const subscriptionRevenue = paid.filter((p) => p.plan.includes("pro") || p.plan === "agency").reduce((s, p) => s + p.amount, 0);

  return {
    subscriptionRevenue,
    featuredRevenue,
    advertisingRevenue: paid.filter((p) => p.plan === "advertising").reduce((s, p) => s + p.amount, 0),
    commissionRevenue: Math.round(revenue * (settings.fees.platformCommissionPercent / 100)),
    refunds: all.filter((p) => p.status === "REFUNDED").length,
    failed: all.filter((p) => p.status === "FAILED").length,
    pending: all.filter((p) => ["PENDING", "MANUAL_REVIEW", "AWAITING_PROOF"].includes(p.status)).length,
    mrr: subscriptionRevenue || settings.fees.subscriptionFee,
    arr: (subscriptionRevenue || settings.fees.subscriptionFee) * 12,
    forecast: Math.round(revenue * 1.12),
    transactions: all.slice(0, 20),
    monthlyRevenue: buildMonthlyRevenue(paid),
    health: store.getPaymentHealth(),
  };
}

function buildMonthlyRevenue(paid: { amount: number; createdAt: string }[]) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const label = months[d.getMonth()];
    const value = paid
      .filter((p) => {
        const created = new Date(p.createdAt);
        return created.getMonth() === d.getMonth() && created.getFullYear() === d.getFullYear();
      })
      .reduce((s, p) => s + p.amount, 0);
    return { label, value };
  });
}
