import { requireAdminAsync, requireAdmin } from "@/lib/admin/require-admin";
import { created, ok, problem } from "@/lib/api/response";
import { isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import {
  archiveLibraryProducts,
  createAdminLibraryManualOrder,
  createLibraryInventoryMovement,
  createLibraryExportJob,
  createLibraryProduct,
  deleteLibraryCoupon,
  deleteLibraryExportJob,
  deleteLibraryTaxSetting,
  deleteLibraryTaxonomy,
  disableLibraryCustomer,
  duplicateLibraryProduct,
  getAdminLibraryData,
  moderateLibraryReview,
  refundLibraryOrder,
  sendLibraryOrderNotification,
  softDeleteLibraryProducts,
  updateLibraryDownloadAccess,
  updateLibraryFulfilment,
  upsertLibraryRecommendation,
  upsertLibraryCoupon,
  upsertLibraryTaxonomy,
  upsertLibraryTaxSetting,
  type LibraryTaxonomyKind,
} from "@/lib/library/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = isPostgresStoreEnabled() ? await requireAdminAsync(request) : requireAdmin(request);
  if (auth.error) return auth.error;
  try {
    return ok(await getAdminLibraryData());
  } catch (error) {
    console.error("[admin/library] GET failed", error);
    return problem(500, "LIBRARY_ADMIN_LOAD_FAILED", "Library admin data could not be loaded from the database.");
  }
}

export async function POST(request: Request) {
  const auth = isPostgresStoreEnabled() ? await requireAdminAsync(request) : requireAdmin(request);
  if (auth.error || !auth.user) return auth.error ?? problem(401, "UNAUTHORIZED", "Admin required.");
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return problem(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
  try {
  if (body.action === "bulk_archive") {
    return ok({ count: await archiveLibraryProducts(arrayOfStrings(body.ids), auth.user.id) });
  }
  if (body.action === "bulk_delete") {
    return ok({ count: await softDeleteLibraryProducts(arrayOfStrings(body.ids), auth.user.id) });
  }
  if (body.action === "duplicate" && body.id) {
    const product = await duplicateLibraryProduct(String(body.id), auth.user.id);
    if (!product) return problem(404, "PRODUCT_NOT_FOUND", "Product not found.");
    return created({ product });
  }
  if (body.action === "update_fulfilment" && body.id) {
    const fulfilment = await updateLibraryFulfilment(String(body.id), body, auth.user.id);
    if (!fulfilment) return problem(404, "FULFILMENT_NOT_FOUND", "Fulfilment not found.");
    return ok({ fulfilment });
  }
  if (body.action === "inventory_movement") {
    const movement = await createLibraryInventoryMovement({ productId: String(body.productId ?? ""), type: String(body.type ?? "ADJUSTMENT"), quantity: Number(body.quantity), note: body.note ? String(body.note) : undefined }, auth.user.id);
    if (!movement) return problem(400, "INVALID_INVENTORY_MOVEMENT", "A valid product and non-zero quantity are required.");
    return created({ movement });
  }
  if (body.action === "save_recommendation") {
    const recommendation = await upsertLibraryRecommendation({ sourceProductId: String(body.sourceProductId ?? ""), targetProductId: String(body.targetProductId ?? ""), reason: body.reason ? String(body.reason) : undefined, weight: Number(body.weight) || 0, active: body.active ?? true }, auth.user.id);
    if (!recommendation) return problem(400, "INVALID_RECOMMENDATION", "Choose two different Library products.");
    return ok({ recommendation });
  }
  if (body.action === "create_manual_order") {
    if (!body.customerId) return problem(400, "INVALID_ORDER", "Customer user id is required.");
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) return problem(400, "INVALID_ORDER", "At least one product is required.");
    return created({ result: await createAdminLibraryManualOrder({ customerId: String(body.customerId), items: items.map((item: { productId?: string; quantity?: number }) => ({ productId: String(item.productId), quantity: Math.max(1, Number(item.quantity) || 1) })), couponCode: body.couponCode ? String(body.couponCode) : undefined, provider: body.provider ? String(body.provider) : "manual", referenceNumber: body.referenceNumber ? String(body.referenceNumber) : undefined, note: body.note ? String(body.note) : undefined, markPaid: Boolean(body.markPaid) }, auth.user.id) });
  }
  if (body.action === "refund_order") {
    const result = await refundLibraryOrder(String(body.id), body.reason ? String(body.reason) : "admin_refund", auth.user.id);
    if (!result) return problem(404, "ORDER_NOT_FOUND", "Library order not found.");
    return ok({ result });
  }
  if (body.action === "notify_order") {
    const type = body.type === "invoice" || body.type === "access" || body.type === "dispatch" || body.type === "custom" ? body.type : "custom";
    const result = await sendLibraryOrderNotification(String(body.id), type, body.message ? String(body.message) : undefined, auth.user.id);
    if (!result) return problem(404, "ORDER_NOT_FOUND", "Library order not found.");
    return ok({ result });
  }
  if (body.action === "disable_customer") {
    if (!body.userId) return problem(400, "INVALID_CUSTOMER", "Customer user id is required.");
    const result = await disableLibraryCustomer(String(body.userId), auth.user.id);
    if (!result) return problem(404, "CUSTOMER_NOT_FOUND", "Library customer not found.");
    if ("protected" in result) return problem(403, "PROTECTED_CUSTOMER", "Admin accounts cannot be disabled from Library customer tools.");
    return ok({ result });
  }
  if (body.action === "create_export") {
    return created({ exportJob: await createLibraryExportJob(String(body.type || "products"), body.filters ?? {}, auth.user.id) });
  }
  if (body.action === "delete_export") {
    if (!body.id) return problem(400, "INVALID_EXPORT", "Export id is required.");
    const exportJob = await deleteLibraryExportJob(String(body.id), auth.user.id);
    if (!exportJob) return problem(404, "EXPORT_NOT_FOUND", "Export job not found.");
    return ok({ deleted: true, exportJob });
  }
  if (body.action === "save_tax_setting") {
    if (!body.name || body.rate == null) return problem(400, "INVALID_TAX_SETTING", "name and rate are required.");
    return ok({ taxSetting: await upsertLibraryTaxSetting({ id: body.id, name: String(body.name), country: body.country, rate: Number(body.rate), inclusive: Boolean(body.inclusive), active: body.active ?? true }, auth.user.id) });
  }
  if (body.action === "delete_tax_setting") {
    if (!body.id) return problem(400, "INVALID_TAX_SETTING", "Tax setting id is required.");
    const taxSetting = await deleteLibraryTaxSetting(String(body.id), auth.user.id);
    if (!taxSetting) return problem(404, "TAX_SETTING_NOT_FOUND", "Tax setting not found.");
    return ok({ taxSetting });
  }
  if (body.action === "save_coupon") {
    if (!String(body.code ?? "").trim()) return problem(400, "INVALID_COUPON", "Coupon code is required.");
    const discountValue = Number(body.discountValue);
    if (!Number.isFinite(discountValue) || discountValue <= 0) return problem(400, "INVALID_COUPON", "Coupon discount must be greater than zero.");
    return ok({
      coupon: await upsertLibraryCoupon({
        id: body.id,
        code: String(body.code),
        description: body.description ? String(body.description) : undefined,
        discountType: String(body.discountType ?? "PERCENT"),
        discountValue,
        usageLimit: body.usageLimit === "" || body.usageLimit == null ? null : Number(body.usageLimit),
        minimumSubtotal: body.minimumSubtotal === "" || body.minimumSubtotal == null ? null : Number(body.minimumSubtotal),
        startsAt: body.startsAt || null,
        expiresAt: body.expiresAt || null,
        active: body.active ?? true,
        productIds: arrayOfStrings(body.productIds),
        categoryIds: arrayOfStrings(body.categoryIds),
        firstPurchaseOnly: Boolean(body.firstPurchaseOnly),
      }, auth.user.id),
    });
  }
  if (body.action === "delete_coupon") {
    const coupon = await deleteLibraryCoupon(String(body.id), auth.user.id);
    if (!coupon) return problem(404, "COUPON_NOT_FOUND", "Coupon not found.");
    return ok({ coupon });
  }
  if (body.action === "save_taxonomy") {
    const kind = taxonomyKind(body.kind);
    if (!kind) return problem(400, "INVALID_TAXONOMY", "A valid taxonomy kind is required.");
    if (!String(body.name ?? "").trim()) return problem(400, "INVALID_TAXONOMY", "Name is required.");
    return ok({ taxonomy: await upsertLibraryTaxonomy(kind, { id: body.id, name: String(body.name), slug: body.slug ? String(body.slug) : undefined, description: body.description ? String(body.description) : undefined, seoTitle: body.seoTitle ? String(body.seoTitle) : undefined, metaDescription: body.metaDescription ? String(body.metaDescription) : undefined, heroImageUrl: body.heroImageUrl ? String(body.heroImageUrl) : undefined, bio: body.bio ? String(body.bio) : undefined, websiteUrl: body.websiteUrl ? String(body.websiteUrl) : undefined, featured: Boolean(body.featured), sortOrder: Number(body.sortOrder) || 0, active: body.active ?? true }, auth.user.id) });
  }
  if (body.action === "delete_taxonomy") {
    const kind = taxonomyKind(body.kind);
    if (!kind) return problem(400, "INVALID_TAXONOMY", "A valid taxonomy kind is required.");
    const taxonomy = await deleteLibraryTaxonomy(kind, String(body.id), auth.user.id);
    if (!taxonomy) return problem(404, "TAXONOMY_NOT_FOUND", "Taxonomy record not found.");
    return ok({ taxonomy });
  }
  if (body.action === "update_download_access") {
    const access = await updateLibraryDownloadAccess(String(body.id), { status: body.status ? String(body.status) : undefined, downloadLimit: body.downloadLimit === "" || body.downloadLimit == null ? null : Number(body.downloadLimit), expiresAt: body.expiresAt || null }, auth.user.id);
    if (!access) return problem(404, "DOWNLOAD_ACCESS_NOT_FOUND", "Download access not found.");
    return ok({ access });
  }
  if (body.action === "moderate_review") {
    const review = await moderateLibraryReview(String(body.id), { status: body.status ? String(body.status) : undefined, featured: body.featured, verified: body.verified }, auth.user.id);
    if (!review) return problem(404, "REVIEW_NOT_FOUND", "Review not found.");
    return ok({ review });
  }
  if (!body.title || !body.description || body.price == null) {
    return problem(400, "INVALID_PRODUCT", "title, description, and price are required.");
  }
  const product = await createLibraryProduct({ ...body, price: Number(body.price) } as Parameters<typeof createLibraryProduct>[0], auth.user.id);
  return created({ product });
  } catch (error) {
    console.error("[admin/library] POST failed", error);
    return problem(500, "LIBRARY_ADMIN_WRITE_FAILED", "Library admin change could not be saved to the database.");
  }
}

function arrayOfStrings(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function taxonomyKind(value: unknown): LibraryTaxonomyKind | null {
  return value === "category" || value === "collection" || value === "author" ? value : null;
}
