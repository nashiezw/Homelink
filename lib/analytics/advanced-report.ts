import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { ensureCoreProductionSchema, isDatabaseUnavailableError, isMissingSchemaError } from "@/lib/db/production-schema";
import { getSiteAnalyticsReport, isInternalAnalyticsPath, siteAnalyticsReportToCsv } from "@/lib/analytics/site-analytics";
import { listLivePresence } from "@/lib/analytics/presence";
import { buildTopClassAnalytics } from "@/lib/analytics/topclass";
import { getHydratedRuntimePlatformSettings } from "@/lib/settings/runtime";

type Meta = Record<string, unknown>;

function asMeta(value: unknown): Meta {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Meta) : {};
}

function metaStr(meta: Meta, ...keys: string[]) {
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function metaNum(meta: Meta, ...keys: string[]) {
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return 0;
}

function looksLikeProductId(value: string) {
  const v = value.trim();
  // Prisma/CUID-style ids and bare slug-less opaque tokens should never display as titles.
  return /^c[a-z0-9]{20,}$/i.test(v) || (/^[a-z0-9_-]{16,}$/i.test(v) && !/\s/.test(v) && v === v.toLowerCase());
}

function productKey(target: string | null | undefined, meta: Meta) {
  const fromMeta = metaStr(meta, "productId", "id");
  if (fromMeta) return fromMeta;
  const targetValue = target?.trim() || "";
  if (targetValue && (looksLikeProductId(targetValue) || !metaStr(meta, "title", "productTitle"))) return targetValue;
  return fromMeta || targetValue || "";
}

function productTitle(target: string | null | undefined, meta: Meta, catalogTitle?: string) {
  const fromMeta = metaStr(meta, "title", "productTitle");
  if (fromMeta && !looksLikeProductId(fromMeta)) return fromMeta;
  if (catalogTitle?.trim()) return catalogTitle.trim();
  const targetValue = target?.trim() || "";
  if (targetValue && !looksLikeProductId(targetValue)) return targetValue;
  return catalogTitle?.trim() || "Unknown product";
}

function resolveDisplayTitle(title: string, productId: string, catalogTitles: Map<string, string>) {
  const catalog = catalogTitles.get(productId)?.trim();
  if (catalog) return catalog;
  if (title && !looksLikeProductId(title) && title !== "Unknown product") return title;
  return catalog || "Unknown product";
}

function cleanUrlPath(path: string | null | undefined) {
  const raw = String(path || "/").trim() || "/";
  try {
    const url = raw.startsWith("http") ? new URL(raw) : new URL(raw, "https://www.houselink.co.zw");
    return `${url.pathname}${url.search}`;
  } catch {
    return raw.split("#")[0] || "/";
  }
}

function readablePageName(path: string | null | undefined, title?: string | null) {
  const clean = cleanUrlPath(path);
  const pageTitle = String(title || "")
    .replace(/\s*[|–-]\s*HouseLink.*$/i, "")
    .replace(/\s*[|–-]\s*Library.*$/i, "")
    .trim();
  if (pageTitle && !/^HouseLink Zimbabwe$/i.test(pageTitle)) return pageTitle;
  const pathname = clean.split("?")[0] || "/";
  if (pathname === "/") return "Homepage";
  if (pathname === "/library") return "Library storefront";
  if (pathname === "/library/checkout") return "Library checkout";
  if (pathname === "/dashboard/my-library") return "My Library";
  if (pathname.startsWith("/library/")) return `Library product: ${decodeSlug(pathname.replace("/library/", ""))}`;
  if (pathname === "/search") return "Property search";
  if (pathname.startsWith("/listings/")) return `Listing: ${decodeSlug(pathname.replace("/listings/", ""))}`;
  if (pathname.startsWith("/blog/")) return `Blog: ${decodeSlug(pathname.replace("/blog/", ""))}`;
  return decodeSlug(pathname.replace(/^\/+/, "") || "Page");
}

function decodeSlug(value: string) {
  return value
    .split("?")[0]
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function sourceLabel(row: { utmSource?: string | null; utmCampaign?: string | null; referrer?: string | null }) {
  const source = row.utmSource?.trim();
  const campaign = row.utmCampaign?.trim();
  if (source && campaign) return `${source} · ${campaign}`;
  if (source) return source;
  const referrer = row.referrer?.trim();
  if (!referrer) return "Direct / unknown";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return host || "Referral";
  } catch {
    return referrer.length > 42 ? `${referrer.slice(0, 42)}...` : referrer;
  }
}

function locationLabel(row: { city?: string | null; region?: string | null; country?: string | null }) {
  const parts = [row.city, row.region, row.country].map((part) => part?.trim()).filter(Boolean);
  return parts.length ? parts.join(", ") : "Location unavailable";
}

function formatLiveStepName(name: string) {
  if (name === "page_view") return "Viewed page";
  if (name === "library_checkout_started") return "Started Library checkout";
  if (name === "library_cart_added" || name === "library_bundle_added") return "Added to bag";
  if (name === "library_cart_removed") return "Removed from bag";
  if (name === "library_cart_qty_changed") return "Changed bag quantity";
  if (name === "library_purchase_completed") return "Placed Library order";
  if (name === "library_sample_opened") return "Opened sample";
  if (name === "whatsapp_click") return "Clicked WhatsApp";
  return name.replace(/^library_/, "").replaceAll("_", " ");
}

function liveLeadStatus(row: { path: string; cartItemCount: number; cartValue: number; userId: string | null }, purchased: boolean) {
  if (purchased) return { label: "Order placed", tone: "success" };
  if (row.path.includes("/library/checkout") && row.cartItemCount > 0) return { label: "Hot lead: checkout", tone: "hot" };
  if (row.cartItemCount > 0 && row.cartValue >= 40) return { label: "High-value bag", tone: "hot" };
  if (row.cartItemCount > 0) return { label: "Open bag", tone: "warm" };
  if (row.path.startsWith("/library")) return { label: "Library browsing", tone: "info" };
  if (row.userId) return { label: "Known visitor", tone: "info" };
  return { label: "Browsing", tone: "neutral" };
}

function recentStepKey(step: { at: string; name: string; detail: string }) {
  return `${step.at}:${step.name}:${step.detail}`;
}

const publicPageWhere = {
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

const publicFunnelWhere = {
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

type AdvancedSiteAnalyticsReport = any;
type LiveJourneyStep = { at: string; name: string; detail: string };
const ADVANCED_REPORT_CACHE_TTL_MS = 5 * 60 * 1000;
const advancedReportCache = new Map<string, { value: AdvancedSiteAnalyticsReport; expiresAt: number }>();

export async function getAdvancedSiteAnalyticsReport(days = 30): Promise<AdvancedSiteAnalyticsReport> {
  return buildAdvancedSiteAnalyticsReport(days);
}

async function buildAdvancedSiteAnalyticsReport(days = 30): Promise<AdvancedSiteAnalyticsReport> {
  const normalizedDays = Math.max(1, Math.min(90, Math.round(days || 30)));
  const cacheKey = `advanced:${normalizedDays}`;
  const cached = advancedReportCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const base = await getSiteAnalyticsReport(days);
  const emptyAdvanced = {
    ...base,
    live: {
      online: 0,
      libraryShoppers: 0,
      onCheckout: 0,
      openBags: 0,
      bagValue: 0,
      visitors: [] as Array<{
        visitorId: string;
        path: string;
        title: string;
        deviceType: string;
        productTitle: string;
        cartItemCount: number;
        cartValue: number;
        cartCurrency: string;
        identityLabel: string;
        contactEmail: string;
        contactPhone: string;
        contactStatus: string;
        currentPageLabel: string;
        location: string;
        source: string;
        leadStatus: { label: string; tone: string };
        journey: Array<{ at: string; name: string; detail: string }>;
        debug: { visitorId: string; sessionId: string; userId: string | null; rawPath: string };
        lastSeenAt: string;
        userId: string | null;
      }>,
      alerts: [] as string[],
    },
    products: [] as Array<{
      productId: string;
      title: string;
      views: number;
      uniqueViewers: number;
      adds: number;
      removes: number;
      purchases: number;
      samples: number;
      addRate: number;
      purchaseRate: number;
      formats: Record<string, number>;
    }>,
    cartHeat: {
      mostAdded: [] as Array<{ label: string; value: number }>,
      mostRemoved: [] as Array<{ label: string; value: number }>,
    },
    cartActivity: [] as Array<{
      at: string;
      name: string;
      title: string;
      visitorId: string;
      quantity: number;
      formatLabel: string;
      path: string;
    }>,
    journeys: [] as Array<{
      sessionId: string;
      visitorId: string;
      userId: string | null;
      startedAt: string;
      steps: Array<{ at: string; name: string; detail: string }>;
      whatsappAssisted: boolean;
      purchased: boolean;
    }>,
    revenueByProduct: [] as Array<{ label: string; value: number }>,
    revenueByFormat: [] as Array<{ label: string; value: number }>,
    revenueByChannel: [] as Array<{ label: string; value: number }>,
    proofFunnel: [] as Array<{ label: string; value: number }>,
    marketplace: [] as Array<{ label: string; value: number }>,
    engagement: [] as Array<{ label: string; value: number }>,
    cohorts: {
      newVisitors: 0,
      returningVisitors: 0,
      knownBuyersOnline: 0,
    },
    alerts: [] as string[],
    topClass: buildTopClassAnalytics({
      days: normalizedDays,
      funnels: [],
      orders: [],
      abandoned: [],
      catalog: [],
      live: [],
      pageViewsLast24h: 0,
      pageViewsPrev7dDailyAvg: 0,
      eventsLast24h: 0,
      eventsPrev7dDailyAvg: 0,
      pendingProofs: 0,
      todayRevenue: 0,
      todayOrders: 0,
    }),
  };

  if (!isPostgresStoreEnabled()) return emptyAdvanced;
  await ensureCoreProductionSchema();
  const prisma = getMainPrisma();
  const since = new Date(Date.now() - normalizedDays * 86400000);

  try {
    const dayAgo = new Date(Date.now() - 86400000);
    const eightDaysAgo = new Date(Date.now() - 8 * 86400000);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [funnels, liveRows, orders, firstViews, abandoned, catalog, views24h, views7d, events24h, events7d, platform] =
      await Promise.all([
        prisma.siteFunnelEvent.findMany({
          where: { createdAt: { gte: since }, ...publicFunnelWhere },
          select: {
            name: true,
            target: true,
            metadata: true,
            visitorId: true,
            sessionId: true,
            path: true,
            userId: true,
            createdAt: true,
          },
          take: 5000,
          orderBy: { createdAt: "desc" },
        }),
        listLivePresence(5 * 60 * 1000),
        prisma.libraryOrder
          .findMany({
            where: { createdAt: { gte: since }, status: { in: ["PAID", "FULFILLED", "PENDING", "REFUNDED"] } },
            select: {
              id: true,
              orderNumber: true,
              status: true,
              total: true,
              currency: true,
              createdAt: true,
              refundedAt: true,
              customerId: true,
              couponCode: true,
              items: { select: { productId: true, title: true, quantity: true, total: true, productType: true } },
              payment: { select: { status: true, proofStatus: true, createdAt: true, updatedAt: true } },
              customer: { select: { email: true, name: true, phone: true } },
            },
            take: 5000,
          })
          .catch(() => []),
        prisma.sitePageView.groupBy({
          by: ["visitorId"],
          _min: { startedAt: true },
          where: { startedAt: { gte: new Date(Date.now() - 180 * 86400000) }, ...publicPageWhere },
        }).catch(() => []),
        prisma.libraryAbandonedCart
          .findMany({
            where: { recoveredAt: null, updatedAt: { gte: since } },
            select: {
              id: true,
              email: true,
              subtotal: true,
              currency: true,
              reminderCount: true,
              reminderSentAt: true,
              updatedAt: true,
              items: true,
            },
            take: 200,
            orderBy: { updatedAt: "desc" },
          })
          .catch(() => []),
        prisma.libraryProduct
          .findMany({
            where: { deletedAt: null },
            select: { id: true, title: true, stock: true, lowStockThreshold: true, status: true },
            take: 500,
          })
          .catch(() => []),
        prisma.sitePageView.count({ where: { startedAt: { gte: dayAgo }, ...publicPageWhere } }).catch(() => 0),
        prisma.sitePageView.count({ where: { startedAt: { gte: eightDaysAgo, lt: dayAgo }, ...publicPageWhere } }).catch(() => 0),
        prisma.siteFunnelEvent.count({ where: { createdAt: { gte: dayAgo }, ...publicFunnelWhere } }).catch(() => 0),
        prisma.siteFunnelEvent.count({ where: { createdAt: { gte: eightDaysAgo, lt: dayAgo }, ...publicFunnelWhere } }).catch(() => 0),
        getHydratedRuntimePlatformSettings().catch(() => null),
      ]);

    const publicFunnels = funnels.filter((event) => !isInternalAnalyticsPath(event.path) && !isInternalAnalyticsPath(event.target));
    const productMap = new Map<
      string,
      {
        productId: string;
        title: string;
        views: number;
        viewers: Set<string>;
        adds: number;
        removes: number;
        purchases: number;
        samples: number;
        formats: Record<string, number>;
      }
    >();

    const catalogTitles = new Map(catalog.map((row) => [row.id, row.title]));

    const ensureProduct = (id: string, title: string) => {
      if (!id) return null;
      const resolved = resolveDisplayTitle(title, id, catalogTitles);
      let row = productMap.get(id);
      if (!row) {
        row = { productId: id, title: resolved, views: 0, viewers: new Set(), adds: 0, removes: 0, purchases: 0, samples: 0, formats: {} };
        productMap.set(id, row);
      } else if (
        resolved &&
        resolved !== "Unknown product" &&
        (row.title === "Unknown product" || looksLikeProductId(row.title) || row.title === id)
      ) {
        row.title = resolved;
      }
      return row;
    };

    const cartActivity: typeof emptyAdvanced.cartActivity = [];
    const addHeat = new Map<string, number>();
    const removeHeat = new Map<string, number>();
    const sessionMap = new Map<string, typeof emptyAdvanced.journeys[number]>();
    const engagementMap = new Map<string, number>();
    const marketplaceMap = new Map<string, number>();

    for (const event of publicFunnels) {
      const meta = asMeta(event.metadata);
      const id = productKey(event.target, meta);
      const title = productTitle(event.target, meta, id ? catalogTitles.get(id) : undefined);
      const format = metaStr(meta, "formatLabel", "formatType", "format") || "unknown";
      const sessionId = event.sessionId || `visitor:${event.visitorId}`;

      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, {
          sessionId,
          visitorId: event.visitorId,
          userId: event.userId,
          startedAt: event.createdAt.toISOString(),
          steps: [],
          whatsappAssisted: false,
          purchased: false,
        });
      }
      const journey = sessionMap.get(sessionId)!;
      if (event.createdAt.toISOString() < journey.startedAt) journey.startedAt = event.createdAt.toISOString();
      if (event.userId) journey.userId = event.userId;
      const detail = title !== "Unknown product" ? title : event.path || event.target || "";
      if (journey.steps.length < 40) {
        journey.steps.push({ at: event.createdAt.toISOString(), name: event.name, detail });
      }
      if (event.name === "whatsapp_click") journey.whatsappAssisted = true;
      if (event.name === "library_purchase_completed") journey.purchased = true;

      if (event.name === "library_product_viewed" && id) {
        const row = ensureProduct(id, title);
        if (row) {
          row.views += 1;
          row.viewers.add(event.visitorId);
        }
      }
      if ((event.name === "library_cart_added" || event.name === "library_bundle_added") && id) {
        const row = ensureProduct(id, title);
        if (row) {
          row.adds += 1;
          row.formats[format] = (row.formats[format] ?? 0) + 1;
        }
        addHeat.set(title, (addHeat.get(title) ?? 0) + 1);
        if (cartActivity.length < 80) {
          cartActivity.push({
            at: event.createdAt.toISOString(),
            name: event.name,
            title,
            visitorId: event.visitorId,
            quantity: metaNum(meta, "quantity", "qty") || 1,
            formatLabel: format,
            path: event.path || "",
          });
        }
      }
      if (event.name === "library_cart_removed" && id) {
        const row = ensureProduct(id, title);
        if (row) row.removes += 1;
        removeHeat.set(title, (removeHeat.get(title) ?? 0) + 1);
        if (cartActivity.length < 80) {
          cartActivity.push({
            at: event.createdAt.toISOString(),
            name: event.name,
            title,
            visitorId: event.visitorId,
            quantity: metaNum(meta, "quantity", "qty") || 1,
            formatLabel: format,
            path: event.path || "",
          });
        }
      }
      if (event.name === "library_sample_opened" && id) {
        const row = ensureProduct(id, title);
        if (row) row.samples += 1;
        engagementMap.set("sample opens", (engagementMap.get("sample opens") ?? 0) + 1);
      }
      if (event.name === "library_scroll_depth") {
        engagementMap.set("scroll depth pings", (engagementMap.get("scroll depth pings") ?? 0) + 1);
      }
      if (event.name === "library_download_started") engagementMap.set("download starts", (engagementMap.get("download starts") ?? 0) + 1);
      if (event.name === "library_download_completed") engagementMap.set("download completes", (engagementMap.get("download completes") ?? 0) + 1);
      if (event.name === "library_review_submitted") engagementMap.set("reviews submitted", (engagementMap.get("reviews submitted") ?? 0) + 1);
      if (event.name === "library_bundle_shown") engagementMap.set("bundle rails shown", (engagementMap.get("bundle rails shown") ?? 0) + 1);
      if (event.name === "gallery_opened") engagementMap.set("gallery opens", (engagementMap.get("gallery opens") ?? 0) + 1);

      if (event.name === "listing_viewed") marketplaceMap.set("listing views", (marketplaceMap.get("listing views") ?? 0) + 1);
      if (event.name === "enquiry_started") marketplaceMap.set("enquiries started", (marketplaceMap.get("enquiries started") ?? 0) + 1);
      if (event.name === "enquiry_completed") marketplaceMap.set("enquiries completed", (marketplaceMap.get("enquiries completed") ?? 0) + 1);
      if (event.name === "search_submitted") marketplaceMap.set("searches", (marketplaceMap.get("searches") ?? 0) + 1);
      if (event.name === "saved_listing") marketplaceMap.set("saved listings", (marketplaceMap.get("saved listings") ?? 0) + 1);
      if (event.name === "whatsapp_click") marketplaceMap.set("whatsapp clicks", (marketplaceMap.get("whatsapp clicks") ?? 0) + 1);
    }

    const revenueByProduct = new Map<string, number>();
    const revenueByFormat = new Map<string, number>();
    let awaitingPay = 0;
    let proofUploaded = 0;
    let paid = 0;
    let rejected = 0;

    for (const order of orders) {
      const paymentStatus = String(order.payment?.status || "").toUpperCase();
      const proofStatus = String(order.payment?.proofStatus || "").toUpperCase();
      if (paymentStatus === "PAID" || order.status === "PAID" || order.status === "FULFILLED") paid += 1;
      else if (proofStatus === "UPLOADED") proofUploaded += 1;
      else if (proofStatus === "REJECTED") rejected += 1;
      else awaitingPay += 1;

      if (paymentStatus !== "PAID" && order.status !== "PAID" && order.status !== "FULFILLED") continue;
      for (const item of order.items) {
        const title = resolveDisplayTitle(item.title || "", item.productId, catalogTitles);
        revenueByProduct.set(title, (revenueByProduct.get(title) ?? 0) + Number(item.total || 0));
        const format = item.productType === "PRINTED_BOOK" ? "printed" : "digital";
        revenueByFormat.set(format, (revenueByFormat.get(format) ?? 0) + Number(item.total || 0));
        const row = ensureProduct(item.productId, title);
        if (row) row.purchases += item.quantity || 1;
      }
    }

    const products = [...productMap.values()]
      .map((row) => ({
        productId: row.productId,
        title: resolveDisplayTitle(row.title, row.productId, catalogTitles),
        views: row.views,
        uniqueViewers: row.viewers.size,
        adds: row.adds,
        removes: row.removes,
        purchases: row.purchases,
        samples: row.samples,
        addRate: row.views ? Math.round((row.adds / row.views) * 100) : 0,
        purchaseRate: row.views ? Math.round((row.purchases / row.views) * 100) : 0,
        formats: row.formats,
      }))
      .sort((a, b) => b.views - a.views || b.adds - a.adds)
      .slice(0, 100);

    const liveUserIds = [...new Set(liveRows.map((row) => row.userId).filter((id): id is string => Boolean(id)))].slice(0, 200);
    const liveSessionIds = [...new Set(liveRows.map((row) => row.sessionId).filter(Boolean))].slice(0, 200);
    const liveVisitorIds = [...new Set(liveRows.map((row) => row.visitorId).filter(Boolean))].slice(0, 200);
    const [liveUsers, livePageViews] = await Promise.all([
      liveUserIds.length
        ? prisma.user
            .findMany({
              where: { id: { in: liveUserIds } },
              select: { id: true, name: true, email: true, phone: true },
              take: 200,
            })
            .catch(() => [])
        : Promise.resolve([]),
      liveRows.length
        ? prisma.sitePageView
            .findMany({
              where: {
                startedAt: { gte: new Date(Date.now() - 2 * 60 * 60_000) },
                ...publicPageWhere,
                OR: [{ sessionId: { in: liveSessionIds } }, { visitorId: { in: liveVisitorIds } }],
              },
              select: { visitorId: true, sessionId: true, path: true, title: true, referrer: true, utmSource: true, utmCampaign: true, startedAt: true },
              orderBy: { startedAt: "desc" },
              take: 400,
            })
            .catch(() => [])
        : Promise.resolve([]),
    ]);
    const liveUserById = new Map(liveUsers.map((user) => [user.id, user]));
    for (const view of livePageViews) {
      const sessionId = view.sessionId || `visitor:${view.visitorId}`;
      const existing =
        sessionMap.get(sessionId) ??
        sessionMap.get(`visitor:${view.visitorId}`) ?? {
          sessionId,
          visitorId: view.visitorId,
          userId: null,
          startedAt: view.startedAt.toISOString(),
          steps: [],
          whatsappAssisted: false,
          purchased: false,
        };
      const step = {
        at: view.startedAt.toISOString(),
        name: "page_view",
        detail: readablePageName(view.path, view.title),
      };
      if (!existing.steps.some((item: LiveJourneyStep) => recentStepKey(item) === recentStepKey(step))) existing.steps.push(step);
      if (view.startedAt.toISOString() < existing.startedAt) existing.startedAt = view.startedAt.toISOString();
      sessionMap.set(existing.sessionId, existing);
    }

    const liveVisitors = liveRows.map((row) => {
      const user = row.userId ? liveUserById.get(row.userId) : null;
      const journey = sessionMap.get(row.sessionId) ?? sessionMap.get(`visitor:${row.visitorId}`);
      const purchased = Boolean(journey?.purchased);
      const steps = (journey?.steps ?? [])
        .sort((a: LiveJourneyStep, b: LiveJourneyStep) => a.at.localeCompare(b.at))
        .slice(-6)
        .map((step: LiveJourneyStep) => ({
          ...step,
          name: formatLiveStepName(step.name),
        }));
      const contactEmail = user?.email ?? row.contactEmail ?? "";
      const contactPhone = user?.phone ?? row.contactPhone ?? "";
      const contactStatus = contactPhone
        ? "Phone captured"
        : contactEmail
          ? "Email captured, phone missing"
          : row.path.includes("/library/checkout")
            ? "Checkout contact not captured yet"
            : "Anonymous";
      const currentPageLabel = readablePageName(row.path, row.title || row.productTitle);
      return {
        visitorId: row.visitorId,
        path: cleanUrlPath(row.path),
        title: row.title || "",
        deviceType: row.deviceType || "unknown",
        productTitle: row.productTitle || "",
        cartItemCount: row.cartItemCount,
        cartValue: row.cartValue,
        cartCurrency: row.cartCurrency || "USD",
        identityLabel: user?.name?.trim() || (contactEmail ? contactEmail.split("@")[0] : "Guest visitor"),
        contactEmail,
        contactPhone,
        contactStatus,
        currentPageLabel,
        location: locationLabel(row),
        source: sourceLabel(row),
        leadStatus: liveLeadStatus(row, purchased),
        journey: steps,
        lastSeenAt: row.lastSeenAt.toISOString(),
        userId: row.userId,
        debug: {
          visitorId: row.visitorId,
          sessionId: row.sessionId,
          userId: row.userId,
          rawPath: row.path,
        },
      };
    });
    const libraryShoppers = liveVisitors.filter((row) => row.path.startsWith("/library") || row.path.startsWith("/dashboard/my-library"));
    const onCheckout = liveVisitors.filter((row) => row.path.includes("/library/checkout"));
    const openBags = liveVisitors.filter((row) => row.cartItemCount > 0);
    const bagValue = openBags.reduce((sum, row) => sum + row.cartValue, 0);
    const liveAlerts: string[] = [];
    if (onCheckout.length >= 2) liveAlerts.push(`${onCheckout.length} people are on Library checkout right now.`);
    if (openBags.length >= 3) liveAlerts.push(`${openBags.length} open Library bags online (≈ USD ${bagValue.toFixed(0)}).`);
    if (base.proofSla.overdue > 0) liveAlerts.push(`${base.proofSla.overdue} payment proofs are overdue (24h+).`);

    const periodStart = since.getTime();
    let newVisitors = 0;
    let returningVisitors = 0;
    for (const row of firstViews) {
      const first = row._min.startedAt?.getTime() ?? 0;
      if (first >= periodStart) newVisitors += 1;
      else returningVisitors += 1;
    }

    const alerts = [
      ...liveAlerts,
      ...products
        .filter((row) => row.views >= 10 && row.addRate < 5)
        .slice(0, 5)
        .map((row) => `Content gap: “${row.title}” has ${row.views} views but only ${row.addRate}% add-to-bag.`),
      ...products
        .filter((row) => row.removes >= 5 && row.removes > row.adds)
        .slice(0, 3)
        .map((row) => `High removes: “${row.title}” removed ${row.removes}× vs ${row.adds} adds.`),
    ];

    const journeys = [...sessionMap.values()]
      .map((journey) => ({
        ...journey,
        steps: [...journey.steps].reverse().slice(0, 25).reverse(),
      }))
      .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
      .slice(0, 40);

    const top = (map: Map<string, number>, limit = 12) =>
      [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([label, value]) => ({ label: label.length > 42 ? `${label.slice(0, 42)}…` : label, value }));

    const todayOrders = orders.filter((order) => order.createdAt >= startOfToday);
    const todayRevenue = todayOrders
      .filter((order) => order.status === "PAID" || order.status === "FULFILLED" || order.payment?.status === "PAID")
      .reduce((sum, order) => sum + Number(order.total || 0), 0);

    const topClass = buildTopClassAnalytics({
      days: normalizedDays,
      funnels: publicFunnels,
      orders,
      abandoned,
      catalog,
      live: liveVisitors,
      pageViewsLast24h: views24h,
      pageViewsPrev7dDailyAvg: views7d / 7,
      eventsLast24h: events24h,
      eventsPrev7dDailyAvg: events7d / 7,
      whatsappNumber: platform?.contact?.whatsappNumber,
      pendingProofs: base.proofSla.pending,
      todayRevenue,
      todayOrders: todayOrders.length,
    });

    const report = {
      ...base,
      live: {
        online: liveVisitors.length,
        libraryShoppers: libraryShoppers.length,
        onCheckout: onCheckout.length,
        openBags: openBags.length,
        bagValue: Math.round(bagValue * 100) / 100,
        visitors: liveVisitors.slice(0, 60),
        alerts: liveAlerts,
      },
      products,
      cartHeat: {
        mostAdded: top(addHeat),
        mostRemoved: top(removeHeat),
      },
      cartActivity,
      journeys,
      revenueByProduct: top(revenueByProduct).map((row) => ({ ...row, value: Math.round(row.value * 100) / 100 })),
      revenueByFormat: top(revenueByFormat).map((row) => ({ ...row, value: Math.round(row.value * 100) / 100 })),
      revenueByChannel: base.channels,
      proofFunnel: [
        { label: "awaiting payment / proof", value: awaitingPay },
        { label: "proof uploaded", value: proofUploaded },
        { label: "paid", value: paid },
        { label: "proof rejected", value: rejected },
      ],
      marketplace: top(marketplaceMap),
      engagement: top(engagementMap),
      cohorts: {
        newVisitors,
        returningVisitors,
        knownBuyersOnline: liveVisitors.filter((row) => row.userId).length,
      },
      alerts: [...alerts, ...topClass.anomalies.map((row) => `Anomaly ${row.metric}: ${row.current} vs baseline ${row.baseline}`)],
      topClass,
    };
    advancedReportCache.set(cacheKey, { value: report, expiresAt: Date.now() + ADVANCED_REPORT_CACHE_TTL_MS });
    return report;
  } catch (error) {
    if (isMissingSchemaError(error) || isDatabaseUnavailableError(error)) return emptyAdvanced;
    throw error;
  }
}

export function advancedAnalyticsToCsv(report: Awaited<ReturnType<typeof getAdvancedSiteAnalyticsReport>>) {
  const lines = [siteAnalyticsReportToCsv(report).trimEnd()];
  lines.push("section,label,value,extra");
  for (const row of report.products) {
    lines.push(
      `products,${csv(row.title)},${row.views},id=${row.productId};uniques=${row.uniqueViewers};adds=${row.adds};removes=${row.removes};purchases=${row.purchases};addRate=${row.addRate};purchaseRate=${row.purchaseRate}`,
    );
  }
  for (const row of report.cartActivity) {
    lines.push(`cartActivity,${csv(row.title)},${row.quantity},event=${row.name};visitor=${row.visitorId};at=${row.at}`);
  }
  for (const row of report.live.visitors) {
    lines.push(
      `live,${csv(row.path)},${row.cartItemCount},visitor=${row.visitorId};product=${csv(row.productTitle)};value=${row.cartValue};at=${row.lastSeenAt}`,
    );
  }
  for (const row of report.journeys) {
    lines.push(
      `journeys,${csv(row.sessionId)},${row.steps.length},visitor=${row.visitorId};wa=${row.whatsappAssisted};purchased=${row.purchased};user=${row.userId || ""}`,
    );
  }
  for (const alert of report.alerts) {
    lines.push(`alerts,${csv(alert)},1,`);
  }
  const tc = report.topClass;
  if (tc) {
    lines.push(`board,todayRevenue,${tc.board.todayRevenue},orders=${tc.board.todayOrders};online=${tc.board.online};bags=${tc.board.openBags}`);
    lines.push(`board,assistedRevenue,${tc.board.assistedRevenue},waClicks=${tc.board.waClicks};refunds=${tc.board.refundTotal};proofs=${tc.board.pendingProofs}`);
    for (const row of tc.pathFlows) lines.push(`pathFlows,${csv(`${row.from} → ${row.to}`)},${row.value},`);
    for (const row of tc.retentionCohorts) lines.push(`retention,${csv(row.cohort)},${row.size},d7=${row.d7};d30=${row.d30}`);
    for (const row of tc.margins) lines.push(`margins,${csv(row.title)},${row.net},revenue=${row.revenue};refunds=${row.refunds}`);
    for (const row of tc.inventoryDemand) {
      lines.push(`inventory,${csv(row.title)},${row.stock},views=${row.views};adds=${row.adds};status=${row.status};id=${row.productId}`);
    }
    for (const row of tc.experiments) {
      lines.push(`experiments,${csv(`${row.experiment}:${row.variant}`)},${row.exposures},conversions=${row.conversions};rate=${row.rate}`);
    }
    for (const row of tc.intervene) lines.push(`intervene,${csv(row.reason)},${row.count},severity=${row.severity}`);
    for (const row of tc.abandonRescue) {
      lines.push(`abandonRescue,${csv(row.email)},${row.value},idleHours=${row.idleHours};items=${row.itemCount};reminders=${row.reminderCount}`);
    }
    for (const row of tc.fraud) lines.push(`fraud,${csv(row.signal)},${row.score},${csv(row.detail)}`);
    for (const row of tc.orderSlas) {
      lines.push(`orderSla,${csv(row.orderNumber)},${row.hours},stage=${row.stage};breached=${row.breached}`);
    }
    for (const row of tc.identity) {
      lines.push(`identity,${csv(row.visitorId)},${row.orders},user=${row.userId};email=${csv(row.email)}`);
    }
    for (const row of tc.ltvRfm) {
      lines.push(`ltvRfm,${csv(row.email || row.customerId)},${row.revenue},orders=${row.orders};recency=${row.recencyDays};segment=${row.segment}`);
    }
    for (const row of tc.segments) lines.push(`segments,${csv(row.name)},${row.count},${csv(row.description)}`);
    for (const row of tc.attribution.firstTouch) lines.push(`attrFirst,${csv(row.label)},${row.value},`);
    for (const row of tc.attribution.lastTouch) lines.push(`attrLast,${csv(row.label)},${row.value},`);
    for (const row of tc.attribution.linear) lines.push(`attrLinear,${csv(row.label)},${row.value},`);
    lines.push(`attribution,assistedRate,${tc.attribution.assistedRate},assistedRevenue=${tc.attribution.assistedRevenue}`);
    for (const row of tc.campaigns) {
      lines.push(`campaigns,${csv(row.campaign)},${row.revenue},visitors=${row.visitors};purchases=${row.purchases}`);
    }
    lines.push(`quality,rageClicks,${tc.rageClicks},uiErrors=${tc.uiErrors};missingProductIdRate=${tc.dataQuality.missingProductIdRate}`);
    for (const row of tc.search.topQueries) lines.push(`search,${csv(row.label)},${row.value},`);
    for (const row of tc.search.zeroResults) lines.push(`searchZero,${csv(row.label)},${row.value},`);
    for (const row of tc.sampleFunnel) lines.push(`sampleFunnel,${csv(row.label)},${row.value},`);
    lines.push(`nps,avg,${tc.nps.avg},count=${tc.nps.count}`);
    for (const note of tc.dataQuality.notes) lines.push(`dataQuality,note,1,${csv(note)}`);
    for (const row of tc.hourly) lines.push(`hourly,h${row.hour},${row.views},events=${row.events}`);
    for (const row of tc.anomalies) {
      lines.push(`anomalies,${csv(row.metric)},${row.current},baseline=${row.baseline};severity=${row.severity}`);
    }
    for (const field of tc.piiAudit.fieldsStored) lines.push(`piiAudit,field,1,${csv(field)}`);
    for (const goal of tc.goals) lines.push(`goals,${csv(goal.name)},${goal.current},target=${goal.target};pct=${goal.pct}`);
    lines.push(
      `compare,pageViews24h,${tc.compare.pageViewsLast24h},prev7dDailyAvg=${tc.compare.pageViewsPrev7dDailyAvg};events24h=${tc.compare.eventsLast24h};eventsPrevAvg=${tc.compare.eventsPrev7dDailyAvg}`,
    );
  }
  return `${lines.join("\n")}\n`;
}

function csv(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}
