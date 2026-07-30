"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Search, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";
import { BookCover } from "@/components/library/book-cover";
import { LibraryCartFab } from "@/components/library/library-cart-fab";
import { useApp } from "@/components/providers/app-provider";
import {
  notifyLibraryCartAdded,
  useLibraryCart,
  sameLibraryCartLine,
} from "@/lib/library/cart-client";
import {
  enabledLibraryFormats,
  libraryFacets,
  libraryPriceLabel,
  type LibraryProduct,
} from "@/lib/library/catalog";
import type { LibraryStoreSettings } from "@/lib/library/settings-shared";
import { cn } from "@/lib/utils";

const TILE_TONES = [
  "bg-[#f3f1eb]",
  "bg-[#efe8e2]",
  "bg-[#e8ecea]",
  "bg-[#ece7f0]",
  "bg-[#e7eef1]",
  "bg-[#f1ebe3]",
  "bg-[#e9eee8]",
  "bg-[#f0ebe7]",
];

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
  const facets = products.length
    ? {
        categories: Array.from(new Set(products.map((p) => p.category))).sort(),
        types: Array.from(new Set(products.map((p) => p.productType))).sort(),
      }
    : libraryFacets();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState(merchandising.defaultSort === "downloads" ? "most-downloaded" : merchandising.defaultSort === "rating" ? "highest-rated" : merchandising.defaultSort);
  const { setCart, count } = useLibraryCart();

  const featured = products.find((product) => product.editorsChoice) ?? products.find((product) => product.featured) ?? products[0];
  const curated = useMemo(() => {
    if (!merchandising.showCuratedRail) return [];
    return products.filter((product) => product.editorsChoice || product.featured).slice(0, merchandising.maxCuratedItems);
  }, [products, merchandising.showCuratedRail, merchandising.maxCuratedItems]);

  const results = useMemo(
    () => filterProducts(products, { query, category, sort }),
    [products, query, category, sort],
  );

  const hidePrices = merchandising.hidePricesUntilLogin && !user;
  const headline = merchandising.heroHeadline?.trim() || "Professional property books for every day.";
  const subcopy = merchandising.heroSubcopy?.trim() || "Manuals, legal packs, and tools for smarter property work in Zimbabwe.";
  const ctaLabel = merchandising.ctaLabel?.trim() || "Shop now";
  const ctaHref = merchandising.ctaHref?.trim() || "#library-products";
  const storeName = store.name?.trim() || "HouseLink Library";

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
    <main className="min-h-screen bg-[#fafafa] font-library text-[#141414] antialiased dark:bg-slate-950 dark:text-white">
      <LibraryCartFab />

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 border-b border-black/[0.06] pb-5 dark:border-white/10">
          <div className="min-w-0">
            <p className="font-libraryDisplay text-xl font-semibold tracking-[-0.02em] text-[#141414] dark:text-white sm:text-2xl">
              {storeName}
            </p>
          </div>
          <nav className="hidden items-center gap-8 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#141414]/70 dark:text-white/70 md:flex">
            <a href="#library-products" className="transition hover:text-[#141414] dark:hover:text-white">
              Shop
            </a>
            <Link href="/dashboard/my-library" className="transition hover:text-[#141414] dark:hover:text-white">
              My Library
            </Link>
            <Link href="/library/checkout" className="inline-flex items-center gap-2 transition hover:text-[#141414] dark:hover:text-white">
              Bag
              <span className="grid h-5 min-w-5 place-items-center bg-[#141414] px-1.5 text-[10px] font-bold text-white dark:bg-white dark:text-[#141414]">
                {count}
              </span>
            </Link>
          </nav>
          <Link
            href="/library/checkout"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#141414] md:hidden dark:text-white"
            aria-label={`Library bag, ${count} items`}
          >
            <ShoppingBag className="size-4" />
            <span>{count}</span>
          </Link>
        </header>
      </div>

      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-[linear-gradient(135deg,#ece7df_0%,#f4f1eb_42%,#e5ece9_100%)] dark:bg-[linear-gradient(135deg,#1e293b_0%,#0f172a_100%)]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40 motion-safe:animate-library-drift [background-image:radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.7),transparent_36%),radial-gradient(circle_at_82%_70%,rgba(26,53,96,0.08),transparent_40%)]"
          />
          <div className="relative grid items-center gap-10 px-6 py-12 sm:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)] lg:gap-12 lg:py-16 xl:px-14">
            <div className="max-w-xl motion-safe:animate-fade-up">
              <h1 className="font-libraryDisplay text-[2.6rem] font-medium leading-[1.05] tracking-[-0.03em] text-[#141414] dark:text-white sm:text-5xl lg:text-[3.4rem]">
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
          {curated.length > 0 && (
            <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 lg:px-8">
              <div className="mb-8 flex items-end justify-between gap-4">
                <h2 className="font-libraryDisplay text-2xl font-medium tracking-[-0.02em] text-[#141414] dark:text-white sm:text-3xl">
                  {merchandising.curatedTitle || "Editor picks"}
                </h2>
                <a href="#library-products" className="hidden text-sm font-semibold text-[#141414]/55 transition hover:text-[#141414] sm:inline-flex dark:text-white/55 dark:hover:text-white">
                  View all
                </a>
              </div>
              <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
                {curated.map((product, index) => (
                  <ProductTile
                    key={product.id}
                    product={product}
                    tone={TILE_TONES[index % TILE_TONES.length]}
                    hidePrice={hidePrices}
                    onAdd={() => addToCart(product)}
                  />
                ))}
              </div>
            </section>
          )}

          <section id="library-products" className="mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-5 border-b border-black/[0.06] pb-6 dark:border-white/10 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="font-libraryDisplay text-2xl font-medium tracking-[-0.02em] text-[#141414] dark:text-white sm:text-3xl">
                  All titles
                </h2>
                <p className="mt-2 text-sm text-[#141414]/55 dark:text-white/55">
                  {results.length} {results.length === 1 ? "product" : "products"}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="relative min-w-0 flex-1 sm:w-72">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#141414]/35" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by title, author, or category"
                    className="h-11 w-full border border-black/[0.08] bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-[#141414]/35 focus:border-[#1a3560] dark:border-white/10 dark:bg-slate-900 dark:placeholder:text-white/35"
                  />
                </label>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  className="h-11 border border-black/[0.08] bg-white px-3 text-sm outline-none transition focus:border-[#1a3560] dark:border-white/10 dark:bg-slate-900"
                  aria-label="Sort products"
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

            <div className="mb-10 flex flex-wrap gap-x-6 gap-y-2">
              <CategoryLink label="All" active={!category} onClick={() => setCategory("")} />
              {facets.categories.map((item) => (
                <CategoryLink
                  key={item}
                  label={item}
                  active={category === item}
                  onClick={() => setCategory(category === item ? "" : item)}
                />
              ))}
            </div>

            {results.length ? (
              <div className="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 xl:grid-cols-4">
                {results.map((product, index) => (
                  <ProductTile
                    key={product.id}
                    product={product}
                    tone={TILE_TONES[index % TILE_TONES.length]}
                    hidePrice={hidePrices}
                    onAdd={() => addToCart(product)}
                  />
                ))}
              </div>
            ) : (
              <p className="py-16 text-center text-sm text-[#141414]/55 dark:text-white/55">No titles match that search.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function ProductTile({
  product,
  tone,
  hidePrice,
  onAdd,
}: {
  product: LibraryProduct;
  tone: string;
  hidePrice: boolean;
  onAdd: () => void;
}) {
  return (
    <article className="group/tile">
      <div className={cn("relative aspect-square overflow-hidden", tone)}>
        <div className="absolute inset-0 grid place-items-center p-6 sm:p-8">
          <BookCover
            product={product}
            variant="shop"
            interactive={false}
            className="w-[58%] max-w-[11rem]"
            sizes="(max-width: 768px) 40vw, 220px"
          />
        </div>
        <Link
          href={`/library/${product.slug}`}
          className="absolute inset-0 z-[1] transition duration-500 group-hover/tile:bg-black/[0.02]"
          aria-label={product.title}
        />
      </div>
      <div className="relative z-[2] mt-4 space-y-1.5">
        <Link
          href={`/library/${product.slug}`}
          className="block text-sm font-medium leading-snug text-[#141414] transition hover:text-[#1a3560] dark:text-white dark:hover:text-[#8de5d4]"
        >
          {product.title}
        </Link>
        <p className="text-sm text-[#141414]/50 dark:text-white/50">
          {hidePrice ? (
            <Link href={`/login?next=/library/${product.slug}`} className="underline-offset-2 hover:underline">
              Sign in for price
            </Link>
          ) : (
            libraryPriceLabel(product)
          )}
        </p>
        <button
          type="button"
          onClick={onAdd}
          disabled={product.comingSoon && !product.preorder}
          className="pt-1 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-[#141414]/45 transition hover:text-[#1a3560] disabled:cursor-not-allowed disabled:opacity-40 dark:text-white/45 dark:hover:text-[#8de5d4]"
        >
          {product.preorder ? "Pre-order" : "Add to cart"}
        </button>
      </div>
    </article>
  );
}

function CategoryLink({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border-b pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] transition",
        active
          ? "border-[#141414] text-[#141414] dark:border-white dark:text-white"
          : "border-transparent text-[#141414]/40 hover:text-[#141414] dark:text-white/40 dark:hover:text-white",
      )}
    >
      {label}
    </button>
  );
}

function EmptyLibraryState() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg text-center">
        <span className="mx-auto grid size-12 place-items-center bg-[#ece7df] text-[#1a3560]">
          <BookOpen className="size-5" />
        </span>
        <h2 className="mt-6 font-libraryDisplay text-3xl font-medium tracking-[-0.02em] text-[#141414] dark:text-white">
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
  input: { query: string; category: string; sort: string },
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
      return (!q || haystack.includes(q)) && (!input.category || product.category === input.category);
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
