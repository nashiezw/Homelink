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
  SlidersHorizontal,
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
  const featured = products.find((product) => product.editorsChoice) ?? products.find((product) => product.featured) ?? products[0];
  const featuredProducts = products
    .filter((product) => product.editorsChoice || product.featured)
    .slice(0, merchandising.maxCuratedItems);
  const bestSellers = products.filter((product) => product.bestSeller).slice(0, 3);
  const heroStack = products.slice(0, Math.min(merchandising.maxHeroItems, 3));
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
    <main className="relative min-h-screen overflow-x-hidden bg-mist text-ink dark:bg-slate-950 dark:text-white">
      <LibraryCartFab />

      {/* Atmospheric wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[42rem] bg-[radial-gradient(ellipse_at_20%_0%,rgba(16,185,129,0.12),transparent_50%),radial-gradient(ellipse_at_90%_10%,rgba(14,165,233,0.08),transparent_45%),linear-gradient(180deg,#102024_0%,#16353c_38%,#f4f8f7_72%)] dark:bg-[radial-gradient(ellipse_at_20%_0%,rgba(16,185,129,0.16),transparent_50%),linear-gradient(180deg,#020617_0%,#0f172a_55%,#020617_100%)]"
      />

      <section className="relative">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-14 pt-12 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)] lg:items-end lg:gap-16 lg:px-8 lg:pb-20 lg:pt-16">
          <div className="min-w-0">
            <p className="animate-fade-up text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-emerald-200/90 motion-reduce:animate-none">
              Professional property resources
            </p>
            <h1 className="animate-fade-up mt-4 max-w-3xl text-[2.85rem] font-semibold leading-[1.05] tracking-[-0.035em] text-white motion-reduce:animate-none sm:text-5xl lg:text-[3.85rem] lg:leading-[1.02] [animation-delay:60ms]">
              {store.name}
            </h1>
            <p className="animate-fade-up mt-4 max-w-2xl text-xl font-medium leading-snug tracking-tight text-emerald-100/95 motion-reduce:animate-none sm:text-2xl sm:leading-snug [animation-delay:110ms]">
              {merchandising.heroHeadline}
            </p>
            <p className="animate-fade-up mt-4 max-w-xl text-base leading-8 text-slate-200/90 motion-reduce:animate-none sm:text-lg sm:leading-8 [animation-delay:160ms]">
              {merchandising.heroSubcopy || store.tagline}
            </p>
            <div className="animate-fade-up mt-8 flex flex-col gap-3 sm:flex-row sm:items-center [animation-delay:200ms] motion-reduce:animate-none">
              <Link
                href={merchandising.ctaHref || "#library-products"}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-950/25 transition hover:-translate-y-0.5 hover:bg-emerald-400"
              >
                {merchandising.ctaLabel} <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/dashboard/my-library"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
              >
                My Library <BookmarkCheck className="size-4" />
              </Link>
            </div>
            {!store.enabled && (
              <p className="mt-6 inline-flex rounded-lg border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-sm leading-6 text-amber-100">
                The storefront is temporarily closed for updates. Browse is available, checkout may be limited.
              </p>
            )}
          </div>

          {featured ? (
            <div className="animate-fade-up relative mx-auto w-full max-w-sm lg:mx-0 lg:justify-self-end [animation-delay:160ms] motion-reduce:animate-none">
              <div aria-hidden className="absolute -inset-8 rounded-full bg-emerald-400/15 blur-3xl" />
              <div className="relative">
                <BookCover product={featured} className="mx-auto w-full max-w-[15.5rem] sm:max-w-[17rem]" priority />
                <div className="mt-6 text-center lg:text-left">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-emerald-200/80">Featured</p>
                  <Link
                    href={`/library/${featured.slug}`}
                    className="mt-2 block text-xl font-semibold leading-snug tracking-tight text-white transition hover:text-emerald-200"
                  >
                    {featured.title}
                  </Link>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">{featured.shortDescription}</p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                    <p className="text-lg font-semibold tracking-tight text-white">
                      {hidePrices ? "Sign in for price" : libraryPriceLabel(featured)}
                    </p>
                    <Button onClick={() => addToCart(featured)} className="rounded-xl">
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

      <section className="relative border-y border-slate-200/80 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 md:grid-cols-3 lg:px-8">
          <StorePromise icon={ShieldCheck} title="Secure checkout" text="Protected orders with invoice-ready receipts." />
          <StorePromise icon={Award} title="Curated for operators" text="Resources for agents, landlords, and developers." />
          <StorePromise icon={BookOpen} title="Library delivery" text="Digital downloads and lasting account access." />
        </div>
      </section>

      <section className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-3.5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center lg:px-8">
          <label className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, author, category, or ISBN"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm leading-none text-ink shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <Select value={category} onChange={setCategory} label="Category" options={facets.categories} />
          <Select value={type} onChange={setType} label="Format" options={facets.types} />
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-ink shadow-sm outline-none transition focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="newest">Newest</option>
            <option value="best-selling">Best selling</option>
            <option value="most-downloaded">Most downloaded</option>
            <option value="highest-rated">Highest rated</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </div>
      </section>

      {!products.length ? (
        <EmptyLibraryState />
      ) : (
        <>
          {facets.categories.length > 0 && (
            <section className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
              <div className="mb-7 flex items-end justify-between gap-6">
                <div>
                  <p className="section-eyebrow">Shop by focus</p>
                  <h2 className="section-title !mt-3 !text-[1.85rem] sm:!text-[2.15rem]">Find the right shelf</h2>
                </div>
                <p className="hidden max-w-sm text-sm leading-7 text-slate-500 md:block">
                  Filter by how property professionals actually work — learning, investing, legal paperwork, and field ops.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {facets.categories.map((item) => (
                  <CategoryTile
                    key={item}
                    name={item}
                    count={products.filter((product) => product.category === item).length}
                    active={category === item}
                    onClick={() => setCategory(category === item ? "" : item)}
                  />
                ))}
              </div>
            </section>
          )}

          {heroStack.length > 0 && <PromoBanner products={heroStack} storeName={store.name} />}

          <section className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_19.5rem] lg:px-8">
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

              <section className="space-y-6">
                <div className="flex flex-col gap-4 border-t border-slate-200/90 pt-10 dark:border-slate-800 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="section-eyebrow">Catalogue</p>
                    <h2 className="mt-3 text-[1.85rem] font-semibold tracking-[-0.02em] text-ink dark:text-white sm:text-[2.15rem]">
                      {results.length} {results.length === 1 ? "title" : "titles"}
                    </h2>
                  </div>
                  {facets.difficulties.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 pr-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                        <SlidersHorizontal className="size-4" /> Level
                      </span>
                      {facets.difficulties.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setDifficulty(difficulty === item ? "" : item)}
                          className={cn(
                            "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                            difficulty === item
                              ? "border-emerald-700 bg-emerald-700 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-emerald-600 hover:text-ink dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                          )}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {results.length ? (
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900/50">
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

            <aside className="h-fit space-y-4 lg:sticky lg:top-24">
              <CartPanel cart={cart} total={total} currency={currency} count={count} onCart={(next) => setCart(next)} />
            </aside>
          </section>
        </>
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
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[1.85rem] font-semibold tracking-[-0.02em] text-ink dark:text-white sm:text-[2.15rem]">{title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <Link href="#library-products" className="hidden items-center gap-1 text-sm font-semibold text-emerald-700 sm:inline-flex">
          View all <ArrowRight className="size-4" />
        </Link>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
    <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900">
          <BookOpen className="size-7" />
        </span>
        <h2 className="mt-6 text-3xl font-semibold tracking-tight text-ink dark:text-white">The library is being prepared</h2>
        <p className="mx-auto mt-3 max-w-lg text-base leading-8 text-slate-500">
          Professional property books, templates, and toolkits will appear here soon. Check back for published HouseLink resources.
        </p>
        <Link
          href="/search"
          className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-600"
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
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white transition duration-300 hover:-translate-y-1 hover:border-emerald-600/30 hover:shadow-card-hover dark:border-slate-800 dark:bg-slate-900">
      <div className="bg-[linear-gradient(180deg,#f4f8f7_0%,#eef5f2_100%)] px-5 pb-2 pt-5 dark:bg-slate-950/60">
        <BookCover product={product} className={cn("mx-auto w-full", compact ? "max-w-[10.5rem]" : "max-w-[12rem]")} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
          {libraryFormatsLabel(product)}
        </p>
        <Link
          href={`/library/${product.slug}`}
          className="mt-2 line-clamp-2 text-[1.05rem] font-semibold leading-snug tracking-tight text-ink transition hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300"
        >
          {product.title}
        </Link>
        <p className="mt-1.5 line-clamp-1 text-sm leading-6 text-slate-500">{product.author}</p>
        {!compact && (
          <p className="mt-3 line-clamp-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{product.shortDescription}</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <span className="flex items-center gap-1 text-sm text-amber-500">
            <Star className="size-3.5 fill-current" />
            <span className="font-medium text-slate-600 dark:text-slate-300">{product.rating || "New"}</span>
          </span>
          <p className="text-base font-semibold tracking-tight text-ink dark:text-white">
            {hidePrices ? "Sign in" : libraryPriceLabel(product)}
          </p>
        </div>
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <Button onClick={() => onAdd(product)} disabled={product.comingSoon && !product.preorder} className="rounded-xl">
            <ShoppingCart className="size-4" />
            {quantity ? `In bag (${quantity})` : product.preorder ? "Pre-order" : "Add"}
          </Button>
          <Link
            href={`/library/${product.slug}`}
            className="inline-flex size-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-emerald-600 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-300"
            aria-label={`View ${product.title}`}
          >
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function CategoryTile({
  name,
  count,
  active,
  onClick,
}: {
  name: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const meta = categoryMeta(name);
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-[9.5rem] rounded-2xl border p-5 text-left transition duration-300 hover:-translate-y-0.5",
        active
          ? "border-emerald-700 bg-emerald-700 text-white shadow-lg shadow-emerald-900/15"
          : "border-slate-200/90 bg-white text-ink hover:border-emerald-600/40 hover:shadow-soft dark:border-slate-800 dark:bg-slate-900 dark:text-white",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "grid size-10 place-items-center rounded-xl",
            active ? "bg-white/15 text-white" : meta.badge,
          )}
        >
          <Icon className="size-5" />
        </span>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
            active ? "bg-white/15 text-white" : "bg-mist text-emerald-800 dark:bg-slate-800 dark:text-emerald-300",
          )}
        >
          {count}
        </span>
      </div>
      <h3 className="mt-4 text-base font-semibold leading-snug tracking-tight">{name}</h3>
      <p className={cn("mt-1.5 line-clamp-2 text-sm leading-6", active ? "text-white/75" : "text-slate-500")}>
        {meta.text}
      </p>
    </button>
  );
}

function PromoBanner({ products, storeName }: { products: LibraryProduct[]; storeName: string }) {
  return (
    <section className="relative mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl bg-ink text-white shadow-hero">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_20%,rgba(16,185,129,0.22),transparent_45%),radial-gradient(ellipse_at_85%_80%,rgba(14,165,233,0.12),transparent_40%)]"
        />
        <div className="relative grid lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="p-7 sm:p-10">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-emerald-300/90">{storeName}</p>
            <h2 className="mt-3 max-w-2xl text-2xl font-semibold leading-tight tracking-[-0.02em] sm:text-3xl sm:leading-[1.15]">
              Documents, books, and templates behind better property work.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-slate-300">
              Build your operating shelf for agents, landlords, investors, and developers — then open everything from My Library.
            </p>
            <Link
              href="#library-products"
              className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-ink transition hover:bg-emerald-50"
            >
              Shop the catalogue <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="relative hidden min-h-64 lg:block">
            <div aria-hidden className="absolute bottom-10 left-10 h-3 w-64 rounded-full bg-black/20 blur-sm" />
            {products[0] && <BookCover product={products[0]} className="absolute bottom-12 left-12 w-32 rotate-[-8deg]" />}
            {products[1] && <BookCover product={products[1]} className="absolute bottom-12 left-36 z-10 w-36" />}
            {products[2] && <BookCover product={products[2]} className="absolute bottom-12 right-10 w-32 rotate-[8deg]" />}
          </div>
        </div>
      </div>
    </section>
  );
}

function categoryMeta(name: string): { icon: LucideIcon; badge: string; text: string } {
  if (name === "Courses") return { icon: GraduationCap, badge: "bg-sky-50 text-sky-700", text: "Structured lessons and guided learning paths." };
  if (name === "Investment") return { icon: TrendingUp, badge: "bg-orange-50 text-orange-700", text: "Guides for yield, risk, and market decisions." };
  if (name === "Legal Documents") return { icon: FileText, badge: "bg-blue-50 text-blue-700", text: "Editable packs for landlord and lease workflows." };
  if (name === "Property Law") return { icon: Home, badge: "bg-emerald-50 text-emerald-700", text: "Reference manuals for compliant property work." };
  if (name === "Toolkits") return { icon: Wrench, badge: "bg-amber-50 text-amber-700", text: "Checklists, scripts, and practical agent resources." };
  return { icon: BookOpen, badge: "bg-emerald-50 text-emerald-700", text: "Browse professional HouseLink resources." };
}

function StorePromise({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold tracking-tight text-ink dark:text-white">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{text}</p>
      </div>
    </div>
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
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-white">
          <ShoppingBag className="size-4 text-emerald-700" /> Library Bag
          {count > 0 && (
            <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-semibold tabular-nums text-white">{count}</span>
          )}
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-500">Checkout, invoices, and secure delivery.</p>
      </div>
      <div className="space-y-3 p-4">
        {cart.length ? (
          cart.map((line) => (
            <div key={libraryCartLineKey(line)} className="rounded-xl border border-slate-200/90 p-3 text-sm dark:border-slate-700">
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
                <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700">
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
          <div className="grid min-h-32 place-items-center rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm leading-6 text-slate-500 dark:border-slate-700">
            <div>
              <ShoppingCart className="mx-auto mb-2 size-5 text-slate-400" />
              Add a product to start checkout.
            </div>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-semibold dark:border-slate-800">
          <span>Total</span>
          <span className="tabular-nums">
            {currency} {total.toFixed(2)}
          </span>
        </div>
        <Link
          href="/library/checkout"
          className={cn(
            "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition",
            cart.length
              ? "bg-emerald-700 text-white hover:bg-emerald-600"
              : "pointer-events-none bg-slate-100 text-slate-400 dark:bg-slate-800",
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
      <Filter className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-ink shadow-sm outline-none transition focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white lg:w-44"
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
