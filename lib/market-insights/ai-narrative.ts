import { getHydratedRuntimePlatformSettings } from "@/lib/settings/runtime";
import type { MarketAnalyticsResult } from "@/lib/market-insights/analytics";

export const INSIGHT_ENGINE_VERSION = 4;

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
  const keySource = process.env.OPENAI_API_KEY
    ? "OPENAI_API_KEY"
    : process.env.HOMELINK_OPENAI_API_KEY
      ? "HOMELINK_OPENAI_API_KEY"
      : null;
  const apiKey = process.env.OPENAI_API_KEY || process.env.HOMELINK_OPENAI_API_KEY;

  if (!apiKey) {
    logLlmEvent("fallback", {
      reason: "missing_api_key",
      message: "No OPENAI_API_KEY or HOMELINK_OPENAI_API_KEY in server environment.",
      suburb: context.suburb,
      city: context.city,
    });
    return buildDeterministicNarrative(context);
  }

  const llm = await tryLlmNarrative(apiKey, keySource!, context);
  if (llm) return llm;

  logLlmEvent("fallback", {
    reason: "llm_unavailable",
    message: "OpenAI call failed or returned invalid output — using analytics summary.",
    keySource,
    suburb: context.suburb,
    city: context.city,
  });
  return buildDeterministicNarrative(context);
}

type OpenAiErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: string | null;
  };
};

function logLlmEvent(
  level: "success" | "fallback" | "error",
  details: Record<string, string | number | boolean | null | undefined>,
) {
  const payload = { scope: "market-insights:llm", ...details };
  if (level === "error") {
    console.error("[market-insights:llm]", payload);
    return;
  }
  console.warn("[market-insights:llm]", payload);
}

function classifyOpenAiFailure(status: number, body: OpenAiErrorBody) {
  const type = body.error?.type ?? "";
  const code = body.error?.code ?? "";
  const message = body.error?.message ?? "Unknown OpenAI error";

  if (status === 401 || type === "invalid_api_key" || code === "invalid_api_key") {
    return { reason: "invalid_api_key", message: "API key rejected by OpenAI. Check the key value and redeploy." };
  }
  if (
    status === 402 ||
    status === 429 && (type === "insufficient_quota" || code === "insufficient_quota" || /quota|billing|credit/i.test(message))
  ) {
    return {
      reason: "insufficient_quota",
      message: "OpenAI quota or billing issue. Add payment method or credits in the OpenAI dashboard.",
    };
  }
  if (status === 429 || type === "rate_limit_exceeded" || code === "rate_limit_exceeded") {
    return { reason: "rate_limited", message: "OpenAI rate limit hit. Retry later or reduce request volume." };
  }
  if (status === 403) {
    return { reason: "forbidden", message: "OpenAI rejected the request (403). Check project access and model permissions." };
  }
  if (status === 404) {
    return { reason: "model_not_found", message: "Configured OpenAI model was not found for this API key." };
  }
  return { reason: "openai_http_error", message };
}

async function tryLlmNarrative(
  apiKey: string,
  keySource: string,
  context: InsightNarrativeContext,
): Promise<InsightNarrative | null> {
  let model = process.env.OPENAI_MODEL || process.env.HOMELINK_AI_MODEL || "gpt-4o-mini";
  let maxTokens = 900;
  try {
    const settings = await getHydratedRuntimePlatformSettings();
    model = settings.ai.modelName || model;
    maxTokens = Math.min(settings.ai.maxTokens ?? maxTokens, maxTokens);
  } catch {
    // Use env defaults when platform settings are unavailable in serverless runtime.
    logLlmEvent("fallback", {
      reason: "settings_unavailable",
      message: "Platform AI settings unavailable — using env model defaults.",
      keySource,
    });
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

    if (!response.ok) {
      let body: OpenAiErrorBody = {};
      try {
        body = (await response.json()) as OpenAiErrorBody;
      } catch {
        body = {};
      }
      const failure = classifyOpenAiFailure(response.status, body);
      logLlmEvent("error", {
        reason: failure.reason,
        message: failure.message,
        httpStatus: response.status,
        openAiType: body.error?.type,
        openAiCode: body.error?.code,
        model,
        keySource,
        suburb: context.suburb,
        city: context.city,
      });
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      logLlmEvent("error", {
        reason: "empty_response",
        message: "OpenAI returned no message content.",
        model,
        keySource,
      });
      return null;
    }

    let parsed: { summary?: string; notes?: string[] };
    try {
      parsed = JSON.parse(content) as { summary?: string; notes?: string[] };
    } catch {
      logLlmEvent("error", {
        reason: "invalid_json",
        message: "OpenAI response was not valid JSON.",
        model,
        keySource,
      });
      return null;
    }

    if (!parsed.summary || !Array.isArray(parsed.notes) || !parsed.notes.length) {
      logLlmEvent("error", {
        reason: "invalid_shape",
        message: "OpenAI JSON missing summary or notes.",
        model,
        keySource,
      });
      return null;
    }

    logLlmEvent("success", {
      reason: "ok",
      message: "LLM summary generated.",
      model,
      keySource,
      suburb: context.suburb,
      city: context.city,
    });

    return {
      summary: parsed.summary.trim(),
      notes: parsed.notes.map((note) => note.trim()).filter(Boolean).slice(0, 4),
      aiGenerated: true,
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    logLlmEvent("error", {
      reason: aborted ? "timeout" : "network_error",
      message: aborted
        ? "OpenAI request timed out after 12s."
        : error instanceof Error
          ? error.message
          : "Unknown network error calling OpenAI.",
      model,
      keySource,
      suburb: context.suburb,
      city: context.city,
    });
    return null;
  }
}

export function buildDeterministicNarrative(context: InsightNarrativeContext): InsightNarrative {
  const notes: string[] = [];

  if (context.sampleSize === 0) {
    notes.push("No comparable listings in this area yet — median and band will populate once similar properties are listed on HomeLink.");
  } else if (context.comparableScope === "regional") {
    notes.push(
      `Limited local data in ${context.suburb} — benchmarking against ${context.sampleSize} similar ${context.intent === "buy" ? "sale" : "rental"} listing${context.sampleSize === 1 ? "" : "s"} across HomeLink.`,
    );
  } else if (context.dataQuality === "limited" || context.sampleSize < 3) {
    notes.push(
      context.comparableScope === "city"
        ? `Limited suburb-level data — using ${context.sampleSize} comparable listing${context.sampleSize === 1 ? "" : "s"} across ${context.city} until more appear in ${context.suburb}.`
        : "Limited comparable activity in this pocket — treat this as directional guidance until more similar listings are live on HomeLink.",
    );
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
  } else if (context.sampleSize > 0) {
    notes.push(`Recommended band: US$${context.recommendedPriceMin.toLocaleString()} – US$${context.recommendedPriceMax.toLocaleString()}.`);
  } else if (context.listingPrice) {
    notes.push(
      `Listed at US$${context.listingPrice.toLocaleString()} — local market band will appear once comparable ${context.intent === "buy" ? "sales" : "rentals"} are active in ${context.city}.`,
    );
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
    context.sampleSize === 0
      ? `Not enough comparable listings in ${context.suburb} yet to estimate market pricing.`
      : context.comparableScope === "regional"
        ? `Regional benchmark from ${context.sampleSize} similar listings — limited local data in ${context.suburb}.`
        : context.listingPrice && context.priceAssessment
      ? context.priceAssessment === "fair"
        ? `Pricing looks market-aligned in ${context.suburb} with ${context.confidenceScore}/100 confidence.`
        : context.priceAssessment === "below_market"
          ? `Competitively priced for ${context.suburb}; demand score ${context.demandScore}/100.`
          : `Premium-priced versus local median in ${context.suburb}; demand score ${context.demandScore}/100.`
      : `HomeLink estimates ${context.suburb} ${context.intent === "buy" ? "sale" : "rental"} pricing from ${context.sampleSize} comparable listings.`;

  return { summary, notes: notes.slice(0, 4), aiGenerated: false };
}
