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
  "library_product_viewed",
  "library_search_submitted",
  "library_cart_added",
  "library_cart_removed",
  "library_cart_qty_changed",
  "library_cart_cleared",
  "library_bundle_shown",
  "library_bundle_added",
  "library_checkout_started",
  "library_purchase_completed",
  "library_proof_uploaded",
  "library_download_started",
  "library_download_completed",
  "library_sample_opened",
  "library_scroll_depth",
  "library_review_submitted",
  "library_nps_submitted",
  "presence_heartbeat",
  "rage_click",
  "ui_error",
  "experiment_exposure",
  "identity_stitched",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export function isAnalyticsEventName(value: unknown): value is AnalyticsEventName {
  return typeof value === "string" && (ANALYTICS_EVENTS as readonly string[]).includes(value);
}

/** Events mirrored into SiteFunnelEvent for advanced reporting. */
export function shouldMirrorFunnelEvent(event: string) {
  return (
    event.startsWith("library_") ||
    event === "whatsapp_click" ||
    event === "enquiry_started" ||
    event === "enquiry_completed" ||
    event === "payment_started" ||
    event === "listing_viewed" ||
    event === "search_submitted" ||
    event === "gallery_opened" ||
    event === "saved_listing" ||
    event === "rage_click" ||
    event === "ui_error" ||
    event === "experiment_exposure" ||
    event === "identity_stitched" ||
    event === "upload_failed"
  );
}
