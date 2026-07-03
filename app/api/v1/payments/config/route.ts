import { getPlanPrice, PLAN_DEFINITIONS } from "@/lib/payments/plans";
import { ok } from "@/lib/api/response";
import { getStore } from "@/lib/store/app-store";

export function GET() {
  const store = getStore();
  const settings = store.getPaymentSettings();
  return ok({
    plans: PLAN_DEFINITIONS.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: getPlanPrice(p.id, settings.fees),
      durationDays: p.durationDays,
      features: p.features,
    })),
    gateways: settings.gateways.map((g) => ({ id: g.id, label: g.label, enabled: g.enabled, sandbox: g.sandbox })),
    manualMethods: settings.manualMethods.filter((method) => method.enabled),
    currency: settings.currency,
    bankDetails: settings.bankDetails,
    sandboxMode: settings.sandboxMode,
  });
}
