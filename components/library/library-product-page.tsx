"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Download,
  Expand,
  FileText,
  Heart,
  Layers3,
  Lock,
  ReceiptText,
  Share2,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Star,
  Users,
  ZoomIn,
} from "lucide-react";
import { useMemo, useState } from "react";
import { BookCover } from "@/components/library/book-cover";
import { Button } from "@/components/ui/button";
import { writeLibraryCart, useLibraryCart } from "@/lib/library/cart-client";
import type { LibraryProduct } from "@/lib/library/catalog";
import { cn } from "@/lib/utils";

export function LibraryProductPage({ product, related }: { product: LibraryProduct; related: LibraryProduct[] }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const { cart, setCart, count } = useLibraryCart();
  const [cartNotice, setCartNotice] = useState("");
  const relatedBundle = useMemo(() => related.slice(0, 2), [related]);
  const bundleTotal = relatedBundle.reduce((sum, item) => sum + item.price, product.price);
  const productQuantity = cart.find((line) => line.productId === product.id)?.quantity ?? 0;

  function addToCart() {
    setCart((current) => {
      const existing = current.find((line) => line.productId === product.id);
      if (existing) return current.map((line) => (line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line));
      return [...current, { productId: product.id, title: product.title, price: product.price, currency: product.currency, quantity: 1 }];
    });
    setCartNotice(`${product.title} is in your Library Bag.`);
    window.setTimeout(() => setCartNotice(""), 2600);
  }

  function buyNow() {
    writeLibraryCart([{ productId: product.id, title: product.title, price: product.price, currency: product.currency, quantity: 1 }]);
    window.location.href = "/library/checkout";
  }

  function addBundle() {
    writeLibraryCart([
      { productId: product.id, title: product.title, price: product.price, currency: product.currency, quantity: 1 },
      ...relatedBundle.map((item) => ({ productId: item.id, title: item.title, price: item.price, currency: item.currency, quantity: 1 })),
    ]);
    window.location.href = "/library/checkout";
  }

  return (
    <main className="bg-[#f6f8f7] text-ink dark:bg-slate-950 dark:text-white">
      <section className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <Link href="/library" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300">
            <ArrowLeft className="size-4" /> Back to Library
          </Link>
          <Link href="/library/checkout" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
            <ShoppingBag className="size-4" /> {count}
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-[88rem] gap-7 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:px-8 lg:py-10">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_26px_90px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-7 p-4 sm:p-6 xl:grid-cols-[minmax(18rem,32rem)_minmax(0,1fr)] xl:items-start">
            <div className="space-y-4">
              <div className="relative mx-auto max-w-[30rem] xl:mx-0">
                <BookCover product={product} className="w-full rounded-xl" priority />
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <button type="button" className="rounded-lg bg-white/95 p-2 text-slate-800 shadow-sm" aria-label="Zoom product image">
                    <ZoomIn className="size-4" />
                  </button>
                  <button type="button" className="rounded-lg bg-white/95 p-2 text-slate-800 shadow-sm" aria-label="Open fullscreen gallery">
                    <Expand className="size-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[product.productType.replace(/_/g, " "), product.category, product.difficulty].map((item, index) => (
                  <button key={`${item}-${index}`} type="button" onClick={() => setGalleryIndex(index)} className={cn("min-h-14 rounded-xl border bg-white px-3 py-2 text-center text-xs font-black leading-tight text-slate-700 shadow-sm dark:bg-slate-950 dark:text-slate-200", galleryIndex === index ? "border-emerald-600 ring-2 ring-emerald-600/20" : "border-slate-200 dark:border-slate-800")}>
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">{product.collection}</p>
              <h1 className="mt-3 max-w-4xl text-4xl font-black leading-[0.98] tracking-tight text-ink sm:text-5xl dark:text-white">{product.title}</h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">{product.subtitle}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            <span>
              By <strong className="text-ink dark:text-white">{product.author}</strong>
            </span>
            <span className="flex items-center gap-1 text-amber-500">
              <Star className="size-4 fill-current" /> {product.rating || "New"} ({product.reviewCount} reviews)
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-bold dark:border-slate-700 dark:bg-slate-900">{product.productType.replace(/_/g, " ")}</span>
          </div>

              <div className="mt-7 grid max-w-3xl gap-3 sm:grid-cols-3">
                <Proof icon={ShieldCheck} label="Secure checkout" />
                <Proof icon={ReceiptText} label="Invoice ready" />
                <Proof icon={Download} label="Tracked access" />
              </div>
            </div>
          </div>

          <section className="border-t border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/35 sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink dark:text-white">
              <Layers3 className="size-5 text-emerald-700 dark:text-emerald-300" /> What you get
            </h2>
            <p className="mt-4 leading-7 text-slate-700 dark:text-slate-300">{product.description}</p>
            <div className="mt-5 grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {product.learningOutcomes.slice(0, 6).map((item) => (
                <p key={item} className="flex h-full gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm leading-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> {item}
                </p>
              ))}
            </div>
          </section>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-bold uppercase text-slate-500">HouseLink price</p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <p className="text-4xl font-black text-ink dark:text-white">USD {product.price.toFixed(2)}</p>
              {product.compareAtPrice && <p className="pb-1 text-sm text-slate-400 line-through">USD {product.compareAtPrice.toFixed(2)}</p>}
            </div>
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              {product.stock === null ? "Unlimited digital delivery" : product.stock > 0 ? `${product.stock} printed copies available` : "Out of stock"}
            </p>
            <div className="mt-5 grid gap-2">
              <Button disabled={product.stock === 0} onClick={buyNow}>
                <ShoppingCart className="size-4" /> {product.preorder ? "Pre-order now" : "Buy now"}
              </Button>
              <Button variant="secondary" disabled={product.stock === 0} onClick={addToCart}>
                <ShoppingBag className="size-4" /> {productQuantity ? `In bag (${productQuantity})` : "Add to cart"}
              </Button>
              <Button variant="secondary" onClick={() => setPreviewOpen(true)}>
                <FileText className="size-4" /> Read sample
              </Button>
            </div>
            {cartNotice && (
              <p role="status" aria-live="polite" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
                <CheckCircle2 className="mr-2 inline size-4" /> {cartNotice} <Link href="/library/checkout" className="underline underline-offset-4">Checkout</Link>
              </p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" aria-label="Add to wishlist">
                <Heart className="size-4" /> Wishlist
              </button>
              <button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" aria-label="Share product">
                <Share2 className="size-4" /> Share
              </button>
            </div>
            <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
              {["Native HouseLink checkout", "Protected customer access", "Download limits and license keys"].map((item) => (
                <p key={item} className="flex gap-2">
                  <Lock className="mt-0.5 size-4 shrink-0 text-emerald-600" /> {item}
                </p>
              ))}
            </div>
          </div>
          <Panel title="Book Details" icon={ReceiptText}>
            <dl className="space-y-3 text-sm">
              {[
                ["Publisher", product.publisher],
                ["Edition", product.edition],
                ["ISBN", product.isbn ?? "Digital SKU"],
                ["Language", product.language],
                ["Pages", product.pages?.toString() ?? "Digital course"],
                ["SKU", product.sku],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 dark:border-slate-800">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="text-right font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </aside>
      </section>

      <section className="mx-auto grid max-w-[88rem] gap-7 px-4 pb-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:px-8">
        <div className="space-y-7">
          <Panel title="Sample Preview" icon={BookOpen} action={<Button variant="secondary" onClick={() => setPreviewOpen(true)}><FileText className="size-4" /> Open reader</Button>}>
            <div className="grid gap-5 md:grid-cols-[12rem_minmax(0,1fr)] md:items-center">
              <BookCover product={product} className="w-full rounded-xl" />
              <div>
                <p className="text-xl font-black">Preview selected pages before purchase.</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">The reader supports page previews, zoom, fullscreen controls, and future PDF page extraction from admin uploads.</p>
              </div>
            </div>
          </Panel>

          <Panel title="Table of Contents" icon={FileText}>
            <ol className="grid gap-2 sm:grid-cols-2">
              {product.tableOfContents.map((item, index) => (
                <li key={item} className="flex min-h-14 items-center rounded-xl border border-slate-200 bg-[#fbfcfb] p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
                  <span className="mr-2 font-black text-emerald-700">{String(index + 1).padStart(2, "0")}</span>
                  {item}
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Downloads Included" icon={Download}>
            {product.downloads.length ? (
              product.downloads.map((download) => (
                <div key={download.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
                  <div>
                    <p className="font-semibold">{download.label}</p>
                    <p className="text-sm text-slate-500">
                      {download.fileType} - {download.size}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                    <Lock className="size-3" /> Secure
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Course resources will be released with the product launch.</p>
            )}
          </Panel>

          {relatedBundle.length > 0 && (
            <Panel title="Frequently Bought Together" icon={ShoppingCart} action={<Button onClick={addBundle}>Buy bundle</Button>}>
              <div className="grid items-stretch gap-3 md:grid-cols-3">
                {[product, ...relatedBundle].map((item) => (
                  <Link key={item.id} href={`/library/${item.slug}`} className="flex h-full flex-col rounded-xl border border-slate-200 bg-[#fbfcfb] p-3 transition hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">{item.productType.replace(/_/g, " ")}</p>
                    <p className="mt-1 line-clamp-2 font-semibold">{item.title}</p>
                    <p className="mt-auto pt-3 text-sm font-black">USD {item.price.toFixed(2)}</p>
                  </Link>
                ))}
              </div>
              <p className="mt-4 text-right text-lg font-black">Bundle total: USD {bundleTotal.toFixed(2)}</p>
            </Panel>
          )}
        </div>

        <aside className="space-y-4">
          <Panel title="Who This Is For" icon={Users}>
            <div className="flex flex-wrap gap-2">
              {product.whoThisIsFor.map((item) => (
                <span key={item} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold dark:bg-slate-800">
                  {item}
                </span>
              ))}
            </div>
          </Panel>
        </aside>
      </section>

      <section className="mx-auto max-w-[88rem] px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase text-emerald-700 dark:text-emerald-300">Keep Building</p>
            <h2 className="text-3xl font-black text-ink dark:text-white">Related Products</h2>
          </div>
          <Link href="/library" className="hidden items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-300 sm:inline-flex">
            Browse all <ArrowLeft className="size-4 rotate-180" />
          </Link>
        </div>
        <div className="grid items-stretch gap-4 md:grid-cols-3">
          {related.map((item) => (
            <Link key={item.id} href={`/library/${item.slug}`} className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <BookCover product={item} className="mx-auto w-full max-w-[12rem]" />
              <div className="flex flex-1 flex-col p-4">
                <p className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-300">{item.category}</p>
                <p className="mt-1 line-clamp-2 font-black text-ink dark:text-white">{item.title}</p>
                <p className="mt-auto pt-3 text-sm font-black text-slate-700 dark:text-slate-200">USD {item.price.toFixed(2)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={() => setPreviewOpen(false)}>
          <div className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-slate-950" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <p className="font-semibold">Sample Reader - {product.title}</p>
              <button type="button" onClick={() => setPreviewOpen(false)} className="rounded-lg px-3 py-1 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-900">
                Close
              </button>
            </div>
            <div className="grid min-h-[34rem] place-items-center bg-slate-100 p-5 dark:bg-slate-900">
              <div className="grid w-full max-w-4xl gap-5 md:grid-cols-[15rem_minmax(0,1fr)]">
                <BookCover product={product} />
                <div className="rounded-lg bg-white p-7 shadow-xl dark:bg-slate-950">
                  <p className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-300">Preview pages</p>
                  <h3 className="mt-2 text-3xl font-black">{product.tableOfContents[0]}</h3>
                  <p className="mt-4 leading-8 text-slate-600 dark:text-slate-300">{product.description}</p>
                  <div className="mt-6 grid gap-2 sm:grid-cols-2">
                    {product.tableOfContents.slice(1, 5).map((item) => (
                      <p key={item} className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
                        {item}
                      </p>
                    ))}
                  </div>
                  <div className="mt-6 flex items-center gap-3 text-sm font-semibold text-slate-500">
                    <ZoomIn className="size-4" /> Zoom and fullscreen controls are ready for generated PDF preview pages.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Proof({ icon: Icon, label }: { icon: typeof ShieldCheck; label: string }) {
  return (
    <div className="flex min-h-24 flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <Icon className="size-5 text-emerald-700 dark:text-emerald-300" />
      <p className="mt-2 text-sm font-bold text-slate-800 dark:text-white">{label}</p>
    </div>
  );
}

function Panel({ title, icon: Icon, action, children }: { title: string; icon: typeof FileText; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-ink dark:text-white">
          <Icon className="size-5 text-emerald-700 dark:text-emerald-300" /> {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
