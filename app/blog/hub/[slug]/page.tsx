import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin } from "lucide-react";
import { BlogCard } from "@/components/blog/blog-card";
import { getPublicBlogHub } from "@/lib/blog/blog-repository";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicBlogHub(slug);
  if (!data) return {};
  return {
    title: `${data.hub.title} | HouseLink Zimbabwe`,
    description: data.hub.description,
    alternates: { canonical: `/blog/hub/${data.hub.slug}` },
  };
}

export const revalidate = 900;
export const dynamic = "force-static";

export default async function BlogHubPage({ params }: Props) {
  const { slug } = await params;
  const data = await getPublicBlogHub(slug);
  if (!data) notFound();
  return (
    <main className="bg-mist text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="bg-ink px-4 py-12 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-200"><MapPin className="size-4" /> City guide hub</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-normal sm:text-5xl">{data.hub.title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">{data.hub.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/search?city=${encodeURIComponent(data.hub.city)}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-ink hover:bg-emerald-400">Search {data.hub.city} listings <ArrowRight className="size-4" /></Link>
            <Link href="/blog/questions" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-bold text-white hover:bg-white/10">Ask a local question</Link>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.posts.map((post) => <BlogCard key={post.id} post={post} />)}
        </div>
        <div className="mt-10 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Other city hubs</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.hubs.filter((item) => item.slug !== data.hub.slug).map((item) => (
              <Link key={item.slug} href={`/blog/hub/${item.slug}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-300 dark:border-slate-700 dark:text-slate-200">
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
