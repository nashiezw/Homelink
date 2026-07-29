"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Download, Filter, LibraryBig, Minus, Plus, Search, ShieldCheck, ShoppingBag, ShoppingCart, SlidersHorizontal, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLibraryCart, type LibraryCartLine } from "@/lib/library/cart-client";
import { libraryFacets, type LibraryProduct } from "@/lib/library/catalog";
import { cn } from "@/lib/utils";

export function LibraryStorefront({ products }: { products: LibraryProduct[] }) {
  const facets = products.length ? {
    categories: Array.from(new Set(products.map((p) => p.category))).sort(),
    types: Array.from(new Set(products.map((p) => p.productType))).sort(),
    difficulties: Array.from(new Set(products.map((p) => p.difficulty))).sort(),
  } : libraryFacets();
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
      if (existing) return current.map((line) => line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line);
      return [...current, { productId: product.id, title: product.title, price: product.price, currency: product.currency, quantity: 1 }];
    });
    setNotice(`${product.title} added to your Library Bag.`);
    window.setTimeout(() => setNotice(""), 2600);
  }

  return (
    <main className="bg-[#f7f8f5] text-ink dark:bg-slate-950 dark:text-white">
      {notice && <div role="status" aria-live="polite" className="fixed right-4 top-24 z-50 max-w-sm rounded-lg border border-emerald-200 bg-white p-4 text-sm font-semibold text-emerald-950 shadow-2xl dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-100"><CheckCircle2 className="mr-2 inline size-4 text-emerald-600" /> {notice}</div>}
      <section className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-center lg:px-8 lg:py-12">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300"><LibraryBig className="size-4" /> HouseLink Library</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight text-ink sm:text-5xl lg:text-6xl dark:text-white">Property books, templates and manuals in one clean shop.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-300">Practical resources for agents, landlords, investors and property managers, with secure checkout and instant digital delivery where available.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="#library-products" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ink px-5 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">Shop products <ArrowRight className="size-4" /></Link>
              <Link href="/dashboard/my-library" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white">My Library <BookOpen className="size-4" /></Link>
            </div>
            <div className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
              <Proof icon={ShieldCheck} label="Protected checkout" />
              <Proof icon={Download} label="Secure downloads" />
              <Proof icon={ShoppingBag} label="Native checkout" />
            </div>
          </div>
          {featured && <HeroProduct product={featured} quantity={quantityFor(featured.id)} onAdd={addToCart} />}
        </div>
      </section>

      <section className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center lg:px-8">
          <label className="relative min-w-0"><Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, author, category or ISBN" className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 dark:border-slate-700 dark:bg-slate-900" /></label>
          <Select value={category} onChange={setCategory} label="Category" options={facets.categories} />
          <Select value={type} onChange={setType} label="Format" options={facets.types} />
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="newest">Newest</option><option value="best-selling">Best selling</option><option value="most-downloaded">Most downloaded</option><option value="highest-rated">Highest rated</option><option value="price-asc">Price: low to high</option></select>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-7 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8">
        <div id="library-products" className="min-w-0 space-y-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200"><SlidersHorizontal className="size-4" /> Level</span>
            {facets.difficulties.map((item) => <button key={item} type="button" onClick={() => setDifficulty(difficulty === item ? "" : item)} className={cn("rounded-full border px-3 py-1.5 text-sm font-semibold transition", difficulty === item ? "border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-slate-950" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300")}>{item}</button>)}
          </div>
          <Shelf title="Editor's Desk" products={products.filter((product) => product.editorsChoice || product.featured)} onAdd={addToCart} quantityFor={quantityFor} />
          <Shelf title="Best Sellers" products={bestSellers} onAdd={addToCart} quantityFor={quantityFor} />
          <Shelf title="Templates, Forms and Toolkits" products={toolkits} onAdd={addToCart} quantityFor={quantityFor} />
          <Shelf title="New Releases" products={newReleases} onAdd={addToCart} quantityFor={quantityFor} />
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4 border-t border-slate-200 pt-8 dark:border-slate-800"><div><p className="text-sm font-bold uppercase text-emerald-700 dark:text-emerald-300">Catalogue</p><h2 className="text-2xl font-semibold tracking-normal text-ink dark:text-white">{results.length} products</h2></div></div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{results.map((product) => <ProductCard key={product.id} product={product} quantity={quantityFor(product.id)} onAdd={addToCart} />)}</div>
          </section>
        </div>
        <aside className="h-fit space-y-4 lg:sticky lg:top-24">
          <CartPanel cart={cart} total={total} currency={currency} onCart={(next) => setCart(next)} />
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"><p className="font-bold text-ink dark:text-white">Store standards</p><div className="mt-3 space-y-2">{["Invoices and customer accounts", "Download logs and access control", "Payment-ready checkout flow"].map((item) => <p key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> {item}</p>)}</div></div>
        </aside>
      </section>
    </main>
  );
}

function filterProducts(products: LibraryProduct[], input: { query: string; category: string; type: string; difficulty: string; sort: string }) {
  const q = input.query.trim().toLowerCase();
  return products.filter((product) => (!q || [product.title, product.subtitle, product.author, product.isbn, product.category, product.collection, product.series, product.publisher, product.tags.join(" ")].join(" ").toLowerCase().includes(q)) && (!input.category || product.category === input.category) && (!input.type || product.productType === input.type) && (!input.difficulty || product.difficulty === input.difficulty)).sort((a, b) => input.sort === "price-asc" ? a.price - b.price : input.sort === "highest-rated" ? b.rating - a.rating : input.sort === "most-downloaded" ? b.downloadCount - a.downloadCount : input.sort === "best-selling" ? Number(b.bestSeller) - Number(a.bestSeller) || b.downloadCount - a.downloadCount : new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

function HeroProduct({ product, quantity, onAdd }: { product: LibraryProduct; quantity: number; onAdd: (product: LibraryProduct) => void }) {
  return <div className="grid gap-4 rounded-lg border border-slate-200 bg-[#f8faf8] p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[9rem_minmax(0,1fr)]"><Cover product={product} compact /><div className="min-w-0 self-center"><p className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-300">Editor's choice</p><Link href={`/library/${product.slug}`} className="mt-2 block text-2xl font-semibold leading-tight text-ink hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300">{product.title}</Link><p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{product.shortDescription}</p><p className="mt-4 text-2xl font-black text-ink dark:text-white">USD {product.price.toFixed(2)}</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><Button onClick={() => onAdd(product)}><ShoppingCart className="size-4" /> {quantity ? `In bag (${quantity})` : "Add to cart"}</Button><Link href={`/library/${product.slug}`} className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white">View details</Link></div></div></div>;
}

function Shelf({ title, products, onAdd, quantityFor }: { title: string; products: LibraryProduct[]; onAdd: (product: LibraryProduct) => void; quantityFor: (id: string) => number }) {
  if (!products.length) return null;
  return <section className="space-y-4"><div className="flex items-end justify-between gap-4"><h2 className="text-2xl font-semibold tracking-normal text-ink dark:text-white">{title}</h2><Link href="#library-products" className="hidden items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-300 sm:inline-flex">View all <ArrowRight className="size-4" /></Link></div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{products.slice(0, 3).map((product) => <ProductCard key={product.id} product={product} quantity={quantityFor(product.id)} onAdd={onAdd} />)}</div></section>;
}

function ProductCard({ product, quantity, onAdd }: { product: LibraryProduct; quantity: number; onAdd: (product: LibraryProduct) => void }) {
  return <article className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"><Cover product={product} /><div className="flex min-w-0 flex-col p-4"><p className="text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{product.productType.replace(/_/g, " ")}</p><Link href={`/library/${product.slug}`} className="mt-1 line-clamp-2 text-lg font-semibold leading-snug text-ink hover:text-emerald-700 dark:text-white">{product.title}</Link><p className="mt-1 text-sm text-slate-500">{product.author}</p><p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{product.shortDescription}</p><div className="mt-4 flex items-center justify-between gap-3"><span className="flex items-center gap-1 text-sm text-amber-500"><Star className="size-4 fill-current" /><span className="font-bold text-slate-700 dark:text-slate-200">{product.rating || "New"}</span></span><p className="text-lg font-black text-ink dark:text-white">USD {product.price.toFixed(2)}</p></div><div className="mt-4 grid grid-cols-[1fr_auto] gap-2"><Button onClick={() => onAdd(product)} disabled={product.comingSoon && !product.preorder}><ShoppingCart className="size-4" /> {quantity ? `In bag (${quantity})` : product.preorder ? "Pre-order" : "Add"}</Button><Link href={`/library/${product.slug}`} className="inline-flex size-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-emerald-500 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-300" aria-label={`View ${product.title}`}><ArrowRight className="size-4" /></Link></div></div></article>;
}

function Cover({ product, compact }: { product: LibraryProduct; compact?: boolean }) {
  return <Link href={`/library/${product.slug}`} className={cn("relative block overflow-hidden bg-[#eef2ef] dark:bg-slate-950", compact ? "mx-auto aspect-[3/4] w-full max-w-[10rem] rounded-lg shadow-sm" : "aspect-[4/3]")}><Image src={product.gallery[0]?.url ?? "/images/academy/agent-academy-hero.png"} alt={product.title} fill className="object-cover transition duration-500 group-hover:scale-[1.03]" sizes="(min-width: 1024px) 340px, 100vw" /></Link>;
}

function CartPanel({ cart, total, currency, onCart }: { cart: LibraryCartLine[]; total: number; currency: string; onCart: (cart: LibraryCartLine[]) => void }) {
  return <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="border-b border-slate-200 p-4 dark:border-slate-800"><p className="flex items-center gap-2 text-sm font-bold text-ink dark:text-white"><ShoppingBag className="size-4" /> Library Bag</p><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Checkout, invoices and secure delivery.</p></div><div className="space-y-3 p-4">{cart.length ? cart.map((line) => <div key={line.productId} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="line-clamp-2 font-bold text-ink dark:text-white">{line.title}</p><p className="text-slate-500">Qty {line.quantity}</p></div><p className="font-black">{line.currency} {(line.price * line.quantity).toFixed(2)}</p></div><div className="mt-3 flex items-center justify-between gap-3"><div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700"><button type="button" onClick={() => onCart(cart.map((item) => item.productId === line.productId ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item))} className="grid size-8 place-items-center text-slate-500 hover:text-emerald-700" aria-label="Decrease quantity"><Minus className="size-3.5" /></button><span className="w-8 text-center text-xs font-black">{line.quantity}</span><button type="button" onClick={() => onCart(cart.map((item) => item.productId === line.productId ? { ...item, quantity: item.quantity + 1 } : item))} className="grid size-8 place-items-center text-slate-500 hover:text-emerald-700" aria-label="Increase quantity"><Plus className="size-3.5" /></button></div><button type="button" onClick={() => onCart(cart.filter((item) => item.productId !== line.productId))} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-red-600"><Trash2 className="size-3.5" /> Remove</button></div></div>) : <div className="grid min-h-32 place-items-center rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700"><div><ShoppingCart className="mx-auto mb-2 size-6 text-slate-400" />Add a product to start checkout.</div></div>}<div className="flex items-center justify-between border-t border-slate-200 pt-3 font-black dark:border-slate-700"><span>Total</span><span>{currency} {total.toFixed(2)}</span></div><Link href="/library/checkout" className={cn("inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-bold", cart.length ? "bg-ink text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200" : "pointer-events-none bg-slate-200 text-slate-500 dark:bg-slate-800")}><ShoppingCart className="size-4" /> Checkout</Link></div></div>;
}

function Select({ value, onChange, label, options }: { value: string; onChange: (value: string) => void; label: string; options: string[] }) {
  return <label className="relative"><span className="sr-only">{label}</span><Filter className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 lg:w-44"><option value="">{label}</option>{options.map((option) => <option key={option} value={option}>{option.replace(/_/g, " ")}</option>)}</select></label>;
}

function Proof({ icon: Icon, label }: { icon: typeof ShieldCheck; label: string }) {
  return <div className="rounded-lg border border-slate-200 bg-[#fbfcfb] p-3 dark:border-slate-800 dark:bg-slate-900"><Icon className="size-5 text-emerald-700 dark:text-emerald-300" /><p className="mt-2 text-sm font-bold text-slate-800 dark:text-white">{label}</p></div>;
}
