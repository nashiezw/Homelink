"use client";

import { useEffect, useMemo, useState } from "react";

export type LibraryCartLine = {
  productId: string;
  title: string;
  price: number;
  currency: string;
  quantity: number;
  formatId?: string;
  formatType?: string;
  formatLabel?: string;
};

const CART_KEY = "houselink_library_cart";

export function readLibraryCart(): LibraryCartLine[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(CART_KEY) ?? window.sessionStorage.getItem(CART_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as LibraryCartLine[];
    return Array.isArray(parsed) ? parsed.filter((line) => line.productId && line.quantity > 0) : [];
  } catch {
    return [];
  }
}

export function writeLibraryCart(cart: LibraryCartLine[]) {
  if (typeof window === "undefined") return;
  const normalized = cart.filter((line) => line.productId && line.quantity > 0);
  const raw = JSON.stringify(normalized);
  window.localStorage.setItem(CART_KEY, raw);
  window.sessionStorage.setItem(CART_KEY, raw);
  window.dispatchEvent(new CustomEvent("houselink:library-cart", { detail: { count: normalized.reduce((sum, item) => sum + item.quantity, 0) } }));
}

export function notifyLibraryCartAdded(title?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("houselink:library-cart-added", { detail: { title } }));
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

export function clearLibraryCart() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CART_KEY);
  window.sessionStorage.removeItem(CART_KEY);
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
      return resolved;
    });
  }

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const currency = cart[0]?.currency ?? "USD";
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);

  return { cart, setCart, total, currency, count };
}
