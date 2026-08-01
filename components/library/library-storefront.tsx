"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Award, BookOpen, BookmarkCheck, ChevronDown, Filter, Minus, Plus, Search, ShieldCheck, ShoppingBag, ShoppingCart, Trash2, Truck } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { trackEvent } from "@/lib/analytics/client";
import { HL_GREEN, HL_NAVY } from "@/components/brand/houselink-icon";
import { LibraryCartFab } from "@/components/library/library-cart-fab";
import { LibraryFormatPickerDialog } from "@/components/library/library-format-picker-dialog";
import { LibraryProductCard } from "@/components/library/library-product-card";
import { useApp } from "@/components/providers/app-provider";
import {
  libraryCartLineKey,
  notifyLibraryCartAdded,
  repriceLibraryCartLine,
  trackLibraryCartEvent,
  useLibraryCart,
  sameLibraryCartLine,
  type LibraryCartLine,
} from "@/lib/library/cart-client";
import {
  enabledLibraryFormats,
  libraryFacets,
  maxLibraryPrintQuantity,
  normalizeLibraryVolumeTiers,
  primaryLibraryFormat,
  type LibraryProduct,
  type LibraryProductFormat,
} from "@/lib/library/catalog";
import type { LibraryStoreSettings } from "@/lib/library/settings-shared";
import { cn } from "@/lib/utils";

type Merchandising = LibraryStoreSettings["merchandising"];
type Store = LibraryStoreSettings["store"];

const DESIGN_HERO_HEADLINE = "Everything Property Professionals Need.";
const DESIGN_HERO_SUBCOPY = "Books, manuals, contracts, forms and toolkits built for Zimbabwe's property industry.";
const DEFAULT_CATALOGUE_HREF = "#library-products";

export function LibraryStorefront({
  products,
  merchandising,
  store: _store,
  seo,
}: {
  products: LibraryProduct[];
  merchandising: Merchandising;
  store: Store;
  seo?: LibraryStoreSettings["seo"];
}) {
  const { showToast, user } = useApp();
  const facets = useMemo(() => {
    if (!products.length) {
      return { categories: libraryFacets().categories, formats: [] as Array<{ value: string; label: string }> };
    }
    const formatTypes = new Set<string>();
    for (const product of products) {
      for (const format of enabledLibraryFormats(product)) {
        formatTypes.add(format.type);
      }
    }
    return {
      categories: Array.from(new Set(products.map((p) => p.category))).sort(),
      formats: Array.from(formatTypes)
        .sort((a, b) => formatTypeLabel(a).localeCompare(formatTypeLabel(b)))
        .map((value) => ({ value, label: formatTypeLabel(value) })),
    };
  }, [products]);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [sort, setSort] = useState(merchandising.defaultSort === "downloads" ? "most-downloaded" : merchandising.defaultSort === "rating" ? "highest-rated" : merchandising.defaultSort);
  const [formatPickerProduct, setFormatPickerProduct] = useState<LibraryProduct | null>(null);
  const { cart, setCart, total, currency, count } = useLibraryCart();
  const quantityFor = (productId: string) => cart.filter((line) => line.productId === productId).reduce((sum, line) => sum + line.quantity, 0);

  const featuredHeroProduct = useMemo(() => pickFeaturedLibraryProduct(products), [products]);

  const curated = useMemo(() => {
    if (!merchandising.showCuratedRail) return [];
    return products.filter((product) => product.editorsChoice || product.featured).slice(0, merchandising.maxCuratedItems);
  }, [products, merchandising.showCuratedRail, merchandising.maxCuratedItems]);

  const results = useMemo(
    () => filterProducts(products, { query, category, type, sort }),
    [products, query, category, type, sort],
  );

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const timer = window.setTimeout(() => {
      trackEvent("library_search_submitted", q, {
        query: q,
        resultCount: results.length,
        zeroResults: results.length === 0 ? "true" : "false",
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [query, results.length]);

  const hidePrices = merchandising.hidePricesUntilLogin && !user;
  const headline = merchandising.heroHeadline?.trim() || DESIGN_HERO_HEADLINE;
  const subcopy = merchandising.heroSubcopy?.trim() || DESIGN_HERO_SUBCOPY;
  const useDesignedHeadline = normalizeHeroCopy(headline) === normalizeHeroCopy(DESIGN_HERO_HEADLINE);
  const ctaLabel = merchandising.ctaLabel?.trim() || "Browse the catalogue";
  const ctaHref = merchandising.ctaHref?.trim() || DEFAULT_CATALOGUE_HREF;

  function addFormatToCart(product: LibraryProduct, format: LibraryProductFormat) {
    const tiers =
      format.type === "PRINTED_BOOK" ? normalizeLibraryVolumeTiers(format.volumeTiers, format.price) : [];
    const maxQty = format.type === "PRINTED_BOOK" ? maxLibraryPrintQuantity(product) : 99;
    setCart((current) => {
      const existing = current.find((line) => sameLibraryCartLine(line, { productId: product.id, formatId: format.id }));
      if (existing) {
        const nextQty = Math.min(existing.quantity + 1, Math.max(1, maxQty || 1));
        return current.map((line) =>
          sameLibraryCartLine(line, { productId: product.id, formatId: format.id })
            ? repriceLibraryCartLine(
                {
                  ...line,
                  listPrice: format.price,
                  volumeTiers: tiers.length ? tiers : undefined,
                },
                nextQty,
              )
            : line,
        );
      }
      return [
        ...current,
        repriceLibraryCartLine(
          {
            productId: product.id,
            title: `${product.title} (${format.label})`,
            price: format.price,
            listPrice: format.price,
            currency: product.currency,
            quantity: 1,
            formatId: format.id,
            formatType: format.type,
            formatLabel: format.label,
            volumeTiers: tiers.length ? tiers : undefined,
          },
          1,
        ),
      ];
    });
    notifyLibraryCartAdded(product.title);
    trackLibraryCartEvent("CART_ADD_SINGLE", product.id, {
      title: product.title,
      productId: product.id,
      formatId: format.id,
      formatType: format.type,
      formatLabel: format.label,
      price: format.price,
      source: "storefront",
    });
    showToast("Added to your bag.", "success");
  }

  function requestAddToCart(product: LibraryProduct) {
    const formats = enabledLibraryFormats(product);
    if (formats.length > 1) {
      setFormatPickerProduct(product);
      return;
    }
    const format = primaryLibraryFormat(formats, product.productType, product.price);
    addFormatToCart(product, format);
  }

  return (
    <main className="min-h-screen bg-[#fafafa] pb-24 text-[#141414] antialiased dark:bg-slate-950 dark:text-white lg:pb-0">
      <LibraryCartFab />
      {formatPickerProduct && (
        <LibraryFormatPickerDialog
          product={formatPickerProduct}
          hidePrice={hidePrices}
          onClose={() => setFormatPickerProduct(null)}
          onConfirm={(format) => {
            addFormatToCart(formatPickerProduct, format);
            setFormatPickerProduct(null);
          }}
        />
      )}

      <section className="relative overflow-hidden bg-[#f7f8f9]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 top-0 h-36 w-36 rounded-full bg-[#22a54b]/20 blur-3xl motion-safe:animate-library-drift sm:-right-8 sm:h-56 sm:w-56 lg:right-[6%] lg:top-2 lg:h-72 lg:w-72"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-[linear-gradient(180deg,transparent_0%,rgba(232,220,198,0.32)_38%,rgba(214,196,168,0.55)_100%)]"
        />

        <div className="relative mx-auto max-w-[90rem] px-4 pt-5 sm:px-6 sm:pt-8 lg:px-8 lg:pt-12 xl:px-10">
          {/* Mobile ref: always split — copy left, two books right */}
          <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(8.25rem,0.95fr)] items-center gap-2.5 sm:grid-cols-[minmax(0,1.1fr)_minmax(14rem,0.95fr)] sm:gap-6 md:gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,1fr)] lg:gap-10 xl:gap-14">
            <div className="relative z-10 min-w-0 max-w-xl text-left motion-safe:animate-fade-up">
              <span
                className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#b7e0c4] bg-[#e8f7ee] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.11em] sm:gap-1.5 sm:px-3 sm:py-1 sm:text-[11px] sm:tracking-[0.14em]"
                style={{ color: HL_GREEN }}
              >
                <BookOpen className="size-3 shrink-0 sm:size-3.5" strokeWidth={2.25} />
                <span className="truncate">Resources that build success</span>
              </span>

              {useDesignedHeadline ? (
                <h1
                  className="mt-2.5 text-[1.55rem] font-bold leading-[1.18] tracking-tight sm:mt-4 sm:text-[2.5rem] sm:leading-[1.12] md:text-5xl lg:mt-5 lg:text-[3.35rem] lg:leading-[1.04] xl:text-[3.6rem]"
                  style={{ color: HL_NAVY }}
                >
                  <span className="block">Everything</span>
                  {/* Mobile: each word on its own line; Property + Professionals green */}
                  <span className="block lg:hidden" style={{ color: HL_GREEN }}>
                    Property
                  </span>
                  <span className="block lg:hidden" style={{ color: HL_GREEN }}>
                    Professionals
                  </span>
                  <span className="block lg:hidden">
                    Need<span style={{ color: HL_GREEN }}>.</span>
                  </span>
                  {/* Desktop: “Property Professionals” on one green line */}
                  <span className="hidden lg:block" style={{ color: HL_GREEN }}>
                    Property Professionals
                  </span>
                  <span className="hidden lg:block">
                    Need<span style={{ color: HL_GREEN }}>.</span>
                  </span>
                </h1>
              ) : (
                <h1
                  className="mt-2.5 text-[1.55rem] font-bold leading-[1.18] tracking-tight sm:mt-4 sm:text-[2.5rem] sm:leading-[1.12] md:text-5xl lg:mt-5 lg:text-[3.35rem] lg:leading-[1.04] xl:text-[3.6rem]"
                  style={{ color: HL_NAVY }}
                >
                  {headline}
                </h1>
              )}

              <p className="mt-2 max-w-md text-[11px] leading-[1.45] text-slate-600 sm:mt-4 sm:text-[15px] sm:leading-7 md:text-base">
                {subcopy}
              </p>

              {/* Mobile: stacked CTAs · Desktop: side-by-side */}
              <div className="mt-3.5 flex w-full max-w-[16.5rem] flex-col gap-2 sm:mt-6 sm:max-w-none sm:gap-3 lg:mt-8 lg:max-w-none lg:flex-row lg:items-center">
                {ctaHref.startsWith("/") ? (
                  <Link
                    href={ctaHref}
                    className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full px-3.5 text-[11px] font-semibold text-white shadow-[0_8px_20px_rgba(34,165,75,0.28)] transition hover:brightness-110 sm:h-12 sm:gap-2 sm:rounded-2xl sm:px-5 sm:text-sm lg:h-[3.25rem] lg:w-auto lg:px-6"
                    style={{ backgroundColor: HL_GREEN }}
                  >
                    <BookOpen className="size-3.5 shrink-0 sm:size-4" strokeWidth={2.25} />
                    <span className="truncate">{ctaLabel}</span>
                    <ArrowRight className="size-3.5 shrink-0 sm:size-4" />
                  </Link>
                ) : (
                  <a
                    href={ctaHref}
                    className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full px-3.5 text-[11px] font-semibold text-white shadow-[0_8px_20px_rgba(34,165,75,0.28)] transition hover:brightness-110 sm:h-12 sm:gap-2 sm:rounded-2xl sm:px-5 sm:text-sm lg:h-[3.25rem] lg:w-auto lg:px-6"
                    style={{ backgroundColor: HL_GREEN }}
                  >
                    <BookOpen className="size-3.5 shrink-0 sm:size-4" strokeWidth={2.25} />
                    <span className="truncate">{ctaLabel}</span>
                    <ArrowRight className="size-3.5 shrink-0 sm:size-4" />
                  </a>
                )}
                <Link
                  href="/dashboard/my-library"
                  className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-[#e8ecef] bg-white px-3.5 text-[11px] font-semibold shadow-[0_4px_14px_rgba(15,23,42,0.06)] transition hover:border-[#22a54b]/50 sm:h-12 sm:gap-2 sm:rounded-2xl sm:px-5 sm:text-sm lg:h-[3.25rem] lg:w-auto lg:px-6"
                  style={{ color: HL_NAVY }}
                >
                  <BookmarkCheck className="size-3.5 shrink-0 sm:size-4" style={{ color: HL_GREEN }} />
                  My Library
                </Link>
              </div>
            </div>

            <div className="relative w-full min-w-0 self-end motion-safe:animate-fade-up motion-safe:[animation-delay:120ms] lg:self-center lg:justify-self-end">
              <div className="motion-safe:animate-library-book-float">
                {/* Mobile/desktop: uploaded book with black studio bg keyed out */}
                <Image
                  src="/images/library/library-hero-books-mobile.png"
                  alt={
                    featuredHeroProduct
                      ? `${featuredHeroProduct.title} — HouseLink Library`
                      : "The Complete Guide to Property Development and Property Law in Zimbabwe"
                  }
                  width={719}
                  height={1024}
                  priority
                  unoptimized
                  className="relative z-[1] mx-auto h-auto w-full bg-transparent object-contain drop-shadow-[0_16px_36px_rgba(16,32,36,0.16)] lg:hidden"
                  sizes="(max-width: 1023px) 46vw, 1px"
                />
                <Image
                  src="/images/library/library-hero-books.png"
                  alt={
                    featuredHeroProduct
                      ? `${featuredHeroProduct.title} — HouseLink Library`
                      : "The Complete Guide to Property Development and Property Law in Zimbabwe"
                  }
                  width={719}
                  height={1024}
                  priority
                  unoptimized
                  className="relative z-[1] mx-auto hidden h-auto w-full max-w-[24rem] bg-transparent object-contain drop-shadow-[0_22px_48px_rgba(16,32,36,0.18)] lg:block xl:max-w-[26rem]"
                  sizes="(min-width: 1024px) 380px, 1px"
                />
              </div>
            </div>
          </div>

          {/* Trust bar: same content width as site nav (max-w-[90rem] + matching padding) */}
          <div className="relative z-10 mt-4 w-full pb-5 motion-safe:animate-library-trust-rise sm:mt-7 sm:pb-8 lg:mt-10 lg:pb-12">
            <div className="grid w-full grid-cols-3 divide-x divide-[#e8ecef] rounded-2xl border border-[#eef1f3] bg-white px-1 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:rounded-[1.25rem] sm:px-2 sm:py-4 lg:px-6 lg:py-5">
              <TrustItem
                icon={<ShieldCheck className="size-4 shrink-0 sm:size-6" style={{ color: HL_GREEN }} strokeWidth={2.1} />}
                title="Secure checkout"
                subtitle="Safe and trusted payments"
              />
              <TrustItem
                icon={<Award className="size-4 shrink-0 sm:size-6" style={{ color: HL_GREEN }} strokeWidth={2.1} />}
                title="Curated for operators"
                subtitle="Built for real estate professionals"
              />
              <TrustItem
                icon={<Truck className="size-4 shrink-0 sm:size-6" style={{ color: HL_GREEN }} strokeWidth={2.1} />}
                title="Library delivery"
                subtitle="Instant digital delivery"
              />
            </div>
          </div>
        </div>
      </section>

      {!products.length ? (
        <EmptyLibraryState />
      ) : (
        <>
          <section className="sticky top-16 z-20 mt-5 border-y border-[#dfe8e5] bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:mt-8">
            <div className="mx-auto grid max-w-[90rem] gap-2.5 px-3 py-3 sm:gap-3 sm:px-6 sm:py-4 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center lg:px-8 xl:px-10">
              <label className="relative min-w-0">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search title, author, or ISBN"
                  className="h-11 w-full rounded-full border border-[#d8e4e0] bg-white pl-11 pr-4 text-sm shadow-sm outline-none transition focus:border-[#22a54b] focus:ring-4 focus:ring-[#22a54b]/15 sm:h-12 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <div className="grid grid-cols-3 gap-2 lg:contents">
                <FilterSelect value={category} onChange={setCategory} label="Category" options={facets.categories} />
                <FilterSelect value={type} onChange={setType} label="Format" options={facets.formats} />
                <label className="relative min-w-0">
                  <span className="sr-only">Sort products</span>
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                    className="h-11 w-full appearance-none rounded-full border border-[#d8e4e0] bg-white px-3 pr-9 text-xs shadow-sm outline-none transition focus:border-[#22a54b] sm:h-12 sm:px-4 sm:pr-10 sm:text-sm dark:border-slate-700 dark:bg-slate-900 lg:w-44"
                  >
                    <option value="newest">Newest</option>
                    <option value="best-selling">Best selling</option>
                    <option value="most-downloaded">Most downloaded</option>
                    <option value="highest-rated">Highest rated</option>
                    <option value="price-asc">Price: low to high</option>
                    <option value="price-desc">Price: high to low</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 sm:right-3.5" aria-hidden />
                </label>
              </div>
            </div>
          </section>

          <section className="mx-auto grid max-w-[90rem] gap-6 px-3 pb-16 pt-8 sm:gap-8 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-8 xl:px-10">
            <div className="min-w-0 space-y-10 sm:space-y-14">
              {curated.length > 0 && (
                <div>
                  <div className="mb-5 flex items-end justify-between gap-4 sm:mb-8">
                    <h2 className="text-xl font-bold tracking-tight text-[#1a3560] dark:text-white sm:text-3xl">
                      {merchandising.curatedTitle || "Editor picks"}
                    </h2>
                    <a href="#library-products" className="hidden text-sm font-semibold text-[#1a3560]/60 transition hover:text-[#22a54b] sm:inline-flex dark:text-white/55 dark:hover:text-white">
                      View all
                    </a>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
                    {curated.map((product) => (
                      <LibraryProductCard
                        key={product.id}
                        product={product}
                        quantity={quantityFor(product.id)}
                        hidePrice={hidePrices}
                        onAdd={() => requestAddToCart(product)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div id="library-products">
                <div className="mb-5 sm:mb-8">
                  <h2 className="text-xl font-bold tracking-tight text-[#1a3560] dark:text-white sm:text-3xl">
                    All titles
                  </h2>
                  <p className="mt-1 text-sm text-[#1a3560]/55 sm:mt-2 dark:text-white/55">
                    {results.length} {results.length === 1 ? "product" : "products"}
                  </p>
                  {seo?.storeDescription?.trim() ? (
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {seo.storeDescription.trim()}
                    </p>
                  ) : null}
                </div>

                {results.length ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
                    {results.map((product) => (
                      <LibraryProductCard
                        key={product.id}
                        product={product}
                        quantity={quantityFor(product.id)}
                        hidePrice={hidePrices}
                        onAdd={() => requestAddToCart(product)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="py-12 text-center text-sm text-[#141414]/55 sm:py-16 dark:text-white/55">No titles match that search.</p>
                )}
              </div>
            </div>

            <aside className="hidden h-fit lg:sticky lg:top-24 lg:block">
              <CartPanel cart={cart} total={total} currency={currency} count={count} onCart={(next) => setCart(next)} />
            </aside>
          </section>
        </>
      )}
    </main>
  );
}

function CartPanel({
  cart,
  total,
  currency,
  count,
  onCart,
}: {
  cart: LibraryCartLine[];
  total: number;
  currency: string;
  count: number;
  onCart: (cart: LibraryCartLine[]) => void;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[#dfe8e5] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-[#dfe8e5] bg-[#fbfaf6] p-5 dark:border-slate-800 dark:bg-slate-950">
        <p className="flex items-center gap-2 text-sm font-bold text-[#1a3560] dark:text-white">
          <ShoppingBag className="size-4" style={{ color: HL_GREEN }} /> Library Bag
          {count > 0 && (
            <span className="rounded-full px-2 py-0.5 text-xs font-black text-white" style={{ backgroundColor: HL_GREEN }}>
              {count}
            </span>
          )}
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Checkout, invoices and secure delivery.</p>
      </div>
      <div className="space-y-3 p-5">
        {cart.length ? (
          cart.map((line) => (
            <div key={libraryCartLineKey(line)} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-2 font-bold text-ink dark:text-white">{line.title}</p>
                  {line.formatLabel && <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">{line.formatLabel}</p>}
                  <p className="text-slate-500">Qty {line.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-black">
                    {line.currency} {(line.price * line.quantity).toFixed(2)}
                  </p>
                  {line.listPrice != null && line.listPrice > line.price + 0.001 ? (
                    <p className="mt-0.5 text-[11px] font-semibold text-emerald-700">
                      {line.currency} {line.price.toFixed(2)} ea
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      const nextQty = Math.max(1, line.quantity - 1);
                      trackLibraryCartEvent("CART_QTY_CHANGE", line.productId, {
                        title: line.title,
                        quantity: nextQty,
                        formatLabel: line.formatLabel,
                        direction: "down",
                      });
                      onCart(
                        cart.map((item) =>
                          sameLibraryCartLine(item, line) ? repriceLibraryCartLine(item, nextQty) : item,
                        ),
                      );
                    }}
                    className="grid size-8 place-items-center text-slate-500 hover:text-emerald-700"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-8 text-center text-xs font-black">{line.quantity}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextQty = line.quantity + 1;
                      trackLibraryCartEvent("CART_QTY_CHANGE", line.productId, {
                        title: line.title,
                        quantity: nextQty,
                        formatLabel: line.formatLabel,
                        direction: "up",
                      });
                      onCart(
                        cart.map((item) =>
                          sameLibraryCartLine(item, line) ? repriceLibraryCartLine(item, nextQty) : item,
                        ),
                      );
                    }}
                    className="grid size-8 place-items-center text-slate-500 hover:text-emerald-700"
                    aria-label="Increase quantity"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    trackLibraryCartEvent("CART_REMOVE", line.productId, {
                      title: line.title,
                      quantity: line.quantity,
                      formatLabel: line.formatLabel,
                      price: line.price,
                    });
                    onCart(cart.filter((item) => !sameLibraryCartLine(item, line)));
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-red-600"
                >
                  <Trash2 className="size-3.5" /> Remove
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="grid min-h-32 place-items-center rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700">
            <div>
              <ShoppingCart className="mx-auto mb-2 size-6 text-slate-400" />
              Add a product to start checkout.
            </div>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-200 pt-3 font-black dark:border-slate-700">
          <span>Total</span>
          <span>
            {currency} {total.toFixed(2)}
          </span>
        </div>
        <Link
          href="/library/checkout"
          className={cn(
            "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-bold transition",
            cart.length
              ? "text-white hover:brightness-110"
              : "pointer-events-none bg-slate-100 text-slate-400 dark:bg-slate-800",
          )}
          style={cart.length ? { backgroundColor: HL_GREEN } : undefined}
        >
          <ShoppingCart className="size-4" /> Checkout
        </Link>
      </div>
    </div>
  );
}

function formatTypeLabel(type: string) {
  if (type === "PRINTED_BOOK") return "Printed book";
  if (type === "DIGITAL_BOOK") return "Digital book";
  if (type === "PDF") return "Digital PDF";
  return type.replace(/_/g, " ");
}

function FilterSelect({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: Array<string | { value: string; label: string }>;
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <Filter className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 sm:left-3.5 sm:size-4" aria-hidden />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-full border border-[#d8e4e0] bg-white pl-8 pr-7 text-xs shadow-sm outline-none transition focus:border-[#22a54b] sm:h-12 sm:pl-10 sm:pr-10 sm:text-sm dark:border-slate-700 dark:bg-slate-900 lg:w-44"
      >
        <option value="">{label}</option>
        {options.map((option) => {
          const item = typeof option === "string" ? { value: option, label: option.replace(/_/g, " ") } : option;
          return (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          );
        })}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 sm:right-3.5 sm:size-4" aria-hidden />
    </label>
  );
}

function EmptyLibraryState() {
  return (
    <section className="mx-auto max-w-[90rem] px-4 py-20 sm:px-6 lg:px-8 xl:px-10">
      <div className="mx-auto max-w-lg text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-lg bg-[#e8f4ef]" style={{ color: HL_NAVY }}>
          <BookOpen className="size-5" />
        </span>
        <h2 className="mt-6 text-3xl font-bold tracking-tight text-[#1a3560] dark:text-white">
          New titles are on the way
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-white/60">
          Professional property books, templates, and toolkits will appear here soon.
        </p>
        <Link
          href="/search"
          className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-white transition hover:brightness-110"
          style={{ backgroundColor: HL_GREEN }}
        >
          Browse properties <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}

function normalizeHeroCopy(value: string) {
  return value.trim().replace(/\s+/g, " ").replace(/[.!?]+$/g, "").toLowerCase();
}

function pickFeaturedLibraryProduct(products: LibraryProduct[]) {
  if (!products.length) return null;
  return (
    products.find((product) => product.editorsChoice) ??
    products.find((product) => product.featured) ??
    products.find((product) => /property development|property law/i.test(`${product.title} ${product.subtitle}`)) ??
    products[0] ??
    null
  );
}

function TrustItem({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex min-w-0 items-center justify-center gap-1 px-0.5 sm:gap-3 sm:px-4 lg:justify-start">
      {icon}
      <div className="min-w-0 text-left">
        <p
          className="whitespace-nowrap text-[clamp(0.55rem,2.15vw,0.875rem)] font-bold leading-none tracking-tight sm:text-sm sm:leading-tight"
          style={{ color: HL_NAVY }}
        >
          {title}
        </p>
        <p className="mt-0.5 hidden text-xs leading-snug text-slate-500 lg:block">{subtitle}</p>
      </div>
    </div>
  );
}

function filterProducts(
  products: LibraryProduct[],
  input: { query: string; category: string; type: string; sort: string },
) {
  const q = input.query.trim().toLowerCase();
  return products
    .filter((product) => {
      const haystack = [
        product.title,
        product.subtitle,
        product.author,
        product.isbn,
        product.category,
        product.collection,
        product.series,
        product.publisher,
        product.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      const matchesFormat =
        !input.type ||
        enabledLibraryFormats(product).some((format) => format.type === input.type) ||
        // Keep older productType matches working for catalogues without format rows.
        product.productType === input.type;
      return (!q || haystack.includes(q)) && (!input.category || product.category === input.category) && matchesFormat;
    })
    .sort((a, b) => {
      if (input.sort === "price-asc") return a.price - b.price;
      if (input.sort === "price-desc") return b.price - a.price;
      if (input.sort === "highest-rated") return b.rating - a.rating;
      if (input.sort === "most-downloaded") return b.downloadCount - a.downloadCount;
      if (input.sort === "best-selling") return Number(b.bestSeller) - Number(a.bestSeller) || b.downloadCount - a.downloadCount;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
}
