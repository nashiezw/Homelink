"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics/client";
import { isAnalyticsAllowed } from "@/lib/analytics/privacy-client";
import { getExperimentVariant } from "@/lib/analytics/experiments";

/**
 * Rage-click / UI-error listeners + default Library experiment exposure.
 */
export function AdvancedBehaviorTracker() {
  const pathname = usePathname();
  const lastClick = useRef<{ x: number; y: number; at: number; count: number } | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/dashboard/admin")) return;
    if (!isAnalyticsAllowed()) return;

    // Default storefront experiment (price badge copy / control).
    if (pathname.startsWith("/library")) {
      getExperimentVariant("library_softcopy_badge", ["control", "save_callout"]);
    }

    function onClick(event: MouseEvent) {
      const now = Date.now();
      const x = event.clientX;
      const y = event.clientY;
      const prev = lastClick.current;
      if (prev && now - prev.at < 700 && Math.hypot(x - prev.x, y - prev.y) < 24) {
        prev.count += 1;
        prev.at = now;
        if (prev.count >= 3) {
          trackEvent("rage_click", pathname || "/", { x, y, count: prev.count, path: pathname || "/" });
          prev.count = 0;
        }
      } else {
        lastClick.current = { x, y, at: now, count: 1 };
      }
    }

    function onError(event: ErrorEvent) {
      trackEvent("ui_error", pathname || "/", {
        message: String(event.message || "error").slice(0, 160),
        path: pathname || "/",
      });
    }

    function onRejection(event: PromiseRejectionEvent) {
      trackEvent("ui_error", pathname || "/", {
        message: String(event.reason || "rejection").slice(0, 160),
        path: pathname || "/",
        kind: "unhandledrejection",
      });
    }

    window.addEventListener("click", onClick, true);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [pathname]);

  return null;
}
