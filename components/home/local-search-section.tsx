import { CheckCircle2, MapPinned, Waves, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CityLinks } from "@/components/home/city-links";
import { MapDiscoveryCard } from "@/components/home/map-discovery-card";
import { FadeIn } from "@/components/ui/fade-in";
import type { Listing } from "@/lib/types";

const ADVANTAGES: Array<{ title: string; body: string; icon: LucideIcon }> = [
  {
    title: "Water & power clarity",
    body: "Borehole, tanks, solar backup, and generator filters built in.",
    icon: Waves,
  },
  {
    title: "Suburb-level intelligence",
    body: "Location context from listings and map data when available.",
    icon: MapPinned,
  },
  {
    title: "Verified before contact",
    body: "Trust scores and freshness checks before you reach out.",
    icon: CheckCircle2,
  },
  {
    title: "Built for Zimbabwe",
    body: "Alerts, dashboards, and mobile-ready workflows nationwide.",
    icon: Zap,
  },
];

export function LocalSearchSection({ listings }: { listings: Listing[] }) {
  return (
    <FadeIn>
      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="section-eyebrow">Local search</p>
            <h2 className="section-title">Search that understands Zimbabwe</h2>
            <p className="section-copy">
              Map suburbs, transport, water, power, and nearby essentials — compare locations before
              you call or WhatsApp.
            </p>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-stretch">
            <CityLinks />
            <MapDiscoveryCard listings={listings} />
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ADVANTAGES.map(({ title, body, icon: Icon }) => (
              <div
                key={title}
                className="premium-card hover-lift flex h-full flex-col rounded-2xl p-5 transition hover:border-emerald-200"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <p className="mt-4 text-sm font-semibold text-slate-950 dark:text-white">{title}</p>
                <p className="mt-1.5 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </FadeIn>
  );
}
