"use client";

import { getOrCreateSessionId } from "@/lib/analytics/visitor-client";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

export const META_CHECKOUT_EVENT_KEY = "houselink_meta_initiate_checkout";

type MetaCheckoutEvent = {
  eventId: string;
  value: number;
  currency: string;
  productId?: string;
  formatId?: string;
  createdAt: number;
};

export function normalizeMetaCurrency(value: unknown) {
  const currency = String(value || "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : "USD";
}

export function normalizeMetaValue(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : null;
}

export function createMetaEventId(prefix: string, productId?: string) {
  const safePrefix = prefix.replace(/[^a-z0-9_-]/gi, "").slice(0, 48) || "event";
  const safeProductId = String(productId || "cart").replace(/[^a-z0-9_-]/gi, "").slice(0, 80);
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${safePrefix}-${safeProductId}-${getOrCreateSessionId()}-${random}`;
}

export function trackMetaInitiateCheckout(input: {
  value: number;
  currency: string;
  productId?: string;
  productTitle?: string;
  formatId?: string;
  formatLabel?: string;
  quantity?: number;
  eventId?: string;
}) {
  if (typeof window === "undefined") return null;
  const value = normalizeMetaValue(input.value);
  if (value == null) return null;
  const currency = normalizeMetaCurrency(input.currency);
  const eventId = input.eventId || createMetaEventId("InitiateCheckout", input.productId);
  const payload = {
    value,
    currency,
    content_ids: input.productId ? [input.productId] : undefined,
    content_name: input.productTitle,
    content_type: "product",
    contents: input.productId
      ? [
          {
            id: input.productId,
            quantity: input.quantity ?? 1,
            item_price: value,
          },
        ]
      : undefined,
  };

  window.fbq?.("track", "InitiateCheckout", payload, { eventID: eventId });
  window.gtag?.("event", "begin_checkout", {
    currency,
    value,
    items: input.productId
      ? [{ item_id: input.productId, item_name: input.productTitle, item_variant: input.formatId || input.formatLabel }]
      : undefined,
  });

  const record: MetaCheckoutEvent = {
    eventId,
    value,
    currency,
    productId: input.productId,
    formatId: input.formatId,
    createdAt: Date.now(),
  };
  window.sessionStorage.setItem(META_CHECKOUT_EVENT_KEY, JSON.stringify(record));
  return record;
}

export function readStoredMetaInitiateCheckout(): MetaCheckoutEvent | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(META_CHECKOUT_EVENT_KEY) || "{}") as Partial<MetaCheckoutEvent>;
    if (typeof parsed.eventId !== "string" || !parsed.eventId.trim()) return undefined;
    if (Date.now() - Number(parsed.createdAt || 0) > 30 * 60 * 1000) return undefined;
    return {
      eventId: parsed.eventId,
      value: normalizeMetaValue(parsed.value) ?? 0,
      currency: normalizeMetaCurrency(parsed.currency),
      productId: typeof parsed.productId === "string" ? parsed.productId : undefined,
      formatId: typeof parsed.formatId === "string" ? parsed.formatId : undefined,
      createdAt: Number(parsed.createdAt) || Date.now(),
    };
  } catch {
    return undefined;
  }
}
