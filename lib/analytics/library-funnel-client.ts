"use client";

import { detectDeviceType, getOrCreateSessionId, getOrCreateVisitorId, readUtmParams } from "@/lib/analytics/visitor-client";

export const LIBRARY_FUNNEL_ATTRIBUTION_KEY = "houselink_library_funnel_attribution";

export type LibraryFunnelAttribution = Record<string, unknown> & {
  funnelId?: string;
  funnelSlug?: string;
  funnelVersion?: number;
  template?: string;
  productId?: string;
  productSlug?: string;
  offerId?: string;
  offerState?: string;
  selectedFormatId?: string;
  selectedFormatType?: string;
  selectedPrice?: number;
};

export function writeLibraryFunnelAttribution(input: LibraryFunnelAttribution) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(LIBRARY_FUNNEL_ATTRIBUTION_KEY, JSON.stringify({ ...input, ...readUtmParams() }));
}

export function readLibraryFunnelAttribution(searchParams?: URLSearchParams | null): LibraryFunnelAttribution | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(LIBRARY_FUNNEL_ATTRIBUTION_KEY) || "{}") as Record<string, unknown>;
    const funnelId = typeof parsed.funnelId === "string" ? parsed.funnelId : searchParams?.get("funnelId") || "";
    const offerId = typeof parsed.offerId === "string" ? parsed.offerId : searchParams?.get("offerId") || "";
    if (!funnelId && !offerId) return undefined;
    return { ...parsed, funnelId, offerId } as LibraryFunnelAttribution;
  } catch {
    const funnelId = searchParams?.get("funnelId") || "";
    const offerId = searchParams?.get("offerId") || "";
    return funnelId || offerId ? { funnelId, offerId } : undefined;
  }
}

export function libraryFunnelAnalyticsMetadata(
  attribution?: LibraryFunnelAttribution,
  extra?: Record<string, string | number | boolean | undefined>,
) {
  const meta: Record<string, string | number | boolean | undefined> = {};
  for (const key of [
    "funnelId",
    "funnelSlug",
    "template",
    "productId",
    "productSlug",
    "offerId",
    "offerState",
    "selectedFormatId",
    "selectedFormatType",
  ] as const) {
    const value = attribution?.[key];
    if (typeof value === "string") meta[key] = value;
  }
  if (Number.isFinite(Number(attribution?.funnelVersion))) meta.funnelVersion = Number(attribution?.funnelVersion);
  if (Number.isFinite(Number(attribution?.selectedPrice))) meta.selectedPrice = Number(attribution?.selectedPrice);
  const utm = readUtmParams();
  return { ...utm, ...meta, ...extra };
}

export function trackLibraryFunnelEvent(
  event: string,
  attribution?: LibraryFunnelAttribution,
  extra?: Record<string, unknown>,
) {
  if (typeof window === "undefined") return;
  const funnelId = typeof attribution?.funnelId === "string" ? attribution.funnelId : "";
  if (!funnelId) return;
  void fetch("/api/v1/library/funnels/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event,
      funnelId,
      productId: typeof attribution?.productId === "string" ? attribution.productId : undefined,
      offerId: typeof attribution?.offerId === "string" ? attribution.offerId : undefined,
      visitorId: getOrCreateVisitorId(),
      sessionId: getOrCreateSessionId(),
      metadata: {
        ...readUtmParams(),
        ...libraryFunnelAnalyticsMetadata(attribution),
        path: window.location.pathname,
        deviceType: detectDeviceType(),
        referrer: document.referrer || undefined,
        ...extra,
      },
    }),
    keepalive: true,
  }).catch(() => undefined);
}
