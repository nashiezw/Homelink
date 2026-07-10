import { getPlanPrice } from "@/lib/payments/plans";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { created, ok, problem } from "@/lib/api/response";
import { requireStrictProductionConfig } from "@/lib/production/runtime";
import {
  completePaymentInPostgres,
  createPaymentInPostgres,
  getProductionPaymentSettings,
  listPaymentsFromPostgres,
  shouldUsePostgresPayments,
} from "@/lib/payments/postgres-payment-repository";
import { getStore } from "@/lib/store/app-store";

export async function POST(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to checkout.");

  const body = await request.json();
  if (!body.plan || !body.provider) {
    return problem(400, "INVALID_CHECKOUT", "plan and provider are required.");
  }

  if (shouldUsePostgresPayments()) {
    const settings = await getProductionPaymentSettings();
    const gateway = settings.gateways.find((g) => g.id === body.provider);
    const manualMethod = settings.manualMethods.find((method) => method.id === body.provider && method.enabled);
    if (!gateway?.enabled && !manualMethod) {
      return problem(400, "GATEWAY_DISABLED", `${body.provider} is not enabled. Contact support.`);
    }
    const amount = getPlanPrice(body.plan, settings.fees);
    const isManual = Boolean(manualMethod) || ["bank_transfer", "cash", "zipit"].includes(body.provider);
    if (requireStrictProductionConfig() && !isManual && (settings.sandboxMode || gateway?.sandbox)) {
      return problem(
        503,
        "PAYMENTS_NOT_LIVE",
        "Live gateway credentials must be configured before production checkout can accept online payments.",
      );
    }
    const payment = await createPaymentInPostgres(userId, {
      provider: body.provider,
      plan: body.plan,
      amount: body.plan === "tenancy_payment" ? Number(body.amount) || amount : amount,
      listingId: body.listingId,
      tenantUserId: body.tenantUserId,
      landlordUserId: body.landlordUserId,
      method: body.provider,
    });
    if (settings.sandboxMode && !isManual) {
      const completed = await completePaymentInPostgres(payment.id);
      return created({
        ...completed,
        redirectUrl: body.listingId
          ? `/payments?status=success&id=${payment.id}&listingId=${body.listingId}`
          : `/payments?status=success&id=${payment.id}`,
      });
    }
    if (isManual) {
      return created({
        ...payment,
        redirectUrl: `/payments?status=pending&id=${payment.id}${body.listingId ? `&listingId=${body.listingId}` : ""}`,
        message: "Upload proof of payment or pay using bank details provided.",
        bankDetails: settings.bankDetails,
        manualMethod,
      });
    }
    return created({
      ...payment,
      redirectUrl: gateway?.successUrl ?? `/payments?status=pending&id=${payment.id}${body.listingId ? `&listingId=${body.listingId}` : ""}`,
      message: "Redirecting to payment gateway...",
    });
  }

  const store = getStore();
  const settings = store.getPaymentSettings();
  const gateway = settings.gateways.find((g) => g.id === body.provider);
  const manualMethod = settings.manualMethods.find((method) => method.id === body.provider && method.enabled);

  if (!gateway?.enabled && !manualMethod) {
    return problem(400, "GATEWAY_DISABLED", `${body.provider} is not enabled. Contact support.`);
  }

  const amount = getPlanPrice(body.plan, settings.fees);
  const isManual = Boolean(manualMethod) || ["bank_transfer", "cash", "zipit"].includes(body.provider);

  if (requireStrictProductionConfig() && !isManual && (settings.sandboxMode || gateway?.sandbox)) {
    return problem(
      503,
      "PAYMENTS_NOT_LIVE",
      "Live gateway credentials must be configured before production checkout can accept online payments.",
    );
  }

  const payment = store.createPayment(userId, {
    provider: body.provider,
    plan: body.plan,
    amount: body.plan === "tenancy_payment" ? Number(body.amount) || amount : amount,
    listingId: body.listingId,
    tenantUserId: body.tenantUserId,
    landlordUserId: body.landlordUserId,
    method: body.provider,
  });

  if (isManual) {
    return created({
      ...payment,
      status: payment.status,
      redirectUrl: `/payments?status=pending&id=${payment.id}${body.listingId ? `&listingId=${body.listingId}` : ""}`,
      message: "Upload proof of payment or pay using bank details provided.",
      bankDetails: settings.bankDetails,
      manualMethod,
    });
  }

  if (settings.sandboxMode) {
    store.completePayment(payment.id);
    const completed = store.getPaymentById(payment.id);
    store.createNotification(userId, {
      channel: body.provider,
      subject: "Payment received",
      body: `Your ${body.plan.replace(/_/g, " ")} payment of $${amount} was processed successfully.`,
    });
    return created({
      ...completed,
      redirectUrl:
        body.plan === "tenancy_payment"
          ? `/dashboard/tenancies?checkout=success&payment=${payment.id}&listingId=${body.listingId ?? ""}`
          : body.listingId
            ? `/payments?status=success&id=${payment.id}&listingId=${body.listingId}`
            : `/payments?status=success&id=${payment.id}`,
    });
  }

  return created({
    ...payment,
    redirectUrl: gateway?.successUrl ?? `/payments?status=pending&id=${payment.id}${body.listingId ? `&listingId=${body.listingId}` : ""}`,
    message: "Redirecting to payment gateway...",
  });
}

export async function GET(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to view payments.");
  if (shouldUsePostgresPayments()) {
    return ok(await listPaymentsFromPostgres(userId));
  }
  return ok(getStore().getPayments(userId));
}
