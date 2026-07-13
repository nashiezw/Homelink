import {
  Building2,
  Home,
  Hotel,
  Map,
  Palmtree,
  Trees,
  UsersRound,
  Warehouse,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { FadeIn } from "@/components/ui/fade-in";
import type { HomePropertyType } from "@/lib/homepage/types";

const ICONS: Record<string, LucideIcon> = {
  houses: Home,
  apartments: Building2,
  rooms: Hotel,
  cottages: Trees,
  land: Map,
  commercial: Warehouse,
  roommates: UsersRound,
  holiday: Palmtree,
};

type BrowsePropertyTypesProps = {
  types: HomePropertyType[];
};

export function BrowsePropertyTypes({ types }: BrowsePropertyTypesProps) {
  return (
    <FadeIn>
      <section className="bg-white px-4 py-12 sm:px-6 lg:px-8 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="section-eyebrow">Quick navigation</p>
              <h2 className="section-title">Browse property types</h2>
              <p className="section-copy max-w-xl">
                Jump straight to what you need — live counts update as listings go live.
              </p>
            </div>
            <Link
              href="/search"
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              View all properties
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {types.map((item) => {
              const Icon = ICONS[item.id] ?? Home;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  rel={item.href.includes("?") ? "nofollow" : undefined}
                  className="gpu-card group flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-card-hover dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-800"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-50 to-cyan-50 text-emerald-700 ring-1 ring-emerald-100 transition group-hover:from-emerald-600 group-hover:to-teal-600 group-hover:text-white dark:from-emerald-950 dark:to-slate-900 dark:ring-emerald-900">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-950 group-hover:text-emerald-800 dark:text-white">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                      {item.comingSoon
                        ? "Register interest"
                        : `${item.count.toLocaleString()} ${item.id === "roommates" ? "listings" : "properties"}`}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </FadeIn>
  );
}
