import type { ManualPaymentMethodConfig, PaymentSettings } from "@/lib/settings/types";

export type PublicPaymentConfig = {
  currency: string;
  bankDetails: PaymentSettings["bankDetails"];
  manualMethods: Array<Pick<
    ManualPaymentMethodConfig,
    "id" | "label" | "type" | "instructions" | "accountName" | "accountNumber" | "bankName" | "branch" | "phoneNumber"
  >>;
};

export function resolveManualMethod(config: PublicPaymentConfig | null | undefined, methodId: string) {
  if (!config || !methodId) return null;
  return config.manualMethods.find((method) => method.id === methodId) ?? null;
}

export function formatBankDetailLabel(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}
