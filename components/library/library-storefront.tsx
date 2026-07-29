"use client";

import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  BookmarkCheck,
  CheckCircle2,
  Filter,
  LibraryBig,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
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
  const results = useMemo(() => filterProducts(products, { query, category, type, difficulty, sort }), [products, query, category, type, difficulty, sort]);
  const bestSellers = products.filter((product) => product.bestSeller);
  const toolkits = products.filter((product) => ["TOOLKIT", "FORMS", "TEMPLATE", "BUNDLE"].includes(product.productType));
  const newReleases = products.filter((product) => product.newRelease);
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
    <main className="bg-[#f6f8f7] text-ink dark:bg-slate-950 dark:text-white">
      {notice && (
        <div role="status" aria-live="polite" className="fixed right-4 top-24 z-50 max-w-sm rounded-lg border border-emerald-200 bg-white p-4 text-sm font-semibold text-emerald-950 shadow-xl dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-100">
          <CheckCircle2 className="mr-2 inline size-4 text-emerald-600" /> {notice}
        </div>
      )}

      <section className="relative overflow-hidden border-b border-[#d6c7aa] bg-[#241914] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:72px_72px]" />
        <div className="absolute inset-x-0 bottom-0 hidden h-28 bg-[repeating-linear-gradient(90deg,#4b2b1f_0_38px,#7f4f2e_38px_64px,#173b38_64px_98px,#b98d45_98px_112px,#2e233d_112px_146px)] opacity-25 lg:block" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(36,25,20,0.98)_0%,rgba(39,32,26,0.92)_42%,rgba(13,55,49,0.74)_100%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_34rem] lg:items-center lg:px-8 lg:py-16">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#e7c873]/40 bg-[#fff7e6]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#f8d77a]">
              <LibraryBig className="size-4" /> HouseLink Bookshop
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[0.92] text-white sm:text-6xl lg:text-[5.8rem]">
              The property bookshelf worth browsing.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#f7ead3] sm:text-lg">
              Beautifully packaged manuals, legal templates, field toolkits and training guides for Zimbabwe’s property professionals.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="#library-products" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#f4c95d] px-5 text-sm font-black text-[#1f1712] shadow-lg shadow-black/25 transition hover:bg-[#ffdc78]">
                Enter the shop <ArrowRight className="size-4" />
              </Link>
              <Link href="/dashboard/my-library" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/18 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15">
                My Library <BookOpen className="size-4" />
              </Link>
            </div>
            <div className="mt-9 grid max-w-3xl gap-3 sm:grid-cols-3">
              <HeroBadge icon={Award} label="Expert curated" value="Property practice" />
              <HeroBadge icon={BookmarkCheck} label="Ready to use" value="Forms + guides" />
              <HeroBadge icon={ShieldCheck} label="Secure access" value="Checkout + invoices" />
            </div>
          </div>

          {featured && (
            <div className="relative min-h-[34rem]">
              <div className="absolute inset-x-0 bottom-3 mx-auto h-8 max-w-md rounded-[50%] bg-black/45 blur-xl" />
              <div className="absolute left-0 top-16 hidden w-48 rotate-[-12deg] opacity-90 sm:block">
                {products[1] && <BookCover product={products[1]} />}
              </div>
              <div className="absolute right-0 top-20 hidden w-44 rotate-[10deg] opacity-85 sm:block">
                {products[2] && <BookCover product={products[2]} />}
              </div>
              <div className="absolute left-12 bottom-12 hidden w-40 rotate-[7deg] opacity-80 lg:block">
                {products[3] && <BookCover product={products[3]} />}
              </div>
              <div className="relative mx-auto w-full max-w-sm pt-2">
                <div className="rounded-lg border border-[#e7c873]/35 bg-[#fff7e6]/10 p-4 shadow-2xl shadow-black/30 backdrop-blur">
                  <BookCover product={featured} className="mx-auto w-72 sm:w-80" priority />
                  <div className="mt-5">
                    <p className="inline-flex items-center gap-1 rounded-full bg-[#f4c95d] px-3 py-1 text-xs font-black uppercase text-[#1f1712]">
                      <Sparkles className="size-3.5" /> Featured shelf
                    </p>
                    <Link href={`/library/${featured.slug}`} className="mt-3 block text-2xl font-black leading-tight text-white hover:text-[#f4c95d]">
                      {featured.title}
                    </Link>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-3xl font-black">USD {featured.price.toFixed(2)}</p>
                      <Button onClick={() => addToCart(featured)}>
                        <ShoppingCart className="size-4" /> {quantityFor(featured.id) ? `In bag (${quantityFor(featured.id)})` : "Add"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="sticky top-0 z-20 border-b border-[#e1d7c5] bg-[#fffaf0]/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center lg:px-8">
          <label className="relative min-w-0">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search books, templates, manuals or authors" className="h-12 w-full rounded-lg border border-[#e1d7c5] bg-white pl-11 pr-4 text-sm shadow-sm outline-none transition focus:border-[#b98d45] focus:ring-4 focus:ring-[#b98d45]/15 dark:border-slate-700 dark:bg-slate-900" />
          </label>
          <Select value={category} onChange={setCategory} label="Category" options={facets.categories} />
          <Select value={type} onChange={setType} label="Format" options={facets.types} />
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-12 rounded-lg border border-[#e1d7c5] bg-white px-3 text-sm shadow-sm outline-none transition focus:border-[#b98d45] dark:border-slate-700 dark:bg-slate-900">
            <option value="newest">Newest</option>
            <option value="best-selling">Best selling</option>
            <option value="most-downloaded">Most downloaded</option>
            <option value="highest-rated">Highest rated</option>
            <option value="price-asc">Price: low to high</option>
          </select>
        </div>
      </section>

      <section className="border-b border-[#e1d7c5] bg-[#f4ead7] dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto flex max-w-7xl gap-3 overflow-x-auto px-4 py-4 sm:px-6 lg:px-8">
          {facets.categories.map((item) => (
            <button key={item} type="button" onClick={() => setCategory(category === item ? "" : item)} className={cn("shrink-0 rounded-full border px-4 py-2 text-sm font-bold shadow-sm transition", category === item ? "border-[#241914] bg-[#241914] text-white dark:border-white dark:bg-white dark:text-slate-950" : "border-[#e1d7c5] bg-white text-slate-700 hover:border-[#b98d45] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200")}>
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:px-8">
        <div id="library-products" className="min-w-0 space-y-12">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 pr-2 text-sm font-bold text-slate-700 dark:text-slate-200">
              <SlidersHorizontal className="size-4" /> Level
            </span>
            {facets.difficulties.map((item) => (
              <button key={item} type="button" onClick={() => setDifficulty(difficulty === item ? "" : item)} className={cn("rounded-full border px-3 py-1.5 text-sm font-semibold transition", difficulty === item ? "border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-slate-950" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300")}>
                {item}
              </button>
            ))}
          </div>

          <Shelf title="Editor's Desk" subtitle="Flagship resources for serious operators." products={products.filter((product) => product.editorsChoice || product.featured)} onAdd={addToCart} quantityFor={quantityFor} />
          <Shelf title="Best Sellers" subtitle="The products customers come back for." products={bestSellers} onAdd={addToCart} quantityFor={quantityFor} />
          <Shelf title="Templates and Toolkits" subtitle="Ready-to-use forms, checklists and operating packs." products={toolkits} onAdd={addToCart} quantityFor={quantityFor} />
          <Shelf title="New Releases" subtitle="Fresh resources and upcoming launches." products={newReleases} onAdd={addToCart} quantityFor={quantityFor} />

          <section className="space-y-5">
            <div className="flex items-end justify-between gap-4 border-t border-slate-200 pt-8 dark:border-slate-800">
              <div>
                <p className="text-sm font-bold uppercase text-emerald-700 dark:text-emerald-300">Catalogue</p>
                <h2 className="text-3xl font-black tracking-normal text-ink dark:text-white">{results.length} products</h2>
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
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <p className="font-bold text-ink dark:text-white">Why this shop works</p>
            <div className="mt-3 space-y-2">
              {["Distinct product covers", "Clean shelf browsing", "Payment-ready checkout flow"].map((item) => (
                <p key={item} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> {item}
                </p>
              ))}
            </div>
          </div>
        </aside>
      </section>
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

function Shelf({ title, subtitle, products, onAdd, quantityFor }: { title: string; subtitle: string; products: LibraryProduct[]; onAdd: (product: LibraryProduct) => void; quantityFor: (id: string) => number }) {
  if (!products.length) return null;
  return (
    <section className="space-y-5 rounded-lg border border-[#e1d7c5] bg-[#fffaf0] p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-normal text-[#241914] dark:text-white">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{subtitle}</p>
        </div>
        <Link href="#library-products" className="hidden items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-300 sm:inline-flex">
          View all <ArrowRight className="size-4" />
        </Link>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {products.slice(0, 3).map((product) => (
          <ProductCard key={product.id} product={product} quantity={quantityFor(product.id)} onAdd={onAdd} />
        ))}
      </div>
    </section>
  );
}

function ProductCard({ product, quantity, onAdd }: { product: LibraryProduct; quantity: number; onAdd: (product: LibraryProduct) => void }) {
  return (
    <article className="group rounded-lg border border-[#e1d7c5] bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-[#b98d45] hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <BookCover product={product} className="mx-auto w-full max-w-[13rem]" />
      <div className="mt-5 flex min-w-0 flex-col">
        <p className="text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{product.productType.replace(/_/g, " ")}</p>
        <Link href={`/library/${product.slug}`} className="mt-1 line-clamp-2 text-lg font-black leading-snug text-ink hover:text-emerald-700 dark:text-white">
          {product.title}
        </Link>
        <p className="mt-1 text-sm text-slate-500">{product.author}</p>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{product.shortDescription}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="flex items-center gap-1 text-sm text-amber-500">
            <Star className="size-4 fill-current" />
            <span className="font-bold text-slate-700 dark:text-slate-200">{product.rating || "New"}</span>
          </span>
          <p className="text-lg font-black text-ink dark:text-white">USD {product.price.toFixed(2)}</p>
        </div>
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <Button onClick={() => onAdd(product)} disabled={product.comingSoon && !product.preorder}>
            <ShoppingCart className="size-4" /> {quantity ? `In bag (${quantity})` : product.preorder ? "Pre-order" : "Add"}
          </Button>
          <Link href={`/library/${product.slug}`} className="inline-flex size-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-emerald-500 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-300" aria-label={`View ${product.title}`}>
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function CartPanel({ cart, total, currency, onCart }: { cart: LibraryCartLine[]; total: number; currency: string; onCart: (cart: LibraryCartLine[]) => void }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#e1d7c5] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-[#e1d7c5] bg-[#fffaf0] p-4 dark:border-slate-800 dark:bg-slate-950">
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
        <Link href="/library/checkout" className={cn("inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-bold", cart.length ? "bg-[#241914] text-white hover:bg-[#3b2920] dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200" : "pointer-events-none bg-slate-200 text-slate-500 dark:bg-slate-800")}>
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
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-lg border border-[#e1d7c5] bg-white pl-9 pr-3 text-sm shadow-sm outline-none transition focus:border-[#b98d45] dark:border-slate-700 dark:bg-slate-900 lg:w-44">
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

function HeroBadge({ icon: Icon, label, value }: { icon: typeof ShieldCheck; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#e7c873]/25 bg-[#fff7e6]/10 p-3 backdrop-blur">
      <Icon className="size-5 text-[#f4c95d]" />
      <p className="mt-2 text-sm font-black text-white">{value}</p>
      <p className="text-xs font-semibold text-[#f7ead3]/75">{label}</p>
    </div>
  );
}
