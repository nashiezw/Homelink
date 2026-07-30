"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  BookmarkCheck,
  Filter,
  Search,
  ShoppingBag,
  ShoppingCart,
  Star,
} from "lucide-react";
import { useMemo, useState } from "react";
import { BookCover } from "@/components/library/book-cover";
import { LibraryCartFab } from "@/components/library/library-cart-fab";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { notifyLibraryCartAdded, useLibraryCart, sameLibraryCartLine } from "@/lib/library/cart-client";
import { enabledLibraryFormats, libraryFacets, libraryFormatsLabel, libraryPriceLabel, type LibraryProduct } from "@/lib/library/catalog";
import { cn } from "@/lib/utils";

export function LibraryStorefront({ products }: { products: LibraryProduct[] }) {
  const { showToast } = useApp();
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
  const [sort, setSort] = useState("newest");
  const { cart, setCart, count, currency, total } = useLibraryCart();

  const heroBooks = useMemo(() => {
    const picks = products.filter((product) => product.editorsChoice || product.featured || product.bestSeller);
    const pool = picks.length ? picks : products;
    return pool.slice(0, 4);
  }, [products]);

  const curated = useMemo(() => {
    const seen = new Set<string>();
    const ordered: LibraryProduct[] = [];
    for (const product of products) {
      if (!(product.editorsChoice || product.featured || product.bestSeller)) continue;
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      ordered.push(product);
      if (ordered.length >= 6) break;
    }
    return ordered;
  }, [products]);

  const filtersActive = Boolean(query || category || type || difficulty || sort !== "newest");
  const results = useMemo(() => {
    const filtered = filterProducts(products, { query, category, type, difficulty, sort });
    if (filtersActive || !curated.length) return filtered;
    const curatedIds = new Set(curated.map((product) => product.id));
    return filtered.filter((product) => !curatedIds.has(product.id));
  }, [products, query, category, type, difficulty, sort, filtersActive, curated]);
  const catalogueCount = filtersActive || !curated.length ? results.length : results.length + curated.length;
  const quantityFor = (productId: string) => cart.filter((line) => line.productId === productId).reduce((sum, line) => sum + line.quantity, 0);

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
        return current.map((line) => (sameLibraryCartLine(line, { productId: product.id, formatId: format?.id }) ? { ...line, quantity: line.quantity + 1 } : line));
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

  function clearFilters() {
    setQuery("");
    setCategory("");
    setType("");
    setDifficulty("");
    setSort("newest");
  }

  return (
    <main className="bg-mist text-ink dark:bg-slate-950 dark:text-white">
      <LibraryCartFab />

      <section className="relative overflow-hidden bg-ink text-white">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_20%,rgba(16,185,129,0.22),transparent_48%),radial-gradient(ellipse_at_85%_10%,rgba(34,165,75,0.14),transparent_40%),linear-gradient(160deg,#071318_0%,#102024_48%,#0b2f2a_100%)]" />
          <div className="hero-mesh absolute inset-0 opacity-90" />
          <div className="library-shelf-grain absolute inset-0 opacity-40" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink via-ink/70 to-transparent" />
        </div>
        <div className="pointer-events-none absolute -left-24 top-16 size-72 animate-hero-glow rounded-full bg-emerald-500/20 blur-3xl motion-reduce:animate-none" />
        <div className="pointer-events-none absolute right-0 top-1/4 size-96 animate-hero-drift rounded-full bg-cyan-400/10 blur-3xl motion-reduce:animate-none" />

        <div className="relative mx-auto grid min-h-[78vh] max-w-7xl items-end gap-10 px-4 pb-16 pt-20 sm:min-h-[720px] sm:px-6 sm:pb-20 sm:pt-24 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,28rem)] lg:items-center lg:px-8">
          <div className="min-w-0">
            <p
              className="animate-fade-up font-extrabold leading-none tracking-[-0.03em] text-white motion-reduce:animate-none"
              style={{ fontFamily: "system-ui, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif" }}
            >
              <span className="block text-[clamp(2.75rem,8vw,5.75rem)]">
                <span className="text-white">House</span>
                <span className="text-[#22a54b]">Link</span>
              </span>
              <span className="mt-2 block text-[clamp(2rem,5.5vw,3.75rem)] text-emerald-100/95">Library</span>
            </p>
            <h1 className="animate-fade-up mt-6 max-w-xl text-xl font-semibold leading-snug tracking-tight text-white/92 motion-reduce:animate-none sm:text-2xl [animation-delay:80ms]">
              Books and tools for smarter property work.
            </h1>
            <p className="animate-fade-up mt-4 max-w-lg text-base leading-7 text-slate-300 motion-reduce:animate-none [animation-delay:160ms]">
              Manuals, legal packs, templates, and agent resources — bought once, kept in your HouseLink library.
            </p>
            <div className="animate-fade-up mt-8 flex flex-col gap-3 motion-reduce:animate-none sm:flex-row [animation-delay:240ms]">
              <Link
                href="#library-products"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-950/30 transition hover:-translate-y-0.5 hover:bg-emerald-400"
              >
                Browse catalogue <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/dashboard/my-library"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
              >
                My Library <BookmarkCheck className="size-4" />
              </Link>
            </div>

            {heroBooks.length > 0 && (
              <div className="animate-fade-up mt-10 flex justify-center gap-3 motion-reduce:animate-none lg:hidden [animation-delay:280ms]">
                {heroBooks.slice(0, 3).map((product, index) => (
                  <div
                    key={product.id}
                    className={cn("w-[30%] max-w-[7.5rem]", index === 1 && "-mt-3 w-[34%] max-w-[8.25rem]")}
                  >
                    <BookCover product={product} className="w-full" priority={index === 1} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {heroBooks.length > 0 && (
            <div className="animate-fade-up relative mx-auto hidden h-[28rem] w-full max-w-md motion-reduce:animate-none lg:block [animation-delay:180ms]">
              <p className="sr-only">Featured HouseLink Library titles</p>
              <div className="pointer-events-none absolute inset-x-8 bottom-6 h-6 rounded-full bg-black/35 blur-xl" />
              {heroBooks.map((product, index) => {
                const placements = [
                  "left-0 top-10 w-[11.5rem] -rotate-[14deg] z-[1]",
                  "left-[4.5rem] top-0 w-[13rem] rotate-[-2deg] z-[3]",
                  "right-2 top-8 w-[11.75rem] rotate-[12deg] z-[2]",
                  "left-[7.5rem] bottom-2 w-[10.5rem] rotate-[4deg] z-[4]",
                ];
                return (
                  <div key={product.id} className={cn("absolute", placements[index] ?? placements[0])}>
                    <div className="library-book-float" style={{ animationDelay: `${index * 0.45}s` }}>
                      <BookCover product={product} className="w-full" priority={index < 2} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {!products.length ? (
        <EmptyLibraryState />
      ) : (
        <>
          <section className="sticky top-0 z-20 border-b border-slate-200/80 bg-mist/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center">
                <label className="relative min-w-0">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search title, author, category or ISBN"
                    className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 dark:border-slate-700 dark:bg-slate-900"
                  />
                </label>
                <Select value={category} onChange={setCategory} label="Category" options={facets.categories} />
                <Select value={type} onChange={setType} label="Format" options={facets.types} />
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  className="h-12 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="newest">Newest</option>
                  <option value="best-selling">Best selling</option>
                  <option value="most-downloaded">Most downloaded</option>
                  <option value="highest-rated">Highest rated</option>
                  <option value="price-asc">Price: low to high</option>
                </select>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {facets.categories.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCategory(category === item ? "" : item)}
                      className={cn(
                        "border-b-2 px-1 py-1 text-sm font-semibold transition",
                        category === item
                          ? "border-emerald-600 text-ink dark:text-white"
                          : "border-transparent text-slate-500 hover:text-ink dark:hover:text-white",
                      )}
                    >
                      {item}
                    </button>
                  ))}
                  {filtersActive && (
                    <button type="button" onClick={clearFilters} className="ml-1 text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
                      Clear
                    </button>
                  )}
                </div>
                {count > 0 && (
                  <Link href="/library/checkout" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-600 dark:text-emerald-300">
                    <ShoppingBag className="size-4" />
                    Bag {count} · {currency} {total.toFixed(2)}
                    <ArrowRight className="size-3.5" />
                  </Link>
                )}
              </div>
            </div>
          </section>

          {curated.length > 0 && !filtersActive && (
            <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
              <div className="mb-7 max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">Curated</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink dark:text-white">Start with these</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Editor picks and titles professionals keep buying.</p>
              </div>
              <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
                {curated.map((product) => (
                  <ProductCard key={product.id} product={product} quantity={quantityFor(product.id)} onAdd={addToCart} />
                ))}
              </div>
            </section>
          )}

          <section id="library-products" className="mx-auto max-w-7xl px-4 pb-20 pt-4 sm:px-6 lg:px-8">
            <div className="mb-7 flex flex-col gap-4 border-t border-slate-200/90 pt-10 dark:border-slate-800 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">Catalogue</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink dark:text-white">
                  {filtersActive
                    ? `${results.length} ${results.length === 1 ? "match" : "matches"}`
                    : `${catalogueCount} ${catalogueCount === 1 ? "title" : "titles"}`}
                </h2>
              </div>
              {facets.difficulties.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="text-sm font-semibold text-slate-500">Level</span>
                  {facets.difficulties.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setDifficulty(difficulty === item ? "" : item)}
                      className={cn(
                        "border-b-2 px-0.5 py-1 text-sm font-semibold transition",
                        difficulty === item
                          ? "border-emerald-600 text-ink dark:text-white"
                          : "border-transparent text-slate-500 hover:text-ink dark:hover:text-white",
                      )}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {results.length ? (
              <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((product) => (
                  <ProductCard key={product.id} product={product} quantity={quantityFor(product.id)} onAdd={addToCart} />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <BookOpen className="mx-auto size-8 text-slate-400" />
                <p className="mt-4 text-lg font-semibold text-ink dark:text-white">No titles match these filters</p>
                <button type="button" onClick={clearFilters} className="mt-3 text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
                  Clear filters
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function filterProducts(products: LibraryProduct[], input: { query: string; category: string; type: string; difficulty: string; sort: string }) {
  const q = input.query.trim().toLowerCase();
  return products
    .filter((product) => {
      const haystack = [product.title, product.subtitle, product.author, product.isbn, product.category, product.collection, product.series, product.publisher, product.tags.join(" ")]
        .join(" ")
        .toLowerCase();
      return (!q || haystack.includes(q)) && (!input.category || product.category === input.category) && (!input.type || product.productType === input.type) && (!input.difficulty || product.difficulty === input.difficulty);
    })
    .sort((a, b) => {
      if (input.sort === "price-asc") return a.price - b.price;
      if (input.sort === "highest-rated") return b.rating - a.rating;
      if (input.sort === "most-downloaded") return b.downloadCount - a.downloadCount;
      if (input.sort === "best-selling") return Number(b.bestSeller) - Number(a.bestSeller) || b.downloadCount - a.downloadCount;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
}

function EmptyLibraryState() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <BookOpen className="mx-auto size-10 text-emerald-700" />
        <h2 className="mt-5 text-3xl font-semibold tracking-tight text-ink dark:text-white">The HouseLink Library is being prepared</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
          Professional property books, templates, and toolkits will appear here soon.
        </p>
        <Link
          href="/search"
          className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          Browse properties <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}

function ProductCard({ product, quantity, onAdd }: { product: LibraryProduct; quantity: number; onAdd: (product: LibraryProduct) => void }) {
  return (
    <article className="group flex min-w-0 flex-col">
      <div className="bg-[linear-gradient(180deg,#e8f0ed_0%,#f4f8f7_100%)] px-6 py-7 dark:bg-slate-900">
        <BookCover product={product} className="mx-auto w-full max-w-[13rem]" />
      </div>
      <div className="mt-4 flex min-w-0 flex-1 flex-col">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{libraryFormatsLabel(product)}</p>
        <Link href={`/library/${product.slug}`} className="mt-1 line-clamp-2 text-lg font-semibold leading-snug text-ink transition hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300">
          {product.title}
        </Link>
        <p className="mt-1 line-clamp-1 text-sm text-slate-500">{product.author}</p>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{product.shortDescription}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="flex items-center gap-1 text-sm text-amber-500">
            <Star className="size-4 fill-current" />
            <span className="font-semibold text-slate-700 dark:text-slate-200">{product.rating || "New"}</span>
          </span>
          <p className="text-base font-semibold text-ink dark:text-white">{libraryPriceLabel(product)}</p>
        </div>
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <Button onClick={() => onAdd(product)} disabled={product.comingSoon && !product.preorder}>
            <ShoppingCart className="size-4" /> {quantity ? `In bag (${quantity})` : product.preorder ? "Pre-order" : "Add"}
          </Button>
          <Link
            href={`/library/${product.slug}`}
            className="inline-flex size-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-emerald-600 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-300"
            aria-label={`View ${product.title}`}
          >
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function Select({ value, onChange, label, options }: { value: string; onChange: (value: string) => void; label: string; options: string[] }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <Filter className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 lg:w-44"
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
