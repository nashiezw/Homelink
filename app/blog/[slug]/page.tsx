import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Home, MessageCircle, Search, Share2 } from "lucide-react";
import { BlogBlocks } from "@/components/blog/blog-block-renderer";
import { BlogCard, formatDate } from "@/components/blog/blog-card";
import { ArticleActions, ImageLightbox, ReadingProgress, RecentlyViewedArticles, RecentlyViewedTracker } from "@/components/blog/article-experience";
import { getCanonicalSiteUrl } from "@/lib/seo/site-url";
import { getPublicBlogPost, type BlogBlock } from "@/lib/blog/blog-repository";
import { anchorId } from "@/lib/blog/anchors";

type Props = { params: Promise<{ slug: string }> };

const siteUrl = getCanonicalSiteUrl();

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicBlogPost(slug);
  if (!data) return {};
  const { post } = data;
  const title = post.seoTitle || post.title;
  const description = post.metaDescription || post.excerpt;
  const image = post.socialImageUrl || post.featuredImageUrl || "/images/houselink-hero.webp";
  return {
    title,
    description,
    alternates: { canonical: post.canonicalUrl || `/blog/${post.slug}` },
    robots: post.noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [post.author?.name ?? "HouseLink Editorial Team"],
      images: [{ url: image }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export const dynamic = "force-dynamic";

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const data = await getPublicBlogPost(slug, true);
  if (!data) notFound();
  const { post, related, relatedListings, relatedCategories, authorArticleCount, previous, next } = data;
  const blocks = Array.isArray(post.contentBlocks) ? post.contentBlocks as BlogBlock[] : [];
  const toc = blocks.filter((block): block is Extract<BlogBlock, { type: "heading" }> => block.type === "heading");
  const url = `${siteUrl}/blog/${post.slug}`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: post.featuredImageUrl ? [absoluteUrl(post.featuredImageUrl)] : [`${siteUrl}/images/houselink-hero.webp`],
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { "@type": "Person", name: post.author?.name ?? "HouseLink Editorial Team" },
    publisher: { "@type": "Organization", name: "HouseLink Zimbabwe", logo: { "@type": "ImageObject", url: `${siteUrl}/icon.png` } },
    mainEntityOfPage: url,
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };
  const faqEntities = blocks
    .filter((block): block is Extract<BlogBlock, { type: "info" }> => block.type === "info" && Boolean(block.title) && Boolean(block.text))
    .slice(0, 6)
    .map((block) => ({ "@type": "Question", name: block.title, acceptedAnswer: { "@type": "Answer", text: block.text } }));
  const faqSchema = faqEntities.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqEntities } : null;

  return (
    <main className="bg-mist text-slate-950 dark:bg-slate-950 dark:text-white">
      <ReadingProgress />
      <ImageLightbox />
      <RecentlyViewedTracker article={{ title: post.title, slug: post.slug }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }} />
      {faqSchema ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} /> : null}

      <section className="bg-ink text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <nav className="flex flex-wrap gap-2 text-sm text-slate-300" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-white">Blog</Link>
            {post.category ? <><span>/</span><Link href={`/blog/category/${post.category.slug}`} className="hover:text-white">{post.category.name}</Link></> : null}
          </nav>
          <div className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              {post.category ? <Link href={`/blog/category/${post.category.slug}`} className="inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-200">{post.category.name}</Link> : null}
              <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-normal sm:text-5xl lg:text-6xl">{post.title}</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">{post.excerpt}</p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-300">
                {post.author?.slug ? <Link href={`/blog/author/${post.author.slug}`} className="hover:text-white">{post.author.name}</Link> : <span>{post.author?.name ?? "HouseLink Editorial Team"}</span>}
                <span>{formatDate(post.publishedAt)}</span>
                <span>Updated {formatDate(post.updatedAt)}</span>
                <span>{post.readTimeMinutes} min read</span>
              </div>
            </div>
            <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-slate-900 shadow-2xl">
              <Image src={post.featuredImageUrl || "/images/houselink-hero.webp"} alt={post.featuredImageAlt || post.title} fill priority className="object-cover" sizes="(min-width: 1024px) 560px, 100vw" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[16rem_minmax(0,48rem)_18rem] lg:px-8">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Table of contents</p>
            <div className="mt-3 space-y-2">
              {toc.length ? toc.map((item) => <a key={item.text} href={`#${anchorId(item.text)}`} className="block text-sm text-slate-600 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300">{item.text}</a>) : <p className="text-sm text-slate-500">This article is a short read.</p>}
            </div>
          </div>
        </aside>

        <article className="min-w-0">
          <ArticleActions title={post.title} url={url} />
          <div className="mb-8 flex flex-wrap gap-2">
            <ShareLink href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} label="Facebook" />
            <ShareLink href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(post.title)}`} label="X" />
            <ShareLink href={`https://wa.me/?text=${encodeURIComponent(`${post.title} ${url}`)}`} label="WhatsApp" />
          </div>
          <BlogBlocks blocks={blocks} layout={post.layout} postId={post.id} listings={JSON.parse(JSON.stringify(relatedListings))} />
          <AuthorBox post={post} articleCount={authorArticleCount} />
        </article>

        <aside className="space-y-4">
          <ArticleCta href="/search" icon={Search} title="Search properties" />
          <ArticleCta href="/dashboard/landlord/new" icon={Home} title="List your property" />
          <ArticleCta href="/contact" icon={MessageCircle} title="Contact HouseLink" />
          <RecentlyViewedArticles currentSlug={post.slug} />
        </aside>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="grid gap-3 border-y border-slate-200 py-6 dark:border-slate-800 sm:grid-cols-2">
          {previous ? <Link href={`/blog/${previous.slug}`} className="rounded-lg bg-white p-4 text-sm font-semibold text-ink hover:bg-emerald-50 dark:bg-slate-900 dark:text-white"><ArrowLeft className="mb-2 size-4" /> {previous.title}</Link> : <div />}
          {next ? <Link href={`/blog/${next.slug}`} className="rounded-lg bg-white p-4 text-right text-sm font-semibold text-ink hover:bg-emerald-50 dark:bg-slate-900 dark:text-white"><ArrowRight className="mb-2 ml-auto size-4" /> {next.title}</Link> : <div />}
        </div>
        {related.length ? (
          <div className="mt-10">
            <p className="section-eyebrow">Related articles</p>
            <h2 className="section-title">Keep reading</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {related.map((item) => <BlogCard key={item.id} post={item} />)}
            </div>
          </div>
        ) : null}
        {relatedListings.length ? (
          <div className="mt-10">
            <p className="section-eyebrow">Related property listings</p>
            <h2 className="section-title">Properties connected to this topic</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {relatedListings.map((listing) => (
                <Link key={listing.id} href={`/listings/${listing.slug}`} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900">
                  <div className="relative aspect-[16/10]">
                    <Image src={listing.media?.[0]?.url || "/images/houselink-hero.webp"} alt={listing.title} fill className="object-cover" sizes="360px" />
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-ink dark:text-white">{listing.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{listing.suburb}, {listing.city}</p>
                    <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{listing.currency} {Number(listing.price).toLocaleString()}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
        {relatedCategories.length ? (
          <div className="mt-10">
            <p className="section-eyebrow">Related categories</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {relatedCategories.map((category) => <Link key={category.id} href={`/blog/category/${category.slug}`} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">{category.name}</Link>)}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function ShareLink({ href, label }: { href: string; label: string }) {
  return <Link href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"><Share2 className="size-4" /> {label}</Link>;
}

function ArticleCta({ href, icon: Icon, title }: { href: string; icon: typeof Search; title: string }) {
  return <Link href={href} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-ink hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white"><Icon className="size-5 text-emerald-700 dark:text-emerald-300" /> {title}</Link>;
}

function AuthorBox({ post, articleCount }: { post: { author?: { name: string; slug?: string; bio?: string | null; role?: string | null; avatarUrl?: string | null } | null }; articleCount: number }) {
  return (
    <section className="mt-12 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Author</p>
      <div className="mt-3 flex gap-4">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
          {post.author?.avatarUrl ? <Image src={post.author.avatarUrl} alt={post.author.name} fill className="object-cover" /> : null}
        </div>
        <div>
          <p className="text-lg font-semibold text-ink dark:text-white">{post.author?.name ?? "HouseLink Editorial Team"}</p>
          {post.author?.role ? <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{post.author.role}</p> : null}
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{post.author?.bio ?? "Practical property guidance from HouseLink Zimbabwe."}</p>
          {post.author?.slug ? <Link href={`/blog/author/${post.author.slug}`} className="mt-3 inline-flex text-sm font-semibold text-emerald-700 dark:text-emerald-300">View {articleCount} article{articleCount === 1 ? "" : "s"} by this author</Link> : null}
        </div>
      </div>
    </section>
  );
}

function absoluteUrl(value: string) {
  return value.startsWith("http") ? value : `${siteUrl}${value}`;
}

function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
