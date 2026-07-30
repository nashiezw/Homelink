"use client";

import Link from "next/link";
import { CreditCard, Gift, Lock, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { clearLibraryCart, libraryCartLineKey, sameLibraryCartLine, useLibraryCart } from "@/lib/library/cart-client";
import type { PublicPaymentConfig } from "@/lib/payments/public-payment-config";

type LibraryQuote = {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  currency: string;
  couponCode?: string;
};

export function LibraryCheckoutClient() {
  const { cart, setCart, total } = useLibraryCart();
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [quote, setQuote] = useState<LibraryQuote | null>(null);
  const [busy, setBusy] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [config, setConfig] = useState<PublicPaymentConfig | null>(null);
  const [error, setError] = useState("");
  const [couponMessage, setCouponMessage] = useState("");

  useEffect(() => {
    void apiFetch<PublicPaymentConfig>("/api/v1/payments/config").then((result) => {
      if (result.data) {
        setConfig(result.data);
        if (result.data.manualMethods[0]?.id) setPaymentMethod(result.data.manualMethods[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!cart.length) {
      setQuote(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void refreshQuote(appliedCoupon);
    }, 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, appliedCoupon]);

  async function refreshQuote(code?: string) {
    if (!cart.length) {
      setQuote(null);
      return null;
    }
    setQuoting(true);
    const result = await apiFetch<LibraryQuote>("/api/v1/library/quote", {
      method: "POST",
      body: JSON.stringify({ items: cart, couponCode: code || undefined }),
    });
    setQuoting(false);
    if (result.error || !result.data) {
      setQuote(null);
      return null;
    }
    setQuote(result.data);
    return result.data;
  }

  async function applyCoupon() {
    setError("");
    setCouponMessage("");
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setAppliedCoupon("");
      setCouponMessage("Coupon cleared.");
      return;
    }
    const next = await refreshQuote(code);
    if (!next) {
      setCouponMessage("Could not validate coupon right now.");
      return;
    }
    if (next.discountTotal <= 0) {
      setAppliedCoupon("");
      setCouponMessage("That coupon is invalid or does not apply to this cart.");
      return;
    }
    setAppliedCoupon(code);
    setCouponCode(code);
    setCouponMessage(`Coupon ${code} applied (−${next.currency} ${next.discountTotal.toFixed(2)}).`);
  }

  async function checkout() {
    setBusy(true);
    setError("");
    const result = await apiFetch<{ redirectUrl?: string; order?: { id?: string; orderNumber?: string } }>("/api/v1/library/checkout", {
      method: "POST",
      body: JSON.stringify({ items: cart, provider: paymentMethod, couponCode: appliedCoupon || couponCode }),
    });
    setBusy(false);
    if (result.data?.redirectUrl) {
      clearLibraryCart();
      window.location.href = result.data.redirectUrl;
      return;
    }
    setError(result.error?.message ?? "We could not create your Library order. Please try again.");
  }

  function remove(productId: string, formatId?: string) {
    setCart((current) => current.filter((item) => !sameLibraryCartLine(item, { productId, formatId })));
  }

  function quantity(productId: string, value: number, formatId?: string) {
    setCart((current) => current.map((item) => (sameLibraryCartLine(item, { productId, formatId }) ? { ...item, quantity: Math.max(1, value) } : item)));
  }

  const payable = useMemo(() => quote?.total ?? total, [quote, total]);

  return (
    <PageShell
      eyebrow="Library checkout"
      title="Review your order and choose payment"
      description="One-page checkout for HouseLink Library digital products, printed books, toolkits, forms, and future courses."
      compactHero
      actions={<Link href="/library" className="border border-white/20 bg-white/10 text-white hover:bg-white/15">Continue shopping</Link>}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="surface-panel rounded-lg p-5">
          <h2 className="text-lg font-semibold text-ink dark:text-white">Order summary</h2>
          <div className="mt-4 space-y-3">
            {cart.length ? cart.map((item) => (
              <div key={libraryCartLineKey(item)} className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <div>
                  <p className="font-semibold">{item.title}</p>
                  {item.formatLabel && <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{item.formatLabel}</p>}
                  <div className="mt-3 inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={() => quantity(item.productId, item.quantity - 1, item.formatId)} className="grid size-8 place-items-center text-slate-500 hover:text-emerald-700" aria-label="Decrease quantity"><Minus className="size-3.5" /></button>
                    <span className="w-8 text-center text-xs font-black">{item.quantity}</span>
                    <button type="button" onClick={() => quantity(item.productId, item.quantity + 1, item.formatId)} className="grid size-8 place-items-center text-slate-500 hover:text-emerald-700" aria-label="Increase quantity"><Plus className="size-3.5" /></button>
                  </div>
                  <button type="button" onClick={() => remove(item.productId, item.formatId)} className="ml-3 inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-red-600">
                    <Trash2 className="size-3.5" /> Remove
                  </button>
                </div>
                <p className="font-bold">{item.currency} {(item.price * item.quantity).toFixed(2)}</p>
              </div>
            )) : (
              <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                <ShoppingCart className="mx-auto mb-3 size-8 text-slate-400" />
                <p className="font-semibold">Your Library cart is empty</p>
                <Link href="/library" className="mt-3 inline-flex text-sm font-semibold text-emerald-700 dark:text-emerald-300">Browse products</Link>
              </div>
            )}
          </div>
        </section>

        <aside className="h-fit space-y-4 lg:sticky lg:top-24">
          <section className="surface-panel rounded-lg p-5">
            <h2 className="text-lg font-semibold text-ink dark:text-white">Payment</h2>
            <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Payment method
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">
                {(config?.manualMethods.length ? config.manualMethods : [
                  { id: "bank_transfer", label: "Bank Transfer", enabled: true, instructions: "", requiresProof: true },
                  { id: "zipit", label: "ZIPIT", enabled: true, instructions: "", requiresProof: true },
                ]).map((method) => <option key={method.id} value={method.id}>{method.label}</option>)}
              </select>
            </label>
            <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Coupon or gift card
              <div className="mt-2 flex gap-2">
                <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-900" placeholder="Code" />
                <button type="button" onClick={() => void applyCoupon()} className="rounded-lg border border-slate-200 px-3 dark:border-slate-700" aria-label="Apply coupon"><Gift className="size-4" /></button>
              </div>
            </label>
            {couponMessage && <p className="mt-2 text-xs font-semibold text-slate-500">{couponMessage}</p>}
            <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-sm dark:border-slate-800">
              <div className="flex justify-between"><span>Subtotal</span><span>{quote?.currency ?? "USD"} {(quote?.subtotal ?? total).toFixed(2)}</span></div>
              {(quote?.discountTotal ?? 0) > 0 && <div className="flex justify-between text-emerald-700 dark:text-emerald-300"><span>Discount</span><span>−{(quote?.discountTotal ?? 0).toFixed(2)}</span></div>}
              {(quote?.taxTotal ?? 0) > 0 && <div className="flex justify-between"><span>Tax</span><span>{(quote?.taxTotal ?? 0).toFixed(2)}</span></div>}
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{quote?.currency ?? "USD"} {payable.toFixed(2)}{quoting ? "…" : ""}</span>
              </div>
              <Button className="mt-4 w-full" disabled={!cart.length || busy} onClick={() => void checkout()}>
                <CreditCard className="size-4" /> {busy ? "Creating order..." : "Place order"}
              </Button>
              {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">{error}</p>}
            </div>
          </section>
          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-100">
            <p className="flex gap-2 font-semibold"><Lock className="size-4" /> Secure checkout</p>
            <p className="mt-2 leading-6">Orders, payments, invoices, and downloads are tied to your existing HouseLink account.</p>
          </section>
        </aside>
      </div>
    </PageShell>
  );
}
