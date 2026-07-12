"use client";

import { BarChart3, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { formatPrice } from "@/lib/utils";
import type { Listing, MarketInsight } from "@/lib/types";

export function MarketInsightPanel({ listing }: { listing: Listing }) {
  const [insight, setInsight] = useState<MarketInsight | null>(null);

  useEffect(() => {
    void apiFetch<{ insight: MarketInsight }>(`/api/v1/market-insights?listingId=${encodeURIComponent(listing.id)}`).then((result) => {
      if (result.data?.insight) setInsight(result.data.insight);
    });
  }, [listing.id]);

  if (!insight) return null;

  return (
    <section>
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <BarChart3 className="size-5 text-emerald-700" />
        AI market insight
      </h2>
      <div className="surface-panel mt-4 rounded-lg p-5">
        <div className="grid gap-3 sm:grid-cols-4">
          <Metric label="Median rent" value={formatPrice(insight.medianPrice)} />
          <Metric label="Suggested band" value={`${formatPrice(insight.recommendedPriceMin)} - ${formatPrice(insight.recommendedPriceMax)}`} />
          <Metric label="Demand score" value={`${insight.demandScore}/100`} />
          <Metric label="Confidence" value={`${insight.confidenceScore ?? 0}/100`} />
          <Metric label="Vacancy risk" value={insight.vacancyRisk.toLowerCase()} />
        </div>
        {insight.priceTrend?.length ? (
          <div className="mt-4 flex h-24 items-end gap-2 rounded-lg bg-white p-3 dark:bg-slate-900">
            {insight.priceTrend.map((point) => {
              const max = Math.max(...(insight.priceTrend ?? []).map((item) => item.medianPrice), 1);
              return (
                <div key={point.period} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-t bg-emerald-500" style={{ height: `${Math.max(12, (point.medianPrice / max) * 64)}px` }} />
                  <span className="max-w-full truncate text-[10px] text-slate-500">{point.period}</span>
                </div>
              );
            })}
          </div>
        ) : null}
        <div className="mt-4 grid gap-2">
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
    <div className="rounded-lg bg-white p-3 dark:bg-slate-900">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink dark:text-white">{value}</p>
    </div>
  );
}
