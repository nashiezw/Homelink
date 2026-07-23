"use client";

/* eslint-disable @next/next/no-img-element -- The lightbox previews arbitrary uploaded article images that may not be in next/image remote patterns. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Copy, Mail, Printer, X } from "lucide-react";

type ViewedArticle = { title: string; slug: string };

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    function update() {
      const scrollTop = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(height > 0 ? Math.min(100, Math.max(0, (scrollTop / height) * 100)) : 0);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return <div className="fixed inset-x-0 top-0 z-[90] h-1 bg-transparent print:hidden"><div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} /></div>;
}

export function ArticleActions({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mb-8 flex flex-wrap gap-2 print:hidden">
      <button type="button" onClick={() => { void navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Copied" : "Copy link"}
      </button>
      <button type="button" onClick={() => window.print()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
        <Printer className="size-4" />
        Print
      </button>
      <Link href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
        <Mail className="size-4" />
        Email
      </Link>
    </div>
  );
}

export function RecentlyViewedTracker({ article }: { article: ViewedArticle }) {
  useEffect(() => {
    const key = "houselink_recent_blog_articles";
    const current = JSON.parse(localStorage.getItem(key) || "[]") as ViewedArticle[];
    const next = [article, ...current.filter((item) => item.slug !== article.slug)].slice(0, 5);
    localStorage.setItem(key, JSON.stringify(next));
  }, [article]);
  return null;
}

export function RecentlyViewedArticles({ currentSlug }: { currentSlug: string }) {
  const [items, setItems] = useState<ViewedArticle[]>([]);
  useEffect(() => {
    const current = JSON.parse(localStorage.getItem("houselink_recent_blog_articles") || "[]") as ViewedArticle[];
    setItems(current.filter((item) => item.slug !== currentSlug).slice(0, 4));
  }, [currentSlug]);
  if (!items.length) return null;
  return (
    <section className="mt-10 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Recently viewed</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => <Link key={item.slug} href={`/blog/${item.slug}`} className="block text-sm font-semibold text-ink hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300">{item.title}</Link>)}
      </div>
    </section>
  );
}

export function ImageLightbox() {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const image = target?.closest("[data-blog-lightbox]") as HTMLElement | null;
      const url = image?.getAttribute("data-blog-lightbox");
      if (url) setSrc(url);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  if (!src) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4" onClick={() => setSrc(null)}>
      <button type="button" className="absolute right-4 top-4 rounded-full bg-white p-2 text-ink" onClick={() => setSrc(null)} aria-label="Close image preview"><X className="size-5" /></button>
      <img src={src} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
    </div>
  );
}

export function CopyHeadingButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        const url = `${window.location.origin}${window.location.pathname}#${id}`;
        void navigator.clipboard?.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="ml-2 inline-flex align-middle text-slate-400 opacity-0 transition group-hover:opacity-100"
      aria-label="Copy heading link"
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
    </button>
  );
}
