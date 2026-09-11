import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { isDatabaseUnavailableError } from "@/lib/db/production-schema";
import {
  enabledLibraryFormats,
  libraryFormatCompareAt,
  type LibraryProduct,
  type LibraryProductFormat,
} from "@/lib/library/catalog";
import { getLibraryProductBySlug, listLibraryProducts, logLibraryActivity } from "@/lib/library/repository";
import { getLibraryStoreSettings, saveLibraryStoreSettings } from "@/lib/library/settings";
import type { LibrarySalesFunnelConfig, LibrarySalesFunnelOffer } from "@/lib/library/settings-shared";
import type { Prisma } from "@prisma/client";

export type ResolvedLibrarySalesFunnel = {
  funnel: LibrarySalesFunnelConfig;
  product: LibraryProduct;
  formats: Array<LibraryProductFormat & {
    normalPrice?: number;
    offerPrice?: number;
    activePrice: number;
    savings?: number;
    onOffer: boolean;
  }>;
  offerState: LibrarySalesFunnelOffer["status"];
  offerActive: boolean;
  offerExpired: boolean;
  minPrice: number;
};

export type LibrarySalesFunnelDashboard = {
  funnels: Array<{
    id: string;
    slug: string;
    productSlug: string;
    productTitle: string;
    status: string;
    version: number;
    offerStatus: string;
    visitors: number;
    ctaClicks: number;
    checkoutStarts: number;
    paymentStarts: number;
    purchases: number;
    revenue: number;
    conversionRate: number;
    topCta: string;
  }>;
  totals: {
    visitors: number;
    ctaClicks: number;
    checkoutStarts: number;
    paymentStarts: number;
    purchases: number;
    revenue: number;
    conversionRate: number;
  };
  ctaPerformance: Array<{ cta: string; clicks: number; checkoutStarts: number; purchases: number; revenue: number; conversionRate: number }>;
  offerPerformance: Array<{ offerId: string; views: number; clicks: number; checkoutStarts: number; purchases: number; revenue: number; conversionRate: number }>;
  dropOff: Array<{ stage: string; count: number; dropOff: number; dropOffRate: number }>;
  productComparison: Array<{ product: string; visitors: number; purchases: number; revenue: number; conversionRate: number }>;
  campaignRows: Array<{ campaign: string; visitors: number; ctaClicks: number; checkoutStarts: number; purchases: number; revenue: number; adSpend: null; cpa: null; roas: null }>;
};

const PURCHASE_EVENTS = new Set(["library_purchase_completed", "payment_success", "purchase_completed"]);

export async function listSalesFunnels() {
  const settings = await getLibraryStoreSettings();
  return settings.salesFunnels.funnels;
}

export async function getSalesFunnelBySlug(slug: string, options?: { includePaused?: boolean }) {
  const settings = await getLibraryStoreSettings();
  if (!settings.salesFunnels.enabled && !options?.includePaused) return null;
  const funnel = settings.salesFunnels.funnels.find((item) => item.slug === slug || item.id === slug);
  if (!funnel) return null;
  if (!options?.includePaused && funnel.status !== "PUBLISHED") return null;
  const product = await getLibraryProductBySlug(funnel.productSlug) ?? (process.env.NODE_ENV === "development" ? fallbackFunnelProduct(funnel) : null);
  if (!product) return null;
  return resolveSalesFunnel(funnel, product);
}

export function resolveSalesFunnel(funnel: LibrarySalesFunnelConfig, product: LibraryProduct): ResolvedLibrarySalesFunnel {
  const state = currentOfferState(funnel.offer);
  const offerActive = state === "ACTIVE";
  const offerExpired = state === "EXPIRED";
  const formats = enabledLibraryFormats(product).map((format) => {
    const configured = funnel.offer.formatPrices.find((item) => item.formatType === format.type);
    const compareAt = libraryFormatCompareAt(format) ?? configured?.normalPrice;
    const activePrice = offerActive && configured ? configured.offerPrice : format.price;
    const normalPrice = compareAt && compareAt > activePrice ? compareAt : configured?.normalPrice;
    const savings = normalPrice && normalPrice > activePrice ? normalPrice - activePrice : undefined;
    return {
      ...format,
      normalPrice,
      offerPrice: configured?.offerPrice,
      activePrice,
      savings,
      onOffer: offerActive && Boolean(configured && configured.offerPrice < (configured.normalPrice || format.price)),
    };
  });
  return {
    funnel,
    product,
    formats,
    offerState: state,
    offerActive,
    offerExpired,
    minPrice: Math.min(...formats.map((format) => format.activePrice)),
  };
}

export function currentOfferState(offer: LibrarySalesFunnelOffer): LibrarySalesFunnelOffer["status"] {
  if (offer.status === "DRAFT" || offer.status === "PAUSED") return offer.status;
  const now = Date.now();
  const starts = Date.parse(offer.startsAt);
  const ends = Date.parse(offer.endsAt);
  if (Number.isFinite(starts) && starts > now) return "SCHEDULED";
  if (Number.isFinite(ends) && ends <= now) return "EXPIRED";
  return "ACTIVE";
}

export async function recordSalesFunnelEvent(input: {
  funnelId: string;
  productId?: string;
  event: string;
  ctaId?: string;
  offerId?: string;
  visitorId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}) {
  const targetId = input.productId || input.funnelId;
  const eventName = normalizedFunnelEventName(input.event);
  const metadata = {
    funnelId: input.funnelId,
    productId: input.productId,
    ctaId: input.ctaId,
    offerId: input.offerId,
    visitorId: input.visitorId,
    sessionId: input.sessionId,
    ...(input.metadata ?? {}),
  };
  const activity = await logLibraryActivity({
    targetType: "sales_funnel",
    targetId,
    action: eventName.toUpperCase(),
    message: `Sales funnel event: ${eventName}`,
    metadata,
  });
  if (isPostgresStoreEnabled()) {
    try {
      const meta = safeRecord(metadata);
      await getMainPrisma().siteFunnelEvent.create({
        data: {
          visitorId: String(input.visitorId || meta.visitorId || `funnel-${input.funnelId}`),
          sessionId: input.sessionId || (typeof meta.sessionId === "string" ? meta.sessionId : null),
          name: eventName,
          path: typeof meta.path === "string" ? meta.path.slice(0, 240) : `/funnel/${input.funnelId}`,
          target: targetId,
          referrer: typeof meta.referrer === "string" ? meta.referrer.slice(0, 240) : null,
          deviceType: typeof meta.deviceType === "string" ? meta.deviceType.slice(0, 48) : null,
          metadata: meta as Prisma.InputJsonObject,
        },
      });
    } catch (error) {
      if (!isDatabaseUnavailableError(error)) {
        console.warn("sales_funnel_event_record_failed", error instanceof Error ? error.message : "Unknown sales funnel event failure");
      }
    }
  }
  return activity;
}

export async function upsertSalesFunnelConfig(input: LibrarySalesFunnelConfig, actorId?: string) {
  const settings = await getLibraryStoreSettings();
  const funnels = settings.salesFunnels.funnels.filter((item) => item.id !== input.id && item.slug !== input.slug);
  funnels.unshift(input);
  const next = await saveLibraryStoreSettings({
    ...settings,
    salesFunnels: {
      ...settings.salesFunnels,
      funnels,
    },
  }, actorId);
  return next.salesFunnels.funnels.find((item) => item.id === input.id || item.slug === input.slug) ?? input;
}

export async function getSalesFunnelDashboard(days = 30): Promise<LibrarySalesFunnelDashboard> {
  const settings = await getLibraryStoreSettings();
  const products = await listLibraryProducts({ includeDrafts: true, limit: 5000 });
  const since = new Date();
  since.setDate(since.getDate() - days);
  const empty = buildDashboard(settings.salesFunnels.funnels, products, [], []);
  if (!isPostgresStoreEnabled()) return empty;
  try {
    const prisma = getMainPrisma();
    const [events, orders] = await Promise.all([
      prisma.siteFunnelEvent.findMany({
        where: {
          createdAt: { gte: since },
          OR: [
            { name: { startsWith: "library_funnel_" } },
            { name: { in: ["library_checkout_started", "library_purchase_completed", "payment_started"] } },
          ],
        },
        select: { name: true, target: true, path: true, metadata: true, createdAt: true },
        take: 10000,
      }).catch(() => []),
      prisma.libraryOrder.findMany({
        where: { createdAt: { gte: since }, status: { in: ["PAID", "FULFILLED"] } },
        include: { items: true },
        take: 10000,
      }).catch(() => []),
    ]);
    return buildDashboard(settings.salesFunnels.funnels, products, events, orders);
  } catch (error) {
    if (isDatabaseUnavailableError(error)) return empty;
    throw error;
  }
}

function buildDashboard(
  funnels: LibrarySalesFunnelConfig[],
  products: LibraryProduct[],
  events: Array<{ name: string; target: string | null; path: string | null; metadata: unknown }>,
  orders: Array<{ total: unknown; metadata: unknown; items: Array<{ productId: string }> }>,
): LibrarySalesFunnelDashboard {
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  const eventRows = events.map((event) => ({ ...event, meta: safeRecord(event.metadata) }));

  function eventsFor(funnel: LibrarySalesFunnelConfig) {
    return eventRows.filter((event) =>
      event.meta.funnelId === funnel.id ||
      event.path === `/funnel/${funnel.slug}` ||
      event.path === `/${funnel.slug}` ||
      event.path === "/property-development-guide"
    );
  }

  const funnelRows = funnels.map((funnel) => {
    const product = bySlug.get(funnel.productSlug);
    const scoped = eventsFor(funnel);
    const orderRows = orders.filter((order) => {
      const meta = safeRecord(order.metadata);
      return meta.funnelId === funnel.id || order.items.some((item) => product && item.productId === product.id);
    });
    const visitors = countEvents(scoped, ["library_funnel_page_view", "page_view"]);
    const ctaClicks = countEvents(scoped, ["library_funnel_cta_clicked", "library_cta_clicked"]);
    const checkoutStarts = countEvents(scoped, ["library_checkout_started", "library_funnel_checkout_started"]);
    const paymentStarts = countEvents(scoped, ["payment_started"]);
    const purchases = Math.max(countEvents(scoped, Array.from(PURCHASE_EVENTS)), orderRows.length);
    const revenue = orderRows.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const ctaCounts = new Map<string, number>();
    scoped.filter((event) => event.name === "library_funnel_cta_clicked").forEach((event) => {
      const cta = String(event.meta.ctaId || "unknown");
      ctaCounts.set(cta, (ctaCounts.get(cta) ?? 0) + 1);
    });
    const topCta = Array.from(ctaCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No CTA data";
    return {
      id: funnel.id,
      slug: funnel.slug,
      productSlug: funnel.productSlug,
      productTitle: product?.title ?? funnel.productSlug,
      status: funnel.status,
      version: funnel.version,
      offerStatus: currentOfferState(funnel.offer),
      visitors,
      ctaClicks,
      checkoutStarts,
      paymentStarts,
      purchases,
      revenue,
      conversionRate: rate(purchases, visitors),
      topCta,
    };
  });

  const totals = funnelRows.reduce((acc, row) => ({
    visitors: acc.visitors + row.visitors,
    ctaClicks: acc.ctaClicks + row.ctaClicks,
    checkoutStarts: acc.checkoutStarts + row.checkoutStarts,
    paymentStarts: acc.paymentStarts + row.paymentStarts,
    purchases: acc.purchases + row.purchases,
    revenue: acc.revenue + row.revenue,
    conversionRate: 0,
  }), { visitors: 0, ctaClicks: 0, checkoutStarts: 0, paymentStarts: 0, purchases: 0, revenue: 0, conversionRate: 0 });
  totals.conversionRate = rate(totals.purchases, totals.visitors);

  const ctaMap = new Map<string, { clicks: number; checkoutStarts: number; purchases: number; revenue: number }>();
  eventRows.forEach((event) => {
    const cta = String(event.meta.ctaId || "unknown");
    if (event.name !== "library_funnel_cta_clicked") return;
    const row = ctaMap.get(cta) ?? { clicks: 0, checkoutStarts: 0, purchases: 0, revenue: 0 };
    row.clicks += 1;
    ctaMap.set(cta, row);
  });
  const ctaPerformance = Array.from(ctaMap.entries()).map(([cta, row]) => ({
    cta,
    ...row,
    conversionRate: rate(row.purchases, row.clicks),
  }));

  const offerPerformance = funnels.map((funnel) => {
    const scoped = eventsFor(funnel);
    const rowOrders = orders.filter((order) => safeRecord(order.metadata).offerId === funnel.offer.id);
    const purchases = rowOrders.length;
    const revenue = rowOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const clicks = countEvents(scoped, ["library_funnel_cta_clicked"]);
    return {
      offerId: funnel.offer.id,
      views: countEvents(scoped, ["library_funnel_offer_viewed"]),
      clicks,
      checkoutStarts: countEvents(scoped, ["library_checkout_started", "library_funnel_checkout_started"]),
      purchases,
      revenue,
      conversionRate: rate(purchases, clicks),
    };
  });

  const stages = [
    { stage: "Visitors", count: totals.visitors },
    { stage: "Buy Now Clicks", count: totals.ctaClicks },
    { stage: "Checkouts", count: totals.checkoutStarts },
    { stage: "Payments", count: totals.paymentStarts },
    { stage: "Purchases", count: totals.purchases },
  ];
  const dropOff = stages.map((stage, index) => {
    const next = stages[index + 1]?.count ?? stage.count;
    const lost = Math.max(0, stage.count - next);
    return { ...stage, dropOff: lost, dropOffRate: rate(lost, stage.count) };
  });

  const productComparison = funnelRows.map((row) => ({
    product: row.productTitle,
    visitors: row.visitors,
    purchases: row.purchases,
    revenue: row.revenue,
    conversionRate: row.conversionRate,
  }));

  const campaignMap = new Map<string, { visitors: number; ctaClicks: number; checkoutStarts: number; purchases: number; revenue: number }>();
  eventRows.forEach((event) => {
    const campaign = String(event.meta.utm_campaign || event.meta.utmCampaign || "Unattributed");
    const row = campaignMap.get(campaign) ?? { visitors: 0, ctaClicks: 0, checkoutStarts: 0, purchases: 0, revenue: 0 };
    if (event.name === "library_funnel_page_view" || event.name === "page_view") row.visitors += 1;
    if (event.name === "library_funnel_cta_clicked") row.ctaClicks += 1;
    if (event.name === "library_checkout_started") row.checkoutStarts += 1;
    if (PURCHASE_EVENTS.has(event.name)) row.purchases += 1;
    campaignMap.set(campaign, row);
  });
  const campaignRows = Array.from(campaignMap.entries()).map(([campaign, row]) => ({ campaign, ...row, adSpend: null, cpa: null, roas: null }));

  return { funnels: funnelRows, totals, ctaPerformance, offerPerformance, dropOff, productComparison, campaignRows };
}

function countEvents(events: Array<{ name: string }>, names: string[]) {
  const set = new Set(names);
  return events.filter((event) => set.has(event.name)).length;
}

function normalizedFunnelEventName(event: string) {
  const raw = event.trim();
  if (raw.startsWith("library_funnel_")) return raw;
  if (raw === "library_checkout_started") return raw;
  if (raw === "payment_started" || raw === "payment_success" || raw === "payment_failed") return raw;
  if (raw === "purchase_completed") return "library_purchase_completed";
  return `library_funnel_${raw}`;
}

function rate(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}

function safeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function fallbackFunnelProduct(funnel: LibrarySalesFunnelConfig): LibraryProduct | null {
  if (funnel.productSlug !== "the-complete-guide-to-property-development-and-property-law-in-zimbabwe") return null;
  return {
    id: "property-development-law-fallback",
    slug: funnel.productSlug,
    title: "The Complete Guide to Property Development and Property Law in Zimbabwe",
    subtitle: funnel.subheadline,
    salesHeadline: funnel.headline,
    shortMarketingPitch: funnel.subheadline,
    author: "HouseLink Library",
    publisher: "HouseLink Zimbabwe",
    edition: "First edition",
    language: "English",
    publicationDate: "2026-09-10",
    sku: "HL-PDL-GUIDE",
    productType: "BUNDLE",
    status: "PUBLISHED",
    price: 15,
    compareAtPrice: 20,
    currency: "USD",
    promotionEnabled: true,
    promotionTitle: funnel.offer.title,
    promotionDescription: funnel.offer.description,
    promotionBadge: "Launch offer",
    promotionStartsAt: funnel.offer.startsAt,
    promotionEndsAt: funnel.offer.endsAt,
    promotionCountdown: funnel.offer.countdown,
    promotionStyle: "INK_EMERALD",
    rating: 0,
    reviewCount: 0,
    category: "Property Development",
    collection: "HouseLink Library",
    difficulty: "Professional",
    description: funnel.subheadline,
    shortDescription: funnel.subheadline,
    learningOutcomes: funnel.learning.map((item) => `${item.title}: ${item.description}`),
    whoThisIsFor: funnel.audience,
    requirements: [],
    tableOfContents: funnel.learning.map((item) => item.title),
    tags: ["property development", "property law", "Zimbabwe", "land due diligence"],
    seoTitle: `${funnel.finalTitle} | HouseLink Library`,
    metaDescription: funnel.subheadline,
    bundleProductIds: [],
    formats: [
      { id: "digital", type: "PDF", label: "Digital edition", enabled: true, price: 15, compareAtPrice: 20, sku: "HL-PDL-DIGITAL" },
      { id: "printed", type: "PRINTED_BOOK", label: "Printed edition", enabled: true, price: 25, compareAtPrice: 35, sku: "HL-PDL-PRINTED" },
    ],
    gallery: [],
    downloads: [],
    stock: null,
    lowStockThreshold: 0,
    featured: true,
    bestSeller: false,
    newRelease: true,
    editorsChoice: true,
    comingSoon: false,
    preorder: false,
    downloadCount: 0,
    viewCount: 0,
    publishedAt: "2026-09-10T00:00:00+02:00",
  };
}
