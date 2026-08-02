import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { isInternalAnalyticsPath, recordSiteFunnelEvent, recordSitePageView, stitchAnalyticsIdentity } from "@/lib/analytics/site-analytics";
import { upsertSitePresence } from "@/lib/analytics/presence";
import { isAnalyticsEventName } from "@/lib/analytics/events";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return problem(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const userId = getSessionUserIdFromRequest(request) ?? undefined;

  if (body.kind === "presence" || body.action === "presence") {
    const path = String(body.path || "/");
    if (isInternalAnalyticsPath(path)) return ok({ ok: false, ignored: true });
    const cartSummary = Array.isArray(body.cartSummary)
      ? body.cartSummary
          .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
          .slice(0, 12)
          .map((row) => ({
            productId: String(row.productId || ""),
            title: String(row.title || ""),
            quantity: Number(row.quantity) || 0,
            price: Number(row.price) || 0,
            formatLabel: typeof row.formatLabel === "string" ? row.formatLabel : undefined,
          }))
      : undefined;
    const result = await upsertSitePresence({
      visitorId: String(body.visitorId || ""),
      sessionId: String(body.sessionId || ""),
      path,
      title: typeof body.title === "string" ? body.title : undefined,
      deviceType: typeof body.deviceType === "string" ? body.deviceType : undefined,
      userId,
      productId: typeof body.productId === "string" ? body.productId : undefined,
      productTitle: typeof body.productTitle === "string" ? body.productTitle : undefined,
      cartItemCount: typeof body.cartItemCount === "number" ? body.cartItemCount : undefined,
      cartValue: typeof body.cartValue === "number" ? body.cartValue : undefined,
      cartCurrency: typeof body.cartCurrency === "string" ? body.cartCurrency : undefined,
      cartSummary,
    });
    return ok(result);
  }

  if (body.kind === "funnel" || (typeof body.name === "string" && !body.action)) {
    const name = String(body.name || "");
    if (isInternalAnalyticsPath(body.path) || isInternalAnalyticsPath(body.target)) {
      return ok({ id: null, ignored: true });
    }
    if (!isAnalyticsEventName(name) && !name.startsWith("library_") && name !== "whatsapp_click" && name !== "page_view") {
      // Allow known analytics names; reject unknown spammy labels.
      if (!/^[a-z0-9_]{3,64}$/i.test(name)) {
        return problem(400, "INVALID_EVENT", "Unsupported funnel event.");
      }
    }
    const visitorId = String(body.visitorId || "");
    if (name === "identity_stitched") {
      const metadata = body.metadata && typeof body.metadata === "object" ? (body.metadata as Record<string, unknown>) : {};
      await stitchAnalyticsIdentity({
        visitorId,
        userId: userId ?? (typeof metadata.userId === "string" ? metadata.userId : undefined),
        email: typeof metadata.email === "string" ? metadata.email : undefined,
      });
    }
    const result = await recordSiteFunnelEvent({
      visitorId,
      sessionId: typeof body.sessionId === "string" ? body.sessionId : undefined,
      name,
      path: typeof body.path === "string" ? body.path : undefined,
      target: typeof body.target === "string" ? body.target : undefined,
      deviceType: typeof body.deviceType === "string" ? body.deviceType : undefined,
      referrer: typeof body.referrer === "string" ? body.referrer : undefined,
      userId,
      metadata: body.metadata && typeof body.metadata === "object" ? (body.metadata as Record<string, unknown>) : undefined,
    });
    return ok(result);
  }

  if (isInternalAnalyticsPath(body.path)) return ok({ id: null, ignored: true });

  const result = await recordSitePageView({
    action: body.action === "end" ? "end" : "start",
    pageViewId: typeof body.pageViewId === "string" ? body.pageViewId : undefined,
    visitorId: String(body.visitorId || ""),
    sessionId: String(body.sessionId || ""),
    path: String(body.path || "/"),
    title: typeof body.title === "string" ? body.title : undefined,
    referrer: typeof body.referrer === "string" ? body.referrer : undefined,
    utmSource: typeof body.utmSource === "string" ? body.utmSource : undefined,
    utmMedium: typeof body.utmMedium === "string" ? body.utmMedium : undefined,
    utmCampaign: typeof body.utmCampaign === "string" ? body.utmCampaign : undefined,
    deviceType: String(body.deviceType || "unknown"),
    durationMs: typeof body.durationMs === "number" ? body.durationMs : undefined,
    userId,
  });
  return ok(result);
}
