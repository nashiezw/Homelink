import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { ok, problem } from "@/lib/api/response";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { isAnalyticsEventName } from "@/lib/analytics/events";
import type { Prisma } from "@prisma/client";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (!isAnalyticsEventName(body.event)) {
    return problem(400, "INVALID_ANALYTICS_EVENT", "Unsupported analytics event.");
  }

  const metadata = sanitizeMetadata(body.metadata);
  const userId = getSessionUserIdFromRequest(request);

  if (isPostgresStoreEnabled()) {
    await getMainPrisma().auditEvent.create({
      data: {
        actorId: userId,
        action: `ANALYTICS_${body.event.toUpperCase()}`,
        target: typeof body.target === "string" ? body.target.slice(0, 160) : "client",
        metadata: metadata as Prisma.InputJsonObject,
      },
    });
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
