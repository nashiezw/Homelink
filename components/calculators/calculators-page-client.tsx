"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CalculatorTabbedPanel } from "@/components/calculators/calculator-tabbed-panel";
import { PageShell } from "@/components/layout/page-shell";

export function CalculatorsPageClient() {
  return (
    <PageShell
      eyebrow="Tools"
      title="Property calculators"
      description="Plan move-in costs, rent budgets, agent commissions, and landlord income with instant, mobile-friendly tools built for Zimbabwe's property market."
      highlights={[
        { value: "4", label: "Calculators" },
        { value: "Instant", label: "Live Results" },
        { value: "Free", label: "No Sign-In" },
      ]}
    >
      <CalculatorTabbedPanel syncHash />

      <section className="mt-10 rounded-2xl border border-emerald-200/70 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 p-6 dark:border-emerald-900/40 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Next step</p>
            <h2 className="mt-2 text-xl font-bold text-ink dark:text-white">Ready to search properties?</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Use your budget on HomeLink search, connect with verified agents, or list a property when you are ready.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/search?intent=rent"
              rel="nofollow"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-emerald-500"
            >
              Search rentals
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/dashboard/landlord/new"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:border-emerald-200 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              List a property
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
