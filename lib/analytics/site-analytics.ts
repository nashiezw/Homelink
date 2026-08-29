import type { Prisma } from "@prisma/client";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { ensureCoreProductionSchema, isDatabaseUnavailableError, isMissingSchemaError } from "@/lib/db/production-schema";

export type SitePageViewInput = {
  visitorId: string;
  sessionId: string;
  path: string;
  title?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  deviceType: string;
  durationMs?: number;
  userId?: string;
  pageViewId?: string;
  action?: "start" | "end";
};

export type SiteFunnelInput = {
  visitorId: string;
  sessionId?: string;
  name: string;
  path?: string;
  target?: string;
  deviceType?: string;
  referrer?: string;
  metadata?: Record<string, unknown>;
  userId?: string;
};

export type AnalyticsIdentityInput = {
  visitorId: string;
  userId?: string;
  email?: string;
};

function clip(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

export function isInternalAnalyticsPath(value: unknown) {
  const path = String(value ?? "").trim();
  if (!path) return false;
  let pathname = path;
  let redirectTarget = "";
  try {
    const parsed = new URL(path, "https://houselink.local");
    pathname = parsed.pathname;
    redirectTarget =
      parsed.searchParams.get("next") ||
      parsed.searchParams.get("redirect") ||
      parsed.searchParams.get("redirectTo") ||
      parsed.searchParams.get("callbackUrl") ||
      "";
  } catch {
    pathname = path.split("?")[0]?.split("#")[0] ?? path;
  }
  if (redirectTarget && isInternalAnalyticsPath(redirectTarget)) return true;
  return (
    pathname.startsWith("/dashboard/admin") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/maintenance") ||
    pathname === "/favicon.ico"
  );
}

const publicAnalyticsPageWhere: Prisma.SitePageViewWhereInput = {
  NOT: [
    { path: { startsWith: "/dashboard/admin" } },
    { path: { startsWith: "/api/" } },
    { path: { startsWith: "/_next/" } },
    { path: { startsWith: "/maintenance" } },
    { path: "/favicon.ico" },
    { path: { startsWith: "/auth?next=%2Fdashboard%2Fadmin" } },
    { path: { startsWith: "/auth?next=/dashboard/admin" } },
    { path: { startsWith: "/auth?redirect=%2Fdashboard%2Fadmin" } },
    { path: { startsWith: "/auth?redirect=/dashboard/admin" } },
  ],
};

const publicAnalyticsFunnelWhere: Prisma.SiteFunnelEventWhereInput = {
  NOT: [
    { path: { startsWith: "/dashboard/admin" } },
    { path: { startsWith: "/api/" } },
    { path: { startsWith: "/_next/" } },
    { path: { startsWith: "/maintenance" } },
    { path: "/favicon.ico" },
    { path: { startsWith: "/auth?next=%2Fdashboard%2Fadmin" } },
    { path: { startsWith: "/auth?next=/dashboard/admin" } },
    { path: { startsWith: "/auth?redirect=%2Fdashboard%2Fadmin" } },
    { path: { startsWith: "/auth?redirect=/dashboard/admin" } },
    { target: { startsWith: "/dashboard/admin" } },
    { target: { startsWith: "/api/" } },
    { target: { startsWith: "/_next/" } },
    { target: { startsWith: "/maintenance" } },
    { target: "/favicon.ico" },
    { target: { startsWith: "/auth?next=%2Fdashboard%2Fadmin" } },
    { target: { startsWith: "/auth?next=/dashboard/admin" } },
    { target: { startsWith: "/auth?redirect=%2Fdashboard%2Fadmin" } },
    { target: { startsWith: "/auth?redirect=/dashboard/admin" } },
  ],
};

export async function recordSitePageView(input: SitePageViewInput) {
  if (!isPostgresStoreEnabled()) return { id: input.pageViewId || null };
  const visitorId = clip(input.visitorId, 64);
  const sessionId = clip(input.sessionId, 64);
  const path = clip(input.path, 320) || "/";
  if (!visitorId || !sessionId) return { id: null };
  if (isInternalAnalyticsPath(path)) return { id: null };
  const dedupeKey = `${visitorId}:${sessionId}:${path}`;
  const now = Date.now();
  if (input.action !== "end") {
    const cached = pageViewStartDedupe.get(dedupeKey);
    if (cached && cached.expiresAt > now) return { id: cached.id };
  }

  try {
    await ensureCoreProductionSchema();
    const prisma = getMainPrisma();
    if (input.action === "end" && input.pageViewId) {
      const durationMs =
        typeof input.durationMs === "number" && Number.isFinite(input.durationMs)
          ? Math.max(0, Math.min(Math.round(input.durationMs), 1000 * 60 * 60 * 4))
          : null;
      await prisma.sitePageView.update({
        where: { id: input.pageViewId },
        data: {
          durationMs: durationMs ?? undefined,
          endedAt: new Date(),
        },
      }).catch(() => null);
      return { id: input.pageViewId };
    }

    const row = await prisma.sitePageView.create({
      data: {
        visitorId,
        sessionId,
        path,
        title: clip(input.title, 200) || null,
        referrer: clip(input.referrer, 400) || null,
        utmSource: clip(input.utmSource, 80) || null,
        utmMedium: clip(input.utmMedium, 80) || null,
        utmCampaign: clip(input.utmCampaign, 120) || null,
        deviceType: clip(input.deviceType, 32) || "unknown",
        userId: input.userId ? clip(input.userId, 64) : null,
      },
    });
    rememberPageView(dedupeKey, row.id);
    return { id: row.id };
  } catch (error) {
    if (isMissingSchemaError(error) || isDatabaseUnavailableError(error)) {
      rememberPageView(dedupeKey, null);
      return { id: null };
    }
    throw error;
  }
}

export async function recordSiteFunnelEvent(input: SiteFunnelInput) {
  if (!isPostgresStoreEnabled()) return { id: null };
  const visitorId = clip(input.visitorId, 64);
  const name = clip(input.name, 80);
  if (!visitorId || !name) return { id: null };
  if (isInternalAnalyticsPath(input.path) || isInternalAnalyticsPath(input.target)) return { id: null };
  const path = clip(input.path, 320) || "";
  const target = clip(input.target, 160) || "";
  const sessionId = clip(input.sessionId, 64) || "";
  const dedupeKey = `${visitorId}:${sessionId}:${name}:${path}:${target}`;
  const now = Date.now();
  const existing = funnelEventDedupe.get(dedupeKey);
  if (existing && existing > now) return { id: null, duplicate: true };
  cleanupTimestampMap(funnelEventDedupe, now);
  funnelEventDedupe.set(dedupeKey, now + 15_000);

  try {
    await ensureCoreProductionSchema();
    const prisma = getMainPrisma();
    const row = await prisma.siteFunnelEvent.create({
      data: {
        visitorId,
        sessionId: sessionId || null,
        name,
        path: path || null,
        target: target || null,
        deviceType: clip(input.deviceType, 32) || null,
        referrer: clip(input.referrer, 400) || null,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        userId: input.userId ? clip(input.userId, 64) : null,
      },
    });
    return { id: row.id };
  } catch (error) {
    if (isMissingSchemaError(error) || isDatabaseUnavailableError(error)) return { id: null };
    throw error;
  }
}

export async function stitchAnalyticsIdentity(input: AnalyticsIdentityInput) {
  if (!isPostgresStoreEnabled()) return { updated: 0 };
  const visitorId = clip(input.visitorId, 64);
  const userId = clip(input.userId, 64);
  const email = clip(input.email, 160);
  if (!visitorId || !userId) return { updated: 0 };

  try {
    await ensureCoreProductionSchema();
    const prisma = getMainPrisma();
    const [pageViews, funnels, presence] = await Promise.all([
      prisma.sitePageView.updateMany({
        where: { visitorId, userId: null },
        data: { userId },
      }),
      prisma.siteFunnelEvent.updateMany({
        where: { visitorId, userId: null },
        data: { userId },
      }),
      prisma.sitePresence
        .updateMany({
          where: { visitorId },
          data: { userId },
        })
        .catch(() => ({ count: 0 })),
    ]);
    return {
      updated: Number(pageViews.count + funnels.count + presence.count),
      email: email || undefined,
    };
  } catch (error) {
    if (isMissingSchemaError(error) || isDatabaseUnavailableError(error)) return { updated: 0 };
    throw error;
  }
}

function topCounts(rows: Array<{ key: string; value: number }>, limit = 12) {
  return rows
    .filter((row) => row.key)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map((row) => ({ label: row.key.length > 48 ? `${row.key.slice(0, 48)}…` : row.key, value: row.value }));
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function metaSource(metadata: unknown, target?: string | null) {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const source = (metadata as Record<string, unknown>).source;
    if (typeof source === "string" && source.trim()) return source.trim();
  }
  return target?.trim() || "(unknown)";
}

const REPORT_CACHE_TTL_MS = 5 * 60 * 1000;
const pageViewStartDedupe = new Map<string, { id: string | null; expiresAt: number }>();
const funnelEventDedupe = new Map<string, number>();
const reportCache = new Map<string, { value: SiteAnalyticsReport; expiresAt: number }>();

function rememberPageView(key: string, id: string | null) {
  const now = Date.now();
  cleanupExpiringMap(pageViewStartDedupe, now);
  pageViewStartDedupe.set(key, { id, expiresAt: now + 30_000 });
}

function cleanupExpiringMap<T extends { expiresAt: number }>(map: Map<string, T>, now: number) {
  if (map.size < 2000) return;
  for (const [key, row] of map) {
    if (row.expiresAt <= now) map.delete(key);
  }
}

function cleanupTimestampMap(map: Map<string, number>, now: number) {
  if (map.size < 4000) return;
  for (const [key, expiresAt] of map) {
    if (expiresAt <= now) map.delete(key);
  }
}

function reportCacheKey(days: number) {
  return `site:${Math.max(1, Math.min(90, Math.round(days || 30)))}`;
}

export type SiteAnalyticsReport = any;

export async function getSiteAnalyticsReport(days = 30): Promise<SiteAnalyticsReport> {
  return buildSiteAnalyticsReport(days);
}

async function buildSiteAnalyticsReport(days = 30): Promise<SiteAnalyticsReport> {
  const empty = {
    days,
    pageViews: 0,
    uniqueVisitors: 0,
    avgDurationSec: 0,
    topPages: [] as Array<{ label: string; value: number }>,
    devices: [] as Array<{ label: string; value: number }>,
    referrers: [] as Array<{ label: string; value: number }>,
    utmSources: [] as Array<{ label: string; value: number }>,
    funnel: [] as Array<{ label: string; value: number }>,
    funnelDropoff: [] as Array<{ label: string; value: number; pctOfPrevious: number | null; pctOfFirst: number | null }>,
    whatsappSources: [] as Array<{ label: string; value: number }>,
    channels: [] as Array<{ label: string; value: number }>,
    proofSla: {
      pending: 0,
      overdue: 0,
      overduePct: 0,
      medianWaitHours: 0,
      stuck: [] as Array<{ orderNumber: string; waitHours: number }>,
    },
    recentPaths: [] as Array<{ path: string; minutes: number; deviceType: string; referrer: string; at: string }>,
  };
  if (!isPostgresStoreEnabled()) return empty;
  const normalizedDays = Math.max(1, Math.min(90, Math.round(days || 30)));
  const cacheKey = reportCacheKey(normalizedDays);
  const cached = reportCache.get(cacheKey);
  const nowMs = Date.now();
  if (cached && cached.expiresAt > nowMs) return cached.value;
  const since = new Date(nowMs - normalizedDays * 24 * 60 * 60 * 1000);

  try {
    await ensureCoreProductionSchema();
    const prisma = getMainPrisma();
    const [
      pageViews,
      topPages,
      devices,
      referrers,
      utmSources,
      recentViews,
      funnels,
      whatsappEvents,
      purchaseEvents,
      durationAgg,
      visitors,
      utmVisitors,
      organicVisitors,
      pendingProofs,
    ] = await Promise.all([
      prisma.sitePageView.count({ where: { startedAt: { gte: since }, ...publicAnalyticsPageWhere } }),
      prisma.sitePageView.groupBy({
        by: ["path"],
        where: { startedAt: { gte: since }, ...publicAnalyticsPageWhere },
        _count: { _all: true },
        orderBy: { _count: { path: "desc" } },
        take: 12,
      }),
      prisma.sitePageView.groupBy({
        by: ["deviceType"],
        where: { startedAt: { gte: since }, ...publicAnalyticsPageWhere },
        _count: { _all: true },
        orderBy: { _count: { deviceType: "desc" } },
        take: 12,
      }),
      prisma.sitePageView.groupBy({
        by: ["referrer"],
        where: { startedAt: { gte: since }, ...publicAnalyticsPageWhere },
        _count: { _all: true },
        orderBy: { _count: { referrer: "desc" } },
        take: 12,
      }),
      prisma.sitePageView.groupBy({
        by: ["utmSource"],
        where: { startedAt: { gte: since }, utmSource: { not: null }, ...publicAnalyticsPageWhere },
        _count: { _all: true },
        orderBy: { _count: { utmSource: "desc" } },
        take: 12,
      }),
      prisma.sitePageView.findMany({
        where: { startedAt: { gte: since }, ...publicAnalyticsPageWhere },
        select: { path: true, deviceType: true, referrer: true, durationMs: true, startedAt: true },
        take: 20,
        orderBy: { startedAt: "desc" },
      }),
      prisma.siteFunnelEvent.groupBy({
        by: ["name"],
        where: { createdAt: { gte: since }, ...publicAnalyticsFunnelWhere },
        _count: { _all: true },
      }),
      prisma.siteFunnelEvent.findMany({
        where: { createdAt: { gte: since }, name: "whatsapp_click", ...publicAnalyticsFunnelWhere },
        select: { target: true, metadata: true, visitorId: true },
        take: 5000,
      }),
      prisma.siteFunnelEvent.findMany({
        where: { createdAt: { gte: since }, name: "library_purchase_completed", ...publicAnalyticsFunnelWhere },
        select: { visitorId: true },
        take: 5000,
      }),
      prisma.sitePageView.aggregate({
        where: { startedAt: { gte: since }, durationMs: { not: null }, ...publicAnalyticsPageWhere },
        _avg: { durationMs: true },
      }),
      prisma.sitePageView.groupBy({
        by: ["visitorId", "userId"],
        where: { startedAt: { gte: since }, ...publicAnalyticsPageWhere },
        _count: { _all: true },
      }),
      prisma.sitePageView.groupBy({
        by: ["visitorId"],
        where: { startedAt: { gte: since }, utmSource: { not: null }, ...publicAnalyticsPageWhere },
        _count: { _all: true },
      }),
      prisma.sitePageView.groupBy({
        by: ["visitorId"],
        where: { startedAt: { gte: since }, utmSource: null, ...publicAnalyticsPageWhere },
        _count: { _all: true },
      }),
      prisma.libraryOrder
        .findMany({
          where: { status: "PENDING", payment: { proofStatus: "UPLOADED" } },
          select: {
            orderNumber: true,
            createdAt: true,
            updatedAt: true,
            payment: { select: { updatedAt: true } },
          },
          take: 100,
          orderBy: { updatedAt: "asc" },
        })
        .catch(() => []),
    ]);

    const funnelOrder = [
      "library_product_viewed",
      "library_cart_added",
      "library_checkout_started",
      "library_proof_uploaded",
      "library_purchase_completed",
      "library_download_started",
    ];
    const funnelMap = new Map(funnels.map((event) => [event.name, event._count._all]));
    const whatsappSourceMap = new Map<string, number>();
    const whatsappVisitors = new Set(whatsappEvents.map((event) => event.visitorId));
    const purchaseVisitors = new Set(purchaseEvents.map((event) => event.visitorId));
    for (const event of whatsappEvents) {
      const source = metaSource(event.metadata, event.target);
      whatsappSourceMap.set(source, (whatsappSourceMap.get(source) ?? 0) + 1);
    }

    const funnel = [
      ...funnelOrder.map((name) => ({
        label: name.replace(/^library_/, "").replaceAll("_", " "),
        value: funnelMap.get(name) ?? 0,
      })),
      { label: "whatsapp click", value: funnelMap.get("whatsapp_click") ?? 0 },
    ];

    const funnelDropoff = funnelOrder.map((name, index) => {
      const value = funnelMap.get(name) ?? 0;
      const first = funnelMap.get(funnelOrder[0]) ?? 0;
      const previous = index === 0 ? null : funnelMap.get(funnelOrder[index - 1]) ?? 0;
      return {
        label: name.replace(/^library_/, "").replaceAll("_", " "),
        value,
        pctOfPrevious: previous && previous > 0 ? Math.round((value / previous) * 100) : null,
        pctOfFirst: first > 0 ? Math.round((value / first) * 100) : null,
      };
    });

    let whatsappAssisted = 0;
    for (const visitorId of purchaseVisitors) {
      if (whatsappVisitors.has(visitorId)) whatsappAssisted += 1;
    }
    const visitorsWithUtm = new Set(utmVisitors.map((row) => row.visitorId));
    const organicOnly = organicVisitors.filter((row) => !visitorsWithUtm.has(row.visitorId)).length;
    const channels = [
      { label: "organic visitors", value: organicOnly },
      { label: "utm visitors", value: visitorsWithUtm.size },
      { label: "whatsapp-assisted purchases", value: whatsappAssisted },
    ];

    const waitHours = pendingProofs.map((order) => {
      const sinceAt = order.payment?.updatedAt || order.updatedAt || order.createdAt;
      return Math.max(0, Math.round((Date.now() - new Date(sinceAt).getTime()) / 3600000));
    });
    const overdue = waitHours.filter((hours) => hours >= 24).length;
    const proofSla = {
      pending: pendingProofs.length,
      overdue,
      overduePct: pendingProofs.length ? Math.round((overdue / pendingProofs.length) * 100) : 0,
      medianWaitHours: median(waitHours),
      stuck: pendingProofs
        .map((order, index) => ({ orderNumber: order.orderNumber, waitHours: waitHours[index] ?? 0 }))
        .sort((a, b) => b.waitHours - a.waitHours)
        .slice(0, 8),
    };

    const report = {
      days: normalizedDays,
      pageViews,
      uniqueVisitors: new Set(visitors.map((row) => row.userId || row.visitorId)).size,
      avgDurationSec: Math.round((durationAgg._avg.durationMs ?? 0) / 1000),
      topPages: topCounts(topPages.map((row) => ({ key: row.path, value: row._count._all }))),
      devices: topCounts(devices.map((row) => ({ key: row.deviceType || "unknown", value: row._count._all }))),
      referrers: topCounts(referrers.map((row) => ({ key: row.referrer?.trim() || "(direct)", value: row._count._all }))),
      utmSources: topCounts(utmSources.map((row) => ({ key: row.utmSource || "(unknown)", value: row._count._all }))),
      funnel,
      funnelDropoff,
      whatsappSources: topCounts([...whatsappSourceMap.entries()].map(([key, value]) => ({ key, value }))),
      channels,
      proofSla,
      recentPaths: recentViews.map((view) => ({
        path: view.path,
        minutes: view.durationMs != null ? Math.round((view.durationMs / 60000) * 10) / 10 : 0,
        deviceType: view.deviceType,
        referrer: view.referrer || "(direct)",
        at: view.startedAt.toISOString(),
      })),
    };
    reportCache.set(cacheKey, { value: report, expiresAt: Date.now() + REPORT_CACHE_TTL_MS });
    return report;
  } catch (error) {
    if (isMissingSchemaError(error) || isDatabaseUnavailableError(error)) return empty;
    throw error;
  }
}

/** Flat CSV for admin download (basic). */
export function siteAnalyticsReportToCsv(report: Awaited<ReturnType<typeof getSiteAnalyticsReport>>) {
  const lines = [
    "section,label,value,extra",
    `summary,pageViews,${report.pageViews},`,
    `summary,uniqueVisitors,${report.uniqueVisitors},`,
    `summary,avgDurationSec,${report.avgDurationSec},`,
    `summary,days,${report.days},`,
    `proofSla,pending,${report.proofSla.pending},`,
    `proofSla,overdue,${report.proofSla.overdue},`,
    `proofSla,overduePct,${report.proofSla.overduePct},`,
    `proofSla,medianWaitHours,${report.proofSla.medianWaitHours},`,
  ];
  for (const row of report.funnelDropoff) {
    lines.push(`funnelDropoff,${csvEscape(row.label)},${row.value},prev%=${row.pctOfPrevious ?? ""};first%=${row.pctOfFirst ?? ""}`);
  }
  for (const row of report.whatsappSources) {
    lines.push(`whatsappSources,${csvEscape(row.label)},${row.value},`);
  }
  for (const row of report.channels) {
    lines.push(`channels,${csvEscape(row.label)},${row.value},`);
  }
  for (const row of report.topPages) {
    lines.push(`topPages,${csvEscape(row.label)},${row.value},`);
  }
  for (const row of report.utmSources) {
    lines.push(`utmSources,${csvEscape(row.label)},${row.value},`);
  }
  for (const row of report.proofSla.stuck) {
    lines.push(`stuckProof,${csvEscape(row.orderNumber)},${row.waitHours},hours`);
  }
  return `${lines.join("\n")}\n`;
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}
