import { created, ok, problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { recordSiteFunnelEvent } from "@/lib/analytics/site-analytics";
import { upsertSitePresence } from "@/lib/analytics/presence";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { ensureCoreProductionSchema, isDatabaseUnavailableError, isMissingSchemaError } from "@/lib/db/production-schema";

export const dynamic = "force-dynamic";

type ExitLeadBody = {
  name?: string;
  phone?: string;
  email?: string;
  helpType?: string;
  note?: string;
  productId?: string;
  productTitle?: string;
  productSlug?: string;
  surface?: string;
  path?: string;
  referrer?: string;
  visitorId?: string;
  sessionId?: string;
  deviceType?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  cartItemCount?: number;
  cartValue?: number;
  cartCurrency?: string;
  cartSummary?: Array<{ productId?: string; title?: string; quantity?: number; price?: number; formatLabel?: string }>;
};

const HELP_LABELS: Record<string, string> = {
  complete_purchase: "Help me complete the purchase",
  payment_proof: "I need payment/proof upload help",
  choose_format: "Help me choose the right format",
  ask_question: "I have a question first",
};

function clip(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function decodeHeaderValue(value: string | null) {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function POST(request: Request) {
  let body: ExitLeadBody;
  try {
    body = await request.json();
  } catch {
    return problem(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const name = clip(body.name, 120);
  const phone = clip(body.phone, 40);
  const email = clip(body.email, 160).toLowerCase();
  if (!name || !phone || !email || !email.includes("@")) {
    return problem(400, "MISSING_CONTACT", "Name, phone number, and a valid email are required.");
  }

  const visitorId = clip(body.visitorId, 64);
  const sessionId = clip(body.sessionId, 64);
  const path = clip(body.path, 320) || "/library";
  const productId = clip(body.productId, 64) || null;
  const productTitle = clip(body.productTitle, 200) || "HouseLink Library guide";
  const productSlug = clip(body.productSlug, 180);
  const helpType = HELP_LABELS[clip(body.helpType, 60)] ? clip(body.helpType, 60) : "complete_purchase";
  const cartSummary = Array.isArray(body.cartSummary)
    ? body.cartSummary.slice(0, 12).map((row) => ({
        productId: clip(row.productId, 64),
        title: clip(row.title, 180),
        quantity: Math.max(0, Math.min(99, Math.round(Number(row.quantity) || 0))),
        price: Math.max(0, Math.min(100000, Number(row.price) || 0)),
        formatLabel: row.formatLabel ? clip(row.formatLabel, 80) : undefined,
      }))
    : [];
  const metadata = {
    source: "library_exit_capture",
    helpType,
    helpLabel: HELP_LABELS[helpType],
    note: clip(body.note, 500) || undefined,
    productTitle,
    productSlug: productSlug || undefined,
    surface: clip(body.surface, 40) || "library",
    cartItemCount: Math.max(0, Math.min(999, Math.round(Number(body.cartItemCount) || 0))),
    cartValue: Math.max(0, Math.min(1000000, Number(body.cartValue) || 0)),
    cartCurrency: clip(body.cartCurrency, 8) || undefined,
  };
  const message = [
    "[Exit intent lead]",
    `Product: ${productTitle}${productSlug ? ` (${productSlug})` : ""}`,
    `Help requested: ${HELP_LABELS[helpType]}`,
    `Current page: ${path}`,
    metadata.note ? `Note: ${metadata.note}` : "",
    cartSummary.length ? `Cart: ${cartSummary.map((item) => `${item.quantity}x ${item.title}`).join("; ")}` : "",
  ].filter(Boolean).join("\n");

  const userId = getSessionUserIdFromRequest(request) ?? undefined;
  const geo = {
    country: request.headers.get("x-vercel-ip-country") || undefined,
    region: decodeHeaderValue(request.headers.get("x-vercel-ip-country-region")),
    city: decodeHeaderValue(request.headers.get("x-vercel-ip-city")),
  };

  const presence = visitorId && sessionId
    ? upsertSitePresence({
        visitorId,
        sessionId,
        path,
        title: productTitle,
        deviceType: clip(body.deviceType, 32) || undefined,
        userId,
        productId: productId || undefined,
        productTitle,
        cartItemCount: metadata.cartItemCount,
        cartValue: metadata.cartValue,
        cartCurrency: metadata.cartCurrency,
        cartSummary,
        referrer: clip(body.referrer, 320) || undefined,
        utmSource: clip(body.utmSource, 80) || undefined,
        utmCampaign: clip(body.utmCampaign, 120) || undefined,
        contactEmail: email,
        contactPhone: phone,
        ...geo,
      }).catch(() => ({ ok: false }))
    : Promise.resolve({ ok: false });

  const funnel = visitorId
    ? recordSiteFunnelEvent({
        visitorId,
        sessionId: sessionId || undefined,
        name: "library_exit_lead_captured",
        path,
        target: productId || productSlug || "library_exit_capture",
        deviceType: clip(body.deviceType, 32) || undefined,
        referrer: clip(body.referrer, 320) || undefined,
        userId,
        metadata,
      }).catch(() => ({ id: null }))
    : Promise.resolve({ id: null });

  if (!isPostgresStoreEnabled()) {
    await Promise.all([presence, funnel]);
    return ok({ id: null, status: "ACCEPTED" });
  }

  try {
    await ensureCoreProductionSchema();
    const prisma = getMainPrisma();
    const row = await prisma.libraryQuoteRequest.create({
      data: {
        productId,
        email,
        name,
        phone,
        company: null,
        quantity: 1,
        formatType: "EXIT_LEAD",
        message,
        status: "NEW",
      },
    });
    await Promise.all([presence, funnel]);
    return created({ id: row.id, status: "NEW" });
  } catch (error) {
    await Promise.all([presence, funnel]);
    if (isMissingSchemaError(error) || isDatabaseUnavailableError(error)) {
      return ok({ id: null, status: "ACCEPTED", stored: false });
    }
    throw error;
  }
}
