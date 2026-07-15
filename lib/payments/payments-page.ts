import type { PlanDefinition } from "@/lib/payments/plans";
import { PLAN_DEFINITIONS } from "@/lib/payments/plans";
import type { PublicPaymentConfig } from "@/lib/payments/public-payment-config";
export { paymentStatusTone } from "@/lib/payments/status-display";

export type PaymentPlanGroupId = "listings" | "subscriptions" | "marketing";

export type PaymentPlanGroup = {
  id: PaymentPlanGroupId;
  label: string;
  description: string;
};

export const PAYMENT_PLAN_GROUPS: PaymentPlanGroup[] = [
  {
    id: "listings",
    label: "Listings",
    description: "Publish and boost property listings on HomeLink Zimbabwe.",
  },
  {
    id: "subscriptions",
    label: "Subscriptions",
    description: "Landlord Pro and agency tools for professional operators.",
  },
  {
    id: "marketing",
    label: "Marketing",
    description: "Advertising placements and platform credits.",
  },
];

const PLAN_GROUP_MAP: Record<string, PaymentPlanGroupId> = {
  featured_listing: "listings",
  listing_fee: "listings",
  landlord_pro: "subscriptions",
  agency: "subscriptions",
  advertising: "marketing",
  credits_pack: "marketing",
};

export type CheckoutPlan = {
  id: string;
  name: string;
  description: string;
  price: number;
  durationDays: number;
  features: string[];
  groupId: PaymentPlanGroupId;
};

export type PaymentConfigResponse = PublicPaymentConfig & {
  plans: CheckoutPlan[];
  gateways: Array<{ id: string; label: string; enabled: boolean; sandbox?: boolean }>;
  manualMethods: Array<{
    id: string;
    label: string;
    enabled: boolean;
    requiresProof: boolean;
    instructions: string;
    type?: string;
  }>;
  sandboxMode?: boolean;
  exchangeRateUsdToZwl?: number;
};

export type PaymentMethodOption = {
  id: string;
  label: string;
  kind: "manual" | "online";
  requiresProof: boolean;
};

export function buildCheckoutPlans(
  apiPlans: PaymentConfigResponse["plans"] | undefined,
): CheckoutPlan[] {
  const source = apiPlans?.length
    ? apiPlans
    : PLAN_DEFINITIONS.map((plan) => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: plan.fixedPrice ?? 0,
        durationDays: plan.durationDays,
        features: plan.features,
      }));

  return source
    .filter((plan) => plan.id !== "tenancy_payment")
    .map((plan) => ({
      ...plan,
      groupId: PLAN_GROUP_MAP[plan.id] ?? "listings",
    }));
}

export function getPlansForGroup(plans: CheckoutPlan[], groupId: PaymentPlanGroupId) {
  return plans.filter((plan) => plan.groupId === groupId);
}

export function findCheckoutPlan(plans: CheckoutPlan[], planId: string | null | undefined) {
  if (!planId) return null;
  return plans.find((plan) => plan.id === planId) ?? null;
}

export function resolvePaymentMethods(config: PaymentConfigResponse | null): PaymentMethodOption[] {
  if (!config) return [];

  const manualIds = new Set(config.manualMethods.map((method) => method.id));
  const manual = config.manualMethods.map((method) => ({
    id: method.id,
    label: method.label,
    kind: "manual" as const,
    requiresProof: "requiresProof" in method ? Boolean(method.requiresProof) : true,
  }));

  const online = config.gateways
    .filter((gateway) => gateway.enabled && !manualIds.has(gateway.id))
    .map((gateway) => ({
      id: gateway.id,
      label: gateway.label,
      kind: "online" as const,
      requiresProof: false,
    }));

  return [...manual, ...online];
}

export function formatPaymentAmount(currency: string, amount: number) {
  if (amount <= 0) return "Free";
  return `${currency} ${amount.toFixed(2)}`;
}

export function formatZwlEquivalent(amount: number, exchangeRateUsdToZwl?: number) {
  if (!exchangeRateUsdToZwl || amount <= 0) return null;
  const zwl = Math.round(amount * exchangeRateUsdToZwl);
  return `≈ ZWL ${zwl.toLocaleString("en-ZW")} at platform rate`;
}

export function planLabel(planId: string) {
  const plan = PLAN_DEFINITIONS.find((item) => item.id === planId);
  return plan?.name ?? planId.replace(/_/g, " ");
}

export function getPlanDefinition(planId: string): PlanDefinition | undefined {
  return PLAN_DEFINITIONS.find((plan) => plan.id === planId);
}
