"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api/client";
import {
  detectDeviceType,
  getOrCreateSessionId,
  getOrCreateVisitorId,
  readUtmParams,
} from "@/lib/analytics/visitor-client";

/**
 * First-party page tracker: anonymous visitor/session ids, path, time on page,
 * referrer, UTM, device class. No MAC / hardware fingerprinting.
 */
export function SiteAnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = useRef<{ id: string; startedAt: number; path: string } | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/dashboard/admin")) return;

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

    void start();
    const onHide = () => {
      if (document.visibilityState === "hidden") end();
    };
    window.addEventListener("pagehide", end);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      cancelled = true;
      end();
      window.removeEventListener("pagehide", end);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [pathname, searchParams]);

  return null;
}
