import { ArrowRight, BellRing, ClipboardList, SearchCheck } from "lucide-react";
import Link from "next/link";

type PropertyRequestCtaProps = {
  compact?: boolean;
  intent?: "rent" | "buy";
};

export function PropertyRequestCta({ compact = false, intent }: PropertyRequestCtaProps) {
  const label = intent === "buy" ? "Tell us what you want to buy" : intent === "rent" ? "Tell us what you want to rent" : "Tell us what you are looking for";

  return (
    <section className={compact ? "mt-5" : "px-4 py-10 sm:px-6 lg:px-8"}>
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-lg border border-emerald-200 bg-white shadow-sm dark:border-emerald-900/50 dark:bg-slate-900">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-emerald-600" />
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              {[
                ["Request", ClipboardList],
                ["Match", SearchCheck],
                ["Notify", BellRing],
              ].map(([text, Icon]) => (
                <span key={text as string} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <Icon className="size-3.5" />
                  {text as string}
                </span>
              ))}
            </div>
            <h2 className="mt-3 text-xl font-semibold tracking-normal text-ink dark:text-white sm:text-2xl">
              Cannot find the right property yet?
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Send HouseLink your area, budget, property type, and must-haves. We will store the request and match it when suitable listings become available.
            </p>
          </div>
          <Link
            href="/property-request"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-emerald-950/15 transition hover:-translate-y-0.5 hover:bg-emerald-500 sm:w-auto"
          >
            {label}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
