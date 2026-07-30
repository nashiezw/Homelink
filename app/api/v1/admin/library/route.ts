import { requireAdminAsync, requireAdmin } from "@/lib/admin/require-admin";
import { created, ok, problem } from "@/lib/api/response";
import { isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import {
  archiveLibraryProducts,
  createLibraryExportJob,
  createLibraryProduct,
  deleteLibraryCoupon,
  duplicateLibraryProduct,
  getAdminLibraryData,
  softDeleteLibraryProducts,
  updateLibraryFulfilment,
  upsertLibraryCoupon,
  upsertLibraryTaxSetting,
} from "@/lib/library/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = isPostgresStoreEnabled() ? await requireAdminAsync(request) : requireAdmin(request);
  if (auth.error) return auth.error;
  return ok(await getAdminLibraryData());
}

export async function POST(request: Request) {
  const auth = isPostgresStoreEnabled() ? await requireAdminAsync(request) : requireAdmin(request);
  if (auth.error || !auth.user) return auth.error ?? problem(401, "UNAUTHORIZED", "Admin required.");
  const body = await request.json();
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
  if (body.action === "create_export") {
    return created({ exportJob: await createLibraryExportJob(String(body.type || "products"), body.filters ?? {}, auth.user.id) });
  }
  if (body.action === "save_tax_setting") {
    if (!body.name || body.rate == null) return problem(400, "INVALID_TAX_SETTING", "name and rate are required.");
    return ok({ taxSetting: await upsertLibraryTaxSetting({ id: body.id, name: String(body.name), country: body.country, rate: Number(body.rate), inclusive: Boolean(body.inclusive), active: body.active ?? true }, auth.user.id) });
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
  if (!body.title || !body.description || body.price == null) {
    return problem(400, "INVALID_PRODUCT", "title, description, and price are required.");
  }
  const product = await createLibraryProduct({ ...body, price: Number(body.price) }, auth.user.id);
  return created({ product });
}

function arrayOfStrings(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}
