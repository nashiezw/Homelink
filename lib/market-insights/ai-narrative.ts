import { getHydratedRuntimePlatformSettings } from "@/lib/settings/runtime";
import type { MarketAnalyticsResult } from "@/lib/market-insights/analytics";

export const INSIGHT_ENGINE_VERSION = 2;

export type InsightNarrativeContext = MarketAnalyticsResult & {
  city: string;
  suburb: string;
  propertyType: string;
  intent: "rent" | "buy";
  listingTitle?: string;
};

export type InsightNarrative = {
  summary: string;
  notes: string[];
  aiGenerated: boolean;
};

export async function generateMarketInsightNarrative(context: InsightNarrativeContext): Promise<InsightNarrative> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.HOMELINK_OPENAI_API_KEY;
  if (apiKey) {
    const llm = await tryLlmNarrative(apiKey, context);
    if (llm) return llm;
  }
  return buildDeterministicNarrative(context);
}

async function tryLlmNarrative(apiKey: string, context: InsightNarrativeContext): Promise<InsightNarrative | null> {
  let model = process.env.OPENAI_MODEL || process.env.HOMELINK_AI_MODEL || "gpt-4o-mini";
  let maxTokens = 900;
  try {
    const settings = await getHydratedRuntimePlatformSettings();
    model = settings.ai.modelName || model;
    maxTokens = Math.min(settings.ai.maxTokens ?? maxTokens, maxTokens);
  } catch {
    // Use env defaults when platform settings are unavailable in serverless runtime.
  }

  const payload = {
    market: {
      city: context.city,
      suburb: context.suburb,
      propertyType: context.propertyType,
      intent: context.intent,
      listingTitle: context.listingTitle,
    },
    metrics: {
      sampleSize: context.sampleSize,
      strongMatches: context.strongMatches,
      medianPrice: context.medianPrice,
      recommendedBand: [context.recommendedPriceMin, context.recommendedPriceMax],
      demandScore: context.demandScore,
      confidenceScore: context.confidenceScore,
      vacancyRisk: context.vacancyRisk,
      dataQuality: context.dataQuality,
      listingPrice: context.listingPrice,
      priceVsMedianPct: context.priceVsMedianPct,
      priceAssessment: context.priceAssessment,
      suburbEnquiryRate: context.suburbEnquiryRate,
      avgDaysOnMarket: context.avgDaysOnMarket,
    },
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: 0.35,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are HomeLink Zimbabwe's property market analyst. Use only the JSON facts provided. Be concise, practical, and honest about low confidence or limited sample size. Never invent comparables or prices. Return JSON: {\"summary\":\"one sentence\",\"notes\":[\"bullet 1\",\"bullet 2\",\"bullet 3\"]}. Max 4 notes. USD only.",
          },
          {
            role: "user",
            content: JSON.stringify(payload),
          },
        ],
      }),
    });
    clearTimeout(timeout);

    if (!response.ok) return null;
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as { summary?: string; notes?: string[] };
    if (!parsed.summary || !Array.isArray(parsed.notes) || !parsed.notes.length) return null;
    return {
      summary: parsed.summary.trim(),
      notes: parsed.notes.map((note) => note.trim()).filter(Boolean).slice(0, 4),
      aiGenerated: true,
    };
  } catch {
    return null;
  }
}

export function buildDeterministicNarrative(context: InsightNarrativeContext): InsightNarrative {
  const notes: string[] = [];

  if (context.dataQuality === "limited" || context.sampleSize < 3) {
    notes.push("Limited comparable activity in this pocket — treat this as directional guidance until more similar listings are live on HomeLink.");
  } else if (context.dataQuality === "high") {
    notes.push(`Strong comparable set (${context.sampleSize} listings, ${context.strongMatches} close matches) supports this estimate.`);
  } else {
    notes.push(`Moderate evidence base from ${context.sampleSize} comparable listings in ${context.suburb}, ${context.city}.`);
  }

  if (context.listingPrice && context.priceVsMedianPct !== undefined) {
    if (context.priceAssessment === "below_market") {
      notes.push(`This listing is priced about ${Math.abs(context.priceVsMedianPct)}% below the local median — it should attract strong enquiry if photos and availability are clear.`);
    } else if (context.priceAssessment === "above_market") {
      notes.push(`This listing sits about ${context.priceVsMedianPct}% above the local median — sharper pricing or stronger media may be needed to improve conversion.`);
    } else {
      notes.push("Current pricing is broadly in line with the local median for similar properties.");
    }
  } else {
    notes.push(`Recommended band: US$${context.recommendedPriceMin.toLocaleString()} – US$${context.recommendedPriceMax.toLocaleString()}.`);
  }

  if (context.demandScore >= 68) {
    notes.push("Demand signals in this suburb are healthy — well-presented listings are moving with steady enquiry.");
  } else if (context.demandScore >= 42) {
    notes.push("Demand is moderate — professional photos, virtual tour, and prompt agent follow-up can improve viewing conversion.");
  } else {
    notes.push("Demand looks soft in this pocket — consider competitive pricing, featured placement, and faster agent response.");
  }

  notes.push(`Confidence ${context.confidenceScore}/100 based on sample depth, match quality, and price consistency.`);

  const summary =
    context.listingPrice && context.priceAssessment
      ? context.priceAssessment === "fair"
        ? `Pricing looks market-aligned in ${context.suburb} with ${context.confidenceScore}/100 confidence.`
        : context.priceAssessment === "below_market"
          ? `Competitively priced for ${context.suburb}; demand score ${context.demandScore}/100.`
          : `Premium-priced versus local median in ${context.suburb}; demand score ${context.demandScore}/100.`
      : `HomeLink estimates ${context.suburb} ${context.intent === "buy" ? "sale" : "rental"} pricing from ${context.sampleSize} comparable listings.`;

  return { summary, notes: notes.slice(0, 4), aiGenerated: false };
}
