"use client";

import { apiFetch } from "@/lib/api/client";
import type { AnalyticsEventName } from "@/lib/analytics/events";
import { shouldMirrorFunnelEvent } from "@/lib/analytics/events";
import { isAnalyticsAllowed } from "@/lib/analytics/privacy-client";
import {
  detectDeviceType,
  getOrCreateSessionId,
  getOrCreateVisitorId,
  readUtmParams,
} from "@/lib/analytics/visitor-client";

function ignoreAnalyticsFailure(error: unknown) {
  if (process.env.NODE_ENV === "development") {
    console.debug("analytics_request_failed", error);
  }
}

export function trackEvent(event: AnalyticsEventName, target?: string, metadata?: Record<string, string | number | boolean | undefined>) {
  if (!isAnalyticsAllowed()) return;
  const utm = readUtmParams();
  void apiFetch("/api/v1/analytics/events", {
    method: "POST",
    body: JSON.stringify({ event, target, metadata: { ...utm, ...metadata } }),
  }).catch(ignoreAnalyticsFailure);
  if (shouldMirrorFunnelEvent(event)) {
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
        metadata: { ...utm, ...metadata },
      }),
    }).catch(ignoreAnalyticsFailure);
  }
}
