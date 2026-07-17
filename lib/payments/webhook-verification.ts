import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentGatewayConfig } from "@/lib/settings/types";

type VerificationResult =
  | { ok: true; eventName: string; body: Record<string, unknown> }
  | { ok: false; reason: string; body: Record<string, unknown> };

function constantTimeEqual(a: string, b: string) {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

function sign(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function parseJson(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function eventNameFrom(body: Record<string, unknown>) {
  if (typeof body.event === "string") return body.event;
  if (typeof body.type === "string") return body.type;
  if (typeof body.status === "string") return body.status;
  return "payment.notification";
}

function verifyStripeSignature(rawBody: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    }),
  );
  if (!parts.t || !parts.v1) return false;
  return constantTimeEqual(sign(secret, `${parts.t}.${rawBody}`), parts.v1);
}

function verifyGenericSignature(request: Request, rawBody: string, secret: string) {
  const signature =
    request.headers.get("x-houselink-signature") ??
    request.headers.get("x-paynow-signature") ??
    request.headers.get("x-webhook-signature");
  return Boolean(signature && constantTimeEqual(sign(secret, rawBody), signature));
}

export async function verifyPaymentWebhook(
  request: Request,
  gateway: PaymentGatewayConfig,
  requireSignature: boolean,
): Promise<VerificationResult> {
  const rawBody = await request.text();
  const body = parseJson(rawBody);

  if (!requireSignature) {
    return { ok: true, eventName: eventNameFrom(body), body };
  }

  if (!gateway.secretKey) {
    return { ok: false, reason: "missing_webhook_secret", body };
  }

  const valid =
    gateway.id === "stripe"
      ? verifyStripeSignature(rawBody, request.headers.get("stripe-signature"), gateway.secretKey)
      : verifyGenericSignature(request, rawBody, gateway.secretKey);

  if (!valid) {
    return { ok: false, reason: "invalid_signature", body };
  }

  return { ok: true, eventName: eventNameFrom(body), body };
}
