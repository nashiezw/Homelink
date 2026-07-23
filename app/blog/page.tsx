import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Compass, Home, KeyRound, Newspaper, ShieldCheck, type LucideIcon } from "lucide-react";
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
  return (
    <main className="bg-[#f6faf9] text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="relative overflow-hidden bg-[#07161b] text-white">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(7,22,27,0.98)_0%,rgba(10,54,65,0.9)_48%,rgba(5,95,83,0.82)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#f6faf9] to-transparent dark:from-slate-950" />
          <div className="absolute left-1/2 top-0 h-full w-px bg-white/10" />
          <div className="absolute inset-0 opacity-[0.09] [background-image:linear-gradient(rgba(255,255,255,.9)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.9)_1px,transparent_1px)] [background-size:42px_42px]" />
        </div>
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 pb-10 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_25rem] lg:px-8 lg:pb-16 lg:pt-20">
          <div className="max-w-4xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-100">
              <BookOpen className="size-3.5" />
              HouseLink Property Resource Centre
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-[1.04] tracking-normal sm:text-6xl lg:text-7xl">Property Advice, News and Resources</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
              Practical property intelligence for tenants, landlords, buyers, sellers, agents and investors in Zimbabwe, built around real HouseLink journeys.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="#latest-resources" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-emerald-50">
                Explore resources
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/search" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15">
                Search properties
                <Compass className="size-4" />
              </Link>
            </div>
            <div className="mt-8 grid max-w-2xl grid-cols-3 gap-2 sm:gap-3">
              <HeroStat value={`${publishedCount}+`} label="Guides" />
              <HeroStat value={`${categoryCount}`} label="Categories" />
              <HeroStat value="ZW" label="Market focus" />
            </div>
          </div>
          <aside className="rounded-lg border border-white/12 bg-white/[0.08] p-4 backdrop-blur dark:bg-white/[0.06] sm:p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-200">Start by journey</p>
            <div className="mt-4 grid gap-2">
              <HeroJourney href="/blog/category/renting-in-zimbabwe" icon={KeyRound} title="Rent smarter" text="Search, view, verify, and budget with fewer surprises." />
              <HeroJourney href="/blog/category/landlord-advice" icon={Home} title="List better" text="Pricing, photos, tenant quality, and owner confidence." />
              <HeroJourney href="/blog/category/tenant-advice" icon={ShieldCheck} title="Stay safe" text="Deposit checks, verification, reports, and red flags." />
              <HeroJourney href="/blog/category/houselink-news" icon={Newspaper} title="Follow HouseLink" text="Platform updates, launches, and marketplace news." />
            </div>
          </aside>
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
    <div className="rounded-lg border border-white/12 bg-white/10 px-3 py-3">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">{label}</p>
    </div>
  );
}

function HeroJourney({ href, icon: Icon, title, text }: { href: string; icon: LucideIcon; title: string; text: string }) {
  return (
    <Link href={href} className="group grid grid-cols-[2.25rem_1fr_auto] items-center gap-3 rounded-lg border border-white/10 bg-white/8 p-3 transition hover:border-emerald-300/40 hover:bg-white/12">
      <span className="grid size-9 place-items-center rounded-lg bg-emerald-400/15 text-emerald-200">
        <Icon className="size-4" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-slate-300">{text}</span>
      </span>
      <ArrowRight className="size-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-200" />
    </Link>
  );
}
