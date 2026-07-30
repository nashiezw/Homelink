"use client";

import Link from "next/link";
import { CreditCard, Gift, Lock, MapPin, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { LibraryCartFab } from "@/components/library/library-cart-fab";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";
import { clearLibraryCart, libraryCartLineKey, sameLibraryCartLine, useLibraryCart } from "@/lib/library/cart-client";
import type { PublicPaymentConfig } from "@/lib/payments/public-payment-config";

type LibraryQuote = {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal?: number;
  total: number;
  currency: string;
  couponCode?: string;
  taxLabel?: string;
};

type LibraryPublicSettings = {
  checkout: {
    requireTerms: boolean;
    termsUrl: string;
    privacyUrl: string;
    allowCoupons: boolean;
    minimumOrderAmount: number;
  };
  tax: { displayTaxBreakdown: boolean; taxLabel: string; defaultCountry: string };
  delivery: {
    enablePrintedShipping: boolean;
    defaultCountry: string;
    flatRate: number;
    freeShippingMin: number | null;
    estimatedDaysMin: number;
    estimatedDaysMax: number;
  };
  store: { enabled: boolean; currency: string; name: string };
};

type ShippingForm = {
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  province: string;
  country: string;
  notes: string;
};

const emptyShipping: ShippingForm = {
  name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  province: "",
  country: "Zimbabwe",
  notes: "",
};

export function LibraryCheckoutClient() {
  const { showToast } = useApp();
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
  const [shipping, setShipping] = useState<ShippingForm>(emptyShipping);
  const [storeSettings, setStoreSettings] = useState<LibraryPublicSettings | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const needsShipping = useMemo(
    () => cart.some((item) => item.formatType === "PRINTED_BOOK" || /print/i.test(item.formatLabel ?? "") || /print/i.test(item.title)),
    [cart],
  );

  useEffect(() => {
    void apiFetch<PublicPaymentConfig>("/api/v1/payments/config").then((result) => {
      if (result.data) {
        setConfig(result.data);
        if (result.data.manualMethods[0]?.id) setPaymentMethod(result.data.manualMethods[0].id);
      }
    });
    void apiFetch<LibraryPublicSettings>("/api/v1/library/settings").then((result) => {
      if (result.data) {
        setStoreSettings(result.data);
        setShipping((current) => ({ ...current, country: result.data!.delivery.defaultCountry || current.country }));
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
  }, [cart, appliedCoupon, shipping.country, needsShipping]);

  async function refreshQuote(code?: string) {
    if (!cart.length) {
      setQuote(null);
      return null;
    }
    setQuoting(true);
    const result = await apiFetch<LibraryQuote>("/api/v1/library/quote", {
      method: "POST",
      body: JSON.stringify({
        items: cart,
        couponCode: storeSettings?.checkout.allowCoupons === false ? undefined : code || undefined,
        country: shipping.country || storeSettings?.tax.defaultCountry,
        includeShipping: needsShipping,
      }),
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

  function shippingPayload() {
    if (!needsShipping) return undefined;
    return {
      name: shipping.name.trim(),
      phone: shipping.phone.trim(),
      line1: shipping.line1.trim(),
      line2: shipping.line2.trim() || undefined,
      city: shipping.city.trim(),
      province: shipping.province.trim() || undefined,
      country: shipping.country.trim() || "Zimbabwe",
      notes: shipping.notes.trim() || undefined,
    };
  }

  function shippingReady() {
    if (!needsShipping) return true;
    return Boolean(shipping.name.trim() && shipping.phone.trim() && shipping.line1.trim() && shipping.city.trim());
  }

  async function checkout() {
    setBusy(true);
    setError("");
    if (storeSettings?.store.enabled === false) {
      setBusy(false);
      setError("Library checkout is temporarily disabled.");
      return;
    }
    if (storeSettings?.checkout.requireTerms && !termsAccepted) {
      setBusy(false);
      setError("Accept the Library terms to continue.");
      return;
    }
    if (!shippingReady()) {
      setBusy(false);
      setError("Enter delivery name, phone, address, and city for printed books.");
      return;
    }
    const result = await apiFetch<{ redirectUrl?: string; order?: { id?: string; orderNumber?: string } }>("/api/v1/library/checkout", {
      method: "POST",
      body: JSON.stringify({
        items: cart,
        provider: paymentMethod,
        couponCode: storeSettings?.checkout.allowCoupons === false ? undefined : appliedCoupon || couponCode,
        shipping: shippingPayload(),
        termsAccepted,
      }),
    });
    setBusy(false);
    if (result.data?.redirectUrl) {
      clearLibraryCart();
      showToast("Order created. Complete payment with the bank details on the next page.", "success");
      window.location.href = result.data.redirectUrl;
      return;
    }
    const message = result.error?.message ?? "We could not create your Library order. Please try again.";
    setError(message);
    showToast(message, "error");
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
      <LibraryCartFab />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
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

          {needsShipping && (
            <section className="surface-panel rounded-lg p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-ink dark:text-white">
                <MapPin className="size-5 text-emerald-600" /> Delivery address
              </h2>
              <p className="mt-1 text-sm text-slate-500">Required for printed books in this order.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium sm:col-span-1">
                  Full name
                  <input value={shipping.name} onChange={(e) => setShipping({ ...shipping, name: e.target.value })} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-900" required />
                </label>
                <label className="block text-sm font-medium">
                  Phone
                  <input value={shipping.phone} onChange={(e) => setShipping({ ...shipping, phone: e.target.value })} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-900" required />
                </label>
                <label className="block text-sm font-medium sm:col-span-2">
                  Street address
                  <input value={shipping.line1} onChange={(e) => setShipping({ ...shipping, line1: e.target.value })} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-900" required />
                </label>
                <label className="block text-sm font-medium sm:col-span-2">
                  Apartment / landmark (optional)
                  <input value={shipping.line2} onChange={(e) => setShipping({ ...shipping, line2: e.target.value })} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-900" />
                </label>
                <label className="block text-sm font-medium">
                  City
                  <input value={shipping.city} onChange={(e) => setShipping({ ...shipping, city: e.target.value })} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-900" required />
                </label>
                <label className="block text-sm font-medium">
                  Province
                  <input value={shipping.province} onChange={(e) => setShipping({ ...shipping, province: e.target.value })} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-900" />
                </label>
                <label className="block text-sm font-medium">
                  Country
                  <input value={shipping.country} onChange={(e) => setShipping({ ...shipping, country: e.target.value })} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-900" />
                </label>
                <label className="block text-sm font-medium sm:col-span-2">
                  Delivery notes (optional)
                  <textarea value={shipping.notes} onChange={(e) => setShipping({ ...shipping, notes: e.target.value })} rows={3} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900" />
                </label>
              </div>
            </section>
          )}
        </div>

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
            {storeSettings?.checkout.allowCoupons !== false && (
              <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Coupon or gift card
                <div className="mt-2 flex gap-2">
                  <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-900" placeholder="Code" />
                  <button type="button" onClick={() => void applyCoupon()} className="rounded-lg border border-slate-200 px-3 dark:border-slate-700" aria-label="Apply coupon"><Gift className="size-4" /></button>
                </div>
              </label>
            )}
            {couponMessage && <p className="mt-2 text-xs font-semibold text-slate-500">{couponMessage}</p>}
            <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-sm dark:border-slate-800">
              <div className="flex justify-between"><span>Subtotal</span><span>{quote?.currency ?? "USD"} {(quote?.subtotal ?? total).toFixed(2)}</span></div>
              {(quote?.discountTotal ?? 0) > 0 && <div className="flex justify-between text-emerald-700 dark:text-emerald-300"><span>Discount</span><span>−{(quote?.discountTotal ?? 0).toFixed(2)}</span></div>}
              {storeSettings?.tax.displayTaxBreakdown !== false && (quote?.taxTotal ?? 0) > 0 && (
                <div className="flex justify-between"><span>{quote?.taxLabel || storeSettings?.tax.taxLabel || "Tax"}</span><span>{(quote?.taxTotal ?? 0).toFixed(2)}</span></div>
              )}
              {(quote?.shippingTotal ?? 0) > 0 && <div className="flex justify-between"><span>Shipping</span><span>{(quote?.shippingTotal ?? 0).toFixed(2)}</span></div>}
              {needsShipping && storeSettings?.delivery && (
                <p className="text-xs text-slate-500">
                  Printed delivery estimate: {storeSettings.delivery.estimatedDaysMin}–{storeSettings.delivery.estimatedDaysMax} days
                  {storeSettings.delivery.freeShippingMin != null ? ` · free from ${quote?.currency ?? "USD"} ${storeSettings.delivery.freeShippingMin.toFixed(2)}` : ""}.
                </p>
              )}
              {storeSettings?.checkout.requireTerms && (
                <label className="flex items-start gap-2 pt-2 text-xs text-slate-600 dark:text-slate-300">
                  <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-0.5" />
                  <span>
                    I agree to the{" "}
                    <Link href={storeSettings.checkout.termsUrl || "/legal/terms"} className="font-semibold text-emerald-700 underline dark:text-emerald-300">Library terms</Link>
                    {" "}and{" "}
                    <Link href={storeSettings.checkout.privacyUrl || "/legal/privacy"} className="font-semibold text-emerald-700 underline dark:text-emerald-300">privacy policy</Link>.
                  </span>
                </label>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{quote?.currency ?? "USD"} {payable.toFixed(2)}{quoting ? "…" : ""}</span>
              </div>
              <Button className="mt-4 w-full" disabled={!cart.length || busy || !shippingReady() || Boolean(storeSettings?.checkout.requireTerms && !termsAccepted) || storeSettings?.store.enabled === false} onClick={() => void checkout()}>
                <CreditCard className="size-4" /> {busy ? "Creating order..." : "Place order"}
              </Button>
              {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">{error}</p>}
            </div>
          </section>
          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-100">
            <p className="flex gap-2 font-semibold"><Lock className="size-4" /> Secure checkout</p>
            <p className="mt-2 leading-6">Orders, payments, invoices, and downloads are tied to your existing HouseLink account. Coupons are applied at checkout and counted when payment is confirmed.</p>
          </section>
        </aside>
      </div>
    </PageShell>
  );
}
