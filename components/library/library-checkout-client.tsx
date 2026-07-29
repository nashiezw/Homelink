"use client";

import Link from "next/link";
import { CreditCard, Gift, Lock, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import type { PublicPaymentConfig } from "@/lib/payments/public-payment-config";

type CartLine = { productId: string; title: string; price: number; currency: string; quantity: number };

export function LibraryCheckoutClient() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [couponCode, setCouponCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [config, setConfig] = useState<PublicPaymentConfig | null>(null);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  useEffect(() => {
    const raw = window.sessionStorage.getItem("houselink_library_cart");
    if (raw) {
      try {
        setCart(JSON.parse(raw) as CartLine[]);
      } catch {
        setCart([]);
      }
    }
    void apiFetch<PublicPaymentConfig>("/api/v1/payments/config").then((result) => {
      if (result.data) {
        setConfig(result.data);
        if (result.data.manualMethods[0]?.id) setPaymentMethod(result.data.manualMethods[0].id);
      }
    });
  }, []);

  async function checkout() {
    setBusy(true);
    const result = await apiFetch<{ redirectUrl?: string; order?: { id?: string; orderNumber?: string } }>("/api/v1/library/checkout", {
      method: "POST",
      body: JSON.stringify({ items: cart, provider: paymentMethod, couponCode }),
    });
    setBusy(false);
    if (result.data?.redirectUrl) {
      window.sessionStorage.removeItem("houselink_library_cart");
      window.location.href = result.data.redirectUrl;
    }
  }

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
              <div key={item.productId} className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-slate-500">Quantity {item.quantity}</p>
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
                <button type="button" className="rounded-lg border border-slate-200 px-3 dark:border-slate-700" aria-label="Apply coupon"><Gift className="size-4" /></button>
              </div>
            </label>
            <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>USD {total.toFixed(2)}</span>
              </div>
              <Button className="mt-4 w-full" disabled={!cart.length || busy} onClick={() => void checkout()}>
                <CreditCard className="size-4" /> {busy ? "Creating order..." : "Place order"}
              </Button>
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
