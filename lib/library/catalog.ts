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

export type LibraryProductFormat = {
  id: string;
  type: LibraryProductFormatType;
  label: string;
  enabled: boolean;
  price: number;
  compareAtPrice?: number;
  sku?: string;
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
