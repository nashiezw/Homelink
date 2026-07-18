import { ArrowRight, BadgeCheck, Clock3, MapPin, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/ui/fade-in";
import type { HomeFeaturedAgent } from "@/lib/homepage/types";
import { cn } from "@/lib/utils";

type FeaturedAgentsSectionProps = {
  agents: HomeFeaturedAgent[];
};

export function FeaturedAgentsSection({ agents }: FeaturedAgentsSectionProps) {
  if (!agents.length) return null;

  return (
    <FadeIn>
      <section className="bg-slate-50 px-4 py-14 sm:px-6 lg:px-8 dark:bg-slate-900/40">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="section-eyebrow">Verified professionals</p>
            <h2 className="section-title">Meet our verified property professionals</h2>
            <p className="section-copy">
              Licensed agents with public profiles, ratings, and territories — pulled live from the platform.
            </p>
          </div>

          <ul className="mt-8 space-y-4">
            {agents.map((agent) => (
              <li key={agent.id}>
                <AgentRow agent={agent} />
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200/80 pt-6 dark:border-slate-800">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Every agent is verified, rated, and assigned to a territory.
            </p>
            <Link
              href="/become-agent"
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-900 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:w-auto"
            >
              Agent programme
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </FadeIn>
  );
}

function AgentRow({ agent }: { agent: HomeFeaturedAgent }) {
  return (
    <article className="premium-card hover-lift flex flex-col gap-5 rounded-2xl p-5 transition hover:border-emerald-200 sm:flex-row sm:items-center sm:p-6">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        {agent.photoUrl ? (
          <Image
            src={agent.photoUrl}
            alt={agent.name}
            width={64}
            height={64}
            className="size-16 shrink-0 rounded-xl object-cover ring-2 ring-emerald-100"
          />
        ) : (
          <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-lg font-bold text-white">
            {agent.name.slice(0, 2).toUpperCase()}
          </span>
        )}

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-950 dark:text-white">{agent.name}</h3>
            {agent.verified ? (
              <BadgeCheck className="size-4 text-emerald-600" aria-label="Verified agent" />
            ) : null}
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              {agent.level} agent
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-1 text-amber-500">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn("size-3.5", i < Math.round(agent.averageRating) ? "fill-current" : "fill-transparent")}
                aria-hidden="true"
              />
            ))}
            <span className="ml-1 text-xs text-slate-600 dark:text-slate-300">
              {agent.averageRating.toFixed(1)} ({agent.ratingCount} reviews)
            </span>
          </div>
        </div>
      </div>

      <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4 sm:gap-x-8">
        <div>
          <dt className="text-slate-500">Experience</dt>
          <dd className="mt-0.5 font-semibold text-slate-900 dark:text-white">{agent.yearsExperience} yrs</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-slate-500">
            <MapPin className="size-3" aria-hidden="true" />
            Province
          </dt>
          <dd className="mt-0.5 font-semibold text-slate-900 dark:text-white">{agent.province}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-slate-500">
            <Clock3 className="size-3" aria-hidden="true" />
            Response
          </dt>
          <dd className="mt-0.5 font-semibold text-slate-900 dark:text-white">{agent.responseTime}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Listings</dt>
          <dd className="mt-0.5 font-semibold text-slate-900 dark:text-white">{agent.listingsManaged}</dd>
        </div>
      </dl>

      <Link
        href={`/agents/${agent.slug}`}
        className="inline-flex min-h-10 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-2 text-center text-sm font-semibold text-white transition hover:bg-emerald-800 sm:ml-2 sm:w-auto"
      >
        View profile
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </article>
  );
}
