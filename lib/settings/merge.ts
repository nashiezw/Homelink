import type { PaymentSettings, PlatformSettings } from "@/lib/settings/types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function deepMerge<T extends Record<string, unknown>>(base: T, updates: Partial<T>): T {
  const result = { ...base };
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    const current = result[key as keyof T];
    if (isPlainObject(current) && isPlainObject(value)) {
      result[key as keyof T] = deepMerge(current as Record<string, unknown>, value as Record<string, unknown>) as T[keyof T];
    } else {
      result[key as keyof T] = value as T[keyof T];
    }
  }
  return result;
}

export function mergePlatformSettings(current: PlatformSettings, updates: Partial<PlatformSettings>): PlatformSettings {
  return deepMerge(current as unknown as Record<string, unknown>, updates as Record<string, unknown>) as unknown as PlatformSettings;
}

export function mergePaymentSettings(current: PaymentSettings, updates: Partial<PaymentSettings>): PaymentSettings {
  return deepMerge(current as unknown as Record<string, unknown>, updates as Record<string, unknown>) as unknown as PaymentSettings;
}
