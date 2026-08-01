"use client";

const EXP_KEY = "houselink_experiments";

/** Read sticky assignment without assigning or firing exposure. */
export function peekExperimentVariant(experiment: string) {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem(EXP_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    return typeof map[experiment] === "string" ? map[experiment] : "";
  } catch {
    return "";
  }
}

/** Simple sticky A/B assignment (client-side, first-party). */
export function getExperimentVariant(experiment: string, variants: string[] = ["control", "treatment"]) {
  if (typeof window === "undefined" || !variants.length) return variants[0] || "control";
  try {
    const raw = window.localStorage.getItem(EXP_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    if (map[experiment] && variants.includes(map[experiment])) return map[experiment];
    const pick = variants[Math.floor(Math.random() * variants.length)] || variants[0];
    map[experiment] = pick;
    window.localStorage.setItem(EXP_KEY, JSON.stringify(map));
    void import("@/lib/analytics/client").then(({ trackEvent }) => {
      trackEvent("experiment_exposure", experiment, { experiment, variant: pick });
    });
    return pick;
  } catch {
    return variants[0] || "control";
  }
}
