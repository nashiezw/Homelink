"use client";

import { trackEvent } from "@/lib/analytics/client";
import { isAnalyticsAllowed } from "@/lib/analytics/privacy-client";
import { getOrCreateVisitorId } from "@/lib/analytics/visitor-client";

/** Stitch anonymous visitor id to a signed-in / checkout identity (admin analytics only). */
export function stitchAnalyticsIdentity(input: { userId?: string; email?: string }) {
  if (!isAnalyticsAllowed()) return;
  const visitorId = getOrCreateVisitorId();
  if (!visitorId) return;
  trackEvent("identity_stitched", input.userId || input.email || visitorId, {
    visitorId,
    userId: input.userId,
    email: input.email,
  });
}
