import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PropertyManagementHeroCard } from "@/components/home/property-management-hero-card";
import { SearchBar } from "@/components/search/search-bar";
import type { CmsHero } from "@/lib/homepage/cms-types";

type HomeHeroProps = {
  hero: CmsHero;
};

export function HomeHero({ hero }: HomeHeroProps) {
  return (
    <section className="relative overflow-hidden bg-ink">
      <div className="absolute inset-0">
        <Image
          src={hero.imageUrl}
          alt="HouseLink Zimbabwe property marketplace"
          fill
          priority
          className="object-cover scale-105 motion-reduce:scale-100"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,12,21,0.9)_0%,rgba(9,32,42,0.78)_42%,rgba(9,32,42,0.35)_100%)]" />
        <div className="hero-mesh absolute inset-0 opacity-80" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-ink via-ink/60 to-transparent" />
      </div>
      <div className="pointer-events-none absolute -left-24 top-24 size-72 animate-hero-glow rounded-full bg-emerald-500/20 blur-3xl motion-reduce:animate-none" />
      <div className="pointer-events-none absolute right-0 top-1/3 size-96 animate-hero-drift rounded-full bg-cyan-400/10 blur-3xl motion-reduce:animate-none" />

      <div className="relative mx-auto grid min-h-[680px] max-w-7xl items-center gap-10 px-4 pb-28 pt-20 sm:min-h-[720px] sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8">
        <div className="min-w-0 text-white">
          <div className="animate-fade-up inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-300/25 bg-white/10 px-3 py-1.5 text-sm font-semibold text-emerald-50 shadow-sm backdrop-blur motion-reduce:animate-none">
            <ShieldCheck className="size-4 shrink-0 text-emerald-300" aria-hidden="true" />
            <span className="truncate">{hero.eyebrow}</span>
          </div>
          <h1 className="animate-fade-up mt-7 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight text-white motion-reduce:animate-none sm:text-6xl lg:text-[4.25rem] [animation-delay:80ms]">
            {hero.title}{" "}
            <span className="text-gradient-emerald">{hero.titleHighlight}</span>
          </h1>
          <p className="animate-fade-up mt-6 max-w-2xl text-base leading-8 text-slate-100 motion-reduce:animate-none sm:text-lg [animation-delay:160ms]">
            {hero.description}
          </p>
          <div className="animate-fade-up mt-6 flex flex-wrap gap-2 motion-reduce:animate-none [animation-delay:120ms]">
            {hero.badges.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur"
              >
                <CheckCircle2 className="size-3.5 text-emerald-300" />
                {item}
              </span>
            ))}
          </div>

          <div className="animate-fade-up mt-8 max-w-4xl motion-reduce:animate-none [animation-delay:240ms]">
            <SearchBar />
          </div>

          <div className="animate-fade-up mt-5 flex flex-wrap gap-3 motion-reduce:animate-none [animation-delay:280ms]">
            <Link
              href={hero.primaryCta.href}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-400"
            >
              {hero.primaryCta.label}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href={hero.secondaryCta.href}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
            >
              {hero.secondaryCta.label}
            </Link>
          </div>
        </div>

        <div className="hidden justify-center lg:flex lg:justify-end">
          <PropertyManagementHeroCard />
        </div>
      </div>
    </section>
  );
}
