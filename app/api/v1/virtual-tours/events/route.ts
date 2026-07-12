import { created, problem } from "@/lib/api/response";
import { checkRateLimit, getClientIp } from "@/lib/api/request-meta";
import { recordVirtualTourEvent, shouldUsePostgresTourAnalytics } from "@/lib/virtual-tours/analytics";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!shouldUsePostgresTourAnalytics()) return problem(503, "POSTGRES_REQUIRED", "Virtual tour analytics require PostgreSQL.");
  const ip = getClientIp(request);
  const rate = checkRateLimit(`tour-event:${ip}`, 120);
  if (!rate.allowed) return problem(429, "RATE_LIMITED", `Too many virtual tour events. Try again in ${rate.retryAfterSec}s.`);
  const body = await request.json();
  if (!body.tourId || !body.listingId || !body.eventType) {
    return problem(400, "INVALID_EVENT", "tourId, listingId, and eventType are required.");
  }
  await recordVirtualTourEvent({
    tourId: String(body.tourId),
    listingId: String(body.listingId),
    sceneId: body.sceneId,
    eventType: body.eventType,
    metadata: body.metadata,
  });
  return created({ ok: true });
}
