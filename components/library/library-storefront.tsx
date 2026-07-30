"use client";

import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  BookmarkCheck,
  CheckCircle2,
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
import { Button } from "@/components/ui/button";
import { useLibraryCart, type LibraryCartLine } from "@/lib/library/cart-client";
import { libraryFacets, type LibraryProduct } from "@/lib/library/catalog";
import { cn } from "@/lib/utils";

export function LibraryStorefront({ products }: { products: LibraryProduct[] }) {
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
  const [notice, setNotice] = useState("");
  const { cart, setCart, total, currency } = useLibraryCart();
  const featured = products.find((product) => product.editorsChoice) ?? products.find((product) => product.featured) ?? products[0];
  const featuredProducts = products.filter((product) => product.editorsChoice || product.featured).slice(0, 3);
  const bestSellers = products.filter((product) => product.bestSeller).slice(0, 3);
  const results = useMemo(() => filterProducts(products, { query, category, type, difficulty, sort }), [products, query, category, type, difficulty, sort]);
  const quantityFor = (productId: string) => cart.find((line) => line.productId === productId)?.quantity ?? 0;

  function addToCart(product: LibraryProduct) {
    setCart((current) => {
      const existing = current.find((line) => line.productId === product.id);
      if (existing) return current.map((line) => (line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line));
      return [...current, { productId: product.id, title: product.title, price: product.price, currency: product.currency, quantity: 1 }];
    });
    setNotice(`${product.title} added to your Library Bag.`);
    window.setTimeout(() => setNotice(""), 2600);
  }

  return (
    <main className="bg-[#f5f8f7] text-ink dark:bg-slate-950 dark:text-white">
      {notice && (
        <div role="status" aria-live="polite" className="fixed right-4 top-24 z-50 max-w-sm rounded-lg border border-emerald-200 bg-white p-4 text-sm font-semibold text-emerald-950 shadow-xl dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-100">
          <CheckCircle2 className="mr-2 inline size-4 text-emerald-600" /> {notice}
        </div>
      )}

      <section className="border-b border-[#d7e7e3] bg-[#dceff2]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_29rem] lg:items-center lg:px-8 lg:py-14">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.15em] text-[#007f68] shadow-sm">
              <BookOpen className="size-4" /> HouseLink Library Store
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[0.98] tracking-normal text-[#0d2630] sm:text-6xl lg:text-[4.9rem]">
              Books and tools for smarter property work.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#35515a] sm:text-lg">
              Buy practical manuals, legal packs, templates and agent resources from a clean HouseLink bookshop built for quick decisions.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="#library-products" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#007f68] px-5 text-sm font-black text-white shadow-lg shadow-emerald-900/15 transition hover:bg-[#006b58]">
                Browse books <ArrowRight className="size-4" />
              </Link>
              <Link href="/dashboard/my-library" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[#b8d8d4] bg-white px-5 text-sm font-bold text-[#0d2630] shadow-sm transition hover:border-[#007f68]">
                My Library <BookmarkCheck className="size-4" />
              </Link>
            </div>
          </div>

          {featured && (
            <div className="rounded-lg border border-white/80 bg-white/85 p-5 shadow-xl shadow-slate-900/10 backdrop-blur">
              <div className="grid gap-5 sm:grid-cols-[12rem_1fr] lg:grid-cols-1">
                <BookCover product={featured} className="mx-auto w-full max-w-[14.5rem]" priority />
                <div>
                  <p className="inline-flex items-center rounded-full bg-[#fff3d2] px-3 py-1 text-xs font-black uppercase text-[#8a6410]">Featured book</p>
                  <Link href={`/library/${featured.slug}`} className="mt-3 block text-2xl font-black leading-tight text-[#0d2630] hover:text-[#007f68]">
                    {featured.title}
                  </Link>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{featured.shortDescription}</p>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <p className="text-2xl font-black text-[#0d2630]">USD {featured.price.toFixed(2)}</p>
                    <Button onClick={() => addToCart(featured)}>
                      <ShoppingCart className="size-4" /> {quantityFor(featured.id) ? `In bag (${quantityFor(featured.id)})` : "Add"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="border-b border-[#dfe8e5] bg-white">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-5 sm:px-6 md:grid-cols-3 lg:px-8">
          <StorePromise icon={ShieldCheck} title="Secure checkout" text="Protected orders and invoices." />
          <StorePromise icon={Award} title="Professional resources" text="Curated for property operators." />
          <StorePromise icon={BookOpen} title="Digital delivery" text="Downloads and library access." />
        </div>
      </section>

      <section className="sticky top-0 z-20 border-b border-[#dfe8e5] bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center lg:px-8">
          <label className="relative min-w-0">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, author, category or ISBN" className="h-12 w-full rounded-lg border border-[#d8e4e0] bg-white pl-11 pr-4 text-sm shadow-sm outline-none transition focus:border-[#007f68] focus:ring-4 focus:ring-[#007f68]/12 dark:border-slate-700 dark:bg-slate-900" />
          </label>
          <Select value={category} onChange={setCategory} label="Category" options={facets.categories} />
          <Select value={type} onChange={setType} label="Format" options={facets.types} />
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-12 rounded-lg border border-[#d8e4e0] bg-white px-3 text-sm shadow-sm outline-none transition focus:border-[#007f68] dark:border-slate-700 dark:bg-slate-900">
            <option value="newest">Newest</option>
            <option value="best-selling">Best selling</option>
            <option value="most-downloaded">Most downloaded</option>
            <option value="highest-rated">Highest rated</option>
            <option value="price-asc">Price: low to high</option>
          </select>
        </div>
      </section>

      {!products.length ? (
        <EmptyLibraryState />
      ) : (
        <>
          <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.12em] text-[#007f68]">Shop departments</p>
                <h2 className="mt-1 text-3xl font-black tracking-normal text-[#0d2630] dark:text-white">Find the right resource faster</h2>
              </div>
              <p className="hidden max-w-md text-sm leading-6 text-slate-600 md:block">Browse by the way property professionals actually work: learning, investing, legal paperwork and field operations.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {facets.categories.map((item) => (
                <CategoryTile key={item} name={item} count={products.filter((product) => product.category === item).length} active={category === item} onClick={() => setCategory(category === item ? "" : item)} />
              ))}
            </div>
          </section>

          <PromoBanner products={products.slice(0, 3)} />

          <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-8">
            <div id="library-products" className="min-w-0 space-y-10">
              <ProductSection title="Featured Books" subtitle="The strongest resources to start with." products={featuredProducts} onAdd={addToCart} quantityFor={quantityFor} />
              <ProductSection title="Best Sellers" subtitle="Popular products customers keep choosing." products={bestSellers} onAdd={addToCart} quantityFor={quantityFor} />

              <section className="space-y-5">
                <div className="flex flex-col gap-4 border-t border-[#dfe8e5] pt-8 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.12em] text-[#007f68]">Catalogue</p>
                    <h2 className="mt-1 text-3xl font-black tracking-normal text-[#0d2630] dark:text-white">{results.length} products</h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 pr-1 text-sm font-bold text-slate-700 dark:text-slate-200">
                      <SlidersHorizontal className="size-4" /> Level
                    </span>
                    {facets.difficulties.map((item) => (
                      <button key={item} type="button" onClick={() => setDifficulty(difficulty === item ? "" : item)} className={cn("rounded-full border px-3 py-1.5 text-sm font-semibold transition", difficulty === item ? "border-[#007f68] bg-[#007f68] text-white" : "border-[#d8e4e0] bg-white text-slate-600 hover:border-[#007f68] hover:text-[#0d2630] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300")}>
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {results.map((product) => (
                    <ProductCard key={product.id} product={product} quantity={quantityFor(product.id)} onAdd={addToCart} />
                  ))}
                </div>
              </section>
            </div>

            <aside className="h-fit space-y-4 lg:sticky lg:top-24">
              <CartPanel cart={cart} total={total} currency={currency} onCart={(next) => setCart(next)} />
            </aside>
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

function ProductSection({ title, subtitle, products, onAdd, quantityFor }: { title: string; subtitle: string; products: LibraryProduct[]; onAdd: (product: LibraryProduct) => void; quantityFor: (id: string) => number }) {
  if (!products.length) return null;
  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-normal text-[#0d2630] dark:text-white">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{subtitle}</p>
        </div>
        <Link href="#library-products" className="hidden items-center gap-1 text-sm font-bold text-[#007f68] sm:inline-flex">
          View all <ArrowRight className="size-4" />
        </Link>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} quantity={quantityFor(product.id)} onAdd={onAdd} compact />
        ))}
      </div>
    </section>
  );
}

function EmptyLibraryState() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-6 rounded-lg border border-dashed border-[#bdd9d2] bg-white p-8 text-center shadow-sm md:p-12">
        <span className="mx-auto grid size-14 place-items-center rounded-lg bg-[#e9f7f2] text-[#007f68]">
          <BookOpen className="size-7" />
        </span>
        <div>
          <h2 className="text-3xl font-black tracking-normal text-[#0d2630] dark:text-white">The HouseLink Library is being prepared</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Professional property books, templates, and toolkits will appear here soon. Please check back for published resources from HouseLink.
          </p>
        </div>
        <Link href="/search" className="mx-auto inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#007f68] px-5 text-sm font-black text-white transition hover:bg-[#006b58]">
          Browse properties <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}

function ProductCard({ product, quantity, onAdd, compact = false }: { product: LibraryProduct; quantity: number; onAdd: (product: LibraryProduct) => void; compact?: boolean }) {
  return (
    <article className="group rounded-lg border border-[#dfe8e5] bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-[#007f68] hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <div className="rounded-lg bg-[#f5f8f7] px-4 py-5">
        <BookCover product={product} className={cn("mx-auto w-full", compact ? "max-w-[11.25rem]" : "max-w-[12.75rem]")} />
      </div>
      <div className="mt-4 flex min-w-0 flex-col">
        <p className="text-xs font-black uppercase tracking-wide text-[#007f68] dark:text-emerald-300">{product.productType.replace(/_/g, " ")}</p>
        <Link href={`/library/${product.slug}`} className="mt-1 line-clamp-2 text-base font-black leading-snug text-[#0d2630] hover:text-[#007f68] dark:text-white">
          {product.title}
        </Link>
        <p className="mt-1 line-clamp-1 text-sm text-slate-500">{product.author}</p>
        {!compact && <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{product.shortDescription}</p>}
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="flex items-center gap-1 text-sm text-amber-500">
            <Star className="size-4 fill-current" />
            <span className="font-bold text-slate-700 dark:text-slate-200">{product.rating || "New"}</span>
          </span>
          <p className="text-base font-black text-[#0d2630] dark:text-white">USD {product.price.toFixed(2)}</p>
        </div>
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <Button onClick={() => onAdd(product)} disabled={product.comingSoon && !product.preorder}>
            <ShoppingCart className="size-4" /> {quantity ? `In bag (${quantity})` : product.preorder ? "Pre-order" : "Add"}
          </Button>
          <Link href={`/library/${product.slug}`} className="inline-flex size-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-[#007f68] hover:text-[#007f68] dark:border-slate-700 dark:text-slate-300" aria-label={`View ${product.title}`}>
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function CategoryTile({ name, count, active, onClick }: { name: string; count: number; active: boolean; onClick: () => void }) {
  const meta = categoryMeta(name);
  const Icon = meta.icon;
  return (
    <button type="button" onClick={onClick} className={cn("min-h-44 rounded-lg border p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg", active ? "border-[#007f68] bg-[#007f68] text-white" : "border-[#dfe8e5] bg-white text-[#0d2630] hover:border-[#007f68]")}>
      <div className="flex items-start justify-between gap-3">
        <span className={cn("grid size-11 place-items-center rounded-lg", active ? "bg-white/15 text-white" : meta.badge)}>
          <Icon className="size-5" />
        </span>
        <span className={cn("rounded-full px-3 py-1 text-xs font-black", active ? "bg-white/15 text-white" : "bg-[#eef7f4] text-[#007f68]")}>{count}</span>
      </div>
      <h3 className="mt-5 text-xl font-black leading-tight">{name}</h3>
      <p className={cn("mt-2 line-clamp-2 text-sm leading-6", active ? "text-white/78" : "text-slate-500")}>{meta.text}</p>
    </button>
  );
}

function PromoBanner({ products }: { products: LibraryProduct[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
      <div className="grid overflow-hidden rounded-lg border border-[#dfe8e5] bg-[#0d2630] shadow-xl shadow-slate-900/10 lg:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="p-6 sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-[#8de5d4]">HouseLink professional library</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-black leading-tight text-white sm:text-4xl">A cleaner way to buy the documents, books and templates behind better property work.</h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">Build your operating shelf with resources for agents, landlords, investors and developers, then access them from your HouseLink library.</p>
          <Link href="#library-products" className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-black text-[#0d2630] transition hover:bg-[#e9f7f2]">
            Shop the catalogue <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="relative hidden min-h-72 bg-[#dceff2] lg:block">
          <div className="absolute bottom-8 left-8 h-4 w-72 rounded-full bg-slate-900/15" />
          {products[0] && <BookCover product={products[0]} className="absolute bottom-12 left-16 w-36 rotate-[-8deg]" />}
          {products[1] && <BookCover product={products[1]} className="absolute bottom-12 left-40 z-10 w-40" />}
          {products[2] && <BookCover product={products[2]} className="absolute bottom-12 right-14 w-36 rotate-[8deg]" />}
        </div>
      </div>
    </section>
  );
}

function categoryMeta(name: string): { icon: LucideIcon; badge: string; text: string } {
  if (name === "Courses") return { icon: GraduationCap, badge: "bg-[#eef2ff] text-[#4f46e5]", text: "Structured lessons and guided learning paths." };
  if (name === "Investment") return { icon: TrendingUp, badge: "bg-[#fff7ed] text-[#c2410c]", text: "Guides for yield, risk and market decisions." };
  if (name === "Legal Documents") return { icon: FileText, badge: "bg-[#eff6ff] text-[#2563eb]", text: "Editable packs for landlord and lease workflows." };
  if (name === "Property Law") return { icon: Home, badge: "bg-[#e9f7f2] text-[#007f68]", text: "Reference manuals for compliant property work." };
  if (name === "Toolkits") return { icon: Wrench, badge: "bg-[#fef3c7] text-[#a16207]", text: "Checklists, scripts and practical agent resources." };
  return { icon: BookOpen, badge: "bg-[#e9f7f2] text-[#007f68]", text: "Browse professional HouseLink resources." };
}

function StorePromise({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#dfe8e5] bg-[#fbfaf6] p-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-[#e9f7f2] text-[#007f68]">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="font-black text-[#0d2630]">{title}</p>
        <p className="mt-0.5 text-sm text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function CartPanel({ cart, total, currency, onCart }: { cart: LibraryCartLine[]; total: number; currency: string; onCart: (cart: LibraryCartLine[]) => void }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#dfe8e5] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-[#dfe8e5] bg-[#fbfaf6] p-4 dark:border-slate-800 dark:bg-slate-950">
        <p className="flex items-center gap-2 text-sm font-bold text-ink dark:text-white">
          <ShoppingBag className="size-4" /> Library Bag
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Checkout, invoices and secure delivery.</p>
      </div>
      <div className="space-y-3 p-4">
        {cart.length ? (
          cart.map((line) => (
            <div key={line.productId} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-2 font-bold text-ink dark:text-white">{line.title}</p>
                  <p className="text-slate-500">Qty {line.quantity}</p>
                </div>
                <p className="font-black">
                  {line.currency} {(line.price * line.quantity).toFixed(2)}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700">
                  <button type="button" onClick={() => onCart(cart.map((item) => (item.productId === line.productId ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item)))} className="grid size-8 place-items-center text-slate-500 hover:text-emerald-700" aria-label="Decrease quantity">
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-8 text-center text-xs font-black">{line.quantity}</span>
                  <button type="button" onClick={() => onCart(cart.map((item) => (item.productId === line.productId ? { ...item, quantity: item.quantity + 1 } : item)))} className="grid size-8 place-items-center text-slate-500 hover:text-emerald-700" aria-label="Increase quantity">
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <button type="button" onClick={() => onCart(cart.filter((item) => item.productId !== line.productId))} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-red-600">
                  <Trash2 className="size-3.5" /> Remove
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="grid min-h-32 place-items-center rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700">
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
        <Link href="/library/checkout" className={cn("inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-bold", cart.length ? "bg-[#007f68] text-white hover:bg-[#006b58]" : "pointer-events-none bg-slate-200 text-slate-500 dark:bg-slate-800")}>
          <ShoppingCart className="size-4" /> Checkout
        </Link>
      </div>
    </div>
  );
}

function Select({ value, onChange, label, options }: { value: string; onChange: (value: string) => void; label: string; options: string[] }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <Filter className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-lg border border-[#d8e4e0] bg-white pl-9 pr-3 text-sm shadow-sm outline-none transition focus:border-[#007f68] dark:border-slate-700 dark:bg-slate-900 lg:w-44">
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
