import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { isInternalAnalyticsPath } from "@/lib/analytics/site-analytics";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { isDatabaseUnavailableError } from "@/lib/db/production-schema";
import { isAnalyticsEventName } from "@/lib/analytics/events";
import type { Prisma } from "@prisma/client";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (!isAnalyticsEventName(body.event)) {
    return problem(400, "INVALID_ANALYTICS_EVENT", "Unsupported analytics event.");
  }

  const metadata = sanitizeMetadata(body.metadata);
  if (isInternalAnalyticsPath(body.target) || isInternalAnalyticsPath(metadata.path)) {
    return ok({ tracked: false, ignored: true });
  }
  const userId = getSessionUserIdFromRequest(request);

  if (isPostgresStoreEnabled()) {
    try {
      await getMainPrisma().auditEvent.create({
        data: {
          actorId: userId,
          action: `ANALYTICS_${body.event.toUpperCase()}`,
          target: typeof body.target === "string" ? body.target.slice(0, 160) : "client",
          metadata: metadata as Prisma.InputJsonObject,
        },
      });
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        return ok({ tracked: false, databaseUnavailable: true });
      }
      console.warn("analytics_event_audit_failed", {
        event: body.event,
        target: typeof body.target === "string" ? body.target.slice(0, 160) : "client",
        reason: error instanceof Error ? error.message : "Unknown analytics audit failure",
      });
      return ok({ tracked: false, queued: false });
    }
  } else {
    console.info("analytics_event", { event: body.event, target: body.target, userId, metadata });
  }

  return ok({ tracked: true });
}

function sanitizeMetadata(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>)
      .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
      .map(([key, value]) => [key.slice(0, 48), typeof value === "string" ? value.slice(0, 240) : value]),
  );
}
