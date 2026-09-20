import { created, problem } from "@/lib/api/response";
import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { recordSiteFunnelEvent } from "@/lib/analytics/site-analytics";
import { upsertSitePresence } from "@/lib/analytics/presence";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { ensureCoreProductionSchema, ensureLibraryLeadProductionSchema, isDatabaseUnavailableError, isMissingSchemaError } from "@/lib/db/production-schema";
import { NotificationChannel, NotificationStatus, Role } from "@prisma/client";
import { normalizeLeadPhone } from "@/lib/library/lead-contact";
import { checkRateLimit, getClientIp } from "@/lib/api/request-meta";
import { logLibraryActivity } from "@/lib/library/repository";
import { getHydratedRuntimePlatformSettings } from "@/lib/settings/runtime";
import { sendSmtpPlainEmail } from "@/lib/integrations/smtp";
import { after } from "next/server";

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
  const rate = checkRateLimit(`library-exit-lead:${getClientIp(request)}`, 4);
  if (!rate.allowed) return problem(429, "RATE_LIMITED", "Too many requests. Please try again shortly.", { retryAfterSec: rate.retryAfterSec });
  let body: ExitLeadBody;
  try {
    body = await request.json();
  } catch {
    return problem(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const name = clip(body.name, 120);
  const phone = clip(body.phone, 40);
  const email = clip(body.email, 160).toLowerCase();
  if (!name || !phone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return problem(400, "MISSING_CONTACT", "Name, phone number, and a valid email are required.");
  }

  const visitorId = clip(body.visitorId, 64);
  const sessionId = clip(body.sessionId, 64);
  const recordFailure = async (reason: string) => {
    if (!visitorId) return;
    await recordSiteFunnelEvent({ visitorId, sessionId: sessionId || undefined, name: "library_exit_lead_failed", path: clip(body.path, 320) || "/library", metadata: { reason } }).catch(() => null);
  };
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
    `Source: ${metadata.surface}`,
    metadata.note ? `Note: ${metadata.note}` : "",
    cartSummary.length ? `Cart: ${cartSummary.map((item) => `${item.quantity}x ${item.title}`).join("; ")}` : "",
    metadata.cartItemCount ? `Bag: ${metadata.cartItemCount} item(s), ${metadata.cartCurrency || "USD"} ${metadata.cartValue.toFixed(2)}` : "",
  ].filter(Boolean).join("\n");

  const userId = getSessionUserIdFromRequest(request) ?? undefined;
  const geo = {
    country: request.headers.get("x-vercel-ip-country") || undefined,
    region: decodeHeaderValue(request.headers.get("x-vercel-ip-country-region")),
    city: decodeHeaderValue(request.headers.get("x-vercel-ip-city")),
  };

  const presence = () => visitorId && sessionId
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

  const funnel = () => visitorId
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
    await recordFailure("storage_unavailable");
    return problem(503, "LEAD_STORAGE_UNAVAILABLE", "We could not save your details. Please try again later or contact us directly.");
  }

  try {
    await ensureCoreProductionSchema();
    await ensureLibraryLeadProductionSchema();
    const prisma = getMainPrisma();
    const contactWindow = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentContactLeads = await prisma.libraryQuoteRequest.findMany({
      where: { formatType: "EXIT_LEAD", createdAt: { gte: contactWindow }, OR: [{ email }, { phoneDigits: normalizeLeadPhone(phone) }] },
      select: { id: true, productId: true, createdAt: true },
      orderBy: { createdAt: "desc" }, take: 6,
    });
    const repeat = recentContactLeads.find((lead) => lead.productId === productId && lead.createdAt.getTime() > Date.now() - 2 * 60 * 1000);
    if (repeat) return created({ id: repeat.id, status: "NEW", duplicate: true });
    if (recentContactLeads.length >= 5) {
      await recordFailure("contact_rate_limited");
      return problem(429, "CONTACT_RATE_LIMITED", "Please contact HouseLink support if you still need help.");
    }
    const row = await prisma.$transaction(async (tx) => {
      const lead = await tx.libraryQuoteRequest.create({ data: {
        productId,
        email,
        name,
        phone,
        phoneDigits: normalizeLeadPhone(phone),
        company: null,
        quantity: 1,
        formatType: "EXIT_LEAD",
        message,
        helpType,
        sourceSurface: metadata.surface,
        sourcePath: path,
        customerNote: metadata.note || null,
        status: "NEW",
      } });
      await tx.libraryActivity.create({ data: { targetType: "quote_request", targetId: lead.id, action: "EXIT_LEAD_CREATED", message: `Library help requested for ${productTitle}.`, metadata: { helpType, surface: metadata.surface, productId } } });
      return lead;
    });
    let admins: Array<{ id: string }> = [];
    try {
      admins = await prisma.user.findMany({
        where: { accountStatus: "ACTIVE", OR: [{ roles: { has: Role.ADMIN } }, { roles: { has: Role.SUPER_ADMIN } }] },
        select: { id: true },
      });
      if (admins.length) await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          channel: NotificationChannel.PUSH,
          status: NotificationStatus.QUEUED,
          subject: "New Library lead",
          body: `${name} · ${productTitle} · lead:${row.id}`,
        })),
      });
    } catch (notificationError) {
      console.error("[library/exit-lead] admin notification failed", notificationError);
      await logLibraryActivity({ targetType: "quote_request", targetId: row.id, action: "EXIT_LEAD_NOTIFICATION_FAILED", message: "Admin notification could not be delivered." }).catch(() => null);
    }
    after(async () => {
      await Promise.all([
        presence(),
        funnel(),
      ]);
      if (process.env.LIBRARY_LEAD_EMAIL_ALERTS === "1" && admins.length) {
        try {
          const platform = await getHydratedRuntimePlatformSettings();
          const sent = await Promise.all(admins.map(async (admin) => {
            const recipient = await prisma.user.findUnique({ where: { id: admin.id }, select: { email: true } });
            return recipient?.email ? sendSmtpPlainEmail(platform.integrations, recipient.email, "New Library lead", `${name} requested help with ${productTitle}.\n\nOpen: /dashboard/admin/library?libraryView=Leads&leadId=${row.id}`) : null;
          }));
          if (sent.some((result) => result && !result.ok)) throw new Error("One or more email alerts failed");
        } catch (error) {
          console.error("[library/exit-lead] email alert failed", error);
          await logLibraryActivity({ targetType: "quote_request", targetId: row.id, action: "EXIT_LEAD_NOTIFICATION_FAILED", message: "One or more email alerts could not be delivered." }).catch(() => null);
        }
      }
    });
    return created({ id: row.id, status: "NEW" });
  } catch (error) {
    if (isMissingSchemaError(error) || isDatabaseUnavailableError(error)) {
      await recordFailure("storage_unavailable");
      return problem(503, "LEAD_STORAGE_UNAVAILABLE", "We could not save your details. Please try again later or contact us directly.");
    }
    await recordFailure("unexpected_error");
    throw error;
  }
}
