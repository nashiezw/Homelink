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
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookCover } from "@/components/library/book-cover";
import { LibraryCartFab } from "@/components/library/library-cart-fab";
import { LibraryFormatPickerDialog } from "@/components/library/library-format-picker-dialog";
import { LibraryProductCard } from "@/components/library/library-product-card";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import {
  notifyLibraryCartAdded,
  sameLibraryCartLine,
  writeLibraryCart,
  useLibraryCart,
} from "@/lib/library/cart-client";
import {
  enabledLibraryFormats,
  libraryDiscountPercent,
  libraryFormatCompareAt,
  primaryLibraryFormat,
  type LibraryProduct,
  type LibraryProductFormat,
} from "@/lib/library/catalog";
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
  const { showToast, user } = useApp();
  const formats = useMemo(() => enabledLibraryFormats(product), [product]);
  const [selectedFormatId, setSelectedFormatId] = useState(formats[0]?.id ?? "primary");
  const { cart, setCart, count } = useLibraryCart();
  const [formatPickerProduct, setFormatPickerProduct] = useState<LibraryProduct | null>(null);
  const [wished, setWished] = useState(false);
  const [wishBusy, setWishBusy] = useState(false);
  const [shareNotice, setShareNotice] = useState("");
  const [reviews, setReviews] = useState(initialReviews);
  const [ratingSummary, setRatingSummary] = useState({
    average: product.rating,
    count: product.reviewCount,
  });
  const [reviewSettings, setReviewSettings] = useState<{
    enabled: boolean;
    requirePurchase: boolean;
    minRating: number;
    autoApprove: boolean;
    allowGuestNames: boolean;
  } | null>(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: "", body: "", displayName: "" });
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewNotice, setReviewNotice] = useState("");

  useEffect(() => {
    void apiFetch<{
      reviews?: {
        enabled?: boolean;
        requirePurchase?: boolean;
        minRating?: number;
        autoApprove?: boolean;
        allowGuestNames?: boolean;
      };
    }>("/api/v1/library/settings").then((result) => {
      const reviewsCfg = result.data?.reviews;
      if (!reviewsCfg) return;
      const minRating = Math.min(5, Math.max(1, Number(reviewsCfg.minRating) || 1));
      setReviewSettings({
        enabled: reviewsCfg.enabled !== false,
        requirePurchase: reviewsCfg.requirePurchase !== false,
        minRating,
        autoApprove: Boolean(reviewsCfg.autoApprove),
        allowGuestNames: Boolean(reviewsCfg.allowGuestNames),
      });
      setReviewForm((current) => ({
        ...current,
        rating: Math.max(current.rating, minRating),
      }));
    });
  }, []);
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
    () => product.downloads.find((file) => isLibrarySampleFile(file)) ?? null,
    [product.downloads],
  );
  const sampleUrl = sampleFile ? `/api/v1/library/products/${encodeURIComponent(product.slug)}/sample` : null;
  const learningOutcomes = product.learningOutcomes.filter((item) => item.trim());
  const tableOfContents = product.tableOfContents.filter((item) => item.trim());
  const whoThisIsFor = product.whoThisIsFor.filter((item) => item.trim());
  const includedDownloads = product.downloads.filter((item) => item.label?.trim());
  const shortDescription = product.shortDescription?.replace(/\s+/g, " ").trim() || "";
  const fullDescription = product.description?.replace(/\s+/g, " ").trim() || "";
  const summaryExcerpt =
    shortDescription && shortDescription !== fullDescription
      ? shortDescription
      : fullDescription
        ? fullDescription.length > 220
          ? `${fullDescription.slice(0, 217).trimEnd()}…`
          : fullDescription
        : "";
  const showFullDescription = Boolean(fullDescription && fullDescription !== summaryExcerpt);

  function openLightbox(options?: { zoomed?: boolean }) {
    if (!activeGalleryImage?.url && !galleryImages[0]?.url) return;
    setLightboxZoomed(Boolean(options?.zoomed));
    setLightboxOpen(true);
  }

  function closeLightbox() {
    setLightboxOpen(false);
    setLightboxZoomed(false);
  }

  const stepGallery = useCallback((delta: number) => {
    if (!galleryImages.length) return;
    setGalleryIndex((current) => (current + delta + galleryImages.length) % galleryImages.length);
  }, [galleryImages.length]);

  useEffect(() => {
    setReviews(initialReviews);
    setRatingSummary({ average: product.rating, count: product.reviewCount });
  }, [product.id, product.rating, product.reviewCount, initialReviews]);

  useEffect(() => {
    void apiFetch<{ wished: boolean }>(`/api/v1/library/wishlist?productId=${encodeURIComponent(product.id)}`).then((result) => {
      if (result.data) setWished(result.data.wished);
    });
  }, [product.id]);

  useEffect(() => {
    if (!lightboxOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLightboxOpen(false);
        setLightboxZoomed(false);
      }
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
  }, [lightboxOpen, stepGallery]);

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
    if (!user) {
      setReviewNotice("Sign in to leave a review.");
      return;
    }
    if (reviewSettings && !reviewSettings.enabled) {
      setReviewNotice("Reviews are currently disabled.");
      return;
    }
    const minRating = reviewSettings?.minRating ?? 1;
    if (reviewForm.rating < minRating) {
      setReviewNotice(`Choose a rating of at least ${minRating} stars.`);
      return;
    }
    if (reviewForm.title.trim().length < 3) {
      setReviewNotice("Add a short title (at least 3 characters).");
      return;
    }
    if (reviewForm.body.trim().length < 20) {
      setReviewNotice("Write a review of at least 20 characters.");
      return;
    }
    if (reviewSettings?.allowGuestNames && reviewForm.displayName.trim() && reviewForm.displayName.trim().length < 2) {
      setReviewNotice("Display name must be at least 2 characters.");
      return;
    }
    setReviewBusy(true);
    setReviewNotice("");
    const result = await apiFetch<{
      review?: { id: string };
      autoApproved?: boolean;
      productRating?: { average: number; count: number };
    }>("/api/v1/library/reviews", {
      method: "POST",
      body: JSON.stringify({
        productId: product.id,
        rating: reviewForm.rating,
        title: reviewForm.title,
        body: reviewForm.body,
        displayName: reviewSettings?.allowGuestNames ? reviewForm.displayName : undefined,
      }),
    });
    setReviewBusy(false);
    if (result.error) {
      setReviewNotice(result.error.message || "Could not submit review.");
      return;
    }
    setReviewForm({ rating: Math.max(5, minRating), title: "", body: "", displayName: "" });
    setReviewNotice(
      result.data?.autoApproved
        ? "Thanks — your review is live."
        : "Thanks — your review was submitted for moderation.",
    );
    if (result.data?.productRating) {
      setRatingSummary({
        average: result.data.productRating.average,
        count: result.data.productRating.count,
      });
    }
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
    showToast("Added to your bag.", "success");
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

  function quantityFor(productId: string) {
    return cart.filter((line) => line.productId === productId).reduce((sum, line) => sum + line.quantity, 0);
  }

  function addRelatedFormatToCart(target: LibraryProduct, format: LibraryProductFormat) {
    setCart((current) => {
      const existing = current.find((line) => sameLibraryCartLine(line, { productId: target.id, formatId: format.id }));
      if (existing) {
        return current.map((line) =>
          sameLibraryCartLine(line, { productId: target.id, formatId: format.id })
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [
        ...current,
        {
          productId: target.id,
          title: `${target.title} (${format.label})`,
          price: format.price,
          currency: target.currency,
          quantity: 1,
          formatId: format.id,
          formatType: format.type,
          formatLabel: format.label,
        },
      ];
    });
    notifyLibraryCartAdded(target.title);
    showToast("Added to your bag.", "success");
  }

  function requestAddRelated(target: LibraryProduct) {
    const formats = enabledLibraryFormats(target);
    if (formats.length > 1) {
      setFormatPickerProduct(target);
      return;
    }
    const format = primaryLibraryFormat(formats, target.productType, target.price);
    addRelatedFormatToCart(target, format);
  }

  return (
    <main className="bg-mist text-ink dark:bg-slate-950 dark:text-white">
      <LibraryCartFab />
      {formatPickerProduct && (
        <LibraryFormatPickerDialog
          product={formatPickerProduct}
          onClose={() => setFormatPickerProduct(null)}
          onConfirm={(format) => {
            addRelatedFormatToCart(formatPickerProduct, format);
            setFormatPickerProduct(null);
          }}
        />
      )}
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

      <section className="mx-auto max-w-[88rem] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <article className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-6 p-6 sm:gap-8 sm:p-8 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,34rem)] xl:gap-x-12 xl:gap-y-5 xl:p-10">
            <div className="relative mx-auto w-full max-w-md xl:mx-0 xl:max-w-none">
              <div className="relative rounded-[1.35rem] bg-[radial-gradient(circle_at_50%_18%,#ffffff_0%,#f3f7f5_55%,#e8f0ec_100%)] p-3 sm:p-4 dark:bg-[radial-gradient(circle_at_50%_18%,#1e293b_0%,#0f172a_70%,#020617_100%)] xl:absolute xl:inset-0">
                <button
                  type="button"
                  onClick={() => openLightbox()}
                  className="relative mx-auto block aspect-[3/4] w-full max-w-[18.5rem] text-left xl:h-full xl:w-full xl:max-w-none xl:aspect-auto"
                  aria-label="Open product cover"
                >
                  {activeGalleryImage?.url ? (
                    <span className="relative block h-full w-full overflow-hidden rounded-xl shadow-[0_22px_48px_rgba(15,23,42,0.16)]">
                      <Image
                        src={activeGalleryImage.url}
                        alt={product.title}
                        fill
                        priority
                        sizes="(max-width: 768px) 70vw, 420px"
                        className="object-contain"
                      />
                    </span>
                  ) : (
                    <BookCover
                      product={product}
                      interactive={false}
                      className="h-full w-full rounded-xl shadow-[0_22px_48px_rgba(15,23,42,0.16)]"
                      sizes="(max-width: 768px) 70vw, 420px"
                      priority
                    />
                  )}
                </button>
                <div className="absolute bottom-3 right-3 z-20 flex gap-2 sm:bottom-4 sm:right-4">
                  <button
                    type="button"
                    onClick={() => openLightbox({ zoomed: true })}
                    disabled={!activeGalleryImage?.url}
                    className="rounded-lg bg-white/95 p-2 text-slate-700 shadow-sm ring-1 ring-slate-200/80 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900/90 dark:text-slate-100 dark:ring-slate-700"
                    aria-label="Zoom product image"
                  >
                    <ZoomIn className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openLightbox()}
                    disabled={!activeGalleryImage?.url}
                    className="rounded-lg bg-white/95 p-2 text-slate-700 shadow-sm ring-1 ring-slate-200/80 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900/90 dark:text-slate-100 dark:ring-slate-700"
                    aria-label="Open fullscreen gallery"
                  >
                    <Expand className="size-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                {product.collection}
              </p>
              <h1 className="mt-3 text-balance text-[1.65rem] font-semibold leading-[1.18] tracking-[-0.025em] text-ink sm:text-[2.05rem] sm:leading-[1.14] dark:text-white">
                {product.title}
              </h1>
              {product.subtitle ? (
                <p className="mt-4 max-w-[34rem] text-[0.98rem] leading-[1.65] text-slate-600 dark:text-slate-300">
                  {readableSubtitle(product.subtitle)}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                <span>
                  By <strong className="font-semibold text-ink dark:text-white">{product.author}</strong>
                </span>
                <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline-block dark:bg-slate-600" aria-hidden />
                <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <Star className="size-3.5 fill-current" />
                  <span className="font-medium">{ratingSummary.count ? ratingSummary.average : "New"}</span>
                  <span className="text-slate-500 dark:text-slate-400">({ratingSummary.count} reviews)</span>
                </span>
              </div>

              {summaryExcerpt ? (
                <p className="mt-5 max-w-[36rem] text-[0.98rem] leading-7 text-slate-600 dark:text-slate-300">
                  {summaryExcerpt}
                </p>
              ) : null}

              {formats.length > 0 && (
                <div className="mt-7">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-slate-500">Choose format</p>
                  <div className={cn("mt-3 grid gap-3", formats.length > 1 ? "sm:grid-cols-2" : "grid-cols-1")}>
                    {formats.map((format) => {
                      const selected = selectedFormat?.id === format.id;
                      const compareAt = libraryFormatCompareAt(format);
                      const discount = libraryDiscountPercent(format.price, compareAt);
                      return (
                        <button
                          key={format.id}
                          type="button"
                          onClick={() => setSelectedFormatId(format.id)}
                          className={cn(
                            "rounded-xl border px-4 py-3.5 text-left transition",
                            selected
                              ? "border-emerald-600 bg-emerald-50/90 ring-2 ring-emerald-600/15 dark:bg-emerald-950/35"
                              : "border-slate-200 bg-white hover:border-emerald-500/70 dark:border-slate-700 dark:bg-slate-950/40",
                          )}
                        >
                          <span className="block text-[0.95rem] font-semibold leading-snug text-ink dark:text-white">{format.label}</span>
                          <span className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="text-xl font-semibold tracking-tight text-ink dark:text-white">
                              {product.currency} {format.price.toFixed(2)}
                            </span>
                            {compareAt != null && (
                              <span className="text-sm text-slate-400 line-through">
                                {product.currency} {compareAt.toFixed(2)}
                              </span>
                            )}
                          </span>
                          {discount != null && (
                            <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                              Save {discount}%
                            </span>
                          )}
                          <span className="mt-1.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {format.type === "PRINTED_BOOK" ? printStockLabel : "Digital · instant after payment"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-7 border-t border-slate-100 pt-5 dark:border-slate-800">
                {(() => {
                  const sellPrice = selectedFormat?.price ?? product.price;
                  const compareAt =
                    (selectedFormat ? libraryFormatCompareAt(selectedFormat) : undefined) ??
                    (product.compareAtPrice != null && product.compareAtPrice > sellPrice ? product.compareAtPrice : undefined);
                  const discount = libraryDiscountPercent(sellPrice, compareAt);
                  return (
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <p className="text-[2rem] font-semibold tracking-tight text-ink dark:text-white">
                        {product.currency} {sellPrice.toFixed(2)}
                      </p>
                      {compareAt != null && (
                        <p className="text-base text-slate-400 line-through">
                          {product.currency} {compareAt.toFixed(2)}
                        </p>
                      )}
                      {discount != null && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                          Save {discount}%
                        </span>
                      )}
                    </div>
                  );
                })()}
                <p className="mt-2 text-sm leading-6 text-emerald-800 dark:text-emerald-200">
                  {isPrinted ? printStockLabel : "Instant digital delivery after payment confirmation"}
                </p>
                <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  <Button disabled={outOfStock} onClick={buyNow} className="h-11">
                    <ShoppingCart className="size-4" /> {product.preorder ? "Pre-order now" : "Buy now"}
                  </Button>
                  <Button variant="secondary" disabled={outOfStock} onClick={addToCart} className="h-11">
                    <ShoppingBag className="size-4" /> {productQuantity ? `In bag (${productQuantity})` : "Add to cart"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="xl:col-start-1">
              {galleryImages.length > 0 ? (
                <div className="flex flex-wrap gap-2.5">
                  {galleryImages.slice(0, 6).map((item, index) => (
                    <button
                      key={`${item.url}-${index}`}
                      type="button"
                      onClick={() => setGalleryIndex(index)}
                      className={cn(
                        "relative h-[4.5rem] w-[3.35rem] overflow-hidden rounded-lg border bg-white shadow-sm transition dark:bg-slate-950",
                        galleryIndex === index
                          ? "border-emerald-600 ring-2 ring-emerald-600/20"
                          : "border-slate-200 hover:border-emerald-500/60 dark:border-slate-800",
                      )}
                      aria-label={`Show ${item.label || "gallery image"}`}
                    >
                      <Image src={item.url} alt={item.label || product.title} fill sizes="54px" className="object-cover" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {[product.productType.replace(/_/g, " "), product.category, product.difficulty].map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3 dark:border-slate-800 xl:col-start-2 xl:border-0 xl:pt-0">
              <HeroProof icon={ShieldCheck} label="Secure checkout" />
              <HeroProof icon={ReceiptText} label="Invoice ready" />
              <HeroProof icon={Download} label="Tracked access" />
            </div>
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-[88rem] gap-7 px-4 pb-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:px-8">
        <div className="space-y-7">
          {showFullDescription ? (
            <section className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900 sm:p-7">
              <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink dark:text-white">
                <FileText className="size-5 text-emerald-700 dark:text-emerald-300" /> Description
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-700 dark:text-slate-300">{fullDescription}</p>
            </section>
          ) : null}

          {learningOutcomes.length > 0 ? (
            <section className="overflow-hidden rounded-3xl border border-slate-200/90 bg-slate-50/70 p-5 shadow-soft dark:border-slate-800 dark:bg-slate-950/35 sm:p-7">
              <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink dark:text-white">
                <Layers3 className="size-5 text-emerald-700 dark:text-emerald-300" /> What you get
              </h2>
              <div className="mt-5 grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {learningOutcomes.slice(0, 6).map((item) => (
                  <p key={item} className="flex h-full gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm leading-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> {item}
                  </p>
                ))}
              </div>
            </section>
          ) : null}

          {sampleUrl ? (
            <Panel title="Sample Preview" icon={BookOpen} action={<Button variant="secondary" onClick={() => setPreviewOpen(true)}><FileText className="size-4" /> Open sample PDF</Button>}>
              <div className="grid gap-5 md:grid-cols-[12rem_minmax(0,1fr)] md:items-center">
                <BookCover product={product} className="w-full rounded-xl" />
                <div>
                  <p className="text-xl font-semibold tracking-tight leading-snug">Read a free PDF sample before you buy.</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                    This product includes a previewable sample file from the HouseLink Library.
                  </p>
                </div>
              </div>
            </Panel>
          ) : null}

          {tableOfContents.length > 0 ? (
            <Panel title="Table of Contents" icon={FileText}>
              <ol className="grid gap-2 sm:grid-cols-2">
                {tableOfContents.map((item, index) => (
                  <li key={item} className="flex min-h-14 items-center rounded-xl border border-slate-200 bg-[#fbfcfb] p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
                    <span className="mr-2 font-semibold tabular-nums text-emerald-700">{String(index + 1).padStart(2, "0")}</span>
                    {item}
                  </li>
                ))}
              </ol>
            </Panel>
          ) : null}

          {includedDownloads.length > 0 ? (
            <Panel title="Downloads Included" icon={Download}>
              {includedDownloads.map((download) => (
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
              ))}
            </Panel>
          ) : null}

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
                <p className="text-sm text-slate-500">
                  {reviewSettings?.enabled === false
                    ? "Reviews are currently turned off for this store."
                    : "No published reviews yet. Buyers of digital or printed formats can leave the first one."}
                </p>
              )}
              {reviewSettings?.enabled === false ? null : (
                <div className="rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
                  <p className="font-semibold">Write a review</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {!user
                      ? "Sign in to leave a review."
                      : reviewSettings?.requirePurchase !== false
                        ? "Available after you purchase this product (digital or print)."
                        : reviewSettings?.autoApprove
                          ? "Your review will appear immediately after you submit."
                          : "Your review will appear after moderation."}
                  </p>
                  {!user ? (
                    <div className="mt-3">
                      <Link href={`/login?next=${encodeURIComponent(`/library/${product.slug}`)}`} className="inline-flex">
                        <Button>Sign in to review</Button>
                      </Link>
                      {reviewNotice && <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{reviewNotice}</p>}
                    </div>
                  ) : (
                    <>
                      <div className="mt-3 grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
                        <label className="text-sm font-medium">
                          Rating
                          <select
                            value={reviewForm.rating}
                            onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
                            className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-2 dark:border-slate-700 dark:bg-slate-900"
                          >
                            {[5, 4, 3, 2, 1]
                              .filter((value) => value >= (reviewSettings?.minRating ?? 1))
                              .map((value) => <option key={value} value={value}>{value}</option>)}
                          </select>
                        </label>
                        <label className="text-sm font-medium">
                          Title <span className="text-xs font-normal text-slate-500">(required)</span>
                          <input
                            value={reviewForm.title}
                            onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                            className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-900"
                            placeholder="What stood out?"
                            required
                            minLength={3}
                            maxLength={120}
                          />
                        </label>
                      </div>
                      {reviewSettings?.allowGuestNames ? (
                        <label className="mt-3 block text-sm font-medium">
                          Display name <span className="text-xs font-normal text-slate-500">(optional public name)</span>
                          <input
                            value={reviewForm.displayName}
                            onChange={(e) => setReviewForm({ ...reviewForm, displayName: e.target.value })}
                            className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-900"
                            placeholder={user?.name || "How your name should appear"}
                            maxLength={60}
                          />
                        </label>
                      ) : null}
                      <label className="mt-3 block text-sm font-medium">
                        Review <span className="text-xs font-normal text-slate-500">(min. 20 characters)</span>
                        <textarea
                          value={reviewForm.body}
                          onChange={(e) => setReviewForm({ ...reviewForm, body: e.target.value })}
                          rows={3}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                          placeholder="Share how this product helped you."
                          required
                          minLength={20}
                          maxLength={4000}
                        />
                      </label>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <Button disabled={reviewBusy} onClick={() => void submitReview()}>
                          {reviewBusy ? "Submitting…" : "Submit review"}
                        </Button>
                        {reviewNotice && <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{reviewNotice}</p>}
                      </div>
                    </>
                  )}
                </div>
              )}
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

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Your selection</p>
            <p className="mt-2 text-sm font-semibold text-ink dark:text-white">{selectedFormat?.label || "Library product"}</p>
            {(() => {
              const sellPrice = selectedFormat?.price ?? product.price;
              const compareAt = selectedFormat ? libraryFormatCompareAt(selectedFormat) : undefined;
              return (
                <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <p className="text-3xl font-semibold tracking-tight text-ink dark:text-white">
                    {product.currency} {sellPrice.toFixed(2)}
                  </p>
                  {compareAt != null && (
                    <p className="text-sm text-slate-400 line-through">
                      {product.currency} {compareAt.toFixed(2)}
                    </p>
                  )}
                </div>
              );
            })()}
            {formats.length > 1 && (
              <div className="mt-4 grid gap-2">
                {formats.map((format) => {
                  const compareAt = libraryFormatCompareAt(format);
                  return (
                    <button
                      key={`aside-${format.id}`}
                      type="button"
                      onClick={() => setSelectedFormatId(format.id)}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition",
                        selectedFormat?.id === format.id ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" : "border-slate-200 dark:border-slate-700",
                      )}
                    >
                      <span className="font-semibold">{format.label}</span>
                      <span className="text-right">
                        <span className="block font-bold">{product.currency} {format.price.toFixed(2)}</span>
                        {compareAt != null && (
                          <span className="block text-xs text-slate-400 line-through">
                            {product.currency} {compareAt.toFixed(2)}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="mt-5 grid gap-2">
              <Button disabled={outOfStock} onClick={buyNow}>
                <ShoppingCart className="size-4" /> {product.preorder ? "Pre-order now" : "Buy now"}
              </Button>
              <Button variant="secondary" disabled={outOfStock} onClick={addToCart}>
                <ShoppingBag className="size-4" /> {productQuantity ? `In bag (${productQuantity})` : "Add to cart"}
              </Button>
              {sampleUrl ? (
                <Button variant="secondary" onClick={() => setPreviewOpen(true)}>
                  <FileText className="size-4" /> Read sample PDF
                </Button>
              ) : null}
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
                ["ISBN", product.isbn],
                ["Language", product.language],
                ["Pages", product.pages?.toString()],
                ["SKU", product.sku],
                ["Formats", formats.map((format) => `${format.label} (${product.currency} ${format.price.toFixed(2)})`).join(", ") || product.productType.replace(/_/g, " ")],
              ]
                .filter(([, value]) => Boolean(value?.toString().trim()))
                .map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 dark:border-slate-800">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="text-right font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          {whoThisIsFor.length > 0 ? (
            <Panel title="Who This Is For" icon={Users}>
              <div className="flex flex-wrap gap-2">
                {whoThisIsFor.map((item) => (
                  <span key={item} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold dark:bg-slate-800">
                    {item}
                  </span>
                ))}
              </div>
            </Panel>
          ) : null}
        </aside>
      </section>

      {related.length > 0 ? (
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
          <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
            {related.map((item) => (
              <LibraryProductCard
                key={item.id}
                product={item}
                quantity={quantityFor(item.id)}
                onAdd={() => requestAddRelated(item)}
              />
            ))}
          </div>
        </section>
      ) : null}

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

    </main>
  );
}

function isLibrarySampleFile(file: LibraryProduct["downloads"][number]) {
  if (!file.previewable || !file.fileUrl) return false;
  return /sample|preview/i.test(`${file.label || ""} ${file.fileName || ""}`);
}

function HeroProof({ icon: Icon, label }: { icon: typeof ShieldCheck; label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-3 dark:border-slate-800 dark:bg-slate-950/50">
      <Icon className="size-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
      <p className="text-sm font-semibold leading-snug text-slate-700 dark:text-slate-200">{label}</p>
    </div>
  );
}

function readableSubtitle(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const letters = trimmed.replace(/[^A-Za-z]/g, "");
  if (!letters) return trimmed;
  const upperRatio = [...letters].filter((char) => char === char.toUpperCase() && char !== char.toLowerCase()).length / letters.length;
  if (upperRatio < 0.75) return trimmed;
  const lowered = trimmed.toLowerCase();
  return lowered.replace(/(^\s*[a-z])|([.!?]\s+[a-z])/g, (match) => match.toUpperCase());
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
