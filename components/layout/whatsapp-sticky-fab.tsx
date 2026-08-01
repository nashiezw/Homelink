"use client";

import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics/client";
import { getOrCreateSessionId, getOrCreateVisitorId, detectDeviceType } from "@/lib/analytics/visitor-client";
import { usePlatformConfig } from "@/components/providers/platform-config-provider";
import { getWhatsAppHref, stickyWhatsAppVisible } from "@/lib/settings/contact";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api/client";

export function WhatsAppStickyFab({ className }: { className?: string }) {
  const pathname = usePathname();
  const { config } = usePlatformConfig();
  const contact = config?.contact;
  if (!contact || !stickyWhatsAppVisible(contact)) return null;
  if (pathname?.startsWith("/dashboard/admin") || pathname?.startsWith("/library/checkout")) return null;

  const href = getWhatsAppHref(contact, { message: contact.stickyWhatsAppMessage });
  if (!href) return null;
  const label = contact.stickyWhatsAppLabel?.trim() || contact.whatsappLabel?.trim() || "WhatsApp";

  function onClick() {
    trackEvent("whatsapp_click", pathname || "/", { source: "sticky_fab" });
    void apiFetch("/api/v1/analytics/pageviews", {
      method: "POST",
      body: JSON.stringify({
        kind: "funnel",
        name: "whatsapp_click",
        visitorId: getOrCreateVisitorId(),
        sessionId: getOrCreateSessionId(),
        path: pathname || "/",
        deviceType: detectDeviceType(),
        target: "sticky_fab",
      }),
    });
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={cn(
        "fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-4 z-[60] inline-flex h-12 items-center gap-2 rounded-2xl bg-[#25D366] px-3.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(18,140,70,0.35)] transition hover:bg-[#1ebe57] sm:left-5",
        className,
      )}
      aria-label={`Chat on WhatsApp — ${label}`}
    >
      <MessageCircle className="size-5 shrink-0" />
      <span className="max-w-[7rem] truncate sm:max-w-none">{label}</span>
    </a>
  );
}
