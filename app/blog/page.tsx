import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Building2, Compass, Home, KeyRound, MapPin, Newspaper, ShieldCheck, type LucideIcon } from "lucide-react";
import { BlogIndexClient } from "@/components/blog/blog-index-client";
import { getPublicBlogIndex } from "@/lib/blog/blog-repository";

export const metadata: Metadata = {
  title: "Property Resource Centre | HouseLink Zimbabwe",
  description: "HouseLink Zimbabwe's trusted property resource centre for tenants, landlords, buyers, sellers, agents and investors.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Property Resource Centre | HouseLink Zimbabwe",
    description: "HouseLink Zimbabwe's trusted property resource centre for tenants, landlords, buyers, sellers, agents and investors.",
    images: [{ url: "/images/houselink-hero.webp" }],
  },
};

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const data = await getPublicBlogIndex({ page: 1, limit: 9 });
  const publishedCount = data.total;
  const categoryCount = data.categories.length;
  const featured = data.featured ?? data.posts[0] ?? null;
  return (
    <main className="bg-[#f7fbfa] text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="relative min-h-[88vh] overflow-hidden bg-[#071417] text-white">
        <Image src={featured?.featuredImageUrl || "/images/property-management-dusk.webp"} alt={featured?.featuredImageAlt || "HouseLink property resources"} fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,10,16,0.92)_0%,rgba(3,10,16,0.74)_46%,rgba(3,10,16,0.26)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#f7fbfa] via-[#f7fbfa]/80 to-transparent dark:from-slate-950 dark:via-slate-950/80" />
        <div className="relative mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-between px-4 py-8 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between gap-4">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-100">
              <BookOpen className="size-3.5" />
              HouseLink Editorial
            </p>
            <Link href="/search" className="hidden min-h-10 items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-emerald-50 sm:inline-flex">
              Search properties
              <Compass className="size-4" />
            </Link>
          </nav>
          <div className="grid gap-8 pb-20 pt-16 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end lg:pb-24">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.28em] text-emerald-200">
                <MapPin className="size-4" />
                Zimbabwe property intelligence
              </p>
              <h1 className="mt-5 max-w-5xl text-5xl font-black leading-[0.96] tracking-normal sm:text-7xl lg:text-8xl">
                Property advice that feels local, useful, and alive.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-100 sm:text-xl">
                Practical guides, market notes, safety checks, moving resources, and owner playbooks for real decisions across HouseLink Zimbabwe.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="#latest-resources" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-bold text-ink hover:bg-emerald-400">
                  Enter the resource centre
                  <ArrowRight className="size-4" />
                </Link>
                {featured ? (
                  <Link href={`/blog/${featured.slug}`} className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/15">
                    Read the lead story
                    <Newspaper className="size-4" />
                  </Link>
                ) : null}
              </div>
            </div>
            <aside className="border-l border-white/20 pl-5">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-300">Today on HouseLink</p>
              {featured ? (
                <Link href={`/blog/${featured.slug}`} className="group mt-4 block">
                  <p className="text-2xl font-bold leading-tight text-white group-hover:text-emerald-200">{featured.title}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{featured.excerpt}</p>
                </Link>
              ) : null}
              <div className="mt-7 grid grid-cols-3 gap-2">
                <HeroStat value={`${publishedCount}+`} label="Guides" />
                <HeroStat value={`${categoryCount}`} label="Paths" />
                <HeroStat value="ZW" label="Focus" />
              </div>
            </aside>
          </div>
        </div>
      </section>
      <section className="relative z-10 -mt-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-hero dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-4">
          <HeroJourney href="/blog/category/renting-in-zimbabwe" icon={KeyRound} title="Rent smarter" text="Rental search, viewing, deposits, and tenant confidence." />
          <HeroJourney href="/blog/category/landlord-advice" icon={Home} title="List better" text="Owner playbooks for stronger listings and fewer wasted calls." />
          <HeroJourney href="/blog/category/tenant-advice" icon={ShieldCheck} title="Stay safe" text="Verification, reporting, red flags, and payment caution." />
          <HeroJourney href="/blog/category/selling-property" icon={Building2} title="Sell clearly" text="Preparation, pricing, buyer confidence, and documents." />
        </div>
      </section>
      <section id="latest-resources" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <BlogIndexClient initialData={JSON.parse(JSON.stringify(data))} />
      </section>
    </main>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-3">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">{label}</p>
    </div>
  );
}

function HeroJourney({ href, icon: Icon, title, text }: { href: string; icon: LucideIcon; title: string; text: string }) {
  return (
    <Link href={href} className="group grid grid-cols-[2.25rem_1fr_auto] items-center gap-3 rounded-lg p-3 transition hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
      <span className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
        <Icon className="size-4" />
      </span>
      <span>
        <span className="block text-sm font-bold text-ink dark:text-white">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">{text}</span>
      </span>
      <ArrowRight className="size-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-600" />
    </Link>
  );
}
