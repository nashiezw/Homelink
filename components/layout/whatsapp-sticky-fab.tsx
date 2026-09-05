"use client";

import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { trackWhatsAppClick } from "@/lib/analytics/whatsapp-client";
import { usePlatformConfig } from "@/components/providers/platform-config-provider";
import { useLibraryBagFloatingOpen, useLiveChatFloatingOpen } from "@/lib/live-chat/floating-state";
import {
  getContextualWhatsAppHref,
  resolveWhatsAppLane,
  stickyWhatsAppVisible,
} from "@/lib/settings/contact";
import { isLibraryProductPath, useHouseLinkBottomDock } from "@/lib/ui/bottom-dock";
import { cn } from "@/lib/utils";

/**
 * Sticky WhatsApp help — all breakpoints (left).
 * On Library product pages, it mirrors HouseLink Live above the mobile buy dock.
 */
export function WhatsAppStickyFab({ className }: { className?: string }) {
  const pathname = usePathname();
  const { config } = usePlatformConfig();
  const liveChatOpen = useLiveChatFloatingOpen();
  const libraryBagOpen = useLibraryBagFloatingOpen();
  const bottomDock = useHouseLinkBottomDock();
  const contact = config?.contact;
  if (!contact || !stickyWhatsAppVisible(contact)) return null;
  if (liveChatOpen || libraryBagOpen) return null;
  const onLibraryProductPage = isLibraryProductPath(pathname);
  if (
    pathname?.startsWith("/dashboard/admin") ||
    pathname?.startsWith("/library/checkout")
  ) {
    return null;
  }

  const lane = resolveWhatsAppLane(pathname || undefined);
  const href = getContextualWhatsAppHref(contact, {
    source: onLibraryProductPage ? "library_product_sticky_fab" : "sticky_fab",
    pathname: pathname || undefined,
    lane,
    productTitle: onLibraryProductPage && typeof document !== "undefined" ? cleanProductTitle(document.title) : undefined,
  });
  if (!href) return null;
  const label = contact.stickyWhatsAppLabel?.trim() || contact.whatsappLabel?.trim() || "WhatsApp";
  const quiet = contact.stickyWhatsAppQuietHours?.trim();
  const bottomClass = onLibraryProductPage && bottomDock === "library-product-buy"
    ? "bottom-[calc(8.75rem+env(safe-area-inset-bottom))]"
    : bottomDock
      ? "bottom-[calc(5.75rem+env(safe-area-inset-bottom))]"
      : "bottom-[max(1.25rem,env(safe-area-inset-bottom))] sm:bottom-5";

  return (
    <div
      className={cn(
        "fixed left-4 z-[60] flex flex-col items-start gap-1 transition-[bottom] duration-200 sm:left-5",
        bottomClass,
        className,
      )}
    >
      {quiet ? (
        <p className="hidden max-w-[8rem] rounded-lg bg-white/90 px-2 py-1 text-[10px] font-medium leading-snug text-slate-600 shadow-sm dark:bg-slate-950/90 dark:text-slate-300 lg:block">
          {quiet}
        </p>
      ) : null}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackWhatsAppClick(onLibraryProductPage ? "library_product_sticky_fab" : "sticky_fab", { lane, path: pathname || undefined })}
        data-houselink-sticky="whatsapp"
        title={label}
        className={cn(
          "inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-sm font-bold text-white shadow-[0_12px_30px_rgba(18,140,70,0.35)] transition hover:bg-[#1ebe57]",
          "px-3.5 lg:size-12 lg:rounded-full lg:px-0",
        )}
        aria-label={`Chat on WhatsApp — ${label}`}
      >
        <MessageCircle className="size-5 shrink-0" />
        <span className="max-w-[7rem] truncate sm:max-w-none lg:hidden">{label}</span>
      </a>
    </div>
  );
}

function cleanProductTitle(value: string) {
  return value
    .replace(/\s*[|–-]\s*HouseLink.*$/i, "")
    .replace(/\s*[|–-]\s*Library.*$/i, "")
    .trim();
}
