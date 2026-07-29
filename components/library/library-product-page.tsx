"use client";

import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Download, Expand, FileText, Heart, Lock, Share2, ShoppingCart, Star, ZoomIn } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { LibraryProduct } from "@/lib/library/catalog";

export function LibraryProductPage({ product, related }: { product: LibraryProduct; related: LibraryProduct[] }) {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <main className="bg-mist dark:bg-slate-950">
      <section className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_28rem] lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
            <div className="space-y-3">
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <Image src={product.gallery[0]?.url ?? "/images/academy/agent-academy-hero.png"} alt={product.title} fill className="object-cover" sizes="360px" priority />
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <button type="button" className="rounded-lg bg-white/90 p-2 text-slate-700 shadow" aria-label="Zoom product image"><ZoomIn className="size-4" /></button>
                  <button type="button" className="rounded-lg bg-white/90 p-2 text-slate-700 shadow" aria-label="Open fullscreen gallery"><Expand className="size-4" /></button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {product.gallery.slice(0, 3).map((item) => (
                  <div key={item.label} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800">
                    <Image src={item.url} alt={item.label} fill className="object-cover" sizes="120px" />
                  </div>
                ))}
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">{product.collection}</p>
              <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-normal text-ink dark:text-white sm:text-4xl">{product.title}</h1>
              <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">{product.subtitle}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <span>By <strong>{product.author}</strong></span>
                <span className="flex items-center gap-1 text-amber-500"><Star className="size-4 fill-current" /> {product.rating || "New"} ({product.reviewCount} reviews)</span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{product.productType.replace(/_/g, " ")}</span>
              </div>
              <p className="mt-6 leading-7 text-slate-700 dark:text-slate-300">{product.description}</p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {product.learningOutcomes.slice(0, 4).map((item) => (
                  <p key={item} className="flex gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> {item}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <aside className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-24">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Price</p>
                <p className="text-3xl font-bold text-ink dark:text-white">USD {product.price.toFixed(2)}</p>
              </div>
              {product.compareAtPrice && <p className="text-sm text-slate-400 line-through">USD {product.compareAtPrice.toFixed(2)}</p>}
            </div>
            <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
              {product.stock === null ? "Unlimited digital delivery" : product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
            </p>
            <div className="mt-4 grid gap-2">
              <Button className="w-full" disabled={product.stock === 0}>
                <ShoppingCart className="size-4" /> {product.preorder ? "Pre-order now" : "Add to cart"}
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => setPreviewOpen(true)}>
                <FileText className="size-4" /> Sample preview
              </Button>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" className="rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700" aria-label="Add to wishlist"><Heart className="mx-auto size-4" /></button>
                <button type="button" className="rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700" aria-label="Compare product">Compare</button>
                <button type="button" className="rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700" aria-label="Share product"><Share2 className="mx-auto size-4" /></button>
              </div>
            </div>
            <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
              {["Secure checkout", "Download tracking", "Invoice and email confirmation", "Protected customer access"].map((item) => (
                <p key={item} className="flex gap-2"><Lock className="mt-0.5 size-4 shrink-0 text-emerald-600" /> {item}</p>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8">
        <div className="space-y-6">
          <Panel title="Table of Contents">
            <ol className="grid gap-2 sm:grid-cols-2">
              {product.tableOfContents.map((item, index) => (
                <li key={item} className="rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                  <span className="mr-2 font-bold text-emerald-700">{index + 1}.</span>{item}
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title="Downloads Included">
            {product.downloads.length ? product.downloads.map((download) => (
              <div key={download.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
                <div>
                  <p className="font-semibold">{download.label}</p>
                  <p className="text-sm text-slate-500">{download.fileType} - {download.size}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-slate-800"><Download className="size-3" /> Secure</span>
              </div>
            )) : <p className="text-sm text-slate-500">Course resources will be released with the product launch.</p>}
          </Panel>
          <Panel title="FAQ">
            {["Can I preview before buying?", "How are downloads protected?", "Can I buy for my team?"].map((question) => (
              <details key={question} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <summary className="cursor-pointer font-semibold">{question}</summary>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Yes. HouseLink Library supports previews, secure delivery, tracked downloads, and admin-managed access policies.</p>
              </details>
            ))}
          </Panel>
        </div>
        <aside className="space-y-4">
          <Panel title="Book Details">
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
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </aside>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <h2 className="mb-4 text-2xl font-semibold text-ink dark:text-white">Related Products</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {related.map((item) => (
            <Link key={item.id} href={`/library/${item.slug}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{item.category}</p>
              <p className="mt-1 font-semibold text-ink dark:text-white">{item.title}</p>
              <p className="mt-2 text-sm text-slate-500">USD {item.price}</p>
            </Link>
          ))}
        </div>
      </section>

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setPreviewOpen(false)}>
          <div className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white dark:bg-slate-950" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <p className="font-semibold">Sample Preview - {product.title}</p>
              <button type="button" onClick={() => setPreviewOpen(false)} className="rounded-lg px-3 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-900">Close</button>
            </div>
            <div className="grid min-h-[32rem] place-items-center bg-slate-100 p-6 dark:bg-slate-900">
              <div className="max-w-2xl rounded-lg bg-white p-8 shadow-xl dark:bg-slate-950">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Preview pages</p>
                <h3 className="mt-2 text-2xl font-semibold">{product.tableOfContents[0]}</h3>
                <p className="mt-4 leading-7 text-slate-600 dark:text-slate-300">{product.description}</p>
                <div className="mt-6 flex items-center gap-3 text-sm text-slate-500">
                  <ZoomIn className="size-4" /> Zoom and fullscreen controls are ready for PDF viewer integration.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 text-lg font-semibold text-ink dark:text-white">{title}</h2>
      {children}
    </section>
  );
}
