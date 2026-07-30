import { getSessionUserIdFromRequest } from "@/lib/auth/session";
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

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to checkout.");

  const body = await request.json();
  const items = Array.isArray(body.items) ? (body.items as CheckoutLine[]) : [];
  if (!items.length) return problem(400, "EMPTY_CART", "Add at least one Library product to checkout.");

  const settings = await getLibraryStoreSettings();
  if (!settings.store.enabled) {
    return problem(503, "LIBRARY_DISABLED", "HouseLink Library checkout is temporarily disabled.");
  }
  if (settings.checkout.requireTerms && !body.termsAccepted) {
    return problem(400, "TERMS_REQUIRED", "Accept the Library terms to continue checkout.");
  }
  if (body.couponCode && !settings.checkout.allowCoupons) {
    return problem(400, "COUPONS_DISABLED", "Coupons are currently disabled for Library checkout.");
  }
  const shipping = (body.shipping ?? null) as LibraryShippingAddress | null;
  const quote = await quoteLibraryCart(items, body.couponCode, userId, {
    country: shipping?.country,
    includeShipping: true,
  });
  if (quote.subtotal < settings.checkout.minimumOrderAmount) {
    return problem(400, "MINIMUM_ORDER", `Minimum order amount is ${quote.currency} ${settings.checkout.minimumOrderAmount.toFixed(2)}.`);
  }
  if (quote.total <= 0) return problem(400, "INVALID_TOTAL", "Library cart total must be greater than zero.");

  const provider = String(body.provider || "bank_transfer");
  const description = items.length === 1 ? items[0]?.title ?? "HouseLink Library product" : `${items.length} HouseLink Library products`;

  if (shouldUsePostgresPayments()) {
    const settings = await getProductionPaymentSettings();
    const gateway = settings.gateways.find((g) => g.id === provider);
    const manualMethod = settings.manualMethods.find((method) => method.id === provider && method.enabled);
    if (!gateway?.enabled && !manualMethod && !["bank_transfer", "cash", "zipit"].includes(provider)) {
      return problem(400, "GATEWAY_DISABLED", `${provider} is not enabled. Contact support.`);
    }
    const payment = await createPaymentInPostgres(userId, {
      provider,
      plan: "library_order",
      amount: quote.total,
      method: provider,
    });
    const completed = settings.sandboxMode && !manualMethod ? await completePaymentInPostgres(payment.id) : null;
    let order: Awaited<ReturnType<typeof createLibraryOrderFromCheckout>>;
    try {
      order = await createLibraryOrderFromCheckout({
        customerId: userId,
        paymentId: payment.id,
        items,
        couponCode: body.couponCode,
        shipping,
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
    return created({
      ...(completed ?? payment),
      description,
      order: order.order,
      quote,
      accessGranted: grant.downloads > 0,
      items: quote.items,
      redirectUrl: `/library/checkout/confirmation?orderId=${encodeURIComponent(order.order.id)}&paymentId=${encodeURIComponent(payment.id)}&status=${status}`,
      bankDetails: manualMethod ? settings.bankDetails : undefined,
      manualMethod,
    });
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
      couponCode: body.couponCode,
      shipping,
    });
    const status = payment.status === "PAID" ? "success" : "pending";
    return created({
      ...payment,
      description,
      order: order.order,
      quote,
      items: quote.items,
      redirectUrl: `/library/checkout/confirmation?orderId=${encodeURIComponent(order.order.id)}&paymentId=${encodeURIComponent(payment.id)}&status=${status}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "We could not create your Library order.";
    return problem(400, "LIBRARY_ORDER_FAILED", message);
  }
}
