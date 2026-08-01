import { getSessionUserIdFromRequest, sessionCookieHeader } from "@/lib/auth/session";
import { ensureLibraryCheckoutBuyer } from "@/lib/auth/lightweight-user";
import { created, problem } from "@/lib/api/response";
import {
  completePaymentInPostgres,
  createPaymentInPostgres,
  getProductionPaymentSettings,
  shouldUsePostgresPayments,
} from "@/lib/payments/postgres-payment-repository";
import { getStore } from "@/lib/store/app-store";
import {
  createLibraryOrderFromCheckout,
  fulfillPaidLibraryOrdersForPayment,
  quoteLibraryCart,
  type LibraryShippingAddress,
} from "@/lib/library/repository";
import { getLibraryStoreSettings } from "@/lib/library/settings";

type CheckoutLine = {
  productId: string;
  title: string;
  price: number;
  currency: string;
  quantity: number;
  formatId?: string;
  formatType?: string;
  formatLabel?: string;
};

function withOptionalSessionCookie<T>(data: T, session?: { sessionId: string; maxAgeSeconds: number; userId: string } | null) {
  const response = created(data);
  if (session) {
    response.headers.set("Set-Cookie", sessionCookieHeader(session.sessionId, session.maxAgeSeconds, session.userId));
  }
  return response;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return problem(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const librarySettings = await getLibraryStoreSettings();
  if (!librarySettings.store.enabled) {
    return problem(503, "LIBRARY_DISABLED", "HouseLink Library checkout is temporarily disabled.");
  }

  let userId = getSessionUserIdFromRequest(request);
  let newSession: { sessionId: string; maxAgeSeconds: number; userId: string } | null = null;
  let continueEmail = false;

  if (!userId) {
    if (!librarySettings.checkout.guestCheckout) {
      return problem(401, "UNAUTHORIZED", "Sign in to checkout.");
    }
    const customer = (body.customer && typeof body.customer === "object" ? body.customer : {}) as {
      name?: unknown;
      email?: unknown;
      phone?: unknown;
    };
    const buyer = await ensureLibraryCheckoutBuyer({
      name: typeof customer.name === "string" ? customer.name : "",
      email: typeof customer.email === "string" ? customer.email : "",
      phone: typeof customer.phone === "string" ? customer.phone : undefined,
    });
    if (!buyer.ok) {
      return problem(buyer.status, buyer.code, buyer.message);
    }
    userId = buyer.userId;
    newSession = {
      sessionId: buyer.sessionId,
      maxAgeSeconds: buyer.maxAgeSeconds,
      userId: buyer.userId,
    };
    continueEmail = true;
  }

  const items = Array.isArray(body.items) ? (body.items as CheckoutLine[]) : [];
  if (!items.length) return problem(400, "EMPTY_CART", "Add at least one Library product to checkout.");

  if (librarySettings.checkout.requireTerms && !body.termsAccepted) {
    return problem(400, "TERMS_REQUIRED", "Accept the Library terms to continue checkout.");
  }
  if (body.couponCode && !librarySettings.checkout.allowCoupons) {
    return problem(400, "COUPONS_DISABLED", "Coupons are currently disabled for Library checkout.");
  }
  const shipping = (body.shipping ?? null) as LibraryShippingAddress | null;
  const shippingMethod = body.shippingMethod === "PICKUP" ? ("PICKUP" as const) : ("SHIPPING" as const);
  const quote = await quoteLibraryCart(items, typeof body.couponCode === "string" ? body.couponCode : undefined, userId, {
    country: shipping?.country,
    province: shipping?.province,
    city: shipping?.city,
    includeShipping: true,
    shippingMethod,
  });
  if (quote.subtotal < librarySettings.checkout.minimumOrderAmount) {
    return problem(400, "MINIMUM_ORDER", `Minimum order amount is ${quote.currency} ${librarySettings.checkout.minimumOrderAmount.toFixed(2)}.`);
  }
  if (quote.total <= 0) return problem(400, "INVALID_TOTAL", "Library cart total must be greater than zero.");

  const provider = String(body.provider || "bank_transfer");
  const description = items.length === 1 ? items[0]?.title ?? "HouseLink Library product" : `${items.length} HouseLink Library products`;

  if (shouldUsePostgresPayments()) {
    const paymentSettings = await getProductionPaymentSettings();
    const gateway = paymentSettings.gateways.find((g) => g.id === provider);
    const manualMethod = paymentSettings.manualMethods.find((method) => method.id === provider && method.enabled);
    const allowed = librarySettings.payments.usePlatformDefaults
      || librarySettings.payments.allowedMethodIds.includes(provider)
      || librarySettings.payments.allowedMethodIds.length === 0;
    if (!allowed) {
      return problem(400, "LIBRARY_PAYMENT_DISABLED", `${provider} is not enabled for HouseLink Library checkout.`);
    }
    if (!gateway?.enabled && !manualMethod && !["bank_transfer", "cash", "zipit", "ecocash"].includes(provider)) {
      return problem(400, "GATEWAY_DISABLED", `${provider} is not enabled. Contact support.`);
    }
    const payment = await createPaymentInPostgres(userId, {
      provider,
      plan: "library_order",
      amount: quote.total,
      method: provider,
    });
    const completed = paymentSettings.sandboxMode && !manualMethod ? await completePaymentInPostgres(payment.id) : null;
    let order: Awaited<ReturnType<typeof createLibraryOrderFromCheckout>>;
    try {
      order = await createLibraryOrderFromCheckout({
        customerId: userId,
        paymentId: payment.id,
        items,
        couponCode: typeof body.couponCode === "string" ? body.couponCode : undefined,
        shipping,
        shippingMethod,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Payment was started, but the Library order could not be created.";
      const code = /shipping/i.test(message)
        ? "SHIPPING_REQUIRED"
        : /stock|copie/i.test(message)
          ? "OUT_OF_STOCK"
          : "LIBRARY_ORDER_FAILED";
      return problem(/shipping|stock|copie/i.test(message) ? 400 : 500, code, message);
    }
    const grant = completed ? await fulfillPaidLibraryOrdersForPayment(payment.id) : { orders: 0, downloads: 0 };
    const status = completed ? "success" : "pending";
    return withOptionalSessionCookie(
      {
        ...(completed ?? payment),
        description,
        order: order.order,
        quote,
        accessGranted: grant.downloads > 0,
        items: quote.items,
        continueEmail,
        needsPassword: Boolean(continueEmail),
        redirectUrl: `/library/checkout/confirmation?orderId=${encodeURIComponent(order.order.id)}&paymentId=${encodeURIComponent(payment.id)}&status=${status}`,
        bankDetails: manualMethod ? paymentSettings.bankDetails : undefined,
        manualMethod,
        libraryPaymentInstructions: librarySettings.payments.instructions,
      },
      newSession,
    );
  }

  try {
    const store = getStore();
    const payment = store.createPayment(userId, {
      provider,
      plan: "library_order",
      amount: quote.total,
      method: provider,
    });
    const order = await createLibraryOrderFromCheckout({
      customerId: userId,
      paymentId: payment.id,
      items,
      couponCode: typeof body.couponCode === "string" ? body.couponCode : undefined,
      shipping,
      shippingMethod,
    });
    return withOptionalSessionCookie(
      {
        ...payment,
        description,
        order: order.order,
        quote,
        accessGranted: false,
        items: quote.items,
        continueEmail,
        needsPassword: Boolean(continueEmail),
        redirectUrl: `/library/checkout/confirmation?orderId=${encodeURIComponent(order.order.id)}&paymentId=${encodeURIComponent(payment.id)}&status=pending`,
        libraryPaymentInstructions: librarySettings.payments.instructions,
      },
      newSession,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Library order could not be created.";
    return problem(500, "LIBRARY_ORDER_FAILED", message);
  }
}
