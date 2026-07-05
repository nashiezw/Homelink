import {
  ListingStatus,
  PaymentStatus,
  PropertyType,
  ReportStatus,
  VerificationStatus,
  type Prisma,
} from "@prisma/client";
import { defaultHolidayHomeSettings } from "@/lib/holiday-homes/defaults";
import { getMainPrisma } from "@/lib/db/main-prisma";
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
import type { TenancyDispute, TenancyDisputeStatus } from "@/lib/residence/types";

export type AdminSummary = {
  pendingListings: number;
  openTickets: number;
  pendingVerification: number;
  openDisputes: number;
  pendingAgents: number;
  openPmRequests: number;
  flaggedReports: number;
  pendingRoommates: number;
};

const PROVINCE_MAP: Record<string, string> = {
  Harare: "Harare Metropolitan",
  Bulawayo: "Bulawayo Metropolitan",
  Gweru: "Midlands",
  Kwekwe: "Midlands",
  Mutare: "Manicaland",
};

type ListingLite = {
  id: string;
  title: string;
  city: string;
  suburb: string;
  propertyType: PropertyType;
  intent: string;
  status: ListingStatus;
  price: Prisma.Decimal;
  verifiedAt: Date | null;
  featured: boolean;
  views: number;
  createdAt: Date;
  _count: { favourites: number; enquiries: number; reports: number };
};

export async function getPostgresAdminSummary(): Promise<AdminSummary> {
  const prisma = getMainPrisma();
  const [
    pendingListings,
    pendingVerification,
    flaggedReports,
    pendingRoommates,
  ] = await Promise.all([
    prisma.listing.count({ where: { status: ListingStatus.PENDING_REVIEW } }),
    prisma.userDocument.count({ where: { status: VerificationStatus.PENDING } }),
    prisma.report.count({ where: { status: { in: [ReportStatus.OPEN, ReportStatus.IN_REVIEW] } } }),
    prisma.roommateProfile.count({ where: { active: false } }),
  ]);

  return {
    pendingListings,
    openTickets: 0,
    pendingVerification,
    openDisputes: 0,
    pendingAgents: 0,
    openPmRequests: 0,
    flaggedReports,
    pendingRoommates,
  };
}

export async function getPostgresAdminOverview(): Promise<AdminOverview> {
  const prisma = getMainPrisma();
  const todayStart = startOfToday();
  const [listings, usersTotal, registrationsToday, paidPayments, openReports, summary] = await Promise.all([
    getListingsLite(),
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.payment.findMany({ where: { status: PaymentStatus.PAID }, select: { amount: true, createdAt: true, plan: true } }),
    prisma.report.count({ where: { status: { in: [ReportStatus.OPEN, ReportStatus.IN_REVIEW] } } }),
    getPostgresAdminSummary(),
  ]);
  const revenue = paidPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const todayRevenue = paidPayments
    .filter((payment) => payment.createdAt >= todayStart)
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
  const active = listings.filter((listing) => listing.status === ListingStatus.ACTIVE).length;
  const pending = listings.filter((listing) => listing.status === ListingStatus.PENDING_REVIEW).length;
  const sold = listings.filter((listing) => listing.status === ListingStatus.SOLD).length;
  const rented = listings.filter((listing) => listing.status === ListingStatus.RENTED).length;
  const expired = listings.filter((listing) => listing.status === ListingStatus.EXPIRED).length;

  return {
    properties: {
      total: listings.filter((listing) => listing.status !== ListingStatus.DELETED).length,
      addedToday: listings.filter((listing) => listing.createdAt >= todayStart).length,
      active,
      sold,
      rented,
      pendingApprovals: pending,
      flagged: openReports,
      duplicates: listings.filter((listing) => listing._count.reports > 1).length,
      fakeDetected: openReports,
      expired,
    },
    revenue: {
      mrr: revenue,
      arr: revenue * 12,
      today: todayRevenue,
      monthly: revenue,
      forecast: Math.round(revenue * 1.12),
    },
    users: {
      total: usersTotal,
      online: 0,
      registrationsToday,
    },
    alerts: summary.pendingListings + summary.openTickets + summary.pendingVerification + summary.flaggedReports,
    systemHealth: "healthy",
  };
}

export async function getPostgresUserAnalytics(): Promise<AdminUserAnalytics> {
  const prisma = getMainPrisma();
  const users = await prisma.user.findMany({
    select: { roles: true, accountStatus: true, createdAt: true },
  });
  const active = users.filter((user) => user.accountStatus === "ACTIVE").length;
  return {
    totals: {
      totalUsers: users.length,
      registrationsToday: users.filter((user) => user.createdAt >= startOfToday()).length,
      activeToday: active,
      weeklyActive: active,
      monthlyActive: users.length,
      seekers: users.filter((user) => user.roles.includes("SEEKER")).length,
      landlords: users.filter((user) => user.roles.includes("LANDLORD")).length,
      agents: users.filter((user) => user.roles.includes("AGENT")).length,
      developers: 0,
      roommates: await prisma.roommateProfile.count(),
      premium: 0,
      blocked: users.filter((user) => user.accountStatus === "BLOCKED").length,
      suspended: users.filter((user) => user.accountStatus === "SUSPENDED").length,
      deleted: users.filter((user) => user.accountStatus === "DELETED").length,
      online: 0,
    },
    growth: buildWeeklyGrowth(users),
    devices: [{ label: "Tracked sessions", value: 0 }],
    browsers: [{ label: "Untracked", value: users.length }],
    topCities: [],
    registrationSources: [{ label: "Direct", value: users.length }],
  };
}

export async function getPostgresPropertyAnalytics(): Promise<AdminPropertyAnalytics> {
  const listings = await getListingsLite();
  const cityMap = new Map<string, number>();
  const typeMap = new Map<string, number>();
  const provinceMap = new Map<string, number>();

  for (const listing of listings) {
    cityMap.set(listing.city, (cityMap.get(listing.city) ?? 0) + 1);
    typeMap.set(formatEnum(listing.propertyType), (typeMap.get(formatEnum(listing.propertyType)) ?? 0) + 1);
    const province = PROVINCE_MAP[listing.city] ?? "Other";
    provinceMap.set(province, (provinceMap.get(province) ?? 0) + 1);
  }

  const rents = listings.filter((listing) => listing.intent === "RENT").map((listing) => Number(listing.price));
  const sales = listings.filter((listing) => listing.intent === "BUY").map((listing) => Number(listing.price));

  return {
    byCity: toChart(cityMap),
    byType: toChart(typeMap),
    byProvince: toChart(provinceMap),
    avgRent: average(rents),
    avgSale: average(sales),
    mostViewed: [...listings]
      .sort((a, b) => b.views - a.views)
      .slice(0, 5)
      .map((listing) => ({ id: listing.id, title: listing.title, views: listing.views })),
    mostSaved: [...listings]
      .sort((a, b) => b._count.favourites - a._count.favourites)
      .slice(0, 5)
      .map((listing) => ({ id: listing.id, title: listing.title, saves: listing._count.favourites })),
    qualityIssues: {
      missingPhotos: 0,
      missingVideos: 0,
      missingLocation: listings.filter((listing) => !listing.city || !listing.suburb).length,
      lowQuality: 0,
      duplicateImages: 0,
      awaitingVerification: listings.filter((listing) => !listing.verifiedAt && listing.status === ListingStatus.ACTIVE).length,
      inactive: listings.filter(
        (listing) => listing.status !== ListingStatus.ACTIVE && listing.status !== ListingStatus.PENDING_REVIEW,
      ).length,
      expired: listings.filter((listing) => listing.status === ListingStatus.EXPIRED).length,
    },
  };
}

export async function getPostgresVerificationQueue(): Promise<VerificationItem[]> {
  const rows = await getMainPrisma().userDocument.findMany({
    where: { status: VerificationStatus.PENDING },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    userName: row.user.name,
    type: row.type,
    subject: row.type,
    submittedAt: row.createdAt.toISOString(),
    status: row.status,
    priority: "NORMAL",
    documentUrl: row.url,
  }));
}

export async function getPostgresModerationQueue(): Promise<ModerationItem[]> {
  const reports = await getMainPrisma().report.findMany({
    where: { status: { in: [ReportStatus.OPEN, ReportStatus.IN_REVIEW] } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return reports.map((report) => ({
    id: report.id,
    type: "REPORT",
    title: `Listing report: ${report.reason}`,
    reason: report.reason,
    priority: "MEDIUM",
    status: report.status,
    createdAt: report.createdAt.toISOString(),
    targetId: report.listingId,
    targetType: "LISTING",
    details: [
      { label: "Listing ID", value: report.listingId },
      { label: "Details", value: report.details || "No extra details supplied" },
    ],
  }));
}

export async function getPostgresPaymentsCenter() {
  const rows = await getMainPrisma().payment.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  const paid = rows.filter((row) => row.status === PaymentStatus.PAID);
  const revenue = paid.reduce((sum, row) => sum + Number(row.amount), 0);
  return {
    subscriptionRevenue: paid.filter((row) => row.plan?.includes("pro") || row.plan === "agency").reduce((sum, row) => sum + Number(row.amount), 0),
    featuredRevenue: paid.filter((row) => row.plan === "featured_listing").reduce((sum, row) => sum + Number(row.amount), 0),
    advertisingRevenue: paid.filter((row) => row.plan === "advertising").reduce((sum, row) => sum + Number(row.amount), 0),
    commissionRevenue: 0,
    refunds: rows.filter((row) => row.status === PaymentStatus.REFUNDED).length,
    failed: rows.filter((row) => row.status === PaymentStatus.FAILED).length,
    pending: rows.filter((row) => row.status === PaymentStatus.PENDING).length,
    mrr: revenue,
    arr: revenue * 12,
    forecast: Math.round(revenue * 1.12),
    transactions: rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      amount: Number(row.amount),
      status: row.status,
      plan: row.plan ?? row.description,
      createdAt: row.createdAt.toISOString(),
    })),
    monthlyRevenue: buildMonthlyRevenue(paid),
    health: [{ provider: "database", status: "healthy" }],
  };
}

export async function getPostgresSystemHealth(): Promise<SystemHealth> {
  const [users, listings, reports] = await Promise.all([
    getMainPrisma().user.count(),
    getMainPrisma().listing.count(),
    getMainPrisma().report.count({ where: { status: { in: [ReportStatus.OPEN, ReportStatus.IN_REVIEW] } } }),
  ]);
  return {
    api: "operational",
    database: "operational",
    email: "degraded",
    sms: "operational",
    whatsapp: "operational",
    cloudinary: "degraded",
    payments: "operational",
    maps: "operational",
    cpu: Math.min(users * 2, 95),
    memory: Math.min(listings * 2, 95),
    storage: Math.min(Math.round((listings / 50) * 100), 95),
    queueDepth: reports,
  };
}

export async function getPostgresSecuritySnapshot() {
  const [users, audit] = await Promise.all([
    getMainPrisma().user.findMany({ select: { roles: true, accountStatus: true } }),
    getMainPrisma().auditEvent.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  return {
    activeSessions: 0,
    blockedUsers: users.filter((user) => user.accountStatus === "BLOCKED").length,
    suspendedUsers: users.filter((user) => user.accountStatus === "SUSPENDED").length,
    failedSecurityEvents: audit.filter((event) => event.action.includes("FAIL") || event.action.includes("BLOCK")).length,
    adminAccounts: users.filter((user) => user.roles.includes("ADMIN")).length,
    twoFactorCoverage: "0%",
    webhookFailures: 0,
  };
}

export async function getPostgresAuditLog(): Promise<AuditEntry[]> {
  const rows = await getMainPrisma().auditEvent.findMany({
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map((row) => ({
    id: row.id,
    actor: row.actor?.name ?? row.actorId ?? "System",
    action: row.action,
    target: row.target,
    ip: "",
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getPostgresActivityFeed(): Promise<ActivityItem[]> {
  const audit = await getPostgresAuditLog();
  return audit.slice(0, 8).map((entry) => ({
    id: entry.id,
    message: `${entry.actor} - ${entry.action.replace(/_/g, " ").toLowerCase()}`,
    time: formatRelativeTime(entry.createdAt),
    type: entry.action.toLowerCase().includes("payment")
      ? "payment"
      : entry.action.toLowerCase().includes("verify")
        ? "verification"
        : "user",
  }));
}

export function getPostgresSupportTickets(): SupportTicket[] {
  return [];
}

export async function getPostgresHolidayHomesAdminData() {
  const prisma = getMainPrisma();
  const [listings, enquiries, reviews] = await Promise.all([
    prisma.listing.findMany({
      where: { propertyType: PropertyType.COTTAGE },
      include: { _count: { select: { enquiries: true, favourites: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.propertyEnquiryRecord.findMany({
      where: { OR: [{ subjectType: "HOLIDAY" }, { holidayBookingId: { not: null } }] },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.review.findMany({
      where: { target: "HOLIDAY_HOME" },
      include: { author: { select: { name: true } }, listing: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  const totalViews = listings.reduce((sum, listing) => sum + listing.views, 0);
  const accepted = enquiries.filter((enquiry) => ["ACCEPTED", "BOOKING_CONFIRMED"].includes(enquiry.status)).length;
  const averageNightlyPrice = average(listings.map((listing) => Number(listing.price)));

  return {
    listings: listings.map((listing) => ({
      id: listing.id,
      title: listing.title,
      city: listing.city,
      suburb: listing.suburb,
      status: listing.status,
      verified: Boolean(listing.verifiedAt),
      featured: listing.featured,
      nightlyRate: Number(listing.price),
      destination: listing.city,
      views: listing.views,
      enquiries: listing._count.enquiries,
    })),
    enquiries: enquiries.map((row) => {
      const payload = readObject(row.payload);
      return {
        id: row.id,
        listingId: row.listingId ?? "",
        listingTitle: stringValue(payload.listingTitle, row.listingId ?? "Holiday booking"),
        guestName: stringValue(payload.seekerName, "Guest"),
        status: row.status,
        checkIn: stringValue(payload.checkIn, ""),
        checkOut: stringValue(payload.checkOut, ""),
      };
    }),
    reviews: reviews.map((review) => ({
      id: review.id,
      listingId: review.listingId ?? "",
      listingTitle: review.listing?.title ?? review.listingId ?? "Holiday listing",
      guestName: review.author.name,
      rating: review.rating,
      comment: review.body,
      createdAt: review.createdAt.toISOString(),
    })),
    analytics: {
      views: totalViews,
      bookingEnquiries: enquiries.length,
      conversionRate: enquiries.length ? Math.round((accepted / enquiries.length) * 1000) / 10 : 0,
      averageNightlyPrice,
    },
    settings: defaultHolidayHomeSettings,
    seasonalRates: [],
    refundRequests: [],
  };
}

export function listPostgresTenancyDisputes(status?: TenancyDisputeStatus): TenancyDispute[] {
  void status;
  return [];
}

export function resolvePostgresTenancyDispute(
  id: string,
  resolution: "upheld" | "removed",
  adminId: string,
  adminNote?: string,
) {
  void id;
  void resolution;
  void adminId;
  void adminNote;
  return null;
}

export async function getPostgresControlCenter(section: string) {
  switch (section) {
    case "overview":
      return {
        overview: await getPostgresAdminOverview(),
        activity: await getPostgresActivityFeed(),
        audit: (await getPostgresAuditLog()).slice(0, 8),
        summary: await getPostgresAdminSummary(),
      };
    case "users":
      return { users: await getPostgresUserAnalytics() };
    case "properties":
      return { properties: await getPostgresPropertyAnalytics() };
    case "verification":
      return { verification: await getPostgresVerificationQueue() };
    case "moderation":
      return { moderation: await getPostgresModerationQueue() };
    case "support":
      return { support: getPostgresSupportTickets() };
    case "payments":
      return { payments: await getPostgresPaymentsCenter() };
    case "system":
      return { system: await getPostgresSystemHealth() };
    case "security":
      return { security: await getPostgresSecuritySnapshot(), audit: await getPostgresAuditLog() };
    case "summary":
      return await getPostgresAdminSummary();
    case "all":
      return {
        overview: await getPostgresAdminOverview(),
        users: await getPostgresUserAnalytics(),
        properties: await getPostgresPropertyAnalytics(),
        verification: await getPostgresVerificationQueue(),
        moderation: await getPostgresModerationQueue(),
        support: getPostgresSupportTickets(),
        payments: await getPostgresPaymentsCenter(),
        system: await getPostgresSystemHealth(),
        security: await getPostgresSecuritySnapshot(),
        activity: await getPostgresActivityFeed(),
        audit: await getPostgresAuditLog(),
        summary: await getPostgresAdminSummary(),
      };
    default:
      return { overview: await getPostgresAdminOverview() };
  }
}

async function getListingsLite(): Promise<ListingLite[]> {
  return getMainPrisma().listing.findMany({
    select: {
      id: true,
      title: true,
      city: true,
      suburb: true,
      propertyType: true,
      intent: true,
      status: true,
      price: true,
      verifiedAt: true,
      featured: true,
      views: true,
      createdAt: true,
      _count: { select: { favourites: true, enquiries: true, reports: true } },
    },
  });
}

function buildWeeklyGrowth(users: { createdAt: Date }[]): ChartPoint[] {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const counts = new Array(7).fill(0);
  for (const user of users) counts[user.createdAt.getDay()] += 1;
  return days.map((label, index) => ({ label, value: counts[index] }));
}

function buildMonthlyRevenue(paid: { amount: Prisma.Decimal; createdAt: Date }[]) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const value = paid
      .filter((payment) => payment.createdAt.getMonth() === d.getMonth() && payment.createdAt.getFullYear() === d.getFullYear())
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    return { label: months[d.getMonth()], value };
  });
}

function toChart(map: Map<string, number>) {
  return [...map.entries()].map(([label, value]) => ({ label, value }));
}

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

function formatEnum(value: string) {
  return value.toLowerCase().replace(/_/g, " ").replace(/^./, (char) => char.toUpperCase());
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
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

function readObject(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}
