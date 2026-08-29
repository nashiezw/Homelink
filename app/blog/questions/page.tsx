import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, HelpCircle } from "lucide-react";
import { ReaderQuestionForm } from "@/components/blog/reader-question-form";
import { getPublicReaderQuestionDigest } from "@/lib/blog/blog-repository";

export const metadata: Metadata = {
  title: "Ask HouseLink | Zimbabwe Property Questions",
  description: "Send HouseLink your Zimbabwe property question and browse reader questions that become practical blog guides.",
  alternates: { canonical: "/blog/questions" },
};

export const revalidate = 900;

export default async function BlogQuestionsPage() {
  const data = await getPublicReaderQuestionDigest();
  return (
    <main className="bg-mist text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="bg-ink px-4 py-12 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-200"><HelpCircle className="size-4" /> Ask HouseLink</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-normal sm:text-5xl">Real property questions from Zimbabwean readers.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">Ask about rent, deposits, title deeds, cession, inheritance, selling, suburbs, moving, agents, or property documents. We turn useful questions into clear articles.</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
        <ReaderQuestionForm />
        <aside className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Editorial pipeline</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink dark:text-white">Questions being answered</h2>
          <div className="mt-4 space-y-3">
            {data.questions.length ? data.questions.map((item) => (
              <article key={item.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <p className="text-sm font-semibold text-ink dark:text-white">{item.question}</p>
                <p className="mt-1 text-xs text-slate-500">{item.city || "Zimbabwe"} - {item.status.toLowerCase()}</p>
                {item.articleSlug ? <Link href={`/blog/${item.articleSlug}`} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">Read answer <ArrowRight className="size-4" /></Link> : null}
              </article>
            )) : <p className="text-sm leading-6 text-slate-500">No public reader questions yet. Send the first one.</p>}
          </div>
        </aside>
      </section>
    </main>
  );
}
