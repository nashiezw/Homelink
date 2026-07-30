"use client";

import Link from "next/link";
import { ArrowRight, Award, BookOpen, BookmarkCheck, ChevronDown, Filter, Minus, Plus, Search, ShieldCheck, ShoppingBag, ShoppingCart, Star, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { HL_GREEN, HL_NAVY } from "@/components/brand/houselink-icon";
import { BookCover } from "@/components/library/book-cover";
import { LibraryCartFab } from "@/components/library/library-cart-fab";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import {
  libraryCartLineKey,
  notifyLibraryCartAdded,
  useLibraryCart,
  sameLibraryCartLine,
  type LibraryCartLine,
} from "@/lib/library/cart-client";
import {
  enabledLibraryFormats,
  libraryFacets,
  libraryFormatsLabel,
  libraryPriceLabel,
  primaryLibraryFormat,
  type LibraryProduct,
  type LibraryProductFormat,
} from "@/lib/library/catalog";
import type { LibraryStoreSettings } from "@/lib/library/settings-shared";
import { cn } from "@/lib/utils";

type Merchandising = LibraryStoreSettings["merchandising"];
type Store = LibraryStoreSettings["store"];

export function LibraryStorefront({
  products,
  merchandising,
  store,
}: {
  products: LibraryProduct[];
  merchandising: Merchandising;
  store: Store;
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

  const featured = products.find((product) => product.editorsChoice) ?? products.find((product) => product.featured) ?? products[0];
  const curated = useMemo(() => {
    if (!merchandising.showCuratedRail) return [];
    return products.filter((product) => product.editorsChoice || product.featured).slice(0, merchandising.maxCuratedItems);
  }, [products, merchandising.showCuratedRail, merchandising.maxCuratedItems]);

  const results = useMemo(
    () => filterProducts(products, { query, category, type, sort }),
    [products, query, category, type, sort],
  );

  const hidePrices = merchandising.hidePricesUntilLogin && !user;
  const headline = merchandising.heroHeadline?.trim() || "Professional property books for every day.";
  const subcopy = merchandising.heroSubcopy?.trim() || "Manuals, legal packs, and tools for smarter property work in Zimbabwe.";
  const ctaLabel = merchandising.ctaLabel?.trim() || "Browse the catalogue";
  const ctaHref = merchandising.ctaHref?.trim() || "#library-products";
  const storeName = store.name?.trim() || "HouseLink Library";

  function addFormatToCart(product: LibraryProduct, format: LibraryProductFormat) {
    setCart((current) => {
      const existing = current.find((line) => sameLibraryCartLine(line, { productId: product.id, formatId: format.id }));
      if (existing) {
        return current.map((line) =>
          sameLibraryCartLine(line, { productId: product.id, formatId: format.id })
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [
        ...current,
        {
          productId: product.id,
          title: `${product.title} (${format.label})`,
          price: format.price,
          currency: product.currency,
          quantity: 1,
          formatId: format.id,
          formatType: format.type,
          formatLabel: format.label,
        },
      ];
    });
    notifyLibraryCartAdded(product.title);
    showToast(`${product.title} (${format.label}) added to your bag.`, "success");
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
        <FormatPickerDialog
          product={formatPickerProduct}
          hidePrice={hidePrices}
          onClose={() => setFormatPickerProduct(null)}
          onConfirm={(format) => {
            addFormatToCart(formatPickerProduct, format);
            setFormatPickerProduct(null);
          }}
        />
      )}

      <section className="mx-auto max-w-[90rem] px-3 pt-4 sm:px-6 sm:pt-8 lg:px-8 xl:px-10">
        <div
          className="relative overflow-hidden rounded-2xl sm:rounded-[1.75rem] dark:bg-[linear-gradient(135deg,#132743_0%,#0f172a_100%)]"
          style={{ backgroundImage: `linear-gradient(135deg, #e8f4ef 0%, #f4f8f7 42%, #e7eef5 100%)` }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-50 motion-safe:animate-library-drift"
            style={{
              backgroundImage: `radial-gradient(circle at 18% 20%, rgba(34,165,75,0.14), transparent 36%), radial-gradient(circle at 82% 70%, rgba(26,53,96,0.12), transparent 40%)`,
            }}
          />
          <div className="relative grid items-center gap-8 px-4 py-8 sm:gap-10 sm:px-10 sm:py-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,26rem)] lg:gap-8 lg:py-16 xl:gap-6 xl:px-14">
            <div className="max-w-xl motion-safe:animate-fade-up">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#22a54b]/90 sm:text-xs">
                {storeName}
              </p>
              <h1 className="mt-2 text-[2rem] font-bold leading-[1.08] tracking-tight text-[#1a3560] dark:text-white sm:mt-3 sm:text-5xl sm:leading-[1.05] lg:text-[3.4rem]">
                {headline}
              </h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-white/70 sm:mt-4 sm:text-base sm:leading-7">{subcopy}</p>
              <div className="mt-6 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:items-center sm:gap-3">
                <a
                  href={ctaHref}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white shadow-md transition hover:brightness-110 sm:w-auto"
                  style={{ backgroundColor: HL_GREEN }}
                >
                  {ctaLabel} <ArrowRight className="size-4" />
                </a>
                <Link
                  href="/dashboard/my-library"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[#c5ddd0] bg-white px-5 text-sm font-semibold text-[#1a3560] transition hover:border-[#22a54b] hover:text-[#22a54b] sm:w-auto dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  My Library <BookmarkCheck className="size-4" style={{ color: HL_GREEN }} />
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-[#1a3560] sm:mt-8 sm:gap-x-6 sm:text-sm dark:text-white/85">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 shrink-0 sm:size-4" style={{ color: HL_GREEN }} /> Secure checkout
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Award className="size-3.5 shrink-0 sm:size-4" style={{ color: HL_GREEN }} /> Curated for operators
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="size-3.5 shrink-0 sm:size-4" style={{ color: HL_GREEN }} /> Library delivery
                </span>
              </div>
            </div>

            {featured && (
              <div className="relative mx-auto flex w-full max-w-[20rem] items-end justify-center pb-4 motion-safe:animate-fade-up motion-safe:[animation-delay:120ms] lg:max-w-none lg:justify-end lg:pr-2">
                <div className="relative w-[78%] max-w-[17.5rem]">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -bottom-1 left-1/2 h-6 w-[88%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_center,rgba(16,32,36,0.22)_0%,rgba(16,32,36,0.08)_45%,transparent_72%)] blur-[2px]"
                  />
                  <div className="relative motion-safe:animate-library-float">
                    <div
                      aria-hidden
                      className="absolute inset-y-[3%] left-0 z-10 w-[7%] rounded-l-[3px] bg-[linear-gradient(90deg,#0f2744_0%,#1a3560_42%,#2a4d7a_100%)] shadow-[inset_-1px_0_0_rgba(255,255,255,0.12)]"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-y-[4%] left-[6.5%] z-10 w-px bg-white/25"
                    />
                    <BookCover
                      product={featured}
                      variant="shop"
                      interactive={false}
                      priority
                      className="relative w-full rounded-[3px] shadow-[0_28px_50px_rgba(16,32,36,0.18),0_8px_18px_rgba(16,32,36,0.08)] ring-1 ring-black/[0.06]"
                      sizes="320px"
                    />
                  </div>
                </div>
              </div>
            )}
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
                      <ProductCard
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
                </div>

                {results.length ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
                    {results.map((product) => (
                      <ProductCard
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

function FormatPickerDialog({
  product,
  hidePrice,
  onClose,
  onConfirm,
}: {
  product: LibraryProduct;
  hidePrice: boolean;
  onClose: () => void;
  onConfirm: (format: LibraryProductFormat) => void;
}) {
  const formats = enabledLibraryFormats(product);
  const [selectedId, setSelectedId] = useState(
    () => primaryLibraryFormat(formats, product.productType, product.price).id,
  );
  const selected = formats.find((format) => format.id === selectedId) ?? formats[0];

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#1a3560]/45 backdrop-blur-[2px]"
        aria-label="Close format picker"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-format-picker-title"
        className="relative z-10 flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-[#dfe8e5] bg-white shadow-[0_28px_80px_rgba(16,32,36,0.28)] sm:rounded-3xl dark:border-slate-700 dark:bg-slate-950"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#e8f0ed] bg-[linear-gradient(135deg,#e8f4ef_0%,#f4f8f7_55%,#e7eef5_100%)] px-4 py-3.5 sm:px-5 sm:py-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#22a54b]">Choose format</p>
            <h2 id="library-format-picker-title" className="mt-1 line-clamp-2 text-base font-bold text-[#1a3560] sm:text-lg dark:text-white">
              {product.title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{product.author}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-[#22a54b] hover:text-[#22a54b] dark:border-slate-700 dark:bg-slate-900"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="grid gap-4 p-4 sm:grid-cols-[7.5rem_1fr] sm:gap-5 sm:p-5">
            <BookCover product={product} variant="shop" interactive={false} className="mx-auto hidden w-28 shadow-md sm:block sm:w-full" sizes="140px" />
            <div className="space-y-2.5 sm:space-y-3">
              {formats.map((format) => {
                const selectedFormat = format.id === selected?.id;
                return (
                  <button
                    key={format.id}
                    type="button"
                    onClick={() => setSelectedId(format.id)}
                    className={cn(
                      "w-full rounded-2xl border px-3.5 py-3 text-left transition sm:px-4 sm:py-3.5",
                      selectedFormat
                        ? "border-[#22a54b] bg-[#e8f4ef] ring-2 ring-[#22a54b]/20 dark:bg-emerald-950/35"
                        : "border-slate-200 bg-white hover:border-[#22a54b]/70 dark:border-slate-700 dark:bg-slate-900",
                    )}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-[#1a3560] dark:text-white">{format.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                          {format.type === "PRINTED_BOOK" ? "Printed copy · shipping after payment" : "Digital copy · instant after payment"}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-black text-[#1a3560] sm:text-base dark:text-white">
                        {hidePrice ? "—" : `${product.currency} ${format.price.toFixed(2)}`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#e8f0ed] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:p-5 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-[#1a3560] transition hover:border-[#22a54b] dark:border-slate-700 dark:text-white"
          >
            Cancel
          </button>
          <Button
            type="button"
            disabled={!selected}
            onClick={() => selected && onConfirm(selected)}
            className="h-11 rounded-full bg-[#22a54b] hover:bg-[#1e9443] hover:from-[#22a54b] hover:to-[#22a54b]"
          >
            <ShoppingCart className="size-4" /> Add to bag
            {!hidePrice && selected ? ` · ${product.currency} ${selected.price.toFixed(2)}` : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProductCard({
  product,
  quantity,
  hidePrice,
  onAdd,
}: {
  product: LibraryProduct;
  quantity: number;
  hidePrice: boolean;
  onAdd: () => void;
}) {
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-[#dfe8e5] bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:border-[#22a54b] hover:shadow-xl sm:p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-hidden rounded-xl bg-[#f4f8f7] dark:bg-slate-950/60">
        <BookCover
          product={product}
          variant="shop"
          className="w-full max-w-none rounded-xl shadow-none ring-0"
          sizes="(max-width: 640px) 92vw, (max-width: 1280px) 45vw, 420px"
        />
      </div>
      <div className="mt-3 flex min-w-0 flex-1 flex-col sm:mt-4">
        <p className="text-[11px] font-black uppercase tracking-wide text-[#22a54b] sm:text-xs dark:text-emerald-300">
          {libraryFormatsLabel(product)}
        </p>
        <Link
          href={`/library/${product.slug}`}
          className="mt-1 line-clamp-2 text-sm font-black leading-snug text-[#1a3560] hover:text-[#22a54b] sm:text-base dark:text-white"
        >
          {product.title}
        </Link>
        <p className="mt-1 line-clamp-1 text-xs text-slate-500 sm:text-sm">{product.author}</p>
        <p className="mt-2 hidden line-clamp-2 text-sm leading-6 text-slate-600 sm:mt-3 sm:block dark:text-slate-300">{product.shortDescription}</p>
        <div className="mt-3 flex items-center justify-between gap-3 sm:mt-4">
          <span className="flex items-center gap-1 text-sm text-amber-500">
            <Star className="size-4 fill-current" />
            <span className="font-bold text-slate-700 dark:text-slate-200">{product.rating || "New"}</span>
          </span>
          <p className="text-sm font-black text-[#1a3560] sm:text-base dark:text-white">
            {hidePrice ? (
              <Link href={`/login?next=/library/${product.slug}`} className="text-sm font-bold text-[#22a54b] underline-offset-2 hover:underline">
                Sign in for price
              </Link>
            ) : (
              libraryPriceLabel(product)
            )}
          </p>
        </div>
        <div className="mt-auto grid grid-cols-[1fr_auto] gap-2 pt-3 sm:pt-4">
          <Button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onAdd();
            }}
            disabled={product.comingSoon && !product.preorder}
            className="min-h-11 rounded-full bg-[#22a54b] shadow-md shadow-emerald-900/10 hover:bg-[#1e9443] hover:from-[#22a54b] hover:to-[#22a54b]"
          >
            <ShoppingCart className="size-4" />{" "}
            {quantity ? `In bag (${quantity})` : product.preorder ? "Pre-order" : "Add"}
          </Button>
          <Link
            href={`/library/${product.slug}`}
            className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200 text-slate-600 shadow-sm transition hover:border-[#22a54b] hover:text-[#22a54b] dark:border-slate-700 dark:text-slate-300"
            aria-label={`View ${product.title}`}
          >
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
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
                <p className="font-black">
                  {line.currency} {(line.price * line.quantity).toFixed(2)}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => onCart(cart.map((item) => (sameLibraryCartLine(item, line) ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item)))}
                    className="grid size-8 place-items-center text-slate-500 hover:text-emerald-700"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-8 text-center text-xs font-black">{line.quantity}</span>
                  <button
                    type="button"
                    onClick={() => onCart(cart.map((item) => (sameLibraryCartLine(item, line) ? { ...item, quantity: item.quantity + 1 } : item)))}
                    className="grid size-8 place-items-center text-slate-500 hover:text-emerald-700"
                    aria-label="Increase quantity"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onCart(cart.filter((item) => !sameLibraryCartLine(item, line)))}
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
