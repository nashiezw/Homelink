import { ok, problem } from "@/lib/api/response";
import { requireAdminAsync } from "@/lib/admin/require-admin";
import { checkRateLimit, getClientIp } from "@/lib/api/request-meta";
import {
  computeMarketInsight,
  latestMarketInsights,
  shouldUsePostgresMarketInsights,
} from "@/lib/market-insights/postgres-market-insights";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!shouldUsePostgresMarketInsights()) return problem(503, "POSTGRES_REQUIRED", "Market insights require PostgreSQL.");
  const { searchParams } = new URL(request.url);
  if (searchParams.get("latest") === "true") {
    const auth = await requireAdminAsync(request);
    if (auth.error) return auth.error;
    return ok({ insights: await latestMarketInsights() });
  }
  const ip = getClientIp(request);
  const rate = checkRateLimit(`market-insights:${ip}`, 20);
  if (!rate.allowed) return problem(429, "RATE_LIMITED", `Too many insight requests. Try again in ${rate.retryAfterSec}s.`);
  try {
    const insight = await computeMarketInsight({
      city: searchParams.get("city") ?? undefined,
      suburb: searchParams.get("suburb") ?? undefined,
      propertyType: searchParams.get("propertyType") ?? undefined,
      intent: (searchParams.get("intent") as "rent" | "buy" | null) ?? undefined,
      listingId: searchParams.get("listingId") ?? undefined,
      forceRefresh: searchParams.get("refresh") === "true",
    });
    return ok({ insight });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Market insight failed.";
    console.error("[market-insights]", message);
    return problem(500, "MARKET_INSIGHT_FAILED", message);
  }
}
