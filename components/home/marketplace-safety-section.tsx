"use client";

import {
  BadgeCheck,
  Copy,
  Fingerprint,
  RefreshCw,
  ShieldCheck,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";

const SAFETY_FEATURES: Array<{
  title: string;
  body: string;
  icon: LucideIcon;
}> = [
  {
    title: "Verified listings",
    body: "Identity, phone, email, and property checks before serious contact.",
    icon: BadgeCheck,
  },
  {
    title: "Duplicate detection",
    body: "Similar photos, addresses, and phone numbers are flagged for review.",
    icon: Copy,
  },
  {
    title: "Fake listing prevention",
    body: "Reporting, review queues, and stale listing rules keep quality high.",
    icon: Fingerprint,
  },
  {
    title: "Verified agents",
    body: "Licensed professionals with public profiles, ratings, and territories.",
    icon: ShieldCheck,
  },
  {
    title: "Fresh data",
    body: "Listings expire, refresh, or get reviewed before they go stale.",
    icon: RefreshCw,
  },
  {
    title: "Trust score",
    body: "Every save, report, and verification event improves marketplace quality.",
    icon: Star,
  },
];

export function MarketplaceSafetySection() {
  return (
    <FadeIn>
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white px-4 py-16 sm:px-6 lg:px-8 dark:from-slate-900/50 dark:to-slate-950">
        <div className="section-divider absolute inset-x-0 top-0" />
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="section-eyebrow">Marketplace safety</p>
            <h2 className="section-title">Built to reduce fake, stale, and duplicate listings</h2>
            <p className="section-copy">
              HomeLink treats trust as product infrastructure — not a badge you add after launch.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SAFETY_FEATURES.map(({ title, body, icon: Icon }, index) => (
              <article
                key={title}
                className="premium-card hover-lift group rounded-2xl p-5 transition hover:border-emerald-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-700 group-hover:text-white dark:bg-emerald-950">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-2xl font-semibold text-emerald-100 dark:text-slate-700">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-4 font-semibold text-slate-950 dark:text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </FadeIn>
  );
}
