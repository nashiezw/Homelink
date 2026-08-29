"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api/client";
import { isAnalyticsAllowed } from "@/lib/analytics/privacy-client";
import {
  detectDeviceType,
  getOrCreateSessionId,
  getOrCreateVisitorId,
  readUtmParams,
} from "@/lib/analytics/visitor-client";
import { libraryCartSnapshot } from "@/lib/library/cart-client";

function ignoreAnalyticsFailure(error: unknown) {
  if (process.env.NODE_ENV === "development") {
    console.debug("analytics_request_failed", error);
  }
}

/**
 * First-party page tracker + presence heartbeat.
 * Anonymous visitor/session ids only — no MAC / hardware fingerprinting.
 */
export function SiteAnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams?.toString() ?? "";
  const active = useRef<{ id: string; startedAt: number; path: string } | null>(null);
  const lastPresenceAt = useRef(0);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/dashboard/admin")) return;
    if (!isAnalyticsAllowed()) return;

    const visitorId = getOrCreateVisitorId();
    const sessionId = getOrCreateSessionId();
    const deviceType = detectDeviceType();
    const utm = readUtmParams();
    const path = `${pathname}${queryString ? `?${queryString}` : ""}`;
    const startedAt = Date.now();
    let cancelled = false;

    async function start() {
      try {
        const result = await apiFetch<{ id: string | null }>("/api/v1/analytics/pageviews", {
          method: "POST",
          body: JSON.stringify({
            action: "start",
            visitorId,
            sessionId,
            path,
            title: typeof document !== "undefined" ? document.title : undefined,
            referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
            deviceType,
            ...utm,
          }),
        });
        if (!cancelled && result.data?.id) {
          active.current = { id: result.data.id, startedAt, path };
        }
      } catch (error) {
        ignoreAnalyticsFailure(error);
      }
    }

    function end() {
      const current = active.current;
      if (!current) return;
      const durationMs = Date.now() - current.startedAt;
      active.current = null;
      const payload = JSON.stringify({
        action: "end",
        pageViewId: current.id,
        visitorId,
        sessionId,
        path: current.path,
        deviceType,
        durationMs,
      });
      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/v1/analytics/pageviews", blob);
        return;
      }
      void apiFetch("/api/v1/analytics/pageviews", { method: "POST", body: payload }).catch(ignoreAnalyticsFailure);
    }

    function heartbeat() {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - lastPresenceAt.current < 60_000) return;
      lastPresenceAt.current = now;
      const cart = libraryCartSnapshot();
      const productMatch = (pathname || "").match(/^\/library\/([^/?#]+)/);
      const productSlug = productMatch?.[1] && !["checkout", "claim"].includes(productMatch[1]) ? productMatch[1] : undefined;
      const pageTitle = typeof document !== "undefined" ? document.title : undefined;
      const cleanProductTitle = pageTitle
        ? pageTitle
            .replace(/\s*[|–-]\s*HouseLink.*$/i, "")
            .replace(/\s*[|–-]\s*Library.*$/i, "")
            .trim()
        : undefined;
      void apiFetch("/api/v1/analytics/pageviews", {
        method: "POST",
        body: JSON.stringify({
          kind: "presence",
          visitorId,
          sessionId,
          path,
          title: pageTitle,
          deviceType,
          productId: productSlug,
          productTitle: productSlug ? cleanProductTitle || productSlug : undefined,
          ...cart,
        }),
      }).catch(ignoreAnalyticsFailure);
    }

    void start();
    heartbeat();
    const beat = window.setInterval(heartbeat, 120000);
    const onHide = () => {
      if (document.visibilityState === "hidden") end();
      else {
        lastPresenceAt.current = 0;
        heartbeat();
      }
    };
    window.addEventListener("pagehide", end);
    document.addEventListener("visibilitychange", onHide);
    const onCartChanged = () => {
      lastPresenceAt.current = 0;
      heartbeat();
    };
    window.addEventListener("houselink:library-cart", onCartChanged);
    return () => {
      cancelled = true;
      end();
      window.clearInterval(beat);
      window.removeEventListener("pagehide", end);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("houselink:library-cart", onCartChanged);
    };
  }, [pathname, queryString]);

  return null;
}
