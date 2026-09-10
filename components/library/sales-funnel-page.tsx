"use client";

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CreditCard,
  FileText,
  HelpCircle,
  Lock,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Timer,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { BookCover } from "@/components/library/book-cover";
import { PdfSampleViewer } from "@/components/library/pdf-sample-viewer";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics/client";
import { getOrCreateSessionId, getOrCreateVisitorId, readUtmParams } from "@/lib/analytics/visitor-client";
import {
  notifyLibraryCartAdded,
  repriceLibraryCartLine,
  sameLibraryCartLine,
  trackLibraryCartEvent,
  useLibraryCart,
} from "@/lib/library/cart-client";
import type { ResolvedLibrarySalesFunnel } from "@/lib/library/funnels";
import { cn } from "@/lib/utils";

type SalesFunnelPageProps = {
  resolved: ResolvedLibrarySalesFunnel;
  sampleUrl: string | null;
};

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

export function SalesFunnelPage({ resolved, sampleUrl }: SalesFunnelPageProps) {
  const { funnel, product, formats, offerExpired, minPrice } = resolved;
  const { setCart } = useLibraryCart();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const heroImage = funnel.heroImageUrl || product.gallery.find((item) => item.kind === "mockup")?.url || product.gallery.find((item) => item.kind === "cover")?.url || product.seoImageUrl || "";
  const digitalFormats = formats.filter((format) => format.type !== "PRINTED_BOOK");
  const printedFormats = formats.filter((format) => format.type === "PRINTED_BOOK");
  const formatChoices = [...digitalFormats, ...printedFormats];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setStickyVisible(window.scrollY > Math.max(420, window.innerHeight * 0.7));
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const pct = Math.round((window.scrollY / max) * 100);
      for (const mark of [25, 50, 75, 90]) {
        const key = `houselink:funnel:${funnel.id}:scroll:${mark}`;
        if (pct >= mark && !sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          trackFunnel(`scroll_${mark}`, { depth: mark });
        }
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funnel.id]);

  useEffect(() => {
    trackFunnel("page_view");
    trackEvent("library_funnel_page_view", product.id, funnelMeta());
    emitCommercePixel("ViewContent", { content_name: product.title, content_ids: [product.id], value: minPrice, currency: product.currency });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funnel.id, product.id]);

  useEffect(() => {
    const offer = document.getElementById("funnel-offer");
    if (!offer) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        trackEvent("library_funnel_offer_viewed", product.id, funnelMeta({ offerId: funnel.offer.id }));
        trackFunnel("offer_viewed", { offerId: funnel.offer.id });
        observer.disconnect();
      }
    }, { threshold: 0.35 });
    observer.observe(offer);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funnel.id, product.id]);

  function funnelMeta(extra?: Record<string, string | number | boolean | undefined>) {
    return {
      funnelId: funnel.id,
      funnelSlug: funnel.slug,
      funnelVersion: funnel.version,
      productId: product.id,
      productSlug: product.slug,
      offerId: funnel.offer.id,
      offerState: resolved.offerState,
      ...extra,
    };
  }

  function trackFunnel(event: string, metadata?: Record<string, unknown>) {
    const utm = readUtmParams();
    void fetch("/api/v1/library/funnels/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        funnelId: funnel.id,
        productId: product.id,
        offerId: funnel.offer.id,
        visitorId: getOrCreateVisitorId(),
        sessionId: getOrCreateSessionId(),
        metadata: { ...utm, path: window.location.pathname, ...metadata },
      }),
      keepalive: true,
    }).catch(() => undefined);
  }

  function emitCommercePixel(name: "ViewContent" | "InitiateCheckout" | "Purchase", params: Record<string, unknown>) {
    window.fbq?.("track", name, params, { eventID: `${funnel.id}-${name}-${getOrCreateSessionId()}` });
    if (name === "ViewContent") {
      window.gtag?.("event", "view_item", {
        currency: product.currency,
        value: minPrice,
        items: [{ item_id: product.id, item_name: product.title, item_variant: funnel.id }],
      });
    }
    if (name === "InitiateCheckout") {
      window.gtag?.("event", "begin_checkout", {
        currency: product.currency,
        value: minPrice,
        items: [{ item_id: product.id, item_name: product.title, item_variant: funnel.id }],
      });
    }
  }

  function openEditionSelector(ctaId: string) {
    trackEvent("library_funnel_cta_clicked", product.id, funnelMeta({ ctaId }));
    trackEvent("library_cta_clicked", product.id, funnelMeta({ cta: ctaId }));
    trackFunnel("cta_clicked", { ctaId });
    setSelectorOpen(true);
  }

  function openSample(ctaId: string) {
    if (!sampleUrl) return;
    trackEvent("library_sample_opened", product.id, funnelMeta({ ctaId }));
    trackFunnel("sample_opened", { ctaId });
    setSampleOpen(true);
  }

  function checkout(format: (typeof formats)[number]) {
    const line = repriceLibraryCartLine({
      productId: product.id,
      title: `${product.title} (${format.label})`,
      price: format.activePrice,
      listPrice: format.normalPrice ?? format.price,
      currency: product.currency,
      quantity: 1,
      formatId: format.id,
      formatType: format.type,
      formatLabel: format.label,
      funnelId: funnel.id,
      offerId: funnel.offer.id,
    }, 1);
    setCart((current) => {
      const withoutSame = current.filter((item) => !sameLibraryCartLine(item, line));
      return [line, ...withoutSame];
    });
    window.sessionStorage.setItem("houselink_library_funnel_attribution", JSON.stringify({
      funnelId: funnel.id,
      funnelSlug: funnel.slug,
      funnelVersion: funnel.version,
      productId: product.id,
      productSlug: product.slug,
      offerId: funnel.offer.id,
      offerState: resolved.offerState,
      selectedFormatId: format.id,
      selectedFormatType: format.type,
      selectedPrice: format.activePrice,
      ...readUtmParams(),
      utm_source: readUtmParams().utmSource,
      utm_medium: readUtmParams().utmMedium,
      utm_campaign: readUtmParams().utmCampaign,
    }));
    trackLibraryCartEvent("CART_ADD_SINGLE", product.id, funnelMeta({ ctaId: "edition_selected", formatId: format.id, formatType: format.type }));
    trackEvent(format.type === "PRINTED_BOOK" ? "library_funnel_printed_selected" : "library_funnel_digital_selected", product.id, funnelMeta({ formatId: format.id }));
    trackEvent("library_checkout_started", product.id, funnelMeta({ formatId: format.id, formatType: format.type }));
    trackFunnel("checkout_started", { formatId: format.id, formatType: format.type });
    emitCommercePixel("InitiateCheckout", { content_name: product.title, content_ids: [product.id], value: format.activePrice, currency: product.currency });
    notifyLibraryCartAdded(product.title);
    window.location.href = `/library/checkout?funnelId=${encodeURIComponent(funnel.id)}&offerId=${encodeURIComponent(funnel.offer.id)}`;
  }

  return (
    <main className="min-h-screen bg-[#f8faf7] text-[#121923]">
      <section className="relative overflow-hidden border-b border-[#d8dfd3] bg-[#f8faf7]">
        <div className="absolute inset-x-0 top-0 h-2 bg-[#0b6b43]" />
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 pb-10 pt-8 sm:px-6 lg:min-h-[88svh] lg:grid-cols-[minmax(0,0.98fr)_minmax(18rem,0.64fr)] lg:pb-16 lg:pt-12">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#0b6b43]">HouseLink Library special guide</p>
            <h1 className="mt-4 max-w-4xl text-3xl font-black leading-[1.04] tracking-normal text-[#102033] sm:text-6xl lg:text-7xl">{funnel.headline}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">{funnel.subheadline}</p>
            <OfferStrip resolved={resolved} now={now} />
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => openEditionSelector("HERO_BUY")} className="min-h-14 bg-[#0b6b43] text-base text-white shadow-[0_16px_40px_rgba(11,107,67,0.24)] hover:bg-[#084f33]">
                <ShoppingCart className="size-5" /> {funnel.primaryCta}
              </Button>
              {sampleUrl ? (
                <Button variant="secondary" onClick={() => openSample("HERO_SAMPLE")} className="min-h-14 border-[#b9c7b5] bg-white text-base text-[#102033] hover:bg-[#eef4eb]">
                  <BookOpen className="size-5" /> {funnel.secondaryCta}
                </Button>
              ) : null}
            </div>
            <div className="mt-6 grid max-w-2xl gap-2 text-sm font-bold text-slate-700 sm:grid-cols-3">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-[#0b6b43]" /> Secure checkout</span>
              <span className="inline-flex items-center gap-2"><ReceiptText className="size-4 text-[#0b6b43]" /> Invoice provided</span>
              <span className="inline-flex items-center gap-2"><Lock className="size-4 text-[#0b6b43]" /> Library access</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[22rem] lg:max-w-[25rem]">
            <div className="absolute -inset-4 rounded-[2rem] bg-[#dce9d5]" />
            <div className="relative rounded-[1.25rem] border border-[#c7d3c1] bg-white p-4 shadow-[0_30px_80px_rgba(16,32,51,0.18)]">
              <BookCover product={product} imageUrl={heroImage} priority interactive={false} className="mx-auto h-auto w-full shadow-none" />
              <div className="mt-4 border-t border-slate-200 pt-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0b6b43]">Choose your edition</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">Digital access or printed copy, priced by the active offer at checkout.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FunnelBand title={funnel.problemTitle} cta={() => openEditionSelector("VALUE_BUY")}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {funnel.problemPoints.map((point) => <ValueChip key={point}>{point}</ValueChip>)}
        </div>
      </FunnelBand>

      <FunnelBand title={funnel.audienceTitle} cta={() => openEditionSelector("AUDIENCE_BUY")} tone="white">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {funnel.audience.map((item) => (
            <div key={item} className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold leading-6 text-slate-700 shadow-sm">
              <CheckCircle2 className="mb-3 size-5 text-cyan-700" /> {item}
            </div>
          ))}
        </div>
      </FunnelBand>

      <FunnelBand title={funnel.learningTitle} cta={() => openEditionSelector("LEARNING_BUY")}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {funnel.learning.map((item, index) => (
            <article key={item.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">{String(index + 1).padStart(2, "0")}</p>
              <h3 className="mt-3 text-xl font-black text-[#102033]">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </FunnelBand>

      <section className="bg-[#0c1727] px-4 py-14 text-white sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Cost of delay</p>
            <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">{funnel.delayTitle}</h2>
            <p className="mt-4 text-base leading-8 text-slate-300">Take time to understand the process before serious money, time, and professional commitments are on the line.</p>
            <Button onClick={() => openEditionSelector("VALUE_BUY")} className="mt-6 min-h-12 bg-cyan-500 text-[#06131f] hover:bg-cyan-400">
              <ShoppingCart className="size-5" /> Get the guide today
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {funnel.delayPoints.map((point) => <ValueChip key={point} dark>{point}</ValueChip>)}
          </div>
        </div>
      </section>

      {sampleUrl ? (
        <FunnelBand title="See what's inside" cta={() => openEditionSelector("SAMPLE_BUY")} tone="white">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)] lg:items-center">
            <BookCover product={product} interactive={false} className="mx-auto w-full max-w-[16rem]" />
            <div>
              <p className="text-base leading-8 text-slate-600">Preview a legitimate sample, then come back to get the complete guide when it looks like the right fit.</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => openSample("SAMPLE_OPEN")} className="min-h-12"><BookOpen className="size-5" /> Read the free sample</Button>
                <Button variant="secondary" onClick={() => openEditionSelector("SAMPLE_BUY")} className="min-h-12"><ShoppingCart className="size-5" /> Ready to get the complete guide?</Button>
              </div>
            </div>
          </div>
        </FunnelBand>
      ) : null}

      <FunnelBand title="HouseLink Library trust" cta={() => openEditionSelector("TRUST_BUY")}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {funnel.trust.map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 shadow-sm">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-cyan-700" /> {item}
            </div>
          ))}
        </div>
      </FunnelBand>

      <section id="funnel-offer" className="bg-white px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">{resolved.offerState}</p>
            <h2 className="mt-3 text-3xl font-black text-[#102033] sm:text-4xl">{funnel.offer.title}</h2>
            <p className="mt-3 text-base leading-8 text-slate-600">{offerExpired ? "This offer has expired. Normal Library pricing is now displayed." : funnel.offer.description}</p>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {formatChoices.map((format) => (
              <EditionCard key={format.id} format={format} currency={product.currency} onClick={() => checkout(format)} />
            ))}
          </div>
          {funnel.offer.countdown && !offerExpired ? <Countdown endsAt={funnel.offer.endsAt} now={now} /> : null}
        </div>
      </section>

      <FunnelBand title="Questions before buying" cta={() => openEditionSelector("FAQ_BUY")}>
        <div className="grid gap-3">
          {funnel.faq.map((faq) => (
            <details
              key={faq.question}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              onToggle={(event) => {
                if (event.currentTarget.open) {
                  trackEvent("library_faq_opened", product.id, funnelMeta({ question: faq.question }));
                  trackFunnel("faq_opened", { question: faq.question });
                }
              }}
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 text-base font-black text-[#102033]">
                <HelpCircle className="size-5 text-cyan-700" /> {faq.question}
              </summary>
              <p className="mt-3 text-sm leading-7 text-slate-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </FunnelBand>

      <section className="bg-[#081425] px-4 py-14 text-white sm:px-6">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-3xl font-black leading-tight sm:text-5xl">{funnel.finalTitle}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-300">{product.title}</p>
          <div className="mt-6 flex justify-center">
            <Button onClick={() => openEditionSelector("FINAL_BUY")} className="min-h-14 bg-cyan-500 text-base text-[#06131f] hover:bg-cyan-400">
              <ShoppingCart className="size-5" /> {funnel.primaryCta}
            </Button>
          </div>
          <p className="mt-4 text-xs font-bold text-slate-300">Secure checkout · HouseLink Library · Invoice provided</p>
          <p className="mx-auto mt-5 max-w-3xl text-xs leading-6 text-slate-400">{funnel.disclaimer}</p>
        </div>
      </section>

      {stickyVisible ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">
          <div className="mx-auto grid max-w-xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-[#102033]">{shortTitle(product.title)}</p>
              <p className="text-xs font-bold text-slate-500">From {product.currency} {minPrice.toFixed(2)}</p>
            </div>
            <Button onClick={() => openEditionSelector("STICKY_BUY")} className="min-h-11 px-4"><ShoppingCart className="size-4" /> Buy now</Button>
          </div>
        </div>
      ) : null}

      {selectorOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 p-0 sm:items-center sm:p-4" onClick={() => setSelectorOpen(false)}>
          <div className="w-full rounded-t-2xl bg-white p-4 shadow-2xl sm:mx-auto sm:max-w-2xl sm:rounded-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">Choose your edition</p>
                <h2 className="mt-1 text-2xl font-black text-[#102033]">Get the book now</h2>
              </div>
              <button type="button" onClick={() => setSelectorOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close edition selector">
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {formatChoices.map((format) => (
                <EditionCard key={format.id} format={format} currency={product.currency} onClick={() => checkout(format)} compact />
              ))}
            </div>
            <div className="mt-4 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-3">
              <span className="inline-flex items-center gap-1"><Lock className="size-3.5" /> Secure checkout</span>
              <span className="inline-flex items-center gap-1"><ReceiptText className="size-3.5" /> Invoice provided</span>
              <span className="inline-flex items-center gap-1"><CreditCard className="size-3.5" /> Platform payments</span>
            </div>
          </div>
        </div>
      ) : null}

      {sampleOpen && sampleUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 sm:p-4" onClick={() => setSampleOpen(false)}>
          <div className="flex h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p className="truncate font-bold text-[#102033]">Sample - {product.title}</p>
              <button type="button" onClick={() => setSampleOpen(false)} className="rounded-lg px-3 py-1 text-sm font-bold text-slate-600 hover:bg-slate-100">Close</button>
            </div>
            <div className="min-h-0 flex-1">
              <PdfSampleViewer url={sampleUrl} title={product.title} onViewed={() => trackEvent("library_sample_viewed", product.id, funnelMeta())} />
            </div>
            <div className="border-t border-slate-200 p-3 text-right">
              <Button onClick={() => { setSampleOpen(false); openEditionSelector("SAMPLE_MODAL_BUY"); }}>
                <ShoppingCart className="size-5" /> Get the complete guide
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function OfferStrip({ resolved, now }: { resolved: ResolvedLibrarySalesFunnel; now: number }) {
  const { product, formats, funnel, offerActive, offerExpired } = resolved;
  return (
    <div className="mt-7 max-w-2xl rounded-[0.9rem] border border-[#bfd0ba] bg-white p-4 shadow-[0_18px_50px_rgba(16,32,51,0.08)]">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0b6b43]">{offerExpired ? "Normal price" : funnel.offer.title}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {formats.slice(0, 2).map((format) => (
          <div key={format.id} className="rounded-lg border border-[#e3eadf] bg-[#f8faf7] p-3">
            <p className="text-xs font-bold uppercase text-slate-500">{format.type === "PRINTED_BOOK" ? "Printed" : "Digital"}</p>
            <p className="mt-1 text-2xl font-black text-[#102033]">
              {format.normalPrice && offerActive ? <span className="mr-2 text-base text-slate-400 line-through">{product.currency} {format.normalPrice.toFixed(2)}</span> : null}
              {product.currency} {format.activePrice.toFixed(2)}
            </p>
          </div>
        ))}
      </div>
      {funnel.offer.countdown && !offerExpired ? <Countdown endsAt={funnel.offer.endsAt} now={now} compact /> : null}
    </div>
  );
}

function Countdown({ endsAt, now, compact = false }: { endsAt: string; now: number; compact?: boolean }) {
  const remaining = Math.max(0, Date.parse(endsAt) - now);
  if (!Number.isFinite(remaining) || remaining <= 0) return null;
  const totalSeconds = Math.floor(remaining / 1000);
  const units = [
    { label: "Days", value: Math.floor(totalSeconds / 86400) },
    { label: "Hours", value: Math.floor((totalSeconds % 86400) / 3600) },
    { label: "Mins", value: Math.floor((totalSeconds % 3600) / 60) },
    { label: "Secs", value: totalSeconds % 60 },
  ];
  return (
    <div className={cn("mt-5 rounded-lg border p-3", compact ? "border-white/15 bg-white/10" : "border-cyan-200 bg-cyan-50")}>
      <p className={cn("mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em]", compact ? "text-cyan-100" : "text-cyan-800")}>
        <Timer className="size-4" /> Offer ends in
      </p>
      <div className="grid grid-cols-4 gap-2">
        {units.map((unit) => (
          <span key={unit.label} className={cn("rounded-lg px-2 py-2 text-center", compact ? "bg-white/10" : "bg-white")}>
            <span className={cn("block text-lg font-black tabular-nums", compact ? "text-white" : "text-[#102033]")}>{String(unit.value).padStart(2, "0")}</span>
            <span className={cn("block text-[0.62rem] font-bold uppercase", compact ? "text-slate-300" : "text-slate-500")}>{unit.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function FunnelBand({ title, children, cta, tone = "soft" }: { title: string; children: React.ReactNode; cta: () => void; tone?: "soft" | "white" }) {
  return (
    <section className={cn("px-4 py-14 sm:px-6", tone === "white" ? "bg-white" : "bg-[#f6f8fb]")}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="max-w-3xl text-3xl font-black leading-tight text-[#102033] sm:text-4xl">{title}</h2>
          <Button onClick={cta} className="min-h-12 shrink-0"><ShoppingCart className="size-5" /> Get the guide</Button>
        </div>
        {children}
      </div>
    </section>
  );
}

function ValueChip({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div className={cn("rounded-lg border px-4 py-3 text-sm font-black", dark ? "border-white/10 bg-white/10 text-slate-100" : "border-slate-200 bg-white text-slate-700 shadow-sm")}>
      <FileText className={cn("mb-2 size-5", dark ? "text-cyan-200" : "text-cyan-700")} /> {children}
    </div>
  );
}

function EditionCard({ format, currency, onClick, compact = false }: { format: ResolvedLibrarySalesFunnel["formats"][number]; currency: string; onClick: () => void; compact?: boolean }) {
  const label = format.type === "PRINTED_BOOK" ? "Printed edition" : "Digital edition";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-cyan-400 hover:shadow-md", compact && "p-4")}
    >
      <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">{label}</p>
      <p className="mt-2 text-3xl font-black text-[#102033]">
        {format.normalPrice && format.normalPrice > format.activePrice ? <span className="mr-2 text-base text-slate-400 line-through">{currency} {format.normalPrice.toFixed(2)}</span> : null}
        {currency} {format.activePrice.toFixed(2)}
      </p>
      {format.savings ? <p className="mt-1 text-sm font-bold text-emerald-700">Save {currency} {format.savings.toFixed(2)}</p> : null}
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#102033]">
        Get {format.type === "PRINTED_BOOK" ? "printed" : "digital"} <ArrowRight className="size-4" />
      </span>
    </button>
  );
}

function shortTitle(title: string) {
  return title.replace(/^The Complete Guide to /i, "").slice(0, 42);
}
