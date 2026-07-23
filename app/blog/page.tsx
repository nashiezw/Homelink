import type { Metadata } from "next";
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
  return (
    <main className="bg-mist text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.24),transparent_32%),linear-gradient(135deg,rgba(6,30,46,1),rgba(3,8,20,1))]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <p className="inline-flex rounded-full border border-emerald-300/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-100">HouseLink Property Resource Centre</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight tracking-normal sm:text-6xl">Property Advice, News and Resources</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            HouseLink Zimbabwe brings practical property knowledge, market guidance, safety advice, and platform resources into one trusted centre for tenants, landlords, buyers, sellers, agents and investors.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <BlogIndexClient initialData={JSON.parse(JSON.stringify(data))} />
      </section>
    </main>
  );
}
