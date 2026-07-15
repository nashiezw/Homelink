"use client";

import { apiFetch } from "@/lib/api/client";
import type { AnalyticsEventName } from "@/lib/analytics/events";

export function trackEvent(event: AnalyticsEventName, target?: string, metadata?: Record<string, string | number | boolean | undefined>) {
  void apiFetch("/api/v1/analytics/events", {
    method: "POST",
    body: JSON.stringify({ event, target, metadata }),
  });
}
