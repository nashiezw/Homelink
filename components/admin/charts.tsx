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
    <div className={cn("flex h-48 items-end gap-2", className)}>
      {data.map((point) => (
        <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
          <div
            className={cn("w-full rounded-t-md transition-all", color)}
            style={{ height: `${(point.value / max) * 100}%`, minHeight: 4 }}
            title={`${point.label}: ${point.value}`}
          />
          <span className="text-[10px] text-slate-400">{point.label}</span>
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
  let offset = 0;
  const segments = data.map((point, index) => {
    const pct = (point.value / total) * 100;
    const segment = { ...point, pct, offset, color: colors[index % colors.length] };
    offset += pct;
    return segment;
  });

  const gradient = segments
    .map((s) => `${s.color} ${s.offset}% ${s.offset + s.pct}%`)
    .join(", ");

  return (
    <div className="flex items-center gap-6">
      <div
        className="size-32 rounded-full"
        style={{ background: `conic-gradient(${gradient})` }}
      />
      <div className="grid gap-2 text-sm">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-slate-300">{s.label}</span>
            <span className="ml-auto font-semibold text-white">{s.value}%</span>
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
    <div className="flex items-center justify-between border-b border-white/5 py-3 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <div className="text-right">
        <span className="font-semibold text-white">{value}</span>
        {delta && <p className="text-xs text-emerald-400">{delta}</p>}
      </div>
    </div>
  );
}
