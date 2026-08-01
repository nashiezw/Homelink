"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { useLibraryCart } from "@/lib/library/cart-client";
import { cn } from "@/lib/utils";

const iconButtonClass =
  "relative inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white";

/** Desktop / large-screen Library bag count (pairs with mobile FAB). */
export function LibraryHeaderBag({ className }: { className?: string }) {
  const pathname = usePathname();
  const { count } = useLibraryCart();
  const onCheckout = pathname?.startsWith("/library/checkout");

  if (!count || onCheckout) return null;

  return (
    <Link
      href="/library/checkout"
      className={cn(iconButtonClass, "hidden lg:inline-flex", className)}
      aria-label={`Library bag, ${count} item${count === 1 ? "" : "s"}`}
      title="Library bag"
    >
      <ShoppingBag className="size-5" strokeWidth={1.75} />
      <span className="absolute right-1 top-1 flex size-[18px] items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
        {count > 9 ? "9+" : count}
      </span>
    </Link>
  );
}
