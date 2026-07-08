"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { AgentCommissionCalculator } from "@/components/calculators/agent-commission-calculator";
import { LandlordIncomeCalculator } from "@/components/calculators/landlord-income-calculator";
import { MoveInCostCalculator } from "@/components/calculators/move-in-cost-calculator";
import { RentalAffordabilityCalculator } from "@/components/calculators/rental-affordability-calculator";
import { PageShell } from "@/components/layout/page-shell";
import { CALCULATORS } from "@/lib/calculators/constants";
import { cn } from "@/lib/utils";

export function CalculatorsPageClient() {
  const [activeId, setActiveId] = useState(CALCULATORS[0]?.id ?? "move-in-cost");

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash && CALCULATORS.some((item) => item.id === hash)) {
      setActiveId(hash as (typeof CALCULATORS)[number]["id"]);
    }
  }, []);

  useEffect(() => {
    const sections = CALCULATORS.map((item) => document.getElementById(item.id)).filter(Boolean) as HTMLElement[];
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) {
          setActiveId(visible.target.id as (typeof CALCULATORS)[number]["id"]);
        }
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0.15, 0.4, 0.7] },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, []);

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
      <nav
        aria-label="Calculator sections"
        className="sticky top-16 z-20 -mx-1 mb-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:top-20 lg:bg-white/95 lg:backdrop-blur"
      >
        <div className="flex min-w-max gap-2 px-1">
          {CALCULATORS.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setActiveId(item.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  activeId === item.id
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-300 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-200",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {item.title}
              </a>
            );
          })}
        </div>
      </nav>

      <div className="grid gap-8">
        <MoveInCostCalculator />
        <RentalAffordabilityCalculator />
        <AgentCommissionCalculator />
        <LandlordIncomeCalculator />
      </div>

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
