"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  label: string;
  value: string | number;
  change?: string;
  icon: LucideIcon;
  tone?: "default" | "warning" | "danger" | "success";
  compact?: boolean;
};

const toneStyles = {
  default: {
    card: "border-cyan-500/15 bg-slate-950 lg:bg-gradient-to-br lg:from-cyan-500/[0.12] lg:via-slate-900/80 lg:to-slate-950/90",
    icon: "bg-cyan-500/15 text-cyan-300",
    change: "text-cyan-400/90",
  },
  warning: {
    card: "border-amber-500/15 bg-slate-950 lg:bg-gradient-to-br lg:from-amber-500/[0.12] lg:via-slate-900/80 lg:to-slate-950/90",
    icon: "bg-amber-500/15 text-amber-300",
    change: "text-amber-400/90",
  },
  danger: {
    card: "border-red-500/15 bg-slate-950 lg:bg-gradient-to-br lg:from-red-500/[0.12] lg:via-slate-900/80 lg:to-slate-950/90",
    icon: "bg-red-500/15 text-red-300",
    change: "text-red-400/90",
  },
  success: {
    card: "border-emerald-500/15 bg-slate-950 lg:bg-gradient-to-br lg:from-emerald-500/[0.12] lg:via-slate-900/80 lg:to-slate-950/90",
    icon: "bg-emerald-500/15 text-emerald-300",
    change: "text-emerald-400/90",
  },
};

export function AdminKpiCard({ label, value, change, icon: Icon, tone = "default", compact }: KpiCardProps) {
  const s = toneStyles[tone];
  return (
    <div
      className={cn(
        "admin-mobile-safe relative isolate min-w-0 overflow-hidden rounded-2xl border p-4 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] sm:p-5",
        s.card,
        compact && "p-4",
      )}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 hidden size-24 rounded-full bg-white/[0.03] blur-2xl lg:block" />
      <div className="relative flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className={cn("mt-2 break-words font-bold tracking-tight text-white tabular-nums", compact ? "text-2xl" : "text-2xl sm:text-3xl")}>
            {value}
          </p>
          {change && <p className={cn("mt-1.5 break-words text-xs font-medium", s.change)}>{change}</p>}
        </div>
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl sm:size-11", s.icon)}>
          <Icon className="size-4 sm:size-5" />
        </span>
      </div>
    </div>
  );
}
