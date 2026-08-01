"use client";

import { useEffect, useState } from "react";

export const HOUSELINK_BOTTOM_DOCK_ATTR = "data-houselink-bottom-dock";

/** Mark a mobile bottom dock so floating FABs can lift above it. */
export function setHouseLinkBottomDock(id: string | null) {
  if (typeof document === "undefined") return;
  if (id) document.documentElement.setAttribute(HOUSELINK_BOTTOM_DOCK_ATTR, id);
  else document.documentElement.removeAttribute(HOUSELINK_BOTTOM_DOCK_ATTR);
}

export function useHouseLinkBottomDock() {
  const [dock, setDock] = useState("");
  useEffect(() => {
    const sync = () => setDock(document.documentElement.getAttribute(HOUSELINK_BOTTOM_DOCK_ATTR) || "");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [HOUSELINK_BOTTOM_DOCK_ATTR],
    });
    return () => observer.disconnect();
  }, []);
  return dock;
}

export function isLibraryProductPath(pathname?: string | null) {
  if (!pathname?.startsWith("/library/")) return false;
  if (pathname.startsWith("/library/checkout")) return false;
  if (pathname.startsWith("/library/claim")) return false;
  return true;
}
