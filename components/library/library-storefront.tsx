"use client";

import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  BookmarkCheck,
  Filter,
  FileText,
  GraduationCap,
  Home,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Star,
  TrendingUp,
  Trash2,
  Wrench,
  type LucideIcon,
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
        difficulties: Array.from(new Set(products.map((p) => p.difficulty))).sort(),
      }
    : libraryFacets();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [sort, setSort] = useState(SORT_MAP[merchandising.defaultSort] ?? "newest");
  const { cart, setCart, total, currency, count } = useLibraryCart();

  const hidePrices = merchandising.hidePricesUntilLogin && !user;
  const featured =
    products.find((product) => product.editorsChoice) ?? products.find((product) => product.featured) ?? products[0];
  const featuredProducts = products
    .filter((product) => product.editorsChoice || product.featured)
    .slice(0, merchandising.maxCuratedItems);
  const bestSellers = products.filter((product) => product.bestSeller).slice(0, 3);
  const results = useMemo(
    () => filterProducts(products, { query, category, type, difficulty, sort }),
    [products, query, category, type, difficulty, sort],
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
    <main className="library-shop relative min-h-screen overflow-x-hidden text-ink dark:bg-slate-950 dark:text-white">
      <LibraryCartFab />

      {/* Hero — one soft composition, books as the visual */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="library-hero-atmosphere pointer-events-none absolute inset-0" />
        <div aria-hidden className="pointer-events-none absolute -left-24 top-10 size-[28rem] animate-hero-glow rounded-full bg-emerald-400/15 blur-3xl motion-reduce:animate-none" />
        <div aria-hidden className="pointer-events-none absolute -right-16 top-24 size-[32rem] animate-hero-drift rounded-full bg-cyan-300/10 blur-3xl motion-reduce:animate-none" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-12 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(17rem,0.95fr)] lg:items-center lg:gap-14 lg:px-8 lg:pb-16 lg:pt-14">
          <div className="min-w-0">
            <p className="animate-fade-up text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-emerald-800/80 motion-reduce:animate-none dark:text-emerald-300/90">
              Professional property resources
            </p>
            <h1 className="animate-fade-up mt-4 max-w-3xl text-[2.75rem] font-semibold leading-[1.05] tracking-[-0.035em] text-ink motion-reduce:animate-none sm:text-5xl lg:text-[3.6rem] lg:leading-[1.02] [animation-delay:70ms] dark:text-white">
              {store.name}
            </h1>
            <p className="animate-fade-up mt-4 max-w-xl text-xl font-medium leading-snug tracking-tight text-emerald-900/80 motion-reduce:animate-none sm:text-2xl [animation-delay:120ms] dark:text-emerald-200/90">
              {merchandising.heroHeadline}
            </p>
            <p className="animate-fade-up mt-4 max-w-lg text-base leading-8 text-slate-600 motion-reduce:animate-none sm:text-[1.05rem] sm:leading-8 [animation-delay:170ms] dark:text-slate-300">
              {merchandising.heroSubcopy || store.tagline}
            </p>
            <div className="animate-fade-up mt-8 flex flex-col gap-3 sm:flex-row sm:items-center [animation-delay:220ms] motion-reduce:animate-none">
              <Link
                href={merchandising.ctaHref || "#library-products"}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-emerald-700 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-emerald-600"
              >
                {merchandising.ctaLabel} <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/dashboard/my-library"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-ink/10 bg-white/55 px-6 text-sm font-semibold text-ink backdrop-blur-sm transition hover:border-emerald-700/30 hover:bg-white/80 dark:border-white/15 dark:bg-white/5 dark:text-white"
              >
                My Library <BookmarkCheck className="size-4" />
              </Link>
            </div>
            <div className="animate-fade-up mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm leading-6 text-slate-600 [animation-delay:280ms] motion-reduce:animate-none dark:text-slate-300">
              <StorePromise icon={ShieldCheck} title="Secure checkout" />
              <StorePromise icon={Award} title="Curated for operators" />
              <StorePromise icon={BookOpen} title="Library delivery" />
            </div>
            {!store.enabled && (
              <p className="mt-6 text-sm leading-6 text-amber-800 dark:text-amber-200">
                The storefront is temporarily closed for updates. Browse is available; checkout may be limited.
              </p>
            )}
          </div>

          {featured ? (
            <div className="animate-fade-up relative mx-auto w-full max-w-sm lg:mx-0 lg:justify-self-end [animation-delay:140ms] motion-reduce:animate-none">
              <div aria-hidden className="library-book-glow absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full" />
              <div className="relative flex flex-col items-center">
                <BookCover
                  product={featured}
                  className="w-full max-w-[15rem] rotate-[-2deg] sm:max-w-[16.5rem]"
                  priority
                />
                <div aria-hidden className="mt-6 h-3 w-48 rounded-full bg-ink/10 blur-md dark:bg-black/40" />
                <div className="mt-5 w-full max-w-sm text-center">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-emerald-800/70 dark:text-emerald-300/80">
                    Featured title
                  </p>
                  <Link
                    href={`/library/${featured.slug}`}
                    className="mt-2 block text-lg font-semibold leading-snug tracking-tight text-ink transition hover:text-emerald-800 dark:text-white dark:hover:text-emerald-200"
                  >
                    {featured.title}
                  </Link>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {featured.shortDescription}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    <p className="text-base font-semibold tracking-tight text-ink dark:text-white">
                      {hidePrices ? "Sign in for price" : libraryPriceLabel(featured)}
                    </p>
                    <Button onClick={() => addToCart(featured)} className="rounded-full px-5">
                      <ShoppingCart className="size-4" />
                      {quantityFor(featured.id) ? `In bag (${quantityFor(featured.id)})` : "Add to bag"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Search floats on the same canvas — not a separate color slab */}
      <section className="sticky top-0 z-20">
        <div className="border-y border-ink/[0.06] bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/75">
          <div className="mx-auto grid max-w-7xl gap-3 px-4 py-3.5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center lg:px-8">
            <label className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search title, author, category, or ISBN"
                className="h-11 w-full rounded-full border border-ink/10 bg-white/80 pl-10 pr-4 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-emerald-600/50 focus:ring-4 focus:ring-emerald-600/10 dark:border-white/10 dark:bg-slate-900/80 dark:text-white"
              />
            </label>
            <Select value={category} onChange={setCategory} label="Category" options={facets.categories} />
            <Select value={type} onChange={setType} label="Format" options={facets.types} />
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="h-11 rounded-full border border-ink/10 bg-white/80 px-4 text-sm text-ink outline-none transition focus:border-emerald-600/50 dark:border-white/10 dark:bg-slate-900/80 dark:text-white"
            >
              <option value="newest">Newest</option>
              <option value="best-selling">Best selling</option>
              <option value="most-downloaded">Most downloaded</option>
              <option value="highest-rated">Highest rated</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </div>
        </div>
      </section>

      {!products.length ? (
        <EmptyLibraryState />
      ) : (
        <div className="relative">
          {facets.categories.length > 1 && (
            <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-emerald-800/70 dark:text-emerald-300/80">
                    Browse
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-ink dark:text-white">Find a shelf</h2>
                </div>
              </div>
              <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={() => setCategory("")}
                  className={cn(
                    "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition",
                    !category
                      ? "bg-ink text-white dark:bg-white dark:text-ink"
                      : "bg-white/60 text-slate-600 ring-1 ring-ink/8 hover:text-ink dark:bg-white/5 dark:text-slate-300 dark:ring-white/10",
                  )}
                >
                  All
                </button>
                {facets.categories.map((item) => {
                  const meta = categoryMeta(item);
                  const Icon = meta.icon;
                  const count = products.filter((product) => product.category === item).length;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCategory(category === item ? "" : item)}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                        category === item
                          ? "bg-emerald-700 text-white"
                          : "bg-white/60 text-slate-600 ring-1 ring-ink/8 hover:text-ink dark:bg-white/5 dark:text-slate-300 dark:ring-white/10",
                      )}
                    >
                      <Icon className="size-3.5 opacity-80" />
                      {item}
                      <span className="tabular-nums opacity-70">{count}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="mx-auto grid max-w-7xl gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_18.5rem] lg:px-8 lg:py-14">
            <div id="library-products" className="min-w-0 space-y-14">
              {merchandising.showCuratedRail && (
                <ProductSection
                  title={merchandising.curatedTitle || "Editor picks"}
                  subtitle="Strong starting points for professional property work."
                  products={featuredProducts}
                  onAdd={addToCart}
                  quantityFor={quantityFor}
                  hidePrices={hidePrices}
                />
              )}
              <ProductSection
                title="Best sellers"
                subtitle="Resources customers keep coming back to."
                products={bestSellers}
                onAdd={addToCart}
                quantityFor={quantityFor}
                hidePrices={hidePrices}
              />

              <section className="space-y-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-emerald-800/70 dark:text-emerald-300/80">
                      Catalogue
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-ink dark:text-white sm:text-[2.05rem]">
                      {results.length} {results.length === 1 ? "title" : "titles"}
                    </h2>
                  </div>
                  {facets.difficulties.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {facets.difficulties.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setDifficulty(difficulty === item ? "" : item)}
                          className={cn(
                            "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                            difficulty === item
                              ? "bg-emerald-700 text-white"
                              : "bg-white/55 text-slate-600 ring-1 ring-ink/8 hover:text-ink dark:bg-white/5 dark:text-slate-300 dark:ring-white/10",
                          )}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {results.length ? (
                  <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
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
                  <div className="px-2 py-16 text-center">
                    <p className="text-lg font-semibold text-ink dark:text-white">No matches for these filters</p>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-500">
                      Try clearing a filter or searching by author, ISBN, or a broader keyword.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setCategory("");
                        setType("");
                        setDifficulty("");
                      }}
                      className="mt-5 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </section>
            </div>

            <aside className="h-fit lg:sticky lg:top-24">
              <CartPanel cart={cart} total={total} currency={currency} count={count} onCart={(next) => setCart(next)} />
            </aside>
          </section>
        </div>
      )}
    </main>
  );
}

function filterProducts(
  products: LibraryProduct[],
  input: { query: string; category: string; type: string; difficulty: string; sort: string },
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
        (!input.type || product.productType === input.type) &&
        (!input.difficulty || product.difficulty === input.difficulty)
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

function ProductSection({
  title,
  subtitle,
  products,
  onAdd,
  quantityFor,
  hidePrices,
}: {
  title: string;
  subtitle: string;
  products: LibraryProduct[];
  onAdd: (product: LibraryProduct) => void;
  quantityFor: (id: string) => number;
  hidePrices: boolean;
}) {
  if (!products.length) return null;
  return (
    <section className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink dark:text-white sm:text-[2.05rem]">{title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <Link href="#library-products" className="hidden items-center gap-1 text-sm font-semibold text-emerald-700 sm:inline-flex">
          View all <ArrowRight className="size-4" />
        </Link>
      </div>
      <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            quantity={quantityFor(product.id)}
            onAdd={onAdd}
            compact
            hidePrices={hidePrices}
          />
        ))}
      </div>
    </section>
  );
}

function EmptyLibraryState() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl text-center">
        <BookOpen className="mx-auto size-8 text-emerald-700/80 dark:text-emerald-300" />
        <h2 className="mt-5 text-3xl font-semibold tracking-tight text-ink dark:text-white">The library is being prepared</h2>
        <p className="mx-auto mt-3 text-base leading-8 text-slate-500">
          Professional property books, templates, and toolkits will appear here soon.
        </p>
        <Link
          href="/search"
          className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-600"
        >
          Browse properties <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}

function ProductCard({
  product,
  quantity,
  onAdd,
  compact = false,
  hidePrices = false,
}: {
  product: LibraryProduct;
  quantity: number;
  onAdd: (product: LibraryProduct) => void;
  compact?: boolean;
  hidePrices?: boolean;
}) {
  return (
    <article className="group flex h-full flex-col">
      <div className="relative flex justify-center px-2 pt-2">
        <div aria-hidden className="absolute bottom-2 left-1/2 h-4 w-3/5 -translate-x-1/2 rounded-full bg-ink/10 blur-md transition group-hover:bg-emerald-900/15 dark:bg-black/40" />
        <BookCover
          product={product}
          className={cn(
            "relative w-full transition duration-500 ease-out group-hover:-translate-y-1.5 group-hover:rotate-[-1deg]",
            compact ? "max-w-[10.25rem]" : "max-w-[11.75rem]",
          )}
        />
      </div>
      <div className="mt-5 flex min-w-0 flex-1 flex-col px-1">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-emerald-800/75 dark:text-emerald-300/85">
          {libraryFormatsLabel(product)}
        </p>
        <Link
          href={`/library/${product.slug}`}
          className="mt-2 line-clamp-2 text-[1.05rem] font-semibold leading-snug tracking-tight text-ink transition hover:text-emerald-800 dark:text-white dark:hover:text-emerald-200"
        >
          {product.title}
        </Link>
        <p className="mt-1.5 line-clamp-1 text-sm leading-6 text-slate-500">{product.author}</p>
        {!compact && (
          <p className="mt-2.5 line-clamp-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{product.shortDescription}</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <span className="flex items-center gap-1 text-sm text-amber-500">
            <Star className="size-3.5 fill-current" />
            <span className="font-medium text-slate-600 dark:text-slate-300">{product.rating || "New"}</span>
          </span>
          <p className="text-base font-semibold tracking-tight text-ink dark:text-white">
            {hidePrices ? "Sign in" : libraryPriceLabel(product)}
          </p>
        </div>
        <div className="mt-4 flex gap-2">
          <Button
            onClick={() => onAdd(product)}
            disabled={product.comingSoon && !product.preorder}
            className="flex-1 rounded-full"
          >
            <ShoppingCart className="size-4" />
            {quantity ? `In bag (${quantity})` : product.preorder ? "Pre-order" : "Add"}
          </Button>
          <Link
            href={`/library/${product.slug}`}
            className="inline-flex size-11 items-center justify-center rounded-full border border-ink/10 text-slate-600 transition hover:border-emerald-700/40 hover:text-emerald-800 dark:border-white/10 dark:text-slate-300"
            aria-label={`View ${product.title}`}
          >
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function categoryMeta(name: string): { icon: LucideIcon; text: string } {
  if (name === "Courses") return { icon: GraduationCap, text: "Structured lessons and guided learning paths." };
  if (name === "Investment") return { icon: TrendingUp, text: "Guides for yield, risk, and market decisions." };
  if (name === "Legal Documents") return { icon: FileText, text: "Editable packs for landlord and lease workflows." };
  if (name === "Property Law") return { icon: Home, text: "Reference manuals for compliant property work." };
  if (name === "Toolkits") return { icon: Wrench, text: "Checklists, scripts, and practical agent resources." };
  return { icon: BookOpen, text: "Browse professional HouseLink resources." };
}

function StorePromise({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Icon className="size-4 text-emerald-700 dark:text-emerald-300" />
      <span className="font-medium text-slate-700 dark:text-slate-200">{title}</span>
    </span>
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
    <div className="overflow-hidden rounded-3xl border border-ink/[0.07] bg-white/65 shadow-[0_20px_60px_rgba(16,32,36,0.06)] backdrop-blur-md dark:border-white/10 dark:bg-slate-900/70">
      <div className="px-5 py-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-white">
          <ShoppingBag className="size-4 text-emerald-700" /> Library Bag
          {count > 0 && (
            <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-semibold tabular-nums text-white">{count}</span>
          )}
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-500">Checkout, invoices, and secure delivery.</p>
      </div>
      <div className="space-y-3 px-4 pb-4">
        {cart.length ? (
          cart.map((line) => (
            <div key={libraryCartLineKey(line)} className="rounded-2xl bg-white/70 p-3 text-sm ring-1 ring-ink/[0.06] dark:bg-slate-950/50 dark:ring-white/10">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-2 font-semibold leading-snug text-ink dark:text-white">{line.title}</p>
                  {line.formatLabel && (
                    <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-emerald-700">{line.formatLabel}</p>
                  )}
                  <p className="mt-0.5 text-slate-500">Qty {line.quantity}</p>
                </div>
                <p className="shrink-0 font-semibold tabular-nums">
                  {line.currency} {(line.price * line.quantity).toFixed(2)}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="inline-flex items-center rounded-full ring-1 ring-ink/10 dark:ring-white/10">
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
          <div className="grid min-h-28 place-items-center px-3 py-6 text-center text-sm leading-6 text-slate-500">
            <div>
              <ShoppingCart className="mx-auto mb-2 size-5 text-slate-400" />
              Add a product to start checkout.
            </div>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-ink/[0.06] pt-3 text-sm font-semibold dark:border-white/10">
          <span>Total</span>
          <span className="tabular-nums">
            {currency} {total.toFixed(2)}
          </span>
        </div>
        <Link
          href="/library/checkout"
          className={cn(
            "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition",
            cart.length
              ? "bg-emerald-700 text-white hover:bg-emerald-600"
              : "pointer-events-none bg-slate-100/80 text-slate-400 dark:bg-slate-800",
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
      <Filter className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-full border border-ink/10 bg-white/80 pl-9 pr-4 text-sm text-ink outline-none transition focus:border-emerald-600/50 dark:border-white/10 dark:bg-slate-900/80 dark:text-white lg:w-40"
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
