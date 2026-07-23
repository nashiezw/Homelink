"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { ArrowRight, Columns3, LayoutGrid, List, Search, Sparkles, type LucideIcon } from "lucide-react";
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

type ListingLayout = "magazine" | "grid" | "list";

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
  const [listingLayout, setListingLayout] = useState<ListingLayout>("grid");
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
    <div className="space-y-7 sm:space-y-10">
      <section className="rounded-lg border border-emerald-100 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              <Sparkles className="size-3.5" />
              Find articles
            </p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center lg:grid-cols-[1fr_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => void suggest(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void load(1);
              }}
              placeholder="Search articles"
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
          <div className="grid grid-cols-[1fr_auto] gap-2 sm:flex sm:flex-wrap">
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
              <option value="">All categories</option>
              {data.categories.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
            </select>
            <Button className="px-4" onClick={() => void load(1)} disabled={loading}>Search</Button>
          </div>
        </div>
        {activeCategoryName ? <p className="mt-3 text-sm text-slate-500">Filtering by {activeCategoryName}</p> : null}
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="section-eyebrow">Latest articles</p>
            <h2 className="mt-2 text-2xl font-bold tracking-normal text-ink dark:text-white sm:text-4xl">Latest HouseLink blogs.</h2>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <p className="mr-auto text-sm text-slate-500 sm:mr-1">{data.total} article{data.total === 1 ? "" : "s"}</p>
            <LayoutButton active={listingLayout === "grid"} label="Grid" icon={LayoutGrid} onClick={() => setListingLayout("grid")} />
            <LayoutButton active={listingLayout === "list"} label="List" icon={List} onClick={() => setListingLayout("list")} />
            <LayoutButton active={listingLayout === "magazine"} label="Feature" icon={Columns3} onClick={() => setListingLayout("magazine")} />
          </div>
        </div>
        {data.posts.length ? (
          <div className="mt-4 sm:mt-5">
            <ArticleListing posts={data.posts} layout={listingLayout} />
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
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
    </div>
  );
}

function ArticleListing({ posts, layout }: { posts: BlogPost[]; layout: ListingLayout }) {
  if (layout === "list") {
    return (
      <div className="grid gap-3">
        {posts.map((post) => <ListArticleCard key={post.id} post={post} />)}
      </div>
    );
  }
  if (layout === "grid") {
    return (
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {posts.map((post) => <BlogCard key={post.id} post={post} />)}
      </div>
    );
  }
  const [lead, ...rest] = posts;
  return (
      <div className="grid gap-4 sm:gap-5">
      {lead ? <BlogCard post={lead} featured /> : null}
      {rest.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {rest.map((post) => <BlogCard key={post.id} post={post} />)}
        </div>
      ) : null}
    </div>
  );
}

function ListArticleCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group grid gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-emerald-300 hover:shadow-soft dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[9rem_1fr_auto] sm:items-center">
      <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
        <Image src={post.featuredImageUrl || "/images/houselink-hero.webp"} alt={post.featuredImageAlt || post.title} fill className="object-cover transition duration-500 group-hover:scale-105" sizes="(min-width: 640px) 176px, 100vw" />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{post.category?.name ?? "HouseLink Resources"}</p>
        <h3 className="mt-1 text-base font-semibold leading-tight text-ink group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-300 sm:text-lg">{post.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{post.excerpt}</p>
      </div>
      <span className="inline-flex min-h-9 w-fit items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white sm:self-center">
        Read
        <ArrowRight className="size-4" />
      </span>
    </Link>
  );
}

function LayoutButton({ active, label, icon: Icon, onClick }: { active: boolean; label: string; icon: LucideIcon; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-ink px-2.5 py-2 text-xs font-semibold text-white dark:bg-emerald-500 dark:text-ink sm:min-h-10 sm:px-3" : "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 sm:min-h-10 sm:px-3"}
    >
      <Icon className="size-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
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
