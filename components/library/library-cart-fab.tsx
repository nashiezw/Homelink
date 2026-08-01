"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";
import { libraryCartLineKey, repriceLibraryCartLine, useLibraryCart } from "@/lib/library/cart-client";
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
    <div className={cn("fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-[60] flex flex-col items-end gap-3 sm:right-5 lg:hidden", className)}>
      {open && (
        <div className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden border border-black/[0.08] bg-white shadow-[0_24px_60px_rgba(16,32,36,0.16)] dark:border-white/10 dark:bg-slate-950">
          <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3 dark:border-white/10">
            <div>
              <p className="text-sm font-semibold text-[#141414] dark:text-white">Bag</p>
              <p className="text-xs text-[#141414]/50 dark:text-white/50">
                {count} item{count === 1 ? "" : "s"} · {currency} {total.toFixed(2)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 text-[#141414]/50 transition hover:bg-black/[0.04] hover:text-[#141414] dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white"
              aria-label="Close bag"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto p-3">
            {cart.map((item) => (
              <div key={libraryCartLineKey(item)} className="border border-black/[0.06] p-3 dark:border-white/10">
                <p className="text-sm font-medium leading-5 text-[#141414] dark:text-white">{item.title}</p>
                {item.formatLabel && (
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#1a3560] dark:text-[#8de5d4]">
                    {item.formatLabel}
                  </p>
                )}
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-[#141414]/50 dark:text-white/50">
                  <div className="inline-flex items-center rounded border border-black/[0.08] dark:border-white/10">
                    <button
                      type="button"
                      className="grid size-7 place-items-center hover:text-[#22a54b]"
                      aria-label="Decrease quantity"
                      onClick={() =>
                        setCart((current) =>
                          current.map((line) =>
                            libraryCartLineKey(line) === libraryCartLineKey(item)
                              ? repriceLibraryCartLine(line, Math.max(1, line.quantity - 1))
                              : line,
                          ),
                        )
                      }
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="w-7 text-center text-[11px] font-black text-[#141414] dark:text-white">{item.quantity}</span>
                    <button
                      type="button"
                      className="grid size-7 place-items-center hover:text-[#22a54b]"
                      aria-label="Increase quantity"
                      onClick={() =>
                        setCart((current) =>
                          current.map((line) =>
                            libraryCartLineKey(line) === libraryCartLineKey(item)
                              ? repriceLibraryCartLine(line, line.quantity + 1)
                              : line,
                          ),
                        )
                      }
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>
                  <span className="font-semibold text-[#141414] dark:text-white">
                    {item.currency} {(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
                {item.listPrice != null && item.listPrice > item.price + 0.001 ? (
                  <p className="mt-1 text-[11px] font-semibold text-[#22a54b]">
                    {item.currency} {item.price.toFixed(2)} each
                  </p>
                ) : null}
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-red-600 hover:underline"
                  onClick={() => setCart((current) => current.filter((line) => libraryCartLineKey(line) !== libraryCartLineKey(item)))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="grid gap-2 border-t border-black/[0.06] p-3 dark:border-white/10">
            <Link
              href="/library/checkout"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 items-center justify-center bg-[#141414] text-sm font-semibold text-white transition hover:bg-[#1a3560]"
            >
              Checkout
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 items-center justify-center border border-black/[0.08] text-sm font-semibold text-[#141414] transition hover:border-[#1a3560] dark:border-white/10 dark:text-white"
            >
              Continue shopping
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "relative inline-flex h-12 w-12 items-center justify-center bg-[#141414] text-white shadow-[0_12px_30px_rgba(16,32,36,0.22)] transition hover:bg-[#1a3560]",
          pulse && "scale-105",
        )}
        aria-label={`Open Library Bag, ${count} items`}
      >
        <ShoppingBag className="size-5" />
        <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center bg-[#22a54b] px-1 text-[10px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      </button>
    </div>
  );
}
