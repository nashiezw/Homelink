"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Download,
  Expand,
  FileText,
  Heart,
  HelpCircle,
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
import { LibraryBulkQuoteDialog } from "@/components/library/library-bulk-quote-dialog";
import { LibraryCartFab } from "@/components/library/library-cart-fab";
import { LibraryExitIntentCapture } from "@/components/library/library-exit-intent-capture";
import { LibraryFormatPickerDialog } from "@/components/library/library-format-picker-dialog";
import { LibraryProductCard } from "@/components/library/library-product-card";
import { PdfSampleViewer } from "@/components/library/pdf-sample-viewer";
import { WhatsAppHelpLink } from "@/components/layout/whatsapp-help-link";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { trackEvent } from "@/lib/analytics/client";
import { getExperimentVariant } from "@/lib/analytics/experiments";
import { apiFetch } from "@/lib/api/client";
import { displayImageUrl } from "@/lib/images/display-image";
import {
  notifyLibraryCartAdded,
  repriceLibraryCartLine,
  sameLibraryCartLine,
  trackLibraryCartEvent,
  writeLibraryCart,
  useLibraryCart,
} from "@/lib/library/cart-client";
import { setHouseLinkBottomDock } from "@/lib/ui/bottom-dock";
import {
  applyLibraryBundlePromo,
  availableLibraryFormats,
  enabledLibraryFormats,
  libraryDiscountPercent,
  libraryFormatCompareAt,
  libraryFormatInStock,
  libraryVolumePricing,
  maxLibraryPrintQuantity,
  normalizeLibraryVolumeTiers,
  pickLibraryBundleFormat,
  primaryLibraryFormat,
  resolveBundlePreferredType,
  resolveLibraryVolumeUnitPrice,
  type LibraryProduct,
  type LibraryProductFormat,
} from "@/lib/library/catalog";
import { findPreparedLibrarySample, isLibrarySampleCandidate, type PreparedLibrarySample } from "@/lib/library/sample-preview";
import { cn } from "@/lib/utils";

export function LibraryProductPage({
  product,
  related,
  bundleCompanions = [],
  reviews: initialReviews = [],
}: {
  product: LibraryProduct;
  related: LibraryProduct[];
  bundleCompanions?: LibraryProduct[];
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
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [bulkQuoteMinQty, setBulkQuoteMinQty] = useState(20);
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
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: "",
    body: "",
    displayName: "",
    guestName: "",
    guestContact: "",
    purchaseSource: "WEBSITE",
  });
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewNotice, setReviewNotice] = useState("");
  const [softcopyBadgeVariant, setSoftcopyBadgeVariant] = useState("control");
  const [sampleTouched, setSampleTouched] = useState(false);

  useEffect(() => {
    setSoftcopyBadgeVariant(getExperimentVariant("library_softcopy_badge", ["control", "save_callout"]));
  }, []);

  useEffect(() => {
    void apiFetch<{
      reviews?: {
        enabled?: boolean;
        requirePurchase?: boolean;
        minRating?: number;
        autoApprove?: boolean;
        allowGuestNames?: boolean;
      };
      checkout?: { bulkQuoteMinQty?: number };
    }>("/api/v1/library/settings").then((result) => {
      const reviewsCfg = result.data?.reviews;
      if (result.data?.checkout?.bulkQuoteMinQty) {
        setBulkQuoteMinQty(Math.max(5, Number(result.data.checkout.bulkQuoteMinQty) || 20));
      }
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
  const selectedFormat = formats.find((format) => format.id === selectedFormatId) ?? formats[0];
  const [bundleFormatIds, setBundleFormatIds] = useState<Record<string, string>>({});

  useEffect(() => {
    const preferred = resolveBundlePreferredType(product.bundleFormatPreference, selectedFormat?.type ?? null);
    const next: Record<string, string> = {};
    for (const item of bundleCompanions) {
      next[item.id] = pickLibraryBundleFormat(item, preferred).id;
    }
    setBundleFormatIds(next);
  }, [bundleCompanions, selectedFormat?.type, product.id, product.bundleFormatPreference]);

  const bundleLines = useMemo(() => {
    if (!selectedFormat || !bundleCompanions.length) return [];
    const preferred = resolveBundlePreferredType(product.bundleFormatPreference, selectedFormat.type);
    const companions = bundleCompanions.map((item) => {
      const formatsForItem = availableLibraryFormats(item);
      const pool = formatsForItem.length ? formatsForItem : enabledLibraryFormats(item);
      const format =
        pool.find((entry) => entry.id === bundleFormatIds[item.id]) ??
        pickLibraryBundleFormat(item, preferred);
      return { product: item, format };
    });
    const rows = [{ product, format: selectedFormat }, ...companions];
    const formatTypes = rows.map((row) => row.format.type);
    const promo = applyLibraryBundlePromo(
      rows.map((row) => row.format.price),
      product.bundlePromoPrice,
      formatTypes,
    );
    return rows.map((row, index) => ({
      ...row,
      chargedPrice: promo.linePrices[index] ?? row.format.price,
      listPrice: row.format.price,
      subtotal: promo.subtotal,
      total: promo.total,
      savings: promo.savings,
      inStock: libraryFormatInStock(row.product, row.format),
      promoApplies: promo.savings > 0,
    }));
  }, [bundleCompanions, bundleFormatIds, product, selectedFormat]);

  const bundleSavings = bundleLines[0]?.savings ?? 0;
  const bundleSubtotal = bundleLines[0]?.subtotal ?? 0;
  const bundleTotal = bundleLines[0]?.total ?? 0;
  const bundleAvailable = bundleLines.length > 1 && bundleLines.every((line) => line.inStock);
  const bundleIncludesPrint = bundleLines.some((line) => line.format.type === "PRINTED_BOOK");
  const bundlePromoDigitalOnly =
    Boolean(product.bundlePromoPrice) &&
    bundleIncludesPrint &&
    bundleSavings <= 0;

  function unlockDigitalBundlePromo() {
    const next: Record<string, string> = {};
    for (const item of bundleCompanions) {
      next[item.id] = pickLibraryBundleFormat(item, "PDF", { requireInStock: false }).id;
    }
    setBundleFormatIds(next);
    if (selectedFormat?.type === "PRINTED_BOOK") {
      const digital = availableLibraryFormats(product).find((format) => format.type !== "PRINTED_BOOK")
        ?? enabledLibraryFormats(product).find((format) => format.type !== "PRINTED_BOOK");
      if (digital) chooseFormat(digital.id, "bundle_unlock");
    }
  }
  const bundlePreferenceLabel =
    product.bundleFormatPreference === "PREFER_DIGITAL"
      ? "Defaults to digital"
      : product.bundleFormatPreference === "PREFER_PRINT"
        ? "Defaults to printed"
        : "Matches your selected format";

  const productQuantity = cart
    .filter((line) => line.productId === product.id && (!line.formatId || line.formatId === selectedFormat?.id))
    .reduce((sum, line) => sum + line.quantity, 0);
  const galleryImages = useMemo(
    () => product.gallery.filter((item) => item.kind !== "video" && Boolean(item.url)),
    [product.gallery],
  );
  const activeGalleryImage = galleryImages[galleryIndex] ?? galleryImages[0];
  const activeGalleryDisplayUrl = displayImageUrl(activeGalleryImage?.url, { width: 900 });
  const isPrinted = selectedFormat?.type === "PRINTED_BOOK";
  const outOfStock = Boolean(isPrinted && product.stock === 0);
  const maxPrintQty = maxLibraryPrintQuantity(product);
  const [printQty, setPrintQty] = useState(1);
  useEffect(() => {
    setPrintQty(1);
  }, [product.id, selectedFormatId]);
  useEffect(() => {
    if (!isPrinted) return;
    setPrintQty((current) => Math.min(Math.max(1, current), Math.max(1, maxPrintQty || 1)));
  }, [isPrinted, maxPrintQty]);
  const volumeTiers = useMemo(
    () =>
      selectedFormat?.type === "PRINTED_BOOK"
        ? normalizeLibraryVolumeTiers(selectedFormat.volumeTiers, selectedFormat.price)
        : [],
    [selectedFormat],
  );
  const selectedQty = isPrinted ? printQty : 1;
  const volumePricing = selectedFormat
    ? libraryVolumePricing(selectedFormat, selectedQty)
    : null;
  const printStockLabel =
    product.stock == null
      ? "Printed stock available"
      : product.stock > 0
        ? `${product.stock} printed ${product.stock === 1 ? "copy" : "copies"} in stock`
        : "Printed format out of stock";
  const sampleFile = useMemo(
    () => product.downloads.find(isLibrarySampleFile) ?? preparedSampleToDownload(findPreparedLibrarySample({ slug: product.slug, title: product.title })),
    [product.downloads, product.slug, product.title],
  );
  const sampleUrl = sampleFile ? `/api/v1/library/products/${encodeURIComponent(product.slug)}/sample` : null;
  const sampleDownloadUrl = sampleUrl ? `${sampleUrl}?download=1` : null;
  const sampleMeta = useMemo(() => {
    if (!sampleFile) return null;
    const size = sampleFile.size || formatSampleSize(sampleFile.fileSizeBytes);
    return {
      label: sampleFile.label?.trim() || "Sample preview",
      size,
      type: sampleFile.fileType || "PDF",
    };
  }, [sampleFile]);
  const learningOutcomes = product.learningOutcomes.filter((item) => item.trim());
  const tableOfContents = product.tableOfContents.filter((item) => item.trim());
  const whoThisIsFor = product.whoThisIsFor.filter((item) => item.trim());
  const includedDownloads = product.downloads.filter((item) => item.label?.trim() && !isLibrarySampleFile(item));
  const decisionAudience = whoThisIsFor.slice(0, 3).join(", ") || `${product.category} buyers`;
  const decisionDownloads = includedDownloads.slice(0, 2).map((item) => item.label).join(", ") || `${selectedFormat?.label || "Library resource"} access`;
  const urgencySignals = [
    product.bestSeller ? "Best seller" : "",
    product.newRelease ? "New release" : "",
    product.viewCount >= 25 ? `Viewed ${product.viewCount} times` : "",
    selectedFormat?.type === "PRINTED_BOOK" && product.stock != null && product.stock <= Math.max(1, product.lowStockThreshold) && product.stock > 0
      ? `${product.stock} printed ${product.stock === 1 ? "copy" : "copies"} left`
      : "",
    selectedFormat?.type !== "PRINTED_BOOK" ? "Digital access after payment confirmation" : "",
  ].filter(Boolean);
  const buyerFaqs = buildBuyerFaqs({
    productTitle: product.title,
    selectedFormatLabel: selectedFormat?.label || "this format",
    isPrinted,
    sampleAvailable: Boolean(sampleUrl),
    printStockLabel,
    currency: product.currency,
    price: selectedFormat?.price ?? product.price,
  });
  const shortDescription = product.shortDescription?.replace(/\s+/g, " ").trim() || "";
  const heroHeadline = product.salesHeadline?.replace(/\s+/g, " ").trim() || product.title;
  const heroPitch = product.shortMarketingPitch?.replace(/\s+/g, " ").trim() || product.subtitle?.replace(/\s+/g, " ").trim() || "";
  const fullDescription = product.description?.trim() || "";
  const compactFullDescription = fullDescription.replace(/\s+/g, " ").trim();
  const summaryExcerpt =
    shortDescription && shortDescription !== compactFullDescription
      ? shortDescription
      : compactFullDescription
        ? compactFullDescription.length > 220
          ? `${compactFullDescription.slice(0, 217).trimEnd()}...`
          : compactFullDescription
        : "";
  const showFullDescription = Boolean(fullDescription && compactFullDescription !== summaryExcerpt);

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
    trackEvent("library_product_viewed", product.id, {
      slug: product.slug,
      title: product.title,
      productId: product.id,
    });
  }, [product.id, product.slug, product.title]);

  // Tell floating FABs to clear the mobile "Add bundle" dock.
  useEffect(() => {
    const sync = () => {
      const showDock = bundleLines.length > 1 && typeof window !== "undefined" && window.innerWidth < 1024;
      setHouseLinkBottomDock(showDock ? "library-bundle" : null);
    };
    sync();
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("resize", sync);
      setHouseLinkBottomDock(null);
    };
  }, [bundleLines.length]);

  useEffect(() => {
    if (bundleLines.length > 1) {
      trackEvent("library_bundle_shown", product.id, {
        title: product.title,
        companions: bundleLines.length - 1,
      });
    }
  }, [bundleLines.length, product.id, product.title]);

  function trackSampleOpened(surface: string) {
    setSampleTouched(true);
    trackEvent("library_sample_opened", product.id, { title: product.title, slug: product.slug, surface });
  }

  function openSamplePreview(surface: string) {
    trackSampleOpened(surface);
    trackEvent("library_cta_clicked", product.id, { title: product.title, slug: product.slug, cta: "preview_sample", surface });
    setPreviewOpen(true);
  }

  function openSampleInNewTab(surface: string) {
    if (!sampleUrl) return;
    setSampleTouched(true);
    trackEvent("library_sample_viewed", product.id, { title: product.title, slug: product.slug, surface });
    window.open(sampleUrl, "_blank", "noopener,noreferrer");
  }

  function downloadSample(surface: string) {
    if (!sampleDownloadUrl) return;
    setSampleTouched(true);
    trackEvent("library_sample_downloaded", product.id, { title: product.title, slug: product.slug, surface });
    window.open(sampleDownloadUrl, "_blank", "noopener,noreferrer");
  }

  function chooseFormat(formatId: string, surface: string) {
    setSelectedFormatId(formatId);
    const format = formats.find((item) => item.id === formatId);
    trackEvent("library_format_selected", product.id, {
      title: product.title,
      slug: product.slug,
      formatId,
      formatType: format?.type,
      formatLabel: format?.label,
      surface,
    });
  }

  function trackFaqOpened(question: string, open: boolean) {
    if (!open) return;
    trackEvent("library_faq_opened", product.id, { title: product.title, slug: product.slug, question });
  }

  useEffect(() => {
    const marks = new Set<number>();
    function onScroll() {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const pct = Math.round((window.scrollY / max) * 100);
      for (const mark of [25, 50, 75, 100]) {
        if (pct >= mark && !marks.has(mark)) {
          marks.add(mark);
          trackEvent("library_scroll_depth", product.id, { title: product.title, depth: mark });
        }
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [product.id, product.title]);

  useEffect(() => {
    setReviews(initialReviews);
    setRatingSummary({ average: product.rating, count: product.reviewCount });
  }, [product.id, product.rating, product.reviewCount, initialReviews]);

  useEffect(() => {
    if (!user) {
      setWished(false);
      return;
    }
    void apiFetch<{ wished: boolean }>(`/api/v1/library/wishlist?productId=${encodeURIComponent(product.id)}`).then((result) => {
      if (result.data) setWished(result.data.wished);
    });
  }, [product.id, user]);

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
    if (!user && reviewForm.guestName.trim().length < 2) {
      setReviewNotice("Add your name so the team can verify the review.");
      return;
    }
    if (!user && !reviewForm.guestContact.trim()) {
      setReviewNotice("Add a phone number or email. It is only visible to HouseLink admins.");
      return;
    }
    if (reviewForm.displayName.trim() && reviewForm.displayName.trim().length < 2) {
      setReviewNotice("Display name must be at least 2 characters.");
      return;
    }
    const guestContact = reviewForm.guestContact.trim();
    const guestEmail = guestContact.includes("@") ? guestContact : undefined;
    const guestPhone = guestContact.includes("@") ? undefined : guestContact;
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
        displayName: reviewForm.displayName || reviewForm.guestName || undefined,
        guestName: user ? undefined : reviewForm.guestName,
        guestEmail,
        guestPhone,
        purchaseSource: reviewForm.purchaseSource,
      }),
    });
    setReviewBusy(false);
    if (result.error) {
      setReviewNotice(result.error.message || "Could not submit review.");
      return;
    }
    setReviewForm({ rating: 5, title: "", body: "", displayName: "", guestName: "", guestContact: "", purchaseSource: "WEBSITE" });
    setReviewNotice(
      result.data?.autoApproved
        ? "Thanks — your review is live."
        : "Thank you for your review! Your review has been submitted and will appear once approved.",
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

  function cartLineFromFormat(format: LibraryProductFormat, quantity = 1) {
    const qty =
      format.type === "PRINTED_BOOK"
        ? Math.min(Math.max(1, quantity), Math.max(1, maxPrintQty || 1))
        : Math.max(1, quantity);
    const tiers =
      format.type === "PRINTED_BOOK" ? normalizeLibraryVolumeTiers(format.volumeTiers, format.price) : [];
    const unitPrice = resolveLibraryVolumeUnitPrice(format, qty);
    return {
      productId: product.id,
      title: `${product.title} (${format.label})`,
      price: unitPrice,
      listPrice: format.price,
      currency: product.currency,
      quantity: qty,
      formatId: format.id,
      formatType: format.type,
      formatLabel: format.label,
      volumeTiers: tiers.length ? tiers : undefined,
    };
  }

  function addToCart() {
    if (!selectedFormat) return;
    trackEvent("library_cta_clicked", product.id, { title: product.title, slug: product.slug, cta: "add_to_cart", formatId: selectedFormat.id });
    const qty = selectedQty;
    setCart((current) => {
      const existing = current.find((line) => line.productId === product.id && line.formatId === selectedFormat.id);
      if (existing) {
        const nextQty =
          selectedFormat.type === "PRINTED_BOOK"
            ? Math.min(existing.quantity + qty, Math.max(1, maxPrintQty || 1))
            : existing.quantity + qty;
        return current.map((line) =>
          line.productId === product.id && line.formatId === selectedFormat.id
            ? repriceLibraryCartLine(
                {
                  ...line,
                  listPrice: selectedFormat.price,
                  volumeTiers:
                    selectedFormat.type === "PRINTED_BOOK"
                      ? normalizeLibraryVolumeTiers(selectedFormat.volumeTiers, selectedFormat.price)
                      : undefined,
                },
                nextQty,
              )
            : line,
        );
      }
      return [...current, cartLineFromFormat(selectedFormat, qty)];
    });
    notifyLibraryCartAdded(product.title);
    trackLibraryCartEvent("CART_ADD_SINGLE", product.id, {
      title: product.title,
      productId: product.id,
      formatId: selectedFormat.id,
      formatType: selectedFormat.type,
      formatLabel: selectedFormat.label,
      price: resolveLibraryVolumeUnitPrice(selectedFormat, qty),
      quantity: qty,
    });
    showToast(qty > 1 ? `Added ${qty} to your bag.` : "Added to your bag.", "success");
  }

  function buyNow() {
    if (!selectedFormat) return;
    trackEvent("library_cta_clicked", product.id, { title: product.title, slug: product.slug, cta: "buy_now", formatId: selectedFormat.id });
    const line = cartLineFromFormat(selectedFormat, selectedQty);
    writeLibraryCart([line]);
    trackLibraryCartEvent("CART_ADD_SINGLE", product.id, {
      title: product.title,
      productId: product.id,
      formatId: selectedFormat.id,
      formatType: selectedFormat.type,
      formatLabel: selectedFormat.label,
      price: line.price,
      quantity: line.quantity,
      buyNow: true,
    });
    window.location.href = "/library/checkout";
  }

  function addBundle() {
    if (!selectedFormat || !bundleAvailable) return;
    setCart((current) => {
      let next = [...current];
      for (const line of bundleLines) {
        const tiers =
          line.format.type === "PRINTED_BOOK"
            ? normalizeLibraryVolumeTiers(line.format.volumeTiers, line.format.price)
            : [];
        const incoming = repriceLibraryCartLine(
          {
            productId: line.product.id,
            title: `${line.product.title} (${line.format.label})`,
            price: line.chargedPrice,
            listPrice: line.format.price,
            currency: line.product.currency,
            quantity: 1,
            formatId: line.format.id,
            formatType: line.format.type,
            formatLabel: line.format.label,
            volumeTiers: tiers.length ? tiers : undefined,
          },
          1,
        );
        // Keep curated bundle unit price at qty 1; volume tiers apply when qty increases later.
        incoming.price = line.chargedPrice;
        const existingIndex = next.findIndex((entry) => sameLibraryCartLine(entry, incoming));
        if (existingIndex >= 0) {
          next = next.map((entry, index) =>
            index === existingIndex
              ? repriceLibraryCartLine(
                  {
                    ...entry,
                    listPrice: line.format.price,
                    volumeTiers: tiers.length ? tiers : entry.volumeTiers,
                  },
                  entry.quantity + 1,
                )
              : entry,
          );
        } else {
          next = [...next, incoming];
        }
      }
      return next;
    });
    notifyLibraryCartAdded(product.title);
    trackLibraryCartEvent("CART_ADD_BUNDLE", product.id, {
      title: product.title,
      productId: product.id,
      companionCount: bundleCompanions.length,
      total: bundleTotal,
      savings: bundleSavings,
    });
    showToast(
      bundleSavings > 0
        ? `Bundle added · you save ${product.currency} ${bundleSavings.toFixed(2)}.`
        : "Bundle added to your bag.",
      "success",
    );
  }

  function quantityFor(productId: string) {
    return cart.filter((line) => line.productId === productId).reduce((sum, line) => sum + line.quantity, 0);
  }

  function addRelatedFormatToCart(target: LibraryProduct, format: LibraryProductFormat) {
    const tiers =
      format.type === "PRINTED_BOOK" ? normalizeLibraryVolumeTiers(format.volumeTiers, format.price) : [];
    const maxQty = format.type === "PRINTED_BOOK" ? maxLibraryPrintQuantity(target) : 99;
    setCart((current) => {
      const existing = current.find((line) => sameLibraryCartLine(line, { productId: target.id, formatId: format.id }));
      if (existing) {
        const nextQty = Math.min(existing.quantity + 1, Math.max(1, maxQty || 1));
        return current.map((line) =>
          sameLibraryCartLine(line, { productId: target.id, formatId: format.id })
            ? repriceLibraryCartLine(
                {
                  ...line,
                  listPrice: format.price,
                  volumeTiers: tiers.length ? tiers : undefined,
                },
                nextQty,
              )
            : line,
        );
      }
      return [
        ...current,
        repriceLibraryCartLine(
          {
            productId: target.id,
            title: `${target.title} (${format.label})`,
            price: format.price,
            listPrice: format.price,
            currency: target.currency,
            quantity: 1,
            formatId: format.id,
            formatType: format.type,
            formatLabel: format.label,
            volumeTiers: tiers.length ? tiers : undefined,
          },
          1,
        ),
      ];
    });
    notifyLibraryCartAdded(target.title);
    trackLibraryCartEvent("CART_ADD_SINGLE", target.id, {
      title: target.title,
      productId: target.id,
      formatId: format.id,
      formatType: format.type,
      formatLabel: format.label,
      price: format.price,
      source: "related",
    });
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
    <main className={cn("bg-mist text-ink dark:bg-slate-950 dark:text-white", bundleLines.length > 1 && "pb-24 lg:pb-0")}>
      <LibraryExitIntentCapture
        productId={product.id}
        productTitle={product.title}
        productSlug={product.slug}
        surface="product"
        highIntent={sampleTouched || productQuantity > 0 || count > 0}
      />
      <LibraryCartFab />
      {quoteOpen ? (
        <LibraryBulkQuoteDialog
          product={product}
          quantity={selectedQty}
          formatType={selectedFormat?.type}
          onClose={() => setQuoteOpen(false)}
          onSubmitted={() => {
            setQuoteOpen(false);
            showToast("Quote request sent. We’ll email you shortly.", "success");
          }}
        />
      ) : null}
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
                        src={activeGalleryDisplayUrl || activeGalleryImage.url}
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
              <h1 className="mt-4 max-w-[40rem] text-balance text-[1.85rem] font-black leading-[1.12] tracking-normal text-ink sm:text-[2.35rem] sm:leading-[1.08] dark:text-white">
                {heroHeadline}
              </h1>
              {heroHeadline !== product.title ? (
                <p className="mt-2 max-w-[34rem] text-[0.8rem] font-semibold leading-5 text-slate-500 dark:text-slate-400">
                  <span className="text-slate-400 dark:text-slate-500">Book title:</span> {product.title}
                </p>
              ) : null}
              {heroPitch ? (
                <p className="mt-5 max-w-[34rem] text-[1rem] leading-7 text-slate-600 dark:text-slate-300">
                  {readableSubtitle(heroPitch)}
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
                          onClick={() => chooseFormat(format.id, "hero_format_picker")}
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
                              {softcopyBadgeVariant === "save_callout" && format.type !== "PRINTED_BOOK"
                                ? `Soft copy — save ${discount}% vs print`
                                : `Save ${discount}%`}
                            </span>
                          )}
                          {discount == null && softcopyBadgeVariant === "save_callout" && format.type !== "PRINTED_BOOK" ? (
                            <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                              Soft copy · instant download
                            </span>
                          ) : null}
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
                  const sellPrice = volumePricing?.unitPrice ?? selectedFormat?.price ?? product.price;
                  const listPrice = volumePricing?.listPrice ?? selectedFormat?.price ?? product.price;
                  const compareAt =
                    volumePricing && volumePricing.savingsPerUnit > 0
                      ? listPrice
                      : (selectedFormat ? libraryFormatCompareAt(selectedFormat) : undefined) ??
                        (product.compareAtPrice != null && product.compareAtPrice > sellPrice
                          ? product.compareAtPrice
                          : undefined);
                  const discount =
                    volumePricing && volumePricing.savingsPercent > 0
                      ? volumePricing.savingsPercent
                      : libraryDiscountPercent(sellPrice, compareAt);
                  return (
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <p className="text-[2rem] font-semibold tracking-tight text-ink dark:text-white">
                        {product.currency} {sellPrice.toFixed(2)}
                        {isPrinted && selectedQty > 1 ? (
                          <span className="ml-2 text-base font-semibold text-slate-500">each</span>
                        ) : null}
                      </p>
                      {compareAt != null && compareAt > sellPrice + 0.001 && (
                        <p className="text-base text-slate-400 line-through">
                          {product.currency} {compareAt.toFixed(2)}
                        </p>
                      )}
                      {discount != null && discount > 0 && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                          Save {discount}%
                        </span>
                      )}
                    </div>
                  );
                })()}
                {isPrinted && volumePricing && selectedQty > 1 ? (
                  <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Line total {product.currency} {volumePricing.lineTotal.toFixed(2)}
                    {volumePricing.savingsTotal > 0 ? (
                      <span className="text-emerald-700 dark:text-emerald-300">
                        {" "}
                        · you save {product.currency} {volumePricing.savingsTotal.toFixed(2)}
                      </span>
                    ) : null}
                  </p>
                ) : null}
                <p className="mt-2 text-sm leading-6 text-emerald-800 dark:text-emerald-200">
                  {isPrinted ? printStockLabel : "Instant digital delivery after payment confirmation"}
                </p>
                {isPrinted && !outOfStock ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Quantity</p>
                    <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        disabled={printQty <= 1}
                        onClick={() => setPrintQty((current) => Math.max(1, current - 1))}
                        className="grid size-9 place-items-center text-slate-500 hover:text-emerald-700 disabled:opacity-40"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="w-10 text-center text-sm font-black tabular-nums">{printQty}</span>
                      <button
                        type="button"
                        disabled={printQty >= maxPrintQty}
                        onClick={() => setPrintQty((current) => Math.min(maxPrintQty, current + 1))}
                        className="grid size-9 place-items-center text-slate-500 hover:text-emerald-700 disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    {product.stock != null ? (
                      <p className="text-xs text-slate-500">Max {maxPrintQty} in stock</p>
                    ) : null}
                  </div>
                ) : null}
                {product.productType === "BUNDLE" && bundleCompanions.length > 0 ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">This pack includes</p>
                    <ul className="mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                      {bundleCompanions.map((item) => (
                        <li key={item.id}>
                          <Link href={`/library/${item.slug}`} className="font-semibold hover:text-emerald-700">
                            {item.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {isPrinted && volumePricing?.nextTier && product.stock != null && product.stock < volumePricing.nextTier.minQty ? (
                  <p className="mt-3 text-sm font-semibold text-amber-700 dark:text-amber-300">
                    Only {product.stock} left — bulk tier needs {volumePricing.nextTier.minQty}.{" "}
                    <button type="button" className="underline" onClick={() => setQuoteOpen(true)}>
                      Request a firm quote
                    </button>
                  </p>
                ) : null}
                {isPrinted && selectedQty >= bulkQuoteMinQty ? (
                  <p className="mt-3 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                    Ordering {selectedQty}+ copies?{" "}
                    <button type="button" className="underline" onClick={() => setQuoteOpen(true)}>
                      Request a bulk quote
                    </button>
                  </p>
                ) : null}
                {isPrinted && volumeTiers.length > 0 ? (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-200">
                      Bulk pricing (printed)
                    </p>
                    <ul className="mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                      <li>
                        1–{volumeTiers[0].minQty - 1} copies · {product.currency}{" "}
                        {(selectedFormat?.price ?? product.price).toFixed(2)} each
                      </li>
                      {volumeTiers.map((tier, index) => {
                        const next = volumeTiers[index + 1];
                        const range = next ? `${tier.minQty}–${next.minQty - 1}` : `${tier.minQty}+`;
                        const list = selectedFormat?.price ?? product.price;
                        const savePct = list > 0 ? Math.round(((list - tier.unitPrice) / list) * 100) : 0;
                        return (
                          <li key={tier.minQty}>
                            {range} copies · {product.currency} {tier.unitPrice.toFixed(2)} each
                            {savePct > 0 ? (
                              <span className="font-semibold text-emerald-700 dark:text-emerald-300"> · save {savePct}%</span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                    {volumePricing?.nextTier ? (
                      <p className="mt-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                        Buy {volumePricing.nextTier.minQty}+ to unlock {product.currency}{" "}
                        {volumePricing.nextTier.unitPrice.toFixed(2)} each
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900 dark:bg-emerald-950/25">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-emerald-800 dark:text-emerald-200">Quick decision check</p>
                  <div className="mt-3 grid gap-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                    <p className="flex gap-2">
                      <Users className="mt-1 size-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
                      <span><strong>Best for:</strong> {decisionAudience}</span>
                    </p>
                    <p className="flex gap-2">
                      <Download className="mt-1 size-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
                      <span><strong>You get:</strong> {decisionDownloads}</span>
                    </p>
                    <p className="flex gap-2">
                      <ShieldCheck className="mt-1 size-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
                      <span><strong>Access:</strong> {isPrinted ? printStockLabel : "available after payment confirmation, with your invoice and Library access tracked."}</span>
                    </p>
                  </div>
                  {urgencySignals.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {urgencySignals.slice(0, 3).map((signal) => (
                        <span key={signal} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-100 dark:bg-slate-950 dark:text-emerald-100 dark:ring-emerald-900">
                          {signal}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {sampleUrl ? (
                    <button
                      type="button"
                      onClick={() => openSamplePreview("decision_block")}
                      className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-bold text-emerald-800 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-950 dark:text-emerald-100"
                    >
                      <FileText className="size-4" /> Preview before buying
                    </button>
                  ) : null}
                </div>
                <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  <Button disabled={outOfStock} onClick={buyNow} className="h-11">
                    <ShoppingCart className="size-4" /> {product.preorder ? "Pre-order now" : isPrinted ? "Buy now" : "Get instant access"}
                  </Button>
                  <Button variant="secondary" disabled={outOfStock} onClick={addToCart} className="h-11">
                    <ShoppingBag className="size-4" /> {productQuantity ? `In bag (${productQuantity})` : "Add to cart"}
                  </Button>
                </div>
                <WhatsAppHelpLink
                  context={{ source: "library_product", lane: "library", productTitle: product.title }}
                  className="mt-3 inline-flex text-sm font-semibold text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300"
                >
                  Questions? WhatsApp us about this book
                </WhatsAppHelpLink>
                {isPrinted ? (
                  <button
                    type="button"
                    onClick={() => setQuoteOpen(true)}
                    className="mt-3 text-sm font-semibold text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300"
                  >
                    Need 20+ printed copies or a team pack? Request a quote
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setQuoteOpen(true)}
                    className="mt-3 text-sm font-semibold text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300"
                  >
                    Need multi-seat / team digital access? Request a quote
                  </button>
                )}
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
                      <Image src={displayImageUrl(item.url, { width: 120, height: 120, crop: "fill" }) || item.url} alt={item.label || product.title} fill sizes="54px" className="object-cover" />
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
              <FormattedProductDescription text={fullDescription} />
            </section>
          ) : null}

          {learningOutcomes.length > 0 ? (
            <section className="overflow-hidden rounded-3xl border border-slate-200/90 bg-slate-50/70 p-5 shadow-soft dark:border-slate-800 dark:bg-slate-950/35 sm:p-7">
              <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink dark:text-white">
                <Layers3 className="size-5 text-emerald-700 dark:text-emerald-300" /> What you get
              </h2>
              <ol className="mt-5 grid gap-2">
                {learningOutcomes.slice(0, 6).map((item, index) => (
                  <li key={item} className="grid min-h-12 grid-cols-[2.75rem_minmax(0,1fr)] items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <span className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{String(index + 1).padStart(2, "0")}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {sampleUrl && sampleMeta ? (
            <Panel
              title="Sample Preview"
              icon={BookOpen}
              action={
                <Button variant="secondary" onClick={() => openSamplePreview("side_cta")}>
                  <FileText className="size-4" /> Preview
                </Button>
              }
            >
              <div className="grid gap-5 md:grid-cols-[12rem_minmax(0,1fr)] md:items-center">
                <BookCover product={product} className="w-full rounded-xl" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    <span>{sampleMeta.type} sample</span>
                    {sampleMeta.size ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">{sampleMeta.size}</span> : null}
                  </div>
                  <p className="mt-2 text-xl font-semibold leading-snug tracking-tight">Read a free sample before you buy.</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {sampleMeta.label}. Open it inline, view it in a new tab, or download the preview for later.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button onClick={() => openSamplePreview("panel")}>
                      <FileText className="size-4" /> Preview sample
                    </Button>
                    <Button variant="secondary" onClick={() => openSampleInNewTab("panel")}>
                      <ExternalLink className="size-4" /> Open in new tab
                    </Button>
                    {sampleDownloadUrl ? (
                      <Button variant="secondary" onClick={() => downloadSample("panel")}>
                        <Download className="size-4" /> Download sample
                      </Button>
                    ) : null}
                  </div>
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

          <Panel title="Before You Buy" icon={HelpCircle}>
            <div className="space-y-2">
              {buyerFaqs.map((faq) => (
                <details
                  key={faq.question}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950"
                  onToggle={(event) => trackFaqOpened(faq.question, event.currentTarget.open)}
                >
                  <summary className="cursor-pointer text-sm font-semibold text-ink dark:text-white">{faq.question}</summary>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{faq.answer}</p>
                </details>
              ))}
            </div>
          </Panel>

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
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white p-4 shadow-sm dark:border-emerald-900/50 dark:from-emerald-950/20 dark:via-slate-950 dark:to-slate-950">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-ink dark:text-white">Bought this book? Share your experience</p>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                        Your feedback helps other readers decide if this book is right for them. We review submissions first, and your phone or email is only used privately for verification.
                      </p>
                    </div>
                    {!user ? (
                      <Link href={`/auth?next=${encodeURIComponent(`/library/${product.slug}`)}`} className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300">
                        Already have an account? Sign in
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                        <ShieldCheck className="size-3.5" /> Signed in
                      </span>
                    )}
                  </div>
                  <div className="mt-4 rounded-xl border border-white bg-white/85 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                      <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
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
                      {!user ? (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <label className="text-sm font-medium">
                            Name <span className="text-xs font-normal text-slate-500">(public)</span>
                            <input
                              value={reviewForm.guestName}
                              onChange={(e) => setReviewForm({ ...reviewForm, guestName: e.target.value })}
                              className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-900"
                              placeholder="Your name"
                              required
                              maxLength={80}
                            />
                          </label>
                          <label className="text-sm font-medium">
                            Phone or email <span className="text-xs font-normal text-slate-500">(private)</span>
                            <input
                              value={reviewForm.guestContact}
                              onChange={(e) => setReviewForm({ ...reviewForm, guestContact: e.target.value })}
                              className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-900"
                              placeholder="+263... or you@example.com"
                              required
                              maxLength={160}
                            />
                          </label>
                        </div>
                      ) : null}
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="text-sm font-medium">
                          Where did you purchase?
                          <select
                            value={reviewForm.purchaseSource}
                            onChange={(e) => setReviewForm({ ...reviewForm, purchaseSource: e.target.value })}
                            className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-900"
                          >
                            <option value="WEBSITE">Website</option>
                            <option value="WHATSAPP">WhatsApp</option>
                            <option value="IN_STORE">In-store / collection</option>
                            <option value="DELIVERY">Delivery</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </label>
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
                      </div>
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
                        {reviewNotice && (
                          <p className={cn(
                            "text-sm font-semibold",
                            /thank|live/i.test(reviewNotice) ? "text-emerald-700 dark:text-emerald-300" : "text-slate-600 dark:text-slate-300",
                          )}>
                            {reviewNotice}
                          </p>
                        )}
                      </div>
                  </div>
                </div>
              )}
            </div>
          </Panel>

          {bundleLines.length > 1 && (
            <Panel
              title="Frequently Bought Together"
              icon={ShoppingCart}
              action={
                <Button disabled={!bundleAvailable} onClick={addBundle}>
                  Add bundle to bag
                </Button>
              }
            >
              <p className="mb-3 text-xs font-semibold text-slate-500">
                {bundlePreferenceLabel}. Soft-copy promo applies only when every title is digital — printed picks use full list price.
              </p>
              <div className={cn("grid items-stretch gap-3", bundleLines.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>
                {bundleLines.map((line) => {
                  const itemFormats = availableLibraryFormats(line.product);
                  const isMain = line.product.id === product.id;
                  return (
                    <div
                      key={line.product.id}
                      className={cn(
                        "flex h-full flex-col rounded-xl border bg-[#fbfcfb] p-3 dark:bg-slate-950",
                        isMain ? "border-emerald-400 dark:border-emerald-700" : "border-slate-200 dark:border-slate-800",
                        !line.inStock && "opacity-60",
                      )}
                    >
                      <p className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">{line.format.label}</p>
                      {isMain ? (
                        <p className="mt-1 line-clamp-2 font-semibold">{line.product.title}</p>
                      ) : (
                        <Link href={`/library/${line.product.slug}`} className="mt-1 line-clamp-2 font-semibold hover:text-emerald-700">
                          {line.product.title}
                        </Link>
                      )}
                      {!isMain && itemFormats.length > 1 ? (
                        <label className="mt-3 block text-xs font-semibold text-slate-500">
                          Format
                          <select
                            value={line.format.id}
                            onChange={(event) =>
                              setBundleFormatIds((current) => ({ ...current, [line.product.id]: event.target.value }))
                            }
                            className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-ink dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          >
                            {itemFormats.map((format) => (
                              <option key={format.id} value={format.id}>
                                {format.label} · {line.product.currency} {format.price.toFixed(2)}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                      {!line.inStock ? (
                        <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">Printed format out of stock</p>
                      ) : null}
                      <div className="mt-auto flex flex-wrap items-baseline gap-2 pt-3">
                        <p className="text-sm font-semibold tabular-nums">
                          {line.product.currency} {line.listPrice.toFixed(2)}
                        </p>
                        {line.chargedPrice < line.listPrice - 0.001 ? (
                          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                            Bundle {line.product.currency} {line.chargedPrice.toFixed(2)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                <div className="text-sm text-slate-500">
                  {!bundleAvailable ? (
                    <p className="font-semibold text-amber-700 dark:text-amber-300">
                      One or more printed formats are out of stock. Switch formats or try again later.
                    </p>
                  ) : bundleSavings > 0 ? (
                    <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                      Save {product.currency} {bundleSavings.toFixed(2)}
                      <span className="ml-2 font-medium text-slate-400 line-through">
                        {product.currency} {bundleSubtotal.toFixed(2)}
                      </span>
                    </p>
                  ) : bundlePromoDigitalOnly ? (
                    <div className="space-y-2">
                      <p className="font-semibold text-amber-700 dark:text-amber-300">
                        Soft-copy promo paused — printed picks use full list price.
                      </p>
                      <button
                        type="button"
                        onClick={unlockDigitalBundlePromo}
                        className="text-xs font-bold text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300"
                      >
                        Switch all to digital and unlock promo
                      </button>
                    </div>
                  ) : (
                    <p>Choose formats above, then add the bundle to your bag.</p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    Buy separately: {product.currency} {bundleSubtotal.toFixed(2)}
                    {bundleSavings > 0
                      ? ` · Bundle: ${product.currency} ${bundleTotal.toFixed(2)}`
                      : ` · Total: ${product.currency} ${bundleTotal.toFixed(2)}${bundleIncludesPrint ? " (list prices)" : ""}`}
                  </p>
                </div>
                <p className="text-right text-lg font-semibold tracking-tight">
                  Bundle total: {product.currency} {bundleTotal.toFixed(2)}
                </p>
              </div>
            </Panel>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Your selection</p>
            <p className="mt-2 text-sm font-semibold text-ink dark:text-white">{selectedFormat?.label || "Library product"}</p>
            {(() => {
              const sellPrice = volumePricing?.unitPrice ?? selectedFormat?.price ?? product.price;
              const listPrice = volumePricing?.listPrice ?? selectedFormat?.price ?? product.price;
              const compareAt =
                volumePricing && volumePricing.savingsPerUnit > 0
                  ? listPrice
                  : selectedFormat
                    ? libraryFormatCompareAt(selectedFormat)
                    : undefined;
              return (
                <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <p className="text-3xl font-semibold tracking-tight text-ink dark:text-white">
                    {product.currency} {sellPrice.toFixed(2)}
                    {isPrinted && selectedQty > 1 ? (
                      <span className="ml-1 text-sm font-semibold text-slate-500">ea</span>
                    ) : null}
                  </p>
                  {compareAt != null && compareAt > sellPrice + 0.001 && (
                    <p className="text-sm text-slate-400 line-through">
                      {product.currency} {compareAt.toFixed(2)}
                    </p>
                  )}
                </div>
              );
            })()}
            {isPrinted && !outOfStock ? (
              <div className="mt-3 inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  disabled={printQty <= 1}
                  onClick={() => setPrintQty((current) => Math.max(1, current - 1))}
                  className="grid size-8 place-items-center text-slate-500 hover:text-emerald-700 disabled:opacity-40"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="w-8 text-center text-xs font-black">{printQty}</span>
                <button
                  type="button"
                  disabled={printQty >= maxPrintQty}
                  onClick={() => setPrintQty((current) => Math.min(maxPrintQty, current + 1))}
                  className="grid size-8 place-items-center text-slate-500 hover:text-emerald-700 disabled:opacity-40"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            ) : null}
            {formats.length > 1 && (
              <div className="mt-4 grid gap-2">
                {formats.map((format) => {
                  const compareAt = libraryFormatCompareAt(format);
                  return (
                    <button
                      key={`aside-${format.id}`}
                      type="button"
                      onClick={() => chooseFormat(format.id, "sidebar_format_picker")}
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
                <ShoppingCart className="size-4" /> {product.preorder ? "Pre-order now" : isPrinted ? "Buy now" : "Get instant access"}
              </Button>
              <Button variant="secondary" disabled={outOfStock} onClick={addToCart}>
                <ShoppingBag className="size-4" /> {productQuantity ? `In bag (${productQuantity})` : "Add to cart"}
              </Button>
              {sampleUrl ? (
                <Button variant="secondary" onClick={() => openSamplePreview("sticky_bar")}>
                  <FileText className="size-4" /> Preview sample
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
              <ol className="grid gap-2">
                {whoThisIsFor.map((item, index) => (
                  <li key={item} className="grid min-h-12 grid-cols-[2.75rem_minmax(0,1fr)] items-start rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <span className="pt-0.5 text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{String(index + 1).padStart(2, "0")}</span>
                    <span className="text-slate-800 dark:text-slate-100">{item}</span>
                  </li>
                ))}
              </ol>
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
                src={displayImageUrl(activeGalleryImage.url, { width: lightboxZoomed ? 1800 : 1200 }) || activeGalleryImage.url}
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

      {bundleLines.length > 1 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/95">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink dark:text-white">
                Add bundle · {product.currency} {bundleTotal.toFixed(2)}
              </p>
              {bundleSavings > 0 ? (
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Save {product.currency} {bundleSavings.toFixed(2)}
                </p>
              ) : bundlePromoDigitalOnly ? (
                <button
                  type="button"
                  onClick={unlockDigitalBundlePromo}
                  className="truncate text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300"
                >
                  Switch to digital for promo
                </button>
              ) : (
                <p className="truncate text-xs text-slate-500">{bundlePreferenceLabel}</p>
              )}
            </div>
            <Button disabled={!bundleAvailable} onClick={addBundle} className="shrink-0">
              Add bundle
            </Button>
          </div>
        </div>
      ) : null}

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 sm:p-4" onClick={() => setPreviewOpen(false)}>
          <div className="flex h-[92dvh] max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-slate-950" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <p className="min-w-0 truncate font-semibold">{sampleUrl ? "Sample PDF" : "Sample preview"} - {product.title}</p>
              <button type="button" onClick={() => setPreviewOpen(false)} className="rounded-lg px-3 py-1 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-900">
                Close
              </button>
            </div>
            {sampleUrl ? (
              <div className="flex min-h-0 flex-1 flex-col bg-slate-100 dark:bg-slate-900">
                <div className="min-h-0 flex-1">
                  <PdfSampleViewer
                    url={sampleUrl}
                    title={product.title}
                    onViewed={() => trackEvent("library_sample_viewed", product.id, { title: product.title, slug: product.slug, surface: "modal" })}
                  />
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                  <Button variant="secondary" onClick={() => openSampleInNewTab("modal")}>
                    <ExternalLink className="size-4" /> Open in new tab
                  </Button>
                  {sampleDownloadUrl ? (
                    <Button variant="secondary" onClick={() => downloadSample("modal")}>
                      <Download className="size-4" /> Download sample
                    </Button>
                  ) : null}
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
  return isLibrarySampleCandidate(file);
}

function preparedSampleToDownload(sample: PreparedLibrarySample | null): LibraryProduct["downloads"][number] | null {
  if (!sample) return null;
  return {
    id: `prepared-${sample.slug}`,
    label: sample.label,
    fileType: sample.fileType,
    size: sample.size,
    secure: false,
    fileUrl: sample.fileUrl,
    fileName: sample.fileName,
    fileSizeBytes: sample.fileSizeBytes,
    previewable: true,
  };
}

function formatSampleSize(bytes?: number) {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function FormattedProductDescription({ text }: { text: string }) {
  const sections = formatDescriptionSections(text);
  return (
    <div className="mt-4 space-y-4 text-base leading-8 text-slate-700 dark:text-slate-300">
      {sections.map((section, sectionIndex) => (
        <div key={`${section.type}-${sectionIndex}`} className={section.type === "list" ? "space-y-2" : undefined}>
          {section.type === "list" ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {section.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`} className="flex gap-2 leading-7">
                  <CheckCircle2 className="mt-1.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={section.emphasis ? "font-semibold text-ink dark:text-white" : undefined}>{section.text}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function formatDescriptionSections(text: string) {
  const prepared = text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+([✓✔])\s+/g, "\n$1 ")
    .replace(/\s+(Inside You(?:'|’)ll Learn:|Inside You Will Learn:|Perfect For:)/gi, "\n\n$1");

  const sections: Array<{ type: "paragraph"; text: string; emphasis?: boolean } | { type: "list"; items: string[] }> = [];
  for (const block of prepared.split(/\n\s*\n/)) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    let paragraphLines: string[] = [];
    let listItems: string[] = [];

    const flushParagraph = () => {
      const paragraph = paragraphLines.join(" ").replace(/\s+/g, " ").trim();
      if (paragraph) {
        sections.push({
          type: "paragraph",
          text: paragraph,
          emphasis: /^[A-Z][A-Za-z\s'’]+:$/.test(paragraph),
        });
      }
      paragraphLines = [];
    };
    const flushList = () => {
      if (listItems.length) sections.push({ type: "list", items: listItems });
      listItems = [];
    };

    for (const line of lines) {
      const listMatch = line.match(/^(?:[-*•]|\d+[.)]|[✓✔])\s+(.+)$/);
      if (listMatch?.[1]) {
        flushParagraph();
        listItems.push(listMatch[1].trim());
      } else {
        flushList();
        paragraphLines.push(line);
      }
    }
    flushParagraph();
    flushList();
  }

  return sections.length ? sections : [{ type: "paragraph" as const, text: text.trim() }];
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

function buildBuyerFaqs(input: {
  productTitle: string;
  selectedFormatLabel: string;
  isPrinted: boolean;
  sampleAvailable: boolean;
  printStockLabel: string;
  currency: string;
  price: number;
}) {
  return [
    {
      question: "Is this guide right for me?",
      answer: `${input.productTitle} is for buyers who want practical, Zimbabwe-focused guidance before making property, development, agency, or investment decisions.`,
    },
    {
      question: "What happens after I pay?",
      answer: input.isPrinted
        ? `${input.printStockLabel}. After payment is confirmed, the team prepares fulfilment and keeps the order visible in your HouseLink Library account.`
        : `After payment is confirmed, your ${input.selectedFormatLabel} is unlocked in your HouseLink Library account with invoice-backed access.`,
    },
    {
      question: "Can I preview it before buying?",
      answer: input.sampleAvailable
        ? "Yes. Use the sample preview to inspect pages before paying, then return here if it looks like the right fit."
        : "This product does not currently have a public sample. You can still ask HouseLink Live what is included before purchasing.",
    },
    {
      question: "Which format should I choose?",
      answer: input.isPrinted
        ? `Choose printed if you want a physical copy. The selected price is ${input.currency} ${input.price.toFixed(2)} before any bulk tiers.`
        : `Choose digital if you want the fastest access. The selected price is ${input.currency} ${input.price.toFixed(2)} and access is handled through your Library account after payment confirmation.`,
    },
  ];
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
