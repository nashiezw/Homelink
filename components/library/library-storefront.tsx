"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Download, Filter, GraduationCap, LibraryBig, Minus, Plus, Search, ShieldCheck, ShoppingBag, ShoppingCart, SlidersHorizontal, Sparkles, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLibraryCart, type LibraryCartLine } from "@/lib/library/cart-client";
import type { LibraryProduct } from "@/lib/library/catalog";
import { libraryFacets } from "@/lib/library/catalog";
import { cn } from "@/lib/utils";

export function LibraryStorefront({ products }: { products: LibraryProduct[] }) {
  const facets = products.length
    ? {
        categories: Array.from(new Set(products.map((p) => p.category))).sort(),
        authors: Array.from(new Set(products.map((p) => p.author))).sort(),
        types: Array.from(new Set(products.map((p) => p.productType))).sort(),
        difficulties: Array.from(new Set(products.map((p) => p.difficulty))).sort(),
      }
    : libraryFacets();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [sort, setSort] = useState("newest");
  const { cart, setCart, total: cartTotal, currency: primaryCurrency } = useLibraryCart();
  const [busy, setBusy] = useState(false);
  const featured = products.find((product) => product.editorsChoice) ?? products.find((product) => product.featured) ?? products[0];
  const bestSellers = products.filter((product) => product.bestSeller);
  const newReleases = products.filter((product) => product.newRelease);
  const toolkits = products.filter((product) => ["TOOLKIT", "FORMS", "TEMPLATE", "BUNDLE"].includes(product.productType));
  const results = useMemo(
    () => {
      const q = query.trim().toLowerCase();
      return products
        .filter((product) => {
          if (q) {
            const haystack = [product.title, product.subtitle, product.author, product.isbn, product.category, product.collection, product.series, product.publisher, product.tags.join(" ")]
              .join(" ")
              .toLowerCase();
            if (!haystack.includes(q)) return false;
          }
          if (category && product.category !== category) return false;
          if (type && product.productType !== type) return false;
          if (difficulty && product.difficulty !== difficulty) return false;
          return true;
        })
        .sort((a, b) => {
          if (sort === "price-asc") return a.price - b.price;
          if (sort === "highest-rated") return b.rating - a.rating;
          if (sort === "most-downloaded") return b.downloadCount - a.downloadCount;
          if (sort === "best-selling") return Number(b.bestSeller) - Number(a.bestSeller) || b.downloadCount - a.downloadCount;
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        });
    },
    [category, difficulty, products, query, sort, type],
  );
  function addToCart(product: LibraryProduct) {
    setCart((current) => {
      const existing = current.find((line) => line.productId === product.id);
      if (existing) return current.map((line) => line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line);
      return [...current, { productId: product.id, title: product.title, price: product.price, currency: product.currency, quantity: 1 }];
    });
  }

  function removeFromCart(productId: string) {
    setCart((current) => current.filter((line) => line.productId !== productId));
  }

  function updateQuantity(productId: string, quantity: number) {
    setCart((current) => current.map((line) => line.productId === productId ? { ...line, quantity: Math.max(1, quantity) } : line));
  }

  async function checkout() {
    if (!cart.length) return;
    setBusy(true);
    window.location.href = "/library/checkout";
  }

  return (
    <main className="bg-[#f5f7f4] text-ink dark:bg-slate-950 dark:text-white">
      <section className="relative overflow-hidden border-b border-emerald-900/15 bg-ink text-white">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:46px_46px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(16,185,129,0.18),transparent_30%),linear-gradient(135deg,rgba(6,78,59,0.58),rgba(15,23,42,0.96)_52%,rgba(3,7,18,1))]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_31rem] lg:items-center lg:px-8 lg:py-14">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/25 bg-white/10 px-3 py-1 text-xs font-bold uppercase text-emerald-100 backdrop-blur">
              <LibraryBig className="size-4" />
              HouseLink Library
            </div>
            <h1 className="mt-5 max-w-4xl text-[2.6rem] font-semibold leading-[1.02] tracking-normal text-white sm:text-6xl lg:text-[4.8rem]">
              The professional property bookshelf for Zimbabwe.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
              Books, manuals, legal packs, templates, toolkits, and course-ready resources built directly into the HouseLink ecosystem.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="#library-products" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 text-sm font-bold text-slate-950 shadow-xl shadow-emerald-950/30 transition hover:bg-emerald-400">
                Explore shelves <ArrowRight className="size-4" />
              </Link>
              <Link href="/dashboard/my-library" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15">
                My Library <BookOpen className="size-4" />
              </Link>
            </div>
            <div className="mt-8 grid max-w-3xl gap-2 sm:grid-cols-3">
              <HeroProof icon={ShieldCheck} label="Secure delivery" value="Tracked links" />
              <HeroProof icon={Download} label="Formats" value="PDF, ZIP, DOCX" />
              <HeroProof icon={GraduationCap} label="Future-ready" value="Courses + Academy" />
            </div>
          </div>
          {featured && <FeaturedHeroProduct product={featured} onAdd={addToCart} />}
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center lg:px-8">
          <label className="relative min-w-0">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, author, ISBN, contract, course, manual..."
              className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <Select value={category} onChange={setCategory} label="Category" options={facets.categories} />
          <Select value={type} onChange={setType} label="Format" options={facets.types} />
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-12 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
            <option value="newest">Newest</option>
            <option value="best-selling">Best selling</option>
            <option value="most-downloaded">Most downloaded</option>
            <option value="highest-rated">Highest rated</option>
            <option value="price-asc">Price: low to high</option>
          </select>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-7 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8">
        <div id="library-products" className="min-w-0 space-y-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200"><SlidersHorizontal className="size-4" /> Difficulty</span>
            {facets.difficulties.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setDifficulty(difficulty === item ? "" : item)}
                className={cn("rounded-full border px-3 py-1.5 text-sm font-semibold transition", difficulty === item ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300")}
              >
                {item}
              </button>
            ))}
          </div>

          <Shelf title="Editor's Desk" subtitle="Flagship resources selected for serious property professionals." products={products.filter((product) => product.editorsChoice || product.featured)} onAdd={addToCart} layout="feature" />
          <Shelf title="Best Sellers" subtitle="The manuals and packs customers keep coming back for." products={bestSellers} onAdd={addToCart} />
          <Shelf title="Templates, Forms and Toolkits" subtitle="Downloadable operating systems for agents, landlords, and property managers." products={toolkits} onAdd={addToCart} />
          <Shelf title="New Releases" subtitle="Recently published and upcoming HouseLink Library resources." products={newReleases} onAdd={addToCart} />

          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase text-emerald-700 dark:text-emerald-300">Complete Catalogue</p>
                <h2 className="text-2xl font-semibold tracking-normal text-ink dark:text-white">{results.length} Library products</h2>
              </div>
              <p className="hidden max-w-sm text-right text-sm leading-6 text-slate-500 sm:block">Filtered across books, manuals, contracts, courses, bundles, templates, and future digital products.</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {results.map((product) => (
                <LibraryProductCard key={product.id} product={product} onAdd={addToCart} />
              ))}
            </div>
          </section>
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-24">
          <CartPanel cart={cart} total={cartTotal} currency={primaryCurrency} busy={busy} onRemove={removeFromCart} onQuantity={updateQuantity} onCheckout={() => void checkout()} />
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-100">
            <p className="font-bold">Built for professional publishing</p>
            <div className="mt-3 space-y-2">
              {["Secure links, license keys and download logs", "Invoices, fulfilment, coupons and tax settings", "Native HouseLink payments and customer accounts"].map((item) => (
                <p key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0" /> {item}</p>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function FeaturedHeroProduct({ product, onAdd }: { product: LibraryProduct; onAdd: (product: LibraryProduct) => void }) {
  return (
    <div className="relative">
      <div className="grid gap-4 rounded-lg border border-white/15 bg-white/[0.08] p-4 shadow-2xl shadow-slate-950/40 backdrop-blur sm:grid-cols-[12rem_minmax(0,1fr)]">
        <Link href={`/library/${product.slug}`} className="group relative mx-auto aspect-[3/4] w-full max-w-[13rem] overflow-hidden rounded-lg bg-slate-900 shadow-2xl">
          <Image src={product.gallery[0]?.url ?? "/images/academy/agent-academy-hero.png"} alt={product.title} fill className="object-cover transition duration-500 group-hover:scale-[1.04]" sizes="220px" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" />
        </Link>
        <div className="min-w-0 self-center">
          <p className="inline-flex items-center gap-1 rounded-full bg-emerald-300 px-2.5 py-1 text-xs font-black uppercase text-slate-950"><Sparkles className="size-3" /> Editor's choice</p>
          <Link href={`/library/${product.slug}`} className="mt-3 block text-2xl font-semibold leading-tight text-white hover:text-emerald-200">{product.title}</Link>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-300">{product.shortDescription}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-2xl font-black text-white">USD {product.price.toFixed(2)}</span>
            {product.compareAtPrice && <span className="text-sm text-slate-400 line-through">USD {product.compareAtPrice.toFixed(2)}</span>}
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => onAdd(product)}><ShoppingCart className="size-4" /> Add to cart</Button>
            <Link href={`/library/${product.slug}`} className="inline-flex h-10 items-center justify-center rounded-lg border border-white/20 px-4 text-sm font-bold text-white hover:bg-white/10">View details</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroProof({ icon: Icon, label, value }: { icon: typeof ShieldCheck; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/12 bg-white/10 p-3 backdrop-blur">
      <Icon className="size-5 text-emerald-300" />
      <p className="mt-2 text-sm font-bold text-white">{value}</p>
      <p className="text-xs text-slate-300">{label}</p>
    </div>
  );
}

function Shelf({ title, subtitle, products, onAdd, layout }: { title: string; subtitle: string; products: LibraryProduct[]; onAdd: (product: LibraryProduct) => void; layout?: "feature" }) {
  if (!products.length) return null;
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-normal text-ink dark:text-white">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">{subtitle}</p>
        </div>
        <Link href="#library-products" className="hidden items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 sm:inline-flex">View all <ArrowRight className="size-4" /></Link>
      </div>
      <div className={cn("grid gap-5", layout === "feature" ? "lg:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3")}>
        {products.slice(0, layout === "feature" ? 2 : 3).map((product) => <LibraryProductCard key={product.id} product={product} onAdd={onAdd} wide={layout === "feature"} />)}
      </div>
    </section>
  );
}

function LibraryProductCard({ product, onAdd, wide }: { product: LibraryProduct; onAdd: (product: LibraryProduct) => void; wide?: boolean }) {
  return (
    <article className={cn("group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900", wide && "sm:grid sm:grid-cols-[10rem_minmax(0,1fr)]")}>
      <Link href={`/library/${product.slug}`} className={cn("relative block overflow-hidden bg-slate-100 dark:bg-slate-950", wide ? "aspect-[3/4] sm:aspect-auto" : "aspect-[4/3]")}>
        <Image src={product.gallery[0]?.url ?? "/images/academy/agent-academy-hero.png"} alt={product.title} fill className="object-cover transition duration-500 group-hover:scale-[1.04]" sizes="(min-width: 1024px) 340px, 100vw" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/70 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {product.bestSeller && <Badge>Best seller</Badge>}
          {product.newRelease && <Badge>New</Badge>}
          {product.editorsChoice && <Badge>Editor's choice</Badge>}
        </div>
      </Link>
      <div className="flex min-w-0 flex-col p-4">
        <p className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-300">{product.productType.replace(/_/g, " ")}</p>
        <Link href={`/library/${product.slug}`} className="mt-1 line-clamp-2 text-lg font-semibold leading-snug text-ink hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300">{product.title}</Link>
        <p className="mt-1 text-sm text-slate-500">{product.author}</p>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{product.shortDescription}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 text-sm text-amber-500">
            <Star className="size-4 fill-current" />
            <span className="font-bold text-slate-700 dark:text-slate-200">{product.rating || "New"}</span>
          </div>
          <p className="text-lg font-black text-ink dark:text-white">USD {product.price}</p>
        </div>
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <Button onClick={() => onAdd(product)} disabled={product.comingSoon && !product.preorder}>
            <ShoppingCart className="size-4" />
            {product.preorder ? "Pre-order" : "Add"}
          </Button>
          <Link href={`/library/${product.slug}`} className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-emerald-500 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-300" aria-label={`View ${product.title}`}>
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function CartPanel({ cart, total, currency, busy, onRemove, onQuantity, onCheckout }: { cart: LibraryCartLine[]; total: number; currency: string; busy: boolean; onRemove: (productId: string) => void; onQuantity: (productId: string, quantity: number) => void; onCheckout: () => void }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <div className="bg-ink p-4 text-white">
        <p className="flex items-center gap-2 text-sm font-bold"><ShoppingBag className="size-4" /> Library Bag</p>
        <p className="mt-1 text-xs leading-5 text-slate-300">Native checkout, coupons, invoices, and secure delivery.</p>
      </div>
      <div className="space-y-3 p-4">
        {cart.length ? cart.map((line) => (
          <div key={line.productId} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="line-clamp-2 font-bold text-ink dark:text-white">{line.title}</p>
                <p className="text-slate-500">Qty {line.quantity}</p>
              </div>
              <p className="font-black">{line.currency} {(line.price * line.quantity).toFixed(2)}</p>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700">
                <button type="button" onClick={() => onQuantity(line.productId, line.quantity - 1)} className="grid size-8 place-items-center text-slate-500 hover:text-emerald-700" aria-label="Decrease quantity"><Minus className="size-3.5" /></button>
                <span className="w-8 text-center text-xs font-black">{line.quantity}</span>
                <button type="button" onClick={() => onQuantity(line.productId, line.quantity + 1)} className="grid size-8 place-items-center text-slate-500 hover:text-emerald-700" aria-label="Increase quantity"><Plus className="size-3.5" /></button>
              </div>
              <button type="button" onClick={() => onRemove(line.productId)} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-red-600">
                <Trash2 className="size-3.5" /> Remove
              </button>
            </div>
          </div>
        )) : (
          <div className="grid min-h-32 place-items-center rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700">
            <div>
              <ShoppingCart className="mx-auto mb-2 size-6 text-slate-400" />
              Add a book, manual, template, or toolkit.
            </div>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-200 pt-3 font-black dark:border-slate-700">
          <span>Total</span>
          <span>{currency} {total.toFixed(2)}</span>
        </div>
        <Button className="w-full" disabled={!cart.length || busy} onClick={onCheckout}>
          <ShoppingCart className="size-4" />
          {busy ? "Opening checkout..." : "Checkout"}
        </Button>
      </div>
    </div>
  );
}

function Select({ value, onChange, label, options }: { value: string; onChange: (value: string) => void; label: string; options: string[] }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <Filter className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 lg:w-44">
        <option value="">{label}</option>
        {options.map((option) => <option key={option} value={option}>{option.replace(/_/g, " ")}</option>)}
      </select>
    </label>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-800 shadow-sm">{children}</span>;
}
