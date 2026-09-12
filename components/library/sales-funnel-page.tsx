"use client";

import {
  ArrowRight,
  CreditCard,
  HelpCircle,
  Lock,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { HouseLinkBrand } from "@/components/brand/houselink-logo";
import { BookCover } from "@/components/library/book-cover";
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
  const [stickyVisible, setStickyVisible] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const heroImage = funnel.heroImageUrl || product.gallery.find((item) => item.kind === "mockup")?.url || product.gallery.find((item) => item.kind === "cover")?.url || product.seoImageUrl || "";
  const digitalFormats = formats.filter((format) => format.type !== "PRINTED_BOOK");
  const printedFormats = formats.filter((format) => format.type === "PRINTED_BOOK");
  const digitalPrice = digitalFormats[0]?.activePrice ?? minPrice;
  const printedPrice = printedFormats[0]?.activePrice ?? null;
  const formatChoices = [...digitalFormats, ...printedFormats];
  const coreInclusions = funnel.learning.slice(0, 4);
  const fastRisks = funnel.problemPoints.slice(0, 6);
  const shortFaq = funnel.faq.slice(0, 5);

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

  function openSamplePreview() {
    if (!sampleUrl) return;
    trackEvent("library_sample_opened", product.id, funnelMeta({ ctaId: "sample_preview", surface: "sales_funnel" }));
    trackEvent("library_cta_clicked", product.id, funnelMeta({ cta: "preview_sample", surface: "sales_funnel" }));
    trackFunnel("sample_opened", { surface: "sales_funnel" });
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
    window.location.href = `/funnel/${encodeURIComponent(funnel.slug)}/checkout?funnelId=${encodeURIComponent(funnel.id)}&offerId=${encodeURIComponent(funnel.offer.id)}`;
  }

  return (
    <main className="min-h-screen bg-[#e9e9e4] text-[#101010]">
      <section className="relative overflow-hidden bg-[#07111f] text-white">
        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center px-4 pb-0 pt-5 text-center sm:px-6 sm:pt-8">
          <div className="w-full max-w-4xl">
            <FunnelLogo />
            <p className="mt-5 text-[0.68rem] font-black uppercase tracking-[0.14em] text-white sm:mt-9 sm:text-base sm:tracking-normal">
              Before you commit property money in <span className="text-[#20c36b]">Zimbabwe</span>
            </p>
            <h1 className="mx-auto mt-2 max-w-4xl text-[2rem] font-black uppercase leading-[0.94] tracking-normal sm:mt-4 sm:text-6xl lg:text-[4.6rem]">
              <span className="text-[#20c36b]">Before you buy land</span> or start building, read this.
            </h1>
            {funnel.offer.countdown && !offerExpired ? <Countdown endsAt={funnel.offer.endsAt} now={now} compact minimal /> : null}
            <div className="relative mx-auto mt-5 flex max-w-[25rem] flex-col items-stretch sm:mt-7">
              <CurvedArrow side="left" />
              <CurvedArrow side="right" />
              <SalesCtaButton onClick={() => openEditionSelector("HERO_BUY")} subtitle="Hurry - Time is Running Out">
                {funnel.primaryCta}
              </SalesCtaButton>
            </div>
          </div>

          <div className="relative mt-6 w-full max-w-4xl border-[6px] border-white bg-white p-2 shadow-[0_24px_70px_rgba(0,0,0,0.45)] sm:mt-10 sm:border-[9px]">
            <div className="relative grid min-h-[15rem] overflow-hidden bg-[#f3f0e8] sm:min-h-[25rem] md:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="flex flex-col justify-center bg-[#f8f6f0] p-5 text-left text-[#101010] sm:p-8">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0b8f54]">Inside the complete guide</p>
                <h2 className="mt-3 text-3xl font-black uppercase leading-tight sm:text-5xl">Land. Plans. Approvals. Law.</h2>
                <p className="mt-4 max-w-xl text-sm font-bold leading-7 text-slate-700 sm:text-base">
                  A practical Zimbabwe property development and property law guide for land buyers, builders, developers, investors, and anyone preparing for approvals, contractors, subdivision, or council processes.
                </p>
                {sampleUrl ? (
                  <a
                    href={sampleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={openSamplePreview}
                    className="mt-5 inline-flex w-fit items-center gap-2 border border-[#0b8f54] bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#0b8f54] transition hover:bg-[#e8f8ef]"
                  >
                    See what's inside before you buy <ArrowRight className="size-4" />
                  </a>
                ) : null}
              </div>
              <div className="relative flex items-center justify-center bg-[#f4f8f6] p-4 sm:p-5 md:bg-[#0b8f54]">
                <div className="grid w-full max-w-[18rem] place-items-center bg-[#0b8f54] p-4 shadow-[10px_10px_0_rgba(7,17,31,0.18)] sm:max-w-[20rem] md:bg-transparent md:p-0 md:shadow-none">
                  <BookCover product={product} imageUrl={heroImage} priority interactive={false} className="w-full max-w-[15.5rem] shadow-[10px_10px_0_rgba(0,0,0,0.22)] sm:max-w-[17rem] md:max-w-[15rem] md:shadow-[12px_12px_0_rgba(0,0,0,0.25)]" />
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-4xl bg-[#0b8f54] px-4 py-4 text-center text-white">
            <p className="text-sm font-black leading-6">
              Digital guide: <span className="text-xl uppercase">{product.currency} {digitalPrice.toFixed(2)}</span>. {printedPrice ? <>Printed guide: {product.currency} {printedPrice.toFixed(2)}. </> : null}Secure checkout, invoice provided, digital access after payment.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#f7f3ea] px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.26em] text-[#0b8f54]">Wait, your order is not complete</p>
            <h2 className="mt-3 text-[2rem] font-black uppercase leading-[0.96] text-[#0d1422] sm:text-[3rem]">
              Understand the process before you commit serious money.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-700">
              Property decisions become harder to fix after land, plans, approvals, contractors, or site costs are already in motion.
            </p>
          </div>

          <div className="mt-10 overflow-hidden border border-[#d8d1c3] bg-white shadow-[0_28px_70px_rgba(16,24,40,0.12)]">
            <div className="grid lg:grid-cols-[0.78fr_1fr]">
              <div className="flex flex-col justify-between bg-[#07111f] p-6 text-white sm:p-8 lg:min-h-[26rem]">
                <div>
                  <p className="text-[0.68rem] font-black uppercase tracking-[0.24em] text-[#20c36b]">Avoid these expensive mistakes</p>
                  <div className="mt-6 grid gap-3">
                    {fastRisks.map((point) => (
                      <SalesBullet key={point} inverse>{point}</SalesBullet>
                    ))}
                  </div>
                </div>
                <div className="mt-8 border border-white/15 bg-white/[0.06] p-4">
                  <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[#20c36b]">Why this matters</p>
                  <p className="mt-2 text-sm font-bold leading-6 text-white/85">
                    A {product.currency} {minPrice.toFixed(2)} guide is a small first step before a major property decision. Use it to prepare, ask better questions, and identify areas where professional advice is needed.
                  </p>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                <p className="text-[0.68rem] font-black uppercase tracking-[0.24em] text-[#64748b]">{funnel.learningTitle}</p>
                <div className="mt-5 grid gap-px overflow-hidden border border-[#d8d1c3] bg-[#d8d1c3]">
                  {coreInclusions.map((item, index) => (
                    <div key={item.title} className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 bg-white p-4 sm:p-5">
                      <span className="grid size-9 place-items-center bg-[#0b8f54] text-sm font-black text-white">{String(index + 1).padStart(2, "0")}</span>
                      <span>
                        <span className="block text-sm font-black uppercase leading-tight text-[#0d1422]">{item.title}</span>
                        <span className="mt-1.5 block text-sm font-semibold leading-6 text-slate-700">{item.description}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-[#d8d1c3] bg-[#f4f8f6] p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
              <p className="text-sm font-black uppercase leading-6 text-[#0d1422]">
                For first-time land buyers, builders, investors, developers, subdivision plans, and anyone preparing for a Zimbabwe property project.
              </p>
              <SalesCtaButton onClick={() => openEditionSelector("ORDER_STACK_BUY")} className="mt-4 min-h-[3.35rem] w-full px-5 text-base shadow-[0_8px_0_rgba(11,13,18,0.22)] sm:mt-0 sm:w-auto sm:min-w-[18rem]" subtitle="Choose digital or printed">
                Yes, add this to my order
              </SalesCtaButton>
            </div>
          </div>
        </div>
      </section>

      <section id="funnel-offer" className="bg-[#0b8f54] px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-5xl border border-[#087044] bg-white p-5 shadow-[0_24px_60px_rgba(16,24,40,0.18)] sm:p-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[#0b8f54]">Choose digital or printed</p>
            <h2 className="mt-2 text-4xl font-black uppercase leading-none text-[#0d1422] sm:text-[3.25rem]">{funnel.offer.title}</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{offerExpired ? "This offer has expired. Normal Library pricing is now displayed." : funnel.offer.description}</p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {formatChoices.map((format) => (
              <EditionCard key={format.id} format={format} currency={product.currency} onClick={() => checkout(format)} />
            ))}
          </div>
          <div className="mt-5 grid gap-2 text-[0.72rem] font-black text-[#0d1422] sm:grid-cols-3">
            <span className="inline-flex items-center justify-center gap-2 border border-[#d8d1c3] bg-[#f7f3ea] p-2.5"><Lock className="size-3.5" /> Secure checkout</span>
            <span className="inline-flex items-center justify-center gap-2 border border-[#d8d1c3] bg-[#f7f3ea] p-2.5"><ReceiptText className="size-3.5" /> Invoice provided</span>
            <span className="inline-flex items-center justify-center gap-2 border border-[#d8d1c3] bg-[#f7f3ea] p-2.5"><ShieldCheck className="size-3.5" /> HouseLink Library</span>
          </div>
        </div>
      </section>

      <section className="bg-[#f7f3ea] px-4 py-14 sm:px-6">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.72fr_1fr] lg:items-start">
          <div>
            <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[#0b8f54]">Last checks before buying</p>
            <h2 className="mt-2 text-[2rem] font-black uppercase leading-[0.96] text-[#0d1422] sm:text-[2.65rem]">Questions before you order</h2>
            <p className="mt-4 text-sm font-semibold leading-7 text-slate-700">{funnel.disclaimer}</p>
          </div>
          <div className="grid gap-3">
            {shortFaq.map((faq) => (
              <details
                key={faq.question}
                className="border border-[#d8d1c3] bg-white p-4 shadow-[0_10px_24px_rgba(16,24,40,0.05)]"
                onToggle={(event) => {
                  if (event.currentTarget.open) {
                    trackEvent("library_faq_opened", product.id, funnelMeta({ question: faq.question }));
                    trackFunnel("faq_opened", { question: faq.question });
                  }
                }}
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 text-sm font-black text-[#0d1422]">
                  <HelpCircle className="size-4 text-[#0b8f54]" /> {faq.question}
                </summary>
                <p className="mt-2 pl-7 text-sm font-semibold leading-7 text-slate-700">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#07111f] px-4 pb-40 pt-12 text-center text-white sm:px-6 md:py-12">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#20c36b]">The launch offer is still active</p>
          <h2 className="mt-3 text-3xl font-black uppercase leading-tight sm:text-5xl">{funnel.finalTitle}</h2>
          <SalesCtaButton onClick={() => openEditionSelector("FINAL_BUY")} className="mt-6" subtitle="Hurry - Time is Running Out">
            {funnel.primaryCta}
          </SalesCtaButton>
        </div>
      </section>

      {stickyVisible ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">
          <div className="mx-auto grid max-w-xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-[#102033]">{shortTitle(product.title)}</p>
              <p className="text-xs font-bold text-slate-500">From {product.currency} {minPrice.toFixed(2)}</p>
            </div>
            <SalesCtaButton onClick={() => openEditionSelector("STICKY_BUY")} className="min-h-11 px-4 text-sm shadow-none"><ShoppingCart className="size-4" /> Buy now</SalesCtaButton>
          </div>
        </div>
      ) : null}

      {selectorOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 p-0 sm:items-center sm:p-4" onClick={() => setSelectorOpen(false)}>
          <div className="w-full border-t-[6px] border-[#0b8f54] bg-white p-4 shadow-2xl sm:mx-auto sm:max-w-2xl sm:border-[6px] sm:border-[#08111f]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0b8f54]">Choose your edition</p>
                <h2 className="mt-1 text-2xl font-black uppercase text-[#08111f]">Yes, I want the guide</h2>
              </div>
              <button type="button" onClick={() => setSelectorOpen(false)} className="border-2 border-slate-200 p-2 text-slate-500 hover:bg-slate-100" aria-label="Close edition selector">
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

    </main>
  );
}

function Countdown({ endsAt, now, compact = false, minimal = false }: { endsAt: string; now: number; compact?: boolean; minimal?: boolean }) {
  const remaining = Math.max(0, Date.parse(endsAt) - now);
  if (!Number.isFinite(remaining) || remaining <= 0) return null;
  const totalSeconds = Math.floor(remaining / 1000);
  const units = minimal ? [
    { label: "Days", value: Math.floor(totalSeconds / 86400) },
    { label: "Hours", value: Math.floor((totalSeconds % 86400) / 3600) },
    { label: "Mins", value: Math.floor((totalSeconds % 3600) / 60) },
  ] : [
    { label: "Days", value: Math.floor(totalSeconds / 86400) },
    { label: "Hours", value: Math.floor((totalSeconds % 86400) / 3600) },
    { label: "Mins", value: Math.floor((totalSeconds % 3600) / 60) },
    { label: "Secs", value: totalSeconds % 60 },
  ];
  return (
    <div className={cn("mt-4 text-center sm:mt-6", !minimal && "border-2 border-[#08111f] p-3", compact ? "text-[#20c36b]" : "bg-white text-[#08111f]")}>
      <div className="mx-auto inline-grid grid-cols-[1fr_auto_1fr_auto_1fr] items-end gap-x-2">
        {units.map((unit, index) => (
          <span key={unit.label} className="contents">
            {index > 0 ? <span className="pb-4 text-2xl font-black leading-none text-[#20c36b]">:</span> : null}
            <span className="text-center">
              <span className="block text-2xl font-black leading-none tabular-nums text-[#20c36b] sm:text-3xl">{String(unit.value).padStart(2, "0")}</span>
              <span className="mt-1 block text-[0.6rem] font-black text-[#20c36b]">{unit.label}</span>
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function SalesCtaButton({ children, className, onClick, subtitle }: { children: React.ReactNode; className?: string; onClick: () => void; subtitle?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-[3.55rem] max-w-full flex-col items-center justify-center bg-[#0b8f54] px-6 py-3 text-center text-lg font-black uppercase leading-none text-white shadow-[0_10px_0_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:bg-[#087044] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#20c36b] active:translate-y-0 sm:text-xl",
        className,
      )}
    >
      <span className="whitespace-nowrap">{children}</span>
      {subtitle ? <span className="mt-1 text-xs font-bold normal-case leading-none text-white/90">({subtitle})</span> : null}
    </button>
  );
}

function CurvedArrow({ side }: { side: "left" | "right" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute top-[-3.1rem] hidden h-24 w-16 border-b-[6px] sm:block",
        "border-[#20c36b]",
        side === "left" ? "-left-24 rotate-[-24deg] rounded-bl-[4rem] border-l-[6px]" : "-right-24 rotate-[24deg] rounded-br-[4rem] border-r-[6px]",
      )}
    />
  );
}

function SalesBullet({ children, inverse = false }: { children: React.ReactNode; inverse?: boolean }) {
  return (
    <div className={cn("grid grid-cols-[auto_minmax(0,1fr)] gap-3 text-sm font-bold leading-6", inverse ? "text-white" : "text-[#172033]")}>
      <ArrowRight className={cn("mt-1 size-4 shrink-0", inverse ? "text-[#20c36b]" : "text-[#0b8f54]")} />
      <span>{children}</span>
    </div>
  );
}

function EditionCard({ format, currency, onClick, compact = false }: { format: ResolvedLibrarySalesFunnel["formats"][number]; currency: string; onClick: () => void; compact?: boolean }) {
  const label = format.type === "PRINTED_BOOK" ? "Printed edition" : "Digital edition";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("border border-[#d8d1c3] bg-white p-5 text-left shadow-[0_14px_30px_rgba(16,24,40,0.08)] transition hover:-translate-y-0.5 hover:border-[#0b6b43] hover:shadow-[0_18px_38px_rgba(16,24,40,0.12)]", compact && "p-4")}
    >
      <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#0b8f54]">{label}</p>
      <p className="mt-1.5">
        {format.normalPrice && format.normalPrice > format.activePrice ? <span className="block text-sm font-black text-slate-400 line-through">{currency} {format.normalPrice.toFixed(2)}</span> : null}
        <span className="block whitespace-nowrap text-3xl font-black text-[#0d1422]">{currency} {format.activePrice.toFixed(2)}</span>
      </p>
      {format.savings ? <p className="mt-3 inline-flex bg-[#dff8ea] px-2 py-1 text-xs font-black text-[#075f3b]">Save {currency} {format.savings.toFixed(2)}</p> : null}
      <span className="ml-2 mt-3 inline-flex items-center gap-2 bg-[#0d1422] px-3 py-2 text-xs font-black uppercase text-white">
        Get {format.type === "PRINTED_BOOK" ? "printed" : "digital"} <ArrowRight className="size-4" />
      </span>
    </button>
  );
}

function FunnelLogo() {
  return (
    <div className="inline-flex items-center">
      <span className="inline-flex rounded-2xl bg-white px-3 py-2 shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
        <HouseLinkBrand variant="nav" />
      </span>
    </div>
  );
}

function shortTitle(title: string) {
  return title.replace(/^The Complete Guide to /i, "").slice(0, 42);
}
