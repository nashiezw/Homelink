"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Filter, Search, ShoppingCart, SlidersHorizontal, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import type { LibraryProduct } from "@/lib/library/catalog";
import { libraryFacets } from "@/lib/library/catalog";
import { cn } from "@/lib/utils";

type CartLine = { productId: string; title: string; price: number; currency: string; quantity: number };

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
  const [cart, setCart] = useState<CartLine[]>([]);
  const [busy, setBusy] = useState(false);
  const featured = products.find((product) => product.featured) ?? products[0];
  const results = useMemo(
    () => {
      const q = query.trim().toLowerCase();
      return products
        .filter((product) => {
          if (q) {
            const haystack = [product.title, product.subtitle, product.author, product.isbn, product.category, product.collection, product.series, product.publisher, product.tags.join(" ")].join(" ").toLowerCase();
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
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  function addToCart(product: LibraryProduct) {
    setCart((current) => {
      const existing = current.find((line) => line.productId === product.id);
      if (existing) {
        return current.map((line) => line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line);
      }
      return [...current, { productId: product.id, title: product.title, price: product.price, currency: product.currency, quantity: 1 }];
    });
  }

  async function checkout() {
    if (!cart.length) return;
    setBusy(true);
    window.sessionStorage.setItem("houselink_library_cart", JSON.stringify(cart));
    window.location.href = "/library/checkout";
  }

  return (
    <PageShell
      eyebrow="HouseLink Library"
      title="Professional property books, manuals, templates, and digital resources"
      description="A native HouseLink marketplace for real estate learning, legal templates, investment guidance, field tools, and future digital courses."
      highlights={[
        { label: "Products", value: `${products.length}+` },
        { label: "Formats", value: "PDF, ZIP, DOCX" },
        { label: "Secure", value: "Instant access" },
      ]}
      heroAside={<LibraryHeroPreview product={featured} />}
      actions={
        <>
          <Link href="#library-products" className="bg-emerald-600 text-white hover:bg-emerald-500">
            Browse Library
          </Link>
          <Link href="/dashboard/my-library" className="border border-white/20 bg-white/10 text-white hover:bg-white/15">
            My Library
          </Link>
        </>
      }
    >
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div id="library-products" className="min-w-0 space-y-6">
          <div className="surface-panel rounded-lg p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center">
              <label className="relative min-w-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by title, author, ISBN, keyword, category, publisher..."
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <Select value={category} onChange={setCategory} label="Category" options={facets.categories} />
              <Select value={type} onChange={setType} label="Type" options={facets.types} />
              <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                <option value="newest">Newest</option>
                <option value="best-selling">Best selling</option>
                <option value="most-downloaded">Most downloaded</option>
                <option value="highest-rated">Highest rated</option>
                <option value="price-asc">Price: low to high</option>
              </select>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <SlidersHorizontal className="size-4" />
              {facets.difficulties.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setDifficulty(difficulty === item ? "" : item)}
                  className={cn("rounded-full border px-3 py-1.5 font-medium", difficulty === item ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900")}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <CollectionBand title="Featured Books" products={products.filter((product) => product.featured)} onAdd={addToCart} />
          <CollectionBand title="Best Sellers" products={products.filter((product) => product.bestSeller)} onAdd={addToCart} />
          <CollectionBand title="New Releases" products={products.filter((product) => product.newRelease)} onAdd={addToCart} />

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {results.map((product) => (
              <LibraryProductCard key={product.id} product={product} onAdd={addToCart} />
            ))}
          </div>
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-24">
          <div className="surface-panel overflow-hidden rounded-lg">
            <div className="bg-ink p-4 text-white">
              <p className="flex items-center gap-2 text-sm font-semibold"><ShoppingCart className="size-4" /> Library cart</p>
              <p className="mt-1 text-xs text-slate-300">Fast one-page checkout using HouseLink payments.</p>
            </div>
            <div className="space-y-3 p-4">
              {cart.length ? cart.map((line) => (
                <div key={line.productId} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink dark:text-white">{line.title}</p>
                    <p className="text-slate-500">Qty {line.quantity}</p>
                  </div>
                  <p className="font-bold">${line.price * line.quantity}</p>
                </div>
              )) : (
                <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700">Add products to start checkout.</p>
              )}
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 font-bold dark:border-slate-700">
                <span>Total</span>
                <span>USD {cartTotal.toFixed(2)}</span>
              </div>
              <Button className="w-full" disabled={!cart.length || busy} onClick={() => void checkout()}>
                <ShoppingCart className="size-4" />
                {busy ? "Creating order..." : "Checkout"}
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-100">
            <p className="font-semibold">Secure digital delivery</p>
            <ul className="mt-3 space-y-2">
              {["Download limits and expiry controls", "Secure links and tracking", "Manual and gateway payments reused from HouseLink"].map((item) => (
                <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0" /> {item}</li>
              ))}
            </ul>
          </div>
        </aside>
      </section>
    </PageShell>
  );
}

function LibraryHeroPreview({ product }: { product: LibraryProduct }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-900">
        <Image src={product.gallery[0]?.url ?? "/images/academy/agent-academy-hero.png"} alt={product.title} fill className="object-cover opacity-85" sizes="420px" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">{product.collection}</p>
          <p className="mt-1 text-xl font-bold text-white">{product.title}</p>
        </div>
      </div>
    </div>
  );
}

function CollectionBand({ title, products, onAdd }: { title: string; products: LibraryProduct[]; onAdd: (product: LibraryProduct) => void }) {
  if (!products.length) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-ink dark:text-white">{title}</h2>
        <Link href="#library-products" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">View all <ArrowRight className="size-4" /></Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {products.slice(0, 2).map((product) => <LibraryProductCard key={product.id} product={product} onAdd={onAdd} compact />)}
      </div>
    </section>
  );
}

function LibraryProductCard({ product, onAdd, compact }: { product: LibraryProduct; onAdd: (product: LibraryProduct) => void; compact?: boolean }) {
  return (
    <article className="group premium-card overflow-hidden rounded-lg">
      <Link href={`/library/${product.slug}`} className="block">
        <div className={cn("relative overflow-hidden bg-slate-100 dark:bg-slate-900", compact ? "aspect-[16/9]" : "aspect-[4/3]")}>
          <Image src={product.gallery[0]?.url ?? "/images/academy/agent-academy-hero.png"} alt={product.title} fill className="object-cover transition duration-300 group-hover:scale-[1.03]" sizes="(min-width: 1024px) 340px, 100vw" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {product.bestSeller && <Badge>Best seller</Badge>}
            {product.newRelease && <Badge>New</Badge>}
            {product.comingSoon && <Badge>Coming soon</Badge>}
          </div>
        </div>
      </Link>
      <div className="space-y-3 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">{product.productType.replace(/_/g, " ")}</p>
          <Link href={`/library/${product.slug}`} className="mt-1 block text-lg font-semibold leading-snug text-ink hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300">
            {product.title}
          </Link>
          <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{product.shortDescription}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 text-sm text-amber-500">
            <Star className="size-4 fill-current" />
            <span className="font-semibold text-slate-700 dark:text-slate-200">{product.rating || "New"}</span>
            {product.reviewCount > 0 && <span className="text-slate-400">({product.reviewCount})</span>}
          </div>
          <p className="text-lg font-bold text-ink dark:text-white">USD {product.price}</p>
        </div>
        <Button className="w-full" onClick={() => onAdd(product)} disabled={product.comingSoon && !product.preorder}>
          <ShoppingCart className="size-4" />
          {product.preorder ? "Pre-order" : "Add to cart"}
        </Button>
      </div>
    </article>
  );
}

function Select({ value, onChange, label, options }: { value: string; onChange: (value: string) => void; label: string; options: string[] }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <Filter className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-900 lg:w-44">
        <option value="">{label}</option>
        {options.map((option) => <option key={option} value={option}>{option.replace(/_/g, " ")}</option>)}
      </select>
    </label>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-800 shadow-sm">{children}</span>;
}
