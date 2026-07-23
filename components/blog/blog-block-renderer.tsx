"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, Download, Home, MessageCircle, Search } from "lucide-react";
import type { BlogBlock } from "@/lib/blog/blog-repository";
import { cn } from "@/lib/utils";
import { CopyHeadingButton } from "@/components/blog/article-experience";

type DynamicListing = { id: string; slug: string; title: string; city: string; suburb: string; currency: string; price: unknown; bedrooms: number; propertyType: string; media?: Array<{ url: string }> };

export function BlogBlocks({ blocks, layout, postId, listings = [] }: { blocks: BlogBlock[]; layout: string; postId?: string; listings?: DynamicListing[] }) {
  return (
    <div className={cn("blog-prose", layout === "NEWS_ANNOUNCEMENT" && "blog-prose-news", layout === "LIST_ARTICLE" && "blog-prose-list")}>
      {blocks.map((block, index) => <BlogBlockView key={index} block={block} priority={index < 2} postId={postId} listings={listings} />)}
    </div>
  );
}

function BlogBlockView({ block, priority, postId, listings }: { block: BlogBlock; priority: boolean; postId?: string; listings: DynamicListing[] }) {
  switch (block.type) {
    case "heading": {
      const className = block.level === 3 ? "mt-9 text-2xl font-semibold tracking-tight text-ink dark:text-white" : "mt-12 text-3xl font-semibold tracking-tight text-ink dark:text-white";
      const id = anchorId(block.text);
      return block.level === 3 ? <h3 id={id} className={cn("group scroll-mt-24", className)}>{block.text}<CopyHeadingButton id={id} /></h3> : <h2 id={id} className={cn("group scroll-mt-24", className)}>{block.text}<CopyHeadingButton id={id} /></h2>;
    }
    case "paragraph":
      return <p className="mt-5 text-base leading-8 text-slate-700 dark:text-slate-300">{block.text}</p>;
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag className={cn("mt-5 space-y-2 pl-6 text-base leading-7 text-slate-700 dark:text-slate-300", block.ordered ? "list-decimal" : "list-disc")}>
          {block.items.map((item) => <li key={item}>{item}</li>)}
        </Tag>
      );
    }
    case "image":
      return (
        <figure className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="relative aspect-[16/9]">
            <Image src={block.url || "/images/houselink-hero.webp"} alt={block.alt} fill priority={priority} className="cursor-zoom-in object-cover" sizes="(min-width: 1024px) 760px, 100vw" data-blog-lightbox={block.url || "/images/houselink-hero.webp"} />
          </div>
          {block.caption ? <figcaption className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{block.caption}</figcaption> : null}
        </figure>
      );
    case "gallery":
      return (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {block.images.map((image) => (
            <div key={image.url} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900">
              <Image src={image.url || "/images/houselink-hero.webp"} alt={image.alt} fill className="cursor-zoom-in object-cover" sizes="(min-width: 768px) 380px, 100vw" data-blog-lightbox={image.url || "/images/houselink-hero.webp"} />
            </div>
          ))}
        </div>
      );
    case "video":
      return <video src={block.url} controls className="mt-8 aspect-video w-full rounded-lg bg-black" title={block.title} />;
    case "quote":
      return (
        <blockquote className="mt-8 rounded-lg border-l-4 border-emerald-500 bg-emerald-50 p-5 text-lg font-medium leading-8 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100">
          {block.text}
          {block.cite ? <cite className="mt-3 block text-sm not-italic text-emerald-800 dark:text-emerald-200">{block.cite}</cite> : null}
        </blockquote>
      );
    case "info":
      return (
        <div className={cn("mt-8 rounded-lg border p-5", block.tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100" : "border-cyan-200 bg-cyan-50 text-cyan-950 dark:border-cyan-900 dark:bg-cyan-950/25 dark:text-cyan-100")}>
          <div className="flex items-start gap-3">
            {block.tone === "warning" ? <AlertTriangle className="mt-1 size-5 shrink-0" /> : <Search className="mt-1 size-5 shrink-0" />}
            <div>
              {block.title ? <p className="font-semibold">{block.title}</p> : null}
              <p className="mt-1 text-sm leading-6 opacity-90">{block.text}</p>
            </div>
          </div>
        </div>
      );
    case "table":
      return (
        <div className="mt-8 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>{block.headers.map((header) => <th key={header} className="px-4 py-3 text-left font-semibold text-ink dark:text-white">{header}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {block.rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 text-slate-700 dark:text-slate-300">{cell}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      );
    case "download":
      return <Link href={block.url} onClick={() => { if (postId) void fetch("/api/v1/blog/downloads", { method: "POST", body: JSON.stringify({ postId, label: block.label, url: block.url }) }); }} className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-slate-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-900"><Download className="size-4" /> {block.label}</Link>;
    case "button":
      return <Link href={block.url} className="mt-6 inline-flex items-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500">{block.label}</Link>;
    case "propertyCard":
      return (
        <Link href={block.url} className="mt-8 grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[12rem_1fr]">
          <div className="relative aspect-[16/10] sm:aspect-auto">
            <Image src={block.imageUrl || "/images/houselink-hero.webp"} alt={block.title} fill className="object-cover" sizes="220px" />
          </div>
          <div className="p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Property link</p>
            <p className="mt-2 font-semibold text-ink dark:text-white">{block.title}</p>
            {block.meta ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{block.meta}</p> : null}
          </div>
        </Link>
      );
    case "dynamicProperty": {
      const listing = listings.find((item) => item.id === block.listingId);
      if (!listing) return null;
      return (
        <Link href={`/listings/${listing.slug}`} className="mt-8 grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[12rem_1fr]">
          <div className="relative aspect-[16/10] sm:aspect-auto">
            <Image src={listing.media?.[0]?.url || "/images/houselink-hero.webp"} alt={listing.title} fill className="object-cover" sizes="220px" />
          </div>
          <div className="p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Live property card</p>
            <p className="mt-2 font-semibold text-ink dark:text-white">{listing.title}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{listing.suburb}, {listing.city} · {listing.bedrooms} bed · {listing.propertyType.replace(/_/g, " ").toLowerCase()}</p>
            <p className="mt-3 font-semibold text-emerald-700 dark:text-emerald-300">{listing.currency} {Number(listing.price).toLocaleString()}</p>
          </div>
        </Link>
      );
    }
    case "cta":
      return <BlogCta block={block} />;
    default:
      return null;
  }
}

function BlogCta({ block }: { block: Extract<BlogBlock, { type: "cta" }> }) {
  const config = block.variant === "whatsapp"
    ? { href: "/contact", icon: MessageCircle, title: "Talk to HouseLink", text: "Need help with a property decision? Contact the HouseLink team.", label: "Contact HouseLink" }
    : block.variant === "rent"
      ? { href: "/rent/harare", icon: Home, title: "View houses for rent", text: "Browse current rental homes and rooms across Zimbabwe.", label: "View rentals" }
    : block.variant === "sale"
      ? { href: "/property-for-sale/harare", icon: Home, title: "View houses for sale", text: "Explore homes and property opportunities for sale.", label: "View homes for sale" }
    : block.variant === "roommate"
      ? { href: "/roommates", icon: MessageCircle, title: "Find a roommate", text: "Match with rooms and people that fit your lifestyle.", label: "Find a roommate" }
    : block.variant === "moving"
      ? { href: "/blog/category/moving-and-relocation", icon: Home, title: "Plan your move", text: "Use HouseLink relocation resources while moving services are prepared.", label: "Moving resources" }
    : block.variant === "agent"
      ? { href: "/become-agent", icon: MessageCircle, title: "Register as an agent", text: "Apply to join the HouseLink agent ecosystem.", label: "Become an agent" }
    : block.variant === "list-property"
      ? { href: "/dashboard/landlord/new", icon: Home, title: "List your property", text: "Reach tenants, buyers, and serious property seekers across Zimbabwe.", label: "List with HouseLink" }
      : { href: "/search", icon: Search, title: "Search current listings", text: "Browse available rentals, homes for sale, rooms, and verified listings.", label: "Search properties" };
  const Icon = config.icon;
  return (
    <div className="mt-10 rounded-lg bg-ink p-5 text-white shadow-soft">
      <Icon className="size-6 text-emerald-300" />
      <p className="mt-3 text-xl font-semibold">{block.title || config.title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{block.text || config.text}</p>
      <Link href={config.href} className="mt-4 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-emerald-50">{config.label}</Link>
    </div>
  );
}

export function anchorId(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
