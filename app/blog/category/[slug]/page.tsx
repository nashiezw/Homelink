import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogIndexClient } from "@/components/blog/blog-index-client";
import { getPublicBlogCategory } from "@/lib/blog/blog-repository";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicBlogCategory(slug, { page: 1, limit: 9 });
  if (!data) return {};
  return {
    title: data.category.seoTitle ?? `${data.category.name} | HouseLink Blog`,
    description: data.category.metaDescription ?? data.category.description ?? `Read HouseLink Zimbabwe articles about ${data.category.name}.`,
    alternates: { canonical: `/blog/category/${data.category.slug}` },
    openGraph: { title: data.category.name, description: data.category.description ?? undefined, images: data.category.imageUrl ? [{ url: data.category.imageUrl }] : [{ url: "/images/houselink-hero.webp" }] },
  };
}

export const dynamic = "force-dynamic";

export default async function BlogCategoryPage({ params }: Props) {
  const { slug } = await params;
  const data = await getPublicBlogCategory(slug, { page: 1, limit: 9 });
  if (!data) notFound();
  return (
    <main className="bg-mist text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="relative overflow-hidden bg-ink text-white">
        {data.category.imageUrl ? <Image src={data.category.imageUrl} alt={data.category.name} fill className="object-cover opacity-30" sizes="100vw" /> : null}
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/55" />
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <nav className="mb-5 flex flex-wrap gap-2 text-xs text-slate-300 sm:text-sm" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-white">Property Resource Centre</Link>
          </nav>
          <p className="section-eyebrow text-emerald-200">Resource category</p>
          <h1 className="mt-3 max-w-4xl text-3xl font-bold tracking-normal sm:text-5xl">{data.category.name}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">{data.category.description}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300 sm:text-sm">
            <span>{data.total} published resources</span>
            {data.featured ? <span>Featured: {data.featured.title}</span> : null}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <BlogIndexClient initialData={JSON.parse(JSON.stringify(data))} />
      </section>
    </main>
  );
}
