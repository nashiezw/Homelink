"use client";

import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LibraryBagDrawer } from "@/components/library/library-bag-drawer";
import { useLibraryCart } from "@/lib/library/cart-client";
import { cn } from "@/lib/utils";

const iconButtonClass =
  "relative inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white";

/** Desktop Library bag with mini-drawer (pairs with mobile FAB). */
export function LibraryHeaderBag({ className }: { className?: string }) {
  const pathname = usePathname();
  const { count } = useLibraryCart();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const onCheckout = pathname?.startsWith("/library/checkout");

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (!count || onCheckout) return null;

  return (
    <div ref={rootRef} className={cn("relative hidden lg:block", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={iconButtonClass}
        aria-label={`Library bag, ${count} item${count === 1 ? "" : "s"}`}
        aria-expanded={open}
        title="Library bag"
      >
        <ShoppingBag className="size-5" strokeWidth={1.75} />
        <span className="absolute right-1 top-1 flex size-[18px] items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-[70]">
          <LibraryBagDrawer onClose={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}
