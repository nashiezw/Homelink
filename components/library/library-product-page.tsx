"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BookCover } from "@/components/library/book-cover";
import { LibraryCartFab } from "@/components/library/library-cart-fab";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import { notifyLibraryCartAdded, writeLibraryCart, useLibraryCart } from "@/lib/library/cart-client";
import { enabledLibraryFormats, type LibraryProduct, type LibraryProductFormat } from "@/lib/library/catalog";
import { cn } from "@/lib/utils";

export function LibraryProductPage({
  product,
  related,
  reviews: initialReviews = [],
}: {
  product: LibraryProduct;
  related: LibraryProduct[];
  reviews?: Array<{
    id: string;
    rating: number;
    title: string | null;
    body: string | null;
    featured: boolean;
    verified: boolean;
    createdAt: string;
    authorName: string;
  }>;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxZoomed, setLightboxZoomed] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const { showToast } = useApp();
  const formats = useMemo(() => enabledLibraryFormats(product), [product]);
  const [selectedFormatId, setSelectedFormatId] = useState(formats[0]?.id ?? "primary");
  const { cart, setCart, count } = useLibraryCart();
  const [wished, setWished] = useState(false);
  const [wishBusy, setWishBusy] = useState(false);
  const [shareNotice, setShareNotice] = useState("");
  const [reviews, setReviews] = useState(initialReviews);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: "", body: "" });
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewNotice, setReviewNotice] = useState("");
  const relatedBundle = useMemo(() => related.slice(0, 2), [related]);
  const selectedFormat = formats.find((format) => format.id === selectedFormatId) ?? formats[0];
  const bundleTotal = relatedBundle.reduce((sum, item) => sum + item.price, selectedFormat?.price ?? product.price);
  const productQuantity = cart
    .filter((line) => line.productId === product.id && (!line.formatId || line.formatId === selectedFormat?.id))
    .reduce((sum, line) => sum + line.quantity, 0);
  const galleryImages = useMemo(
    () => product.gallery.filter((item) => item.kind !== "video" && Boolean(item.url)),
    [product.gallery],
  );
  const activeGalleryImage = galleryImages[galleryIndex] ?? galleryImages[0];
  const isPrinted = selectedFormat?.type === "PRINTED_BOOK";
  const outOfStock = Boolean(isPrinted && product.stock === 0);
  const printStockLabel =
    product.stock == null
      ? "Printed stock available"
      : product.stock > 0
        ? `${product.stock} printed ${product.stock === 1 ? "copy" : "copies"} in stock`
        : "Printed format out of stock";
  const sampleFile = useMemo(
    () =>
      product.downloads.find((file) => file.previewable && Boolean(file.fileUrl) && (file.fileType.toUpperCase() === "PDF" || file.fileName?.toLowerCase().endsWith(".pdf")))
      ?? product.downloads.find((file) => file.previewable && Boolean(file.fileUrl))
      ?? null,
    [product.downloads],
  );
  const sampleUrl = sampleFile ? `/api/v1/library/products/${encodeURIComponent(product.slug)}/sample` : null;

  function openLightbox(options?: { zoomed?: boolean }) {
    if (!activeGalleryImage?.url && !galleryImages[0]?.url) return;
    setLightboxZoomed(Boolean(options?.zoomed));
    setLightboxOpen(true);
  }

  function closeLightbox() {
    setLightboxOpen(false);
    setLightboxZoomed(false);
  }

  function stepGallery(delta: number) {
    if (!galleryImages.length) return;
    setGalleryIndex((current) => (current + delta + galleryImages.length) % galleryImages.length);
  }

  useEffect(() => {
    void apiFetch<{ wished: boolean }>(`/api/v1/library/wishlist?productId=${encodeURIComponent(product.id)}`).then((result) => {
      if (result.data) setWished(result.data.wished);
    });
  }, [product.id]);

  useEffect(() => {
    if (!lightboxOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") stepGallery(-1);
      if (event.key === "ArrowRight") stepGallery(1);
      if (event.key === "+" || event.key === "=") setLightboxZoomed(true);
      if (event.key === "-") setLightboxZoomed(false);
    }
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [lightboxOpen, galleryImages.length]);

  async function toggleWishlist() {
    setWishBusy(true);
    const result = await apiFetch<{ wished: boolean }>("/api/v1/library/wishlist", {
      method: "POST",
      body: JSON.stringify({ productId: product.id }),
    });
    setWishBusy(false);
    if (result.error) {
      showToast(result.error.message || "Sign in to save products to your wishlist.", "error");
      return;
    }
    if (result.data) {
      setWished(result.data.wished);
      showToast(result.data.wished ? "Saved to your wishlist." : "Removed from your wishlist.", "success");
    }
  }

  async function shareProduct() {
    const url = typeof window !== "undefined" ? window.location.href : `/library/${product.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.title, text: product.shortDescription, url });
        setShareNotice("Shared.");
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareNotice("Link copied.");
    } catch {
      setShareNotice("Could not share right now.");
    }
    window.setTimeout(() => setShareNotice(""), 2200);
  }

  async function submitReview() {
    setReviewBusy(true);
    setReviewNotice("");
    const result = await apiFetch<{ review?: { id: string } }>("/api/v1/library/reviews", {
      method: "POST",
      body: JSON.stringify({
        productId: product.id,
        rating: reviewForm.rating,
        title: reviewForm.title,
        body: reviewForm.body,
      }),
    });
    setReviewBusy(false);
    if (result.error) {
      setReviewNotice(result.error.message || "Could not submit review.");
      return;
    }
    setReviewForm({ rating: 5, title: "", body: "" });
    setReviewNotice("Thanks — your review was submitted for moderation.");
    const refreshed = await apiFetch<{ reviews: typeof reviews }>(`/api/v1/library/reviews?productId=${encodeURIComponent(product.id)}`);
    if (refreshed.data?.reviews) setReviews(refreshed.data.reviews);
  }

  function cartLineFromFormat(format: LibraryProductFormat) {
    return {
      productId: product.id,
      title: `${product.title} (${format.label})`,
      price: format.price,
      currency: product.currency,
      quantity: 1,
      formatId: format.id,
      formatType: format.type,
      formatLabel: format.label,
    };
  }

  function addToCart() {
    if (!selectedFormat) return;
    setCart((current) => {
      const existing = current.find((line) => line.productId === product.id && line.formatId === selectedFormat.id);
      if (existing) {
        return current.map((line) => (line.productId === product.id && line.formatId === selectedFormat.id ? { ...line, quantity: line.quantity + 1 } : line));
      }
      return [...current, cartLineFromFormat(selectedFormat)];
    });
    notifyLibraryCartAdded(product.title);
    showToast(`${product.title} (${selectedFormat.label}) added to your Library Bag.`, "success");
  }

  function buyNow() {
    if (!selectedFormat) return;
    writeLibraryCart([cartLineFromFormat(selectedFormat)]);
    window.location.href = "/library/checkout";
  }

  function addBundle() {
    if (!selectedFormat) return;
    writeLibraryCart([
      cartLineFromFormat(selectedFormat),
      ...relatedBundle.map((item) => ({ productId: item.id, title: item.title, price: item.price, currency: item.currency, quantity: 1 })),
    ]);
    window.location.href = "/library/checkout";
  }

  return (
    <main className="bg-mist text-ink dark:bg-slate-950 dark:text-white">
      <LibraryCartFab />
      <section className="border-b border-slate-200/80 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-[88rem] flex-col gap-3 px-4 py-3.5 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="min-w-0">
            <nav aria-label="Product breadcrumb" className="flex flex-wrap items-center gap-2 text-sm leading-6">
              <Link href="/library" className="inline-flex items-center gap-2 font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300">
                <ArrowLeft className="size-4" /> Library
              </Link>
              <span className="text-slate-300">/</span>
              <span className="font-medium text-slate-600 dark:text-slate-300">{product.category}</span>
              <span className="hidden text-slate-300 sm:inline">/</span>
              <span className="hidden max-w-xl truncate font-medium text-slate-900 dark:text-white sm:inline">{product.title}</span>
            </nav>
            <p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {formats.map((format) => format.label).join(" · ") || product.productType.replace(/_/g, " ")} by {product.author}
            </p>
          </div>
          <Link href="/library/checkout" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-ink shadow-sm transition hover:border-emerald-600 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
            <ShoppingBag className="size-4" /> Library Bag <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs tabular-nums text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">{count}</span>
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-[88rem] gap-7 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:px-8 lg:py-12">
        <article className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-8 p-5 sm:p-7 xl:grid-cols-[minmax(18rem,30rem)_minmax(0,1fr)] xl:items-start">
            <div className="space-y-4">
              <div className="relative mx-auto max-w-[28rem] xl:mx-0">
                <button
                  type="button"
                  onClick={() => openLightbox()}
                  className="block w-full rounded-2xl text-left"
                  aria-label="Open product cover"
                >
                  <BookCover product={product} imageUrl={activeGalleryImage?.url} interactive={false} className="w-full rounded-2xl" priority />
                </button>
                <div className="absolute bottom-3 right-3 z-20 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openLightbox({ zoomed: true })}
                    disabled={!activeGalleryImage?.url}
                    className="rounded-lg bg-white/95 p-2 text-slate-800 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Zoom product image"
                  >
                    <ZoomIn className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openLightbox()}
                    disabled={!activeGalleryImage?.url}
                    className="rounded-lg bg-white/95 p-2 text-slate-800 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Open fullscreen gallery"
                  >
                    <Expand className="size-4" />
                  </button>
                </div>
              </div>
              {galleryImages.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {galleryImages.slice(0, 6).map((item, index) => (
                    <button
                      key={`${item.url}-${index}`}
                      type="button"
                      onClick={() => setGalleryIndex(index)}
                      className={cn(
                        "relative aspect-[3/4] overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-slate-950",
                        galleryIndex === index ? "border-emerald-600 ring-2 ring-emerald-600/20" : "border-slate-200 dark:border-slate-800",
                      )}
                      aria-label={`Show ${item.label || "gallery image"}`}
                    >
                      <Image src={item.url} alt={item.label || product.title} fill sizes="120px" className="object-cover" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {[product.productType.replace(/_/g, " "), product.category, product.difficulty].map((item, index) => (
                    <div key={`${item}-${index}`} className="grid min-h-14 place-items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-black leading-tight text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">{product.collection}</p>
              <h1 className="mt-3 max-w-2xl text-balance text-2xl font-semibold leading-[1.2] tracking-[-0.02em] text-ink sm:text-3xl dark:text-white">{product.title}</h1>
              {product.subtitle ? (
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">{product.subtitle}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                <span>
                  By <strong className="font-semibold text-ink dark:text-white">{product.author}</strong>
                </span>
                <span className="flex items-center gap-1 text-amber-500">
                  <Star className="size-4 fill-current" /> {product.rating || "New"} ({product.reviewCount} reviews)
                </span>
              </div>

              {formats.length > 0 && (
                <div className="mt-5 max-w-lg">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Choose format</p>
                  <div className={cn("mt-2 grid gap-2", formats.length > 1 ? "sm:grid-cols-2" : "grid-cols-1")}>
                    {formats.map((format) => (
                      <button
                        key={format.id}
                        type="button"
                        onClick={() => setSelectedFormatId(format.id)}
                        className={cn(
                          "rounded-lg border px-3 py-3 text-left transition",
                          selectedFormat?.id === format.id
                            ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/15 dark:bg-emerald-950/30"
                            : "border-slate-200 hover:border-emerald-500 dark:border-slate-700",
                        )}
                      >
                        <span className="block text-sm font-semibold text-ink dark:text-white">{format.label}</span>
                        <span className="mt-1 block text-lg font-semibold tracking-tight text-ink dark:text-white">
                          {product.currency} {format.price.toFixed(2)}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                          {format.type === "PRINTED_BOOK"
                            ? printStockLabel
                            : "Digital · instant after payment"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-end gap-3">
                <p className="text-3xl font-semibold tracking-tight text-ink dark:text-white">{product.currency} {(selectedFormat?.price ?? product.price).toFixed(2)}</p>
                {(selectedFormat?.compareAtPrice ?? product.compareAtPrice) && (
                  <p className="pb-1 text-sm text-slate-400 line-through">{product.currency} {(selectedFormat?.compareAtPrice ?? product.compareAtPrice)!.toFixed(2)}</p>
                )}
              </div>
              <p className="mt-2 text-sm leading-6 text-emerald-800 dark:text-emerald-200">
                {isPrinted ? printStockLabel : "Instant digital delivery after payment confirmation"}
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:max-w-md sm:flex-row">
                <Button disabled={outOfStock} onClick={buyNow} className="sm:flex-1">
                  <ShoppingCart className="size-4" /> {product.preorder ? "Pre-order now" : "Buy now"}
                </Button>
                <Button variant="secondary" disabled={outOfStock} onClick={addToCart} className="sm:flex-1">
                  <ShoppingBag className="size-4" /> {productQuantity ? `In bag (${productQuantity})` : "Add to cart"}
                </Button>
              </div>

              <div className="mt-6 grid max-w-3xl gap-3 sm:grid-cols-3">
                <Proof icon={ShieldCheck} label="Secure checkout" />
                <Proof icon={ReceiptText} label="Invoice ready" />
                <Proof icon={Download} label="Tracked access" />
              </div>
            </div>
          </div>

          <section className="border-t border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/35 sm:p-7">
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink dark:text-white">
              <Layers3 className="size-5 text-emerald-700 dark:text-emerald-300" /> What you get
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-700 dark:text-slate-300">{product.description}</p>
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
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Your selection</p>
            <p className="mt-2 text-sm font-semibold text-ink dark:text-white">{selectedFormat?.label || "Library product"}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-ink dark:text-white">{product.currency} {(selectedFormat?.price ?? product.price).toFixed(2)}</p>
            {formats.length > 1 && (
              <div className="mt-4 grid gap-2">
                {formats.map((format) => (
                  <button
                    key={`aside-${format.id}`}
                    type="button"
                    onClick={() => setSelectedFormatId(format.id)}
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition",
                      selectedFormat?.id === format.id ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" : "border-slate-200 dark:border-slate-700",
                    )}
                  >
                    <span className="font-semibold">{format.label}</span>
                    <span className="font-bold">{product.currency} {format.price.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="mt-5 grid gap-2">
              <Button disabled={outOfStock} onClick={buyNow}>
                <ShoppingCart className="size-4" /> {product.preorder ? "Pre-order now" : "Buy now"}
              </Button>
              <Button variant="secondary" disabled={outOfStock} onClick={addToCart}>
                <ShoppingBag className="size-4" /> {productQuantity ? `In bag (${productQuantity})` : "Add to cart"}
              </Button>
              <Button variant="secondary" onClick={() => setPreviewOpen(true)}>
                <FileText className="size-4" /> {sampleUrl ? "Read sample PDF" : "Read sample"}
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" disabled={wishBusy} onClick={() => void toggleWishlist()} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" aria-label="Add to wishlist">
                <Heart className={cn("size-4", wished && "fill-current text-rose-500")} /> {wished ? "Saved" : "Wishlist"}
              </button>
              <button type="button" onClick={() => void shareProduct()} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" aria-label="Share product">
                <Share2 className="size-4" /> {shareNotice || "Share"}
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
                ["Formats", formats.map((format) => `${format.label} (${product.currency} ${format.price.toFixed(2)})`).join(", ") || product.productType.replace(/_/g, " ")],
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
          <Panel title="Sample Preview" icon={BookOpen} action={<Button variant="secondary" onClick={() => setPreviewOpen(true)}><FileText className="size-4" /> {sampleUrl ? "Open sample PDF" : "Open preview"}</Button>}>
            <div className="grid gap-5 md:grid-cols-[12rem_minmax(0,1fr)] md:items-center">
              <BookCover product={product} className="w-full rounded-xl" />
              <div>
                <p className="text-xl font-semibold tracking-tight leading-snug">{sampleUrl ? "Read a free PDF sample before you buy." : "Preview the synopsis and contents before purchase."}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {sampleUrl
                    ? "This product includes a previewable sample file from the HouseLink Library."
                    : "Open the sample to read the product summary, chapter list, and cover gallery. Full downloads unlock after payment confirmation."}
                </p>
              </div>
            </div>
          </Panel>

          <Panel title="Table of Contents" icon={FileText}>
            <ol className="grid gap-2 sm:grid-cols-2">
              {product.tableOfContents.map((item, index) => (
                <li key={item} className="flex min-h-14 items-center rounded-xl border border-slate-200 bg-[#fbfcfb] p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
                  <span className="mr-2 font-semibold tabular-nums text-emerald-700">{String(index + 1).padStart(2, "0")}</span>
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

          <Panel title="Customer reviews" icon={Star}>
            <div className="space-y-4">
              {reviews.length ? reviews.map((review) => (
                <article key={review.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-500">
                      <Star className="size-3.5 fill-current" /> {review.rating}/5
                    </span>
                    <span className="font-semibold text-ink dark:text-white">{review.authorName}</span>
                    {review.verified && <span className="text-xs font-bold uppercase text-emerald-700">Verified purchase</span>}
                  </div>
                  {review.title && <p className="mt-2 font-semibold">{review.title}</p>}
                  {review.body && <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{review.body}</p>}
                </article>
              )) : (
                <p className="text-sm text-slate-500">No published reviews yet. Buyers of digital or printed formats can leave the first one.</p>
              )}
              <div className="rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
                <p className="font-semibold">Write a review</p>
                <p className="mt-1 text-xs text-slate-500">Available after you purchase this product (digital or print).</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
                  <label className="text-sm font-medium">
                    Rating
                    <select
                      value={reviewForm.rating}
                      onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
                      className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-2 dark:border-slate-700 dark:bg-slate-900"
                    >
                      {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-medium">
                    Title
                    <input
                      value={reviewForm.title}
                      onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                      className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-900"
                      placeholder="What stood out?"
                    />
                  </label>
                </div>
                <label className="mt-3 block text-sm font-medium">
                  Review
                  <textarea
                    value={reviewForm.body}
                    onChange={(e) => setReviewForm({ ...reviewForm, body: e.target.value })}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                    placeholder="Share how this product helped you."
                  />
                </label>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button disabled={reviewBusy} onClick={() => void submitReview()}>
                    {reviewBusy ? "Submitting…" : "Submit review"}
                  </Button>
                  {reviewNotice && <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{reviewNotice}</p>}
                </div>
              </div>
            </div>
          </Panel>

          {relatedBundle.length > 0 && (
            <Panel title="Frequently Bought Together" icon={ShoppingCart} action={<Button onClick={addBundle}>Buy bundle</Button>}>
              <div className="grid items-stretch gap-3 md:grid-cols-3">
                {[product, ...relatedBundle].map((item) => (
                  <Link key={item.id} href={`/library/${item.slug}`} className="flex h-full flex-col rounded-xl border border-slate-200 bg-[#fbfcfb] p-3 transition hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">{item.productType.replace(/_/g, " ")}</p>
                    <p className="mt-1 line-clamp-2 font-semibold">{item.title}</p>
                    <p className="mt-auto pt-3 text-sm font-semibold tabular-nums">USD {item.price.toFixed(2)}</p>
                  </Link>
                ))}
              </div>
              <p className="mt-4 text-right text-lg font-semibold tracking-tight">Bundle total: USD {bundleTotal.toFixed(2)}</p>
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
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="section-eyebrow">Keep building</p>
            <h2 className="mt-3 text-[1.85rem] font-semibold tracking-[-0.02em] text-ink dark:text-white sm:text-[2.15rem]">Related products</h2>
          </div>
          <Link href="/library" className="hidden items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300 sm:inline-flex">
            Browse all <ArrowLeft className="size-4 rotate-180" />
          </Link>
        </div>
        <div className="grid items-stretch gap-5 md:grid-cols-3">
          {related.map((item) => (
            <Link key={item.id} href={`/library/${item.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white transition duration-300 hover:-translate-y-1 hover:border-emerald-600/30 hover:shadow-card-hover dark:border-slate-800 dark:bg-slate-900">
              <div className="bg-[linear-gradient(180deg,#f4f8f7_0%,#eef5f2_100%)] px-5 pt-5 dark:bg-slate-950/60">
                <BookCover product={item} className="mx-auto w-full max-w-[11rem]" />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">{item.category}</p>
                <p className="mt-2 line-clamp-2 text-base font-semibold leading-snug tracking-tight text-ink dark:text-white">{item.title}</p>
                <p className="mt-auto pt-4 text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">USD {item.price.toFixed(2)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {lightboxOpen && activeGalleryImage?.url && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black/90" role="dialog" aria-modal="true" aria-label="Product image gallery">
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
            <div className="min-w-0">
              <p className="truncate text-sm font-black">{product.title}</p>
              <p className="truncate text-xs text-white/70">{activeGalleryImage.label || "Cover"} · {galleryIndex + 1}/{Math.max(galleryImages.length, 1)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setLightboxZoomed((current) => !current)}
                className="rounded-lg bg-white/10 p-2 hover:bg-white/20"
                aria-label={lightboxZoomed ? "Zoom out" : "Zoom in"}
              >
                {lightboxZoomed ? <ZoomOut className="size-4" /> : <ZoomIn className="size-4" />}
              </button>
              <button type="button" onClick={closeLightbox} className="rounded-lg bg-white/10 p-2 hover:bg-white/20" aria-label="Close gallery">
                <X className="size-4" />
              </button>
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6" onClick={closeLightbox}>
            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    stepGallery(-1);
                  }}
                  className="absolute left-3 z-10 rounded-full bg-white/15 p-2 text-white hover:bg-white/25 sm:left-6"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    stepGallery(1);
                  }}
                  className="absolute right-3 z-10 rounded-full bg-white/15 p-2 text-white hover:bg-white/25 sm:right-6"
                  aria-label="Next image"
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}
            <div
              className={cn("relative max-h-full max-w-5xl overflow-auto transition duration-200", lightboxZoomed ? "w-full cursor-zoom-out" : "w-auto cursor-zoom-in")}
              onClick={(event) => {
                event.stopPropagation();
                setLightboxZoomed((current) => !current);
              }}
            >
              <Image
                src={activeGalleryImage.url}
                alt={activeGalleryImage.label || product.title}
                width={1200}
                height={1600}
                className={cn("mx-auto h-auto max-h-[80dvh] w-auto rounded-lg object-contain shadow-2xl transition duration-200", lightboxZoomed && "max-h-none w-full max-w-none scale-125")}
                priority
              />
            </div>
          </div>
        </div>
      )}

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={() => setPreviewOpen(false)}>
          <div className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-slate-950" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <p className="font-semibold">{sampleUrl ? "Sample PDF" : "Sample preview"} - {product.title}</p>
              <button type="button" onClick={() => setPreviewOpen(false)} className="rounded-lg px-3 py-1 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-900">
                Close
              </button>
            </div>
            {sampleUrl ? (
              <div className="min-h-[70dvh] bg-slate-100 dark:bg-slate-900">
                <iframe title={`${product.title} sample`} src={sampleUrl} className="h-[70dvh] w-full border-0" />
                <div className="flex justify-end gap-2 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                  <Button variant="secondary" onClick={() => window.open(sampleUrl, "_blank")}>
                    <FileText className="size-4" /> Open in new tab
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid min-h-[34rem] place-items-center bg-slate-100 p-5 dark:bg-slate-900">
                <div className="grid w-full max-w-4xl gap-5 md:grid-cols-[15rem_minmax(0,1fr)]">
                  <BookCover product={product} imageUrl={activeGalleryImage?.url} />
                  <div className="rounded-lg bg-white p-7 shadow-xl dark:bg-slate-950">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Preview pages</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight leading-snug sm:text-3xl">{product.tableOfContents[0] || product.title}</h3>
                    <p className="mt-4 text-base leading-8 text-slate-600 dark:text-slate-300">{product.description}</p>
                    <div className="mt-6 grid gap-2 sm:grid-cols-2">
                      {product.tableOfContents.slice(1, 5).map((item) => (
                        <p key={item} className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
                          {item}
                        </p>
                      ))}
                    </div>
                    <div className="mt-6">
                      <Button variant="secondary" onClick={() => { setPreviewOpen(false); openLightbox({ zoomed: true }); }}>
                        <ZoomIn className="size-4" /> View cover gallery
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.seoTitle || product.title,
            description: product.metaDescription || product.shortDescription,
            image: product.seoImageUrl || product.gallery[0]?.url,
            sku: product.sku,
            brand: { "@type": "Brand", name: product.publisher || "HouseLink Zimbabwe" },
            offers: formats.map((format) => ({
              "@type": "Offer",
              name: format.label,
              price: format.price,
              priceCurrency: product.currency,
              availability: format.type === "PRINTED_BOOK" && product.stock === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
              url: `/library/${product.slug}`,
            })),
          }),
        }}
      />
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
