"use client";

import { ArrowLeft, Download, ExternalLink, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { HouseLinkBrand } from "@/components/brand/houselink-logo";
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
  const { funnel, product } = resolved;

  function trackSampleViewed() {
    trackEvent("library_sample_viewed", product.id, {
      funnelId: funnel.id,
      funnelSlug: funnel.slug,
      productSlug: product.slug,
      surface: "sales_funnel_sample_page",
    });
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#07111f] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#07111f]/95 px-3 py-3 backdrop-blur sm:px-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link href={funnelUrl} className="inline-flex min-h-10 items-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-white/75 transition hover:text-white">
            <ArrowLeft className="size-4" /> Back to offer
          </Link>
          <HouseLinkBrand variant="nav" className="hidden rounded-2xl bg-white px-3 py-2 shadow-[0_12px_30px_rgba(0,0,0,0.24)] sm:inline-flex" />
          <div className="flex items-center gap-2">
            <a href={sampleUrl} target="_blank" rel="noopener noreferrer" className="hidden min-h-10 items-center justify-center gap-2 border border-white/15 px-3 py-2 text-xs font-black uppercase text-white transition hover:bg-white/10 sm:inline-flex">
              <ExternalLink className="size-4" /> Open PDF
            </a>
            <a href={sampleDownloadUrl} className="hidden min-h-10 items-center justify-center gap-2 border border-white/15 px-3 py-2 text-xs font-black uppercase text-white transition hover:bg-white/10 sm:inline-flex">
              <Download className="size-4" /> Download
            </a>
            <Link href={`${funnelUrl}#funnel-offer`} className="inline-flex min-h-10 items-center gap-2 bg-[#0b8f54] px-3 py-2 text-xs font-black uppercase text-white shadow-[0_5px_0_rgba(0,0,0,0.32)] transition hover:-translate-y-0.5 hover:bg-[#087044] sm:px-4">
              <ShoppingCart className="size-4" /> Get guide
            </Link>
          </div>
        </div>
      </header>

      <section className="flex min-h-0 flex-1 flex-col px-0 py-0 sm:px-5 sm:py-5">
        <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden bg-white shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:border sm:border-white/10">
          <div className="border-b border-slate-200 bg-white px-4 py-3 text-[#0d1422]">
            <p className="truncate text-sm font-black">{product.title}</p>
            <div className="mt-2 flex gap-2 sm:hidden">
              <a href={sampleUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 border border-slate-200 px-3 py-2 text-[0.68rem] font-black uppercase text-slate-700">
                <ExternalLink className="size-4" /> Open PDF
              </a>
              <a href={sampleDownloadUrl} className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 border border-slate-200 px-3 py-2 text-[0.68rem] font-black uppercase text-slate-700">
                <Download className="size-4" /> Download
              </a>
            </div>
          </div>
          <PdfSampleViewer url={sampleUrl} title={product.title} onViewed={trackSampleViewed} />
        </div>
      </section>
    </main>
  );
}
