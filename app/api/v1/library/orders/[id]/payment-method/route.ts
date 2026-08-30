import { PaymentProvider, PaymentStatus } from "@prisma/client";
import { ok, problem } from "@/lib/api/response";
import { getPostgresPublicUserById, shouldUsePostgresAuth } from "@/lib/auth/postgres-auth";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { isDatabaseUnavailableError } from "@/lib/db/production-schema";
import { getLibraryStoreSettings } from "@/lib/library/settings";
import { getProductionPaymentSettings, shouldUsePostgresPayments } from "@/lib/payments/postgres-payment-repository";
import { getStore } from "@/lib/store/app-store";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return problem(401, "UNAUTHORIZED", "Sign in to update this Library payment.");

  let body: { method?: unknown };
  try {
    body = await request.json();
  } catch {
    return problem(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const methodId = typeof body.method === "string" ? body.method.trim() : "";
  if (!methodId) return problem(400, "METHOD_REQUIRED", "Choose a payment method.");

  if (!shouldUsePostgresPayments() || !isPostgresStoreEnabled()) {
    return problem(501, "PAYMENT_METHOD_UPDATE_UNAVAILABLE", "Changing payment method is only available for production Library orders.");
  }

  const librarySettings = await getLibraryStoreSettings();
  const paymentSettings = await getProductionPaymentSettings().catch((error: unknown) => {
    if (isDatabaseUnavailableError(error)) return null;
    throw error;
  });
  if (!paymentSettings) {
    return problem(503, "PAYMENT_SETTINGS_UNAVAILABLE", "Payment settings are temporarily unavailable. Please try again.");
  }
  const manualMethod = paymentSettings.manualMethods.find((method) => method.id === methodId && method.enabled);
  const gateway = paymentSettings.gateways.find((method) => method.id === methodId && method.enabled);
  const allowed =
    librarySettings.payments.usePlatformDefaults ||
    librarySettings.payments.allowedMethodIds.length === 0 ||
    librarySettings.payments.allowedMethodIds.includes(methodId);

  if (!allowed || (!manualMethod && !gateway)) {
    return problem(400, "LIBRARY_PAYMENT_DISABLED", `${methodId} is not enabled for HouseLink Library checkout.`);
  }

  const { id } = await context.params;
  const user = shouldUsePostgresAuth() ? await getPostgresPublicUserById(userId) : getStore().getUserById(userId);
  const admin = user?.roles?.some((role) => ["ADMIN", "SUPER_ADMIN"].includes(String(role))) ?? false;
  const order = await getMainPrisma().libraryOrder.findUnique({
    where: { id },
    include: {
      payment: {
        select: {
          id: true,
          userId: true,
          status: true,
          provider: true,
          method: true,
          proofStatus: true,
          proofUrl: true,
          metadata: true,
        },
      },
    },
  });

  if (!order) return problem(404, "ORDER_NOT_FOUND", "Library order not found.");
  if (!admin && order.customerId !== userId) return problem(403, "ACCESS_DENIED", "You do not have access to this order.");
  if (!order.payment) return problem(400, "PAYMENT_NOT_FOUND", "This Library order does not have a payment to update.");
  if (order.payment.status === PaymentStatus.PAID || order.payment.status === PaymentStatus.REFUNDED) {
    return problem(409, "PAYMENT_LOCKED", "This payment is already completed and cannot be changed.");
  }
  if (order.payment.proofUrl && order.payment.proofStatus !== "REJECTED") {
    return problem(409, "PROOF_ALREADY_UPLOADED", "Proof has already been uploaded. Contact HouseLink before changing the payment method.");
  }

  const previousMethod = methodFromPayment(order.payment);
  const nextManual = Boolean(manualMethod) || ["bank_transfer", "cash", "zipit"].includes(methodId);
  const metadata = {
    ...((order.payment.metadata ?? {}) as Record<string, unknown>),
    previousPaymentMethod: previousMethod,
    paymentMethodChangedAt: new Date().toISOString(),
  };

  const payment = await getMainPrisma().payment.update({
    where: { id: order.payment.id },
    data: {
      provider: normalizeProvider(methodId),
      method: methodId,
      manual: nextManual,
      proofStatus: nextManual ? "REQUESTED" : "NONE",
      metadata,
    },
  });

  return ok({
    id: payment.id,
    method: payment.method,
    provider: payment.provider,
    manual: payment.manual,
    proofStatus: payment.proofStatus,
  });
}

function methodFromPayment(payment: { method: string | null; provider: PaymentProvider }) {
  return payment.method ?? payment.provider.toLowerCase();
}

function normalizeProvider(provider: string) {
  const normalized = provider.trim().toUpperCase();
  if (normalized === "ECOCASH") return PaymentProvider.ECOCASH;
  if (normalized === "STRIPE") return PaymentProvider.STRIPE;
  return PaymentProvider.PAYNOW;
}
