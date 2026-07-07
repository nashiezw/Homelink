/** Full training manual — library reference only, not per-lesson downloads. */
export const ACADEMY_FULL_MANUAL_URL = "/uploads/academy/homelink-zimbabwe-real-estate-agent-training-manual.pdf";

export function isFullTrainingManualUrl(url?: string | null) {
  if (!url) return false;
  const normalized = url.split("?")[0] ?? url;
  return normalized === ACADEMY_FULL_MANUAL_URL || normalized.endsWith("homelink-zimbabwe-real-estate-agent-training-manual.pdf");
}
