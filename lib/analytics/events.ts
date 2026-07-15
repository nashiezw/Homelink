export const ANALYTICS_EVENTS = [
  "search_submitted",
  "filter_changed",
  "listing_viewed",
  "gallery_opened",
  "enquiry_started",
  "enquiry_completed",
  "whatsapp_click",
  "saved_listing",
  "listing_submitted",
  "payment_started",
  "upload_failed",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export function isAnalyticsEventName(value: unknown): value is AnalyticsEventName {
  return typeof value === "string" && (ANALYTICS_EVENTS as readonly string[]).includes(value);
}
