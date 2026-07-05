import { getStore } from "@/lib/store/app-store";
import { ok, problem } from "@/lib/api/response";
import { requireStrictProductionConfig } from "@/lib/production/runtime";
import { completePaymentInPostgres, getProductionPaymentSettings, shouldUsePostgresPayments } from "@/lib/payments/postgres-payment-repository";
import { verifyPaymentWebhook } from "@/lib/payments/webhook-verification";
import type { GatewayId } from "@/lib/settings/types";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ gateway: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { gateway } = await context.params;
  if (shouldUsePostgresPayments()) {
    const settings = getProductionPaymentSettings();
    const gw = settings.gateways.find((g) => g.id === gateway);
    if (!gw?.enabled) {
      return ok({ received: false, reason: "gateway_disabled" });
    }
    const requireSignature = requireStrictProductionConfig() || settings.liveMode || !gw.sandbox;
    const verified = await verifyPaymentWebhook(request, gw, requireSignature);
    if (!verified.ok) {
      return problem(401, "INVALID_WEBHOOK_SIGNATURE", "Payment webhook signature could not be verified.");
    }
    const paymentId =
      (verified.body as { paymentId?: string; reference?: string }).paymentId ??
      (verified.body as { reference?: string }).reference;
    if (paymentId && (verified.body as { status?: string }).status === "paid") {
      await completePaymentInPostgres(paymentId);
    }
    return ok({ received: true });
  }
  const store = getStore();

  const settings = store.getPaymentSettings();
  const gw = settings.gateways.find((g) => g.id === gateway);
  if (!gw?.enabled) {
    store.logWebhook(gateway as GatewayId, "webhook.disabled", {}, "FAILED");
    return ok({ received: false, reason: "gateway_disabled" });
  }

  const requireSignature = requireStrictProductionConfig() || settings.liveMode || !gw.sandbox;
  const verified = await verifyPaymentWebhook(request, gw, requireSignature);

  if (!verified.ok) {
    store.logWebhook(gateway as GatewayId, `webhook.${verified.reason}`, verified.body, "FAILED");
    return problem(401, "INVALID_WEBHOOK_SIGNATURE", "Payment webhook signature could not be verified.");
  }

  store.logWebhook(gateway as GatewayId, verified.eventName, verified.body, "SUCCESS");

  const paymentId =
    (verified.body as { paymentId?: string; reference?: string }).paymentId ??
    (verified.body as { reference?: string }).reference;
  if (paymentId) {
    const payment = store.getPaymentById(paymentId);
    if (payment && (verified.body as { status?: string }).status === "paid") {
      store.completePayment(paymentId);
    }
  }

  return ok({ received: true });
}
