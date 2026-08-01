import type { Prisma } from "@prisma/client";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { ensureCoreProductionSchema, isMissingSchemaError } from "@/lib/db/production-schema";

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

function clip(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

export async function recordSitePageView(input: SitePageViewInput) {
  if (!isPostgresStoreEnabled()) return { id: input.pageViewId || null };
  await ensureCoreProductionSchema();
  const prisma = getMainPrisma();
  const visitorId = clip(input.visitorId, 64);
  const sessionId = clip(input.sessionId, 64);
  const path = clip(input.path, 320) || "/";
  if (!visitorId || !sessionId) return { id: null };

  try {
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
    return { id: row.id };
  } catch (error) {
    if (isMissingSchemaError(error)) return { id: null };
    throw error;
  }
}

export async function recordSiteFunnelEvent(input: SiteFunnelInput) {
  if (!isPostgresStoreEnabled()) return { id: null };
  await ensureCoreProductionSchema();
  const prisma = getMainPrisma();
  const visitorId = clip(input.visitorId, 64);
  const name = clip(input.name, 80);
  if (!visitorId || !name) return { id: null };

  try {
    const row = await prisma.siteFunnelEvent.create({
      data: {
        visitorId,
        sessionId: clip(input.sessionId, 64) || null,
        name,
        path: clip(input.path, 320) || null,
        target: clip(input.target, 160) || null,
        deviceType: clip(input.deviceType, 32) || null,
        referrer: clip(input.referrer, 400) || null,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        userId: input.userId ? clip(input.userId, 64) : null,
      },
    });
    return { id: row.id };
  } catch (error) {
    if (isMissingSchemaError(error)) return { id: null };
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

export type SiteAnalyticsReport = Awaited<ReturnType<typeof getSiteAnalyticsReport>>;

export async function getSiteAnalyticsReport(days = 30) {
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
  await ensureCoreProductionSchema();
  const prisma = getMainPrisma();
  const since = new Date(Date.now() - Math.max(1, Math.min(90, days)) * 24 * 60 * 60 * 1000);

  try {
    const [views, funnels, durationAgg, visitors, pendingProofs] = await Promise.all([
      prisma.sitePageView.findMany({
        where: { startedAt: { gte: since } },
        select: {
          path: true,
          deviceType: true,
          referrer: true,
          utmSource: true,
          durationMs: true,
          startedAt: true,
          visitorId: true,
        },
        take: 20000,
        orderBy: { startedAt: "desc" },
      }),
      prisma.siteFunnelEvent.findMany({
        where: { createdAt: { gte: since } },
        select: { name: true, target: true, metadata: true, visitorId: true },
        take: 20000,
      }),
      prisma.sitePageView.aggregate({
        where: { startedAt: { gte: since }, durationMs: { not: null } },
        _avg: { durationMs: true },
      }),
      prisma.sitePageView.groupBy({
        by: ["visitorId"],
        where: { startedAt: { gte: since } },
        _count: true,
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

    const pageMap = new Map<string, number>();
    const deviceMap = new Map<string, number>();
    const referrerMap = new Map<string, number>();
    const utmMap = new Map<string, number>();
    const visitorsWithUtm = new Set<string>();
    const visitorsOrganic = new Set<string>();
    for (const view of views) {
      pageMap.set(view.path, (pageMap.get(view.path) ?? 0) + 1);
      deviceMap.set(view.deviceType || "unknown", (deviceMap.get(view.deviceType || "unknown") ?? 0) + 1);
      const ref = view.referrer?.trim() || "(direct)";
      referrerMap.set(ref, (referrerMap.get(ref) ?? 0) + 1);
      if (view.utmSource) {
        utmMap.set(view.utmSource, (utmMap.get(view.utmSource) ?? 0) + 1);
        visitorsWithUtm.add(view.visitorId);
      } else {
        visitorsOrganic.add(view.visitorId);
      }
    }

    const funnelOrder = [
      "library_product_viewed",
      "library_cart_added",
      "library_checkout_started",
      "library_proof_uploaded",
      "library_purchase_completed",
      "library_download_started",
    ];
    const funnelMap = new Map<string, number>();
    const whatsappSourceMap = new Map<string, number>();
    const whatsappVisitors = new Set<string>();
    const purchaseVisitors = new Set<string>();
    for (const event of funnels) {
      funnelMap.set(event.name, (funnelMap.get(event.name) ?? 0) + 1);
      if (event.name === "whatsapp_click") {
        whatsappVisitors.add(event.visitorId);
        const source = metaSource(event.metadata, event.target);
        whatsappSourceMap.set(source, (whatsappSourceMap.get(source) ?? 0) + 1);
      }
      if (event.name === "library_purchase_completed") purchaseVisitors.add(event.visitorId);
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
    const organicOnly = [...visitorsOrganic].filter((id) => !visitorsWithUtm.has(id)).length;
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

    return {
      days,
      pageViews: views.length,
      uniqueVisitors: visitors.length,
      avgDurationSec: Math.round((durationAgg._avg.durationMs ?? 0) / 1000),
      topPages: topCounts([...pageMap.entries()].map(([key, value]) => ({ key, value }))),
      devices: topCounts([...deviceMap.entries()].map(([key, value]) => ({ key, value }))),
      referrers: topCounts([...referrerMap.entries()].map(([key, value]) => ({ key, value }))),
      utmSources: topCounts([...utmMap.entries()].map(([key, value]) => ({ key, value }))),
      funnel,
      funnelDropoff,
      whatsappSources: topCounts([...whatsappSourceMap.entries()].map(([key, value]) => ({ key, value }))),
      channels,
      proofSla,
      recentPaths: views.slice(0, 20).map((view) => ({
        path: view.path,
        minutes: view.durationMs != null ? Math.round((view.durationMs / 60000) * 10) / 10 : 0,
        deviceType: view.deviceType,
        referrer: view.referrer || "(direct)",
        at: view.startedAt.toISOString(),
      })),
    };
  } catch (error) {
    if (isMissingSchemaError(error)) return empty;
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
