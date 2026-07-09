"use client";

import { RotateCcw, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { CalculatorInsight } from "@/lib/calculators/insights";
import { insightToneClass } from "@/lib/calculators/insights";
import { cn } from "@/lib/utils";

type CalculatorCardProps = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  audience?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function CalculatorCard({
  id,
  icon: Icon,
  title,
  description,
  audience,
  children,
  actions,
  className,
}: CalculatorCardProps) {
  return (
    <article
      id={id}
      className={cn(
        "scroll-mt-28 overflow-hidden rounded-[1.35rem] border border-emerald-100 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)] dark:border-emerald-900/40 dark:bg-slate-900",
        className,
      )}
    >
      <div className="border-b border-slate-100 bg-gradient-to-br from-white via-emerald-50/70 to-cyan-50/60 px-5 py-6 dark:border-slate-800 dark:from-slate-900 dark:via-emerald-950/20 dark:to-slate-900 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-[0_14px_28px_rgba(4,120,87,0.22)]">
              <Icon className="size-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              {audience && (
                <p className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                  {audience}
                </p>
              )}
              <h2 className="mt-2 text-xl font-bold text-ink dark:text-white sm:text-2xl">{title}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
            </div>
          </div>
          {actions}
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </article>
  );
}

type CalculatorFieldProps = {
  id: string;
  label: string;
  hint?: string;
  suffix?: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: "decimal" | "numeric";
  required?: boolean;
};

export function CalculatorField({
  id,
  label,
  hint,
  suffix,
  value,
  onChange,
  inputMode = "decimal",
  required,
}: CalculatorFieldProps) {
  return (
    <label htmlFor={id} className="block rounded-2xl border border-transparent p-1 transition focus-within:border-emerald-100 focus-within:bg-emerald-50/35 dark:focus-within:border-emerald-900/50 dark:focus-within:bg-emerald-950/20">
      <span className="text-sm font-bold text-ink dark:text-slate-100">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
      <div className="relative mt-2">
        <input
          id={id}
          type="text"
          inputMode={inputMode}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-required={required}
          className={cn(
            "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base font-semibold text-ink shadow-[0_8px_22px_rgba(15,23,42,0.05)] transition focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/12 dark:border-slate-700 dark:bg-slate-950 dark:text-white",
            suffix ? "pr-16" : "",
          )}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-slate-400">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

type CalculatorSummaryProps = {
  title: string;
  children: ReactNode;
  highlight?: ReactNode;
  className?: string;
};

export function CalculatorSummary({ title, children, highlight, className }: CalculatorSummaryProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-cyan-50/70 p-5 shadow-[0_18px_45px_rgba(16,185,129,0.10)] dark:border-emerald-900/50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900",
        className,
      )}
    >
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-emerald-200/25 dark:bg-emerald-700/10" />
      <p className="relative text-xs font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">{title}</p>
      <div className="relative mt-4 space-y-3">{children}</div>
      {highlight && (
        <div className="relative mt-5 rounded-2xl border border-emerald-100 bg-white/80 p-4 shadow-sm dark:border-emerald-900/50 dark:bg-slate-950/40">
          {highlight}
        </div>
      )}
    </div>
  );
}

type CalculatorResultRowProps = {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
};

export function CalculatorResultRow({ label, value, emphasis }: CalculatorResultRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className={cn("min-w-0 text-sm leading-relaxed", emphasis ? "font-semibold text-ink dark:text-white" : "text-slate-600 dark:text-slate-300")}>
        {label}
      </span>
      <span className={cn("shrink-0 text-right text-sm font-semibold tabular-nums", emphasis ? "text-lg text-emerald-700 dark:text-emerald-300" : "text-ink dark:text-white")}>
        {value}
      </span>
    </div>
  );
}

export function CalculatorResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/40"
    >
      <RotateCcw className="size-4" aria-hidden="true" />
      Reset
    </button>
  );
}

type CalculatorPanelHeaderProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  audience?: string;
  actions?: ReactNode;
};

export function CalculatorPanelHeader({
  icon: Icon,
  title,
  description,
  audience,
  actions,
}: CalculatorPanelHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-br from-white via-emerald-50/55 to-cyan-50/40 px-5 py-6 dark:border-slate-800 dark:from-slate-900 dark:via-emerald-950/20 dark:to-slate-900 sm:flex-row sm:items-start sm:justify-between sm:px-6">
      <div className="flex min-w-0 items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-[0_14px_28px_rgba(4,120,87,0.22)]">
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          {audience && (
            <p className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
              {audience}
            </p>
          )}
          <h2 className="mt-2 text-xl font-bold text-ink dark:text-white sm:text-2xl">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
        </div>
      </div>
      {actions}
    </div>
  );
}

export function CalculatorPresetButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3 py-2 text-xs font-semibold transition sm:text-sm",
        active
          ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-800",
      )}
    >
      {children}
    </button>
  );
}

export function CalculatorInsights({ insights }: { insights: CalculatorInsight[] }) {
  if (!insights.length) return null;

  return (
    <div className="mt-5 space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Smart tips</p>
      <ul className="space-y-2">
        {insights.map((insight, index) => (
          <li
            key={`${insight.tone}-${index}`}
            className={cn("rounded-xl border px-4 py-3 text-sm leading-relaxed", insightToneClass(insight.tone))}
          >
            {insight.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
