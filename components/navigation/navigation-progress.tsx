"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    function clearTimers() {
      if (timer.current) window.clearInterval(timer.current);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      timer.current = null;
      hideTimer.current = null;
    }

    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor || event.defaultPrevented || event.button !== 0) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      } catch {
        return;
      }

      clearTimers();
      setVisible(true);
      setWidth(16);
      timer.current = window.setInterval(() => {
        setWidth((current) => (current >= 90 ? current : current + 6 + Math.random() * 8));
      }, 180);
    }

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimers();
    };
  }, []);

  useEffect(() => {
    if (!visible && width === 0) return;
    if (timer.current) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
    setWidth(100);
    hideTimer.current = window.setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 260);
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
    // Complete only when the route changes, not when the click starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  if (!visible && width === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[120] h-[3px]" aria-hidden>
      <div
        className="h-full bg-[#22a54b] shadow-[0_0_10px_rgba(34,165,75,0.55)] transition-[width] duration-200 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}
