import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Compass, MapPin, Newspaper } from "lucide-react";
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
  const featured = data.featured ?? data.posts[0] ?? null;
  return (
    <main className="bg-[#f7fbfa] text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="relative min-h-[52vh] overflow-hidden bg-[#071417] text-white sm:min-h-[58vh] lg:min-h-[64vh]">
        <Image src={featured?.featuredImageUrl || "/images/property-management-dusk.webp"} alt={featured?.featuredImageAlt || "HouseLink property resources"} fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,10,16,0.92)_0%,rgba(3,10,16,0.74)_46%,rgba(3,10,16,0.26)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#f7fbfa] via-[#f7fbfa]/75 to-transparent dark:from-slate-950 dark:via-slate-950/75" />
        <div className="relative mx-auto flex min-h-[52vh] max-w-7xl flex-col justify-between px-4 py-5 sm:min-h-[58vh] sm:px-6 sm:py-7 lg:min-h-[64vh] lg:px-8">
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
          <div className="grid gap-6 pb-12 pt-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end lg:pb-16">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200 sm:text-sm">
                <MapPin className="size-4" />
                Zimbabwe property intelligence
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-black leading-[1.02] tracking-normal sm:text-6xl lg:text-7xl">
                Property Advice, News and Resources
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-100 sm:text-lg">
                Practical guides for renting, buying, selling, listing, safety, moving and property decisions in Zimbabwe.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="#latest-resources" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-ink hover:bg-emerald-400">
                  See latest blogs
                  <ArrowRight className="size-4" />
                </Link>
                {featured ? (
                  <Link href={`/blog/${featured.slug}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/15">
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
            </aside>
          </div>
        </div>
      </section>
      <section id="latest-resources" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <BlogIndexClient initialData={JSON.parse(JSON.stringify(data))} />
      </section>
    </main>
  );
}
