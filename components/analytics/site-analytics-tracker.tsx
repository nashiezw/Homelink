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

/**
 * First-party page tracker + presence heartbeat.
 * Anonymous visitor/session ids only — no MAC / hardware fingerprinting.
 */
export function SiteAnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = useRef<{ id: string; startedAt: number; path: string } | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/dashboard/admin")) return;
    if (!isAnalyticsAllowed()) return;

    const visitorId = getOrCreateVisitorId();
    const sessionId = getOrCreateSessionId();
    const deviceType = detectDeviceType();
    const utm = readUtmParams();
    const path = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
    const startedAt = Date.now();
    let cancelled = false;

    async function start() {
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
      void apiFetch("/api/v1/analytics/pageviews", { method: "POST", body: payload });
    }

    function heartbeat() {
      if (document.visibilityState === "hidden") return;
      const cart = libraryCartSnapshot();
      const productMatch = (pathname || "").match(/^\/library\/([^/?#]+)/);
      const productSlug = productMatch?.[1] && !["checkout", "claim"].includes(productMatch[1]) ? productMatch[1] : undefined;
      void apiFetch("/api/v1/analytics/pageviews", {
        method: "POST",
        body: JSON.stringify({
          kind: "presence",
          visitorId,
          sessionId,
          path,
          title: typeof document !== "undefined" ? document.title : undefined,
          deviceType,
          productId: productSlug,
          productTitle: productSlug ? (typeof document !== "undefined" ? document.title : productSlug) : undefined,
          ...cart,
        }),
      });
    }

    void start();
    heartbeat();
    const beat = window.setInterval(heartbeat, 30000);
    const onHide = () => {
      if (document.visibilityState === "hidden") end();
      else heartbeat();
    };
    window.addEventListener("pagehide", end);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("houselink:library-cart", heartbeat);
    return () => {
      cancelled = true;
      end();
      window.clearInterval(beat);
      window.removeEventListener("pagehide", end);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("houselink:library-cart", heartbeat);
    };
  }, [pathname, searchParams]);

  return null;
}
