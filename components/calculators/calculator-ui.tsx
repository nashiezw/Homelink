"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
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
        "premium-card scroll-mt-28 overflow-hidden rounded-2xl bg-white dark:bg-slate-900",
        className,
      )}
    >
      <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50/90 via-white to-cyan-50/70 px-5 py-5 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md">
              <Icon className="size-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              {audience && (
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  {audience}
                </p>
              )}
              <h2 className="mt-1 text-xl font-bold text-ink dark:text-white sm:text-2xl">{title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
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
    <label htmlFor={id} className="block">
      <span className="text-sm font-semibold text-ink dark:text-slate-100">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
      <div className="relative mt-2">
        <input
          id={id}
          type="text"
          inputMode={inputMode}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-required={required}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-medium text-ink shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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
        "rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-cyan-50/60 p-5 shadow-sm dark:border-emerald-900/50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900",
        className,
      )}
    >
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">{title}</p>
      <div className="mt-4 space-y-3">{children}</div>
      {highlight && <div className="mt-5 border-t border-emerald-200/70 pt-5 dark:border-emerald-900/60">{highlight}</div>}
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
    <div className="flex items-center justify-between gap-4">
      <span className={cn("text-sm", emphasis ? "font-semibold text-ink dark:text-white" : "text-slate-600 dark:text-slate-300")}>
        {label}
      </span>
      <span className={cn("text-right text-sm font-semibold tabular-nums", emphasis ? "text-lg text-emerald-700 dark:text-emerald-300" : "text-ink dark:text-white")}>
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
      className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/40"
    >
      Reset
    </button>
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
