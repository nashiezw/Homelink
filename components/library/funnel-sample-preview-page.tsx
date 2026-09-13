"use client";

import { ArrowLeft, Download, ExternalLink, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { HouseLinkBrand } from "@/components/brand/houselink-logo";
import { BookCover } from "@/components/library/book-cover";
import { PdfSampleViewer } from "@/components/library/pdf-sample-viewer";
import { trackEvent } from "@/lib/analytics/client";
import type { ResolvedLibrarySalesFunnel } from "@/lib/library/funnels";

type FunnelSamplePreviewPageProps = {
  resolved: ResolvedLibrarySalesFunnel;
  sampleUrl: string;
  sampleDownloadUrl: string;
  funnelUrl: string;
};

export function FunnelSamplePreviewPage({ resolved, sampleUrl, sampleDownloadUrl, funnelUrl }: FunnelSamplePreviewPageProps) {
  const { funnel, product, minPrice } = resolved;
  const heroImage = funnel.heroImageUrl || product.gallery.find((item) => item.kind === "mockup")?.url || product.gallery.find((item) => item.kind === "cover")?.url || product.seoImageUrl || "";

  function trackSampleViewed() {
    trackEvent("library_sample_viewed", product.id, {
      funnelId: funnel.id,
      funnelSlug: funnel.slug,
      productSlug: product.slug,
      surface: "sales_funnel_sample_page",
    });
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <section className="border-b border-white/10 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <Link href={funnelUrl} className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-white/75 transition hover:text-white">
            <ArrowLeft className="size-4" /> Back to offer
          </Link>
          <HouseLinkBrand variant="nav" className="rounded-2xl bg-white px-3 py-2 shadow-[0_12px_30px_rgba(0,0,0,0.24)]" />
          <Link href={`${funnelUrl}#funnel-offer`} className="inline-flex items-center gap-2 bg-[#0b8f54] px-4 py-2 text-xs font-black uppercase text-white shadow-[0_6px_0_rgba(0,0,0,0.32)] transition hover:-translate-y-0.5 hover:bg-[#087044]">
            <ShoppingCart className="size-4" /> Get guide
          </Link>
        </div>
      </section>

      <section className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
          <aside className="border border-white/10 bg-white/[0.04] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
            <div className="grid place-items-center bg-[#0b8f54] p-4">
              <BookCover product={product} imageUrl={heroImage} interactive={false} className="w-full max-w-[12rem] shadow-[10px_10px_0_rgba(0,0,0,0.24)]" />
            </div>
            <p className="mt-5 text-[0.68rem] font-black uppercase tracking-[0.2em] text-[#20c36b]">Sample preview</p>
            <h1 className="mt-2 text-2xl font-black uppercase leading-tight">See what&apos;s inside before you buy.</h1>
            <p className="mt-3 text-sm font-bold leading-6 text-white/75">
              Preview a few pages, then return to the funnel when you are ready to get the guide from {product.currency} {minPrice.toFixed(2)}.
            </p>
            <div className="mt-5 grid gap-2">
              <Link href={`${funnelUrl}#funnel-offer`} className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#0b8f54] px-4 py-2 text-sm font-black uppercase text-white shadow-[0_6px_0_rgba(0,0,0,0.32)] transition hover:-translate-y-0.5 hover:bg-[#087044]">
                <ShoppingCart className="size-4" /> Get the property guide
              </Link>
              <a href={sampleUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 border border-white/15 px-4 py-2 text-xs font-black uppercase text-white transition hover:bg-white/10">
                <ExternalLink className="size-4" /> Open PDF
              </a>
              <a href={sampleDownloadUrl} className="inline-flex min-h-10 items-center justify-center gap-2 border border-white/15 px-4 py-2 text-xs font-black uppercase text-white transition hover:bg-white/10">
                <Download className="size-4" /> Download sample
              </a>
            </div>
          </aside>

          <div className="min-h-[70dvh] overflow-hidden border border-white/10 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="border-b border-slate-200 bg-white px-4 py-3 text-[#0d1422]">
              <p className="truncate text-sm font-black">{product.title}</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">Loading the sample preview inside HouseLink.</p>
            </div>
            <PdfSampleViewer url={sampleUrl} title={product.title} onViewed={trackSampleViewed} />
          </div>
        </div>
      </section>
    </main>
  );
}
