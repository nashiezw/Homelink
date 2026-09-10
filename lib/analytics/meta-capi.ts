import { createHash } from "crypto";
import { LibraryOrderStatus } from "@prisma/client";
import { getMainPrisma } from "@/lib/db/main-prisma";
import { getHydratedPublicPlatformConfig } from "@/lib/settings/runtime";

type MetaCapiEvent = {
  eventName: "InitiateCheckout" | "Purchase";
  eventId: string;
  request?: Request;
  value: number;
  currency: string;
  eventSourceUrl?: string;
  userId?: string;
  email?: string | null;
  phone?: string | null;
};

function normalizeMetaCurrency(value: unknown) {
  const currency = String(value || "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : "USD";
}

function normalizeMetaValue(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : null;
}

function readCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie") || "";
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1] || "") : undefined;
}

function sha256(value?: string | null) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized ? createHash("sha256").update(normalized).digest("hex") : undefined;
}

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    undefined
  );
}

export async function sendMetaCapiEvent(input: MetaCapiEvent) {
  const value = normalizeMetaValue(input.value);
  if (value == null || !input.eventId) return { sent: false, reason: "invalid_value" as const };

  const config = await getHydratedPublicPlatformConfig();
  const pixelId = String(config.integrations.metaPixelId || process.env.NEXT_PUBLIC_META_PIXEL_ID || "").replace(/\D/g, "");
  const accessToken = process.env.META_CONVERSIONS_ACCESS_TOKEN || process.env.META_CAPI_ACCESS_TOKEN || process.env.FACEBOOK_CONVERSIONS_ACCESS_TOKEN || "";
  if (!/^\d{6,32}$/.test(pixelId) || !accessToken.trim()) {
    return { sent: false, reason: "not_configured" as const };
  }

  const userData = {
    client_ip_address: input.request ? clientIp(input.request) : undefined,
    client_user_agent: input.request?.headers.get("user-agent") || undefined,
    fbp: input.request ? readCookie(input.request, "_fbp") : undefined,
    fbc: input.request ? readCookie(input.request, "_fbc") : undefined,
    external_id: sha256(input.userId),
    em: sha256(input.email),
    ph: sha256(input.phone),
  };
  const eventSourceUrl =
    input.eventSourceUrl ||
    input.request?.headers.get("referer") ||
    input.request?.headers.get("origin") ||
    undefined;

  const response = await fetch(`https://graph.facebook.com/v20.0/${pixelId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [
        {
          event_name: input.eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: input.eventId,
          action_source: "website",
          event_source_url: eventSourceUrl,
          user_data: Object.fromEntries(Object.entries(userData).filter(([, item]) => Boolean(item))),
          custom_data: {
            value,
            currency: normalizeMetaCurrency(input.currency),
          },
        },
      ],
      access_token: accessToken,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.warn("meta_capi_event_failed", { eventName: input.eventName, status: response.status, detail: detail.slice(0, 300) });
    return { sent: false, reason: "request_failed" as const };
  }
  return { sent: true };
}

export async function sendMetaPurchaseForLibraryPayment(paymentId: string, request?: Request) {
  const prisma = getMainPrisma();
  const orders = await prisma.libraryOrder.findMany({
    where: {
      paymentId,
      status: { in: [LibraryOrderStatus.PAID, LibraryOrderStatus.FULFILLED] },
    },
    include: {
      customer: { select: { id: true, email: true, phone: true } },
    },
  });

  let sent = 0;
  for (const order of orders) {
    const metadata = order.metadata && typeof order.metadata === "object" && !Array.isArray(order.metadata)
      ? (order.metadata as Record<string, unknown>)
      : {};
    if (metadata.metaPurchaseEventSentAt) continue;
    const eventId = typeof metadata.metaPurchaseEventId === "string" && metadata.metaPurchaseEventId
      ? metadata.metaPurchaseEventId
      : `Purchase-${order.id}`;
    const result = await sendMetaCapiEvent({
      eventName: "Purchase",
      eventId,
      request,
      value: Number(order.total),
      currency: order.currency,
      userId: order.customerId,
      email: order.billingEmail || order.customer.email,
      phone: order.customer.phone,
    });
    if (!result.sent) continue;
    await prisma.libraryOrder.update({
      where: { id: order.id },
      data: {
        metadata: {
          ...metadata,
          metaPurchaseEventId: eventId,
          metaPurchaseEventSentAt: new Date().toISOString(),
        },
      },
    });
    sent += 1;
  }
  return { sent };
}
