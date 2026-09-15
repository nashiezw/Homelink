"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
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
import { trackMetaInitiateCheckout } from "@/lib/analytics/meta-commerce";
import { trackLibraryFunnelEvent, writeLibraryFunnelAttribution } from "@/lib/analytics/library-funnel-client";
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
  const propertyLawScope =
    "This is a practical property-development guide, not a property-law textbook or legal practitioner manual. The legal content gives context for development decisions and does not replace advice from a qualified legal practitioner.";
  const isPropertyDevelopmentTemplate = funnel.template === "PROPERTY_DEVELOPMENT_GUIDE";

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
    if (offerExpired) {
      trackEvent("library_funnel_offer_expired", product.id, funnelMeta());
      trackFunnel("offer_expired");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funnel.id, product.id, offerExpired]);

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
    const attribution = {
      funnelId: funnel.id,
      funnelSlug: funnel.slug,
      funnelVersion: funnel.version,
      template: funnel.template,
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
    };
    writeLibraryFunnelAttribution(attribution);
    const metaCheckout = trackMetaInitiateCheckout({
      value: format.activePrice,
      currency: product.currency,
      productId: product.id,
      productTitle: product.title,
      formatId: format.id,
      formatLabel: format.label,
      quantity: 1,
    });
    trackLibraryCartEvent("CART_ADD_SINGLE", product.id, funnelMeta({ ctaId: "edition_selected", formatId: format.id, formatType: format.type }));
    trackEvent(format.type === "PRINTED_BOOK" ? "library_funnel_printed_selected" : "library_funnel_digital_selected", product.id, funnelMeta({ formatId: format.id }));
    trackEvent("library_funnel_checkout_started", product.id, funnelMeta({ formatId: format.id, formatType: format.type, metaEventId: metaCheckout?.eventId }));
    trackEvent("library_checkout_started", product.id, funnelMeta({ formatId: format.id, formatType: format.type, metaEventId: metaCheckout?.eventId }));
    trackFunnel("checkout_started", { formatId: format.id, formatType: format.type });
    trackLibraryFunnelEvent("library_funnel_checkout_started", attribution, { formatId: format.id, formatType: format.type, metaEventId: metaCheckout?.eventId });
    notifyLibraryCartAdded(product.title);
    window.location.href = `/funnel/${encodeURIComponent(funnel.slug)}/checkout?funnelId=${encodeURIComponent(funnel.id)}&offerId=${encodeURIComponent(funnel.offer.id)}`;
  }

  const selectorModal = selectorOpen ? (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 p-0 sm:items-center sm:p-4" onClick={() => setSelectorOpen(false)}>
      <div className="w-full border-t-[6px] border-[#0b8f54] bg-white p-4 shadow-2xl sm:mx-auto sm:max-w-2xl sm:border-[6px] sm:border-[#08111f]" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0b8f54]">Choose your edition</p>
            <h2 className="mt-1 text-2xl font-black uppercase text-[#08111f]">{funnel.primaryCta}</h2>
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
        <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
          Review the edition and sample before checkout. Refund requests follow the{" "}
          <Link href="/returns" className="font-black text-[#0b8f54] underline underline-offset-2">Refund Policy</Link>.
        </p>
      </div>
    </div>
  ) : null;

  if (funnel.template === "BOOK_SALES") {
    return (
      <main className="min-h-screen bg-[#f6f1e7] text-[#201a14]">
        <section className="px-4 py-5 sm:px-6">
          <div className="mx-auto max-w-7xl overflow-hidden border border-[#ded3c1] bg-[#201a14] text-white shadow-[0_28px_80px_rgba(32,26,20,0.22)]">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_25rem]">
              <div className="flex min-h-[42rem] flex-col justify-between p-6 sm:p-10 lg:p-12">
                <div>
                  <FunnelLogo />
                  <p className="mt-12 w-fit border-b border-[#d8a73f] pb-2 text-xs font-black uppercase tracking-[0.26em] text-[#d8a73f]">{funnel.label}</p>
                  <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[0.95] tracking-normal sm:text-6xl lg:text-7xl">{funnel.headline}</h1>
                  <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-[#eadfce]">{funnel.subheadline}</p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <SalesCtaButton onClick={() => openEditionSelector("BOOK_HERO_BUY")} className="bg-[#d8a73f] text-[#201a14] shadow-[0_9px_0_rgba(0,0,0,0.36)] hover:bg-[#c8942c] focus-visible:outline-[#d8a73f]" subtitle="Choose your format">
                      {funnel.primaryCta}
                    </SalesCtaButton>
                    {sampleUrl ? (
                      <SamplePreviewCta href={sampleUrl} onClick={openSamplePreview} tone="book" label={funnel.secondaryCta || undefined} />
                    ) : null}
                  </div>
                </div>
                <div className="mt-10 grid gap-3 border-t border-white/15 pt-5 sm:grid-cols-3">
                  {funnel.trust.slice(0, 3).map((item) => (
                    <p key={item} className="text-xs font-bold uppercase leading-5 text-[#eadfce]">
                      <ShieldCheck className="mb-2 size-5 text-[#d8a73f]" /> {item}
                    </p>
                  ))}
                </div>
              </div>
              <aside className="bg-[#eee2cf] p-6 text-[#201a14] sm:p-8 lg:p-10">
                <div className="mx-auto max-w-[18rem]">
                  <div className="bg-white p-4 shadow-[18px_18px_0_rgba(32,26,20,0.16)]">
                    <BookCover product={product} imageUrl={heroImage} priority interactive={false} className="w-full" />
                  </div>
                  <div className="mt-8 border border-[#c8b89f] bg-[#fbf7ef] p-5">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#906512]">Reader edition</p>
                    <p className="mt-2 text-4xl font-black leading-none">{product.currency} {minPrice.toFixed(2)}</p>
                    <p className="mt-3 text-sm font-semibold leading-6 text-[#675747]">Focused publication, secure checkout, invoice, and format selection in one clean flow.</p>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.78fr_1fr] lg:items-start">
            <div className="lg:sticky lg:top-8">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#906512]">{funnel.learningTitle}</p>
              <h2 className="mt-3 max-w-xl text-3xl font-black leading-tight text-[#201a14] sm:text-5xl">Know what is inside before you buy the book.</h2>
              <p className="mt-5 text-sm font-semibold leading-7 text-[#675747]">{funnel.disclaimer}</p>
              <SalesCtaButton onClick={() => openEditionSelector("BOOK_SIDE_BUY")} className="mt-7 bg-[#201a14] shadow-[0_8px_0_rgba(144,101,18,0.28)] hover:bg-[#3a3026]" subtitle="Secure checkout">
                Buy the book
              </SalesCtaButton>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {funnel.learning.slice(0, 6).map((item, index) => (
                <article key={item.title} className="border border-[#ded3c1] bg-white p-5 shadow-[0_18px_40px_rgba(32,26,20,0.07)]">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#906512]">Chapter {String(index + 1).padStart(2, "0")}</p>
                  <h3 className="mt-3 text-lg font-black leading-tight text-[#201a14]">{item.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-7 text-[#675747]">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#201a14] px-4 py-16 text-white sm:px-6">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d8a73f]">Before you order</p>
              <h2 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">Make the decision with fewer unanswered questions.</h2>
              <p className="mt-4 text-sm font-semibold leading-7 text-[#eadfce]">
                The page brings the main concerns forward so buyers can compare the promise, the contents, the edition, and the checkout terms before ordering.
              </p>
            </div>
            <div className="grid gap-px overflow-hidden border border-white/15 bg-white/15 sm:grid-cols-2">
              {fastRisks.map((point) => (
                <div key={point} className="bg-[#2b241c] p-4">
                  <SalesBullet inverse>{point}</SalesBullet>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="funnel-offer" className="bg-white px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#906512]">Choose your copy</p>
                <h2 className="mt-3 text-3xl font-black leading-tight text-[#201a14] sm:text-5xl">{funnel.offer.title}</h2>
                <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-[#675747]">{offerExpired ? "This offer has expired. Normal Library pricing is now displayed." : funnel.offer.description}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {formatChoices.map((format) => (
                  <EditionCard key={format.id} format={format} currency={product.currency} onClick={() => checkout(format)} />
                ))}
              </div>
            </div>
            <p className="mt-6 text-xs font-semibold leading-5 text-[#675747]">
              Review the selected format, sample where available, and <Link href="/returns" className="font-black text-[#201a14] underline underline-offset-2">Refund Policy</Link> before checkout.
            </p>
          </div>
        </section>

        <section className="bg-[#f6f1e7] px-4 pb-40 pt-14 sm:px-6 md:pb-16">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.7fr_1fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#906512]">Final checks</p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-[#201a14] sm:text-5xl">{funnel.finalTitle}</h2>
              <p className="mt-4 text-sm font-semibold leading-7 text-[#675747]">{funnel.subheadline}</p>
              <SalesCtaButton onClick={() => openEditionSelector("BOOK_FINAL_BUY")} className="mt-6 bg-[#201a14] hover:bg-[#3a3026]" subtitle="Choose digital or printed">
                {funnel.primaryCta}
              </SalesCtaButton>
            </div>
            <div className="grid gap-3">
              {shortFaq.map((faq) => (
                <details key={faq.question} className="border border-[#ded3c1] bg-white p-4">
                  <summary className="cursor-pointer list-none text-sm font-black text-[#201a14]">{faq.question}</summary>
                  <p className="mt-2 text-sm font-semibold leading-7 text-[#675747]">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {stickyVisible ? (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#ded3c1] bg-[#fbf7ef]/95 px-3 py-3 shadow-[0_-10px_30px_rgba(32,26,20,0.12)] backdrop-blur md:hidden">
            <div className="mx-auto grid max-w-xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[#201a14]">{shortTitle(product.title)}</p>
                <p className="text-xs font-bold text-[#675747]">From {product.currency} {minPrice.toFixed(2)}</p>
              </div>
              <SalesCtaButton onClick={() => openEditionSelector("BOOK_STICKY_BUY")} className="min-h-11 bg-[#201a14] px-4 text-sm shadow-none hover:bg-[#3a3026]"><ShoppingCart className="size-4" /> Buy now</SalesCtaButton>
            </div>
          </div>
        ) : null}
        {selectorModal}
      </main>
    );
  }

  if (funnel.template === "SIMPLE_OFFER") {
    return (
      <main className="min-h-screen bg-[#f8fafc] text-[#0f172a]">
        <section className="px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <HouseLinkBrand variant="nav" />
            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
              <div>
                <p className="inline-flex border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#334155]">{funnel.label}</p>
                <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[1.02] tracking-normal text-[#0f172a] sm:text-6xl">{funnel.headline}</h1>
                <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-[#475569]">{funnel.subheadline}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <SalesCtaButton onClick={() => openEditionSelector("SIMPLE_HERO_BUY")} className="shadow-[0_8px_0_rgba(15,23,42,0.18)]" subtitle="Fast secure order">
                    {funnel.primaryCta}
                  </SalesCtaButton>
                  {sampleUrl ? (
                    <SamplePreviewCta href={sampleUrl} onClick={openSamplePreview} tone="light" />
                  ) : null}
                </div>
                <div className="mt-10 grid gap-3 sm:grid-cols-2">
                  {coreInclusions.map((item) => (
                    <article key={item.title} className="border border-[#d9e2ec] bg-white p-4 shadow-[0_14px_35px_rgba(15,23,42,0.05)]">
                      <h2 className="text-sm font-black leading-tight text-[#0f172a]">{item.title}</h2>
                      <p className="mt-2 text-xs font-semibold leading-6 text-[#64748b]">{item.description}</p>
                    </article>
                  ))}
                </div>
              </div>
              <aside id="funnel-offer" className="border border-[#cbd5e1] bg-white p-5 shadow-[0_24px_55px_rgba(15,23,42,0.10)]">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0b8f54]">Current offer</p>
                <h2 className="mt-2 text-2xl font-black leading-tight">{funnel.offer.title}</h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-[#64748b]">{offerExpired ? "This offer has expired. Normal Library pricing is now displayed." : funnel.offer.description}</p>
                {funnel.offer.countdown && !offerExpired ? <Countdown endsAt={funnel.offer.endsAt} now={now} compact /> : null}
                <div className="mt-5 grid gap-3">
                  {formatChoices.map((format) => (
                    <EditionCard key={format.id} format={format} currency={product.currency} onClick={() => checkout(format)} compact />
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </section>
        <section className="px-4 py-12 sm:px-6">
          <div className="mx-auto grid max-w-6xl gap-px overflow-hidden border border-[#d9e2ec] bg-[#d9e2ec] md:grid-cols-3">
            {funnel.trust.slice(0, 3).map((item) => (
              <div key={item} className="bg-white p-5">
                <ShieldCheck className="size-5 text-[#0b8f54]" />
                <p className="mt-3 text-sm font-black leading-6 text-[#0f172a]">{item}</p>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-8 max-w-6xl border-l-4 border-[#0b8f54] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-semibold leading-7 text-[#475569]">
              Review product details, edition type, sample where available, and the <Link href="/returns" className="font-black text-[#0b8f54] underline">Refund Policy</Link> before placing your order.
            </p>
          </div>
        </section>

        <section className="bg-[#0f172a] px-4 py-14 text-white sm:px-6">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.72fr_1fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#5ce39d]">Decision support</p>
              <h2 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">A focused offer with the important details up front.</h2>
              <p className="mt-4 text-sm font-semibold leading-7 text-slate-300">{funnel.disclaimer}</p>
            </div>
            <div className="grid gap-3">
              {fastRisks.map((point) => (
                <div key={point} className="border border-white/10 bg-white/[0.04] p-4">
                  <SalesBullet inverse>{point}</SalesBullet>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-40 pt-14 sm:px-6 md:pb-16">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#0b8f54]">Ready when you are</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#0f172a] sm:text-5xl">{funnel.finalTitle}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-7 text-[#475569]">{funnel.subheadline}</p>
            <SalesCtaButton onClick={() => openEditionSelector("SIMPLE_FINAL_BUY")} className="mt-6" subtitle="Open secure checkout">
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
              <SalesCtaButton onClick={() => openEditionSelector("SIMPLE_STICKY_BUY")} className="min-h-11 px-4 text-sm shadow-none"><ShoppingCart className="size-4" /> Buy now</SalesCtaButton>
            </div>
          </div>
        ) : null}
        {selectorModal}
      </main>
    );
  }

  if (!isPropertyDevelopmentTemplate) {
    return (
      <main className="min-h-screen bg-[#edf3f0] text-[#102033]">
        <section className="bg-[#102033] px-4 py-5 text-white sm:px-6">
          <div className="mx-auto max-w-7xl">
            <FunnelLogo />
            <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-end">
              <div className="pb-4">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#5ce39d]">{funnel.label}</p>
                <h1 className="mt-4 max-w-4xl text-4xl font-black uppercase leading-[0.98] tracking-normal sm:text-6xl lg:text-7xl">{funnel.headline}</h1>
                <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-[#dce8e3]">{funnel.subheadline}</p>
              </div>
              <aside className="border border-white/15 bg-white/[0.06] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
                <BookCover product={product} imageUrl={heroImage} priority interactive={false} className="mx-auto w-full max-w-[15rem]" />
                <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 border-t border-white/15 pt-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#5ce39d]">Starting at</p>
                    <p className="mt-1 text-3xl font-black">{product.currency} {minPrice.toFixed(2)}</p>
                  </div>
                  <SalesCtaButton onClick={() => openEditionSelector("GUIDE_HERO_BUY")} className="min-h-12 px-4 text-sm shadow-none" subtitle={undefined}>
                    Buy
                  </SalesCtaButton>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-px overflow-hidden border border-[#bdd1c9] bg-[#bdd1c9] lg:grid-cols-4">
              <div className="bg-white p-5 lg:col-span-2">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0b6b43]">Who this is for</p>
                <h2 className="mt-3 text-2xl font-black leading-tight text-[#102033] sm:text-4xl">{funnel.audienceTitle}</h2>
              </div>
              {funnel.trust.slice(0, 2).map((item) => (
                <div key={item} className="bg-white p-5">
                  <ShieldCheck className="size-5 text-[#0b8f54]" />
                  <p className="mt-3 text-sm font-black leading-6 text-[#102033]">{item}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 grid gap-8 lg:grid-cols-[0.72fr_1fr] lg:items-start">
              <div className="lg:sticky lg:top-8">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#0b6b43]">What the guide helps with</p>
                <h2 className="mt-3 text-3xl font-black uppercase leading-none text-[#102033] sm:text-5xl">Turn scattered research into a clearer next step.</h2>
                <p className="mt-4 text-sm font-semibold leading-7 text-[#4b5f5a]">{funnel.disclaimer}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {funnel.learning.slice(0, 6).map((item, index) => (
                  <article key={item.title} className="border border-[#bdd1c9] bg-white p-5 shadow-[0_16px_36px_rgba(16,32,51,0.06)]">
                    <span className="grid size-9 place-items-center bg-[#0b8f54] text-sm font-black text-white">{String(index + 1).padStart(2, "0")}</span>
                    <h3 className="mt-4 text-lg font-black leading-tight text-[#102033]">{item.title}</h3>
                    <p className="mt-2 text-sm font-semibold leading-7 text-[#4b5f5a]">{item.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#dce8e3] px-4 py-14 sm:px-6">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_0.75fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#0b6b43]">Avoid confusion</p>
              <h2 className="mt-3 text-3xl font-black uppercase leading-none text-[#102033] sm:text-5xl">See what can go wrong before you choose your next step.</h2>
            </div>
            <div className="grid gap-3">
              {fastRisks.map((point) => (
                <div key={point} className="border border-[#bdd1c9] bg-white p-4">
                  <SalesBullet>{point}</SalesBullet>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="funnel-offer" className="bg-white px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-7xl border border-[#bdd1c9] bg-[#f7fbf9] p-5 shadow-[0_26px_70px_rgba(16,32,51,0.10)] sm:p-8">
            <div className="grid gap-8 lg:grid-cols-[0.75fr_1fr] lg:items-start">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#0b6b43]">Order options</p>
                <h2 className="mt-3 text-3xl font-black leading-tight text-[#102033] sm:text-5xl">{funnel.offer.title}</h2>
                <p className="mt-4 text-sm font-semibold leading-7 text-[#4b5f5a]">{offerExpired ? "This offer has expired. Normal Library pricing is now displayed." : funnel.offer.description}</p>
                {sampleUrl ? (
                  <SamplePreviewCta href={sampleUrl} onClick={openSamplePreview} tone="offer" className="mt-5" />
                ) : null}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {formatChoices.map((format) => (
                  <EditionCard key={format.id} format={format} currency={product.currency} onClick={() => checkout(format)} />
                ))}
              </div>
            </div>
            <p className="mt-5 border-t border-[#bdd1c9] pt-4 text-xs font-semibold leading-5 text-[#64748b]">
              Review the selected format, product description, sample where available, and <Link href="/returns" className="font-black text-[#0b8f54] underline">Refund Policy</Link> before checkout.
            </p>
          </div>
        </section>

        <section className="bg-[#102033] px-4 pb-40 pt-14 text-white sm:px-6 md:pb-16">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.68fr_1fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#5ce39d]">Last questions</p>
              <h2 className="mt-3 text-3xl font-black uppercase leading-none sm:text-5xl">{funnel.finalTitle}</h2>
              <SalesCtaButton onClick={() => openEditionSelector("GUIDE_FINAL_BUY")} className="mt-6" subtitle="Choose digital or printed">
                {funnel.primaryCta}
              </SalesCtaButton>
            </div>
            <div className="grid gap-3">
              {shortFaq.map((faq) => (
                <details key={faq.question} className="border border-white/10 bg-white/[0.04] p-4">
                  <summary className="cursor-pointer list-none text-sm font-black">{faq.question}</summary>
                  <p className="mt-2 text-sm font-semibold leading-7 text-slate-300">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {stickyVisible ? (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">
            <div className="mx-auto grid max-w-xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[#102033]">{shortTitle(product.title)}</p>
                <p className="text-xs font-bold text-slate-500">From {product.currency} {minPrice.toFixed(2)}</p>
              </div>
              <SalesCtaButton onClick={() => openEditionSelector("GUIDE_STICKY_BUY")} className="min-h-11 px-4 text-sm shadow-none"><ShoppingCart className="size-4" /> Buy now</SalesCtaButton>
            </div>
          </div>
        ) : null}

        {selectorModal}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#e9e9e4] text-[#101010]">
      <section className="relative overflow-hidden bg-[#07111f] text-white">
        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center px-4 pb-0 pt-5 text-center sm:px-6 sm:pt-8">
          <div className="w-full max-w-4xl">
            <FunnelLogo />
            <p className="mt-5 text-[0.68rem] font-black uppercase tracking-[0.14em] text-white sm:mt-9 sm:text-base sm:tracking-normal">
              {isPropertyDevelopmentTemplate ? (
                <>Before you commit property money in <span className="text-[#20c36b]">Zimbabwe</span></>
              ) : (
                funnel.label
              )}
            </p>
            <h1 className="mx-auto mt-2 max-w-4xl text-[2rem] font-black uppercase leading-[0.94] tracking-normal sm:mt-4 sm:text-6xl lg:text-[4.6rem]">
              {isPropertyDevelopmentTemplate ? (
                <><span className="text-[#20c36b]">Before you buy land</span> or start building, read this.</>
              ) : (
                funnel.headline
              )}
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
                <h2 className="mt-3 text-3xl font-black uppercase leading-tight sm:text-5xl">
                  {isPropertyDevelopmentTemplate ? "Land. Plans. Approvals. Law." : product.title}
                </h2>
                <p className="mt-4 max-w-xl text-sm font-bold leading-7 text-slate-700 sm:text-base">
                  {isPropertyDevelopmentTemplate
                    ? "A practical Zimbabwe property development and property law guide for land buyers, builders, developers, investors, and anyone preparing for approvals, contractors, subdivision, or council processes."
                    : funnel.subheadline}
                </p>
                {sampleUrl ? (
                  <SamplePreviewCta href={sampleUrl} onClick={openSamplePreview} tone="property" className="mt-5" />
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
            <div className="grid gap-1">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-white/85">Launch offer</p>
              <p className="text-base font-black leading-6 sm:text-lg">
                Digital guide - <span className="uppercase">{product.currency} {digitalPrice.toFixed(2)}</span>{printedPrice ? <> | Printed guide - {product.currency} {printedPrice.toFixed(2)}</> : null}
              </p>
              <p className="text-xs font-bold leading-5 text-white/85 sm:text-sm">Secure checkout. Digital access after payment.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f7f3ea] px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.26em] text-[#0b8f54]">Before you make the next property decision</p>
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
                {isPropertyDevelopmentTemplate
                  ? "For first-time land buyers, builders, investors, developers, subdivision plans, and anyone preparing for a Zimbabwe property project."
                  : funnel.audienceTitle}
              </p>
              <SalesCtaButton onClick={() => openEditionSelector("ORDER_STACK_BUY")} className="mt-4 min-h-[3.75rem] w-full px-7 text-base shadow-[0_8px_0_rgba(11,13,18,0.22)] sm:mt-0 sm:w-auto sm:min-w-[21rem] sm:flex-none" subtitle="Choose digital or printed">
                Get the property guide
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
          <div className="mt-5 border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-950">
            <p>
              Review the selected format, product description, table of contents, and sample where available before buying. Refund and cancellation requests are handled under the{" "}
              <Link href="/returns" className="font-black underline underline-offset-2">Returns, Refunds & Digital Products Policy</Link>.
            </p>
            <p className="mt-2 text-xs leading-5 text-amber-900">{propertyLawScope}</p>
          </div>
        </div>
      </section>

      <section className="bg-[#f7f3ea] px-4 py-14 sm:px-6">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.72fr_1fr] lg:items-start">
          <div>
            <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[#0b8f54]">Last checks before buying</p>
            <h2 className="mt-2 text-[2rem] font-black uppercase leading-[0.96] text-[#0d1422] sm:text-[2.65rem]">Questions before you order</h2>
            <p className="mt-4 text-sm font-semibold leading-7 text-slate-700">{funnel.disclaimer}</p>
            <div className="mt-5 border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-950">
              <p>{propertyLawScope}</p>
              <p className="mt-2">
                Before placing an order, review the sample where available and confirm whether you are choosing a digital or printed edition. See the{" "}
                <Link href="/returns" className="font-black underline underline-offset-2">Refund Policy</Link>.
              </p>
            </div>
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
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#20c36b]">Limited launch pricing</p>
          <h2 className="mt-3 text-3xl font-black uppercase leading-tight sm:text-5xl">{funnel.finalTitle}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm font-bold leading-7 text-slate-200 sm:text-base">
            {isPropertyDevelopmentTemplate
              ? `Get the guide for ${product.currency} ${digitalPrice.toFixed(2)} and understand the process before you commit.`
              : funnel.subheadline}
          </p>
          {printedPrice ? (
            <p className="mt-3 text-sm font-black uppercase tracking-[0.1em] text-[#20c36b]">
              Digital - {product.currency} {digitalPrice.toFixed(2)} | Printed - {product.currency} {printedPrice.toFixed(2)}
            </p>
          ) : null}
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

      {selectorModal}

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

function SamplePreviewCta({
  href,
  onClick,
  tone = "light",
  className,
  label = "Preview sample before buying",
}: {
  href: string;
  onClick: () => void;
  tone?: "book" | "light" | "offer" | "property";
  className?: string;
  label?: string;
}) {
  const dark = tone === "book";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={cn(
        "group relative inline-flex min-h-[4.35rem] w-full max-w-[24rem] items-center gap-3 overflow-hidden border px-4 py-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.10)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto",
        dark
          ? "border-[#d8a73f]/70 bg-[#fff8e8] text-[#201a14] focus-visible:outline-[#d8a73f] hover:bg-white"
          : "border-[#0b8f54] bg-white text-[#0d1422] focus-visible:outline-[#0b8f54] hover:bg-[#f2fbf6]",
        tone === "offer" && "border-[#0b8f54] shadow-[8px_8px_0_rgba(11,143,84,0.16)]",
        tone === "property" && "w-fit max-w-full border-[2px] shadow-[8px_8px_0_rgba(11,143,84,0.18)]",
        className,
      )}
    >
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1.5", dark ? "bg-[#d8a73f]" : "bg-[#0b8f54]")} />
      <span
        aria-hidden="true"
        className={cn(
          "absolute right-3 top-3 size-2.5 rounded-full animate-ping",
          dark ? "bg-[#d8a73f]" : "bg-[#20c36b]",
        )}
      />
      <span className={cn("grid size-11 shrink-0 place-items-center border", dark ? "border-[#d8a73f] bg-[#201a14] text-[#d8a73f]" : "border-[#0b8f54]/30 bg-[#e8f8ef] text-[#0b8f54]")}>
        <BookOpen className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black uppercase leading-tight tracking-normal">{label}</span>
        <span className={cn("mt-1 block text-xs font-bold leading-5", dark ? "text-[#675747]" : "text-slate-600")}>
          Check the contents and sample pages before checkout.
        </span>
      </span>
      <ArrowRight className={cn("size-5 shrink-0 transition group-hover:translate-x-1", dark ? "text-[#906512]" : "text-[#0b8f54]")} />
    </a>
  );
}

function SalesCtaButton({ children, className, onClick, subtitle }: { children: React.ReactNode; className?: string; onClick: () => void; subtitle?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-[3.55rem] max-w-full flex-col items-center justify-center gap-1 bg-[#0b8f54] px-7 py-3.5 text-center text-lg font-black uppercase leading-tight text-white shadow-[0_10px_0_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:bg-[#087044] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#20c36b] active:translate-y-0 sm:px-8 sm:text-xl",
        className,
      )}
    >
      <span className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 whitespace-normal break-words px-1 leading-tight">{children}</span>
      {subtitle ? <span className="max-w-full px-1 text-center text-xs font-bold normal-case leading-tight text-white/90">({subtitle})</span> : null}
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
  const label = format.type === "PRINTED_BOOK" ? "Printed guide" : "Digital guide";
  const description = format.type === "PRINTED_BOOK"
    ? "Physical copy, with delivery or pickup details confirmed in checkout."
    : "Library access after payment confirmation, so you can start with the guide faster.";
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
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{description}</p>
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
