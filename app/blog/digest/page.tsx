import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Newspaper } from "lucide-react";
import { BlogCard } from "@/components/blog/blog-card";
import { ReaderQuestionForm } from "@/components/blog/reader-question-form";
import { getPublicBlogIndex, getPublicReaderQuestionDigest } from "@/lib/blog/blog-repository";

export const metadata: Metadata = {
  title: "Weekly Property Digest | HouseLink Zimbabwe",
  description: "A weekly HouseLink digest of Zimbabwe property questions, practical guides, and reader concerns.",
  alternates: { canonical: "/blog/digest" },
};

export const revalidate = 900;
export const dynamic = "force-dynamic";

export default async function BlogDigestPage() {
  const [blog, questions] = await Promise.all([
    getPublicBlogIndex({ page: 1, limit: 6, popular: true }),
    getPublicReaderQuestionDigest(),
  ]);
  return (
    <main className="bg-mist text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="bg-ink px-4 py-12 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-200"><Newspaper className="size-4" /> Weekly digest</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-normal sm:text-5xl">Property questions Zimbabweans are asking this week.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">A practical digest for tenants, landlords, buyers, sellers, and families who want clearer property decisions.</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_24rem] lg:px-8">
        <div>
          <p className="section-eyebrow">Recommended reads</p>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            {blog.posts.map((post) => <BlogCard key={post.id} post={post} />)}
          </div>
        </div>
        <aside className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Reader questions</p>
            <div className="mt-3 space-y-3">
              {questions.questions.slice(0, 5).map((item) => (
                <article key={item.id} className="border-b border-slate-200 pb-3 last:border-0 dark:border-slate-800">
                  <p className="text-sm font-semibold text-ink dark:text-white">{item.question}</p>
                  {item.articleSlug ? <Link href={`/blog/${item.articleSlug}`} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">Read answer <ArrowRight className="size-4" /></Link> : null}
                </article>
              ))}
              {!questions.questions.length ? <p className="text-sm text-slate-500">Questions will appear here after admin review.</p> : null}
            </div>
          </div>
          <ReaderQuestionForm compact />
        </aside>
      </section>
    </main>
  );
}
