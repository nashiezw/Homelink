import Link from "next/link";
import { ArrowRight, Calculator } from "lucide-react";
import { MoveInCostCalculator } from "@/components/calculators/move-in-cost-calculator";
import { FadeIn } from "@/components/ui/fade-in";
import { CALCULATORS } from "@/lib/calculators/constants";

export function CalculatorsSection() {
  return (
    <FadeIn>
      <section className="bg-mist py-16 dark:bg-slate-950 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="section-eyebrow">Calculators</p>
              <h2 className="section-title mt-3">Plan your property finances in seconds</h2>
              <p className="section-copy mt-3">
                Estimate move-in costs, rent budgets, agent commissions, and landlord income with free tools designed
                for Zimbabwe renters, agents, and property owners.
              </p>
            </div>
            <Link
              href="/calculators"
              className="inline-flex h-12 items-center justify-center gap-2 self-start rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-emerald-500"
            >
              <Calculator className="size-4" aria-hidden="true" />
              View all calculators
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {CALCULATORS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={`/calculators#${item.id}`}
                  className="premium-card group rounded-2xl p-5 transition hover:-translate-y-1 hover:border-emerald-300 dark:hover:border-emerald-700"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-sm transition group-hover:scale-105">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    {item.audience}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-ink dark:text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.description}</p>
                </Link>
              );
            })}
          </div>

          <div className="mt-8">
            <MoveInCostCalculator compact />
          </div>
        </div>
      </section>
    </FadeIn>
  );
}
