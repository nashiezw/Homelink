"use client";

import {
  BadgeCheck,
  Building2,
  MapPinned,
  ShieldCheck,
  Star,
  Users,
  Home,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AnimatedCounter } from "@/components/home/animated-counter";
import type { HomeTrustMetric } from "@/lib/homepage/types";

const METRIC_ICONS: Record<string, LucideIcon> = {
  "verified-properties": Home,
  "verified-agents": BadgeCheck,
  cities: MapPinned,
  buyers: Users,
  rentals: Building2,
  customers: ShieldCheck,
  rating: Star,
};

type TrustMetricsSectionProps = {
  metrics: HomeTrustMetric[];
};

export function TrustMetricsSection({ metrics }: TrustMetricsSectionProps) {
  return (
    <section className="relative z-10 -mt-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-3 max-md:rounded-3xl max-md:border max-md:border-slate-200/80 max-md:bg-slate-100 max-md:p-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 dark:max-md:border-slate-700 dark:max-md:bg-slate-900">
        {metrics.map((metric) => {
          const Icon = METRIC_ICONS[metric.id] ?? ShieldCheck;
          return (
            <div
              key={metric.id}
              className="gpu-card hover-lift rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 md:border-white/70 md:bg-white/95 md:shadow-hero md:backdrop-blur-xl dark:md:border-slate-800 dark:md:bg-slate-900/95"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-cyan-50 text-emerald-700 ring-1 ring-emerald-100 dark:from-emerald-950 dark:to-slate-900 dark:ring-emerald-900">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <p className="mt-3 text-2xl font-semibold leading-none text-slate-950 dark:text-white">
                <AnimatedCounter
                  value={metric.value}
                  decimals={metric.decimals}
                  prefix={metric.prefix}
                  suffix={metric.suffix}
                />
              </p>
              <p className="mt-1.5 text-xs font-medium leading-5 text-slate-600 dark:text-slate-300">
                {metric.label}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
