"use client";

import type { ChartPoint } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

export function BarChart({
  data,
  className,
  color = "bg-emerald-500",
}: {
  data: ChartPoint[];
  className?: string;
  color?: string;
}) {
  const rows = normaliseChartData(data);
  const max = Math.max(...rows.map((d) => d.value), 1);
  const hasData = rows.some((d) => d.value > 0);

  if (!rows.length || !hasData) {
    return <EmptyChart className={className} message="No chart data yet." />;
  }

  return (
    <div className={cn("min-w-0", className)}>
      <div className="relative h-48 min-w-0 border-b border-white/10 bg-[linear-gradient(to_top,rgba(148,163,184,0.10)_1px,transparent_1px)] bg-[length:100%_25%]">
        <div className="absolute inset-0 flex min-w-0 items-end gap-1.5 sm:gap-2">
          {rows.map((point) => {
            const height = point.value > 0 ? Math.max((point.value / max) * 100, 8) : 0;
            return (
              <div key={point.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                <span className="max-w-full truncate text-[10px] font-semibold leading-none text-slate-300" title={`${point.label}: ${point.value}`}>
                  {formatChartValue(point.value)}
                </span>
                <div
                  className={cn("w-full rounded-t-md shadow-[0_0_18px_rgba(16,185,129,0.18)] transition-all", color)}
                  style={{ height: `${height}%` }}
                  title={`${point.label}: ${point.value}`}
                  aria-label={`${point.label}: ${point.value}`}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex min-w-0 gap-1.5 sm:gap-2">
        {rows.map((point) => (
          <span key={point.label} className="min-w-0 flex-1 break-words text-center text-[10px] leading-tight text-slate-400 [overflow-wrap:anywhere]" title={point.label}>
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DonutChart({
  data,
  colors = ["#10b981", "#0891b2", "#6366f1", "#f59e0b", "#ef4444"],
}: {
  data: ChartPoint[];
  colors?: string[];
}) {
  const rows = normaliseChartData(data);
  const total = rows.reduce((sum, d) => sum + d.value, 0);
  if (!rows.length || total <= 0) {
    return <EmptyChart message="No chart data yet." />;
  }
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const segments = rows.map((point, index) => {
    const pct = (point.value / total) * 100;
    const segment = {
      ...point,
      pct,
      dash: (pct / 100) * circumference,
      offset: (offset / 100) * circumference,
      color: colors[index % colors.length],
    };
    offset += pct;
    return segment;
  });

  return (
    <div className="grid gap-4 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center">
      <div className="relative mx-auto flex h-32 w-32 shrink-0 items-center justify-center">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={`Chart total ${total}`}>
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="20" />
          {segments.map((s) => (
            <circle
              key={s.label}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth="20"
              strokeLinecap={segments.length === 1 ? "round" : "butt"}
              strokeDasharray={`${s.dash} ${circumference - s.dash}`}
              strokeDashoffset={-s.offset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full text-center">
          <span className="text-2xl font-bold leading-none text-white">{total}</span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">total</span>
        </div>
      </div>
      <div className="grid min-w-0 gap-2 text-sm">
        {segments.map((s) => (
          <div key={s.label} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
            <span className="size-2.5 rounded-full shadow-[0_0_12px_currentColor]" style={{ background: s.color, color: s.color }} />
            <span className="min-w-0 break-words text-slate-300 [overflow-wrap:anywhere]">{s.label}</span>
            <span className="font-semibold text-white">{Math.round(s.pct)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const safeValues = values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  if (!safeValues.length) {
    return <EmptyChart className={cn("h-12", className)} message="No trend data yet." />;
  }
  const max = Math.max(...safeValues, 1);
  const min = Math.min(...safeValues, 0);
  const range = max - min || 1;
  const points = safeValues
    .map((v, i) => {
      const x = (i / (values.length - 1 || 1)) * 100;
      const y = 100 - ((v - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={cn("h-12 w-full", className)}>
      <polyline fill="none" stroke="currentColor" strokeWidth="3" points={points} className="text-emerald-400" />
    </svg>
  );
}

export function MetricRow({ label, value, delta }: { label: string; value: string | number; delta?: string }) {
  return (
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-1 border-b border-white/5 py-3 last:border-0">
      <span className="min-w-40 flex-1 break-words text-sm leading-5 text-slate-400 [overflow-wrap:anywhere]">{label}</span>
      <div className="min-w-0 max-w-full text-left sm:text-right">
        <span className="block break-words font-semibold leading-5 text-white [overflow-wrap:anywhere]">{value}</span>
        {delta && <p className="break-words text-xs leading-4 text-emerald-400 [overflow-wrap:anywhere]">{delta}</p>}
      </div>
    </div>
  );
}

function normaliseChartData(data: ChartPoint[]) {
  return data
    .map((point) => ({
      label: String(point.label || "Untitled"),
      value: Math.max(0, Number.isFinite(Number(point.value)) ? Number(point.value) : 0),
    }))
    .filter((point) => point.label.trim());
}

function formatChartValue(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return String(value);
}

function EmptyChart({ message, className }: { message: string; className?: string }) {
  return (
    <div className={cn("flex min-h-40 min-w-0 items-center justify-center rounded-lg border border-dashed border-white/10 bg-slate-950/35 px-4 text-center text-sm text-slate-500", className)}>
      {message}
    </div>
  );
}
