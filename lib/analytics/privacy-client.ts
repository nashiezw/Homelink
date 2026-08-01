"use client";

const OPT_OUT_KEY = "houselink_analytics_opt_out";

/** Respect explicit opt-out and browser Do Not Track. */
export function isAnalyticsAllowed() {
  if (typeof window === "undefined") return true;
  try {
    if (window.localStorage.getItem(OPT_OUT_KEY) === "1") return false;
  } catch {
    /* ignore */
  }
  const dnt =
    (typeof navigator !== "undefined" && (navigator.doNotTrack === "1" || navigator.doNotTrack === "yes")) ||
    (typeof window !== "undefined" &&
      ((window as Window & { doNotTrack?: string }).doNotTrack === "1" ||
        (window as Window & { doNotTrack?: string }).doNotTrack === "yes"));
  if (dnt) return false;
  return true;
}

export function getAnalyticsOptOut() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAnalyticsOptOut(optOut: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (optOut) window.localStorage.setItem(OPT_OUT_KEY, "1");
    else window.localStorage.removeItem(OPT_OUT_KEY);
    window.dispatchEvent(new CustomEvent("houselink:analytics-preference", { detail: { optOut } }));
  } catch {
    /* ignore */
  }
}
