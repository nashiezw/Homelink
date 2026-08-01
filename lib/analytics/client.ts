"use client";

import { apiFetch } from "@/lib/api/client";
import type { AnalyticsEventName } from "@/lib/analytics/events";
import {
  detectDeviceType,
  getOrCreateSessionId,
  getOrCreateVisitorId,
} from "@/lib/analytics/visitor-client";

export function trackEvent(event: AnalyticsEventName, target?: string, metadata?: Record<string, string | number | boolean | undefined>) {
  void apiFetch("/api/v1/analytics/events", {
    method: "POST",
    body: JSON.stringify({ event, target, metadata }),
  });
  // Mirror funnel-relevant events into first-party SiteFunnelEvent storage.
  if (
    event.startsWith("library_") ||
    event === "whatsapp_click" ||
    event === "enquiry_started" ||
    event === "enquiry_completed" ||
    event === "payment_started"
  ) {
    void apiFetch("/api/v1/analytics/pageviews", {
      method: "POST",
      body: JSON.stringify({
        kind: "funnel",
        name: event,
        visitorId: getOrCreateVisitorId(),
        sessionId: getOrCreateSessionId(),
        path: typeof window !== "undefined" ? window.location.pathname : undefined,
        target,
        deviceType: detectDeviceType(),
        referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
        metadata,
      }),
    });
  }
}
