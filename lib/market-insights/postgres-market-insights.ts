import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import type { MarketInsight } from "@/lib/types";

export function shouldUsePostgresMarketInsights() {
  return isPostgresStoreEnabled();
}

export async function computeMarketInsight(input: {
  city?: string;
  suburb?: string;
  propertyType?: string;
  intent?: "rent" | "buy";
  listingId?: string;
}) {
  const prisma = getMainPrisma();
  const sourceListing = input.listingId
    ? await prisma.listing.findUnique({ where: { id: input.listingId } })
    : null;
  const city = input.city ?? sourceListing?.city ?? "Harare";
  const suburb = input.suburb ?? sourceListing?.suburb ?? "CBD";
  const propertyType = input.propertyType ?? sourceListing?.propertyType ?? "ROOM";
  const intent = input.intent ?? (sourceListing?.intent.toLowerCase() as "rent" | "buy" | undefined) ?? "rent";
  const listings = await prisma.listing.findMany({
    where: {
      city: { equals: city, mode: "insensitive" },
      suburb: { equals: suburb, mode: "insensitive" },
      propertyType: propertyType as never,
      status: { in: ["ACTIVE", "VIEWING_IN_PROGRESS", "RENTED", "SOLD"] as never },
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
    take: 100,
  });
  const matched = sourceListing
    ? listings
        .map((listing) => ({
          listing,
          score:
            100 -
            Math.abs(listing.bedrooms - sourceListing.bedrooms) * 10 -
            Math.abs(listing.bathrooms - sourceListing.bathrooms) * 8 -
            (listing.furnished === sourceListing.furnished ? 0 : 5) -
            (listing.parking === sourceListing.parking ? 0 : 4) -
            (listing.wifi === sourceListing.wifi ? 0 : 4) -
            (listing.solarBackup === sourceListing.solarBackup ? 0 : 5) -
            (listing.borehole === sourceListing.borehole ? 0 : 5),
        }))
        .filter((item) => item.score >= 60)
        .map((item) => item.listing)
    : listings;
  const comparableSet = matched.length >= 3 ? matched : listings;
  const prices = comparableSet.map((listing) => Number(listing.price)).filter((price) => price > 0).sort((a, b) => a - b);
  const median = prices.length ? prices[Math.floor(prices.length / 2)] : Number(sourceListing?.price ?? 0);
  const average = prices.length ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : median;
  const engagement = comparableSet.reduce((sum, item) => sum + item.views + item._count.enquiries * 12 + item._count.favourites * 5, 0);
  const demandScore = Math.max(15, Math.min(98, Math.round(engagement / Math.max(1, comparableSet.length) / 4)));
  const vacancyRisk = demandScore >= 70 ? "LOW" : demandScore >= 40 ? "MEDIUM" : "HIGH";
  const confidenceScore = Math.min(96, Math.max(25, comparableSet.length * 12 + (matched.length >= 3 ? 18 : 0)));
  const priceTrend = buildPriceTrend(comparableSet);
  const insight: MarketInsight = {
    city,
    suburb,
    propertyType: String(propertyType).toLowerCase(),
    intent,
    listingId: input.listingId,
    sampleSize: comparableSet.length,
    medianPrice: median,
    averagePrice: average,
    recommendedPriceMin: Math.round(median * 0.92),
    recommendedPriceMax: Math.round(median * 1.08),
    demandScore,
    vacancyRisk,
    confidenceScore,
    priceTrend,
    comparableListingIds: comparableSet.slice(0, 6).map((listing) => listing.id),
    notes: [
      comparableSet.length < 3 ? "Low sample size: treat this as directional until more comparable listings are active." : "Comparable matching considers location, type, bedrooms, bathrooms, and key amenities.",
      `Confidence score: ${confidenceScore}/100.`,
      demandScore >= 70 ? "Demand is strong in this pocket; well-priced listings should move quickly." : "Demand is moderate; sharper pricing and better media may improve conversion.",
      `Recommended rent band: US$${Math.round(median * 0.92)} - US$${Math.round(median * 1.08)}.`,
    ],
  };
  const saved = await prisma.marketInsightSnapshot.create({
    data: {
      city,
      suburb,
      propertyType: String(propertyType).toLowerCase(),
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
      payload: { notes: insight.notes, confidenceScore, priceTrend },
    },
  });
  return { ...insight, id: saved.id, createdAt: saved.createdAt.toISOString() };
}

export async function latestMarketInsights(limit = 20) {
  const rows = await getMainPrisma().marketInsightSnapshot.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  return rows.map((row) => ({
    id: row.id,
    city: row.city,
    suburb: row.suburb,
    propertyType: row.propertyType,
    intent: row.intent as "rent" | "buy",
    listingId: row.listingId ?? undefined,
    sampleSize: row.sampleSize,
    medianPrice: Number(row.medianPrice),
    averagePrice: Number(row.averagePrice),
    recommendedPriceMin: Number(row.recommendedPriceMin),
    recommendedPriceMax: Number(row.recommendedPriceMax),
    demandScore: row.demandScore,
    vacancyRisk: row.vacancyRisk as MarketInsight["vacancyRisk"],
    comparableListingIds: row.comparableListingIds,
    confidenceScore: Number((row.payload as { confidenceScore?: number } | null)?.confidenceScore ?? 0),
    priceTrend: Array.isArray((row.payload as { priceTrend?: unknown } | null)?.priceTrend)
      ? (row.payload as { priceTrend: MarketInsight["priceTrend"] }).priceTrend
      : [],
    notes: Array.isArray((row.payload as { notes?: unknown } | null)?.notes) ? ((row.payload as { notes: string[] }).notes) : [],
    createdAt: row.createdAt.toISOString(),
  }));
}

function buildPriceTrend(listings: Array<{ createdAt: Date; price: unknown }>) {
  const buckets = new Map<string, number[]>();
  for (const listing of listings) {
    const date = listing.createdAt;
    const period = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const values = buckets.get(period) ?? [];
    values.push(Number(listing.price));
    buckets.set(period, values);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([period, values]) => ({
      period,
      medianPrice: values.sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0,
      sampleSize: values.length,
    }));
}
