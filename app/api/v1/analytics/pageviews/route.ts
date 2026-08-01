import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { recordSiteFunnelEvent, recordSitePageView } from "@/lib/analytics/site-analytics";
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

  if (body.kind === "funnel" || (typeof body.name === "string" && !body.action)) {
    const name = String(body.name || "");
    if (!isAnalyticsEventName(name) && !name.startsWith("library_") && name !== "whatsapp_click" && name !== "page_view") {
      // Allow known analytics names; reject unknown spammy labels.
      if (!/^[a-z0-9_]{3,64}$/i.test(name)) {
        return problem(400, "INVALID_EVENT", "Unsupported funnel event.");
      }
    }
    const result = await recordSiteFunnelEvent({
      visitorId: String(body.visitorId || ""),
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
