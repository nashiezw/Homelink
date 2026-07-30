import { createHash, createHmac, randomBytes } from "crypto";
import { LibraryDownloadStatus, LibraryOrderStatus, LibraryProductStatus, LibraryProductType, NotificationChannel, NotificationStatus, PaymentProvider, PaymentStatus, type Prisma } from "@prisma/client";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import {
  getLibraryAnalytics as getEmptyLibraryAnalytics,
  getLibraryProducts,
  LIBRARY_ORDERS,
  type LibraryAnalytics,
  type LibraryOrder,
  type LibraryProduct,
  type LibraryProductType as PublicLibraryProductType,
} from "@/lib/library/catalog";

export type LibraryCartLine = {
  productId: string;
  title?: string;
  price?: number;
  currency?: string;
  quantity: number;
};

export type LibraryCartQuote = {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  currency: string;
  couponCode?: string;
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
  gallery?: LibraryProduct["gallery"];
  downloads?: Array<{ label: string; fileUrl?: string; fileName?: string; fileType: string; size?: string; fileSizeBytes?: number; secure?: boolean; previewable?: boolean }>;
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
    customer: { select: { name: true; email: true } };
    items: true;
    payment: { select: { status: true } };
  };
}>;

const TOKEN_TTL_SECONDS = 60 * 15;

type LocalLibraryOrder = LibraryOrder & {
  customerId?: string;
  paymentId?: string;
  items?: Array<{ id: string; title: string; sku: string; quantity: number; unitPrice: number; total: number; productId: string }>;
  payment?: { status: string };
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
  try {
    await seedLibraryIfEmpty();
    const q = input.q?.trim();
    const products = await getMainPrisma().libraryProduct.findMany({
      where: {
        deletedAt: null,
        ...(input.includeDrafts ? {} : { status: { in: [LibraryProductStatus.PUBLISHED, LibraryProductStatus.SCHEDULED] } }),
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
    return products.map(toLibraryProduct);
  } catch {
    return [];
  }
}

export async function getLibraryProductBySlug(slug: string) {
  if (!shouldUsePostgresLibrary()) return localLibraryProducts.find((product) => product.slug === slug && product.status !== "ARCHIVED") ?? null;
  try {
    await seedLibraryIfEmpty();
    const product = await getMainPrisma().libraryProduct.findUnique({
      where: { slug },
      include: productInclude(),
    });
    return product && !product.deletedAt ? toLibraryProduct(product as DbProduct) : null;
  } catch {
    return null;
  }
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
      include: { customer: { select: { name: true, email: true } }, items: true, payment: { select: { status: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return rows.map(toLibraryOrder);
  } catch {
    return LIBRARY_ORDERS;
  }
}

export async function quoteLibraryCart(items: LibraryCartLine[], couponCode?: string, customerId?: string): Promise<LibraryCartQuote> {
  const normalized = items.map((item) => ({ ...item, quantity: Math.max(1, Number(item.quantity) || 1) })).filter((item) => item.productId);
  if (!shouldUsePostgresLibrary()) {
    const products = localLibraryProducts;
    const lines = normalized.map((item) => {
      const product = products.find((entry) => entry.id === item.productId);
      return { ...item, title: product?.title ?? item.title, price: product?.price ?? item.price ?? 0, currency: product?.currency ?? item.currency ?? "USD" };
    });
    const subtotal = lines.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);
    return { subtotal, discountTotal: 0, taxTotal: 0, total: subtotal, currency: lines[0]?.currency ?? "USD", couponCode, items: lines };
  }
  await seedLibraryIfEmpty();
  const prisma = getMainPrisma();
  const ids = normalized.map((item) => item.productId);
  const products = await prisma.libraryProduct.findMany({ where: { id: { in: ids }, deletedAt: null }, include: { category: true } });
  const lines = products.map((product) => {
    const cart = normalized.find((item) => item.productId === product.id);
    const quantity = Math.max(1, Number(cart?.quantity) || 1);
    return { productId: product.id, title: product.title, price: Number(product.price), currency: product.currency, quantity };
  });
  const subtotal = lines.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountTotal = await calculateLibraryDiscount({ couponCode, subtotal, products, customerId });
  const tax = await prisma.libraryTaxSetting.findFirst({ where: { active: true, country: "ZW" }, orderBy: { createdAt: "desc" } }).catch(() => null);
  const taxable = Math.max(0, subtotal - discountTotal);
  const taxTotal = tax && !tax.inclusive ? roundMoney(taxable * (Number(tax.rate) / 100)) : 0;
  return {
    subtotal,
    discountTotal,
    taxTotal,
    total: Math.max(0, roundMoney(taxable + taxTotal)),
    currency: lines[0]?.currency ?? "USD",
    couponCode,
    items: lines,
  };
}

export async function createLibraryProduct(input: LibraryProductInput, actorId?: string) {
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
    localLibraryProducts[index] = localProductFromInput(input, localLibraryProducts[index]);
    return localLibraryProducts[index];
  }
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
}) {
  if (!shouldUsePostgresLibrary()) {
    const quote = await quoteLibraryCart(input.items, input.couponCode, input.customerId);
    if (!quote.items.length) throw new Error("No valid Library products found.");
    const order: LocalLibraryOrder = {
      id: `local-library-order-${Date.now()}`,
      orderNumber: `HL-LIB-${Date.now()}`,
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
  const quote = await quoteLibraryCart(input.items, input.couponCode, input.customerId);
  const ids = input.items.map((item) => item.productId);
  const products = await prisma.libraryProduct.findMany({ where: { id: { in: ids }, deletedAt: null }, include: { files: true } });
  if (!products.length) throw new Error("No valid Library products found.");
  const lines = products.map((product) => {
    const cart = quote.items.find((item) => item.productId === product.id);
    const quantity = Math.max(1, Number(cart?.quantity) || 1);
    const unitPrice = Number(product.price);
    return { product, quantity, unitPrice, total: unitPrice * quantity };
  });
  const order = await prisma.libraryOrder.create({
    data: {
      orderNumber: `HL-LIB-${Date.now()}`,
      customerId: input.customerId,
      paymentId: input.paymentId,
      status: LibraryOrderStatusFromPayment(PaymentStatus.PENDING),
      subtotal: quote.subtotal,
      discountTotal: quote.discountTotal,
      total: quote.total,
      currency: quote.currency,
      couponCode: input.couponCode || null,
      metadata: { taxTotal: quote.taxTotal },
      items: {
        create: lines.map((line) => ({
          productId: line.product.id,
          title: line.product.title,
          sku: line.product.sku,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          total: line.total,
          productType: line.product.productType,
        })),
      },
    },
    include: { customer: { select: { name: true, email: true } }, items: true, payment: { select: { status: true } } },
  });
  await incrementLibraryCouponUsage(input.couponCode);
  await logLibraryActivity({
    actorId: input.customerId,
    targetType: "order",
    targetId: order.id,
    action: "CREATED",
    message: `Library order ${order.orderNumber} created.`,
    metadata: { paymentId: input.paymentId, couponCode: input.couponCode, taxTotal: quote.taxTotal },
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
  const order = await prisma.libraryOrder.findUnique({ where: { id: orderId }, include: { customer: { select: { id: true } }, payment: true } });
  if (!order) return null;
  const [updated, revoked] = await prisma.$transaction([
    prisma.libraryOrder.update({ where: { id: orderId }, data: { status: LibraryOrderStatus.REFUNDED, refundedAt: new Date(), metadata: { reason } }, include: { customer: { select: { name: true, email: true } }, items: true, payment: { select: { status: true } } } }),
    prisma.libraryDownloadAccess.updateMany({ where: { orderId }, data: { status: LibraryDownloadStatus.REVOKED } }),
    ...(order.paymentId ? [prisma.payment.update({ where: { id: order.paymentId }, data: { status: PaymentStatus.REFUNDED, metadata: { reason, refundedBy: actorId } } })] : []),
  ]);
  await notifyLibraryCustomer(order.customerId, "Library order refunded", "Your HouseLink Library order has been marked refunded and related download access has been revoked.");
  await logLibraryActivity({ actorId, targetType: "order", targetId: orderId, action: "ORDER_REFUNDED", message: `Library order refunded. ${revoked.count} access record(s) revoked.`, metadata: { reason } });
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
        order.status = "FULFILLED";
        order.paymentStatus = "PAID";
        order.payment = { status: "PAID" };
        orders += 1;
        downloads += order.items?.length ?? 0;
      }
    });
    return { orders, downloads };
  }
  const prisma = getMainPrisma();
  const orders = await prisma.libraryOrder.findMany({
    where: { paymentId, status: { in: ["PENDING", "PAID"] } },
    include: { items: { include: { product: { include: { files: true } } } } },
  });
  let downloads = 0;
  for (const order of orders) {
    await prisma.libraryOrder.update({ where: { id: order.id }, data: { status: "FULFILLED", fulfilledAt: new Date() } });
    await ensureLibraryInvoice(order.id);
    await ensureLibraryFulfilmentQueue(order.id);
    await logLibraryActivity({
      targetType: "order",
      targetId: order.id,
      action: "FULFILLED",
      message: `Library order ${order.id} fulfilled after payment ${paymentId}.`,
      metadata: { paymentId },
    });
    for (const item of order.items) {
      if (item.product.stock !== null) {
        await prisma.libraryProduct.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        }).catch(() => null);
        await prisma.libraryInventoryMovement.create({
          data: { productId: item.productId, type: "SALE", quantity: -item.quantity, note: `Order ${order.id}` },
        }).catch(() => null);
      }
      await createLibraryAcademyEntitlementForItem(order.id, order.customerId, item.productId, item.product.productType);
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
            downloadLimit: item.product.downloadLimit,
            expiresAt: item.product.downloadExpiryDays ? new Date(Date.now() + item.product.downloadExpiryDays * 86400000) : null,
          },
          update: { status: "ACTIVE" },
        });
        downloads += 1;
      }
      for (const file of files) {
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
            licenseKey: item.product.licenseKeys ? `HL-${randomBytes(6).toString("hex").toUpperCase()}` : null,
            downloadLimit: file.downloadLimit ?? item.product.downloadLimit,
            expiresAt: (file.expiryDays ?? item.product.downloadExpiryDays)
              ? new Date(Date.now() + (file.expiryDays ?? item.product.downloadExpiryDays ?? 0) * 86400000)
              : null,
          },
          update: { status: "ACTIVE" },
        });
        downloads += 1;
      }
    }
  }
  return { orders: orders.length, downloads };
}

export async function revokeLibraryAccessForPayment(paymentId: string, reason = "payment_reversed") {
  if (!shouldUsePostgresLibrary()) return { orders: 0, downloads: 0 };
  const prisma = getMainPrisma();
  const orders = await prisma.libraryOrder.findMany({ where: { paymentId }, select: { id: true } });
  const orderIds = orders.map((order) => order.id);
  if (!orderIds.length) return { orders: 0, downloads: 0 };
  await prisma.libraryOrder.updateMany({ where: { id: { in: orderIds } }, data: { status: "REFUNDED", refundedAt: new Date(), metadata: { revokeReason: reason } } });
  const downloads = await prisma.libraryDownloadAccess.updateMany({ where: { orderId: { in: orderIds } }, data: { status: "REVOKED" } });
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
    return { products: localLibraryProducts.filter((product) => productIds.has(product.id)), orders, downloads: [] };
  }
  try {
    const [orders, downloads] = await Promise.all([
      listLibraryOrders(customerId),
      getMainPrisma().libraryDownloadAccess.findMany({
        where: { userId: customerId },
        include: { product: { include: productInclude() }, file: true },
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
    };
  } catch {
    return { products: [], orders: [], downloads: [] };
  }
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
    include: { customer: { select: { name: true, email: true } }, items: true, payment: { select: { status: true } } },
  }).catch(() => null);
  if (!order) return null;
  if (!admin && order.customerId !== userId) return "FORBIDDEN" as const;
  return {
    ...toLibraryOrder(order),
    items: order.items.map((item) => ({
      id: item.id,
      title: item.title,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      total: Number(item.total),
      productId: item.productId,
    })),
    payment: order.payment,
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
    include: { customer: { select: { name: true, email: true } }, items: true, payment: { select: { status: true } } },
  });
  if (!order) return null;
  if (!admin && order.customerId !== userId) return "FORBIDDEN" as const;
  const invoice = await ensureLibraryInvoice(order.id);
  return { order: { ...toLibraryOrder(order), items: order.items.map((item) => ({ id: item.id, title: item.title, sku: item.sku, quantity: item.quantity, unitPrice: Number(item.unitPrice), total: Number(item.total) })) }, invoice };
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
    return {
      fulfilments: [],
      invoices: [],
      activities: [],
      exports: [],
      taxSettings: [],
      coupons: localLibraryCoupons,
      taxonomy: localLibraryTaxonomy,
      downloadAccess: [],
      reviews: [],
      guestClaims: [],
      academyEntitlements: [],
      recommendations: [],
    };
  }
  const prisma = getMainPrisma();
  try {
    const [fulfilments, invoices, activities, exports, taxSettings, coupons, categories, collections, authors, downloadAccess, reviews, guestClaims, academyEntitlements, recommendations] = await Promise.all([
      prisma.libraryFulfilment.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { order: { select: { orderNumber: true, total: true, currency: true } } } }),
      prisma.libraryInvoice.findMany({ orderBy: { issuedAt: "desc" }, take: 20, include: { order: { select: { orderNumber: true } } } }),
      prisma.libraryActivity.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
      prisma.libraryExportJob.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
      prisma.libraryTaxSetting.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
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
    ]);
    return {
      fulfilments,
      invoices,
      activities,
      exports,
      taxSettings,
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
    };
  } catch {
    return {
      fulfilments: [],
      invoices: [],
      activities: [],
      exports: [],
      taxSettings: [],
      coupons: [],
      taxonomy: [],
      downloadAccess: [],
      reviews: [],
      guestClaims: [],
      academyEntitlements: [],
      recommendations: [],
    };
  }
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
  const fulfilment = await getMainPrisma().libraryFulfilment.update({ where: { id }, data });
  await logLibraryActivity({ actorId, targetType: "fulfilment", targetId: id, action: "UPDATED", message: `Fulfilment marked ${fulfilment.status}.`, metadata: input });
  return fulfilment;
}

export async function createLibraryExportJob(type: string, filters: unknown, actorId?: string) {
  if (!shouldUsePostgresLibrary()) return { id: `export-${Date.now()}`, type, status: "COMPLETED", fileUrl: null };
  const job = await getMainPrisma().libraryExportJob.create({
    data: {
      type,
      status: "COMPLETED",
      requestedById: actorId,
      filters: (filters ?? {}) as Prisma.InputJsonValue,
      fileUrl: `/api/v1/admin/library/exports/${encodeURIComponent(type)}.csv`,
      completedAt: new Date(),
    },
  });
  await logLibraryActivity({ actorId, targetType: "export", targetId: job.id, action: "CREATED", message: `${type} export prepared.` });
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
    const row = localLibraryTaxonomy.find((item) => item.id === id && item.kind === kind);
    if (!row) return null;
    row.active = false;
    return row;
  }
  const prisma = getMainPrisma();
  const row = kind === "category"
    ? await prisma.libraryCategory.update({ where: { id }, data: { active: false }, include: { _count: { select: { products: true } } } }).catch(() => null)
    : kind === "collection"
      ? await prisma.libraryCollection.update({ where: { id }, data: { active: false }, include: { _count: { select: { products: true } } } }).catch(() => null)
      : await prisma.libraryAuthor.update({ where: { id }, data: { active: false }, include: { _count: { select: { products: true } } } }).catch(() => null);
  if (!row) return null;
  await logLibraryActivity({ actorId, targetType: kind, targetId: id, action: "TAXONOMY_DISABLED", message: `${kind} disabled.` });
  return toLibraryTaxonomyAdmin(kind, row);
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
      packingSlipNumber: `HL-PACK-${order.orderNumber.replace(/\D/g, "") || Date.now()}`,
      dispatchNotes: "Auto-created for printed Library products.",
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

export function createDownloadToken(accessId: string, userId: string) {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
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
    ...(input.productType !== undefined || !partial ? { productType: normalizeType(input.productType ?? "PDF") } : {}),
    ...(input.status !== undefined || !partial ? { status: normalizeStatus(input.status ?? "DRAFT") } : {}),
    ...(input.price !== undefined ? { price: input.price } : {}),
    ...(input.compareAtPrice !== undefined ? { compareAtPrice: input.compareAtPrice || null } : {}),
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
    ...(input.status === "PUBLISHED" ? { publishedAt: new Date() } : {}),
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
  };
}

function toLibraryOrder(row: DbOrder): LibraryOrder {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    customerName: row.customer.name,
    customerEmail: row.customer.email,
    status: row.status === "CANCELLED" ? "PENDING" : row.status === "PAID" ? "PAID" : row.status,
    paymentStatus: row.payment?.status ?? "PENDING",
    total: Number(row.total),
    currency: row.currency,
    itemCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
    createdAt: row.createdAt.toISOString(),
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
      }))
    : existing?.downloads.map((item) => ({ ...item })) ?? [];
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
    productType: input.productType ?? existing?.productType ?? "PDF",
    status: (input.status as LibraryProduct["status"] | undefined) ?? existing?.status ?? "DRAFT",
    price: Number(input.price ?? existing?.price ?? 0),
    compareAtPrice: input.compareAtPrice ?? existing?.compareAtPrice,
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
  };
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
