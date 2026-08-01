"use client";

import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { libraryCartLineKey, repriceLibraryCartLine, useLibraryCart } from "@/lib/library/cart-client";
import { cn } from "@/lib/utils";

/** Shared mini bag panel for mobile FAB and desktop header. */
export function LibraryBagDrawer({
  onClose,
  className,
}: {
  onClose: () => void;
  className?: string;
}) {
  const { cart, count, total, currency, setCart } = useLibraryCart();

  return (
    <div
      className={cn(
        "w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-[0_24px_60px_rgba(6,78,59,0.18)] dark:border-emerald-400/15 dark:bg-slate-950",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-emerald-900/10 px-4 py-3 dark:border-emerald-400/10">
        <div>
          <p className="text-sm font-semibold text-ink dark:text-white">Library bag</p>
          <p className="text-xs text-slate-500">
            {count} item{count === 1 ? "" : "s"} · {currency} {total.toFixed(2)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-800 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-200"
          aria-label="Close bag"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto p-3">
        {cart.map((item) => (
          <div key={libraryCartLineKey(item)} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <p className="text-sm font-medium leading-5 text-ink dark:text-white">{item.title}</p>
            {item.formatLabel && (
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                {item.formatLabel}
              </p>
            )}
            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
              <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  className="grid size-7 place-items-center hover:text-emerald-700"
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
                <span className="w-7 text-center text-[11px] font-black text-ink dark:text-white">{item.quantity}</span>
                <button
                  type="button"
                  className="grid size-7 place-items-center hover:text-emerald-700"
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
              <span className="font-semibold text-ink dark:text-white">
                {item.currency} {(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
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
      <div className="grid gap-2 border-t border-emerald-900/10 p-3 dark:border-emerald-400/10">
        <Link
          href="/library/checkout"
          onClick={onClose}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 text-sm font-semibold text-white transition hover:from-emerald-600 hover:to-teal-600"
        >
          Checkout
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-ink transition hover:border-emerald-500 dark:border-slate-700 dark:text-white"
        >
          Continue shopping
        </button>
      </div>
    </div>
  );
}
