import Link from "next/link";
import { ArrowRight, Calculator } from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";
import { CALCULATORS } from "@/lib/calculators/constants";

export function CalculatorsSection() {
  return (
    <FadeIn>
      <section className="border-y border-emerald-100/80 bg-gradient-to-r from-emerald-50/70 via-white to-cyan-50/50 py-5 dark:border-emerald-900/40 dark:from-emerald-950/20 dark:via-slate-950 dark:to-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-sm">
              <Calculator className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink dark:text-white">Property calculators</p>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm">
                Plan move-in costs, rent budgets, commissions, and landlord income in seconds.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-2">
              {CALCULATORS.map((item) => (
                <Link
                  key={item.id}
                  href={`/calculators#${item.id}`}
                  className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/40"
                >
                  {item.title}
                </Link>
              ))}
            </div>
            <Link
              href="/calculators"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-500 sm:self-auto"
            >
              Open calculators
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </FadeIn>
  );
}
