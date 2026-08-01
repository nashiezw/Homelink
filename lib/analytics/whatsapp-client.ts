"use client";

import { trackEvent } from "@/lib/analytics/client";
import { isAnalyticsAllowed } from "@/lib/analytics/privacy-client";
import { readUtmParams } from "@/lib/analytics/visitor-client";

/** Track WhatsApp help clicks with source + UTM attribution. */
export function trackWhatsAppClick(
  source: string,
  extras?: Record<string, string | number | boolean | undefined>,
) {
  if (!isAnalyticsAllowed()) return;
  const utm = readUtmParams();
  const path = typeof window !== "undefined" ? window.location.pathname : undefined;
  trackEvent("whatsapp_click", source, {
    source,
    path,
    utmSource: utm.utmSource,
    utmMedium: utm.utmMedium,
    utmCampaign: utm.utmCampaign,
    ...extras,
  });
}
