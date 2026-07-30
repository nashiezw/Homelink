"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookmarkCheck,
  Filter,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { BookCover } from "@/components/library/book-cover";
import { LibraryCartFab } from "@/components/library/library-cart-fab";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import {
  notifyLibraryCartAdded,
  useLibraryCart,
  libraryCartLineKey,
  sameLibraryCartLine,
  type LibraryCartLine,
} from "@/lib/library/cart-client";
import {
  enabledLibraryFormats,
  libraryFacets,
  libraryFormatsLabel,
  libraryPriceLabel,
  type LibraryProduct,
} from "@/lib/library/catalog";
import type { LibraryStoreSettings } from "@/lib/library/settings-shared";
import { cn } from "@/lib/utils";

type Merchandising = LibraryStoreSettings["merchandising"];
type StoreInfo = LibraryStoreSettings["store"];

const SORT_MAP: Record<Merchandising["defaultSort"], string> = {
  newest: "newest",
  "best-selling": "best-selling",
  downloads: "most-downloaded",
  rating: "highest-rated",
  "price-asc": "price-asc",
  "price-desc": "price-desc",
};

const HERO_IMAGE = "/images/property-management-dusk.webp";

export function LibraryStorefront({
  products,
  merchandising,
  store,
}: {
  products: LibraryProduct[];
  merchandising: Merchandising;
  store: StoreInfo;
}) {
  const { showToast, user } = useApp();
  const facets = products.length
    ? {
        categories: Array.from(new Set(products.map((p) => p.category))).sort(),
        types: Array.from(new Set(products.map((p) => p.productType))).sort(),
      }
    : libraryFacets();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [sort, setSort] = useState(SORT_MAP[merchandising.defaultSort] ?? "newest");
  const { cart, setCart, total, currency, count } = useLibraryCart();

  const hidePrices = merchandising.hidePricesUntilLogin && !user;
  const featured =
    products.find((product) => product.editorsChoice) ?? products.find((product) => product.featured) ?? products[0];
  const featuredProducts = products
    .filter((product) => product.editorsChoice || product.featured)
    .slice(0, merchandising.maxCuratedItems);
  const results = useMemo(
    () => filterProducts(products, { query, category, type, sort }),
    [products, query, category, type, sort],
  );
  const quantityFor = (productId: string) =>
    cart.filter((line) => line.productId === productId).reduce((sum, line) => sum + line.quantity, 0);

  function addToCart(product: LibraryProduct) {
    const formats = enabledLibraryFormats(product);
    if (formats.length > 1) {
      window.location.href = `/library/${product.slug}`;
      return;
    }
    const format = formats[0];
    setCart((current) => {
      const existing = current.find((line) => sameLibraryCartLine(line, { productId: product.id, formatId: format?.id }));
      if (existing) {
        return current.map((line) =>
          sameLibraryCartLine(line, { productId: product.id, formatId: format?.id })
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [
        ...current,
        {
          productId: product.id,
          title: format ? `${product.title} (${format.label})` : product.title,
          price: format?.price ?? product.price,
          currency: product.currency,
          quantity: 1,
          formatId: format?.id,
          formatType: format?.type,
          formatLabel: format?.label,
        },
      ];
    });
    notifyLibraryCartAdded(product.title);
    showToast(`${product.title} added to your Library Bag.`, "success");
  }

  return (
    <main className="font-library bg-[#faf9f7] text-ink dark:bg-slate-950 dark:text-white">
      <LibraryCartFab />

      {/* Immersive full-bleed hero — one composition */}
      <section className="relative isolate min-h-[min(92vh,52rem)] overflow-hidden bg-ink text-white">
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          priority
          quality={72}
          className="object-cover object-[center_35%]"
          sizes="100vw"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(105deg,rgba(6,16,20,0.94)_0%,rgba(8,28,34,0.82)_46%,rgba(8,28,34,0.42)_100%)]"
        />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_55%,rgba(16,185,129,0.18),transparent_42%)]" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#faf9f7] to-transparent dark:from-slate-950" />

        <div className="relative mx-auto grid min-h-[min(92vh,52rem)] max-w-7xl items-center gap-10 px-4 pb-24 pt-16 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(16rem,0.9fr)] lg:gap-8 lg:px-8 lg:pb-28 lg:pt-20">
          <div className="min-w-0 max-w-2xl">
            <p className="animate-fade-up text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-emerald-300/90 motion-reduce:animate-none">
              Professional property resources
            </p>
            <h1 className="animate-fade-up mt-5 font-library-display text-[3.35rem] leading-[0.95] tracking-[-0.02em] text-white motion-reduce:animate-none sm:text-6xl lg:text-[4.75rem] lg:leading-[0.92] [animation-delay:80ms]">
              {store.name}
            </h1>
            <p className="animate-fade-up mt-5 max-w-lg text-xl font-medium leading-snug tracking-tight text-emerald-100/95 motion-reduce:animate-none sm:text-2xl sm:leading-snug [animation-delay:130ms]">
              {merchandising.heroHeadline}
            </p>
            <p className="animate-fade-up mt-4 max-w-md text-base leading-8 text-slate-200/90 motion-reduce:animate-none sm:text-[1.05rem] sm:leading-8 [animation-delay:180ms]">
              {merchandising.heroSubcopy || store.tagline}
            </p>
            <div className="animate-fade-up mt-9 flex flex-col gap-3 sm:flex-row sm:items-center [animation-delay:220ms] motion-reduce:animate-none">
              <Link
                href={merchandising.ctaHref || "#library-products"}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-emerald-500 px-6 text-sm font-semibold text-white transition hover:bg-emerald-400"
              >
                {merchandising.ctaLabel}
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/dashboard/my-library"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/25 bg-white/5 px-6 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
              >
                <BookmarkCheck className="size-4" />
                My Library
              </Link>
            </div>
            {!store.enabled && (
              <p className="mt-6 text-sm leading-6 text-amber-100/90">
                Checkout is temporarily limited while the storefront updates.
              </p>
            )}
          </div>

          {featured ? (
            <div className="animate-fade-up relative mx-auto w-full max-w-[18rem] pb-4 lg:mx-0 lg:max-w-none lg:justify-self-end [animation-delay:160ms] motion-reduce:animate-none">
              <div className="relative mx-auto w-[min(100%,17.5rem)] lg:ml-auto lg:mr-4 lg:w-[19rem]">
                <BookCover product={featured} className="w-full rotate-[-3deg] shadow-[0_40px_80px_rgba(0,0,0,0.45)]" priority />
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Catalogue surface */}
      <section className="relative -mt-6 bg-[#faf9f7] dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="library-toolbar sticky top-0 z-20 -mx-4 border-b border-ink/5 bg-[#faf9f7]/90 px-4 py-4 backdrop-blur-md dark:border-white/10 dark:bg-slate-950/90 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center">
              <label className="relative min-w-0">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search titles, authors, ISBN…"
                  className="h-11 w-full border-0 border-b border-ink/15 bg-transparent pl-10 pr-3 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-emerald-700 dark:border-white/20 dark:text-white"
                />
              </label>
              <Select value={category} onChange={setCategory} label="Category" options={facets.categories} />
              <Select value={type} onChange={setType} label="Format" options={facets.types} />
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="h-11 border-0 border-b border-ink/15 bg-transparent px-1 text-sm text-ink outline-none focus:border-emerald-700 dark:border-white/20 dark:text-white"
              >
                <option value="newest">Newest</option>
                <option value="best-selling">Best selling</option>
                <option value="most-downloaded">Most downloaded</option>
                <option value="highest-rated">Highest rated</option>
                <option value="price-asc">Price ↑</option>
                <option value="price-desc">Price ↓</option>
              </select>
            </div>
          </div>

          {!products.length ? (
            <EmptyLibraryState />
          ) : (
            <div className="grid gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:gap-16 lg:py-16">
              <div id="library-products" className="min-w-0 space-y-16">
                {featured && (
                  <FeaturedStrip
                    product={featured}
                    hidePrices={hidePrices}
                    quantity={quantityFor(featured.id)}
                    onAdd={() => addToCart(featured)}
                  />
                )}

                {merchandising.showCuratedRail && featuredProducts.length > 0 && (
                  <Shelf
                    eyebrow="Curated"
                    title={merchandising.curatedTitle || "Editor picks"}
                    products={featuredProducts}
                    onAdd={addToCart}
                    quantityFor={quantityFor}
                    hidePrices={hidePrices}
                  />
                )}

                <section>
                  <div className="mb-8 flex items-end justify-between gap-4 border-b border-ink/10 pb-4 dark:border-white/10">
                    <div>
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-emerald-800/80 dark:text-emerald-300/80">
                        Catalogue
                      </p>
                      <h2 className="mt-2 font-library-display text-3xl tracking-[-0.02em] text-ink dark:text-white sm:text-4xl">
                        {results.length} {results.length === 1 ? "title" : "titles"}
                      </h2>
                    </div>
                    {facets.categories.length > 1 && (
                      <div className="hidden flex-wrap justify-end gap-x-4 gap-y-1 text-sm md:flex">
                        <button
                          type="button"
                          onClick={() => setCategory("")}
                          className={cn("transition", !category ? "font-semibold text-ink dark:text-white" : "text-slate-500 hover:text-ink")}
                        >
                          All
                        </button>
                        {facets.categories.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setCategory(category === item ? "" : item)}
                            className={cn(
                              "transition",
                              category === item ? "font-semibold text-emerald-800 dark:text-emerald-300" : "text-slate-500 hover:text-ink dark:hover:text-white",
                            )}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {results.length ? (
                    <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
                      {results.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          quantity={quantityFor(product.id)}
                          onAdd={addToCart}
                          hidePrices={hidePrices}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="py-20 text-center">
                      <p className="font-library-display text-2xl text-ink dark:text-white">Nothing matches</p>
                      <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-slate-500">
                        Try another keyword, or clear your filters.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setQuery("");
                          setCategory("");
                          setType("");
                        }}
                        className="mt-5 text-sm font-semibold text-emerald-800 hover:text-emerald-950 dark:text-emerald-300"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </section>
              </div>

              <aside className="h-fit lg:sticky lg:top-24">
                <CartPanel cart={cart} total={total} currency={currency} count={count} onCart={(next) => setCart(next)} />
              </aside>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function FeaturedStrip({
  product,
  hidePrices,
  quantity,
  onAdd,
}: {
  product: LibraryProduct;
  hidePrices: boolean;
  quantity: number;
  onAdd: () => void;
}) {
  return (
    <article className="grid items-center gap-8 border-b border-ink/10 pb-12 dark:border-white/10 md:grid-cols-[11rem_minmax(0,1fr)] lg:grid-cols-[13rem_minmax(0,1fr)_auto]">
      <BookCover product={product} className="mx-auto w-full max-w-[11rem] md:mx-0 md:max-w-none" />
      <div className="min-w-0 text-center md:text-left">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-emerald-800/80 dark:text-emerald-300/80">
          Now featuring
        </p>
        <Link
          href={`/library/${product.slug}`}
          className="mt-3 block font-library-display text-3xl leading-[1.1] tracking-[-0.02em] text-ink transition hover:text-emerald-900 dark:text-white dark:hover:text-emerald-200 sm:text-4xl"
        >
          {product.title}
        </Link>
        <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">{product.shortDescription}</p>
        <p className="mt-4 text-sm text-slate-500">
          {product.author} · {libraryFormatsLabel(product)}
        </p>
      </div>
      <div className="flex flex-col items-center gap-3 md:items-start lg:items-end">
        <p className="text-xl font-semibold tracking-tight text-ink dark:text-white">
          {hidePrices ? "Sign in for price" : libraryPriceLabel(product)}
        </p>
        <Button onClick={onAdd} className="min-w-[10rem] rounded-md">
          <ShoppingCart className="size-4" />
          {quantity ? `In bag (${quantity})` : "Add to bag"}
        </Button>
        <Link href={`/library/${product.slug}`} className="text-sm font-semibold text-emerald-800 hover:text-emerald-950 dark:text-emerald-300">
          View details
        </Link>
      </div>
    </article>
  );
}

function Shelf({
  eyebrow,
  title,
  products,
  onAdd,
  quantityFor,
  hidePrices,
}: {
  eyebrow: string;
  title: string;
  products: LibraryProduct[];
  onAdd: (product: LibraryProduct) => void;
  quantityFor: (id: string) => number;
  hidePrices: boolean;
}) {
  return (
    <section>
      <div className="mb-8 border-b border-ink/10 pb-4 dark:border-white/10">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-emerald-800/80 dark:text-emerald-300/80">
          {eyebrow}
        </p>
        <h2 className="mt-2 font-library-display text-3xl tracking-[-0.02em] text-ink dark:text-white sm:text-4xl">{title}</h2>
      </div>
      <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            quantity={quantityFor(product.id)}
            onAdd={onAdd}
            hidePrices={hidePrices}
          />
        ))}
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
      return (
        (!q || haystack.includes(q)) &&
        (!input.category || product.category === input.category) &&
        (!input.type || product.productType === input.type)
      );
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

function EmptyLibraryState() {
  return (
    <div className="px-2 py-24 text-center">
      <p className="font-library-display text-3xl text-ink dark:text-white">Titles are on the way</p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500">
        Professional property books and toolkits will appear here soon.
      </p>
      <Link
        href="/search"
        className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-600"
      >
        Browse properties <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

function ProductCard({
  product,
  quantity,
  onAdd,
  hidePrices = false,
}: {
  product: LibraryProduct;
  quantity: number;
  onAdd: (product: LibraryProduct) => void;
  hidePrices?: boolean;
}) {
  return (
    <article className="group flex h-full flex-col">
      <div className="relative flex justify-center">
        <div
          aria-hidden
          className="absolute inset-x-6 bottom-0 h-px bg-ink/10 transition group-hover:bg-emerald-800/25 dark:bg-white/10"
        />
        <BookCover
          product={product}
          className="w-full max-w-[11.5rem] transition duration-500 ease-out group-hover:-translate-y-2"
        />
      </div>
      <div className="mt-6 flex flex-1 flex-col">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-emerald-800/75 dark:text-emerald-300/80">
          {libraryFormatsLabel(product)}
        </p>
        <Link
          href={`/library/${product.slug}`}
          className="mt-2 line-clamp-2 font-library-display text-[1.35rem] leading-snug tracking-[-0.015em] text-ink transition hover:text-emerald-900 dark:text-white dark:hover:text-emerald-200"
        >
          {product.title}
        </Link>
        <p className="mt-2 text-sm leading-6 text-slate-500">{product.author}</p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <p className="text-base font-semibold tracking-tight text-ink dark:text-white">
            {hidePrices ? "Sign in" : libraryPriceLabel(product)}
          </p>
          <button
            type="button"
            onClick={() => onAdd(product)}
            disabled={product.comingSoon && !product.preorder}
            className="inline-flex h-9 items-center gap-1.5 text-sm font-semibold text-emerald-800 transition hover:text-emerald-950 disabled:opacity-50 dark:text-emerald-300"
          >
            <ShoppingCart className="size-3.5" />
            {quantity ? `In bag (${quantity})` : "Add"}
          </button>
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
    <div className="border border-ink/10 bg-white/80 p-5 dark:border-white/10 dark:bg-slate-900/60">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-white">
        <ShoppingBag className="size-4 text-emerald-700" />
        Library Bag
        {count > 0 && <span className="text-xs font-semibold tabular-nums text-slate-500">{count}</span>}
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-500">Secure checkout and invoice-ready orders.</p>

      <div className="mt-5 space-y-4">
        {cart.length ? (
          cart.map((line) => (
            <div key={libraryCartLineKey(line)} className="border-t border-ink/8 pt-4 text-sm dark:border-white/10">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-2 font-semibold leading-snug text-ink dark:text-white">{line.title}</p>
                  {line.formatLabel && (
                    <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-emerald-700">{line.formatLabel}</p>
                  )}
                </div>
                <p className="shrink-0 font-semibold tabular-nums">
                  {line.currency} {(line.price * line.quantity).toFixed(2)}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="inline-flex items-center border border-ink/10 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() =>
                      onCart(
                        cart.map((item) =>
                          sameLibraryCartLine(item, line) ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item,
                        ),
                      )
                    }
                    className="grid size-8 place-items-center text-slate-500 hover:text-emerald-700"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-8 text-center text-xs font-semibold tabular-nums">{line.quantity}</span>
                  <button
                    type="button"
                    onClick={() =>
                      onCart(cart.map((item) => (sameLibraryCartLine(item, line) ? { ...item, quantity: item.quantity + 1 } : item)))
                    }
                    className="grid size-8 place-items-center text-slate-500 hover:text-emerald-700"
                    aria-label="Increase quantity"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onCart(cart.filter((item) => !sameLibraryCartLine(item, line)))}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-600"
                >
                  <Trash2 className="size-3.5" /> Remove
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="border-t border-ink/8 py-8 text-center text-sm leading-6 text-slate-500 dark:border-white/10">
            Your bag is empty.
          </div>
        )}

        <div className="flex items-center justify-between border-t border-ink/10 pt-4 text-sm font-semibold dark:border-white/10">
          <span>Total</span>
          <span className="tabular-nums">
            {currency} {total.toFixed(2)}
          </span>
        </div>
        <Link
          href="/library/checkout"
          className={cn(
            "inline-flex h-11 w-full items-center justify-center gap-2 rounded-md text-sm font-semibold transition",
            cart.length
              ? "bg-emerald-700 text-white hover:bg-emerald-600"
              : "pointer-events-none bg-slate-200/80 text-slate-400 dark:bg-slate-800",
          )}
        >
          <ShoppingCart className="size-4" /> Checkout
        </Link>
      </div>
    </div>
  );
}

function Select({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: string[];
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <Filter className="pointer-events-none absolute left-0 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full border-0 border-b border-ink/15 bg-transparent pl-5 pr-2 text-sm text-ink outline-none focus:border-emerald-700 dark:border-white/20 dark:text-white lg:w-36"
      >
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </label>
  );
}
