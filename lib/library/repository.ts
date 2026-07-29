import { createHash, createHmac, randomBytes } from "crypto";
import { LibraryProductStatus, LibraryProductType, PaymentStatus, type Prisma } from "@prisma/client";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import {
  getLibraryAnalytics as getFallbackLibraryAnalytics,
  getLibraryProductBySlug as getFallbackLibraryProductBySlug,
  getLibraryProducts as getFallbackLibraryProducts,
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
    return getFallbackLibraryProducts();
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
    return getFallbackLibraryProducts();
  }
}

export async function getLibraryProductBySlug(slug: string) {
  if (!shouldUsePostgresLibrary()) return getFallbackLibraryProductBySlug(slug) ?? null;
  try {
    await seedLibraryIfEmpty();
    const product = await getMainPrisma().libraryProduct.findUnique({
      where: { slug },
      include: productInclude(),
    });
    return product && !product.deletedAt ? toLibraryProduct(product as DbProduct) : null;
  } catch {
    return getFallbackLibraryProductBySlug(slug) ?? null;
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
  if (!shouldUsePostgresLibrary()) return getFallbackLibraryAnalytics();
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
    return getFallbackLibraryAnalytics();
  }
}

export async function listLibraryOrders(customerId?: string): Promise<LibraryOrder[]> {
  if (!shouldUsePostgresLibrary()) return LIBRARY_ORDERS;
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
    const products = getFallbackLibraryProducts();
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
  if (!shouldUsePostgresLibrary()) return getFallbackLibraryProducts()[0];
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
  if (!shouldUsePostgresLibrary()) return getFallbackLibraryProducts().find((product) => product.id === id) ?? null;
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
  const result = await getMainPrisma().libraryProduct.updateMany({
    where: { id: { in: ids } },
    data: { status: LibraryProductStatus.ARCHIVED, archivedAt: new Date(), updatedById: actorId },
  });
  return result.count;
}

export async function softDeleteLibraryProducts(ids: string[], actorId?: string) {
  if (!ids.length) return 0;
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
  if (!shouldUsePostgresLibrary()) return { order: LIBRARY_ORDERS[0], accessGranted: false };
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

export async function fulfillPaidLibraryOrdersForPayment(paymentId: string) {
  if (!shouldUsePostgresLibrary()) return { orders: 0, downloads: 0 };
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
    return { products: getFallbackLibraryProducts().filter((p) => p.downloads.length > 0).slice(0, 3), orders: LIBRARY_ORDERS, downloads: [] };
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
        productTitle: download.product.title,
        fileName: download.file?.fileName ?? download.product.title,
        status: download.status,
        downloadCount: download.downloadCount,
        downloadLimit: download.downloadLimit,
        expiresAt: download.expiresAt?.toISOString() ?? null,
      })),
    };
  } catch {
    return { products: getFallbackLibraryProducts().filter((p) => p.downloads.length > 0).slice(0, 3), orders: LIBRARY_ORDERS, downloads: [] };
  }
}

export async function getLibraryOrderForUser(orderId: string, userId: string, roles: string[] = []) {
  if (!shouldUsePostgresLibrary()) return LIBRARY_ORDERS.find((order) => order.id === orderId) ?? null;
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
    const order = LIBRARY_ORDERS.find((entry) => entry.id === orderId);
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
      guestClaims: [],
      academyEntitlements: [],
      recommendations: [],
    };
  }
  const prisma = getMainPrisma();
  try {
    const [fulfilments, invoices, activities, exports, taxSettings, guestClaims, academyEntitlements, recommendations] = await Promise.all([
      prisma.libraryFulfilment.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { order: { select: { orderNumber: true, total: true, currency: true } } } }),
      prisma.libraryInvoice.findMany({ orderBy: { issuedAt: "desc" }, take: 20, include: { order: { select: { orderNumber: true } } } }),
      prisma.libraryActivity.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
      prisma.libraryExportJob.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
      prisma.libraryTaxSetting.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
      prisma.libraryGuestClaim.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { order: { select: { orderNumber: true } } } }),
      prisma.libraryAcademyEntitlement.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.libraryRecommendation.findMany({
        where: { active: true },
        orderBy: [{ weight: "desc" }, { createdAt: "desc" }],
        take: 20,
        include: { sourceProduct: { select: { title: true } }, targetProduct: { select: { title: true } } },
      }),
    ]);
    return { fulfilments, invoices, activities, exports, taxSettings, guestClaims, academyEntitlements, recommendations };
  } catch {
    return {
      fulfilments: [],
      invoices: [],
      activities: [],
      exports: [],
      taxSettings: [],
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
    if (input.downloads.length) {
      await prisma.libraryProductFile.createMany({
        data: input.downloads.map((item, sortOrder) => ({
          productId,
          label: item.label,
          fileUrl: item.fileUrl || "/uploads/academy/houselink-zimbabwe-real-estate-agent-training-manual.pdf",
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
  const prisma = getMainPrisma();
  const count = await prisma.libraryProduct.count().catch(() => 0);
  if (count > 0) return;
  for (const product of getFallbackLibraryProducts()) {
    const author = await prisma.libraryAuthor.upsert({
      where: { slug: slugify(product.author) },
      create: { name: product.author, slug: slugify(product.author), bio: `${product.author} contributor profile.` },
      update: {},
    });
    const category = await prisma.libraryCategory.upsert({
      where: { slug: slugify(product.category) },
      create: { name: product.category, slug: slugify(product.category), description: `${product.category} products.` },
      update: {},
    });
    const collection = await prisma.libraryCollection.upsert({
      where: { slug: slugify(product.collection) },
      create: { name: product.collection, slug: slugify(product.collection), featured: product.featured },
      update: {},
    });
    await prisma.libraryProduct.create({
      data: {
        id: product.id,
        title: product.title,
        slug: product.slug,
        subtitle: product.subtitle,
        authorId: author.id,
        publisher: product.publisher,
        edition: product.edition,
        isbn: product.isbn,
        language: product.language,
        publicationDate: new Date(product.publicationDate),
        pages: product.pages,
        weightGrams: product.weightGrams,
        bookSize: product.bookSize,
        sku: product.sku,
        productType: normalizeType(product.productType),
        status: normalizeStatus(product.status),
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        currency: product.currency,
        categoryId: category.id,
        collectionId: collection.id,
        series: product.series,
        difficulty: product.difficulty,
        shortDescription: product.shortDescription,
        description: product.description,
        learningOutcomes: product.learningOutcomes,
        whoThisIsFor: product.whoThisIsFor,
        requirements: product.requirements,
        tableOfContents: product.tableOfContents,
        tags: product.tags,
        searchVector: buildSearchVector(product),
        featured: product.featured,
        bestSeller: product.bestSeller,
        newRelease: product.newRelease,
        editorsChoice: product.editorsChoice,
        comingSoon: product.comingSoon,
        preorder: product.preorder,
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        warehouse: product.warehouse,
        supplier: product.supplier,
        viewCount: product.viewCount,
        downloadCount: product.downloadCount,
        ratingAverage: product.rating,
        ratingCount: product.reviewCount,
        publishedAt: new Date(product.publishedAt),
        media: { create: product.gallery.map((item, sortOrder) => ({ label: item.label, url: item.url, mediaType: item.kind, sortOrder })) },
        files: {
          create: product.downloads.map((item, sortOrder) => ({
            label: item.label,
            fileUrl: "/uploads/academy/houselink-zimbabwe-real-estate-agent-training-manual.pdf",
            fileName: `${slugify(item.label)}.${item.fileType.toLowerCase()}`,
            fileType: item.fileType,
            fileSizeBytes: parseSize(item.size),
            secure: item.secure,
            previewable: item.fileType === "PDF",
            sortOrder,
          })),
        },
      },
    });
  }
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
    gallery: row.media.map((item) => ({ label: item.label, url: item.url, kind: mediaKind(item.mediaType) })),
    downloads: row.files.map((item) => ({ id: item.id, label: item.label, fileType: item.fileType, size: formatBytes(item.fileSizeBytes), secure: item.secure })),
    stock: row.stock,
    lowStockThreshold: row.lowStockThreshold,
    warehouse: row.warehouse ?? undefined,
    supplier: row.supplier ?? undefined,
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
