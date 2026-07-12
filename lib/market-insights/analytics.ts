import type { ListingIntent } from "@/lib/types";

export type ComparableListing = {
  id: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  furnished: boolean;
  parking: boolean;
  wifi: boolean;
  solarBackup: boolean;
  borehole: boolean;
  createdAt: Date;
  views: number;
  enquiries: number;
  favourites: number;
  matchScore: number;
};

export type MarketAnalyticsInput = {
  city: string;
  suburb: string;
  propertyType: string;
  intent: ListingIntent;
  listingId?: string;
  listingPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  furnished?: boolean;
  parking?: boolean;
  wifi?: boolean;
  solarBackup?: boolean;
  borehole?: boolean;
  createdAt?: Date;
};

export type MarketAnalyticsResult = {
  sampleSize: number;
  strongMatches: number;
  medianPrice: number;
  averagePrice: number;
  recommendedPriceMin: number;
  recommendedPriceMax: number;
  demandScore: number;
  vacancyRisk: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  confidenceScore: number;
  dataQuality: "high" | "moderate" | "limited";
  priceTrend: Array<{ period: string; medianPrice: number; sampleSize: number }>;
  comparableListingIds: string[];
  listingPrice?: number;
  priceVsMedianPct?: number;
  priceAssessment?: "below_market" | "fair" | "above_market";
  priceLabel: string;
  suburbEnquiryRate: number;
  avgDaysOnMarket: number;
};

export function scoreComparable(
  listing: Omit<ComparableListing, "matchScore" | "enquiries" | "favourites"> & {
    enquiries: number;
    favourites: number;
  },
  source: Required<Pick<MarketAnalyticsInput, "bedrooms" | "bathrooms" | "furnished" | "parking" | "wifi" | "solarBackup" | "borehole">> & {
    listingPrice?: number;
  },
) {
  let score =
    100 -
    Math.abs(listing.bedrooms - source.bedrooms) * 9 -
    Math.abs(listing.bathrooms - source.bathrooms) * 7 -
    (listing.furnished === source.furnished ? 0 : 4) -
    (listing.parking === source.parking ? 0 : 3) -
    (listing.wifi === source.wifi ? 0 : 3) -
    (listing.solarBackup === source.solarBackup ? 0 : 4) -
    (listing.borehole === source.borehole ? 0 : 4);

  if (source.listingPrice && listing.price > 0) {
    const delta = Math.abs(listing.price - source.listingPrice) / source.listingPrice;
    score -= Math.min(25, Math.round(delta * 40));
  }

  const ageDays = Math.max(0, (Date.now() - listing.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  if (ageDays <= 45) score += 4;
  else if (ageDays > 180) score -= 4;

  return Math.max(0, Math.min(100, score));
}

export function buildMarketAnalytics(
  comparables: ComparableListing[],
  input: MarketAnalyticsInput,
): MarketAnalyticsResult {
  const prices = comparables.map((item) => item.price).filter((price) => price > 0).sort((a, b) => a - b);
  const strongMatches = comparables.filter((item) => item.matchScore >= 70).length;
  const median = prices.length ? percentile(prices, 50) : input.listingPrice ?? 0;
  const average = prices.length ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : median;
  const spread = prices.length > 1 ? coefficientOfVariation(prices) : 0;

  const recommendedPriceMin = prices.length >= 4 ? Math.round(percentile(prices, 25)) : Math.round(median * 0.92);
  const recommendedPriceMax = prices.length >= 4 ? Math.round(percentile(prices, 75)) : Math.round(median * 1.08);

  const engagementPerListing =
    comparables.reduce((sum, item) => sum + item.views + item.enquiries * 14 + item.favourites * 6, 0) /
    Math.max(1, comparables.length);
  const enquiryRate =
    comparables.reduce((sum, item) => sum + item.enquiries, 0) / Math.max(1, comparables.length);
  const demandScore = clamp(
    Math.round(enquiryRate * 22 + Math.min(engagementPerListing / 6, 40) + Math.min(comparables.length * 2, 18)),
    12,
    96,
  );

  const vacancyRisk = demandScore >= 68 ? "LOW" : demandScore >= 42 ? "MEDIUM" : "HIGH";

  let confidenceScore = 0;
  if (comparables.length >= 10) confidenceScore += 34;
  else if (comparables.length >= 6) confidenceScore += 28;
  else if (comparables.length >= 3) confidenceScore += 20;
  else confidenceScore += 8;

  const avgMatch = comparables.length
    ? comparables.reduce((sum, item) => sum + item.matchScore, 0) / comparables.length
    : 0;
  confidenceScore += Math.round(avgMatch * 0.28);
  confidenceScore -= Math.round(spread * 45);
  if (strongMatches >= 3) confidenceScore += 10;
  if (comparables.length < 3) confidenceScore = Math.min(confidenceScore, 34);
  confidenceScore = clamp(confidenceScore, 12, 96);

  const dataQuality: MarketAnalyticsResult["dataQuality"] =
    confidenceScore >= 70 && comparables.length >= 6
      ? "high"
      : confidenceScore >= 45 && comparables.length >= 3
        ? "moderate"
        : "limited";

  const listingPrice = input.listingPrice;
  let priceVsMedianPct: number | undefined;
  let priceAssessment: MarketAnalyticsResult["priceAssessment"];
  if (listingPrice && median > 0) {
    priceVsMedianPct = Math.round(((listingPrice - median) / median) * 100);
    if (priceVsMedianPct <= -8) priceAssessment = "below_market";
    else if (priceVsMedianPct >= 8) priceAssessment = "above_market";
    else priceAssessment = "fair";
  }

  const priceLabel =
    input.propertyType === "holiday_home"
      ? "Median nightly rate"
      : input.intent === "buy"
        ? "Median asking price"
        : "Median rent";

  const avgDaysOnMarket = comparables.length
    ? Math.round(
        comparables.reduce((sum, item) => sum + Math.max(1, (Date.now() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24)), 0) /
          comparables.length,
      )
    : 0;

  return {
    sampleSize: comparables.length,
    strongMatches,
    medianPrice: median,
    averagePrice: average,
    recommendedPriceMin,
    recommendedPriceMax,
    demandScore,
    vacancyRisk,
    confidenceScore,
    dataQuality,
    priceTrend: buildPriceTrend(comparables),
    comparableListingIds: comparables.slice(0, 8).map((item) => item.id),
    listingPrice,
    priceVsMedianPct,
    priceAssessment,
    priceLabel,
    suburbEnquiryRate: Number(enquiryRate.toFixed(2)),
    avgDaysOnMarket,
  };
}

function buildPriceTrend(comparables: Array<{ createdAt: Date; price: number }>) {
  const buckets = new Map<string, number[]>();
  for (const listing of comparables) {
    const period = `${listing.createdAt.getUTCFullYear()}-${String(listing.createdAt.getUTCMonth() + 1).padStart(2, "0")}`;
    const values = buckets.get(period) ?? [];
    values.push(listing.price);
    buckets.set(period, values);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([period, values]) => ({
      period,
      medianPrice: percentile(values.sort((a, b) => a - b), 50),
      sampleSize: values.length,
    }));
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const index = Math.min(values.length - 1, Math.max(0, Math.floor((p / 100) * values.length)));
  return values[index] ?? 0;
}

function coefficientOfVariation(values: number[]) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (!mean) return 0;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
