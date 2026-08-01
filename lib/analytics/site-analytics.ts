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
    recentPaths: [] as Array<{ path: string; minutes: number; deviceType: string; referrer: string; at: string }>,
  };
  if (!isPostgresStoreEnabled()) return empty;
  await ensureCoreProductionSchema();
  const prisma = getMainPrisma();
  const since = new Date(Date.now() - Math.max(1, Math.min(90, days)) * 24 * 60 * 60 * 1000);

  try {
    const [views, funnels, durationAgg, visitors] = await Promise.all([
      prisma.sitePageView.findMany({
        where: { startedAt: { gte: since } },
        select: {
          path: true,
          deviceType: true,
          referrer: true,
          utmSource: true,
          durationMs: true,
          startedAt: true,
        },
        take: 20000,
        orderBy: { startedAt: "desc" },
      }),
      prisma.siteFunnelEvent.findMany({
        where: { createdAt: { gte: since } },
        select: { name: true },
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
    ]);

    const pageMap = new Map<string, number>();
    const deviceMap = new Map<string, number>();
    const referrerMap = new Map<string, number>();
    const utmMap = new Map<string, number>();
    for (const view of views) {
      pageMap.set(view.path, (pageMap.get(view.path) ?? 0) + 1);
      deviceMap.set(view.deviceType || "unknown", (deviceMap.get(view.deviceType || "unknown") ?? 0) + 1);
      const ref = view.referrer?.trim() || "(direct)";
      referrerMap.set(ref, (referrerMap.get(ref) ?? 0) + 1);
      if (view.utmSource) utmMap.set(view.utmSource, (utmMap.get(view.utmSource) ?? 0) + 1);
    }

    const funnelOrder = [
      "library_product_viewed",
      "library_cart_added",
      "library_checkout_started",
      "library_purchase_completed",
      "library_download_started",
      "whatsapp_click",
    ];
    const funnelMap = new Map<string, number>();
    for (const event of funnels) {
      funnelMap.set(event.name, (funnelMap.get(event.name) ?? 0) + 1);
    }
    const funnel = funnelOrder
      .filter((name) => (funnelMap.get(name) ?? 0) > 0 || name.startsWith("library_"))
      .map((name) => ({
        label: name.replace(/^library_/, "").replaceAll("_", " "),
        value: funnelMap.get(name) ?? 0,
      }));

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
