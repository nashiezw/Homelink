"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Building2, MessageCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { BlogCard } from "@/components/blog/blog-card";

type BlogIndexData = {
  posts: BlogPost[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  categories: Array<{ id: string; name: string; slug: string; description?: string | null }>;
  featured?: BlogPost | null;
  popular: BlogPost[];
  editorsPicks: BlogPost[];
  recentlyUpdated: BlogPost[];
  latestNews: BlogPost[];
  trendingTopics: Array<{ id: string; name: string; slug: string; _count?: { posts: number } }>;
};

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImageUrl?: string | null;
  featuredImageAlt?: string | null;
  readTimeMinutes: number;
  publishedAt?: string | null;
  category?: { name: string; slug: string } | null;
  author?: { name: string } | null;
};

export function BlogIndexClient({ initialData }: { initialData: BlogIndexData }) {
  const [data, setData] = useState(initialData);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<{ articles: Array<{ title: string; slug: string; excerpt: string }>; categories: Array<{ name: string; slug: string }>; tags: Array<{ name: string; slug: string }>; authors: Array<{ name: string; slug: string }> } | null>(null);

  async function load(nextPage = 1, append = false) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(nextPage), limit: String(data.limit) });
    if (query.trim()) params.set("q", query.trim());
    if (category) params.set("category", category);
    const result = await apiFetch<BlogIndexData>(`/api/v1/blog?${params.toString()}`);
    setLoading(false);
    if (result.data) {
      setData((current) => ({
        ...result.data!,
        posts: append ? [...current.posts, ...result.data!.posts] : result.data!.posts,
      }));
    }
  }

  async function suggest(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setSuggestions(null);
      return;
    }
    const result = await apiFetch<typeof suggestions>(`/api/v1/blog/suggestions?q=${encodeURIComponent(value)}`);
    if (result.data) setSuggestions(result.data);
  }

  const activeCategoryName = useMemo(() => data.categories.find((item) => item.slug === category)?.name, [category, data.categories]);

  return (
    <div className="space-y-12">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
        {data.featured ? (
          <div>
            <p className="section-eyebrow">Featured article</p>
            <div className="mt-3">
              <BlogCard post={data.featured} featured />
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="font-semibold text-ink dark:text-white">No published articles yet</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Published HouseLink resources will appear here after admin approval.</p>
          </div>
        )}
        <aside className="rounded-lg bg-ink p-5 text-white">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-200">Most Popular This Week</p>
          <div className="mt-4 space-y-3">
            {data.popular.length ? data.popular.map((post, index) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="block rounded-lg border border-white/10 bg-white/5 p-3 transition hover:bg-white/10">
                <span className="text-xs font-bold text-emerald-200">0{index + 1}</span>
                <p className="mt-1 text-sm font-semibold leading-5">{post.title}</p>
                <p className="mt-1 text-xs text-slate-400">{post.category?.name ?? "HouseLink Resources"}</p>
              </Link>
            )) : <p className="text-sm text-slate-300">Popular articles will appear once articles are marked popular or receive views.</p>}
          </div>
        </aside>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => void suggest(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void load(1);
              }}
              placeholder="Search titles, keywords, tags, categories, and article content"
              className="min-h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            {suggestions ? (
              <div className="absolute z-30 mt-2 w-full rounded-lg border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-950">
                {suggestions.articles.length ? <SuggestionGroup title="Articles" items={suggestions.articles.map((item) => ({ label: item.title, href: `/blog/${item.slug}` }))} query={query} /> : null}
                {suggestions.categories.length ? <SuggestionGroup title="Categories" items={suggestions.categories.map((item) => ({ label: item.name, href: `/blog/category/${item.slug}` }))} query={query} /> : null}
                {suggestions.tags.length ? <SuggestionGroup title="Tags" items={suggestions.tags.map((item) => ({ label: item.name, href: `/blog?tag=${item.slug}` }))} query={query} /> : null}
                {suggestions.authors.length ? <SuggestionGroup title="Authors" items={suggestions.authors.map((item) => ({ label: item.name, href: `/blog/author/${item.slug}` }))} query={query} /> : null}
              </div>
            ) : null}
          </label>
          <div className="flex flex-wrap gap-2">
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
              <option value="">All categories</option>
              {data.categories.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
            </select>
            <Button onClick={() => void load(1)} disabled={loading}>Search</Button>
          </div>
        </div>
        {activeCategoryName ? <p className="mt-3 text-sm text-slate-500">Filtering by {activeCategoryName}</p> : null}
      </section>

      <ResourceSection title="Editor's Picks" eyebrow="Curated by HouseLink" posts={data.editorsPicks} />
      <ResourceSection title="Recently Updated" eyebrow="Freshly reviewed" posts={data.recentlyUpdated} compact />

      <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="section-eyebrow">Trending Topics</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.trendingTopics.length ? data.trendingTopics.map((topic) => (
              <Link key={topic.id} href={`/blog?tag=${topic.slug}`} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                {topic.name}
              </Link>
            )) : <p className="text-sm text-slate-500">Topics will appear once articles are tagged.</p>}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="section-eyebrow">Latest Property News</p>
          <div className="mt-4 grid gap-3">
            {data.latestNews.length ? data.latestNews.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="rounded-lg bg-slate-50 p-3 text-sm font-semibold text-ink hover:bg-emerald-50 dark:bg-slate-950 dark:text-white">
                {post.title}
              </Link>
            )) : <p className="text-sm text-slate-500">HouseLink news will appear here when news articles are published.</p>}
          </div>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="section-eyebrow">Latest articles</p>
            <h2 className="section-title">Property resources for real decisions.</h2>
          </div>
          <p className="text-sm text-slate-500">{data.total} published article{data.total === 1 ? "" : "s"}</p>
        </div>
        {data.posts.length ? (
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {data.posts.map((post) => <BlogCard key={post.id} post={post} />)}
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="font-semibold text-ink dark:text-white">No matching articles found</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Try another keyword or clear the category filter.</p>
          </div>
        )}
        {data.hasMore ? (
          <div className="mt-7 text-center">
            <Button variant="secondary" onClick={() => void load(data.page + 1, true)} disabled={loading}>Load More</Button>
          </div>
        ) : null}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <ResourceCta icon={Search} title="Find current property listings" text="Search rentals, rooms, boarding houses, homes for sale, and verified property opportunities across Zimbabwe." href="/search" label="Search properties" />
        <ResourceCta icon={Building2} title="Own a property?" text="List your property with HouseLink and reach serious renters, buyers, students, and managed-property clients." href="/dashboard/landlord/new" label="List your property" />
      </section>

      <section className="rounded-lg bg-gradient-to-r from-ink via-emerald-950 to-cyan-950 p-6 text-white sm:p-8">
        <MessageCircle className="size-7 text-emerald-300" />
        <h2 className="mt-4 text-2xl font-semibold">Get property tips and HouseLink updates.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Join the HouseLink WhatsApp or newsletter flow for practical property resources, listing updates, and marketplace guidance.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/contact" className="inline-flex min-h-11 items-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-emerald-50">Join WhatsApp updates</Link>
          <Link href="/contact" className="inline-flex min-h-11 items-center rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">Ask a property question</Link>
        </div>
      </section>
    </div>
  );
}

function ResourceSection({ title, eyebrow, posts, compact = false }: { title: string; eyebrow: string; posts: BlogPost[]; compact?: boolean }) {
  if (!posts.length) return null;
  return (
    <section>
      <p className="section-eyebrow">{eyebrow}</p>
      <h2 className="section-title">{title}</h2>
      <div className={compact ? "mt-5 grid gap-4 md:grid-cols-4" : "mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4"}>
        {posts.map((post) => <BlogCard key={post.id} post={post} />)}
      </div>
    </section>
  );
}

function SuggestionGroup({ title, items, query }: { title: string; items: Array<{ label: string; href: string }>; query: string }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{title}</p>
      {items.map((item) => <Link key={item.href} href={item.href} className="block rounded-md px-2 py-1.5 text-sm font-semibold text-slate-700 hover:bg-emerald-50 dark:text-slate-200 dark:hover:bg-emerald-950">{highlight(item.label, query)}</Link>)}
    </div>
  );
}

function highlight(label: string, query: string) {
  const index = label.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0 || !query) return label;
  return <>{label.slice(0, index)}<mark className="rounded bg-emerald-100 px-0.5 text-emerald-900">{label.slice(index, index + query.length)}</mark>{label.slice(index + query.length)}</>;
}

function ResourceCta({ icon: Icon, title, text, href, label }: { icon: typeof Search; title: string; text: string; href: string; label: string }) {
  return (
    <Link href={href} className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <Icon className="size-6 text-emerald-700 dark:text-emerald-300" />
      <h3 className="mt-4 text-xl font-semibold text-ink dark:text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
        {label}
        <ArrowRight className="size-4 transition group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
