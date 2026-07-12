import type { Prisma } from "@prisma/client";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import {
  buildMarketAnalytics,
  scoreComparable,
  type ComparableListing,
} from "@/lib/market-insights/analytics";
import { generateMarketInsightNarrative, INSIGHT_ENGINE_VERSION } from "@/lib/market-insights/ai-narrative";
import type { ListingIntent, MarketInsight } from "@/lib/types";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export function shouldUsePostgresMarketInsights() {
  return isPostgresStoreEnabled();
}

export async function computeMarketInsight(input: {
  city?: string;
  suburb?: string;
  propertyType?: string;
  intent?: "rent" | "buy";
  listingId?: string;
  forceRefresh?: boolean;
}) {
  const prisma = getMainPrisma();
  const sourceListing = input.listingId
    ? await prisma.listing.findUnique({
        where: { id: input.listingId },
        select: {
          id: true,
          title: true,
          city: true,
          suburb: true,
          propertyType: true,
          intent: true,
          price: true,
          bedrooms: true,
          bathrooms: true,
          furnished: true,
          parking: true,
          wifi: true,
          solarBackup: true,
          borehole: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    : null;

  if (input.listingId && sourceListing && !input.forceRefresh) {
    const cached = await getCachedInsight(input.listingId, sourceListing.updatedAt);
    if (cached) return cached;
  }

  const city = input.city ?? sourceListing?.city ?? "Harare";
  const suburb = input.suburb ?? sourceListing?.suburb ?? "CBD";
  const propertyType = String(input.propertyType ?? sourceListing?.propertyType ?? "ROOM").toLowerCase();
  const intent = (input.intent ?? sourceListing?.intent.toLowerCase() ?? "rent") as ListingIntent;
  const sourcePrice = sourceListing ? Number(sourceListing.price) : undefined;

  let comparableScope: "suburb" | "city" | "regional" = "suburb";
  let listings = await fetchComparableListings(prisma, {
    scope: "suburb",
    city,
    suburb,
    propertyType,
    intent,
    sourceListingId: sourceListing?.id,
    sourcePrice,
  });

  if (!listings.length) {
    comparableScope = "city";
    listings = await fetchComparableListings(prisma, {
      scope: "city",
      city,
      propertyType,
      intent,
      sourceListingId: sourceListing?.id,
      sourcePrice,
    });
  }

  if (!listings.length) {
    comparableScope = "city";
    listings = await fetchComparableListings(prisma, {
      scope: "city",
      city,
      propertyType,
      intent,
      sourceListingId: sourceListing?.id,
      sourcePrice,
      relaxPriceBand: true,
    });
  }

  if (!listings.length) {
    comparableScope = "regional";
    listings = await fetchComparableListings(prisma, {
      scope: "regional",
      propertyType,
      intent,
      sourceListingId: sourceListing?.id,
      sourcePrice,
    });
  }

  const sourceProfile = {
    bedrooms: sourceListing?.bedrooms ?? 0,
    bathrooms: sourceListing?.bathrooms ?? 0,
    furnished: sourceListing?.furnished ?? false,
    parking: sourceListing?.parking ?? false,
    wifi: sourceListing?.wifi ?? false,
    solarBackup: sourceListing?.solarBackup ?? false,
    borehole: sourceListing?.borehole ?? false,
    listingPrice: sourcePrice,
  };

  const scored: ComparableListing[] = listings
    .map((listing) => {
      const comparable = {
        id: listing.id,
        price: Number(listing.price),
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        furnished: listing.furnished,
        parking: listing.parking,
        wifi: listing.wifi,
        solarBackup: listing.solarBackup,
        borehole: listing.borehole,
        createdAt: listing.createdAt,
        views: listing.views,
        enquiries: listing._count.enquiries,
        favourites: listing._count.favourites,
        matchScore: 0,
      };
      return {
        ...comparable,
        matchScore: sourceListing ? scoreComparable(comparable, sourceProfile) : 80,
      };
    })
    .filter((listing) => listing.price > 0)
    .sort((a, b) => b.matchScore - a.matchScore);

  const comparables =
    sourceListing && scored.filter((item) => item.matchScore >= 62).length >= 3
      ? scored.filter((item) => item.matchScore >= 62).slice(0, 40)
      : scored.slice(0, 40);

  const analytics = buildMarketAnalytics(comparables, {
    city,
    suburb,
    propertyType,
    intent,
    listingId: input.listingId,
    listingPrice: sourcePrice,
    bedrooms: sourceListing?.bedrooms,
    bathrooms: sourceListing?.bathrooms,
    furnished: sourceListing?.furnished,
    parking: sourceListing?.parking,
    wifi: sourceListing?.wifi,
    solarBackup: sourceListing?.solarBackup,
    borehole: sourceListing?.borehole,
    createdAt: sourceListing?.createdAt,
    comparableScope,
  });

  const narrative = await generateMarketInsightNarrative({
    ...analytics,
    city,
    suburb,
    propertyType,
    intent,
    listingTitle: sourceListing?.title,
  });

  const insight: MarketInsight = {
    city,
    suburb,
    propertyType,
    intent,
    listingId: input.listingId,
    sampleSize: analytics.sampleSize,
    strongMatches: analytics.strongMatches,
    medianPrice: analytics.medianPrice,
    averagePrice: analytics.averagePrice,
    recommendedPriceMin: analytics.recommendedPriceMin,
    recommendedPriceMax: analytics.recommendedPriceMax,
    demandScore: analytics.demandScore,
    vacancyRisk: analytics.vacancyRisk,
    confidenceScore: analytics.confidenceScore,
    dataQuality: analytics.dataQuality,
    priceTrend: analytics.priceTrend,
    comparableListingIds: analytics.comparableListingIds,
    listingPrice: analytics.listingPrice,
    priceVsMedianPct: analytics.priceVsMedianPct,
    priceAssessment: analytics.priceAssessment,
    priceLabel: analytics.priceLabel,
    suburbEnquiryRate: analytics.suburbEnquiryRate,
    avgDaysOnMarket: analytics.avgDaysOnMarket,
    comparableScope: analytics.comparableScope,
    summary: narrative.summary,
    notes: narrative.notes,
    aiGenerated: narrative.aiGenerated,
  };

  const saved = await prisma.marketInsightSnapshot.create({
    data: {
      city,
      suburb,
      propertyType,
      intent,
      listingId: input.listingId,
      sampleSize: insight.sampleSize,
      medianPrice: insight.medianPrice,
      averagePrice: insight.averagePrice,
      recommendedPriceMin: insight.recommendedPriceMin,
      recommendedPriceMax: insight.recommendedPriceMax,
      demandScore: insight.demandScore,
      vacancyRisk: insight.vacancyRisk,
      comparableListingIds: insight.comparableListingIds,
      payload: {
        insightVersion: INSIGHT_ENGINE_VERSION,
        notes: insight.notes,
        confidenceScore: insight.confidenceScore,
        priceTrend: insight.priceTrend,
        summary: insight.summary,
        aiGenerated: insight.aiGenerated,
        dataQuality: insight.dataQuality,
        strongMatches: insight.strongMatches,
        listingPrice: insight.listingPrice,
        priceVsMedianPct: insight.priceVsMedianPct,
        priceAssessment: insight.priceAssessment,
        priceLabel: insight.priceLabel,
        suburbEnquiryRate: insight.suburbEnquiryRate,
        avgDaysOnMarket: insight.avgDaysOnMarket,
        comparableScope: insight.comparableScope,
        listingUpdatedAt: sourceListing?.updatedAt.toISOString(),
      } as Prisma.InputJsonObject,
    },
  });

  return { ...insight, id: saved.id, createdAt: saved.createdAt.toISOString() };
}

export async function latestMarketInsights(limit = 20) {
  const rows = await getMainPrisma().marketInsightSnapshot.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  return rows.map((row) => snapshotToInsight(row));
}

async function getCachedInsight(listingId: string, listingUpdatedAt: Date) {
  const row = await getMainPrisma().marketInsightSnapshot.findFirst({
    where: {
      listingId,
      createdAt: { gte: new Date(Date.now() - CACHE_TTL_MS) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return null;
  const payload = (row.payload ?? {}) as { listingUpdatedAt?: string; insightVersion?: number };
  if (payload.insightVersion !== INSIGHT_ENGINE_VERSION) return null;
  if (payload.listingUpdatedAt && payload.listingUpdatedAt !== listingUpdatedAt.toISOString()) return null;
  return snapshotToInsight(row);
}

async function fetchComparableListings(
  prisma: ReturnType<typeof getMainPrisma>,
  input: {
    scope: "suburb" | "city" | "regional";
    city?: string;
    suburb?: string;
    propertyType: string;
    intent: ListingIntent;
    sourceListingId?: string;
    sourcePrice?: number;
    relaxPriceBand?: boolean;
  },
) {
  const priceBand =
    input.sourcePrice && !input.relaxPriceBand
      ? {
          gte: Math.max(
            1,
            Math.round(input.sourcePrice * (input.scope === "regional" ? 0.45 : 0.55)),
          ),
          lte: Math.round(input.sourcePrice * (input.scope === "regional" ? 2.2 : 1.65)),
        }
      : input.sourcePrice && input.relaxPriceBand
        ? {
            gte: Math.max(1, Math.round(input.sourcePrice * 0.35)),
            lte: Math.round(input.sourcePrice * 2.5),
          }
        : undefined;

  return prisma.listing.findMany({
    where: {
      ...(input.scope !== "regional" && input.city
        ? { city: { equals: input.city, mode: "insensitive" } }
        : {}),
      ...(input.scope === "suburb" && input.suburb ? { suburb: { equals: input.suburb, mode: "insensitive" } } : {}),
      propertyType: input.propertyType.toUpperCase() as never,
      intent: input.intent.toUpperCase() as never,
      status: {
        in:
          input.intent === "buy"
            ? (["ACTIVE", "VIEWING_IN_PROGRESS", "SOLD"] as never)
            : (["ACTIVE", "VIEWING_IN_PROGRESS", "RENTED"] as never),
      },
      ...(input.sourceListingId ? { id: { not: input.sourceListingId } } : {}),
      ...(priceBand ? { price: priceBand } : {}),
    },
    select: {
      id: true,
      price: true,
      bedrooms: true,
      bathrooms: true,
      furnished: true,
      parking: true,
      wifi: true,
      solarBackup: true,
      borehole: true,
      createdAt: true,
      views: true,
      _count: { select: { enquiries: true, favourites: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 120,
  });
}

function snapshotToInsight(row: {
  id: string;
  city: string;
  suburb: string;
  propertyType: string;
  intent: string;
  listingId: string | null;
  sampleSize: number;
  medianPrice: Prisma.Decimal;
  averagePrice: Prisma.Decimal;
  recommendedPriceMin: Prisma.Decimal;
  recommendedPriceMax: Prisma.Decimal;
  demandScore: number;
  vacancyRisk: string;
  comparableListingIds: string[];
  payload: Prisma.JsonValue;
  createdAt: Date;
}): MarketInsight {
  const payload = (row.payload ?? {}) as {
    notes?: string[];
    confidenceScore?: number;
    priceTrend?: MarketInsight["priceTrend"];
    summary?: string;
    aiGenerated?: boolean;
    dataQuality?: MarketInsight["dataQuality"];
    strongMatches?: number;
    listingPrice?: number;
    priceVsMedianPct?: number;
    priceAssessment?: MarketInsight["priceAssessment"];
    priceLabel?: string;
    suburbEnquiryRate?: number;
    avgDaysOnMarket?: number;
    comparableScope?: MarketInsight["comparableScope"];
  };

  return {
    id: row.id,
    city: row.city,
    suburb: row.suburb,
    propertyType: row.propertyType,
    intent: row.intent as ListingIntent,
    listingId: row.listingId ?? undefined,
    sampleSize: row.sampleSize,
    strongMatches: payload.strongMatches ?? 0,
    medianPrice: Number(row.medianPrice),
    averagePrice: Number(row.averagePrice),
    recommendedPriceMin: Number(row.recommendedPriceMin),
    recommendedPriceMax: Number(row.recommendedPriceMax),
    demandScore: row.demandScore,
    vacancyRisk: row.vacancyRisk as MarketInsight["vacancyRisk"],
    confidenceScore: payload.confidenceScore ?? 0,
    dataQuality: payload.dataQuality ?? "limited",
    priceTrend: payload.priceTrend ?? [],
    comparableListingIds: row.comparableListingIds,
    listingPrice: payload.listingPrice,
    priceVsMedianPct: payload.priceVsMedianPct,
    priceAssessment: payload.priceAssessment,
    priceLabel: payload.priceLabel ?? "Median rent",
    suburbEnquiryRate: payload.suburbEnquiryRate,
    avgDaysOnMarket: payload.avgDaysOnMarket,
    comparableScope: payload.comparableScope,
    summary: payload.summary,
    notes: payload.notes ?? [],
    aiGenerated: payload.aiGenerated ?? false,
    createdAt: row.createdAt.toISOString(),
  };
}
