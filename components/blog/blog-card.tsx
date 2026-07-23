import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";

type BlogCardPost = {
  title: string;
  slug: string;
  excerpt: string;
  featuredImageUrl?: string | null;
  featuredImageAlt?: string | null;
  readTimeMinutes: number;
  publishedAt?: string | Date | null;
  category?: { name: string; slug: string } | null;
  author?: { name: string } | null;
};

export function BlogCard({ post, featured = false }: { post: BlogCardPost; featured?: boolean }) {
  if (!featured) {
    return (
      <article className="group grid grid-cols-[7.25rem_1fr] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-emerald-300 hover:shadow-soft dark:border-slate-800 dark:bg-slate-900 sm:block">
        <Link href={`/blog/${post.slug}`} className="relative block min-h-[8.75rem] overflow-hidden bg-slate-100 dark:bg-slate-800 sm:aspect-[16/10] sm:min-h-0">
          <Image
            src={post.featuredImageUrl || "/images/houselink-hero.webp"}
            alt={post.featuredImageAlt || post.title}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(min-width: 1024px) 360px, 116px"
          />
        </Link>
        <div className="min-w-0 p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 sm:text-xs">
            {post.category ? (
              <Link href={`/blog/category/${post.category.slug}`} className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-200 sm:px-2.5 sm:py-1">
                {post.category.name}
              </Link>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {post.readTimeMinutes} min
            </span>
          </div>
          <Link href={`/blog/${post.slug}`}>
            <h2 className="mt-2 line-clamp-2 text-base font-bold leading-tight text-ink group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-300 sm:text-lg">
              {post.title}
            </h2>
          </Link>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300 sm:text-sm sm:leading-6">{post.excerpt}</p>
          <div className="mt-2 hidden flex-wrap items-center justify-between gap-3 sm:flex">
            <p className="text-xs text-slate-500">
              {post.author?.name ?? "HouseLink Editorial Team"} | {formatDate(post.publishedAt)}
            </p>
            <Link href={`/blog/${post.slug}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 dark:bg-emerald-500 dark:text-ink">
              Read
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </article>
    );
  }
  return (
    <article className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <Link href={`/blog/${post.slug}`} className="block">
        <div className={featured ? "relative aspect-[16/9] overflow-hidden bg-slate-100 dark:bg-slate-800" : "relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800"}>
          <Image
            src={post.featuredImageUrl || "/images/houselink-hero.webp"}
            alt={post.featuredImageAlt || post.title}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes={featured ? "(min-width: 1024px) 580px, 100vw" : "(min-width: 1024px) 360px, 100vw"}
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent opacity-0 transition group-hover:opacity-100" />
        </div>
      </Link>
      <div className={featured ? "p-5 sm:p-6" : "p-4"}>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {post.category ? (
            <Link href={`/blog/category/${post.category.slug}`} className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-200">
              {post.category.name}
            </Link>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {post.readTimeMinutes} min read
          </span>
        </div>
        <Link href={`/blog/${post.slug}`}>
          <h2 className={featured ? "mt-3 text-2xl font-semibold leading-tight text-ink group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-300" : "mt-3 text-lg font-semibold leading-tight text-ink group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-300"}>
            {post.title}
          </h2>
        </Link>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{post.excerpt}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {post.author?.name ?? "HouseLink Editorial Team"} | {formatDate(post.publishedAt)}
          </p>
          <Link href={`/blog/${post.slug}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 dark:bg-emerald-500 dark:text-ink">
            Read Article
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function formatDate(value?: string | Date | null) {
  if (!value) return "Draft";
  return new Intl.DateTimeFormat("en-ZW", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}
