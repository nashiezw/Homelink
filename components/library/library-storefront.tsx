"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, ChevronDown, Filter, Minus, Plus, Search, ShoppingBag, ShoppingCart, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
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
  type LibraryProduct,
} from "@/lib/library/catalog";
import type { LibraryStoreSettings } from "@/lib/library/settings-shared";
import { cn } from "@/lib/utils";

type Merchandising = LibraryStoreSettings["merchandising"];
type Store = LibraryStoreSettings["store"];

export function LibraryStorefront({
  products,
  merchandising,
  store: _store,
}: {
  products: LibraryProduct[];
  merchandising: Merchandising;
  store: Store;
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
  const [sort, setSort] = useState(merchandising.defaultSort === "downloads" ? "most-downloaded" : merchandising.defaultSort === "rating" ? "highest-rated" : merchandising.defaultSort);
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
  const ctaLabel = merchandising.ctaLabel?.trim() || "Shop now";
  const ctaHref = merchandising.ctaHref?.trim() || "#library-products";

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
    showToast(`${product.title} added to your bag.`, "success");
  }

  return (
    <main className="min-h-screen bg-[#fafafa] text-[#141414] antialiased dark:bg-slate-950 dark:text-white">
      <LibraryCartFab />

      <section className="mx-auto max-w-[90rem] px-4 pt-8 sm:px-6 lg:px-8 xl:px-10">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-[linear-gradient(135deg,#ece7df_0%,#f4f1eb_42%,#e5ece9_100%)] dark:bg-[linear-gradient(135deg,#1e293b_0%,#0f172a_100%)]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40 motion-safe:animate-library-drift [background-image:radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.7),transparent_36%),radial-gradient(circle_at_82%_70%,rgba(26,53,96,0.08),transparent_40%)]"
          />
          <div className="relative grid items-center gap-10 px-6 py-12 sm:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)] lg:gap-12 lg:py-16 xl:px-14">
            <div className="max-w-xl motion-safe:animate-fade-up">
              <h1 className="text-[2.6rem] font-bold leading-[1.05] tracking-tight text-[#141414] dark:text-white sm:text-5xl lg:text-[3.4rem]">
                {headline}
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-[#141414]/70 dark:text-white/70">{subcopy}</p>
              <div className="mt-8">
                <a
                  href={ctaHref}
                  className="inline-flex h-11 items-center justify-center bg-[#141414] px-6 text-sm font-semibold text-white transition hover:bg-[#1a3560] dark:bg-white dark:text-[#141414] dark:hover:bg-[#e8f4ef]"
                >
                  {ctaLabel}
                </a>
              </div>
            </div>

            {featured && (
              <div className="relative mx-auto w-full max-w-[17rem] motion-safe:animate-fade-up motion-safe:[animation-delay:120ms] lg:max-w-none">
                <div className="absolute -inset-6 rounded-full bg-white/40 blur-2xl dark:bg-white/5" aria-hidden />
                <BookCover
                  product={featured}
                  variant="shop"
                  interactive={false}
                  priority
                  className="relative mx-auto w-[70%] max-w-[14rem] rotate-[-4deg] shadow-[0_24px_60px_rgba(16,32,36,0.18)]"
                  sizes="280px"
                />
                <BookCover
                  product={products[1] ?? featured}
                  variant="shop"
                  interactive={false}
                  className="absolute bottom-2 right-2 w-[42%] max-w-[8.5rem] rotate-[8deg] opacity-95 shadow-[0_18px_40px_rgba(16,32,36,0.16)] lg:right-4"
                  sizes="160px"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {!products.length ? (
        <EmptyLibraryState />
      ) : (
        <>
          <section className="sticky top-0 z-20 mt-8 border-y border-[#dfe8e5] bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
            <div className="mx-auto grid max-w-[90rem] gap-3 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center lg:px-8 xl:px-10">
              <label className="relative min-w-0">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search title, author, category, or ISBN"
                  className="h-12 w-full rounded-full border border-[#d8e4e0] bg-white pl-11 pr-4 text-sm shadow-sm outline-none transition focus:border-[#007f68] focus:ring-4 focus:ring-[#007f68]/12 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <FilterSelect value={category} onChange={setCategory} label="Category" options={facets.categories} />
              <FilterSelect value={type} onChange={setType} label="Format" options={facets.types} />
              <label className="relative">
                <span className="sr-only">Sort products</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  className="h-12 w-full appearance-none rounded-full border border-[#d8e4e0] bg-white px-4 pr-10 text-sm shadow-sm outline-none transition focus:border-[#007f68] dark:border-slate-700 dark:bg-slate-900 lg:w-44"
                >
                  <option value="newest">Newest</option>
                  <option value="best-selling">Best selling</option>
                  <option value="most-downloaded">Most downloaded</option>
                  <option value="highest-rated">Highest rated</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
              </label>
            </div>
          </section>

          <section className="mx-auto grid max-w-[90rem] gap-8 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-8 xl:px-10">
            <div className="min-w-0 space-y-14">
              {curated.length > 0 && (
                <div>
                  <div className="mb-8 flex items-end justify-between gap-4">
                    <h2 className="text-2xl font-bold tracking-tight text-[#141414] dark:text-white sm:text-3xl">
                      {merchandising.curatedTitle || "Editor picks"}
                    </h2>
                    <a href="#library-products" className="hidden text-sm font-semibold text-[#141414]/55 transition hover:text-[#141414] sm:inline-flex dark:text-white/55 dark:hover:text-white">
                      View all
                    </a>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {curated.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        quantity={quantityFor(product.id)}
                        hidePrice={hidePrices}
                        onAdd={() => addToCart(product)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div id="library-products">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold tracking-tight text-[#141414] dark:text-white sm:text-3xl">
                    All titles
                  </h2>
                  <p className="mt-2 text-sm text-[#141414]/55 dark:text-white/55">
                    {results.length} {results.length === 1 ? "product" : "products"}
                  </p>
                </div>

                {results.length ? (
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {results.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        quantity={quantityFor(product.id)}
                        hidePrice={hidePrices}
                        onAdd={() => addToCart(product)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="py-16 text-center text-sm text-[#141414]/55 dark:text-white/55">No titles match that search.</p>
                )}
              </div>
            </div>

            <aside className="h-fit lg:sticky lg:top-24">
              <CartPanel cart={cart} total={total} currency={currency} count={count} onCart={(next) => setCart(next)} />
            </aside>
          </section>
        </>
      )}
    </main>
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
    <article className="group flex h-full flex-col rounded-2xl border border-[#dfe8e5] bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-[#007f68] hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-hidden rounded-xl bg-[#f5f8f7] dark:bg-slate-950/60">
        <BookCover
          product={product}
          variant="shop"
          className="w-full max-w-none rounded-xl shadow-none ring-0"
          sizes="(max-width: 768px) 90vw, 420px"
        />
      </div>
      <div className="mt-4 flex min-w-0 flex-1 flex-col">
        <p className="text-xs font-black uppercase tracking-wide text-[#007f68] dark:text-emerald-300">
          {libraryFormatsLabel(product)}
        </p>
        <Link
          href={`/library/${product.slug}`}
          className="mt-1 line-clamp-2 text-base font-black leading-snug text-[#0d2630] hover:text-[#007f68] dark:text-white"
        >
          {product.title}
        </Link>
        <p className="mt-1 line-clamp-1 text-sm text-slate-500">{product.author}</p>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{product.shortDescription}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="flex items-center gap-1 text-sm text-amber-500">
            <Star className="size-4 fill-current" />
            <span className="font-bold text-slate-700 dark:text-slate-200">{product.rating || "New"}</span>
          </span>
          <p className="text-base font-black text-[#0d2630] dark:text-white">
            {hidePrice ? (
              <Link href={`/login?next=/library/${product.slug}`} className="text-sm font-bold text-[#007f68] underline-offset-2 hover:underline">
                Sign in for price
              </Link>
            ) : (
              libraryPriceLabel(product)
            )}
          </p>
        </div>
        <div className="mt-auto grid grid-cols-[1fr_auto] gap-2 pt-4">
          <Button onClick={onAdd} disabled={product.comingSoon && !product.preorder} className="rounded-full">
            <ShoppingCart className="size-4" />{" "}
            {quantity ? `In bag (${quantity})` : product.preorder ? "Pre-order" : "Add"}
          </Button>
          <Link
            href={`/library/${product.slug}`}
            className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200 text-slate-600 shadow-sm transition hover:border-[#007f68] hover:text-[#007f68] dark:border-slate-700 dark:text-slate-300"
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
        <p className="flex items-center gap-2 text-sm font-bold text-ink dark:text-white">
          <ShoppingBag className="size-4 text-[#007f68]" /> Library Bag
          {count > 0 && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-black text-white">{count}</span>}
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
              ? "bg-[#007f68] text-white hover:bg-[#006b58]"
              : "pointer-events-none bg-slate-100 text-slate-400 dark:bg-slate-800",
          )}
        >
          <ShoppingCart className="size-4" /> Checkout
        </Link>
      </div>
    </div>
  );
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
  options: string[];
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <Filter className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full appearance-none rounded-full border border-[#d8e4e0] bg-white pl-10 pr-10 text-sm shadow-sm outline-none transition focus:border-[#007f68] dark:border-slate-700 dark:bg-slate-900 lg:w-44"
      >
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
    </label>
  );
}

function EmptyLibraryState() {
  return (
    <section className="mx-auto max-w-[90rem] px-4 py-20 sm:px-6 lg:px-8 xl:px-10">
      <div className="mx-auto max-w-lg text-center">
        <span className="mx-auto grid size-12 place-items-center bg-[#ece7df] text-[#1a3560]">
          <BookOpen className="size-5" />
        </span>
        <h2 className="mt-6 text-3xl font-bold tracking-tight text-[#141414] dark:text-white">
          New titles are on the way
        </h2>
        <p className="mt-3 text-sm leading-7 text-[#141414]/60 dark:text-white/60">
          Professional property books, templates, and toolkits will appear here soon.
        </p>
        <Link
          href="/search"
          className="mt-8 inline-flex h-11 items-center justify-center gap-2 bg-[#141414] px-5 text-sm font-semibold text-white transition hover:bg-[#1a3560]"
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
