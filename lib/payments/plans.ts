import type { PaymentSettings } from "@/lib/settings/types";

export type PlanId =
  | "tenancy_payment"
  | "featured_listing"
  | "landlord_pro"
  | "agency"
  | "listing_fee"
  | "advertising"
  | "credits_pack";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  description: string;
  priceKey: keyof PaymentSettings["fees"] | "custom";
  fixedPrice?: number;
  durationDays: number;
  features: string[];
  grantsPremium?: boolean;
  grantsFeatured?: boolean;
  credits?: number;
};

export const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    id: "tenancy_payment",
    name: "Rent / Deposit",
    description: "First month rent or deposit via HouseLink — creates a verified tenancy record",
    priceKey: "custom",
    fixedPrice: 0,
    durationDays: 0,
    features: ["Verified tenancy record", "Mutual confirmation", "Receipt issued"],
  },
  {
    id: "featured_listing",
    name: "Featured Listing",
    description: "Boost a property for 7 days",
    priceKey: "featuredListingFee",
    durationDays: 7,
    features: ["Top search placement", "Featured badge", "7-day boost"],
    grantsFeatured: true,
  },
  {
    id: "landlord_pro",
    name: "Landlord Pro",
    description: "Analytics, priority support, more active listings",
    priceKey: "subscriptionFee",
    durationDays: 30,
    features: ["Landlord analytics", "Priority support", "Up to 10 listings"],
    grantsPremium: true,
  },
  {
    id: "agency",
    name: "Agency Plan",
    description: "Multi-agent tools and high-volume listing management",
    priceKey: "agencyFee",
    durationDays: 30,
    features: ["Agency dashboard", "Multi-agent", "Unlimited listings"],
    grantsPremium: true,
  },
  {
    id: "listing_fee",
    name: "Listing Fee",
    description: "Publish a new listing",
    priceKey: "listingFee",
    durationDays: 30,
    features: ["30-day listing"],
  },
  {
    id: "advertising",
    name: "Advertising",
    description: "Banner or promotional placement",
    priceKey: "advertisingFee",
    durationDays: 14,
    features: ["Homepage banner", "14-day placement"],
  },
  {
    id: "credits_pack",
    name: "Credits Pack",
    description: "Platform credits for boosts and ads",
    priceKey: "custom",
    fixedPrice: 20,
    durationDays: 0,
    features: ["100 platform credits"],
    credits: 100,
  },
];

export function getPlanPrice(planId: string, fees: PaymentSettings["fees"]): number {
  const plan = PLAN_DEFINITIONS.find((p) => p.id === planId);
  if (!plan) return fees.subscriptionFee;
  if (plan.priceKey === "custom" && plan.fixedPrice != null) return plan.fixedPrice;
  return fees[plan.priceKey as keyof PaymentSettings["fees"]] ?? fees.subscriptionFee;
}

export function getPlanDefinition(planId: string) {
  return PLAN_DEFINITIONS.find((p) => p.id === planId) ?? PLAN_DEFINITIONS[1];
}
