import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen } from "lucide-react";
import { BlogCard } from "@/components/blog/blog-card";
import { getPublicBlogSeries } from "@/lib/blog/blog-repository";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicBlogSeries(slug);
  if (!data) return {};
  return {
    title: `${data.series.title} | HouseLink Zimbabwe`,
    description: data.series.description,
    alternates: { canonical: `/blog/series/${data.series.slug}` },
  };
}

export const revalidate = 900;
export const dynamic = "force-static";

export default async function BlogSeriesPage({ params }: Props) {
  const { slug } = await params;
  const data = await getPublicBlogSeries(slug);
  if (!data) notFound();
  return (
    <main className="bg-mist text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="bg-ink px-4 py-12 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-200"><BookOpen className="size-4" /> Blog series</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-normal sm:text-5xl">{data.series.title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">{data.series.description}</p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.posts.map((post) => <BlogCard key={post.id} post={post} />)}
        </div>
        <div className="mt-10 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">More series</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.allSeries.filter((item) => item.slug !== data.series.slug).map((item) => (
              <Link key={item.slug} href={`/blog/series/${item.slug}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-300 dark:border-slate-700 dark:text-slate-200">
                {item.title}
                <ArrowRight className="size-4" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
