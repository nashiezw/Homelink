"use client";

import { useEffect, useMemo, useState } from "react";
import {
  resolveLibraryVolumeUnitPrice,
  type LibraryVolumeTier,
} from "@/lib/library/catalog";
import { getOrCreateSessionId, getOrCreateVisitorId } from "@/lib/analytics/visitor-client";

export type LibraryCartLine = {
  productId: string;
  title: string;
  price: number;
  currency: string;
  quantity: number;
  formatId?: string;
  formatType?: string;
  formatLabel?: string;
  /** Base format list price before volume tiers. */
  listPrice?: number;
  /** Printed volume tiers copied from the product at add-to-bag time. */
  volumeTiers?: LibraryVolumeTier[];
};

const CART_KEY = "houselink_library_cart";
const CHECKOUT_CONTACT_KEY = "houselink_library_checkout_contact";

export function rememberLibraryCheckoutContact(input: { email?: string; phone?: string }) {
  if (typeof window === "undefined") return;
  const current = readLibraryCheckoutContact();
  const next = {
    email: input.email?.trim().toLowerCase() || current.email,
    phone: input.phone?.trim() || current.phone,
  };
  if (!next.email && !next.phone) return;
  const raw = JSON.stringify(next);
  window.sessionStorage.setItem(CHECKOUT_CONTACT_KEY, raw);
  window.dispatchEvent(new CustomEvent("houselink:library-cart", { detail: { contactUpdated: true } }));
}

function readLibraryCheckoutContact() {
  if (typeof window === "undefined") return { email: "", phone: "" };
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(CHECKOUT_CONTACT_KEY) || "{}") as { email?: string; phone?: string };
    return {
      email: typeof parsed.email === "string" ? parsed.email.trim().toLowerCase() : "",
      phone: typeof parsed.phone === "string" ? parsed.phone.trim() : "",
    };
  } catch {
    return { email: "", phone: "" };
  }
}

export function readLibraryCart(): LibraryCartLine[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(CART_KEY) ?? window.sessionStorage.getItem(CART_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as LibraryCartLine[];
    return Array.isArray(parsed)
      ? parsed
          .filter((line) => line.productId && line.quantity > 0)
          .map((line) => repriceLibraryCartLine(line, line.quantity))
      : [];
  } catch {
    return [];
  }
}

export function writeLibraryCart(cart: LibraryCartLine[]) {
  if (typeof window === "undefined") return;
  const normalized = cart
    .filter((line) => line.productId && line.quantity > 0)
    .map((line) => repriceLibraryCartLine(line, line.quantity));
  const raw = JSON.stringify(normalized);
  window.localStorage.setItem(CART_KEY, raw);
  window.sessionStorage.setItem(CART_KEY, raw);
  window.dispatchEvent(new CustomEvent("houselink:library-cart", { detail: { count: normalized.reduce((sum, item) => sum + item.quantity, 0) } }));
}

export function notifyLibraryCartAdded(title?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("houselink:library-cart-added", { detail: { title } }));
}

type CartTrackAction =
  | "CART_ADD_SINGLE"
  | "CART_ADD_BUNDLE"
  | "CART_REMOVE"
  | "CART_QTY_CHANGE"
  | "CART_CLEAR";

function emitLibraryCartAnalytics(
  event:
    | "library_cart_added"
    | "library_cart_removed"
    | "library_cart_qty_changed"
    | "library_cart_cleared"
    | "library_bundle_added",
  productId: string,
  metadata?: Record<string, unknown>,
) {
  void import("@/lib/analytics/client").then(({ trackEvent }) => {
    const meta = Object.fromEntries(
      Object.entries(metadata ?? {}).filter(([, value]) =>
        ["string", "number", "boolean"].includes(typeof value),
      ),
    ) as Record<string, string | number | boolean | undefined>;
    trackEvent(event, productId || "cart", meta);
  });
}

export function trackLibraryCartEvent(
  action: CartTrackAction,
  productId: string,
  metadata?: Record<string, unknown>,
) {
  if (typeof window === "undefined") return;
  if (action !== "CART_CLEAR" && !productId) return;
  const analyticsMetadata = {
    ...metadata,
    visitorId: getOrCreateVisitorId(),
    sessionId: getOrCreateSessionId(),
  };
  void fetch("/api/v1/library/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, productId, metadata: analyticsMetadata }),
    keepalive: true,
  }).catch(() => undefined);

  if (action === "CART_REMOVE") {
    emitLibraryCartAnalytics("library_cart_removed", productId, { action, ...metadata });
    return;
  }
  if (action === "CART_QTY_CHANGE") {
    emitLibraryCartAnalytics("library_cart_qty_changed", productId, { action, ...metadata });
    return;
  }
  if (action === "CART_CLEAR") {
    emitLibraryCartAnalytics("library_cart_cleared", productId || "cart", { action, ...metadata });
    return;
  }
  if (action === "CART_ADD_BUNDLE") {
    emitLibraryCartAnalytics("library_bundle_added", productId, { action, ...metadata });
    emitLibraryCartAnalytics("library_cart_added", productId, { action, ...metadata });
    return;
  }
  emitLibraryCartAnalytics("library_cart_added", productId, { action, ...metadata });
}

export function sameLibraryCartLine(
  a: Pick<LibraryCartLine, "productId" | "formatId">,
  b: Pick<LibraryCartLine, "productId" | "formatId">,
) {
  return a.productId === b.productId && (a.formatId ?? undefined) === (b.formatId ?? undefined);
}

export function libraryCartLineKey(line: Pick<LibraryCartLine, "productId" | "formatId">) {
  return `${line.productId}:${line.formatId ?? "default"}`;
}

export function repriceLibraryCartLine(line: LibraryCartLine, quantity: number): LibraryCartLine {
  const qty = Math.max(1, Math.floor(Number(quantity) || 1));
  const listPrice = Number.isFinite(Number(line.listPrice)) ? Number(line.listPrice) : line.price;
  const formatType = line.formatType === "PRINTED_BOOK" || line.formatType === "DIGITAL_BOOK" || line.formatType === "PDF"
    ? line.formatType
    : "PDF";
  const volumePrice = resolveLibraryVolumeUnitPrice(
    {
      price: listPrice,
      type: formatType,
      volumeTiers: line.volumeTiers,
    },
    qty,
  );
  // Keep FBT/bundle promo unit prices at qty 1; volume tiers take over from qty breaks (2+).
  const unitPrice =
    qty === 1 && Number.isFinite(Number(line.price)) && Number(line.price) > 0 && Number(line.price) < listPrice - 0.001
      ? Number(line.price)
      : volumePrice;
  return {
    ...line,
    quantity: qty,
    listPrice,
    price: unitPrice,
    volumeTiers: formatType === "PRINTED_BOOK" && line.volumeTiers?.length ? line.volumeTiers : undefined,
  };
}

export function clearLibraryCart(options?: { track?: boolean }) {
  if (typeof window === "undefined") return;
  if (options?.track !== false) {
    const cart = readLibraryCart();
    trackLibraryCartEvent("CART_CLEAR", "cart", {
      itemCount: cart.reduce((sum, line) => sum + line.quantity, 0),
      value: cart.reduce((sum, line) => sum + line.price * line.quantity, 0),
    });
  }
  window.localStorage.removeItem(CART_KEY);
  window.sessionStorage.removeItem(CART_KEY);
  window.sessionStorage.removeItem(CHECKOUT_CONTACT_KEY);
  window.dispatchEvent(new CustomEvent("houselink:library-cart", { detail: { count: 0 } }));
}

export function libraryCartSnapshot() {
  const cart = readLibraryCart();
  const contact = readLibraryCheckoutContact();
  const cartItemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const cartValue = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
  return {
    cartItemCount,
    cartValue,
    cartCurrency: cart[0]?.currency || "USD",
    cartSummary: cart.slice(0, 12).map((line) => ({
      productId: line.productId,
      title: line.title,
      quantity: line.quantity,
      price: line.price,
      formatLabel: line.formatLabel,
    })),
    contactEmail: contact.email || undefined,
    contactPhone: contact.phone || undefined,
  };
}

export function useLibraryCart() {
  const [cart, setCartState] = useState<LibraryCartLine[]>([]);

  useEffect(() => {
    setCartState(readLibraryCart());
    const sync = () => setCartState(readLibraryCart());
    window.addEventListener("storage", sync);
    window.addEventListener("houselink:library-cart", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("houselink:library-cart", sync);
    };
  }, []);

  function setCart(next: LibraryCartLine[] | ((current: LibraryCartLine[]) => LibraryCartLine[])) {
    setCartState((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      writeLibraryCart(resolved);
      return resolved.map((line) => repriceLibraryCartLine(line, line.quantity));
    });
  }

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const currency = cart[0]?.currency ?? "USD";
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);

  return { cart, setCart, total, currency, count };
}
