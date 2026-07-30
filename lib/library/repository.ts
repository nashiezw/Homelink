import { createHash, createHmac, randomBytes } from "crypto";
import { LibraryDownloadStatus, LibraryOrderStatus, LibraryProductStatus, LibraryProductType, NotificationChannel, NotificationStatus, PaymentProvider, PaymentStatus, Role, type Prisma } from "@prisma/client";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import {
  getLibraryAnalytics as getEmptyLibraryAnalytics,
  getLibraryProducts,
  LIBRARY_ORDERS,
  enabledLibraryFormats,
  primaryLibraryFormat,
  resolveLibraryFormat,
  type LibraryAnalytics,
  type LibraryOrder,
  type LibraryProduct,
  type LibraryProductFormat,
  type LibraryProductType as PublicLibraryProductType,
} from "@/lib/library/catalog";
import { getLibraryStoreSettings, saveLibraryStoreSettings, type LibraryStoreSettings } from "@/lib/library/settings";

export { getLibraryStoreSettings, saveLibraryStoreSettings, type LibraryStoreSettings };

export type LibraryCartLine = {
  productId: string;
  title?: string;
  price?: number;
  currency?: string;
  quantity: number;
  formatId?: string;
  formatType?: string;
  formatLabel?: string;
};

export type LibraryShippingAddress = {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  province?: string;
  country?: string;
  notes?: string;
};

export type LibraryCartQuote = {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  total: number;
  currency: string;
  couponCode?: string;
  taxLabel?: string;
  taxCountry?: string;
  items: LibraryCartLine[];
};

export type LibraryProductInput = {
  title: string;
  slug?: string;
  subtitle?: string;
  author?: string;
  publisher?: string;
  edition?: string;
  isbn?: string;
  language?: string;
  publicationDate?: string;
  pages?: number;
  weightGrams?: number;
  bookSize?: string;
  sku?: string;
  barcode?: string;
  productType?: PublicLibraryProductType;
  status?: string;
  price: number;
  compareAtPrice?: number;
  currency?: string;
  category?: string;
  collection?: string;
  series?: string;
  difficulty?: string;
  shortDescription?: string;
  description: string;
  learningOutcomes?: string[];
  whoThisIsFor?: string[];
  requirements?: string[];
  tableOfContents?: string[];
  tags?: string[];
  seoTitle?: string;
  metaDescription?: string;
  seoFocusKeyword?: string;
  seoImageUrl?: string;
  featured?: boolean;
  bestSeller?: boolean;
  newRelease?: boolean;
  editorsChoice?: boolean;
  comingSoon?: boolean;
  preorder?: boolean;
  stock?: number | null;
  lowStockThreshold?: number;
  warehouse?: string;
  supplier?: string;
  downloadLimit?: number | null;
  downloadExpiryDays?: number | null;
  watermarking?: boolean;
  licenseKeys?: boolean;
  formats?: LibraryProductFormat[];
  gallery?: LibraryProduct["gallery"];
  downloads?: Array<{ label: string; fileUrl?: string; fileName?: string; fileType: string; size?: string; fileSizeBytes?: number; secure?: boolean; previewable?: boolean }>;
  scheduledAt?: string | null;
};

type DbProduct = Prisma.LibraryProductGetPayload<{
  include: {
    author: true;
    category: true;
    collection: true;
    media: { orderBy: { sortOrder: "asc" } };
    files: { orderBy: { sortOrder: "asc" } };
    previewPages: { orderBy: { sortOrder: "asc" } };
  };
}>;

type DbOrder = Prisma.LibraryOrderGetPayload<{
  include: {
    customer: { select: { id: true; name: true; email: true } };
    items: true;
    payment: { select: { status: true } };
  };
}>;

const FALLBACK_TOKEN_TTL_SECONDS = 60 * 15;

type LocalLibraryOrder = LibraryOrder & {
  customerId?: string;
  items?: Array<{ id: string; title: string; sku: string; quantity: number; unitPrice: number; total: number; productId: string }>;
  payment?: { status: string; proofStatus?: string | null; proofUrl?: string | null; id?: string };
};

export type LibraryCouponAdmin = {
  id: string;
  code: string;
  description?: string | null;
  discountType: string;
  discountValue: number;
  usageLimit?: number | null;
  usedCount: number;
  minimumSubtotal?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  active: boolean;
  productIds: string[];
  categoryIds: string[];
  firstPurchaseOnly: boolean;
};

export type LibraryTaxonomyKind = "category" | "collection" | "author";

export type LibraryTaxonomyAdmin = {
  id: string;
  kind: LibraryTaxonomyKind;
  name: string;
  slug: string;
  description?: string | null;
  seoTitle?: string | null;
  metaDescription?: string | null;
  heroImageUrl?: string | null;
  bio?: string | null;
  websiteUrl?: string | null;
  featured?: boolean;
  sortOrder?: number;
  active: boolean;
  productCount: number;
};

export type LibraryDownloadAccessAdmin = {
  id: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  productId: string;
  productTitle: string;
  orderNumber?: string | null;
  fileName?: string | null;
  status: string;
  downloadCount: number;
  downloadLimit?: number | null;
  expiresAt?: string | null;
  lastDownloadAt?: string | null;
  licenseKey?: string | null;
};

export type LibraryReviewAdmin = {
  id: string;
  productId: string;
  productTitle: string;
  userName?: string | null;
  userEmail?: string | null;
  rating: number;
  title?: string | null;
  body?: string | null;
  status: string;
  verified: boolean;
  featured: boolean;
  createdAt: string;
};

export type LibraryAdminReports = {
  scorecards: Array<{ label: string; value: number; detail: string; tone: "default" | "success" | "warning" | "danger" | "info" }>;
  funnel: Array<{ label: string; value: number }>;
  revenueTrend: Array<{ label: string; value: number }>;
  orderStatus: Array<{ label: string; value: number }>;
  paymentGateways: Array<{ label: string; value: number }>;
  productPerformance: Array<{ id: string; title: string; revenue: number; units: number; views: number; downloads: number; conversionRate: number; health: number }>;
  customerSegments: Array<{ id: string; userId: string; name: string; email: string; orders: number; spend: number; downloads: number; lastOrderAt: string; segment: string }>;
  couponPerformance: Array<{ id: string; code: string; usedCount: number; discountValue: number; discountType: string; active: boolean; status: string }>;
  downloadLogs: Array<{ id: string; customer: string; product: string; file: string; status: string; usage: string; lastDownloadAt?: string | null; expiresAt?: string | null }>;
  stockAlerts: Array<{ id: string; title: string; stock: number; threshold: number; warehouse: string; supplier: string; state: string }>;
  inventoryMovements: Array<{ id: string; productTitle: string; type: string; quantity: number; note?: string | null; createdAt: string }>;
  taxSummary: Array<{ id: string; name: string; country: string; rate: number; active: boolean; collected: number }>;
  refundSummary: { orders: number; amount: number; rate: number };
  settingsHealth: Array<{ area: string; status: string; detail: string }>;
};

const localLibraryProducts: LibraryProduct[] = getLibraryProducts().map((product) => ({
  ...product,
  gallery: product.gallery.map((item) => ({ ...item })),
  downloads: product.downloads.map((item) => ({ ...item })),
}));

const localLibraryOrders: LocalLibraryOrder[] = LIBRARY_ORDERS.map((order) => ({ ...order, customerId: "demo" }));
const localLibraryCoupons: LibraryCouponAdmin[] = [];
const localLibraryTaxonomy: LibraryTaxonomyAdmin[] = [];

export function shouldUsePostgresLibrary() {
  return isPostgresStoreEnabled();
}

export async function listLibraryProducts(input: {
  q?: string;
  category?: string;
  author?: string;
  type?: string;
  difficulty?: string;
  status?: string;
  includeDrafts?: boolean;
  limit?: number;
} = {}): Promise<LibraryProduct[]> {
  if (!shouldUsePostgresLibrary()) {
    return filterAndSortLocalProducts(input);
  }
  await seedLibraryIfEmpty();
  if (!input.includeDrafts) {
    await publishDueScheduledLibraryProducts();
  }
  const q = input.q?.trim();
  const now = new Date();
  const products = await getMainPrisma().libraryProduct.findMany({
    where: {
      deletedAt: null,
      ...(input.includeDrafts
        ? {}
        : {
            OR: [
              { status: LibraryProductStatus.PUBLISHED },
              { status: LibraryProductStatus.SCHEDULED, scheduledAt: null },
              { status: LibraryProductStatus.SCHEDULED, scheduledAt: { lte: now } },
            ],
          }),
      ...(input.status ? { status: normalizeStatus(input.status) } : {}),
      ...(input.category ? { category: { name: input.category } } : {}),
      ...(input.author ? { author: { name: input.author } } : {}),
      ...(input.type ? { productType: normalizeType(input.type) } : {}),
      ...(input.difficulty ? { difficulty: input.difficulty } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { subtitle: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
              { isbn: { contains: q, mode: "insensitive" } },
              { searchVector: { contains: q, mode: "insensitive" } },
              { author: { name: { contains: q, mode: "insensitive" } } },
              { category: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: productInclude(),
    orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    take: input.limit ?? 100,
  });
  const mapped = products.map(toLibraryProduct);
  if (input.includeDrafts) return mapped;
  const settings = await getLibraryStoreSettings();
  if (!settings.inventory.hideOutOfStock) return mapped;
  return mapped.filter((product) => {
    const printedOnly = product.formats?.length
      ? product.formats.every((format) => !format.enabled || format.type === "PRINTED_BOOK")
      : product.productType === "PRINTED_BOOK";
    if (!printedOnly) return true;
    return product.stock == null || product.stock > 0;
  });
}

export async function publishDueScheduledLibraryProducts() {
  if (!shouldUsePostgresLibrary()) return { count: 0 };
  const result = await getMainPrisma().libraryProduct.updateMany({
    where: {
      deletedAt: null,
      status: LibraryProductStatus.SCHEDULED,
      scheduledAt: { lte: new Date() },
    },
    data: {
      status: LibraryProductStatus.PUBLISHED,
      publishedAt: new Date(),
    },
  }).catch(() => ({ count: 0 }));
  return { count: result.count };
}

export async function getLibraryProductBySlug(slug: string) {
  if (!shouldUsePostgresLibrary()) {
    return localLibraryProducts.find((product) => product.slug === slug && (product.status === "PUBLISHED" || product.status === "SCHEDULED")) ?? null;
  }
  await seedLibraryIfEmpty();
  await publishDueScheduledLibraryProducts();
  const product = await getMainPrisma().libraryProduct.findUnique({
    where: { slug },
    include: productInclude(),
  });
  if (!product || product.deletedAt) return null;
  const now = Date.now();
  const scheduledFuture = product.status === LibraryProductStatus.SCHEDULED && product.scheduledAt && product.scheduledAt.getTime() > now;
  if (product.status !== LibraryProductStatus.PUBLISHED && product.status !== LibraryProductStatus.SCHEDULED) {
    return null;
  }
  if (scheduledFuture) return null;
  return toLibraryProduct(product as DbProduct);
}

export async function getLibraryProductSampleFile(slug: string) {
  const product = await getLibraryProductBySlug(slug);
  if (!product) return null;
  const sample = product.downloads.find((file) => file.previewable && (file.fileType.toUpperCase() === "PDF" || file.fileName?.toLowerCase().endsWith(".pdf")) && file.fileUrl)
    ?? product.downloads.find((file) => file.previewable && file.fileUrl)
    ?? null;
  if (!sample?.fileUrl) return null;
  return {
    productId: product.id,
    productTitle: product.title,
    fileId: sample.id,
    fileUrl: sample.fileUrl,
    fileName: sample.fileName || `${product.slug}-sample.pdf`,
    fileType: sample.fileType,
  };
}

export async function recordLibraryProductView(slug: string) {
  if (!shouldUsePostgresLibrary()) return;
  await getMainPrisma().libraryProduct.update({
    where: { slug },
    data: { viewCount: { increment: 1 } },
  }).catch(() => null);
}

export async function getAdminLibraryData() {
  const products = await listLibraryProducts({ includeDrafts: true });
  return {
    products,
    orders: await listLibraryOrders(),
    analytics: await getLibraryAnalytics(),
    facets: getLibraryFacets(products),
    operations: await getLibraryOperationsSummary(),
  };
}

export async function getLibraryAnalytics(): Promise<LibraryAnalytics> {
  if (!shouldUsePostgresLibrary()) return getEmptyLibraryAnalytics();
  try {
    await seedLibraryIfEmpty();
    const prisma = getMainPrisma();
    const [orders, products, downloads] = await Promise.all([
      prisma.libraryOrder.findMany({ include: { items: true } }),
      prisma.libraryProduct.findMany({ include: { category: true } }),
      prisma.libraryDownloadAccess.count(),
    ]);
  const paidOrders = orders.filter((order) => order.status === "PAID" || order.status === "FULFILLED");
  const revenue = paidOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const weekAgo = Date.now() - 7 * 86400000;
  const monthAgo = Date.now() - 30 * 86400000;
  const revenueSince = (time: number) => paidOrders.filter((order) => order.createdAt.getTime() >= time).reduce((sum, order) => sum + Number(order.total), 0);
  const visitors = products.reduce((sum, product) => sum + product.viewCount, 0);
  const categories = new Map<string, number>();
  products.forEach((product) => categories.set(product.category?.name ?? "Uncategorised", (categories.get(product.category?.name ?? "Uncategorised") ?? 0) + 1));
    return {
    todaySales: revenueSince(startOfDay),
    weeklySales: revenueSince(weekAgo),
    monthlySales: revenueSince(monthAgo),
    revenue,
    orders: orders.length,
    downloads,
    visitors,
    conversionRate: visitors ? Number(((paidOrders.length / visitors) * 100).toFixed(1)) : 0,
    bestSellers: products.filter((p) => p.bestSeller).map((p) => ({ label: p.title, value: p.downloadCount })),
    topCategories: Array.from(categories.entries()).map(([label, value]) => ({ label, value })),
    mostDownloaded: [...products].sort((a, b) => b.downloadCount - a.downloadCount).slice(0, 5).map((p) => ({ label: p.title, value: p.downloadCount })),
    mostViewed: [...products].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5).map((p) => ({ label: p.title, value: p.viewCount })),
    salesTrend: buildSalesTrend(paidOrders),
    stockLevels: products.filter((p) => p.stock !== null).map((p) => ({ label: p.title, value: p.stock ?? 0 })),
    };
  } catch {
    return getEmptyLibraryAnalytics();
  }
}

export async function listLibraryOrders(customerId?: string): Promise<LibraryOrder[]> {
  if (!shouldUsePostgresLibrary()) {
    return localLibraryOrders
      .filter((order) => !customerId || order.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  try {
    const rows = await getMainPrisma().libraryOrder.findMany({
      where: customerId ? { customerId } : {},
      include: {
        customer: { select: { id: true, name: true, email: true } },
        items: true,
        payment: { select: { id: true, status: true, proofStatus: true, proofUrl: true, metadata: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return rows.map(toLibraryOrder);
  } catch {
    return LIBRARY_ORDERS;
  }
}

export async function quoteLibraryCart(
  items: LibraryCartLine[],
  couponCode?: string,
  customerId?: string,
  options?: { country?: string; includeShipping?: boolean },
): Promise<LibraryCartQuote> {
  const settings = await getLibraryStoreSettings();
  const normalized = items.map((item) => ({ ...item, quantity: Math.max(1, Number(item.quantity) || 1) })).filter((item) => item.productId);
  if (!shouldUsePostgresLibrary()) {
    const lines = normalized.map((item) => {
      const product = localLibraryProducts.find((entry) => entry.id === item.productId);
      if (!product) return { ...item, title: item.title ?? "Library product", price: item.price ?? 0, currency: item.currency ?? settings.store.currency };
      const format = resolveLibraryFormat(product, item.formatId, item.formatType);
      return {
        ...item,
        title: formatLabelTitle(product.title, format.label),
        price: format.price,
        currency: product.currency,
        formatId: format.id,
        formatType: format.type,
        formatLabel: format.label,
      };
    });
    const subtotal = lines.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);
    const hasPrinted = lines.some((item) => item.formatType === "PRINTED_BOOK");
    const shippingTotal = options?.includeShipping !== false && hasPrinted ? resolveShippingTotal(subtotal, 0, settings) : 0;
    return {
      subtotal,
      discountTotal: 0,
      taxTotal: 0,
      shippingTotal,
      total: roundMoney(subtotal + shippingTotal),
      currency: lines[0]?.currency ?? settings.store.currency,
      couponCode,
      taxLabel: settings.tax.taxLabel,
      taxCountry: settings.tax.defaultCountry,
      items: lines,
    };
  }
  await seedLibraryIfEmpty();
  const prisma = getMainPrisma();
  const ids = normalized.map((item) => item.productId);
  const products = await prisma.libraryProduct.findMany({ where: { id: { in: ids }, deletedAt: null }, include: productInclude() });
  const mapped = products.map((row) => toLibraryProduct(row as DbProduct));
  const lines = normalized.map((item) => {
    const product = mapped.find((entry) => entry.id === item.productId);
    if (!product) return { ...item, title: item.title ?? "Library product", price: item.price ?? 0, currency: item.currency ?? settings.store.currency };
    const format = resolveLibraryFormat(product, item.formatId, item.formatType);
    return {
      productId: product.id,
      title: formatLabelTitle(product.title, format.label),
      price: format.price,
      currency: product.currency,
      quantity: item.quantity,
      formatId: format.id,
      formatType: format.type,
      formatLabel: format.label,
    };
  });
  const subtotal = lines.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountTotal = settings.checkout.allowCoupons
    ? await calculateLibraryDiscount({ couponCode, subtotal, products, customerId })
    : 0;
  const taxCountry = (options?.country || settings.tax.defaultCountry).toUpperCase();
  const tax = await prisma.libraryTaxSetting.findFirst({ where: { active: true, country: taxCountry }, orderBy: { createdAt: "desc" } }).catch(() => null)
    ?? await prisma.libraryTaxSetting.findFirst({ where: { active: true, country: settings.tax.defaultCountry }, orderBy: { createdAt: "desc" } }).catch(() => null);
  const taxable = Math.max(0, subtotal - discountTotal);
  const inclusive = tax ? tax.inclusive : settings.tax.pricesIncludeTax;
  const taxTotal = tax && !inclusive ? roundMoney(taxable * (Number(tax.rate) / 100)) : 0;
  const hasPrinted = lines.some((item) => item.formatType === "PRINTED_BOOK");
  const shippingTotal = options?.includeShipping !== false && hasPrinted ? resolveShippingTotal(taxable, taxTotal, settings) : 0;
  return {
    subtotal,
    discountTotal,
    taxTotal,
    shippingTotal,
    total: Math.max(0, roundMoney(taxable + taxTotal + shippingTotal)),
    currency: lines[0]?.currency ?? settings.store.currency,
    couponCode: discountTotal > 0 ? couponCode : undefined,
    taxLabel: settings.tax.taxLabel,
    taxCountry,
    items: lines,
  };
}

export function validateLibraryProductPublish(input: Partial<LibraryProductInput>, existing?: Pick<LibraryProduct, "formats" | "downloads" | "productType" | "status"> | null) {
  const status = input.status ?? existing?.status;
  if (status !== "PUBLISHED") return null;
  const formats = input.formats?.length
    ? normalizeFormatsInput(input.formats)
    : existing?.formats?.length
      ? existing.formats
      : normalizeFormatsInput([
          {
            id: "primary",
            type: (existing?.productType === "PRINTED_BOOK" ? "PRINTED_BOOK" : existing?.productType === "DIGITAL_BOOK" ? "DIGITAL_BOOK" : "PDF") as LibraryProductFormat["type"],
            label: existing?.productType === "PRINTED_BOOK" ? "Printed book" : "Digital copy",
            enabled: true,
            price: Number(input.price ?? 0),
          },
        ]);
  if (!formats.some((format) => format.enabled)) {
    return "Enable at least one format before publishing.";
  }
  const digitalEnabled = formats.some((format) => format.enabled && format.type !== "PRINTED_BOOK");
  const downloads = input.downloads ?? existing?.downloads ?? [];
  if (digitalEnabled && !downloads.some((file) => Boolean(file.fileUrl))) {
    return "Add at least one download file before publishing a digital format.";
  }
  return null;
}

export async function createLibraryProduct(input: LibraryProductInput, actorId?: string) {
  const publishError = validateLibraryProductPublish(input);
  if (publishError) throw new Error(publishError);
  if (!shouldUsePostgresLibrary()) {
    const product = localProductFromInput(input);
    localLibraryProducts.unshift(product);
    return product;
  }
  await seedLibraryIfEmpty();
  const data = await productInputToPrisma(input, actorId) as Prisma.LibraryProductCreateInput;
  const product = await getMainPrisma().libraryProduct.create({
    data,
    include: productInclude(),
  });
  await replaceProductAssets(product.id, input);
  const updated = await getMainPrisma().libraryProduct.findUnique({ where: { id: product.id }, include: productInclude() });
  return toLibraryProduct((updated ?? product) as DbProduct);
}

export async function updateLibraryProduct(id: string, input: Partial<LibraryProductInput>, actorId?: string) {
  if (!shouldUsePostgresLibrary()) {
    const index = localLibraryProducts.findIndex((product) => product.id === id);
    if (index === -1) return null;
    const publishError = validateLibraryProductPublish(input, localLibraryProducts[index]);
    if (publishError) throw new Error(publishError);
    localLibraryProducts[index] = localProductFromInput(input, localLibraryProducts[index]);
    return localLibraryProducts[index];
  }
  const existingRow = await getMainPrisma().libraryProduct.findUnique({ where: { id }, include: productInclude() }).catch(() => null);
  if (!existingRow) return null;
  const existing = toLibraryProduct(existingRow as DbProduct);
  const publishError = validateLibraryProductPublish(input, existing);
  if (publishError) throw new Error(publishError);
  const data = await productInputToPrisma(input as LibraryProductInput, actorId, true) as Prisma.LibraryProductUpdateInput;
  const product = await getMainPrisma().libraryProduct.update({
    where: { id },
    data,
    include: productInclude(),
  }).catch(() => null);
  if (!product) return null;
  await replaceProductAssets(product.id, input);
  const updated = await getMainPrisma().libraryProduct.findUnique({ where: { id: product.id }, include: productInclude() });
  return updated ? toLibraryProduct(updated as DbProduct) : toLibraryProduct(product as DbProduct);
}

export async function duplicateLibraryProduct(id: string, actorId?: string) {
  if (!shouldUsePostgresLibrary()) {
    const source = localLibraryProducts.find((product) => product.id === id);
    if (!source) return null;
    const stamp = Date.now().toString().slice(-5);
    const clone: LibraryProduct = {
      ...source,
      id: `local-product-${stamp}`,
      title: `${source.title} Copy`,
      slug: `${source.slug}-copy-${stamp}`,
      sku: `${source.sku}-COPY-${stamp}`,
      isbn: undefined,
      status: "DRAFT",
      gallery: source.gallery.map((item) => ({ ...item })),
      downloads: source.downloads.map((item) => ({ ...item, id: `${item.id}-copy-${stamp}` })),
      publishedAt: new Date().toISOString(),
    };
    localLibraryProducts.unshift(clone);
    return clone;
  }
  const source = await getMainPrisma().libraryProduct.findUnique({ where: { id }, include: productInclude() });
  if (!source) return null;
  const stamp = Date.now().toString().slice(-5);
  const clone = await getMainPrisma().libraryProduct.create({
    data: {
      title: `${source.title} Copy`,
      slug: `${source.slug}-copy-${stamp}`,
      subtitle: source.subtitle,
      authorId: source.authorId,
      publisher: source.publisher,
      edition: source.edition,
      isbn: null,
      language: source.language,
      publicationDate: source.publicationDate,
      pages: source.pages,
      weightGrams: source.weightGrams,
      bookSize: source.bookSize,
      sku: `${source.sku}-COPY-${stamp}`,
      barcode: null,
      productType: source.productType,
      status: LibraryProductStatus.DRAFT,
      price: source.price,
      compareAtPrice: source.compareAtPrice,
      currency: source.currency,
      categoryId: source.categoryId,
      collectionId: source.collectionId,
      series: source.series,
      difficulty: source.difficulty,
      shortDescription: source.shortDescription,
      description: source.description,
      learningOutcomes: source.learningOutcomes,
      whoThisIsFor: source.whoThisIsFor,
      requirements: source.requirements,
      tableOfContents: source.tableOfContents ?? undefined,
      tags: source.tags,
      seoTitle: source.seoTitle,
      metaDescription: source.metaDescription,
      searchVector: source.searchVector,
      stock: source.stock,
      lowStockThreshold: source.lowStockThreshold,
      warehouse: source.warehouse,
      supplier: source.supplier,
      createdById: actorId,
      media: { create: source.media.map((m) => ({ label: m.label, url: m.url, publicId: m.publicId, mediaType: m.mediaType, sortOrder: m.sortOrder })) },
      files: { create: source.files.map((f) => ({ label: f.label, fileUrl: f.fileUrl, fileName: f.fileName, fileType: f.fileType, fileSizeBytes: f.fileSizeBytes, secure: f.secure, previewable: f.previewable, downloadable: f.downloadable, sortOrder: f.sortOrder })) },
    },
    include: productInclude(),
  });
  return toLibraryProduct(clone as DbProduct);
}

export async function archiveLibraryProducts(ids: string[], actorId?: string) {
  if (!ids.length) return 0;
  if (!shouldUsePostgresLibrary()) {
    let count = 0;
    localLibraryProducts.forEach((product) => {
      if (ids.includes(product.id)) {
        product.status = "ARCHIVED";
        count += 1;
      }
    });
    return count;
  }
  const result = await getMainPrisma().libraryProduct.updateMany({
    where: { id: { in: ids } },
    data: { status: LibraryProductStatus.ARCHIVED, archivedAt: new Date(), updatedById: actorId },
  });
  return result.count;
}

export async function softDeleteLibraryProducts(ids: string[], actorId?: string) {
  if (!ids.length) return 0;
  if (!shouldUsePostgresLibrary()) {
    const before = localLibraryProducts.length;
    for (let index = localLibraryProducts.length - 1; index >= 0; index -= 1) {
      if (ids.includes(localLibraryProducts[index].id)) localLibraryProducts.splice(index, 1);
    }
    return before - localLibraryProducts.length;
  }
  const result = await getMainPrisma().libraryProduct.updateMany({
    where: { id: { in: ids } },
    data: { status: LibraryProductStatus.DELETED, deletedAt: new Date(), updatedById: actorId },
  });
  return result.count;
}

export async function createLibraryOrderFromCheckout(input: {
  customerId: string;
  paymentId: string;
  items: LibraryCartLine[];
  couponCode?: string;
  shipping?: LibraryShippingAddress | null;
}) {
  const settings = await getLibraryStoreSettings();
  if (!settings.store.enabled) throw new Error("HouseLink Library checkout is temporarily disabled.");
  if (!shouldUsePostgresLibrary()) {
    const quote = await quoteLibraryCart(input.items, input.couponCode, input.customerId, { country: input.shipping?.country, includeShipping: true });
    if (!quote.items.length) throw new Error("No valid Library products found.");
    if (quote.subtotal < settings.checkout.minimumOrderAmount) {
      throw new Error(`Minimum order amount is ${quote.currency} ${settings.checkout.minimumOrderAmount.toFixed(2)}.`);
    }
    const order: LocalLibraryOrder = {
      id: `local-library-order-${Date.now()}`,
      orderNumber: `${settings.checkout.orderPrefix}-${Date.now()}`,
      customerId: input.customerId,
      paymentId: input.paymentId,
      customerName: "HouseLink Customer",
      customerEmail: `${input.customerId}@houselink.local`,
      status: "PENDING",
      paymentStatus: "PENDING",
      total: quote.total,
      currency: quote.currency,
      itemCount: quote.items.reduce((sum, item) => sum + item.quantity, 0),
      createdAt: new Date().toISOString(),
      payment: { status: "PENDING" },
      items: quote.items.map((item) => ({
        id: `local-line-${item.productId}-${Date.now()}`,
        productId: item.productId,
        title: item.title ?? "Library product",
        sku: localLibraryProducts.find((product) => product.id === item.productId)?.sku ?? item.productId,
        quantity: item.quantity,
        unitPrice: item.price ?? 0,
        total: (item.price ?? 0) * item.quantity,
      })),
    };
    localLibraryOrders.unshift(order);
    return { order, accessGranted: false };
  }
  await seedLibraryIfEmpty();
  const prisma = getMainPrisma();
  const quote = await quoteLibraryCart(input.items, input.couponCode, input.customerId, {
    country: input.shipping?.country,
    includeShipping: true,
  });
  if (quote.subtotal < settings.checkout.minimumOrderAmount) {
    throw new Error(`Minimum order amount is ${quote.currency} ${settings.checkout.minimumOrderAmount.toFixed(2)}.`);
  }
  const ids = input.items.map((item) => item.productId);
  const products = await prisma.libraryProduct.findMany({ where: { id: { in: ids }, deletedAt: null }, include: { files: true, media: true, author: true, category: true, collection: true, previewPages: true } });
  if (!products.length) throw new Error("No valid Library products found.");
  const mapped = new Map(products.map((row) => [row.id, toLibraryProduct(row as DbProduct)]));
  const lines = quote.items.map((cart) => {
    const product = products.find((entry) => entry.id === cart.productId);
    const mappedProduct = mapped.get(cart.productId);
    if (!product || !mappedProduct) return null;
    const format = resolveLibraryFormat(mappedProduct, cart.formatId, cart.formatType);
    const quantity = Math.max(1, Number(cart.quantity) || 1);
    const unitPrice = Number(cart.price ?? format.price);
    return {
      product,
      mappedProduct,
      quantity,
      unitPrice,
      total: unitPrice * quantity,
      title: formatLabelTitle(product.title, format.label),
      productType: normalizeType(format.type),
      sku: format.sku || product.sku,
      format,
    };
  }).filter(Boolean) as Array<{
    product: (typeof products)[number];
    mappedProduct: LibraryProduct;
    quantity: number;
    unitPrice: number;
    total: number;
    title: string;
    productType: LibraryProductType;
    sku: string;
    format: ReturnType<typeof resolveLibraryFormat>;
  }>;

  const printedLines = lines.filter((line) => line.productType === LibraryProductType.PRINTED_BOOK);
  if (printedLines.length) {
    if (!settings.delivery.enablePrintedShipping) {
      throw new Error("Printed book shipping is currently disabled in Library settings.");
    }
    const shipping = normalizeShippingAddress(input.shipping);
    if (!shipping) throw new Error("Shipping details are required for printed books.");
    for (const line of printedLines) {
      if (line.product.stock != null && line.product.stock < line.quantity && !settings.inventory.allowBackorder) {
        throw new Error(`${line.product.title} only has ${line.product.stock} printed cop${line.product.stock === 1 ? "y" : "ies"} left.`);
      }
    }
  }

  const shipping = printedLines.length ? normalizeShippingAddress(input.shipping) : null;

  const order = await prisma.$transaction(async (tx) => {
    for (const line of printedLines) {
      if (line.product.stock == null || settings.inventory.allowBackorder) continue;
      const updated = await tx.libraryProduct.updateMany({
        where: { id: line.product.id, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });
      if (!updated.count) {
        throw new Error(`${line.product.title} is out of printed stock.`);
      }
      await tx.libraryInventoryMovement.create({
        data: {
          productId: line.product.id,
          type: "RESERVE",
          quantity: -line.quantity,
          note: `Reserved for checkout payment ${input.paymentId}`,
        },
      });
    }

    return tx.libraryOrder.create({
      data: {
        orderNumber: `${settings.checkout.orderPrefix}-${Date.now()}`,
        customerId: input.customerId,
        paymentId: input.paymentId,
        status: LibraryOrderStatusFromPayment(PaymentStatus.PENDING),
        subtotal: quote.subtotal,
        discountTotal: quote.discountTotal,
        total: quote.total,
        currency: quote.currency,
        couponCode: input.couponCode || null,
        metadata: {
          taxTotal: quote.taxTotal,
          shippingTotal: quote.shippingTotal,
          taxLabel: quote.taxLabel,
          taxCountry: quote.taxCountry,
          shipping,
          stockReserved: printedLines.some((line) => line.product.stock != null) && !settings.inventory.allowBackorder,
          needsShipping: printedLines.length > 0,
          hasDigital: lines.some((line) => line.productType !== LibraryProductType.PRINTED_BOOK),
        } as Prisma.InputJsonValue,
        items: {
          create: lines.map((line) => ({
            productId: line.product.id,
            title: line.title,
            sku: line.sku,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            total: line.total,
            productType: line.productType,
          })),
        },
      },
      include: { customer: { select: { id: true, name: true, email: true } }, items: true, payment: { select: { status: true } } },
    });
  });

  await logLibraryActivity({
    actorId: input.customerId,
    targetType: "order",
    targetId: order.id,
    action: "CREATED",
    message: `Library order ${order.orderNumber} created.`,
    metadata: { paymentId: input.paymentId, couponCode: input.couponCode, taxTotal: quote.taxTotal, needsShipping: printedLines.length > 0 },
  });
  return { order: toLibraryOrder(order), accessGranted: false };
}

export async function createAdminLibraryManualOrder(input: {
  customerId: string;
  items: LibraryCartLine[];
  couponCode?: string;
  provider?: string;
  referenceNumber?: string;
  note?: string;
  markPaid?: boolean;
}, actorId?: string) {
  if (!shouldUsePostgresLibrary()) {
    const order = await createLibraryOrderFromCheckout({ customerId: input.customerId, paymentId: `manual-${Date.now()}`, items: input.items, couponCode: input.couponCode });
    if (input.markPaid) {
      localLibraryOrders.forEach((entry) => {
        if (entry.id === order.order.id) {
          entry.status = "FULFILLED";
          entry.paymentStatus = "PAID";
        }
      });
    }
    return { ...order, payment: null, grant: { orders: input.markPaid ? 1 : 0, downloads: 0 } };
  }
  const quote = await quoteLibraryCart(input.items, input.couponCode, input.customerId);
  if (!quote.items.length) throw new Error("No valid Library products found.");
  const prisma = getMainPrisma();
  const payment = await prisma.payment.create({
    data: {
      userId: input.customerId,
      provider: normalizePaymentProvider(input.provider),
      status: input.markPaid ? PaymentStatus.PAID : PaymentStatus.PENDING,
      amount: quote.total,
      currency: quote.currency,
      description: "manual library order",
      plan: "library_order",
      method: input.provider || "manual",
      manual: true,
      proofStatus: input.markPaid ? "VERIFIED" : "REQUESTED",
      metadata: {
        referenceNumber: input.referenceNumber || `HL-LIB-MAN-${Date.now()}`,
        adminNote: input.note,
        createdBy: actorId,
      } as Prisma.InputJsonObject,
    },
  });
  const order = await createLibraryOrderFromCheckout({ customerId: input.customerId, paymentId: payment.id, items: quote.items, couponCode: input.couponCode });
  const grant = input.markPaid ? await fulfillPaidLibraryOrdersForPayment(payment.id) : { orders: 0, downloads: 0 };
  await notifyLibraryCustomer(input.customerId, "Library order created", input.markPaid ? "Your HouseLink Library order is paid and ready in My Library." : "Your HouseLink Library order has been created and is awaiting payment.");
  await logLibraryActivity({ actorId, targetType: "order", targetId: order.order.id, action: "MANUAL_ORDER_CREATED", message: `Manual Library order ${order.order.orderNumber} created.`, metadata: { paymentId: payment.id, markPaid: input.markPaid, note: input.note } });
  return { order: order.order, payment, grant };
}

export async function refundLibraryOrder(orderId: string, reason = "admin_refund", actorId?: string) {
  if (!shouldUsePostgresLibrary()) {
    const order = localLibraryOrders.find((entry) => entry.id === orderId);
    if (!order) return null;
    order.status = "REFUNDED";
    order.paymentStatus = "REFUNDED";
    return { order, revoked: 0 };
  }
  const prisma = getMainPrisma();
  const order = await prisma.libraryOrder.findUnique({
    where: { id: orderId },
    include: { customer: { select: { id: true } }, payment: true, items: true },
  });
  if (!order) return null;
  const metadata = (order.metadata ?? {}) as Record<string, unknown>;
  const shouldRestock = Boolean(metadata.stockReserved) || ["PAID", "FULFILLED"].includes(order.status);
  const [updated, revoked] = await prisma.$transaction(async (tx) => {
    if (shouldRestock) {
      for (const item of order.items) {
        if (item.productType !== LibraryProductType.PRINTED_BOOK) continue;
        await tx.libraryProduct.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        }).catch(() => null);
        await tx.libraryInventoryMovement.create({
          data: {
            productId: item.productId,
            type: "RESTOCK",
            quantity: item.quantity,
            note: `Refund restock for order ${order.orderNumber}`,
          },
        }).catch(() => null);
      }
    }
    const next = await tx.libraryOrder.update({
      where: { id: orderId },
      data: {
        status: LibraryOrderStatus.REFUNDED,
        refundedAt: new Date(),
        metadata: { ...metadata, reason, stockRestocked: shouldRestock } as Prisma.InputJsonValue,
      },
      include: { customer: { select: { id: true, name: true, email: true } }, items: true, payment: { select: { status: true } } },
    });
    const revokedDownloads = await tx.libraryDownloadAccess.updateMany({
      where: { orderId },
      data: { status: LibraryDownloadStatus.REVOKED },
    });
    if (order.paymentId) {
      await tx.payment.update({
        where: { id: order.paymentId },
        data: { status: PaymentStatus.REFUNDED, metadata: { reason, refundedBy: actorId } },
      }).catch(() => null);
    }
    await tx.libraryFulfilment.updateMany({
      where: { orderId, status: { not: "CANCELLED" } },
      data: { status: "CANCELLED", deliveryNotes: `Refunded: ${reason}` },
    }).catch(() => null);
    return [next, revokedDownloads] as const;
  });
  await notifyLibraryCustomer(order.customerId, "Library order refunded", "Your HouseLink Library order has been marked refunded and related download access has been revoked.");
  await logLibraryActivity({ actorId, targetType: "order", targetId: orderId, action: "ORDER_REFUNDED", message: `Library order refunded. ${revoked.count} access record(s) revoked.`, metadata: { reason, stockRestocked: shouldRestock } });
  return { order: toLibraryOrder(updated), revoked: revoked.count };
}

export async function sendLibraryOrderNotification(orderId: string, type: "invoice" | "access" | "dispatch" | "custom", message?: string, actorId?: string) {
  if (!shouldUsePostgresLibrary()) return { notification: null };
  const order = await getMainPrisma().libraryOrder.findUnique({ where: { id: orderId }, include: { customer: { select: { id: true, name: true, email: true } } } });
  if (!order) return null;
  const subject = type === "invoice" ? "HouseLink Library invoice" : type === "access" ? "HouseLink Library access" : type === "dispatch" ? "HouseLink Library dispatch update" : "HouseLink Library update";
  const body = message?.trim() || (type === "invoice" ? `Your invoice for ${order.orderNumber} is available in My Library.` : type === "access" ? "Your Library downloads are available in My Library." : type === "dispatch" ? `Your order ${order.orderNumber} has a fulfilment update.` : `There is an update on Library order ${order.orderNumber}.`);
  const notification = await notifyLibraryCustomer(order.customerId, subject, body);
  await logLibraryActivity({ actorId, targetType: "order", targetId: order.id, action: "NOTIFICATION_QUEUED", message: `${subject} notification queued.`, metadata: { type } });
  return { notification };
}

export async function fulfillPaidLibraryOrdersForPayment(paymentId: string) {
  if (!shouldUsePostgresLibrary()) {
    let downloads = 0;
    let orders = 0;
    localLibraryOrders.forEach((order) => {
      if (order.paymentId === paymentId) {
        const hasPrint = (order.items ?? []).some((item) => /print/i.test(item.title));
        order.status = hasPrint ? "PAID" : "FULFILLED";
        order.paymentStatus = "PAID";
        order.payment = { status: "PAID" };
        orders += 1;
        downloads += hasPrint ? 0 : (order.items?.length ?? 0);
      }
    });
    return { orders, downloads };
  }
  const prisma = getMainPrisma();
  const settings = await getLibraryStoreSettings();
  const orders = await prisma.libraryOrder.findMany({
    where: { paymentId, status: LibraryOrderStatus.PENDING },
    include: { items: { include: { product: { include: { files: true } } } } },
  });
  let downloads = 0;
  for (const order of orders) {
    const metadata = (order.metadata ?? {}) as Record<string, unknown>;
    const hasPrint = order.items.some((item) => item.productType === "PRINTED_BOOK");
    const hasDigital = order.items.some((item) => item.productType !== "PRINTED_BOOK");
    const nextStatus = hasPrint ? LibraryOrderStatus.PAID : LibraryOrderStatus.FULFILLED;
    await prisma.libraryOrder.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
        ...(nextStatus === LibraryOrderStatus.FULFILLED ? { fulfilledAt: new Date() } : {}),
        metadata: {
          ...metadata,
          paidAt: new Date().toISOString(),
          couponBurned: Boolean(order.couponCode),
          needsShipping: hasPrint,
          hasDigital,
        } as Prisma.InputJsonValue,
      },
    });
    await ensureLibraryInvoice(order.id);
    await ensureLibraryFulfilmentQueue(order.id);
    if (order.couponCode && !metadata.couponBurned) {
      await incrementLibraryCouponUsage(order.couponCode);
    }
    await logLibraryActivity({
      targetType: "order",
      targetId: order.id,
      action: hasPrint ? "PAID" : "FULFILLED",
      message: hasPrint
        ? `Library order ${order.orderNumber} paid. Printed items await fulfilment.`
        : `Library order ${order.orderNumber} fulfilled after payment ${paymentId}.`,
      metadata: { paymentId },
    });
    for (const item of order.items) {
      const isPrinted = item.productType === "PRINTED_BOOK";
      if (isPrinted && item.product.stock !== null && !metadata.stockReserved) {
        const updated = await prisma.libraryProduct.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count) {
          await prisma.libraryInventoryMovement.create({
            data: { productId: item.productId, type: "SALE", quantity: -item.quantity, note: `Order ${order.id}` },
          }).catch(() => null);
        }
      } else if (isPrinted && metadata.stockReserved) {
        await prisma.libraryInventoryMovement.create({
          data: { productId: item.productId, type: "SALE", quantity: 0, note: `Reserved stock confirmed for order ${order.id}` },
        }).catch(() => null);
      }
      await createLibraryAcademyEntitlementForItem(order.id, order.customerId, item.productId, item.productType);
      if (isPrinted) continue;
      const files = item.product.files.filter((file) => file.active && file.downloadable);
      if (!files.length) {
        await prisma.libraryDownloadAccess.upsert({
          where: { id: `${order.customerId}_${item.productId}_${order.id}` },
          create: {
            id: `${order.customerId}_${item.productId}_${order.id}`,
            userId: order.customerId,
            productId: item.productId,
            orderId: order.id,
            status: "ACTIVE",
            downloadLimit: resolveDownloadLimit(item.product.downloadLimit, null, settings),
            expiresAt: resolveDownloadExpiry(item.product.downloadExpiryDays, null, settings),
          },
          update: { status: "ACTIVE" },
        });
        downloads += 1;
      }
      for (const file of files) {
        const issueLicense = item.product.licenseKeys || settings.licence.generateByDefault;
        await prisma.libraryDownloadAccess.upsert({
          where: { id: `${order.customerId}_${item.productId}_${file.id}_${order.id}` },
          create: {
            id: `${order.customerId}_${item.productId}_${file.id}_${order.id}`,
            userId: order.customerId,
            productId: item.productId,
            orderId: order.id,
            fileId: file.id,
            status: "ACTIVE",
            tokenHash: createTokenHash(`${order.customerId}:${item.productId}:${file.id}:${order.id}`),
            licenseKey: issueLicense ? buildLibraryLicenseKey(settings.licence.keyPrefix) : null,
            downloadLimit: resolveDownloadLimit(item.product.downloadLimit, file.downloadLimit, settings),
            expiresAt: resolveDownloadExpiry(item.product.downloadExpiryDays, file.expiryDays, settings),
          },
          update: { status: "ACTIVE" },
        });
        downloads += 1;
      }
    }
    if (hasDigital && settings.notifications.downloadReady) {
      await notifyLibraryCustomer(order.customerId, "HouseLink Library access ready", `Your digital Library items for ${order.orderNumber} are available in My Library.`);
    }
    if (hasPrint) {
      await notifyLibraryCustomer(order.customerId, "HouseLink Library print order paid", `Payment received for ${order.orderNumber}. We are preparing your printed book(s) for dispatch.`);
    }
  }
  return { orders: orders.length, downloads };
}

export async function revokeLibraryAccessForPayment(
  paymentId: string,
  reason = "payment_reversed",
  mode: "reject" | "refund" = "refund",
) {
  if (!shouldUsePostgresLibrary()) return { orders: 0, downloads: 0 };
  const prisma = getMainPrisma();
  const orders = await prisma.libraryOrder.findMany({
    where: { paymentId },
    include: { items: true },
  });
  if (!orders.length) return { orders: 0, downloads: 0 };
  for (const order of orders) {
    const metadata = (order.metadata ?? {}) as Record<string, unknown>;
    // Keep reserved print stock on reject (customer can re-upload). Restock only on refund.
    const shouldRestock = mode === "refund" && (Boolean(metadata.stockReserved) || ["PAID", "FULFILLED"].includes(order.status));
    if (shouldRestock) {
      for (const item of order.items) {
        if (item.productType !== LibraryProductType.PRINTED_BOOK) continue;
        await prisma.libraryProduct.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        }).catch(() => null);
        await prisma.libraryInventoryMovement.create({
          data: {
            productId: item.productId,
            type: "RESTOCK",
            quantity: item.quantity,
            note: `Refunded restock for ${order.orderNumber}`,
          },
        }).catch(() => null);
      }
    }
    await prisma.libraryOrder.update({
      where: { id: order.id },
      data: {
        status: mode === "reject" ? LibraryOrderStatus.PENDING : LibraryOrderStatus.REFUNDED,
        ...(mode === "refund" ? { refundedAt: new Date() } : {}),
        metadata: {
          ...metadata,
          revokeReason: reason,
          revokeMode: mode,
          stockRestocked: shouldRestock,
          ...(mode === "reject" ? { paymentRejectedAt: new Date().toISOString() } : {}),
        } as Prisma.InputJsonValue,
      },
    });
    if (mode === "refund") {
      await prisma.libraryFulfilment.updateMany({
        where: { orderId: order.id, status: { not: "CANCELLED" } },
        data: { status: "CANCELLED", deliveryNotes: `Refunded: ${reason}` },
      }).catch(() => null);
    }
  }
  const orderIds = orders.map((order) => order.id);
  const downloads = await prisma.libraryDownloadAccess.updateMany({
    where: { orderId: { in: orderIds } },
    data: { status: LibraryDownloadStatus.REVOKED },
  });
  return { orders: orderIds.length, downloads: downloads.count };
}

export async function listCustomerLibrary(customerId: string) {
  if (!shouldUsePostgresLibrary()) {
    const orders = await listLibraryOrders(customerId);
    const productIds = new Set(
      localLibraryOrders
        .filter((order) => order.customerId === customerId && (order.status === "PAID" || order.status === "FULFILLED"))
        .flatMap((order) => order.items?.map((item) => item.productId) ?? []),
    );
    return { products: localLibraryProducts.filter((product) => productIds.has(product.id)), orders, downloads: [], wishlist: [], wishlistCount: 0 };
  }
  try {
    const [orders, downloads, wishlist] = await Promise.all([
      listLibraryOrders(customerId),
      getMainPrisma().libraryDownloadAccess.findMany({
        where: { userId: customerId },
        include: { product: { include: productInclude() }, file: true },
        orderBy: { createdAt: "desc" },
      }),
      getMainPrisma().libraryWishlistItem.findMany({
        where: { userId: customerId },
        include: { product: { include: productInclude() } },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    const productMap = new Map<string, LibraryProduct>();
    downloads.forEach((download) => productMap.set(download.productId, toLibraryProduct(download.product as DbProduct)));
    return {
      products: Array.from(productMap.values()),
      orders,
      downloads: downloads.map((download) => ({
        id: download.id,
        productId: download.productId,
        orderId: download.orderId,
        productTitle: download.product.title,
        fileName: download.file?.fileName ?? download.product.title,
        status: download.status,
        downloadCount: download.downloadCount,
        downloadLimit: download.downloadLimit,
        expiresAt: download.expiresAt?.toISOString() ?? null,
      })),
      wishlist: wishlist.map((item) => toLibraryProduct(item.product as DbProduct)),
      wishlistCount: wishlist.length,
    };
  } catch {
    return { products: [], orders: [], downloads: [], wishlist: [], wishlistCount: 0 };
  }
}

export async function toggleLibraryWishlist(userId: string, productId: string) {
  if (!userId || !productId) return null;
  if (!shouldUsePostgresLibrary()) {
    return { wished: true, productId };
  }
  const prisma = getMainPrisma();
  const existing = await prisma.libraryWishlistItem.findUnique({ where: { userId_productId: { userId, productId } } }).catch(() => null);
  if (existing) {
    await prisma.libraryWishlistItem.delete({ where: { userId_productId: { userId, productId } } });
    return { wished: false, productId };
  }
  const product = await prisma.libraryProduct.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) return null;
  await prisma.libraryWishlistItem.create({ data: { userId, productId } });
  return { wished: true, productId };
}

export async function isLibraryWishlisted(userId: string, productId: string) {
  if (!userId || !productId || !shouldUsePostgresLibrary()) return false;
  const row = await getMainPrisma().libraryWishlistItem.findUnique({ where: { userId_productId: { userId, productId } } }).catch(() => null);
  return Boolean(row);
}

export async function createLibraryCustomerReview(input: { userId: string; productId: string; rating: number; title?: string; body?: string }) {
  const settings = await getLibraryStoreSettings();
  if (!settings.reviews.enabled) return { error: "REVIEWS_DISABLED" as const };
  const rating = Math.min(5, Math.max(settings.reviews.minRating, Math.round(Number(input.rating) || 0)));
  if (!input.userId || !input.productId || rating < settings.reviews.minRating) return null;
  const status = settings.reviews.autoApprove ? "APPROVED" : "PENDING";
  if (!shouldUsePostgresLibrary()) {
    return { id: `local-review-${Date.now()}`, productId: input.productId, rating, status };
  }
  const prisma = getMainPrisma();
  let purchased = true;
  if (settings.reviews.requirePurchase) {
    const access = await prisma.libraryDownloadAccess.findFirst({
      where: { userId: input.userId, productId: input.productId, status: { in: ["ACTIVE", "EXPIRED"] } },
      select: { id: true },
    });
    purchased = access
      ? true
      : Boolean(
          await prisma.libraryOrderItem.findFirst({
            where: {
              productId: input.productId,
              order: { customerId: input.userId, status: { in: ["PAID", "FULFILLED"] } },
            },
            select: { id: true },
          }),
        );
  }
  if (!purchased) return { error: "PURCHASE_REQUIRED" as const };
  const review = await prisma.libraryReview.upsert({
    where: { productId_userId: { productId: input.productId, userId: input.userId } },
    create: {
      productId: input.productId,
      userId: input.userId,
      rating,
      title: input.title?.trim() || null,
      body: input.body?.trim() || null,
      status,
      verified: settings.reviews.requirePurchase,
    },
    update: {
      rating,
      title: input.title?.trim() || null,
      body: input.body?.trim() || null,
      status,
      verified: settings.reviews.requirePurchase,
    },
  });
  await recalculateLibraryProductRating(input.productId);
  return review;
}

export async function listApprovedLibraryProductReviews(productId: string, limit = 12) {
  if (!productId || !shouldUsePostgresLibrary()) return [];
  const rows = await getMainPrisma().libraryReview.findMany({
    where: { productId, status: { in: ["APPROVED", "PUBLISHED"] } },
    include: { user: { select: { name: true } } },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: limit,
  }).catch(() => []);
  return rows.map((row) => ({
    id: row.id,
    rating: row.rating,
    title: row.title,
    body: row.body,
    featured: row.featured,
    verified: row.verified,
    createdAt: row.createdAt.toISOString(),
    authorName: row.user.name || "HouseLink customer",
  }));
}

export async function buildLibraryExportCsv(type: string) {
  if (!shouldUsePostgresLibrary()) return "type,message\nexport,Postgres store required\n";
  const prisma = getMainPrisma();
  const normalized = type.trim().toLowerCase();
  if (normalized === "products" || normalized === "catalog") {
    const products = await prisma.libraryProduct.findMany({
      include: { category: true, author: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    });
    return toCsv(
      ["id", "title", "slug", "status", "productType", "price", "currency", "stock", "category", "author", "sku"],
      products.map((product) => [
        product.id,
        product.title,
        product.slug,
        product.status,
        product.productType,
        Number(product.price),
        product.currency,
        product.stock ?? "",
        product.category?.name ?? "",
        product.author?.name ?? "",
        product.sku,
      ]),
    );
  }
  if (normalized === "orders" || normalized === "sales" || normalized === "revenue") {
    const orders = await prisma.libraryOrder.findMany({
      include: { customer: { select: { email: true, name: true } }, payment: { select: { provider: true, method: true, status: true } } },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    return toCsv(
      ["id", "orderNumber", "status", "paymentStatus", "total", "currency", "customerEmail", "customerName", "provider", "createdAt"],
      orders.map((order) => [
        order.id,
        order.orderNumber,
        order.status,
        order.payment?.status ?? "",
        Number(order.total),
        order.currency,
        order.customer.email,
        order.customer.name,
        order.payment?.method || order.payment?.provider || "",
        order.createdAt.toISOString(),
      ]),
    );
  }
  if (normalized === "downloads") {
    const downloads = await prisma.libraryDownloadAccess.findMany({
      include: { user: { select: { email: true } }, product: { select: { title: true } }, file: { select: { fileName: true } } },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    return toCsv(
      ["id", "product", "file", "userEmail", "status", "downloadCount", "downloadLimit", "expiresAt"],
      downloads.map((download) => [
        download.id,
        download.product.title,
        download.file?.fileName ?? "",
        download.user.email,
        download.status,
        download.downloadCount,
        download.downloadLimit ?? "",
        download.expiresAt?.toISOString() ?? "",
      ]),
    );
  }
  if (normalized === "coupons") {
    const coupons = await prisma.libraryCoupon.findMany({ orderBy: { updatedAt: "desc" }, take: 2000 });
    return toCsv(
      ["id", "code", "discountType", "discountValue", "usedCount", "usageLimit", "active", "expiresAt"],
      coupons.map((coupon) => [
        coupon.id,
        coupon.code,
        coupon.discountType,
        Number(coupon.discountValue),
        coupon.usedCount,
        coupon.usageLimit ?? "",
        coupon.active,
        coupon.expiresAt?.toISOString() ?? "",
      ]),
    );
  }
  if (normalized === "customers") {
    const customers = await prisma.libraryOrder.groupBy({
      by: ["customerId"],
      _count: { _all: true },
      _sum: { total: true },
      orderBy: { _sum: { total: "desc" } },
      take: 2000,
    });
    const users = await prisma.user.findMany({
      where: { id: { in: customers.map((item) => item.customerId) } },
      select: { id: true, email: true, name: true },
    });
    const userMap = new Map(users.map((user) => [user.id, user]));
    return toCsv(
      ["customerId", "name", "email", "orders", "lifetimeValue"],
      customers.map((item) => {
        const user = userMap.get(item.customerId);
        return [item.customerId, user?.name ?? "", user?.email ?? "", item._count._all, Number(item._sum.total ?? 0)];
      }),
    );
  }
  if (normalized === "inventory") {
    const products = await prisma.libraryProduct.findMany({
      where: { productType: LibraryProductType.PRINTED_BOOK },
      orderBy: { title: "asc" },
      take: 5000,
    });
    return toCsv(
      ["id", "title", "sku", "stock", "lowStockThreshold", "warehouse", "supplier"],
      products.map((product) => [product.id, product.title, product.sku, product.stock ?? "", product.lowStockThreshold, product.warehouse ?? "", product.supplier ?? ""]),
    );
  }
  if (normalized === "taxes" || normalized === "refunds") {
    const orders = await prisma.libraryOrder.findMany({
      where: normalized === "refunds" ? { status: LibraryOrderStatus.REFUNDED } : undefined,
      include: { customer: { select: { email: true } }, invoices: { select: { taxTotal: true }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    return toCsv(
      ["id", "orderNumber", "status", "total", "currency", "taxTotal", "customerEmail", "createdAt"],
      orders.map((order) => [
        order.id,
        order.orderNumber,
        order.status,
        Number(order.total),
        order.currency,
        Number(order.invoices[0]?.taxTotal ?? 0),
        order.customer.email,
        order.createdAt.toISOString(),
      ]),
    );
  }
  return toCsv(["type", "message"], [[normalized, "Unsupported export type"]]);
}

function toCsv(headers: string[], rows: Array<Array<string | number | boolean | null | undefined>>) {
  const escape = (value: string | number | boolean | null | undefined) => {
    const text = value == null ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return `${headers.join(",")}\n${rows.map((row) => row.map(escape).join(",")).join("\n")}\n`;
}

export async function getLibraryOrderForUser(orderId: string, userId: string, roles: string[] = []) {
  if (!shouldUsePostgresLibrary()) {
    const order = localLibraryOrders.find((entry) => entry.id === orderId) ?? null;
    if (!order) return null;
    const admin = roles.some((role) => ["ADMIN", "SUPER_ADMIN"].includes(role));
    if (!admin && order.customerId !== userId) return "FORBIDDEN" as const;
    return order;
  }
  const admin = roles.some((role) => ["ADMIN", "SUPER_ADMIN"].includes(role));
  const order = await getMainPrisma().libraryOrder.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      items: true,
      payment: {
        select: {
          id: true,
          status: true,
          provider: true,
          method: true,
          proofStatus: true,
          proofUrl: true,
          manual: true,
          metadata: true,
        },
      },
      fulfilments: { orderBy: { createdAt: "desc" }, take: 1 },
      invoices: { orderBy: { issuedAt: "desc" }, take: 1 },
    },
  }).catch(() => null);
  if (!order) return null;
  if (!admin && order.customerId !== userId) return "FORBIDDEN" as const;
  const metadata = (order.metadata ?? {}) as Record<string, unknown>;
  const fulfilment = order.fulfilments[0] ?? null;
  const paymentMeta = (order.payment?.metadata ?? {}) as Record<string, unknown>;
  return {
    ...toLibraryOrder(order),
    subtotal: Number(order.subtotal),
    discountTotal: Number(order.discountTotal),
    taxTotal: Number((metadata.taxTotal as number | undefined) ?? order.invoices[0]?.taxTotal ?? 0),
    shipping: (metadata.shipping as LibraryShippingAddress | null | undefined) ?? null,
    needsShipping: Boolean(metadata.needsShipping),
    items: order.items.map((item) => ({
      id: item.id,
      title: item.title,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      total: Number(item.total),
      productId: item.productId,
      productType: item.productType,
    })),
    payment: order.payment
      ? {
          id: order.payment.id,
          status: order.payment.status,
          provider: order.payment.provider,
          method: order.payment.method,
          proofStatus: order.payment.proofStatus,
          proofUrl: order.payment.proofUrl,
          manual: order.payment.manual,
          referenceNumber: typeof paymentMeta.referenceNumber === "string" ? paymentMeta.referenceNumber : null,
          adminNote:
            (typeof paymentMeta.adminNote === "string" && paymentMeta.adminNote) ||
            (typeof paymentMeta.rejectReason === "string" && paymentMeta.rejectReason) ||
            (typeof paymentMeta.refundReason === "string" && paymentMeta.refundReason) ||
            null,
          metadata: paymentMeta,
        }
      : null,
    fulfilment: fulfilment
      ? {
          id: fulfilment.id,
          status: fulfilment.status,
          courier: fulfilment.courier,
          trackingNumber: fulfilment.trackingNumber,
          trackingUrl: fulfilment.trackingUrl,
          packedAt: fulfilment.packedAt?.toISOString() ?? null,
          dispatchedAt: fulfilment.dispatchedAt?.toISOString() ?? null,
          deliveredAt: fulfilment.deliveredAt?.toISOString() ?? null,
          dispatchNotes: fulfilment.dispatchNotes,
          deliveryNotes: fulfilment.deliveryNotes,
        }
      : null,
  };
}

export async function getLibraryInvoiceForUser(orderId: string, userId: string, roles: string[] = []) {
  if (!shouldUsePostgresLibrary()) {
    const order = localLibraryOrders.find((entry) => entry.id === orderId);
    return order ? { order, invoice: { invoiceNumber: `HL-LIB-INV-${order.orderNumber}`, taxTotal: 0 } } : null;
  }
  const admin = roles.some((role) => ["ADMIN", "SUPER_ADMIN"].includes(role));
  const order = await getMainPrisma().libraryOrder.findUnique({
    where: { id: orderId },
    include: { customer: { select: { id: true, name: true, email: true } }, items: true, payment: { select: { status: true } } },
  });
  if (!order) return null;
  if (!admin && order.customerId !== userId) return "FORBIDDEN" as const;
  const invoice = await ensureLibraryInvoice(order.id);
  const metadata = (order.metadata ?? {}) as Record<string, unknown>;
  return {
    order: {
      ...toLibraryOrder(order),
      subtotal: Number(order.subtotal),
      discountTotal: Number(order.discountTotal),
      shipping: (metadata.shipping as LibraryShippingAddress | null | undefined) ?? null,
      items: order.items.map((item) => ({
        id: item.id,
        title: item.title,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        total: Number(item.total),
        productType: item.productType,
      })),
    },
    invoice,
  };
}

export async function getDownloadForUser(accessId: string, userId: string, roles: string[] = []) {
  const access = await getMainPrisma().libraryDownloadAccess.findUnique({
    where: { id: accessId },
    include: { file: true, product: true, user: { select: { name: true, email: true } }, order: { select: { orderNumber: true } } },
  });
  if (!access) return null;
  const admin = roles.some((role) => ["ADMIN", "SUPER_ADMIN"].includes(role));
  if (!admin && access.userId !== userId) return "FORBIDDEN" as const;
  if (access.status !== "ACTIVE") return "DISABLED" as const;
  if (access.expiresAt && access.expiresAt.getTime() < Date.now()) return "EXPIRED" as const;
  if (access.downloadLimit != null && access.downloadCount >= access.downloadLimit) return "LIMIT_REACHED" as const;
  return access;
}

export async function markLibraryDownload(accessId: string) {
  await getMainPrisma().libraryDownloadAccess.update({
    where: { id: accessId },
    data: { downloadCount: { increment: 1 }, lastDownloadAt: new Date() },
  });
}

export async function auditLibraryDownload(input: { accessId: string; userId: string; fileUrl?: string; request: Request }) {
  if (!shouldUsePostgresLibrary()) return;
  await getMainPrisma().auditEvent.create({
    data: {
      actorId: input.userId,
      action: "LIBRARY_DOWNLOAD",
      target: input.accessId,
      metadata: {
        fileUrl: input.fileUrl,
        ip: input.request.headers.get("x-forwarded-for") ?? input.request.headers.get("x-real-ip"),
        userAgent: input.request.headers.get("user-agent"),
      },
    },
  }).catch(() => null);
}

export async function getLibraryOperationsSummary() {
  if (!shouldUsePostgresLibrary()) {
    const storeSettings = await getLibraryStoreSettings();
    return {
      fulfilments: [],
      invoices: [],
      activities: [],
      exports: [],
      taxSettings: [],
      storeSettings,
      coupons: localLibraryCoupons,
      taxonomy: localLibraryTaxonomy,
      downloadAccess: [],
      reviews: [],
      guestClaims: [],
      academyEntitlements: [],
      recommendations: [],
      reports: buildLibraryAdminReports({ orders: [], products: localLibraryProducts, coupons: localLibraryCoupons, downloadAccess: [], reviews: [], taxSettings: [], inventoryMovements: [], storeSettings }),
    };
  }
  const prisma = getMainPrisma();
  try {
    const [fulfilments, invoices, activities, exports, taxSettings, storeSettings, coupons, categories, collections, authors, downloadAccess, reviews, guestClaims, academyEntitlements, recommendations, orders, products, inventoryMovements] = await Promise.all([
      prisma.libraryFulfilment.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { order: { select: { orderNumber: true, total: true, currency: true } } } }),
      prisma.libraryInvoice.findMany({ orderBy: { issuedAt: "desc" }, take: 20, include: { order: { select: { orderNumber: true } } } }),
      prisma.libraryActivity.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
      prisma.libraryExportJob.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
      prisma.libraryTaxSetting.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
      getLibraryStoreSettings(),
      prisma.libraryCoupon.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.libraryCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } }),
      prisma.libraryCollection.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } }),
      prisma.libraryAuthor.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } }),
      prisma.libraryDownloadAccess.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { name: true, email: true } }, product: { select: { title: true } }, order: { select: { orderNumber: true } }, file: { select: { fileName: true } } } }),
      prisma.libraryReview.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { product: { select: { title: true } }, user: { select: { name: true, email: true } } } }),
      prisma.libraryGuestClaim.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { order: { select: { orderNumber: true } } } }),
      prisma.libraryAcademyEntitlement.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.libraryRecommendation.findMany({
        where: { active: true },
        orderBy: [{ weight: "desc" }, { createdAt: "desc" }],
        take: 20,
        include: { sourceProduct: { select: { title: true } }, targetProduct: { select: { title: true } } },
      }),
      prisma.libraryOrder.findMany({
        orderBy: { createdAt: "desc" },
        take: 500,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          items: { include: { product: { select: { title: true, viewCount: true, downloadCount: true } } } },
          payment: { select: { provider: true, status: true } },
          downloads: true,
        },
      }),
      prisma.libraryProduct.findMany({
        where: { deletedAt: null },
        include: { category: true, files: true, reviews: true, orderItems: true, downloads: true },
        take: 500,
      }),
      prisma.libraryInventoryMovement.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { product: { select: { title: true } } },
      }),
    ]);
    const reports = buildLibraryAdminReports({ orders, products, coupons, downloadAccess, reviews, taxSettings, inventoryMovements, storeSettings });
    return {
      fulfilments,
      invoices,
      activities,
      exports,
      taxSettings,
      storeSettings,
      coupons: coupons.map(toLibraryCouponAdmin),
      taxonomy: [
        ...categories.map((row) => toLibraryTaxonomyAdmin("category", row)),
        ...collections.map((row) => toLibraryTaxonomyAdmin("collection", row)),
        ...authors.map((row) => toLibraryTaxonomyAdmin("author", row)),
      ],
      downloadAccess: downloadAccess.map(toLibraryDownloadAccessAdmin),
      reviews: reviews.map(toLibraryReviewAdmin),
      guestClaims,
      academyEntitlements,
      recommendations,
      reports,
    };
  } catch {
    const storeSettings = await getLibraryStoreSettings();
    return {
      fulfilments: [],
      invoices: [],
      activities: [],
      exports: [],
      taxSettings: [],
      storeSettings,
      coupons: [],
      taxonomy: [],
      downloadAccess: [],
      reviews: [],
      guestClaims: [],
      academyEntitlements: [],
      recommendations: [],
      reports: buildLibraryAdminReports({ orders: [], products: [], coupons: [], downloadAccess: [], reviews: [], taxSettings: [], inventoryMovements: [], storeSettings }),
    };
  }
}

function buildLibraryAdminReports(input: {
  orders: Array<{
    id: string;
    status: string;
    total: unknown;
    discountTotal?: unknown;
    currency?: string;
    createdAt: Date | string;
    customer?: { id: string; name: string | null; email: string } | null;
    items?: Array<{ productId: string; title: string; quantity: number; total: unknown; product?: { title: string; viewCount: number; downloadCount: number } | null }>;
    payment?: { provider?: string | null; status?: string | null } | null;
    downloads?: unknown[];
  }>;
  products: Array<{
    id: string;
    title: string;
    status?: string;
    stock?: number | null;
    lowStockThreshold?: number;
    warehouse?: string | null;
    supplier?: string | null;
    viewCount?: number;
    downloadCount?: number;
    price?: unknown;
    seoTitle?: string | null;
    metaDescription?: string | null;
    shortDescription?: string | null;
    gallery?: unknown[];
    files?: unknown[];
    reviews?: Array<{ status: string; rating: number }>;
    orderItems?: Array<{ quantity: number; total: unknown }>;
    downloads?: unknown[];
  }>;
  coupons: Array<{ id: string; code: string; discountType: string; discountValue: unknown; usedCount: number; active: boolean; startsAt?: Date | string | null; expiresAt?: Date | string | null }>;
  downloadAccess: Array<{ id: string; status: string; downloadCount: number; downloadLimit: number | null; expiresAt: Date | string | null; lastDownloadAt: Date | string | null; user?: { name: string | null; email: string } | null; product?: { title: string } | null; file?: { fileName: string } | null }>;
  reviews: Array<{ status: string; rating: number }>;
  taxSettings: Array<{ id: string; name: string; country: string; rate: unknown; active: boolean }>;
  inventoryMovements: Array<{ id: string; type: string; quantity: number; note?: string | null; createdAt: Date | string; product?: { title: string } | null }>;
  storeSettings?: LibraryStoreSettings;
}): LibraryAdminReports {
  const paidOrders = input.orders.filter((order) => ["PAID", "FULFILLED"].includes(order.status));
  const refundedOrders = input.orders.filter((order) => order.status === "REFUNDED");
  const revenue = paidOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
  const refundAmount = refundedOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
  const downloads = input.downloadAccess.reduce((sum, access) => sum + access.downloadCount, 0);
  const visitors = input.products.reduce((sum, product) => sum + Number(product.viewCount ?? 0), 0);
  const lowStock = input.products.filter((product) => product.stock != null && product.stock <= (product.lowStockThreshold ?? 0));
  const pendingReviews = input.reviews.filter((review) => review.status === "PENDING").length;
  const activeCoupons = input.coupons.filter((coupon) => coupon.active).length;
  const productRevenue = new Map<string, { id: string; title: string; revenue: number; units: number; views: number; downloads: number; health: number }>();
  input.products.forEach((product) => {
    productRevenue.set(product.id, {
      id: product.id,
      title: product.title,
      revenue: 0,
      units: 0,
      views: Number(product.viewCount ?? 0),
      downloads: Number(product.downloadCount ?? 0),
      health: productHealthScore(product),
    });
  });
  input.orders.forEach((order) => {
    order.items?.forEach((item) => {
      const current = productRevenue.get(item.productId) ?? { id: item.productId, title: item.product?.title ?? item.title, revenue: 0, units: 0, views: item.product?.viewCount ?? 0, downloads: item.product?.downloadCount ?? 0, health: 50 };
      current.revenue += Number(item.total ?? 0);
      current.units += item.quantity;
      productRevenue.set(item.productId, current);
    });
  });
  const customers = new Map<string, { id: string; userId: string; name: string; email: string; orders: number; spend: number; downloads: number; lastOrderAt: string; segment: string }>();
  input.orders.forEach((order) => {
    const email = order.customer?.email ?? "unknown@houselink.local";
    const userId = order.customer?.id ?? "";
    const current = customers.get(userId || email) ?? { id: userId || email, userId, name: order.customer?.name ?? "Library customer", email, orders: 0, spend: 0, downloads: 0, lastOrderAt: "", segment: "New" };
    current.orders += 1;
    current.spend += Number(order.total ?? 0);
    current.downloads += order.downloads?.length ?? 0;
    const createdAt = toIso(order.createdAt);
    if (!current.lastOrderAt || createdAt > current.lastOrderAt) current.lastOrderAt = createdAt;
    current.segment = current.spend >= 500 ? "VIP" : current.orders >= 3 ? "Repeat" : current.downloads > 0 ? "Activated" : "New";
    customers.set(userId || email, current);
  });
  return {
    scorecards: [
      { label: "Revenue", value: roundMoney(revenue), detail: `${paidOrders.length} paid orders`, tone: "success" },
      { label: "Average order", value: paidOrders.length ? roundMoney(revenue / paidOrders.length) : 0, detail: "Net of paid Library orders", tone: "info" },
      { label: "Refund rate", value: input.orders.length ? Number(((refundedOrders.length / input.orders.length) * 100).toFixed(1)) : 0, detail: `${refundedOrders.length} refunded orders`, tone: refundedOrders.length ? "warning" : "success" },
      { label: "Download events", value: downloads, detail: `${input.downloadAccess.length} access records`, tone: "default" },
      { label: "Low stock", value: lowStock.length, detail: "Products at or under threshold", tone: lowStock.length ? "danger" : "success" },
      { label: "Pending reviews", value: pendingReviews, detail: "Need moderation", tone: pendingReviews ? "warning" : "success" },
    ],
    funnel: [
      { label: "Views", value: visitors },
      { label: "Orders", value: input.orders.length },
      { label: "Paid", value: paidOrders.length },
      { label: "Downloads", value: input.downloadAccess.length },
      { label: "Reviews", value: input.reviews.length },
    ],
    revenueTrend: buildSalesTrend(paidOrders.map((order) => ({ total: { toString: () => String(order.total ?? 0) } as Prisma.Decimal, createdAt: new Date(order.createdAt) }))),
    orderStatus: countBy(input.orders, (order) => order.status),
    paymentGateways: countBy(input.orders, (order) => order.payment?.provider ?? "MANUAL/UNKNOWN"),
    productPerformance: Array.from(productRevenue.values())
      .map((row) => ({ ...row, conversionRate: row.views ? Number(((row.units / row.views) * 100).toFixed(1)) : 0 }))
      .sort((a, b) => b.revenue - a.revenue || b.downloads - a.downloads)
      .slice(0, 20),
    customerSegments: Array.from(customers.values()).sort((a, b) => b.spend - a.spend).slice(0, 50),
    couponPerformance: input.coupons.map((coupon) => ({
      id: coupon.id,
      code: coupon.code,
      usedCount: coupon.usedCount,
      discountValue: Number(coupon.discountValue ?? 0),
      discountType: coupon.discountType,
      active: coupon.active,
      status: coupon.active && (!coupon.expiresAt || new Date(coupon.expiresAt) >= new Date()) ? "ACTIVE" : "INACTIVE",
    })),
    downloadLogs: input.downloadAccess.map((access) => ({
      id: access.id,
      customer: access.user?.name ?? access.user?.email ?? "Customer",
      product: access.product?.title ?? "Library product",
      file: access.file?.fileName ?? "Product access",
      status: access.status,
      usage: `${access.downloadCount}${access.downloadLimit == null ? "" : `/${access.downloadLimit}`}`,
      lastDownloadAt: access.lastDownloadAt ? toIso(access.lastDownloadAt) : null,
      expiresAt: access.expiresAt ? toIso(access.expiresAt) : null,
    })),
    stockAlerts: lowStock.map((product) => ({
      id: product.id,
      title: product.title,
      stock: product.stock ?? 0,
      threshold: product.lowStockThreshold ?? 0,
      warehouse: product.warehouse ?? "Unassigned",
      supplier: product.supplier ?? "Unassigned",
      state: product.stock === 0 ? "OUT" : "LOW",
    })),
    inventoryMovements: input.inventoryMovements.map((movement) => ({
      id: movement.id,
      productTitle: movement.product?.title ?? "Library product",
      type: movement.type,
      quantity: movement.quantity,
      note: movement.note,
      createdAt: toIso(movement.createdAt),
    })),
    taxSummary: input.taxSettings.map((tax) => ({ id: tax.id, name: tax.name, country: tax.country, rate: Number(tax.rate ?? 0), active: tax.active, collected: 0 })),
    refundSummary: { orders: refundedOrders.length, amount: refundAmount, rate: input.orders.length ? Number(((refundedOrders.length / input.orders.length) * 100).toFixed(1)) : 0 },
    settingsHealth: buildSettingsHealth({
      taxSettings: input.taxSettings,
      products: input.products,
      activeCoupons,
      pendingReviews,
      lowStockCount: lowStock.length,
      storeSettings: input.storeSettings,
    }),
  };
}

function buildSettingsHealth(input: {
  taxSettings: Array<{ active: boolean }>;
  products: Array<{ files?: unknown[] }>;
  activeCoupons: number;
  pendingReviews: number;
  lowStockCount: number;
  storeSettings?: LibraryStoreSettings;
}) {
  const settings = input.storeSettings;
  return [
    { area: "Store", status: settings?.store.enabled === false ? "DISABLED" : "READY", detail: settings?.store.enabled === false ? "Library storefront checkout is disabled." : `${settings?.store.name ?? "HouseLink Library"} is live.` },
    { area: "Checkout", status: settings?.checkout.requireTerms ? "READY" : "OPEN", detail: settings?.checkout.requireTerms ? "Terms acceptance required at checkout." : "Terms acceptance optional." },
    { area: "Tax", status: input.taxSettings.some((setting) => setting.active) ? "READY" : "NEEDS_SETUP", detail: input.taxSettings.some((setting) => setting.active) ? `Active tax rule for ${settings?.tax.defaultCountry ?? "default country"}.` : "Add at least one active tax rule." },
    { area: "Delivery", status: settings?.delivery.enablePrintedShipping ? "READY" : "DISABLED", detail: settings?.delivery.enablePrintedShipping ? `Flat rate ${settings.store.currency} ${Number(settings.delivery.flatRate).toFixed(2)}; free from ${settings.delivery.freeShippingMin ?? "n/a"}.` : "Printed shipping disabled." },
    { area: "Downloads", status: input.products.some((product) => (product.files?.length ?? 0) > 0) ? "READY" : "NEEDS_FILES", detail: `Token TTL ${settings?.downloads.tokenTtlSeconds ?? 900}s; watermark ${settings?.downloads.enforceWatermarkFlag ? "enforced" : "always on"}.` },
    { area: "Licence", status: settings?.licence.generateByDefault ? "AUTO" : "PER_PRODUCT", detail: `Prefix ${settings?.licence.keyPrefix ?? "HL"}; ${settings?.licence.generateByDefault ? "keys generated by default." : "product toggle controls keys."}` },
    { area: "Reviews", status: !settings?.reviews.enabled ? "DISABLED" : input.pendingReviews ? "MODERATION" : "CLEAR", detail: !settings?.reviews.enabled ? "Reviews disabled." : input.pendingReviews ? `${input.pendingReviews} pending.` : settings?.reviews.autoApprove ? "Auto-approve enabled." : "No pending review queue." },
    { area: "SEO", status: settings?.seo.storeTitle ? "READY" : "NEEDS_SETUP", detail: settings?.seo.robotsIndex === false ? "Storefront set to noindex." : settings?.seo.storeTitle || "Set storefront SEO title and description." },
    { area: "Coupons", status: !settings?.checkout.allowCoupons ? "DISABLED" : input.activeCoupons ? "READY" : "OPTIONAL", detail: !settings?.checkout.allowCoupons ? "Coupons disabled in checkout settings." : `${input.activeCoupons} active campaign${input.activeCoupons === 1 ? "" : "s"}.` },
    { area: "Inventory", status: input.lowStockCount ? "ATTENTION" : "READY", detail: input.lowStockCount ? `${input.lowStockCount} product${input.lowStockCount === 1 ? "" : "s"} low on stock.` : `Low-stock threshold ${settings?.inventory.lowStockThreshold ?? 5}.` },
  ];
}

function resolveShippingTotal(taxable: number, taxTotal: number, settings: LibraryStoreSettings) {
  if (!settings.delivery.enablePrintedShipping) return 0;
  const basis = taxable + taxTotal;
  if (settings.delivery.freeShippingMin != null && basis >= settings.delivery.freeShippingMin) return 0;
  return roundMoney(Math.max(0, settings.delivery.flatRate));
}

function buildLibraryLicenseKey(prefix: string) {
  return `${prefix}-${randomBytes(6).toString("hex").toUpperCase()}`;
}

function resolveDownloadLimit(productLimit: number | null | undefined, fileLimit: number | null | undefined, settings: LibraryStoreSettings) {
  if (fileLimit != null) return fileLimit;
  if (productLimit != null) return productLimit;
  return settings.downloads.defaultLimit;
}

function resolveDownloadExpiry(productDays: number | null | undefined, fileDays: number | null | undefined, settings: LibraryStoreSettings) {
  const days = fileDays ?? productDays ?? settings.downloads.defaultExpiryDays;
  return days ? new Date(Date.now() + days * 86400000) : null;
}

function countBy<T>(rows: T[], getKey: (row: T) => string) {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    const key = getKey(row) || "Unknown";
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
}

function productHealthScore(product: { status?: string; seoTitle?: string | null; metaDescription?: string | null; shortDescription?: string | null; files?: unknown[]; reviews?: Array<{ status: string }>; stock?: number | null; lowStockThreshold?: number; viewCount?: number }) {
  let score = 35;
  if (product.status === "PUBLISHED") score += 15;
  if (product.seoTitle && product.metaDescription) score += 15;
  if (product.shortDescription) score += 10;
  if ((product.files?.length ?? 0) > 0) score += 10;
  if ((product.reviews?.filter((review) => review.status === "APPROVED").length ?? 0) > 0) score += 10;
  if (product.stock == null || product.stock > (product.lowStockThreshold ?? 0)) score += 5;
  return Math.min(100, score);
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export async function updateLibraryFulfilment(id: string, input: { status?: string; courier?: string; trackingNumber?: string; trackingUrl?: string; dispatchNotes?: string; deliveryNotes?: string }, actorId?: string) {
  if (!shouldUsePostgresLibrary()) return null;
  const data: Prisma.LibraryFulfilmentUpdateInput = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.courier !== undefined ? { courier: input.courier || null } : {}),
    ...(input.trackingNumber !== undefined ? { trackingNumber: input.trackingNumber || null } : {}),
    ...(input.trackingUrl !== undefined ? { trackingUrl: input.trackingUrl || null } : {}),
    ...(input.dispatchNotes !== undefined ? { dispatchNotes: input.dispatchNotes || null } : {}),
    ...(input.deliveryNotes !== undefined ? { deliveryNotes: input.deliveryNotes || null } : {}),
    ...(input.status === "PACKED" ? { packedAt: new Date() } : {}),
    ...(input.status === "DISPATCHED" ? { dispatchedAt: new Date() } : {}),
    ...(input.status === "DELIVERED" ? { deliveredAt: new Date() } : {}),
  };
  const fulfilment = await getMainPrisma().libraryFulfilment.update({
    where: { id },
    data,
    include: { order: { select: { id: true, orderNumber: true, customerId: true, status: true } } },
  });
  if (input.status === "DELIVERED" || input.status === "DISPATCHED") {
    if (input.status === "DELIVERED" && fulfilment.order.status !== LibraryOrderStatus.FULFILLED) {
      await getMainPrisma().libraryOrder.update({
        where: { id: fulfilment.orderId },
        data: { status: LibraryOrderStatus.FULFILLED, fulfilledAt: new Date() },
      }).catch(() => null);
    }
    await notifyLibraryCustomer(
      fulfilment.order.customerId,
      input.status === "DELIVERED" ? "HouseLink Library order delivered" : "HouseLink Library order dispatched",
      input.status === "DELIVERED"
        ? `Your printed Library order ${fulfilment.order.orderNumber} has been marked delivered.`
        : `Your printed Library order ${fulfilment.order.orderNumber} has been dispatched${input.trackingNumber ? ` (tracking ${input.trackingNumber})` : ""}.`,
    );
  }
  await logLibraryActivity({ actorId, targetType: "fulfilment", targetId: id, action: "UPDATED", message: `Fulfilment marked ${fulfilment.status}.`, metadata: input });
  return fulfilment;
}

export async function createLibraryExportJob(type: string, filters: unknown, actorId?: string) {
  if (!shouldUsePostgresLibrary()) return { id: `export-${Date.now()}`, type, status: "COMPLETED", fileUrl: null };
  const safeType = type.trim().toLowerCase() || "products";
  const job = await getMainPrisma().libraryExportJob.create({
    data: {
      type: safeType,
      status: "COMPLETED",
      requestedById: actorId,
      filters: (filters ?? {}) as Prisma.InputJsonValue,
      fileUrl: `/api/v1/admin/library/exports/${encodeURIComponent(safeType)}`,
      completedAt: new Date(),
    },
  });
  await logLibraryActivity({ actorId, targetType: "export", targetId: job.id, action: "CREATED", message: `${safeType} export prepared.` });
  return job;
}

export async function deleteLibraryExportJob(id: string, actorId?: string) {
  if (!shouldUsePostgresLibrary()) return { id };
  const job = await getMainPrisma().libraryExportJob.delete({ where: { id } }).catch(() => null);
  if (!job) return null;
  await logLibraryActivity({
    actorId,
    targetType: "export",
    targetId: job.id,
    action: "DELETED",
    message: `${job.type} export deleted.`,
    metadata: { type: job.type, status: job.status, fileUrl: job.fileUrl },
  });
  return job;
}

export async function createLibraryInventoryMovement(input: { productId: string; type: string; quantity: number; note?: string }, actorId?: string) {
  const quantity = Math.trunc(Number(input.quantity) || 0);
  if (!input.productId || quantity === 0) return null;
  if (!shouldUsePostgresLibrary()) {
    const product = localLibraryProducts.find((item) => item.id === input.productId);
    if (!product) return null;
    product.stock = Math.max(0, (product.stock ?? 0) + quantity);
    return { id: `local-movement-${Date.now()}`, productId: input.productId, type: input.type, quantity, note: input.note ?? null };
  }
  const prisma = getMainPrisma();
  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.libraryProduct.findUnique({ where: { id: input.productId }, select: { id: true, title: true, stock: true } });
    if (!product) return null;
    const nextStock = Math.max(0, (product.stock ?? 0) + quantity);
    await tx.libraryProduct.update({ where: { id: product.id }, data: { stock: nextStock, updatedById: actorId } });
    const movement = await tx.libraryInventoryMovement.create({
      data: { productId: product.id, type: input.type || (quantity > 0 ? "RESTOCK" : "ADJUSTMENT"), quantity, note: input.note || null, actorId },
      include: { product: { select: { title: true } } },
    });
    return { movement, nextStock };
  });
  if (!result) return null;
  await logLibraryActivity({ actorId, targetType: "inventory", targetId: input.productId, action: "INVENTORY_MOVEMENT", message: `${result.movement.product.title} stock adjusted by ${quantity}.`, metadata: { ...input, nextStock: result.nextStock } });
  return result;
}

export async function upsertLibraryRecommendation(input: { sourceProductId: string; targetProductId: string; reason?: string; weight?: number; active?: boolean }, actorId?: string) {
  if (!input.sourceProductId || !input.targetProductId || input.sourceProductId === input.targetProductId) return null;
  if (!shouldUsePostgresLibrary()) return null;
  const reason = input.reason?.trim() || "RELATED";
  const recommendation = await getMainPrisma().libraryRecommendation.upsert({
    where: { sourceProductId_targetProductId_reason: { sourceProductId: input.sourceProductId, targetProductId: input.targetProductId, reason } },
    create: { sourceProductId: input.sourceProductId, targetProductId: input.targetProductId, reason, weight: Number(input.weight) || 0, active: input.active ?? true },
    update: { weight: Number(input.weight) || 0, active: input.active ?? true },
    include: { sourceProduct: { select: { title: true } }, targetProduct: { select: { title: true } } },
  }).catch(() => null);
  if (!recommendation) return null;
  await logLibraryActivity({ actorId, targetType: "recommendation", targetId: recommendation.id, action: "RECOMMENDATION_SAVED", message: `${recommendation.sourceProduct.title} recommends ${recommendation.targetProduct.title}.`, metadata: input });
  return recommendation;
}

export async function upsertLibraryTaxSetting(input: { id?: string; name: string; country?: string; rate: number; inclusive?: boolean; active?: boolean }, actorId?: string) {
  if (!shouldUsePostgresLibrary()) return input;
  const data = {
    name: input.name,
    country: input.country || "ZW",
    rate: input.rate,
    inclusive: Boolean(input.inclusive),
    active: input.active ?? true,
  };
  const prisma = getMainPrisma();
  const row = input.id ? await prisma.libraryTaxSetting.update({ where: { id: input.id }, data }) : await prisma.libraryTaxSetting.create({ data });
  await logLibraryActivity({ actorId, targetType: "settings", targetId: row.id, action: "TAX_UPDATED", message: `${row.name} tax setting saved.` });
  return row;
}

export async function deleteLibraryTaxSetting(id: string, actorId?: string) {
  if (!id) return null;
  if (!shouldUsePostgresLibrary()) return { id };
  const row = await getMainPrisma().libraryTaxSetting.delete({ where: { id } }).catch(() => null);
  if (row) await logLibraryActivity({ actorId, targetType: "settings", targetId: row.id, action: "TAX_DELETED", message: `${row.name} tax setting deleted.` });
  return row;
}

export async function upsertLibraryCoupon(input: {
  id?: string;
  code: string;
  description?: string;
  discountType: string;
  discountValue: number;
  usageLimit?: number | null;
  minimumSubtotal?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  active?: boolean;
  productIds?: string[];
  categoryIds?: string[];
  firstPurchaseOnly?: boolean;
}, actorId?: string) {
  const normalized = {
    id: input.id,
    code: input.code.trim().toUpperCase(),
    description: input.description?.trim() || null,
    discountType: input.discountType === "FIXED" ? "FIXED" : "PERCENT",
    discountValue: input.discountValue,
    usageLimit: input.usageLimit ?? null,
    usedCount: 0,
    minimumSubtotal: input.minimumSubtotal ?? null,
    startsAt: input.startsAt || null,
    expiresAt: input.expiresAt || null,
    active: input.active ?? true,
    productIds: input.productIds ?? [],
    categoryIds: input.categoryIds ?? [],
    firstPurchaseOnly: Boolean(input.firstPurchaseOnly),
  };
  if (!shouldUsePostgresLibrary()) {
    const existing = localLibraryCoupons.find((coupon) => coupon.id === normalized.id || coupon.code === normalized.code);
    if (existing) {
      Object.assign(existing, normalized, { usedCount: existing.usedCount, id: existing.id });
      return existing;
    }
    const coupon = { ...normalized, id: `local-coupon-${Date.now()}` };
    localLibraryCoupons.unshift(coupon);
    return coupon;
  }
  const prisma = getMainPrisma();
  const data = {
    code: normalized.code,
    description: normalized.description,
    discountType: normalized.discountType,
    discountValue: normalized.discountValue,
    usageLimit: normalized.usageLimit,
    minimumSubtotal: normalized.minimumSubtotal,
    startsAt: normalized.startsAt ? new Date(normalized.startsAt) : null,
    expiresAt: normalized.expiresAt ? new Date(normalized.expiresAt) : null,
    active: normalized.active,
    productIds: normalized.productIds,
    categoryIds: normalized.categoryIds,
    firstPurchaseOnly: normalized.firstPurchaseOnly,
  };
  const row = input.id ? await prisma.libraryCoupon.update({ where: { id: input.id }, data }) : await prisma.libraryCoupon.upsert({ where: { code: normalized.code }, create: data, update: data });
  await logLibraryActivity({ actorId, targetType: "coupon", targetId: row.id, action: "COUPON_SAVED", message: `${row.code} coupon saved.` });
  return toLibraryCouponAdmin(row);
}

export async function deleteLibraryCoupon(id: string, actorId?: string) {
  if (!shouldUsePostgresLibrary()) {
    const index = localLibraryCoupons.findIndex((coupon) => coupon.id === id);
    if (index === -1) return null;
    const [removed] = localLibraryCoupons.splice(index, 1);
    return removed;
  }
  const row = await getMainPrisma().libraryCoupon.delete({ where: { id } }).catch(() => null);
  if (row) await logLibraryActivity({ actorId, targetType: "coupon", targetId: row.id, action: "COUPON_DELETED", message: `${row.code} coupon deleted.` });
  return row ? toLibraryCouponAdmin(row) : null;
}

export async function upsertLibraryTaxonomy(kind: LibraryTaxonomyKind, input: {
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  seoTitle?: string;
  metaDescription?: string;
  heroImageUrl?: string;
  bio?: string;
  websiteUrl?: string;
  featured?: boolean;
  sortOrder?: number;
  active?: boolean;
}, actorId?: string) {
  const slug = input.slug?.trim() || slugify(input.name);
  const common = {
    name: input.name.trim(),
    slug,
    active: input.active ?? true,
  };
  if (!shouldUsePostgresLibrary()) {
    const existing = localLibraryTaxonomy.find((item) => item.id === input.id || (item.kind === kind && item.slug === slug));
    const next: LibraryTaxonomyAdmin = {
      id: existing?.id ?? `local-${kind}-${Date.now()}`,
      kind,
      ...common,
      description: input.description?.trim() || null,
      seoTitle: input.seoTitle?.trim() || null,
      metaDescription: input.metaDescription?.trim() || null,
      heroImageUrl: input.heroImageUrl?.trim() || null,
      bio: input.bio?.trim() || null,
      websiteUrl: input.websiteUrl?.trim() || null,
      featured: Boolean(input.featured),
      sortOrder: input.sortOrder ?? 0,
      productCount: existing?.productCount ?? 0,
    };
    if (existing) Object.assign(existing, next);
    else localLibraryTaxonomy.unshift(next);
    return next;
  }
  const prisma = getMainPrisma();
  if (kind === "category") {
    const data = { ...common, description: input.description || null, seoTitle: input.seoTitle || null, metaDescription: input.metaDescription || null, sortOrder: input.sortOrder ?? 0 };
    const row = input.id ? await prisma.libraryCategory.update({ where: { id: input.id }, data, include: { _count: { select: { products: true } } } }) : await prisma.libraryCategory.upsert({ where: { slug }, create: data, update: data, include: { _count: { select: { products: true } } } });
    await logLibraryActivity({ actorId, targetType: "category", targetId: row.id, action: "TAXONOMY_SAVED", message: `${row.name} category saved.` });
    return toLibraryTaxonomyAdmin("category", row);
  }
  if (kind === "collection") {
    const data = { ...common, description: input.description || null, heroImageUrl: input.heroImageUrl || null, featured: Boolean(input.featured), sortOrder: input.sortOrder ?? 0 };
    const row = input.id ? await prisma.libraryCollection.update({ where: { id: input.id }, data, include: { _count: { select: { products: true } } } }) : await prisma.libraryCollection.upsert({ where: { slug }, create: data, update: data, include: { _count: { select: { products: true } } } });
    await logLibraryActivity({ actorId, targetType: "collection", targetId: row.id, action: "TAXONOMY_SAVED", message: `${row.name} collection saved.` });
    return toLibraryTaxonomyAdmin("collection", row);
  }
  const data = { ...common, bio: input.bio || input.description || null, avatarUrl: input.heroImageUrl || null, websiteUrl: input.websiteUrl || null };
  const row = input.id ? await prisma.libraryAuthor.update({ where: { id: input.id }, data, include: { _count: { select: { products: true } } } }) : await prisma.libraryAuthor.upsert({ where: { slug }, create: data, update: data, include: { _count: { select: { products: true } } } });
  await logLibraryActivity({ actorId, targetType: "author", targetId: row.id, action: "TAXONOMY_SAVED", message: `${row.name} author saved.` });
  return toLibraryTaxonomyAdmin("author", row);
}

export async function deleteLibraryTaxonomy(kind: LibraryTaxonomyKind, id: string, actorId?: string) {
  if (!shouldUsePostgresLibrary()) {
    const index = localLibraryTaxonomy.findIndex((item) => item.id === id && item.kind === kind);
    if (index === -1) return null;
    const [row] = localLibraryTaxonomy.splice(index, 1);
    return row;
  }
  const prisma = getMainPrisma();
  try {
    if (kind === "category") {
      await prisma.libraryProduct.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
      const row = await prisma.libraryCategory.delete({ where: { id }, include: { _count: { select: { products: true } } } });
      await logLibraryActivity({ actorId, targetType: kind, targetId: id, action: "TAXONOMY_DELETED", message: `${row.name} category deleted.` });
      return toLibraryTaxonomyAdmin("category", { ...row, _count: { products: 0 } });
    }
    if (kind === "collection") {
      await prisma.libraryProduct.updateMany({ where: { collectionId: id }, data: { collectionId: null } });
      const row = await prisma.libraryCollection.delete({ where: { id }, include: { _count: { select: { products: true } } } });
      await logLibraryActivity({ actorId, targetType: kind, targetId: id, action: "TAXONOMY_DELETED", message: `${row.name} collection deleted.` });
      return toLibraryTaxonomyAdmin("collection", { ...row, _count: { products: 0 } });
    }
    await prisma.libraryProduct.updateMany({ where: { authorId: id }, data: { authorId: null } });
    const row = await prisma.libraryAuthor.delete({ where: { id }, include: { _count: { select: { products: true } } } });
    await logLibraryActivity({ actorId, targetType: kind, targetId: id, action: "TAXONOMY_DELETED", message: `${row.name} author deleted.` });
    return toLibraryTaxonomyAdmin("author", { ...row, _count: { products: 0 } });
  } catch {
    return null;
  }
}

export async function updateLibraryDownloadAccess(id: string, input: { status?: string; downloadLimit?: number | null; expiresAt?: string | null }, actorId?: string) {
  if (!shouldUsePostgresLibrary()) return null;
  const status = input.status && Object.values(LibraryDownloadStatus).includes(input.status as LibraryDownloadStatus) ? input.status as LibraryDownloadStatus : undefined;
  const row = await getMainPrisma().libraryDownloadAccess.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(input.downloadLimit !== undefined ? { downloadLimit: input.downloadLimit } : {}),
      ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null } : {}),
    },
    include: { user: { select: { name: true, email: true } }, product: { select: { title: true } }, order: { select: { orderNumber: true } }, file: { select: { fileName: true } } },
  }).catch(() => null);
  if (!row) return null;
  await logLibraryActivity({ actorId, targetType: "download_access", targetId: row.id, action: "ACCESS_UPDATED", message: `Download access marked ${row.status}.`, metadata: input });
  return toLibraryDownloadAccessAdmin(row);
}

export async function moderateLibraryReview(id: string, input: { status?: string; featured?: boolean; verified?: boolean }, actorId?: string) {
  if (!shouldUsePostgresLibrary()) return null;
  const prisma = getMainPrisma();
  const row = await prisma.libraryReview.update({
    where: { id },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.featured !== undefined ? { featured: input.featured } : {}),
      ...(input.verified !== undefined ? { verified: input.verified } : {}),
    },
    include: { product: { select: { title: true } }, user: { select: { name: true, email: true } } },
  }).catch(() => null);
  if (!row) return null;
  await recalculateLibraryProductRating(row.productId);
  await logLibraryActivity({ actorId, targetType: "review", targetId: row.id, action: "REVIEW_MODERATED", message: `Review marked ${row.status}.`, metadata: input });
  return toLibraryReviewAdmin(row);
}

export async function createLibraryGuestClaim(input: { orderId: string; email: string }, actorId?: string) {
  const settings = await getLibraryStoreSettings();
  if (!settings.claims.enabled) return null;
  const email = input.email.trim().toLowerCase();
  if (!input.orderId || !email) return null;
  const { getCanonicalSiteUrl } = await import("@/lib/seo/site-url");
  const claimUrlBase = `${getCanonicalSiteUrl()}/library/claim`;
  const status = settings.claims.requireAdminApproval ? "PENDING" : "PENDING";
  if (!shouldUsePostgresLibrary()) {
    const token = randomBytes(24).toString("hex");
    return {
      id: `local-claim-${Date.now()}`,
      orderId: input.orderId,
      email,
      status,
      claimToken: token,
      claimUrl: `${claimUrlBase}?token=${encodeURIComponent(token)}`,
    };
  }
  const prisma = getMainPrisma();
  const order = await prisma.libraryOrder.findUnique({ where: { id: input.orderId }, select: { id: true, orderNumber: true } });
  if (!order) return null;
  const token = randomBytes(24).toString("hex");
  const claim = await prisma.libraryGuestClaim.create({
    data: {
      orderId: order.id,
      email,
      status,
      claimTokenHash: createTokenHash(token),
      expiresAt: new Date(Date.now() + settings.claims.expiryDays * 86400000),
    },
    include: { order: { select: { orderNumber: true } } },
  });
  const claimUrl = `${claimUrlBase}?token=${encodeURIComponent(token)}`;
  await emailLibraryGuestClaim(email, order.orderNumber, claimUrl);
  await logLibraryActivity({
    actorId,
    targetType: "guest_claim",
    targetId: claim.id,
    action: "CREATED",
    message: `Guest claim created for ${email} on ${order.orderNumber}.`,
    metadata: { orderId: order.id, email },
  });
  return { ...claim, claimToken: token, claimUrl };
}

export async function redeemLibraryGuestClaim(input: { token: string; userId: string }) {
  const token = input.token.trim();
  if (!token || !input.userId) return null;
  if (!shouldUsePostgresLibrary()) return { error: "NOT_SUPPORTED" as const };
  const prisma = getMainPrisma();
  const hash = createTokenHash(token);
  const claim = await prisma.libraryGuestClaim.findFirst({
    where: { claimTokenHash: hash, status: "PENDING" },
    include: { order: { include: { items: { include: { product: { include: { files: true } } } } } } },
  });
  if (!claim) return { error: "INVALID_TOKEN" as const };
  if (claim.expiresAt && claim.expiresAt.getTime() < Date.now()) {
    await prisma.libraryGuestClaim.update({ where: { id: claim.id }, data: { status: "EXPIRED" } }).catch(() => null);
    return { error: "EXPIRED" as const };
  }
  const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { id: true, email: true, name: true } });
  if (!user) return { error: "UNAUTHORIZED" as const };
  if (user.email.trim().toLowerCase() !== claim.email.trim().toLowerCase()) {
    return { error: "EMAIL_MISMATCH" as const, email: claim.email };
  }
  await prisma.libraryOrder.update({ where: { id: claim.orderId }, data: { customerId: user.id } });
  const downloads = await grantLibraryOrderDownloads(claim.orderId, user.id);
  const updated = await prisma.libraryGuestClaim.update({
    where: { id: claim.id },
    data: {
      status: "CLAIMED",
      userId: user.id,
      claimedAt: new Date(),
      claimTokenHash: null,
    },
    include: { order: { select: { orderNumber: true } } },
  });
  await notifyLibraryCustomer(user.id, "HouseLink Library access claimed", `Your Library order ${claim.order.orderNumber} is now available in My Library.`);
  await logLibraryActivity({
    actorId: user.id,
    targetType: "guest_claim",
    targetId: claim.id,
    action: "REDEEMED",
    message: `Guest claim redeemed for ${claim.email}.`,
    metadata: { downloads, userId: user.id },
  });
  return { claim: updated, downloads };
}

export async function getLibraryGuestClaimByToken(token: string) {
  if (!token.trim() || !shouldUsePostgresLibrary()) return null;
  const claim = await getMainPrisma().libraryGuestClaim.findFirst({
    where: { claimTokenHash: createTokenHash(token.trim()), status: "PENDING" },
    include: { order: { select: { orderNumber: true, total: true, currency: true } } },
  }).catch(() => null);
  if (!claim) return null;
  if (claim.expiresAt && claim.expiresAt.getTime() < Date.now()) return { expired: true as const, email: claim.email };
  return {
    id: claim.id,
    email: claim.email,
    expiresAt: claim.expiresAt?.toISOString() ?? null,
    orderNumber: claim.order.orderNumber,
    total: Number(claim.order.total),
    currency: claim.order.currency,
  };
}

export async function approveLibraryGuestClaim(id: string, actorId?: string) {
  if (!shouldUsePostgresLibrary()) return null;
  const prisma = getMainPrisma();
  const claim = await prisma.libraryGuestClaim.findUnique({
    where: { id },
    include: { order: { include: { items: { include: { product: { include: { files: true } } } } } } },
  });
  if (!claim || claim.status !== "PENDING") return null;
  const user = await prisma.user.findUnique({ where: { email: claim.email.toLowerCase() }, select: { id: true, email: true, name: true } });
  if (!user) return { error: "USER_REQUIRED" as const, email: claim.email };
  await prisma.libraryOrder.update({ where: { id: claim.orderId }, data: { customerId: user.id } });
  const downloads = await grantLibraryOrderDownloads(claim.orderId, user.id);
  const updated = await prisma.libraryGuestClaim.update({
    where: { id: claim.id },
    data: {
      status: "CLAIMED",
      userId: user.id,
      claimedAt: new Date(),
      claimTokenHash: null,
    },
    include: { order: { select: { orderNumber: true } } },
  });
  await notifyLibraryCustomer(user.id, "HouseLink Library access claimed", `Your Library order ${claim.order.orderNumber} is now available in My Library.`);
  await logLibraryActivity({
    actorId,
    targetType: "guest_claim",
    targetId: claim.id,
    action: "APPROVED",
    message: `Guest claim approved for ${claim.email}.`,
    metadata: { downloads, userId: user.id },
  });
  return { claim: updated, downloads };
}

export async function rejectLibraryGuestClaim(id: string, actorId?: string) {
  if (!shouldUsePostgresLibrary()) return null;
  const claim = await getMainPrisma().libraryGuestClaim.update({
    where: { id },
    data: { status: "REJECTED", claimTokenHash: null },
    include: { order: { select: { orderNumber: true } } },
  }).catch(() => null);
  if (!claim) return null;
  await logLibraryActivity({
    actorId,
    targetType: "guest_claim",
    targetId: claim.id,
    action: "REJECTED",
    message: `Guest claim rejected for ${claim.email}.`,
  });
  return claim;
}

export async function bulkUpdateLibraryProducts(
  ids: string[],
  patch: { price?: number; category?: string; status?: string },
  actorId?: string,
) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (!uniqueIds.length) return { count: 0 };
  let count = 0;
  for (const id of uniqueIds) {
    try {
      const existing = shouldUsePostgresLibrary()
        ? await getMainPrisma().libraryProduct.findUnique({ where: { id }, include: productInclude() }).then((row) => (row ? toLibraryProduct(row as DbProduct) : null))
        : localLibraryProducts.find((product) => product.id === id) ?? null;
      if (!existing) continue;
      const input: Partial<LibraryProductInput> = {
        ...(patch.category !== undefined ? { category: patch.category } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
      };
      if (patch.price !== undefined) {
        input.price = patch.price;
        input.formats = (existing.formats.length ? existing.formats : enabledLibraryFormats(existing)).map((format) =>
          format.enabled ? { ...format, price: patch.price! } : format,
        );
      }
      if (!Object.keys(input).length) continue;
      const updated = await updateLibraryProduct(id, input, actorId);
      if (updated) count += 1;
    } catch {
      // Skip invalid products (e.g. publish without digital files).
    }
  }
  await logLibraryActivity({
    actorId,
    targetType: "product",
    targetId: uniqueIds[0],
    action: "BULK_UPDATE",
    message: `Bulk updated ${count} Library product(s).`,
    metadata: { ids: uniqueIds, patch },
  });
  return { count };
}

async function grantLibraryOrderDownloads(orderId: string, userId: string) {
  const prisma = getMainPrisma();
  const settings = await getLibraryStoreSettings();
  const order = await prisma.libraryOrder.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { include: { files: true } } } } },
  });
  if (!order) return 0;
  let downloads = 0;
  for (const item of order.items) {
    if (item.productType === "PRINTED_BOOK") continue;
    const files = item.product.files.filter((file) => file.active && file.downloadable);
    if (!files.length) {
      await prisma.libraryDownloadAccess.upsert({
        where: { id: `${userId}_${item.productId}_${order.id}` },
        create: {
          id: `${userId}_${item.productId}_${order.id}`,
          userId,
          productId: item.productId,
          orderId: order.id,
          status: "ACTIVE",
          downloadLimit: resolveDownloadLimit(item.product.downloadLimit, null, settings),
          expiresAt: resolveDownloadExpiry(item.product.downloadExpiryDays, null, settings),
        },
        update: { status: "ACTIVE", userId },
      });
      downloads += 1;
      continue;
    }
    for (const file of files) {
      const issueLicense = item.product.licenseKeys || settings.licence.generateByDefault;
      await prisma.libraryDownloadAccess.upsert({
        where: { id: `${userId}_${item.productId}_${file.id}_${order.id}` },
        create: {
          id: `${userId}_${item.productId}_${file.id}_${order.id}`,
          userId,
          productId: item.productId,
          orderId: order.id,
          fileId: file.id,
          status: "ACTIVE",
          tokenHash: createTokenHash(`${userId}:${item.productId}:${file.id}:${order.id}`),
          licenseKey: issueLicense ? buildLibraryLicenseKey(settings.licence.keyPrefix) : null,
          downloadLimit: resolveDownloadLimit(item.product.downloadLimit, file.downloadLimit, settings),
          expiresAt: resolveDownloadExpiry(item.product.downloadExpiryDays, file.expiryDays, settings),
        },
        update: { status: "ACTIVE", userId },
      });
      downloads += 1;
    }
  }
  await prisma.libraryOrder.update({
    where: { id: orderId },
    data: { status: order.status === "PENDING" ? LibraryOrderStatus.FULFILLED : order.status, fulfilledAt: order.fulfilledAt ?? new Date() },
  }).catch(() => null);
  return downloads;
}

export async function disableLibraryCustomer(userId: string, actorId?: string) {
  if (!shouldUsePostgresLibrary() || !userId) return null;
  const prisma = getMainPrisma();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, roles: true } });
  if (!user) return null;
  const protectedRoles: Role[] = [Role.ADMIN, Role.SUPER_ADMIN, Role.ACADEMY_ADMIN];
  if (user.roles.some((role) => protectedRoles.includes(role))) {
    return { protected: true as const };
  }

  const anonymizedEmail = `deleted-library-${user.id}@houselink.local`;
  const result = await prisma.$transaction(async (tx) => {
    const downloads = await tx.libraryDownloadAccess.updateMany({ where: { userId: user.id, status: LibraryDownloadStatus.ACTIVE }, data: { status: LibraryDownloadStatus.REVOKED } });
    const guestClaims = await tx.libraryGuestClaim.updateMany({
      where: { OR: [{ userId: user.id }, { email: user.email }], status: { notIn: ["CLAIMED", "REVOKED"] } },
      data: { status: "REVOKED", claimTokenHash: null },
    });
    const disabled = await tx.user.update({
      where: { id: user.id },
      data: {
        accountStatus: "DISABLED",
        name: "Deleted Library Customer",
        email: anonymizedEmail,
        phone: null,
        passwordHash: null,
        emailVerifiedAt: null,
        phoneVerifiedAt: null,
        sessions: { deleteMany: {} },
      },
      select: { id: true, email: true, accountStatus: true },
    });
    await tx.libraryActivity.create({
      data: {
        actorId,
        targetType: "customer",
        targetId: user.id,
        action: "CUSTOMER_DISABLED",
        message: "Library customer disabled, anonymised, and download access revoked.",
        metadata: { revokedDownloads: downloads.count, revokedGuestClaims: guestClaims.count },
      },
    });
    return { user: disabled, revokedDownloads: downloads.count, revokedGuestClaims: guestClaims.count };
  });
  return result;
}

export async function ensureLibraryInvoice(orderId: string) {
  const prisma = getMainPrisma();
  const existing = await prisma.libraryInvoice.findFirst({ where: { orderId } });
  if (existing) return existing;
  const order = await prisma.libraryOrder.findUnique({ where: { id: orderId }, include: { customer: { select: { name: true, email: true } } } });
  if (!order) return null;
  const metadata = (order.metadata ?? {}) as Record<string, unknown>;
  return prisma.libraryInvoice.create({
    data: {
      orderId,
      invoiceNumber: `HL-LIB-INV-${Date.now()}`,
      subtotal: order.subtotal,
      discountTotal: order.discountTotal,
      taxTotal: Number(metadata.taxTotal ?? 0),
      total: order.total,
      currency: order.currency,
      billingName: order.customer.name,
      billingEmail: order.billingEmail ?? order.customer.email,
      metadata: { printable: true, pdfStatus: "READY_FOR_RENDERER" },
    },
  });
}

export async function logLibraryActivity(input: { actorId?: string; targetType: string; targetId: string; action: string; message: string; metadata?: unknown }) {
  if (!shouldUsePostgresLibrary()) return null;
  return getMainPrisma().libraryActivity.create({
    data: {
      actorId: input.actorId,
      targetType: input.targetType,
      targetId: input.targetId,
      action: input.action,
      message: input.message,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  }).catch(() => null);
}

async function ensureLibraryFulfilmentQueue(orderId: string) {
  const prisma = getMainPrisma();
  const settings = await getLibraryStoreSettings();
  const order = await prisma.libraryOrder.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return null;
  const needsShipping = order.items.some((item) => item.productType === "PRINTED_BOOK");
  if (!needsShipping) return null;
  const existing = await prisma.libraryFulfilment.findFirst({ where: { orderId } });
  if (existing) return existing;
  return prisma.libraryFulfilment.create({
    data: {
      orderId,
      status: "PENDING",
      courier: settings.delivery.defaultCourier || null,
      packingSlipNumber: `HL-PACK-${order.orderNumber.replace(/\D/g, "") || Date.now()}`,
      dispatchNotes: settings.delivery.dispatchNote || "Auto-created for printed Library products.",
      deliveryNotes: settings.delivery.packingSlipNote || null,
    },
  });
}

async function createLibraryAcademyEntitlementForItem(orderId: string, userId: string, productId: string, productType: LibraryProductType) {
  if (productType !== "COURSE" && productType !== "MEMBERSHIP" && productType !== "SUBSCRIPTION") return null;
  return getMainPrisma().libraryAcademyEntitlement.upsert({
    where: { orderId_productId_courseId: { orderId, productId, courseId: productId } },
    create: { orderId, productId, userId, courseId: productId, status: "ACTIVE", metadata: { source: "library_purchase" } },
    update: { status: "ACTIVE" },
  }).catch(() => null);
}

async function calculateLibraryDiscount(input: { couponCode?: string; subtotal: number; products: Array<{ id: string; categoryId: string | null }>; customerId?: string }) {
  const code = input.couponCode?.trim();
  if (!code || input.subtotal <= 0) return 0;
  const prisma = getMainPrisma();
  const coupon = await prisma.libraryCoupon.findUnique({ where: { code } }).catch(() => null);
  if (!coupon || !coupon.active) return 0;
  const now = Date.now();
  if (coupon.startsAt && coupon.startsAt.getTime() > now) return 0;
  if (coupon.expiresAt && coupon.expiresAt.getTime() < now) return 0;
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) return 0;
  if (coupon.minimumSubtotal !== null && input.subtotal < Number(coupon.minimumSubtotal)) return 0;
  if (coupon.firstPurchaseOnly && input.customerId) {
    const existing = await prisma.libraryOrder.count({ where: { customerId: input.customerId, status: { in: ["PAID", "FULFILLED"] } } }).catch(() => 0);
    if (existing > 0) return 0;
  }
  if (coupon.productIds.length && !input.products.some((product) => coupon.productIds.includes(product.id))) return 0;
  if (coupon.categoryIds.length && !input.products.some((product) => product.categoryId && coupon.categoryIds.includes(product.categoryId))) return 0;
  const raw = coupon.discountType === "PERCENT" ? input.subtotal * (Number(coupon.discountValue) / 100) : Number(coupon.discountValue);
  return Math.min(input.subtotal, roundMoney(raw));
}

async function incrementLibraryCouponUsage(couponCode?: string) {
  if (!couponCode) return;
  await getMainPrisma().libraryCoupon.update({ where: { code: couponCode }, data: { usedCount: { increment: 1 } } }).catch(() => null);
}

async function notifyLibraryCustomer(userId: string, subject: string, body: string) {
  if (!shouldUsePostgresLibrary()) return null;
  return getMainPrisma().notification.create({
    data: {
      userId,
      channel: NotificationChannel.EMAIL,
      status: NotificationStatus.QUEUED,
      subject,
      body,
    },
  }).catch(() => null);
}

function normalizePaymentProvider(provider?: string) {
  const normalized = provider?.trim().toUpperCase();
  if (normalized === "STRIPE") return PaymentProvider.STRIPE;
  if (normalized === "ECOCASH") return PaymentProvider.ECOCASH;
  return PaymentProvider.PAYNOW;
}

async function replaceProductAssets(productId: string, input: Partial<LibraryProductInput>) {
  const prisma = getMainPrisma();
  if (input.gallery) {
    await prisma.libraryProductMedia.deleteMany({ where: { productId } });
    if (input.gallery.length) {
      await prisma.libraryProductMedia.createMany({
        data: input.gallery.map((item, sortOrder) => ({
          productId,
          label: item.label,
          url: item.url,
          mediaType: item.kind,
          sortOrder,
        })),
      });
    }
  }
  if (input.downloads) {
    await prisma.libraryProductFile.deleteMany({ where: { productId } });
    const downloadsWithFiles = input.downloads.filter((item) => item.fileUrl);
    if (downloadsWithFiles.length) {
      await prisma.libraryProductFile.createMany({
        data: downloadsWithFiles.map((item, sortOrder) => ({
          productId,
          label: item.label,
          fileUrl: item.fileUrl!,
          fileName: item.fileName || `${slugify(item.label)}.${item.fileType.toLowerCase()}`,
          fileType: item.fileType,
          fileSizeBytes: item.fileSizeBytes ?? parseSize(item.size ?? "0"),
          secure: item.secure ?? true,
          previewable: item.previewable ?? item.fileType.toUpperCase() === "PDF",
          downloadable: true,
          sortOrder,
        })),
      });
    }
  }
}

export async function createDownloadToken(accessId: string, userId: string) {
  const settings = await getLibraryStoreSettings();
  const ttl = settings.downloads.tokenTtlSeconds || FALLBACK_TOKEN_TTL_SECONDS;
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const payload = `${accessId}.${userId}.${exp}`;
  const sig = createHmac("sha256", tokenSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyDownloadToken(token: string, accessId: string, userId: string) {
  const [tokenAccess, tokenUser, expRaw, sig] = token.split(".");
  if (!tokenAccess || !tokenUser || !expRaw || !sig) return false;
  if (tokenAccess !== accessId || tokenUser !== userId) return false;
  if (Number(expRaw) < Math.floor(Date.now() / 1000)) return false;
  const payload = `${tokenAccess}.${tokenUser}.${expRaw}`;
  const expected = createHmac("sha256", tokenSecret()).update(payload).digest("base64url");
  return expected === sig;
}

async function seedLibraryIfEmpty() {
  return;
}

function productInclude() {
  return {
    author: true,
    category: true,
    collection: true,
    media: { orderBy: { sortOrder: "asc" as const } },
    files: { orderBy: { sortOrder: "asc" as const } },
    previewPages: { orderBy: { sortOrder: "asc" as const } },
  };
}

async function productInputToPrisma(input: LibraryProductInput, actorId?: string, partial = false): Promise<Prisma.LibraryProductCreateInput | Prisma.LibraryProductUpdateInput> {
  const authorName = input.author?.trim();
  const categoryName = input.category?.trim();
  const collectionName = input.collection?.trim();
  const author = authorName ? await upsertAuthor(authorName) : null;
  const category = categoryName ? await upsertCategory(categoryName) : null;
  const collection = collectionName ? await upsertCollection(collectionName) : null;
  const formats = input.formats !== undefined ? normalizeFormatsInput(input.formats) : undefined;
  const primary = formats ? primaryLibraryFormat(formats, input.productType ?? "PDF", Number(input.price ?? 0)) : null;
  const createOrUpdate: Prisma.LibraryProductCreateInput | Prisma.LibraryProductUpdateInput = {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.slug !== undefined || (!partial && input.title) ? { slug: input.slug || slugify(input.title) } : {}),
    ...(input.subtitle !== undefined ? { subtitle: input.subtitle || null } : {}),
    ...(author ? { author: { connect: { id: author.id } } } : {}),
    ...(input.publisher !== undefined ? { publisher: input.publisher || null } : {}),
    ...(input.edition !== undefined ? { edition: input.edition || null } : {}),
    ...(input.isbn !== undefined ? { isbn: input.isbn || null } : {}),
    ...(input.language !== undefined || !partial ? { language: input.language || "English" } : {}),
    ...(input.publicationDate !== undefined ? { publicationDate: input.publicationDate ? new Date(input.publicationDate) : null } : {}),
    ...(input.pages !== undefined ? { pages: input.pages || null } : {}),
    ...(input.weightGrams !== undefined ? { weightGrams: input.weightGrams || null } : {}),
    ...(input.bookSize !== undefined ? { bookSize: input.bookSize || null } : {}),
    ...(input.sku !== undefined || (!partial && input.title) ? { sku: input.sku || `HL-LIB-${Date.now()}` } : {}),
    ...(input.barcode !== undefined ? { barcode: input.barcode || null } : {}),
    ...(primary || input.productType !== undefined || !partial ? { productType: normalizeType(primary?.type ?? input.productType ?? "PDF") } : {}),
    ...(input.status !== undefined || !partial ? { status: normalizeStatus(input.status ?? "DRAFT") } : {}),
    ...(primary || input.price !== undefined ? { price: primary?.price ?? input.price } : {}),
    ...(primary?.compareAtPrice !== undefined || input.compareAtPrice !== undefined ? { compareAtPrice: (primary?.compareAtPrice ?? input.compareAtPrice) || null } : {}),
    ...(input.currency !== undefined || !partial ? { currency: input.currency || "USD" } : {}),
    ...(category ? { category: { connect: { id: category.id } } } : {}),
    ...(collection ? { collection: { connect: { id: collection.id } } } : {}),
    ...(input.series !== undefined ? { series: input.series || null } : {}),
    ...(input.difficulty !== undefined ? { difficulty: input.difficulty || null } : {}),
    ...(input.shortDescription !== undefined ? { shortDescription: input.shortDescription || null } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.learningOutcomes !== undefined ? { learningOutcomes: input.learningOutcomes } : {}),
    ...(input.whoThisIsFor !== undefined ? { whoThisIsFor: input.whoThisIsFor } : {}),
    ...(input.requirements !== undefined ? { requirements: input.requirements } : {}),
    ...(input.tableOfContents !== undefined ? { tableOfContents: input.tableOfContents as Prisma.InputJsonValue } : {}),
    ...(input.tags !== undefined ? { tags: input.tags } : {}),
    ...(input.seoTitle !== undefined ? { seoTitle: input.seoTitle || null } : {}),
    ...(input.metaDescription !== undefined ? { metaDescription: input.metaDescription || null } : {}),
    ...(input.seoFocusKeyword !== undefined ? { seoFocusKeyword: input.seoFocusKeyword || null } : {}),
    ...(input.seoImageUrl !== undefined ? { seoImageUrl: input.seoImageUrl || null } : {}),
    ...(formats ? { formats: formats as unknown as Prisma.InputJsonValue } : {}),
    ...(input.title || input.description ? { searchVector: buildSearchVector(input) } : {}),
    ...(input.featured !== undefined ? { featured: input.featured } : {}),
    ...(input.bestSeller !== undefined ? { bestSeller: input.bestSeller } : {}),
    ...(input.newRelease !== undefined ? { newRelease: input.newRelease } : {}),
    ...(input.editorsChoice !== undefined ? { editorsChoice: input.editorsChoice } : {}),
    ...(input.comingSoon !== undefined ? { comingSoon: input.comingSoon } : {}),
    ...(input.preorder !== undefined ? { preorder: input.preorder } : {}),
    ...(input.stock !== undefined ? { stock: input.stock } : {}),
    ...(input.lowStockThreshold !== undefined ? { lowStockThreshold: input.lowStockThreshold } : {}),
    ...(input.warehouse !== undefined ? { warehouse: input.warehouse || null } : {}),
    ...(input.supplier !== undefined ? { supplier: input.supplier || null } : {}),
    ...(input.downloadLimit !== undefined ? { downloadLimit: input.downloadLimit } : {}),
    ...(input.downloadExpiryDays !== undefined ? { downloadExpiryDays: input.downloadExpiryDays } : {}),
    ...(input.watermarking !== undefined ? { watermarking: input.watermarking } : {}),
    ...(input.licenseKeys !== undefined ? { licenseKeys: input.licenseKeys } : {}),
    ...(input.status === "PUBLISHED" ? { publishedAt: new Date(), scheduledAt: null } : {}),
    ...(input.scheduledAt !== undefined
      ? { scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null }
      : input.status === "SCHEDULED" && !partial
        ? { scheduledAt: new Date(Date.now() + 86400000) }
        : {}),
    ...(partial ? { updatedById: actorId } : { createdById: actorId }),
  };
  if (partial) return createOrUpdate;
  return createOrUpdate as Prisma.LibraryProductCreateInput;
}

async function upsertAuthor(name: string) {
  return getMainPrisma().libraryAuthor.upsert({ where: { slug: slugify(name) }, create: { name, slug: slugify(name) }, update: { name } });
}

async function upsertCategory(name: string) {
  return getMainPrisma().libraryCategory.upsert({ where: { slug: slugify(name) }, create: { name, slug: slugify(name) }, update: { name } });
}

async function upsertCollection(name: string) {
  return getMainPrisma().libraryCollection.upsert({ where: { slug: slugify(name) }, create: { name, slug: slugify(name) }, update: { name } });
}

function toLibraryProduct(row: DbProduct): LibraryProduct {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? "",
    author: row.author?.name ?? "HouseLink Zimbabwe",
    publisher: row.publisher ?? "HouseLink Zimbabwe",
    edition: row.edition ?? "Digital Edition",
    isbn: row.isbn ?? undefined,
    language: row.language,
    publicationDate: row.publicationDate?.toISOString().slice(0, 10) ?? row.createdAt.toISOString().slice(0, 10),
    pages: row.pages ?? undefined,
    weightGrams: row.weightGrams ?? undefined,
    bookSize: row.bookSize ?? undefined,
    sku: row.sku,
    productType: row.productType as PublicLibraryProductType,
    status: row.status === "DELETED" ? "ARCHIVED" : row.status,
    price: Number(row.price),
    compareAtPrice: row.compareAtPrice ? Number(row.compareAtPrice) : undefined,
    currency: row.currency,
    rating: Number(row.ratingAverage),
    reviewCount: row.ratingCount,
    category: row.category?.name ?? "Library",
    collection: row.collection?.name ?? "HouseLink Library",
    series: row.series ?? undefined,
    difficulty: (row.difficulty as LibraryProduct["difficulty"]) ?? "Professional",
    description: row.description,
    shortDescription: row.shortDescription ?? row.description.slice(0, 140),
    learningOutcomes: row.learningOutcomes,
    whoThisIsFor: row.whoThisIsFor,
    requirements: row.requirements,
    tableOfContents: Array.isArray(row.tableOfContents) ? row.tableOfContents.map(String) : [],
    tags: row.tags,
    seoTitle: row.seoTitle ?? undefined,
    metaDescription: row.metaDescription ?? undefined,
    seoFocusKeyword: row.seoFocusKeyword ?? undefined,
    seoImageUrl: row.seoImageUrl ?? undefined,
    formats: parseFormats(row.formats, row.productType as PublicLibraryProductType, Number(row.price), row.compareAtPrice ? Number(row.compareAtPrice) : undefined, row.sku),
    gallery: row.media.map((item) => ({ label: item.label, url: item.url, kind: mediaKind(item.mediaType) })),
    downloads: row.files.map((item) => ({ id: item.id, label: item.label, fileType: item.fileType, size: formatBytes(item.fileSizeBytes), secure: item.secure, fileUrl: item.fileUrl, fileName: item.fileName, fileSizeBytes: item.fileSizeBytes, previewable: item.previewable })),
    stock: row.stock,
    lowStockThreshold: row.lowStockThreshold,
    warehouse: row.warehouse ?? undefined,
    supplier: row.supplier ?? undefined,
    downloadLimit: row.downloadLimit,
    downloadExpiryDays: row.downloadExpiryDays,
    watermarking: row.watermarking,
    licenseKeys: row.licenseKeys,
    featured: row.featured,
    bestSeller: row.bestSeller,
    newRelease: row.newRelease,
    editorsChoice: row.editorsChoice,
    comingSoon: row.comingSoon,
    preorder: row.preorder,
    downloadCount: row.downloadCount,
    viewCount: row.viewCount,
    publishedAt: row.publishedAt?.toISOString() ?? row.createdAt.toISOString(),
    scheduledAt: row.scheduledAt?.toISOString(),
  };
}

function toLibraryOrder(row: DbOrder): LibraryOrder {
  const paymentMeta = ((row as { payment?: { metadata?: unknown } }).payment?.metadata ?? {}) as Record<string, unknown>;
  const payment = (row as {
    payment?: {
      id?: string;
      status?: string;
      proofStatus?: string | null;
      proofUrl?: string | null;
      metadata?: unknown;
    } | null;
  }).payment;
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    customerName: row.customer.name,
    customerEmail: row.customer.email,
    status: row.status === "CANCELLED" ? "PENDING" : row.status === "PAID" ? "PAID" : row.status,
    paymentStatus: (payment?.status as LibraryOrder["paymentStatus"]) ?? "PENDING",
    total: Number(row.total),
    currency: row.currency,
    itemCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
    createdAt: row.createdAt.toISOString(),
    paymentId: payment?.id ?? (row as { paymentId?: string | null }).paymentId ?? null,
    proofStatus: payment?.proofStatus ?? null,
    proofUrl: payment?.proofUrl ?? null,
    paymentAdminNote:
      (typeof paymentMeta.adminNote === "string" && paymentMeta.adminNote) ||
      (typeof paymentMeta.rejectReason === "string" && paymentMeta.rejectReason) ||
      (typeof paymentMeta.refundReason === "string" && paymentMeta.refundReason) ||
      null,
  };
}

function getLibraryFacets(products: LibraryProduct[]) {
  const uniq = (items: string[]) => Array.from(new Set(items)).sort();
  return {
    categories: uniq(products.map((p) => p.category)),
    authors: uniq(products.map((p) => p.author)),
    types: uniq(products.map((p) => p.productType)),
    difficulties: uniq(products.map((p) => p.difficulty)),
  };
}

function toLibraryCouponAdmin(row: {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: Prisma.Decimal | number;
  usageLimit: number | null;
  usedCount: number;
  minimumSubtotal: Prisma.Decimal | number | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  active: boolean;
  productIds: string[];
  categoryIds: string[];
  firstPurchaseOnly: boolean;
}): LibraryCouponAdmin {
  return {
    id: row.id,
    code: row.code,
    description: row.description,
    discountType: row.discountType,
    discountValue: Number(row.discountValue),
    usageLimit: row.usageLimit,
    usedCount: row.usedCount,
    minimumSubtotal: row.minimumSubtotal == null ? null : Number(row.minimumSubtotal),
    startsAt: row.startsAt?.toISOString().slice(0, 10) ?? null,
    expiresAt: row.expiresAt?.toISOString().slice(0, 10) ?? null,
    active: row.active,
    productIds: row.productIds,
    categoryIds: row.categoryIds,
    firstPurchaseOnly: row.firstPurchaseOnly,
  };
}

function toLibraryTaxonomyAdmin(kind: LibraryTaxonomyKind, row: {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  seoTitle?: string | null;
  metaDescription?: string | null;
  heroImageUrl?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  websiteUrl?: string | null;
  featured?: boolean;
  sortOrder?: number;
  active: boolean;
  _count?: { products: number };
}): LibraryTaxonomyAdmin {
  return {
    id: row.id,
    kind,
    name: row.name,
    slug: row.slug,
    description: row.description ?? row.bio ?? null,
    seoTitle: row.seoTitle ?? null,
    metaDescription: row.metaDescription ?? null,
    heroImageUrl: row.heroImageUrl ?? row.avatarUrl ?? null,
    bio: row.bio ?? null,
    websiteUrl: row.websiteUrl ?? null,
    featured: row.featured ?? false,
    sortOrder: row.sortOrder ?? 0,
    active: row.active,
    productCount: row._count?.products ?? 0,
  };
}

function toLibraryDownloadAccessAdmin(row: {
  id: string;
  userId: string;
  productId: string;
  status: string;
  downloadCount: number;
  downloadLimit: number | null;
  expiresAt: Date | null;
  lastDownloadAt: Date | null;
  licenseKey: string | null;
  user?: { name: string | null; email: string } | null;
  product?: { title: string } | null;
  order?: { orderNumber: string } | null;
  file?: { fileName: string } | null;
}): LibraryDownloadAccessAdmin {
  return {
    id: row.id,
    userId: row.userId,
    userName: row.user?.name ?? null,
    userEmail: row.user?.email ?? null,
    productId: row.productId,
    productTitle: row.product?.title ?? "Library product",
    orderNumber: row.order?.orderNumber ?? null,
    fileName: row.file?.fileName ?? null,
    status: row.status,
    downloadCount: row.downloadCount,
    downloadLimit: row.downloadLimit,
    expiresAt: row.expiresAt?.toISOString().slice(0, 10) ?? null,
    lastDownloadAt: row.lastDownloadAt?.toISOString() ?? null,
    licenseKey: row.licenseKey,
  };
}

function toLibraryReviewAdmin(row: {
  id: string;
  productId: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: string;
  verified: boolean;
  featured: boolean;
  createdAt: Date;
  product?: { title: string } | null;
  user?: { name: string | null; email: string } | null;
}): LibraryReviewAdmin {
  return {
    id: row.id,
    productId: row.productId,
    productTitle: row.product?.title ?? "Library product",
    userName: row.user?.name ?? null,
    userEmail: row.user?.email ?? null,
    rating: row.rating,
    title: row.title,
    body: row.body,
    status: row.status,
    verified: row.verified,
    featured: row.featured,
    createdAt: row.createdAt.toISOString(),
  };
}

async function recalculateLibraryProductRating(productId: string) {
  const prisma = getMainPrisma();
  const reviews = await prisma.libraryReview.findMany({ where: { productId, status: "APPROVED" }, select: { rating: true } });
  const ratingCount = reviews.length;
  const ratingAverage = ratingCount ? reviews.reduce((sum, review) => sum + review.rating, 0) / ratingCount : 0;
  await prisma.libraryProduct.update({ where: { id: productId }, data: { ratingCount, ratingAverage } }).catch(() => null);
}

function buildSalesTrend(orders: Array<{ total: Prisma.Decimal; createdAt: Date }>) {
  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(Date.now() - (6 - index) * 86400000);
    const label = date.toLocaleDateString("en", { weekday: "short" });
    const value = orders
      .filter((order) => order.createdAt.toDateString() === date.toDateString())
      .reduce((sum, order) => sum + Number(order.total), 0);
    return { label, value };
  });
}

function LibraryOrderStatusFromPayment(status: PaymentStatus) {
  return status === PaymentStatus.PAID ? "PAID" : "PENDING";
}

function normalizeType(type: string): LibraryProductType {
  return Object.values(LibraryProductType).includes(type as LibraryProductType) ? type as LibraryProductType : LibraryProductType.PDF;
}

function normalizeStatus(status: string): LibraryProductStatus {
  return Object.values(LibraryProductStatus).includes(status as LibraryProductStatus) ? status as LibraryProductStatus : LibraryProductStatus.DRAFT;
}

function filterAndSortLocalProducts(input: {
  q?: string;
  category?: string;
  author?: string;
  type?: string;
  difficulty?: string;
  status?: string;
  includeDrafts?: boolean;
  limit?: number;
}) {
  const q = input.q?.trim().toLowerCase();
  return localLibraryProducts
    .filter((product) => {
      if (!input.includeDrafts && product.status !== "PUBLISHED" && product.status !== "SCHEDULED") return false;
      if (input.status && product.status !== input.status) return false;
      if (input.category && product.category !== input.category) return false;
      if (input.author && product.author !== input.author) return false;
      if (input.type && product.productType !== input.type) return false;
      if (input.difficulty && product.difficulty !== input.difficulty) return false;
      if (!q) return true;
      return [
        product.title,
        product.subtitle,
        product.sku,
        product.isbn,
        product.author,
        product.category,
        product.collection,
        product.publisher,
        product.tags.join(" "),
      ].filter(Boolean).join(" ").toLowerCase().includes(q);
    })
    .sort((a, b) => Number(b.featured) - Number(a.featured) || new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, input.limit ?? 100);
}

function localProductFromInput(input: Partial<LibraryProductInput>, existing?: LibraryProduct): LibraryProduct {
  const title = input.title ?? existing?.title ?? "Untitled Library Product";
  const now = new Date().toISOString();
  const slug = input.slug || existing?.slug || slugify(title);
  const gallery = input.gallery?.length
    ? input.gallery.map((item) => ({ label: item.label, url: item.url, kind: item.kind }))
    : existing?.gallery.map((item) => ({ ...item })) ?? [{ label: "Cover", url: "/images/academy/agent-academy-hero.png", kind: "cover" as const }];
  const downloads = input.downloads?.length
    ? input.downloads.map((item, index) => ({
        id: (item as { id?: string }).id ?? `local-download-${Date.now()}-${index}`,
        label: item.label,
        fileType: item.fileType,
        size: item.size ?? formatBytes(item.fileSizeBytes ?? 0),
        secure: item.secure ?? true,
        fileUrl: item.fileUrl,
        fileName: item.fileName,
        fileSizeBytes: item.fileSizeBytes,
        previewable: item.previewable ?? item.fileType.toUpperCase() === "PDF",
      }))
    : existing?.downloads.map((item) => ({ ...item })) ?? [];
  const formats = input.formats?.length
    ? normalizeFormatsInput(input.formats)
    : existing?.formats ?? [
        {
          id: "primary",
          type: (input.productType === "PRINTED_BOOK" || existing?.productType === "PRINTED_BOOK" ? "PRINTED_BOOK" : "PDF") as LibraryProductFormat["type"],
          label: input.productType === "PRINTED_BOOK" || existing?.productType === "PRINTED_BOOK" ? "Printed book" : "Digital copy",
          enabled: true,
          price: Number(input.price ?? existing?.price ?? 0),
          compareAtPrice: input.compareAtPrice ?? existing?.compareAtPrice,
          sku: input.sku ?? existing?.sku,
        },
      ];
  const primary = primaryLibraryFormat(formats, input.productType ?? existing?.productType ?? "PDF", Number(input.price ?? existing?.price ?? 0));
  return {
    id: existing?.id ?? `local-product-${Date.now()}`,
    slug,
    title,
    subtitle: input.subtitle ?? existing?.subtitle ?? "",
    author: input.author ?? existing?.author ?? "HouseLink Zimbabwe Editorial Board",
    publisher: input.publisher ?? existing?.publisher ?? "HouseLink Zimbabwe",
    edition: input.edition ?? existing?.edition ?? "Digital Edition",
    isbn: input.isbn ?? existing?.isbn,
    language: input.language ?? existing?.language ?? "English",
    publicationDate: input.publicationDate ?? existing?.publicationDate ?? now.slice(0, 10),
    pages: input.pages ?? existing?.pages,
    weightGrams: input.weightGrams ?? existing?.weightGrams,
    bookSize: input.bookSize ?? existing?.bookSize,
    sku: input.sku ?? existing?.sku ?? `HL-LIB-${Date.now()}`,
    productType: (input.productType ?? primary.type ?? existing?.productType ?? "PDF") as LibraryProduct["productType"],
    status: (input.status as LibraryProduct["status"] | undefined) ?? existing?.status ?? "DRAFT",
    price: Number(input.price ?? primary.price ?? existing?.price ?? 0),
    compareAtPrice: input.compareAtPrice ?? primary.compareAtPrice ?? existing?.compareAtPrice,
    currency: input.currency ?? existing?.currency ?? "USD",
    rating: existing?.rating ?? 0,
    reviewCount: existing?.reviewCount ?? 0,
    category: input.category ?? existing?.category ?? "Library",
    collection: input.collection ?? existing?.collection ?? "HouseLink Library",
    series: input.series ?? existing?.series,
    difficulty: (input.difficulty as LibraryProduct["difficulty"] | undefined) ?? existing?.difficulty ?? "Professional",
    description: input.description ?? existing?.description ?? "",
    shortDescription: input.shortDescription ?? existing?.shortDescription ?? input.description?.slice(0, 140) ?? "",
    learningOutcomes: input.learningOutcomes ?? existing?.learningOutcomes ?? [],
    whoThisIsFor: input.whoThisIsFor ?? existing?.whoThisIsFor ?? [],
    requirements: input.requirements ?? existing?.requirements ?? [],
    tableOfContents: input.tableOfContents ?? existing?.tableOfContents ?? [],
    tags: input.tags ?? existing?.tags ?? [],
    seoTitle: input.seoTitle ?? existing?.seoTitle,
    metaDescription: input.metaDescription ?? existing?.metaDescription,
    seoFocusKeyword: input.seoFocusKeyword ?? existing?.seoFocusKeyword,
    seoImageUrl: input.seoImageUrl ?? existing?.seoImageUrl,
    formats,
    gallery,
    downloads,
    stock: input.stock !== undefined ? input.stock : existing?.stock ?? null,
    lowStockThreshold: input.lowStockThreshold ?? existing?.lowStockThreshold ?? 0,
    warehouse: input.warehouse ?? existing?.warehouse,
    supplier: input.supplier ?? existing?.supplier,
    featured: input.featured ?? existing?.featured ?? false,
    bestSeller: input.bestSeller ?? existing?.bestSeller ?? false,
    newRelease: input.newRelease ?? existing?.newRelease ?? false,
    editorsChoice: input.editorsChoice ?? existing?.editorsChoice ?? false,
    comingSoon: input.comingSoon ?? existing?.comingSoon ?? false,
    preorder: input.preorder ?? existing?.preorder ?? false,
    downloadCount: existing?.downloadCount ?? 0,
    viewCount: existing?.viewCount ?? 0,
    publishedAt: input.status === "PUBLISHED" ? now : existing?.publishedAt ?? now,
    scheduledAt: input.scheduledAt === null ? undefined : input.scheduledAt ?? existing?.scheduledAt,
  };
}

function parseFormats(value: unknown, productType: PublicLibraryProductType, price: number, compareAtPrice?: number, sku?: string): LibraryProductFormat[] {
  const parsed = normalizeFormatsInput(value);
  if (parsed.length) return parsed;
  return [
    {
      id: "primary",
      type: productType === "PRINTED_BOOK" ? "PRINTED_BOOK" : productType === "DIGITAL_BOOK" ? "DIGITAL_BOOK" : "PDF",
      label: productType === "PRINTED_BOOK" ? "Printed book" : "Digital copy",
      enabled: true,
      price,
      compareAtPrice,
      sku,
    },
  ];
}

function normalizeFormatsInput(value: unknown): LibraryProductFormat[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      const row = item as Partial<LibraryProductFormat>;
      const type = row.type === "PRINTED_BOOK" || row.type === "DIGITAL_BOOK" || row.type === "PDF" ? row.type : null;
      if (!type) return null;
      const price = Number(row.price);
      if (!Number.isFinite(price)) return null;
      return {
        id: String(row.id || `${type.toLowerCase()}-${index}`),
        type,
        label: String(row.label || (type === "PRINTED_BOOK" ? "Printed book" : type === "DIGITAL_BOOK" ? "Digital book" : "Digital PDF")),
        enabled: row.enabled !== false,
        price,
        compareAtPrice: row.compareAtPrice == null || row.compareAtPrice === ("" as unknown) ? undefined : Number(row.compareAtPrice) || undefined,
        sku: row.sku ? String(row.sku) : undefined,
      } satisfies LibraryProductFormat;
    })
    .filter(Boolean) as LibraryProductFormat[];
}

function formatLabelTitle(title: string, label?: string) {
  if (!label) return title;
  return title.includes(`(${label})`) ? title : `${title} (${label})`;
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `library-${Date.now()}`;
}

function buildSearchVector(input: Pick<LibraryProductInput, "title" | "subtitle" | "author" | "category" | "collection" | "description" | "tags" | "isbn" | "publisher">) {
  return [input.title, input.subtitle, input.author, input.category, input.collection, input.description, input.isbn, input.publisher, input.tags?.join(" ")].filter(Boolean).join(" ").toLowerCase();
}

function mediaKind(kind: string): LibraryProduct["gallery"][number]["kind"] {
  if (kind === "back" || kind === "inside" || kind === "mockup" || kind === "video") return kind;
  return "cover";
}

function parseSize(size: string) {
  const match = size.match(/([\d.]+)\s*(kb|mb|gb)?/i);
  if (!match) return 0;
  const value = Number(match[1]);
  const unit = match[2]?.toLowerCase();
  if (unit === "gb") return Math.round(value * 1024 * 1024 * 1024);
  if (unit === "mb") return Math.round(value * 1024 * 1024);
  if (unit === "kb") return Math.round(value * 1024);
  return Math.round(value);
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function createTokenHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function tokenSecret() {
  return process.env.HOUSELINK_LIBRARY_TOKEN_SECRET ?? process.env.SESSION_SECRET ?? "houselink-library-dev-secret";
}

function normalizeShippingAddress(input?: LibraryShippingAddress | null): LibraryShippingAddress | null {
  if (!input) return null;
  const name = String(input.name ?? "").trim();
  const phone = String(input.phone ?? "").trim();
  const line1 = String(input.line1 ?? "").trim();
  const city = String(input.city ?? "").trim();
  if (!name || !phone || !line1 || !city) return null;
  return {
    name,
    phone,
    line1,
    line2: String(input.line2 ?? "").trim() || undefined,
    city,
    province: String(input.province ?? "").trim() || undefined,
    country: String(input.country ?? "").trim() || "Zimbabwe",
    notes: String(input.notes ?? "").trim() || undefined,
  };
}

async function emailLibraryGuestClaim(email: string, orderNumber: string, claimUrl: string) {
  try {
    const { getHydratedRuntimePlatformSettings } = await import("@/lib/settings/runtime");
    const { sendSmtpPlainEmail } = await import("@/lib/integrations/smtp");
    const settings = await getHydratedRuntimePlatformSettings();
    await sendSmtpPlainEmail(
      settings.integrations,
      email,
      `Claim your HouseLink Library order ${orderNumber}`,
      `Hi,\n\nAn admin issued a Library access claim for order ${orderNumber}.\n\n1. Sign in (or create an account) with this email: ${email}\n2. Open this claim link:\n${claimUrl}\n\nThe link expires in 14 days.\n\n— HouseLink Library`,
    );
  } catch {
    // Claim token is still returned to admin if email delivery fails.
  }
}

export async function getLibrarySitemapEntries() {
  const products = await listLibraryProducts({ includeDrafts: false, limit: 500 });
  return products
    .filter((product) => product.status === "PUBLISHED")
    .map((product) => ({
      slug: product.slug,
      updatedAt: new Date(product.publishedAt || Date.now()),
    }));
}
