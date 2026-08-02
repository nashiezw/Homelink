import { requireAdminAsync, requireAdmin } from "@/lib/admin/require-admin";
import { created, ok, problem } from "@/lib/api/response";
import { isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import {
  archiveLibraryProducts,
  approveLibraryGuestClaim,
  bulkUpdateLibraryProducts,
  createAdminLibraryManualOrder,
  createLibraryGuestClaim,
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
  deleteLibraryOrder,
  refundLibraryOrder,
  rejectLibraryGuestClaim,
  sendLibraryOrderNotification,
  softDeleteLibraryProducts,
  updateLibraryDownloadAccess,
  updateLibraryFulfilment,
  updateLibraryQuoteRequestStatus,
  upsertLibraryRecommendation,
  upsertLibraryCoupon,
  upsertLibraryTaxonomy,
  upsertLibraryTaxSetting,
  saveLibraryStoreSettings,
  type LibraryProductInput,
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
      const fulfilment = await updateLibraryFulfilment(
        String(body.id),
        {
          status: optionalString(body.status),
          courier: optionalString(body.courier),
          trackingNumber: optionalString(body.trackingNumber),
          trackingUrl: optionalString(body.trackingUrl),
          dispatchNotes: optionalString(body.dispatchNotes),
          deliveryNotes: optionalString(body.deliveryNotes),
        },
        auth.user.id,
      );
      if (!fulfilment) return problem(404, "FULFILMENT_NOT_FOUND", "Fulfilment not found.");
      return ok({ fulfilment });
    }
    if (body.action === "inventory_movement") {
      const movement = await createLibraryInventoryMovement(
        {
          productId: String(body.productId ?? ""),
          type: String(body.type ?? "ADJUSTMENT"),
          quantity: Number(body.quantity),
          note: optionalString(body.note),
        },
        auth.user.id,
      );
      if (!movement) return problem(400, "INVALID_INVENTORY_MOVEMENT", "A valid product and non-zero quantity are required.");
      return created({ movement });
    }
    if (body.action === "save_recommendation") {
      const recommendation = await upsertLibraryRecommendation(
        {
          sourceProductId: String(body.sourceProductId ?? ""),
          targetProductId: String(body.targetProductId ?? ""),
          reason: optionalString(body.reason),
          weight: Number(body.weight) || 0,
          active: optionalBoolean(body.active, true),
        },
        auth.user.id,
      );
      if (!recommendation) return problem(400, "INVALID_RECOMMENDATION", "Choose two different Library products.");
      return ok({ recommendation });
    }
    if (body.action === "create_manual_order") {
      if (!body.customerId) return problem(400, "INVALID_ORDER", "Customer user id is required.");
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length) return problem(400, "INVALID_ORDER", "At least one product is required.");
      return created({
        result: await createAdminLibraryManualOrder(
          {
            customerId: String(body.customerId),
            items: items.map((item) => {
              const row = item as { productId?: unknown; quantity?: unknown };
              return {
                productId: String(row.productId ?? ""),
                quantity: Math.max(1, Number(row.quantity) || 1),
              };
            }),
            couponCode: optionalString(body.couponCode),
            provider: optionalString(body.provider) ?? "manual",
            referenceNumber: optionalString(body.referenceNumber),
            note: optionalString(body.note),
            markPaid: Boolean(body.markPaid),
          },
          auth.user.id,
        ),
      });
    }
    if (body.action === "refund_order") {
      const result = await refundLibraryOrder(String(body.id), optionalString(body.reason) ?? "admin_refund", auth.user.id);
      if (!result) return problem(404, "ORDER_NOT_FOUND", "Library order not found.");
      return ok({ result });
    }
    if (body.action === "delete_order") {
      const result = await deleteLibraryOrder(String(body.id), auth.user.id);
      if (!result) return problem(404, "ORDER_NOT_FOUND", "Library order not found.");
      return ok({ result });
    }
    if (body.action === "notify_order") {
      const type = body.type === "invoice" || body.type === "access" || body.type === "dispatch" || body.type === "custom" ? body.type : "custom";
      const result = await sendLibraryOrderNotification(String(body.id), type, optionalString(body.message), auth.user.id);
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
      const filters = body.filters && typeof body.filters === "object" && !Array.isArray(body.filters) ? (body.filters as Record<string, unknown>) : {};
      return created({ exportJob: await createLibraryExportJob(String(body.type || "products"), filters, auth.user.id) });
    }
    if (body.action === "delete_export") {
      if (!body.id) return problem(400, "INVALID_EXPORT", "Export id is required.");
      const exportJob = await deleteLibraryExportJob(String(body.id), auth.user.id);
      if (!exportJob) return problem(404, "EXPORT_NOT_FOUND", "Export job not found.");
      return ok({ deleted: true, exportJob });
    }
    if (body.action === "save_tax_setting") {
      if (!body.name || body.rate == null) return problem(400, "INVALID_TAX_SETTING", "name and rate are required.");
      return ok({
        taxSetting: await upsertLibraryTaxSetting(
          {
            id: optionalString(body.id),
            name: String(body.name),
            country: optionalString(body.country),
            rate: Number(body.rate),
            inclusive: Boolean(body.inclusive),
            active: optionalBoolean(body.active, true),
          },
          auth.user.id,
        ),
      });
    }
    if (body.action === "delete_tax_setting") {
      if (!body.id) return problem(400, "INVALID_TAX_SETTING", "Tax setting id is required.");
      const taxSetting = await deleteLibraryTaxSetting(String(body.id), auth.user.id);
      if (!taxSetting) return problem(404, "TAX_SETTING_NOT_FOUND", "Tax setting not found.");
      return ok({ taxSetting });
    }
    if (body.action === "save_store_settings") {
      try {
        const storeSettings = await saveLibraryStoreSettings(body.settings ?? body, auth.user.id);
        return ok({ storeSettings });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Library store settings could not be saved.";
        return problem(500, "LIBRARY_SETTINGS_SAVE_FAILED", message);
      }
    }
    if (body.action === "save_coupon") {
      if (!String(body.code ?? "").trim()) return problem(400, "INVALID_COUPON", "Coupon code is required.");
      const discountValue = Number(body.discountValue);
      if (!Number.isFinite(discountValue) || discountValue <= 0) return problem(400, "INVALID_COUPON", "Coupon discount must be greater than zero.");
      return ok({
        coupon: await upsertLibraryCoupon(
          {
            id: optionalString(body.id),
            code: String(body.code),
            description: optionalString(body.description),
            discountType: String(body.discountType ?? "PERCENT"),
            discountValue,
            usageLimit: body.usageLimit === "" || body.usageLimit == null ? null : Number(body.usageLimit),
            minimumSubtotal: body.minimumSubtotal === "" || body.minimumSubtotal == null ? null : Number(body.minimumSubtotal),
            startsAt: optionalNullableString(body.startsAt),
            expiresAt: optionalNullableString(body.expiresAt),
            active: optionalBoolean(body.active, true),
            productIds: arrayOfStrings(body.productIds),
            categoryIds: arrayOfStrings(body.categoryIds),
            firstPurchaseOnly: Boolean(body.firstPurchaseOnly),
          },
          auth.user.id,
        ),
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
      return ok({
        taxonomy: await upsertLibraryTaxonomy(
          kind,
          {
            id: optionalString(body.id),
            name: String(body.name),
            slug: optionalString(body.slug),
            description: optionalString(body.description),
            seoTitle: optionalString(body.seoTitle),
            metaDescription: optionalString(body.metaDescription),
            heroImageUrl: optionalString(body.heroImageUrl),
            bio: optionalString(body.bio),
            websiteUrl: optionalString(body.websiteUrl),
            featured: Boolean(body.featured),
            sortOrder: Number(body.sortOrder) || 0,
            active: optionalBoolean(body.active, true),
          },
          auth.user.id,
        ),
      });
    }
    if (body.action === "delete_taxonomy") {
      const kind = taxonomyKind(body.kind);
      if (!kind) return problem(400, "INVALID_TAXONOMY", "A valid taxonomy kind is required.");
      const taxonomy = await deleteLibraryTaxonomy(kind, String(body.id), auth.user.id);
      if (!taxonomy) return problem(404, "TAXONOMY_NOT_FOUND", "Taxonomy record not found.");
      return ok({ taxonomy });
    }
    if (body.action === "update_download_access") {
      const access = await updateLibraryDownloadAccess(
        String(body.id),
        {
          status: optionalString(body.status),
          downloadLimit: body.downloadLimit === "" || body.downloadLimit == null ? null : Number(body.downloadLimit),
          expiresAt: optionalNullableString(body.expiresAt),
          resetDownloadCount: Boolean(body.resetDownloadCount),
        },
        auth.user.id,
      );
      if (!access) return problem(404, "DOWNLOAD_ACCESS_NOT_FOUND", "Download access not found.");
      return ok({ access });
    }
    if (body.action === "verify_library_file_delivery") {
      const fileUrl = optionalString(body.fileUrl);
      if (!fileUrl) return problem(400, "INVALID_FILE_URL", "Library file URL is required.");
      return ok(await verifyLibraryFileDelivery(fileUrl, request.url));
    }
    if (body.action === "moderate_review") {
      const review = await moderateLibraryReview(
        String(body.id),
        {
          status: optionalString(body.status),
          featured: body.featured === undefined ? undefined : Boolean(body.featured),
          verified: body.verified === undefined ? undefined : Boolean(body.verified),
        },
        auth.user.id,
      );
      if (!review) return problem(404, "REVIEW_NOT_FOUND", "Review not found.");
      return ok({ review });
    }
    if (body.action === "create_guest_claim") {
      if (!body.orderId || !body.email) return problem(400, "INVALID_CLAIM", "orderId and email are required.");
      const claim = await createLibraryGuestClaim({ orderId: String(body.orderId), email: String(body.email) }, auth.user.id);
      if (!claim) return problem(404, "CLAIM_UNAVAILABLE", "Guest claims are disabled or the Library order was not found.");
      return created({
        claim,
        claimToken: "claimToken" in claim ? claim.claimToken : undefined,
        claimUrl: "claimUrl" in claim ? claim.claimUrl : undefined,
      });
    }
    if (body.action === "approve_guest_claim") {
      const result = await approveLibraryGuestClaim(String(body.id), auth.user.id);
      if (!result) return problem(404, "CLAIM_NOT_FOUND", "Guest claim not found or already processed.");
      if ("error" in result && result.error === "USER_REQUIRED") {
        return problem(400, "USER_REQUIRED", `Ask ${result.email} to create a HouseLink account with that email before approving.`);
      }
      return ok(result);
    }
    if (body.action === "reject_guest_claim") {
      const claim = await rejectLibraryGuestClaim(String(body.id), auth.user.id);
      if (!claim) return problem(404, "CLAIM_NOT_FOUND", "Guest claim not found.");
      return ok({ claim });
    }
    if (body.action === "bulk_price") {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price < 0) return problem(400, "INVALID_PRICE", "A valid price is required.");
      return ok(await bulkUpdateLibraryProducts(arrayOfStrings(body.ids), { price }, auth.user.id));
    }
    if (body.action === "bulk_category") {
      const category = String(body.category ?? "").trim();
      if (!category) return problem(400, "INVALID_CATEGORY", "Category name is required.");
      return ok(await bulkUpdateLibraryProducts(arrayOfStrings(body.ids), { category }, auth.user.id));
    }
    if (body.action === "process_abandoned_carts") {
      const { processLibraryAbandonedCartReminders } = await import("@/lib/library/repository");
      return ok(await processLibraryAbandonedCartReminders({
        olderThanHours: Number(body.olderThanHours) || 6,
        limit: Number(body.limit) || 25,
      }));
    }
    if (body.action === "update_quote_request" && body.id) {
      const quote = await updateLibraryQuoteRequestStatus(String(body.id), String(body.status ?? ""), auth.user.id);
      if (!quote) return problem(400, "INVALID_QUOTE_REQUEST", "Valid quote request id and status are required.");
      return ok({ quote });
    }
    if (!body.title || !body.description || body.price == null) {
      return problem(400, "INVALID_PRODUCT", "title, description, and price are required.");
    }
    try {
      const product = await createLibraryProduct({ ...(body as LibraryProductInput), price: Number(body.price) }, auth.user.id);
      return created({ product });
    } catch (error) {
      if (error instanceof Error && /download file|format before publishing/i.test(error.message)) {
        return problem(400, "INVALID_PRODUCT", error.message);
      }
      throw error;
    }
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

function optionalString(value: unknown) {
  if (value == null || value === "") return undefined;
  return String(value);
}

function optionalNullableString(value: unknown) {
  if (value == null || value === "") return null;
  return String(value);
}

function optionalBoolean(value: unknown, fallback: boolean) {
  if (value == null) return fallback;
  return Boolean(value);
}

async function verifyLibraryFileDelivery(fileUrl: string, requestUrl: string) {
  try {
    const parsed = new URL(fileUrl, requestUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, status: 0, message: "Only HTTP and HTTPS Library file URLs can be verified." };
    }

    let response = await fetch(parsed.toString(), {
      method: "HEAD",
      redirect: "follow",
      cache: "no-store",
    });
    if (response.status === 405 || response.status === 501) {
      response = await fetch(parsed.toString(), {
        headers: { Range: "bytes=0-0" },
        redirect: "follow",
        cache: "no-store",
      });
    }
    if (response.ok) {
      return {
        ok: true,
        status: response.status,
        contentType: response.headers.get("content-type"),
        contentLength: response.headers.get("content-length"),
        message: "Library file delivery verified.",
      };
    }

    const cloudinaryError = response.headers.get("x-cld-error");
    return {
      ok: false,
      status: response.status,
      message: cloudinaryError
        ? `Cloudinary blocked delivery: ${cloudinaryError}. Enable PDF and ZIP delivery in Cloudinary Security settings or replace this product file URL.`
        : `File delivery returned HTTP ${response.status}. Replace this product file URL or move it to durable app-served storage.`,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message: error instanceof Error ? `File delivery check failed: ${error.message}` : "File delivery check failed.",
    };
  }
}
