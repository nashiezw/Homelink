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

const recentEvents = new Map<string, number>();

export function trackEvent(event: AnalyticsEventName, target?: string, metadata?: Record<string, string | number | boolean | undefined>) {
  if (!isAnalyticsAllowed()) return;
  const metadataKey = metadata
    ? Object.entries(metadata)
        .filter(([, value]) => value !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}:${String(value).slice(0, 40)}`)
        .join("|")
    : "";
  const dedupeKey = `${event}:${target || ""}:${metadataKey}`;
  const now = Date.now();
  const duplicateExpiresAt = recentEvents.get(dedupeKey);
  if (duplicateExpiresAt && duplicateExpiresAt > now) return;
  if (recentEvents.size > 500) {
    for (const [key, expiresAt] of recentEvents) {
      if (expiresAt <= now) recentEvents.delete(key);
    }
  }
  recentEvents.set(dedupeKey, now + 10_000);
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
