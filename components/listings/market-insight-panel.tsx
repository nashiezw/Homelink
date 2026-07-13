"use client";

import { BarChart3, BrainCircuit, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { formatPrice } from "@/lib/utils";
import type { Listing, MarketInsight } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MarketInsightPanel({ listing }: { listing: Listing }) {
  const [insight, setInsight] = useState<MarketInsight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void apiFetch<{ insight: MarketInsight }>(
      `/api/v1/market-insights?listingId=${encodeURIComponent(listing.id)}`,
    ).then((result) => {
      if (result.data?.insight) setInsight(result.data.insight);
      setLoading(false);
    });
  }, [listing.id]);

  if (loading) {
    return (
      <section className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="h-6 w-48 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-4 grid gap-3 grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-16 rounded-lg bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </section>
    );
  }

  if (!insight) return null;

  const hasMarketData = insight.sampleSize > 0;

  const qualityTone =
    insight.dataQuality === "high"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/40 dark:text-emerald-200"
      : insight.dataQuality === "moderate"
        ? "text-amber-800 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-100"
        : "text-slate-700 bg-slate-50 border-slate-200 dark:bg-slate-950/40 dark:border-slate-700 dark:text-slate-200";

  return (
    <section className="max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="flex min-w-0 items-start gap-2 text-lg font-semibold text-ink sm:text-xl dark:text-white">
              {insight.aiGenerated ? <BrainCircuit className="mt-0.5 size-5 shrink-0 text-emerald-700" /> : <BarChart3 className="mt-0.5 size-5 shrink-0 text-emerald-700" />}
              <span className="min-w-0 break-words">AI market insight</span>
            </h2>
            <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-300">
              {insight.summary ?? `Comparable analysis for ${insight.suburb}, ${insight.city}.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className={qualityTone}>{insight.dataQuality ?? "limited"} evidence</Badge>
            {insight.aiGenerated ? (
              <Badge className="border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-200">
                <Sparkles className="mr-1 size-3.5" />
                LLM summary
              </Badge>
            ) : (
              <Badge className="border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
                Analytics summary
              </Badge>
            )}
            {insight.comparableScope === "city" && insight.sampleSize > 0 && (
              <Badge className="border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200">
                City-wide comparables
              </Badge>
            )}
            {insight.comparableScope === "regional" && insight.sampleSize > 0 && (
              <Badge className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                Regional benchmark
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Metric label={insight.priceLabel ?? "Median price"} value={hasMarketData ? formatPrice(insight.medianPrice) : "Not enough data"} />
          <Metric
            label="Suggested band"
            value={
              hasMarketData
                ? `${formatPrice(insight.recommendedPriceMin)} - ${formatPrice(insight.recommendedPriceMax)}`
                : "Not enough data"
            }
          />
          <Metric label="Demand score" value={`${insight.demandScore}/100`} />
          <Metric label="Confidence" value={`${insight.confidenceScore ?? 0}/100`} />
        </div>

        {insight.listingPrice && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-950/40">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">This listing</p>
            <p className="mt-1 text-sm font-semibold text-ink dark:text-white">
              {formatPrice(insight.listingPrice)}
              {hasMarketData && insight.priceVsMedianPct !== undefined && (
                <span
                  className={cn(
                    "ml-2 rounded-full px-2 py-0.5 text-xs font-bold uppercase",
                    insight.priceAssessment === "below_market"
                      ? "bg-emerald-100 text-emerald-800"
                      : insight.priceAssessment === "above_market"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-200 text-slate-700",
                  )}
                >
                  {insight.priceAssessment === "below_market"
                    ? `${Math.abs(insight.priceVsMedianPct)}% below median`
                    : insight.priceAssessment === "above_market"
                      ? `${insight.priceVsMedianPct}% above median`
                      : "Near median"}
                </span>
              )}
            </p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Vacancy risk" value={insight.vacancyRisk.toLowerCase()} />
          <Metric label="Comparable matches" value={`${insight.strongMatches ?? 0} close / ${insight.sampleSize} total`} />
          <Metric label="Avg days on market" value={`${insight.avgDaysOnMarket ?? 0} days`} />
        </div>

        {insight.priceTrend?.length ? (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Posted listing price trend</p>
            <div className="flex h-24 items-end gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-950/40">
              {insight.priceTrend.map((point) => {
                const max = Math.max(...(insight.priceTrend ?? []).map((item) => item.medianPrice), 1);
                return (
                  <div key={point.period} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-emerald-500"
                      style={{ height: `${Math.max(12, (point.medianPrice / max) * 64)}px` }}
                    />
                    <span className="max-w-full truncate text-[10px] text-slate-500">{point.period}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="grid gap-2">
          {insight.notes.map((note) => (
            <p key={note} className="flex gap-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              <TrendingUp className="mt-0.5 size-4 shrink-0 text-emerald-700" />
              {note}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950/40">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-ink dark:text-white">{value}</p>
    </div>
  );
}

function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", className)}>{children}</span>;
}
