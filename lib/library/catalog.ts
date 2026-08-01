export type LibraryProductType =
  | "PRINTED_BOOK"
  | "PDF"
  | "DIGITAL_BOOK"
  | "TRAINING_MANUAL"
  | "TOOLKIT"
  | "COURSE"
  | "TEMPLATE"
  | "FORMS"
  | "BUNDLE"
  | "MEMBERSHIP"
  | "SUBSCRIPTION"
  | "GIFT_CARD";

export type LibraryProductStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";

export type LibraryProductFormatType = "PRINTED_BOOK" | "PDF" | "DIGITAL_BOOK";

export type LibraryBundleFormatPreference = "MATCH_SHOPPER" | "PREFER_DIGITAL" | "PREFER_PRINT";

/** Bulk unit price when buying at least `minQty` of the same printed format. */
export type LibraryVolumeTier = {
  minQty: number;
  unitPrice: number;
};

export type LibraryProductFormat = {
  id: string;
  type: LibraryProductFormatType;
  label: string;
  enabled: boolean;
  price: number;
  compareAtPrice?: number;
  sku?: string;
  /** Printed format only — quantity breaks for bulk buying. */
  volumeTiers?: LibraryVolumeTier[];
};

export type LibraryProduct = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  author: string;
  publisher: string;
  edition: string;
  isbn?: string;
  language: string;
  publicationDate: string;
  pages?: number;
  weightGrams?: number;
  bookSize?: string;
  sku: string;
  productType: LibraryProductType;
  status: LibraryProductStatus;
  price: number;
  compareAtPrice?: number;
  currency: string;
  rating: number;
  reviewCount: number;
  category: string;
  collection: string;
  series?: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Professional";
  description: string;
  shortDescription: string;
  learningOutcomes: string[];
  whoThisIsFor: string[];
  requirements: string[];
  tableOfContents: string[];
  tags: string[];
  seoTitle?: string;
  metaDescription?: string;
  seoFocusKeyword?: string;
  seoImageUrl?: string;
  /** Companion product IDs for Frequently Bought Together (admin-curated). */
  bundleProductIds: string[];
  /** Optional promo total for the whole bundle (main + companions). */
  bundlePromoPrice?: number;
  /** How companion formats are defaulted on the storefront. */
  bundleFormatPreference?: LibraryBundleFormatPreference;
  formats: LibraryProductFormat[];
  gallery: Array<{ label: string; url: string; kind: "cover" | "back" | "inside" | "mockup" | "video" }>;
  downloads: Array<{
    id: string;
    label: string;
    fileType: string;
    size: string;
    secure: boolean;
    fileUrl?: string;
    fileName?: string;
    fileSizeBytes?: number;
    previewable?: boolean;
  }>;
  stock: number | null;
  lowStockThreshold: number;
  warehouse?: string;
  supplier?: string;
  downloadLimit?: number | null;
  downloadExpiryDays?: number | null;
  watermarking?: boolean;
  licenseKeys?: boolean;
  featured: boolean;
  bestSeller: boolean;
  newRelease: boolean;
  editorsChoice: boolean;
  comingSoon: boolean;
  preorder: boolean;
  downloadCount: number;
  viewCount: number;
  publishedAt: string;
  scheduledAt?: string;
};

export function enabledLibraryFormats(product: Pick<LibraryProduct, "formats" | "productType" | "price" | "compareAtPrice" | "sku">): LibraryProductFormat[] {
  const formats = (product.formats ?? []).filter((format) => format.enabled);
  if (formats.length) return formats;
  return [
    {
      id: "primary",
      type: isPrintedType(product.productType) ? "PRINTED_BOOK" : product.productType === "DIGITAL_BOOK" ? "DIGITAL_BOOK" : "PDF",
      label: isPrintedType(product.productType) ? "Printed book" : "Digital copy",
      enabled: true,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      sku: product.sku,
    },
  ];
}

export function resolveLibraryFormat(
  product: Pick<LibraryProduct, "formats" | "productType" | "price" | "compareAtPrice" | "sku" | "title">,
  formatId?: string | null,
  formatType?: string | null,
) {
  const formats = enabledLibraryFormats(product);
  return (
    formats.find((format) => formatId && format.id === formatId) ??
    formats.find((format) => formatType && format.type === formatType) ??
    formats[0]
  );
}

export function libraryFormatInStock(
  product: Pick<LibraryProduct, "stock">,
  format: Pick<LibraryProductFormat, "type">,
) {
  if (format.type !== "PRINTED_BOOK") return true;
  if (product.stock == null) return true;
  return product.stock > 0;
}

export function availableLibraryFormats(
  product: Pick<LibraryProduct, "formats" | "productType" | "price" | "compareAtPrice" | "sku" | "stock">,
) {
  return enabledLibraryFormats(product).filter((format) => libraryFormatInStock(product, format));
}

export function resolveBundlePreferredType(
  preference: LibraryBundleFormatPreference | string | null | undefined,
  shopperType?: string | null,
) {
  if (preference === "PREFER_PRINT") return "PRINTED_BOOK";
  if (preference === "PREFER_DIGITAL") return "PDF";
  return shopperType || null;
}

/** Prefer digital formats for bundles unless the shopper chose print on the main product. */
export function pickLibraryBundleFormat(
  product: Pick<LibraryProduct, "formats" | "productType" | "price" | "compareAtPrice" | "sku" | "stock">,
  preferredType?: string | null,
  options?: { requireInStock?: boolean },
) {
  const formats =
    options?.requireInStock === false ? enabledLibraryFormats(product) : availableLibraryFormats(product);
  const pool = formats.length ? formats : enabledLibraryFormats(product);
  if (!pool.length) {
    return primaryLibraryFormat([], product.productType, product.price);
  }
  if (preferredType === "PRINTED_BOOK") {
    return pool.find((format) => format.type === "PRINTED_BOOK") ?? pool[0];
  }
  return pool.find((format) => format.type !== "PRINTED_BOOK") ?? pool[0];
}

export type LibraryDigitalUpsellSuggestion = {
  productId: string;
  slug: string;
  title: string;
  author: string;
  currency: string;
  price: number;
  formatId: string;
  formatType: LibraryProductFormatType;
  formatLabel: string;
  reason: "BUNDLE" | "SERIES";
  sourceProductId: string;
  sourceTitle: string;
};

/**
 * Light digital-only upsells from FBT companions (preferred) then same series.
 * Never suggests printed formats — checkout/confirmation stay simple.
 */
export function suggestLibraryDigitalUpsells(input: {
  catalog: LibraryProduct[];
  seedProductIds: string[];
  excludeProductIds?: string[];
  max?: number;
  preferPromoCompanions?: boolean;
}): LibraryDigitalUpsellSuggestion[] {
  const max = Math.max(1, Math.min(6, Math.floor(input.max ?? 2)));
  const exclude = new Set([...(input.excludeProductIds ?? []), ...input.seedProductIds].filter(Boolean));
  const byId = new Map(
    input.catalog
      .filter((product) => product.status === "PUBLISHED" || product.status === "SCHEDULED")
      .map((product) => [product.id, product]),
  );
  const seeds = input.seedProductIds
    .map((id) => byId.get(id))
    .filter((product): product is LibraryProduct => Boolean(product));
  const scored: Array<LibraryDigitalUpsellSuggestion & { score: number }> = [];
  const seen = new Set<string>();

  function pushCandidate(
    target: LibraryProduct,
    source: LibraryProduct,
    reason: "BUNDLE" | "SERIES",
    score: number,
  ) {
    if (exclude.has(target.id) || seen.has(target.id)) return;
    const format = pickLibraryBundleFormat(target, "PDF");
    if (!format || format.type === "PRINTED_BOOK") return;
    seen.add(target.id);
    scored.push({
      productId: target.id,
      slug: target.slug,
      title: target.title,
      author: target.author,
      currency: target.currency || "USD",
      price: format.price,
      formatId: format.id,
      formatType: format.type,
      formatLabel: format.label,
      reason,
      sourceProductId: source.id,
      sourceTitle: source.title,
      score,
    });
  }

  for (const source of seeds) {
    const promoBoost =
      input.preferPromoCompanions && source.bundlePromoPrice != null && Number(source.bundlePromoPrice) > 0
        ? 20
        : 0;
    for (const companionId of source.bundleProductIds ?? []) {
      const companion = byId.get(companionId);
      if (!companion) continue;
      pushCandidate(companion, source, "BUNDLE", 100 + promoBoost);
    }
  }

  for (const source of seeds) {
    const series = source.series?.trim().toLowerCase();
    if (!series) continue;
    for (const candidate of byId.values()) {
      if (candidate.id === source.id) continue;
      if ((candidate.series || "").trim().toLowerCase() !== series) continue;
      pushCandidate(candidate, source, "SERIES", 40);
    }
  }

  return scored
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, max)
    .map(({ score: _score, ...row }) => row);
}

export function estimateLibraryBundleScenario(
  products: Array<Pick<LibraryProduct, "formats" | "productType" | "price" | "compareAtPrice" | "sku" | "currency">>,
  mode: "digital" | "print",
  promoTotal?: number | null,
) {
  const prices = products.map((item) => {
    const formats = enabledLibraryFormats(item);
    if (mode === "print") {
      return formats.find((format) => format.type === "PRINTED_BOOK")?.price ?? formats[0]?.price ?? item.price;
    }
    return formats.find((format) => format.type !== "PRINTED_BOOK")?.price ?? formats[0]?.price ?? item.price;
  });
  // Soft-copy promo is digital-only; printed scenarios always use list prices.
  return applyLibraryBundlePromo(prices, mode === "digital" ? promoTotal : null);
}

/** Bundle promo totals are priced for soft copy — never discount printed lines with that promo. */
export function libraryBundlePromoAppliesToFormats(
  formatTypes: Array<string | null | undefined>,
) {
  if (!formatTypes.length) return false;
  return formatTypes.every((type) => type !== "PRINTED_BOOK");
}

export function normalizeLibraryVolumeTiers(
  value: unknown,
  basePrice: number,
): LibraryVolumeTier[] {
  if (!Array.isArray(value) || !Number.isFinite(basePrice) || basePrice <= 0) return [];
  const tiers: LibraryVolumeTier[] = [];
  for (const entry of value) {
    const row = entry as Partial<LibraryVolumeTier>;
    const minQty = Math.floor(Number(row?.minQty));
    const unitPrice = Math.round(Number(row?.unitPrice) * 100) / 100;
    if (!Number.isFinite(minQty) || minQty < 2) continue;
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) continue;
    if (unitPrice >= basePrice - 0.001) continue;
    tiers.push({ minQty, unitPrice });
  }
  tiers.sort((a, b) => a.minQty - b.minQty || a.unitPrice - b.unitPrice);
  const unique = new Map<number, LibraryVolumeTier>();
  for (const tier of tiers) {
    if (!unique.has(tier.minQty)) unique.set(tier.minQty, tier);
  }
  return Array.from(unique.values()).slice(0, 5);
}

/** Unit price after printed volume tiers (digital always uses list price). */
export function resolveLibraryVolumeUnitPrice(
  format: Pick<LibraryProductFormat, "price" | "type" | "volumeTiers">,
  quantity: number,
) {
  const qty = Math.max(1, Math.floor(Number(quantity) || 1));
  if (format.type !== "PRINTED_BOOK") return format.price;
  const tiers = normalizeLibraryVolumeTiers(format.volumeTiers, format.price);
  let unitPrice = format.price;
  for (const tier of tiers) {
    if (qty >= tier.minQty) unitPrice = tier.unitPrice;
  }
  return unitPrice;
}

export function libraryVolumePricing(
  format: Pick<LibraryProductFormat, "price" | "type" | "volumeTiers">,
  quantity: number,
) {
  const qty = Math.max(1, Math.floor(Number(quantity) || 1));
  const listPrice = format.price;
  const unitPrice = resolveLibraryVolumeUnitPrice(format, qty);
  const tiers = normalizeLibraryVolumeTiers(format.volumeTiers, listPrice);
  const activeTier = tiers.filter((tier) => qty >= tier.minQty);
  const tier = activeTier[activeTier.length - 1] ?? null;
  const nextTier = tiers.find((entry) => entry.minQty > qty) ?? null;
  const savingsPerUnit = Math.max(0, Math.round((listPrice - unitPrice) * 100) / 100);
  const savingsTotal = Math.round(savingsPerUnit * qty * 100) / 100;
  const savingsPercent =
    savingsPerUnit > 0 ? Math.round((savingsPerUnit / listPrice) * 100) : 0;
  return {
    quantity: qty,
    listPrice,
    unitPrice,
    lineTotal: Math.round(unitPrice * qty * 100) / 100,
    listTotal: Math.round(listPrice * qty * 100) / 100,
    savingsPerUnit,
    savingsTotal,
    savingsPercent,
    tier,
    nextTier,
    tiers,
  };
}

export function maxLibraryPrintQuantity(
  product: Pick<LibraryProduct, "stock">,
  options?: { allowBackorder?: boolean; fallbackMax?: number },
) {
  if (options?.allowBackorder) return options?.fallbackMax ?? 99;
  if (product.stock == null) return options?.fallbackMax ?? 99;
  return Math.max(0, product.stock);
}

/**
 * Apply an admin-curated FBT promo when the cart contains the source product
 * plus all companions at quantity 1 each (same rules as the PDP bundle CTA).
 * Soft-copy promo only — any printed line disables the bundle discount.
 * Other cart lines are left unchanged. Picks the matching bundle with the largest savings.
 */
export function applyLibraryBundlePromoToCartLines<
  T extends { productId: string; price: number; quantity: number; formatType?: string | null },
>(
  lines: T[],
  products: Array<Pick<LibraryProduct, "id" | "bundleProductIds" | "bundlePromoPrice">>,
): { lines: T[]; bundleSavings: number; bundleSourceProductId?: string } {
  let best:
    | {
        memberIds: string[];
        linePrices: number[];
        savings: number;
        sourceId: string;
      }
    | null = null;

  for (const source of products) {
    const companions = (source.bundleProductIds ?? []).filter(Boolean);
    const promo = source.bundlePromoPrice;
    if (!companions.length || promo == null || !Number.isFinite(promo) || promo <= 0) continue;
    const memberIds = [source.id, ...companions];
    const memberLines = memberIds.map((id) => lines.find((line) => line.productId === id));
    if (memberLines.some((line) => !line || line.quantity !== 1)) continue;
    const formatTypes = memberLines.map((line) => line!.formatType);
    if (!libraryBundlePromoAppliesToFormats(formatTypes)) continue;
    const listPrices = memberLines.map((line) => Number(line!.price) || 0);
    const result = applyLibraryBundlePromo(listPrices, Number(promo), formatTypes);
    if (result.savings <= 0) continue;
    if (!best || result.savings > best.savings) {
      best = { memberIds, linePrices: result.linePrices, savings: result.savings, sourceId: source.id };
    }
  }

  if (!best) return { lines, bundleSavings: 0 };
  const priceById = new Map(best.memberIds.map((id, index) => [id, best!.linePrices[index] ?? 0]));
  return {
    lines: lines.map((line) => {
      const nextPrice = priceById.get(line.productId);
      return nextPrice == null ? line : { ...line, price: nextPrice };
    }),
    bundleSavings: best.savings,
    bundleSourceProductId: best.sourceId,
  };
}

export function applyLibraryBundlePromo(
  linePrices: number[],
  promoTotal?: number | null,
  formatTypes?: Array<string | null | undefined>,
) {
  const subtotal = Math.round(linePrices.reduce((sum, price) => sum + price, 0) * 100) / 100;
  if (formatTypes?.length && !libraryBundlePromoAppliesToFormats(formatTypes)) {
    return { linePrices, subtotal, total: subtotal, savings: 0 };
  }
  if (
    promoTotal == null ||
    !Number.isFinite(promoTotal) ||
    promoTotal <= 0 ||
    promoTotal >= subtotal - 0.001
  ) {
    return { linePrices, subtotal, total: subtotal, savings: 0 };
  }
  const target = Math.round(promoTotal * 100) / 100;
  const ratio = target / subtotal;
  const adjusted = linePrices.map((price, index) =>
    index === linePrices.length - 1 ? 0 : Math.round(price * ratio * 100) / 100,
  );
  const allocated = adjusted.slice(0, -1).reduce((sum, price) => sum + price, 0);
  adjusted[adjusted.length - 1] = Math.round((target - allocated) * 100) / 100;
  return {
    linePrices: adjusted,
    subtotal,
    total: target,
    savings: Math.round((subtotal - target) * 100) / 100,
  };
}

export function primaryLibraryFormat(formats: LibraryProductFormat[], fallbackType: LibraryProductType = "PDF", fallbackPrice = 0) {
  const enabled = formats.filter((format) => format.enabled);
  if (!enabled.length) {
    return {
      id: "primary",
      type: (isPrintedType(fallbackType) ? "PRINTED_BOOK" : fallbackType === "DIGITAL_BOOK" ? "DIGITAL_BOOK" : "PDF") as LibraryProductFormatType,
      label: isPrintedType(fallbackType) ? "Printed book" : "Digital copy",
      enabled: true,
      price: fallbackPrice,
    } satisfies LibraryProductFormat;
  }
  return enabled.find((format) => format.type !== "PRINTED_BOOK") ?? enabled[0];
}

/** Woo-style: compare-at only counts as a promo when it is higher than the selling price. */
export function libraryFormatCompareAt(format: Pick<LibraryProductFormat, "price" | "compareAtPrice">) {
  const compareAt = format.compareAtPrice;
  if (compareAt == null || !Number.isFinite(compareAt) || compareAt <= format.price) return undefined;
  return compareAt;
}

export function libraryFormatOnSale(format: Pick<LibraryProductFormat, "price" | "compareAtPrice">) {
  return libraryFormatCompareAt(format) != null;
}

export type LibraryPriceDisplay = {
  currency: string;
  price: number;
  compareAtPrice?: number;
  from: boolean;
  onSale: boolean;
  label: string;
};

export function libraryPriceDisplay(
  product: Pick<LibraryProduct, "formats" | "productType" | "price" | "compareAtPrice" | "sku" | "currency">,
): LibraryPriceDisplay {
  const formats = enabledLibraryFormats(product);
  const currency = product.currency || "USD";
  if (!formats.length) {
    const price = product.price;
    const compareAt =
      product.compareAtPrice != null && Number.isFinite(product.compareAtPrice) && product.compareAtPrice > price
        ? product.compareAtPrice
        : undefined;
    return {
      currency,
      price,
      compareAtPrice: compareAt,
      from: false,
      onSale: Boolean(compareAt),
      label: `${currency} ${price.toFixed(2)}`,
    };
  }

  const prices = formats.map((format) => format.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const from = formats.length > 1 && min !== max;
  const focus = formats.find((format) => format.price === min) ?? formats[0];
  const compareAt =
    libraryFormatCompareAt(focus) ??
    (product.compareAtPrice != null && Number.isFinite(product.compareAtPrice) && product.compareAtPrice > focus.price
      ? product.compareAtPrice
      : undefined);

  return {
    currency,
    price: min,
    compareAtPrice: compareAt,
    from,
    onSale: Boolean(compareAt),
    label: from ? `From ${currency} ${min.toFixed(2)}` : `${currency} ${min.toFixed(2)}`,
  };
}

export function libraryPriceLabel(product: Pick<LibraryProduct, "formats" | "productType" | "price" | "compareAtPrice" | "sku" | "currency">) {
  return libraryPriceDisplay(product).label;
}

export function libraryDiscountPercent(price: number, compareAtPrice?: number) {
  if (compareAtPrice == null || compareAtPrice <= price || price < 0) return null;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

export function libraryFormatsLabel(product: Pick<LibraryProduct, "formats" | "productType" | "price" | "compareAtPrice" | "sku">) {
  const formats = enabledLibraryFormats(product);
  if (formats.length > 1) return formats.map((format) => (format.type === "PRINTED_BOOK" ? "Print" : "Digital")).join(" + ");
  return (formats[0]?.label || product.productType).replace(/_/g, " ");
}

function isPrintedType(type: string) {
  return type === "PRINTED_BOOK";
}

export type LibraryOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: "PENDING" | "PAID" | "FULFILLED" | "REFUNDED";
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  total: number;
  currency: string;
  itemCount: number;
  createdAt: string;
  paymentId?: string | null;
  proofStatus?: string | null;
  proofUrl?: string | null;
  paymentAdminNote?: string | null;
};

export type LibraryAnalytics = {
  todaySales: number;
  weeklySales: number;
  monthlySales: number;
  revenue: number;
  orders: number;
  downloads: number;
  visitors: number;
  conversionRate: number;
  bestSellers: Array<{ label: string; value: number }>;
  topCategories: Array<{ label: string; value: number }>;
  mostDownloaded: Array<{ label: string; value: number }>;
  mostViewed: Array<{ label: string; value: number }>;
  salesTrend: Array<{ label: string; value: number }>;
  stockLevels: Array<{ label: string; value: number }>;
};

export const LIBRARY_PRODUCTS: LibraryProduct[] = [];

export const LIBRARY_ORDERS: LibraryOrder[] = [];

export function getLibraryProducts() {
  return LIBRARY_PRODUCTS;
}

export function getLibraryProductBySlug(slug: string) {
  return LIBRARY_PRODUCTS.find((product) => product.slug === slug);
}

export function searchLibraryProducts(input: {
  query?: string;
  category?: string;
  author?: string;
  type?: string;
  difficulty?: string;
  sort?: string;
  maxPrice?: number;
}) {
  const q = input.query?.trim().toLowerCase();
  const filtered = LIBRARY_PRODUCTS.filter((product) => {
    const haystack = [
      product.title,
      product.subtitle,
      product.author,
      product.isbn,
      product.category,
      product.collection,
      product.series,
      product.publisher,
      product.tags.join(" "),
    ].join(" ").toLowerCase();
    if (q && !haystack.includes(q)) return false;
    if (input.category && product.category !== input.category) return false;
    if (input.author && product.author !== input.author) return false;
    if (input.type && product.productType !== input.type) return false;
    if (input.difficulty && product.difficulty !== input.difficulty) return false;
    if (input.maxPrice && product.price > input.maxPrice) return false;
    return product.status === "PUBLISHED" || product.status === "SCHEDULED";
  });
  return filtered.sort((a, b) => {
    if (input.sort === "price-asc") return a.price - b.price;
    if (input.sort === "highest-rated") return b.rating - a.rating;
    if (input.sort === "most-downloaded") return b.downloadCount - a.downloadCount;
    if (input.sort === "best-selling") return Number(b.bestSeller) - Number(a.bestSeller) || b.downloadCount - a.downloadCount;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}

export function getLibraryAnalytics(): LibraryAnalytics {
  return {
    todaySales: 0,
    weeklySales: 0,
    monthlySales: 0,
    revenue: 0,
    orders: 0,
    downloads: 0,
    visitors: 0,
    conversionRate: 0,
    bestSellers: [],
    topCategories: [],
    mostDownloaded: [],
    mostViewed: [],
    salesTrend: [],
    stockLevels: [],
  };
}

export function libraryFacets() {
  return {
    categories: [],
    authors: [],
    types: [],
    difficulties: [],
  };
}
