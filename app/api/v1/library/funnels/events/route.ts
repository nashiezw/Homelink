import { ok, problem } from "@/lib/api/response";
import { recordSalesFunnelEvent } from "@/lib/library/funnels";

export const dynamic = "force-dynamic";

const ALLOWED = new Set([
  "page_view",
  "library_funnel_page_view",
  "session_started",
  "scroll_25",
  "scroll_50",
  "scroll_75",
  "scroll_90",
  "offer_viewed",
  "library_funnel_offer_viewed",
  "countdown_viewed",
  "cta_clicked",
  "library_funnel_cta_clicked",
  "hero_buy_clicked",
  "sample_opened",
  "sample_downloaded",
  "pricing_viewed",
  "digital_selected",
  "library_funnel_digital_selected",
  "printed_selected",
  "library_funnel_printed_selected",
  "checkout_viewed",
  "checkout_started",
  "library_checkout_started",
  "library_funnel_checkout_started",
  "payment_started",
  "payment_success",
  "payment_failed",
  "purchase_completed",
  "library_purchase_completed",
  "whatsapp_clicked",
  "faq_opened",
  "bonus_viewed",
  "offer_expired",
  "checkout_abandoned",
]);

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return problem(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
  const event = String(body.event || "").trim();
  const funnelId = String(body.funnelId || "").trim();
  if (!ALLOWED.has(event)) return problem(400, "INVALID_FUNNEL_EVENT", "Unsupported sales funnel event.");
  if (!funnelId) return problem(400, "INVALID_FUNNEL", "funnelId is required.");

  await recordSalesFunnelEvent({
    event,
    funnelId,
    productId: typeof body.productId === "string" ? body.productId : undefined,
    ctaId: typeof body.ctaId === "string" ? body.ctaId : undefined,
    offerId: typeof body.offerId === "string" ? body.offerId : undefined,
    visitorId: typeof body.visitorId === "string" ? body.visitorId : undefined,
    sessionId: typeof body.sessionId === "string" ? body.sessionId : undefined,
    metadata: body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata as Record<string, unknown> : undefined,
  });

  return ok({ logged: true });
}
