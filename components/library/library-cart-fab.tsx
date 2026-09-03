"use client";

import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { LibraryBagDrawer } from "@/components/library/library-bag-drawer";
import { useLibraryCart } from "@/lib/library/cart-client";
import { setLibraryBagFloatingOpen, useLiveChatFloatingOpen } from "@/lib/live-chat/floating-state";
import { isLibraryProductPath, useHouseLinkBottomDock } from "@/lib/ui/bottom-dock";
import { cn } from "@/lib/utils";

/** Mobile / tablet Library bag FAB (right). Hidden at lg+ — desktop uses header bag. */
export function LibraryCartFab({ className }: { className?: string }) {
  const pathname = usePathname();
  const { count } = useLibraryCart();
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const bottomDock = useHouseLinkBottomDock();
  const liveChatOpen = useLiveChatFloatingOpen();
  const onLibraryProductBuyDock = bottomDock === "library-product-buy" && isLibraryProductPath(pathname);

  useEffect(() => {
    function onAdded() {
      setPulse(true);
      window.setTimeout(() => setPulse(false), 700);
    }
    window.addEventListener("houselink:library-cart-added", onAdded);
    return () => window.removeEventListener("houselink:library-cart-added", onAdded);
  }, []);

  useEffect(() => {
    setLibraryBagFloatingOpen(open);
    return () => setLibraryBagFloatingOpen(false);
  }, [open]);

  if (!count || liveChatOpen || pathname?.startsWith("/library/checkout")) return null;

  return (
    <div
      data-houselink-sticky="library-bag"
      className={cn(
        "fixed right-4 z-[60] flex flex-col items-end gap-3 sm:right-5 lg:hidden",
        // Keep the Library bag above the closed HouseLink Live launcher on mobile.
        onLibraryProductBuyDock
          ? "bottom-[calc(15.25rem+env(safe-area-inset-bottom))]"
          : bottomDock
          ? "bottom-[calc(12.5rem+env(safe-area-inset-bottom))]"
          : "bottom-[calc(7rem+env(safe-area-inset-bottom))]",
        className,
      )}
    >
      {open ? <LibraryBagDrawer onClose={() => setOpen(false)} /> : null}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "relative inline-flex h-12 min-w-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-700 px-3.5 text-white shadow-[0_12px_30px_rgba(6,95,70,0.35)] transition hover:from-emerald-600 hover:to-teal-600",
          pulse && "scale-105",
        )}
        aria-label={`Open Library Bag, ${count} items`}
      >
        <ShoppingBag className="size-5 shrink-0" />
        <span className="hidden text-xs font-bold sm:inline">Bag</span>
        <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-bold text-emerald-800 shadow-sm ring-2 ring-emerald-700">
          {count > 99 ? "99+" : count}
        </span>
      </button>
    </div>
  );
}
