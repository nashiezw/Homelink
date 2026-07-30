"use client";

import Link from "next/link";
import { ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";
import { libraryCartLineKey, useLibraryCart } from "@/lib/library/cart-client";
import { cn } from "@/lib/utils";

export function LibraryCartFab({ className }: { className?: string }) {
  const { cart, count, total, currency, setCart } = useLibraryCart();
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    function onAdded() {
      setPulse(true);
      window.setTimeout(() => setPulse(false), 700);
    }
    window.addEventListener("houselink:library-cart-added", onAdded);
    return () => window.removeEventListener("houselink:library-cart-added", onAdded);
  }, []);

  if (!count) return null;

  return (
    <div className={cn("fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3", className)}>
      {open && (
        <div className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-hero dark:border-slate-700 dark:bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
            <div>
              <p className="text-sm font-semibold tracking-tight text-ink dark:text-white">Library Bag</p>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">{count} item{count === 1 ? "" : "s"} · {currency} {total.toFixed(2)}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900" aria-label="Close bag">
              <X className="size-4" />
            </button>
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto p-3">
            {cart.map((item) => (
              <div key={libraryCartLineKey(item)} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <p className="text-sm font-semibold leading-5">{item.title}</p>
                {item.formatLabel && <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{item.formatLabel}</p>}
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>Qty {item.quantity}</span>
                  <span className="font-bold text-ink dark:text-white">{item.currency} {(item.price * item.quantity).toFixed(2)}</span>
                </div>
                <button
                  type="button"
                  className="mt-2 text-xs font-bold text-red-600 hover:underline"
                  onClick={() => setCart((current) => current.filter((line) => libraryCartLineKey(line) !== libraryCartLineKey(item)))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="grid gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
            <Link href="/library/checkout" onClick={() => setOpen(false)} className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 text-sm font-semibold text-white hover:bg-emerald-600">
              Checkout
            </Link>
            <Link href="/library" onClick={() => setOpen(false)} className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:border-emerald-600 dark:border-slate-700 dark:text-slate-200">
              Continue shopping
            </Link>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-700 text-white shadow-xl transition hover:bg-emerald-600",
          pulse && "scale-110",
        )}
        aria-label={`Open Library Bag, ${count} items`}
      >
        <ShoppingBag className="size-5" />
        <span className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full bg-ink px-1.5 text-xs font-semibold tabular-nums text-white dark:bg-white dark:text-ink">
          {count > 99 ? "99+" : count}
        </span>
      </button>
    </div>
  );
}
