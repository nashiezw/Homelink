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
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className={cn("flex h-40 items-end gap-1.5 sm:h-48 sm:gap-2", className)}>
      {data.map((point) => (
        <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div
            className={cn("w-full rounded-t-md transition-all", color)}
            style={{ height: `${(point.value / max) * 100}%`, minHeight: 4 }}
            title={`${point.label}: ${point.value}`}
          />
          <span className="max-w-full truncate text-[10px] text-slate-400">{point.label}</span>
        </div>
      ))}
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
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const segments = data.map((point, index) => {
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
          <div key={s.label} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
            <span className="size-2.5 rounded-full shadow-[0_0_12px_currentColor]" style={{ background: s.color, color: s.color }} />
            <span className="truncate text-slate-300">{s.label}</span>
            <span className="font-semibold text-white">{Math.round(s.pct)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const points = values
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
    <div className="flex items-start justify-between gap-3 border-b border-white/5 py-3 last:border-0">
      <span className="min-w-0 break-words text-sm text-slate-400">{label}</span>
      <div className="shrink-0 text-right">
        <span className="font-semibold text-white">{value}</span>
        {delta && <p className="text-xs text-emerald-400">{delta}</p>}
      </div>
    </div>
  );
}
