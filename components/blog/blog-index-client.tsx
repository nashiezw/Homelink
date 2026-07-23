"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, Building2, CheckCircle2, Columns3, LayoutGrid, List, MessageCircle, Search, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";
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
  const [listingLayout, setListingLayout] = useState<ListingLayout>("magazine");
  const [showSidebar, setShowSidebar] = useState(true);
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
    <div className="space-y-14">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)] lg:items-stretch">
        {data.featured ? (
          <EditorialFeature post={data.featured} />
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="font-semibold text-ink dark:text-white">No published articles yet</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Published HouseLink resources will appear here after admin approval.</p>
          </div>
        )}
        <aside className="rounded-lg bg-ink p-5 text-white shadow-hero">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-200">
            <TrendingUp className="size-4" />
            Most Popular This Week
          </p>
          <div className="mt-4 space-y-3">
            {data.popular.length ? data.popular.map((post, index) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="block rounded-lg border border-white/10 bg-white/5 p-3 transition hover:bg-white/10">
                <span className="text-xs font-bold text-emerald-200">0{index + 1}</span>
                <p className="mt-1 text-sm font-semibold leading-5">{post.title}</p>
                <p className="mt-1 text-xs text-slate-400">{post.category?.name ?? "HouseLink Resources"}</p>
              </Link>
            )) : <p className="text-sm text-slate-300">Popular articles will appear once articles are marked popular or receive views.</p>}
          </div>
          <div className="mt-5 rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-4">
            <p className="text-sm font-semibold text-white">Need a property answer now?</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">Search the resource centre or jump straight into available listings.</p>
            <Link href="/search" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-200">
              Search listings
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </aside>
      </section>

      <section className="rounded-lg border border-emerald-100 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              <Sparkles className="size-3.5" />
              Resource Finder
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Search guides, categories, tags, and practical HouseLink content.</p>
          </div>
        </div>
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

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.categories.slice(0, 8).map((item) => (
          <Link key={item.id} href={`/blog/category/${item.slug}`} className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-emerald-950/20">
            <span className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <BookOpen className="size-4" />
            </span>
            <p className="mt-3 font-semibold text-ink dark:text-white">{item.name}</p>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500 dark:text-slate-400">{item.description || "HouseLink property guidance and practical next steps."}</p>
          </Link>
        ))}
      </section>

      <ResourceSection title="Editor's Picks" eyebrow="Curated by HouseLink" posts={data.editorsPicks} variant="mosaic" />
      <ResourceSection title="Recently Updated" eyebrow="Freshly reviewed" posts={data.recentlyUpdated} compact />

      <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="section-eyebrow">Trending Topics</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.trendingTopics.length ? data.trendingTopics.map((topic) => (
              <Link key={topic.id} href={`/blog?tag=${topic.slug}`} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                {topic.name}
              </Link>
            )) : <p className="text-sm text-slate-500">Topics will appear once articles are tagged.</p>}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
            <h2 className="section-title">A newsroom for the property journey.</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-1 text-sm text-slate-500">{data.total} published article{data.total === 1 ? "" : "s"}</p>
            <LayoutButton active={listingLayout === "magazine"} label="Magazine" icon={Columns3} onClick={() => setListingLayout("magazine")} />
            <LayoutButton active={listingLayout === "grid"} label="Grid" icon={LayoutGrid} onClick={() => setListingLayout("grid")} />
            <LayoutButton active={listingLayout === "list"} label="List" icon={List} onClick={() => setListingLayout("list")} />
            <button
              type="button"
              onClick={() => setShowSidebar((value) => !value)}
              className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              {showSidebar ? "Hide sidebar" : "Show sidebar"}
            </button>
          </div>
        </div>
        {data.posts.length ? (
          <div className={showSidebar ? "mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]" : "mt-6"}>
            <ArticleListing posts={data.posts} layout={listingLayout} />
            {showSidebar ? <ResourceSidebar categories={data.categories} trendingTopics={data.trendingTopics} popular={data.popular} /> : null}
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

      <section className="relative overflow-hidden rounded-lg bg-gradient-to-r from-ink via-emerald-950 to-cyan-950 p-6 text-white shadow-hero sm:p-8">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:34px_34px]" />
        <div className="relative">
        <MessageCircle className="size-7 text-emerald-300" />
        <h2 className="mt-4 text-2xl font-semibold">Get property tips and HouseLink updates.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Join the HouseLink WhatsApp or newsletter flow for practical property resources, listing updates, and marketplace guidance.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/contact" className="inline-flex min-h-11 items-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-emerald-50">Join WhatsApp updates</Link>
          <Link href="/contact" className="inline-flex min-h-11 items-center rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">Ask a property question</Link>
        </div>
        </div>
      </section>
    </div>
  );
}

function EditorialFeature({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group grid overflow-hidden rounded-lg bg-ink text-white shadow-hero lg:grid-cols-[0.9fr_1.1fr]">
      <div className="relative min-h-[22rem]">
        <Image src={post.featuredImageUrl || "/images/houselink-hero.webp"} alt={post.featuredImageAlt || post.title} fill className="object-cover transition duration-700 group-hover:scale-105" sizes="(min-width: 1024px) 520px, 100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent lg:bg-gradient-to-r" />
      </div>
      <div className="flex flex-col justify-between p-5 sm:p-7">
        <div>
          <p className="inline-flex rounded-full bg-emerald-300/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-200">Lead story</p>
          <h2 className="mt-5 text-3xl font-black leading-tight tracking-normal sm:text-5xl">{post.title}</h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">{post.excerpt}</p>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{post.category?.name ?? "HouseLink Resources"} | {post.readTimeMinutes} min read</span>
          <span className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-ink">
            Read feature
            <ArrowRight className="size-4" />
          </span>
        </div>
      </div>
    </Link>
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
    <div className="grid gap-5">
      {lead ? <BlogCard post={lead} featured /> : null}
      {rest.length ? (
        <div className="grid gap-5 md:grid-cols-2">
          {rest.map((post) => <BlogCard key={post.id} post={post} />)}
        </div>
      ) : null}
    </div>
  );
}

function ListArticleCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group grid gap-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-emerald-300 hover:shadow-soft dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[11rem_1fr_auto] sm:items-center">
      <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
        <Image src={post.featuredImageUrl || "/images/houselink-hero.webp"} alt={post.featuredImageAlt || post.title} fill className="object-cover transition duration-500 group-hover:scale-105" sizes="(min-width: 640px) 176px, 100vw" />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{post.category?.name ?? "HouseLink Resources"}</p>
        <h3 className="mt-1 text-lg font-semibold leading-tight text-ink group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-300">{post.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{post.excerpt}</p>
      </div>
      <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white sm:self-center">
        Read
        <ArrowRight className="size-4" />
      </span>
    </Link>
  );
}

function ResourceSidebar({ categories, trendingTopics, popular }: { categories: BlogIndexData["categories"]; trendingTopics: BlogIndexData["trendingTopics"]; popular: BlogPost[] }) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Browse by need</p>
        <div className="mt-3 grid gap-2">
          {categories.slice(0, 6).map((item) => (
            <Link key={item.id} href={`/blog/category/${item.slug}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-ink hover:bg-emerald-50 dark:bg-slate-950 dark:text-white dark:hover:bg-emerald-950/30">
              {item.name}
              <ArrowRight className="size-4 text-emerald-600" />
            </Link>
          ))}
        </div>
      </div>
      <div className="rounded-lg bg-ink p-4 text-white shadow-soft">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-200">Editorial desk</p>
        <p className="mt-3 text-lg font-semibold leading-tight">Find a home, protect the deal, then move with confidence.</p>
        <Link href="/contact" className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-ink">Ask HouseLink</Link>
      </div>
      {trendingTopics.length ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Trending</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {trendingTopics.slice(0, 8).map((topic) => (
              <Link key={topic.id} href={`/blog?tag=${topic.slug}`} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{topic.name}</Link>
            ))}
          </div>
        </div>
      ) : null}
      {popular.length ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Top reads</p>
          <div className="mt-3 space-y-3">
            {popular.slice(0, 3).map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="block text-sm font-semibold leading-5 text-ink hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300">{post.title}</Link>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function LayoutButton({ active, label, icon: Icon, onClick }: { active: boolean; label: string; icon: LucideIcon; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white dark:bg-emerald-500 dark:text-ink" : "inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

function ResourceSection({ title, eyebrow, posts, compact = false, variant = "grid" }: { title: string; eyebrow: string; posts: BlogPost[]; compact?: boolean; variant?: "grid" | "mosaic" }) {
  if (!posts.length) return null;
  if (variant === "mosaic") {
    const [lead, ...rest] = posts;
    return (
      <section>
        <p className="section-eyebrow">{eyebrow}</p>
        <h2 className="section-title">{title}</h2>
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.72fr)]">
          {lead ? <BlogCard post={lead} featured /> : null}
          <div className="grid gap-4">
            {rest.slice(0, 3).map((post) => <ListArticleCard key={post.id} post={post} />)}
          </div>
        </div>
      </section>
    );
  }
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
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <Icon className="size-5" />
        </span>
        <CheckCircle2 className="ml-auto size-5 text-emerald-500" />
      </div>
      <h3 className="mt-4 text-xl font-semibold text-ink dark:text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
        {label}
        <ArrowRight className="size-4 transition group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
