import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { ensureCoreProductionSchema, isDatabaseUnavailableError, isMissingSchemaError } from "@/lib/db/production-schema";
import { getSiteAnalyticsReport, isInternalAnalyticsPath, siteAnalyticsReportToCsv } from "@/lib/analytics/site-analytics";
import { listLivePresence } from "@/lib/analytics/presence";
import { buildTopClassAnalytics } from "@/lib/analytics/topclass";
import { getHydratedRuntimePlatformSettings } from "@/lib/settings/runtime";

type Meta = Record<string, unknown>;

function asMeta(value: unknown): Meta {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Meta) : {};
}

function metaStr(meta: Meta, ...keys: string[]) {
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function metaNum(meta: Meta, ...keys: string[]) {
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return 0;
}

function looksLikeProductId(value: string) {
  const v = value.trim();
  // Prisma/CUID-style ids and bare slug-less opaque tokens should never display as titles.
  return /^c[a-z0-9]{20,}$/i.test(v) || (/^[a-z0-9_-]{16,}$/i.test(v) && !/\s/.test(v) && v === v.toLowerCase());
}

function productKey(target: string | null | undefined, meta: Meta) {
  const fromMeta = metaStr(meta, "productId", "id");
  if (fromMeta) return fromMeta;
  const targetValue = target?.trim() || "";
  if (targetValue && (looksLikeProductId(targetValue) || !metaStr(meta, "title", "productTitle"))) return targetValue;
  return fromMeta || targetValue || "";
}

function safeDecodePathPart(value: string) {
  try {
    return decodeURIComponent(value).toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}

function librarySlugFromPath(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw, "https://www.houselink.co.zw");
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[0] === "library" && parts[1] && parts[1] !== "checkout" ? safeDecodePathPart(parts[1]) : "";
  } catch {
    const parts = raw.split("?")[0]?.split("#")[0]?.split("/").filter(Boolean) ?? [];
    return parts[0] === "library" && parts[1] && parts[1] !== "checkout" ? safeDecodePathPart(parts[1]) : "";
  }
}

function productTitle(target: string | null | undefined, meta: Meta, catalogTitle?: string) {
  const fromMeta = metaStr(meta, "title", "productTitle");
  if (fromMeta && !looksLikeProductId(fromMeta)) return fromMeta;
  if (catalogTitle?.trim()) return catalogTitle.trim();
  const targetValue = target?.trim() || "";
  if (targetValue && !looksLikeProductId(targetValue)) return targetValue;
  return catalogTitle?.trim() || "Unknown product";
}

function resolveDisplayTitle(title: string, productId: string, catalogTitles: Map<string, string>) {
  const catalog = catalogTitles.get(productId)?.trim();
  if (catalog) return catalog;
  if (title && !looksLikeProductId(title) && title !== "Unknown product") return title;
  return catalog || "Unknown product";
}

function normalizeTitleKey(value: string | null | undefined) {
  return String(value || "")
    .replace(/\s*[|–-]\s*HouseLink.*$/i, "")
    .replace(/\s*[|–-]\s*Library.*$/i, "")
    .trim()
    .toLowerCase();
}

function cleanUrlPath(path: string | null | undefined) {
  const raw = String(path || "/").trim() || "/";
  try {
    const url = raw.startsWith("http") ? new URL(raw) : new URL(raw, "https://www.houselink.co.zw");
    return `${url.pathname}${url.search}`;
  } catch {
    return raw.split("#")[0] || "/";
  }
}

function readablePageName(path: string | null | undefined, title?: string | null) {
  const clean = cleanUrlPath(path);
  const pageTitle = String(title || "")
    .replace(/\s*[|–-]\s*HouseLink.*$/i, "")
    .replace(/\s*[|–-]\s*Library.*$/i, "")
    .trim();
  if (pageTitle && !/^HouseLink Zimbabwe$/i.test(pageTitle)) return pageTitle;
  const pathname = clean.split("?")[0] || "/";
  if (pathname === "/") return "Homepage";
  if (pathname === "/library") return "Library storefront";
  if (pathname === "/library/checkout") return "Library checkout";
  if (pathname === "/dashboard/my-library") return "My Library";
  if (pathname.startsWith("/library/")) return `Library product: ${decodeSlug(pathname.replace("/library/", ""))}`;
  if (pathname === "/search") return "Property search";
  if (pathname.startsWith("/listings/")) return `Listing: ${decodeSlug(pathname.replace("/listings/", ""))}`;
  if (pathname.startsWith("/blog/")) return `Blog: ${decodeSlug(pathname.replace("/blog/", ""))}`;
  return decodeSlug(pathname.replace(/^\/+/, "") || "Page");
}

function decodeSlug(value: string) {
  return value
    .split("?")[0]
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function sourceLabel(row: { utmSource?: string | null; utmCampaign?: string | null; referrer?: string | null }) {
  const source = row.utmSource?.trim();
  const campaign = row.utmCampaign?.trim();
  if (source && campaign) return `${source} · ${campaign}`;
  if (source) return source;
  const referrer = row.referrer?.trim();
  if (!referrer) return "Direct / unknown";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return host || "Referral";
  } catch {
    return referrer.length > 42 ? `${referrer.slice(0, 42)}...` : referrer;
  }
}

function locationLabel(row: { city?: string | null; region?: string | null; country?: string | null }) {
  const parts = [row.city, row.region, row.country].map((part) => part?.trim()).filter(Boolean);
  return parts.length ? parts.join(", ") : "Location unavailable";
}

function formatLiveStepName(name: string) {
  if (name === "page_view") return "Viewed page";
  if (name === "library_checkout_started") return "Started Library checkout";
  if (name === "library_cart_added" || name === "library_bundle_added") return "Added to bag";
  if (name === "library_cart_removed") return "Removed from bag";
  if (name === "library_cart_qty_changed") return "Changed bag quantity";
  if (name === "library_purchase_completed") return "Placed Library order";
  if (name === "library_sample_opened") return "Opened sample";
  if (name === "library_sample_viewed") return "Viewed sample";
  if (name === "library_sample_downloaded") return "Downloaded sample";
  if (name === "library_exit_intent_shown") return "Exit help shown";
  if (name === "library_exit_intent_dismissed") return "Dismissed exit help";
  if (name === "library_exit_lead_captured") return "Exit details captured";
  if (name === "whatsapp_click") return "Clicked WhatsApp";
  return name.replace(/^library_/, "").replaceAll("_", " ");
}

function liveLeadStatus(row: { path: string; cartItemCount: number; cartValue: number; userId: string | null }, purchased: boolean) {
  if (purchased) return { label: "Order placed", tone: "success" };
  if (row.path.includes("/library/checkout") && row.cartItemCount > 0) return { label: "Hot lead: checkout", tone: "hot" };
  if (row.cartItemCount > 0 && row.cartValue >= 40) return { label: "High-value bag", tone: "hot" };
  if (row.cartItemCount > 0) return { label: "Open bag", tone: "warm" };
  if (row.path.startsWith("/library")) return { label: "Library browsing", tone: "info" };
  if (row.userId) return { label: "Known visitor", tone: "info" };
  return { label: "Browsing", tone: "neutral" };
}

function createJourneyRow(input: {
  sessionId: string;
  visitorId: string;
  userId: string | null;
  at: Date;
  path: string;
  title: string;
  deviceType?: string;
  referrer?: string;
  utmSource?: string;
  utmCampaign?: string;
  contactEmail?: string;
  contactPhone?: string;
}): JourneyRow {
  const startedAt = input.at.toISOString();
  const currentPageLabel = readablePageName(input.path, input.title);
  return {
    sessionId: input.sessionId,
    visitorId: input.visitorId,
    userId: input.userId,
    startedAt,
    endedAt: startedAt,
    durationMinutes: 0,
    steps: [],
    whatsappAssisted: false,
    purchased: false,
    deviceType: input.deviceType || "unknown",
    source: sourceLabel({ utmSource: input.utmSource, utmCampaign: input.utmCampaign, referrer: input.referrer }),
    location: "Location unavailable",
    landingPage: currentPageLabel,
    currentPageLabel,
    productTitle: input.title !== "Unknown product" ? input.title : "",
    productPath: productPathFrom(input.path),
    identityLabel: "Guest visitor",
    contactEmail: input.contactEmail || "",
    contactPhone: input.contactPhone || "",
    contactStatus: "Anonymous",
    leadStatus: { label: "Browsing", tone: "neutral" },
    intentScore: 0,
    nextAction: { label: "Keep watching", detail: "No clear sales action yet.", kind: "observe" },
    followUp: { message: "", emailSubject: "", emailBody: "" },
    summary: "Visitor activity is still building.",
    filters: [],
    debug: { visitorId: input.visitorId, sessionId: input.sessionId, userId: input.userId, landingPath: cleanUrlPath(input.path) },
  };
}

function updateJourneyContext(
  journey: JourneyRow,
  input: {
    at: Date;
    name: string;
    path: string;
    title: string;
    deviceType?: string;
    referrer?: string;
    utmSource?: string;
    utmCampaign?: string;
    contactEmail?: string;
    contactPhone?: string;
  },
) {
  const at = input.at.toISOString();
  if (at < journey.startedAt) {
    journey.startedAt = at;
    journey.landingPage = readablePageName(input.path, input.title);
    journey.debug.landingPath = cleanUrlPath(input.path);
  }
  if (at > journey.endedAt) {
    journey.endedAt = at;
    journey.currentPageLabel = readablePageName(input.path, input.title);
  }
  if ((!journey.deviceType || journey.deviceType === "unknown") && input.deviceType) journey.deviceType = input.deviceType;
  const source = sourceLabel({ utmSource: input.utmSource, utmCampaign: input.utmCampaign, referrer: input.referrer });
  if (source !== "Direct / unknown") journey.source = source;
  if (!journey.contactEmail && input.contactEmail) journey.contactEmail = input.contactEmail;
  if (!journey.contactPhone && input.contactPhone) journey.contactPhone = input.contactPhone;
  if (input.title && input.title !== "Unknown product") journey.productTitle = input.title;
  const path = productPathFrom(input.path);
  if (path) journey.productPath = path;
  if (input.name === "whatsapp_click") journey.whatsappAssisted = true;
  if (input.name === "library_purchase_completed") journey.purchased = true;
}

function productPathFrom(path: string | null | undefined) {
  const clean = cleanUrlPath(path).split("?")[0];
  if (!clean.startsWith("/library/")) return "";
  if (["/library/checkout", "/library/claim"].includes(clean)) return "";
  return clean;
}

function publicProductUrl(path: string) {
  return path ? `https://www.houselink.co.zw${path}` : "https://www.houselink.co.zw/library";
}

async function fetchJourneyPresenceRows(sessionIds: string[], visitorIds: string[]) {
  const clauses: string[] = [];
  const params: string[] = [];
  if (sessionIds.length) {
    clauses.push(`"sessionId" IN (${sessionIds.map((_, index) => `$${params.length + index + 1}`).join(", ")})`);
    params.push(...sessionIds);
  }
  if (visitorIds.length) {
    clauses.push(`"visitorId" IN (${visitorIds.map((_, index) => `$${params.length + index + 1}`).join(", ")})`);
    params.push(...visitorIds);
  }
  if (!clauses.length) return [];
  try {
    return await getMainPrisma().$queryRawUnsafe<
      Array<{
        visitorId: string;
        sessionId: string;
        path: string;
        title: string | null;
        deviceType: string | null;
        userId: string | null;
        productTitle: string | null;
        referrer: string | null;
        utmSource: string | null;
        utmCampaign: string | null;
        contactEmail: string | null;
        contactPhone: string | null;
        country: string | null;
        region: string | null;
        city: string | null;
        lastSeenAt: Date;
      }>
    >(
      `
      SELECT
        "visitorId", "sessionId", "path", "title", "deviceType", "userId", "productTitle",
        "referrer", "utmSource", "utmCampaign", "contactEmail", "contactPhone",
        "country", "region", "city", "lastSeenAt"
      FROM "SitePresence"
      WHERE ${clauses.join(" OR ")}
      ORDER BY "lastSeenAt" DESC
      LIMIT 300
      `,
      ...params,
    );
  } catch (error) {
    if (isMissingSchemaError(error) || isDatabaseUnavailableError(error)) return [];
    throw error;
  }
}

function applyPresenceToJourney(journey: JourneyRow, row: Awaited<ReturnType<typeof fetchJourneyPresenceRows>>[number]) {
  if (row.userId && !journey.userId) journey.userId = row.userId;
  if ((!journey.deviceType || journey.deviceType === "unknown") && row.deviceType) journey.deviceType = row.deviceType;
  if (!journey.contactEmail && row.contactEmail) journey.contactEmail = row.contactEmail;
  if (!journey.contactPhone && row.contactPhone) journey.contactPhone = row.contactPhone;
  if (!journey.productTitle && row.productTitle) journey.productTitle = row.productTitle;
  const productPath = productPathFrom(row.path);
  if (productPath) journey.productPath = productPath;
  const source = sourceLabel(row);
  if (source !== "Direct / unknown") journey.source = source;
  const location = locationLabel(row);
  if (location !== "Location unavailable") journey.location = location;
  const lastSeenAt = row.lastSeenAt instanceof Date ? row.lastSeenAt.toISOString() : new Date(row.lastSeenAt).toISOString();
  if (lastSeenAt > journey.endedAt) {
    journey.endedAt = lastSeenAt;
    journey.currentPageLabel = readablePageName(row.path, row.title || row.productTitle);
  }
}

function finalizeJourneyRow(journey: JourneyRow, user?: { name: string | null; email: string | null; phone: string | null } | null): JourneyRow {
  const steps = [...journey.steps]
    .sort((a, b) => a.at.localeCompare(b.at))
    .filter((step, index, rows) => index === 0 || recentStepKey(step) !== recentStepKey(rows[index - 1]))
    .slice(-25);
  const names = new Set(steps.map((step) => step.name));
  const viewedProduct = names.has("library_product_viewed");
  const openedSample = names.has("library_sample_opened") || names.has("library_sample_viewed") || names.has("library_sample_downloaded");
  const downloadedSample = names.has("library_sample_downloaded");
  const capturedExitLead = names.has("library_exit_lead_captured");
  const addedCart = names.has("library_cart_added") || names.has("library_bundle_added");
  const startedCheckout = names.has("library_checkout_started") || steps.some((step) => /checkout/i.test(step.detail));
  const uploadedProof = names.has("library_proof_uploaded");
  const placedOrder = journey.purchased || names.has("library_purchase_completed");
  const clickedWhatsapp = journey.whatsappAssisted || names.has("whatsapp_click");
  const lastStep = steps[steps.length - 1];
  const productTitle = journey.productTitle || steps.find((step) => step.name !== "page_view" && step.detail)?.detail || "";
  const contactEmail = user?.email || journey.contactEmail || "";
  const contactPhone = user?.phone || journey.contactPhone || "";
  const identityLabel = user?.name?.trim() || (contactEmail ? contactEmail.split("@")[0] : journey.userId ? "Known buyer" : "Guest visitor");
  const contactStatus = contactPhone
    ? "Phone captured"
    : contactEmail
      ? "Email captured, phone missing"
      : startedCheckout
        ? "Checkout contact not captured yet"
        : "Anonymous";
  const score =
    (viewedProduct ? 15 : 0) +
    (openedSample ? 20 : 0) +
    (downloadedSample ? 10 : 0) +
    (addedCart ? 25 : 0) +
    (startedCheckout ? 30 : 0) +
    (clickedWhatsapp ? 15 : 0) +
    (capturedExitLead ? 35 : 0) +
    (contactEmail || contactPhone ? 15 : 0) +
    (placedOrder ? 40 : 0);
  const leadStatus: JourneyLeadStatus = placedOrder
    ? { label: "Order placed", tone: "success" }
    : capturedExitLead
      ? { label: "Hot: exit details captured", tone: "hot" }
    : startedCheckout && !uploadedProof
      ? { label: "Hot: checkout follow-up", tone: "hot" }
      : addedCart
        ? { label: "Warm: bag interest", tone: "warm" }
        : openedSample
          ? { label: "Warm: sample viewed", tone: "warm" }
          : viewedProduct
            ? { label: "Library browsing", tone: "info" }
            : { label: "Browsing", tone: "neutral" };
  const nextAction = journeyNextAction({
    placedOrder,
    uploadedProof,
    startedCheckout,
    addedCart,
    openedSample,
    downloadedSample,
    capturedExitLead,
    clickedWhatsapp,
    contactEmail,
    contactPhone,
    productTitle,
    productUrl: publicProductUrl(journey.productPath),
  });
  const followUp = buildJourneyFollowUp({
    placedOrder,
    uploadedProof,
    startedCheckout,
    addedCart,
    openedSample,
    downloadedSample,
    capturedExitLead,
    clickedWhatsapp,
    contactEmail,
    contactPhone,
    productTitle,
    productUrl: publicProductUrl(journey.productPath),
  });
  const filters = [
    score >= 55 ? "high-intent" : "",
    startedCheckout && !placedOrder ? "abandoned-checkout" : "",
    openedSample ? "sample-viewed" : "",
    downloadedSample ? "sample-downloaded" : "",
    capturedExitLead ? "exit-lead" : "",
    addedCart ? "cart-activity" : "",
    clickedWhatsapp ? "whatsapp" : "",
    contactEmail || contactPhone || journey.userId ? "known-contact" : "anonymous",
  ].filter(Boolean);
  const durationMinutes = Math.max(0, Math.round((new Date(journey.endedAt).getTime() - new Date(journey.startedAt).getTime()) / 60000));
  const summary = journeySummary({
    deviceType: journey.deviceType,
    source: journey.source,
    identityLabel,
    productTitle,
    currentPageLabel: journey.currentPageLabel,
    startedCheckout,
    addedCart,
    openedSample,
    capturedExitLead,
    placedOrder,
    uploadedProof,
    lastStepName: lastStep ? formatLiveStepName(lastStep.name) : "Browsed",
  });
  return {
    ...journey,
    steps,
    purchased: placedOrder,
    whatsappAssisted: clickedWhatsapp,
    durationMinutes,
    productTitle,
    productPath: journey.productPath,
    identityLabel,
    contactEmail,
    contactPhone,
    contactStatus,
    leadStatus,
    intentScore: Math.min(100, score),
    nextAction,
    followUp,
    summary,
    filters,
    debug: { ...journey.debug, userId: journey.userId },
  };
}

function journeyNextAction(input: {
  placedOrder: boolean;
  uploadedProof: boolean;
  startedCheckout: boolean;
  addedCart: boolean;
  openedSample: boolean;
  downloadedSample: boolean;
  capturedExitLead: boolean;
  clickedWhatsapp: boolean;
  contactEmail: string;
  contactPhone: string;
  productTitle: string;
  productUrl: string;
}): JourneyNextAction {
  const product = input.productTitle ? ` about ${input.productTitle}` : "";
  const followUp = buildJourneyFollowUp(input);
  if (input.placedOrder) return { label: "Review order", detail: "Order was placed; check proof/payment fulfilment if needed.", kind: "order" };
  if (input.capturedExitLead) {
    if (input.contactPhone) return { label: "WhatsApp recovered lead", detail: `Follow up while purchase intent is fresh${product}.`, href: followUp.whatsappHref, kind: "whatsapp" };
    if (input.contactEmail) return { label: "Email recovered lead", detail: `Send a helpful purchase follow-up${product}.`, href: followUp.mailtoHref, kind: "email" };
  }
  if (input.startedCheckout && !input.uploadedProof) {
    if (input.contactPhone) return { label: "WhatsApp payment help", detail: `Follow up on checkout and proof upload${product}.`, href: followUp.whatsappHref, kind: "whatsapp" };
    if (input.contactEmail) return { label: "Email proof reminder", detail: `Ask the buyer to upload proof or request help${product}.`, href: followUp.mailtoHref, kind: "email" };
    return { label: "Watch checkout recovery", detail: "Checkout began, but contact details are not yet available.", kind: "observe" };
  }
  if (input.addedCart || input.openedSample || input.downloadedSample) {
    if (input.contactPhone) return { label: "WhatsApp product help", detail: `Offer help or answer questions${product}.`, href: followUp.whatsappHref, kind: "whatsapp" };
    if (input.contactEmail) return { label: "Email product link", detail: `Send the product link or answer questions${product}.`, href: followUp.mailtoHref, kind: "email" };
  }
  if (input.clickedWhatsapp) return { label: "Check WhatsApp inbox", detail: "Visitor clicked WhatsApp; look for the matching conversation.", kind: "observe" };
  return { label: "No action yet", detail: "Low-intent browsing; keep this session for trend analysis.", kind: "observe" };
}

function buildJourneyFollowUp(input: {
  placedOrder: boolean;
  uploadedProof: boolean;
  startedCheckout: boolean;
  addedCart: boolean;
  openedSample: boolean;
  downloadedSample: boolean;
  capturedExitLead: boolean;
  clickedWhatsapp: boolean;
  contactEmail: string;
  contactPhone: string;
  productTitle: string;
  productUrl: string;
}): JourneyFollowUp {
  const product = input.productTitle || "the HouseLink Library guide you were viewing";
  const greeting = "Hi, I hope you are well.";
  const productLine = `I noticed you were interested in ${product} on HouseLink Library.`;
  const valueLine =
    "It is a practical Zimbabwe-focused resource built to help property professionals make better decisions around land, approvals, compliance, legal documents, project planning, and risk management.";
  const linkLine = `You can return to it here: ${input.productUrl}`;
  let intentLine = "If you have any questions before purchasing, I can help you choose the right format and complete the order.";

  if (input.capturedExitLead) {
    intentLine = "You left your details before leaving, so I wanted to follow up while the guide is still fresh. I can answer questions, help with the right format, and make checkout quick.";
  } else if (input.startedCheckout && !input.uploadedProof) {
    intentLine = "I noticed you reached checkout but payment/proof upload may not have been completed. I can help you finish the order and get access quickly.";
  } else if (input.downloadedSample) {
    intentLine = "Since you downloaded the sample, this may be a good fit for what you are researching. I can help you complete the full purchase if you would like the complete guide.";
  } else if (input.openedSample) {
    intentLine = "Since you opened the sample, I can help you unlock the full guide or answer any questions before you purchase.";
  } else if (input.addedCart) {
    intentLine = "I noticed it was added to your bag. I can help you complete checkout and make sure you receive the correct copy.";
  } else if (input.clickedWhatsapp) {
    intentLine = "You also opened WhatsApp from HouseLink, so I am happy to assist here if that is easier.";
  } else if (input.placedOrder) {
    intentLine = "Thank you for placing your order. I can help with proof confirmation, access, or the next step if needed.";
  }

  const close = "Would you like me to assist you with completing the purchase?";
  const signature = "Kind regards,\nHouseLink Zimbabwe";
  const message = [greeting, productLine, valueLine, intentLine, linkLine, close, signature].join("\n\n");
  const emailSubject = input.startedCheckout ? "Need help completing your HouseLink Library order?" : `About ${product}`;
  const emailBody = message;
  const whatsappHref = input.contactPhone ? whatsappUrl(input.contactPhone, message) : undefined;
  const mailtoHref = input.contactEmail
    ? `mailto:${encodeURIComponent(input.contactEmail)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
    : undefined;
  return { message, emailSubject, emailBody, whatsappHref, mailtoHref };
}

function journeySummary(input: {
  deviceType: string;
  source: string;
  identityLabel: string;
  productTitle: string;
  currentPageLabel: string;
  startedCheckout: boolean;
  addedCart: boolean;
  openedSample: boolean;
  capturedExitLead: boolean;
  placedOrder: boolean;
  uploadedProof: boolean;
  lastStepName: string;
}) {
  const who = input.identityLabel === "Guest visitor" ? `${input.deviceType || "Unknown"} visitor` : input.identityLabel;
  const source = input.source && input.source !== "Direct / unknown" ? ` from ${input.source}` : "";
  const product = input.productTitle ? ` for ${input.productTitle}` : ` on ${input.currentPageLabel}`;
  if (input.placedOrder) return `${who}${source} placed a Library order${product}.`;
  if (input.capturedExitLead) return `${who}${source} left contact details for Library follow-up${product}.`;
  if (input.startedCheckout && !input.uploadedProof) return `${who}${source} reached checkout${product}, but proof/payment is not complete.`;
  if (input.addedCart) return `${who}${source} added Library items to the bag${product}.`;
  if (input.openedSample) return `${who}${source} opened a sample${product}.`;
  return `${who}${source} is browsing; latest action was ${input.lastStepName.toLowerCase()}${product}.`;
}

function whatsappUrl(phone: string, message?: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return undefined;
  return message ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : `https://wa.me/${digits}`;
}

function recentStepKey(step: { at: string; name: string; detail: string }) {
  return `${step.at}:${step.name}:${step.detail}`;
}

const publicPageWhere = {
  NOT: [
    { path: { startsWith: "/dashboard/admin" } },
    { path: { startsWith: "/api/" } },
    { path: { startsWith: "/_next/" } },
    { path: { startsWith: "/maintenance" } },
    { path: "/favicon.ico" },
    { path: { startsWith: "/auth?next=%2Fdashboard%2Fadmin" } },
    { path: { startsWith: "/auth?next=/dashboard/admin" } },
    { path: { startsWith: "/auth?redirect=%2Fdashboard%2Fadmin" } },
    { path: { startsWith: "/auth?redirect=/dashboard/admin" } },
  ],
};

const publicFunnelWhere = {
  NOT: [
    { path: { startsWith: "/dashboard/admin" } },
    { path: { startsWith: "/api/" } },
    { path: { startsWith: "/_next/" } },
    { path: { startsWith: "/maintenance" } },
    { path: "/favicon.ico" },
    { path: { startsWith: "/auth?next=%2Fdashboard%2Fadmin" } },
    { path: { startsWith: "/auth?next=/dashboard/admin" } },
    { path: { startsWith: "/auth?redirect=%2Fdashboard%2Fadmin" } },
    { path: { startsWith: "/auth?redirect=/dashboard/admin" } },
    { target: { startsWith: "/dashboard/admin" } },
    { target: { startsWith: "/api/" } },
    { target: { startsWith: "/_next/" } },
    { target: { startsWith: "/maintenance" } },
    { target: "/favicon.ico" },
    { target: { startsWith: "/auth?next=%2Fdashboard%2Fadmin" } },
    { target: { startsWith: "/auth?next=/dashboard/admin" } },
    { target: { startsWith: "/auth?redirect=%2Fdashboard%2Fadmin" } },
    { target: { startsWith: "/auth?redirect=/dashboard/admin" } },
  ],
};

type AdvancedSiteAnalyticsReport = any;
type LiveJourneyStep = { at: string; name: string; detail: string };
type JourneyLeadStatus = { label: string; tone: "hot" | "warm" | "success" | "info" | "neutral" };
type JourneyNextAction = { label: string; detail: string; href?: string; kind: "whatsapp" | "email" | "order" | "observe" };
type JourneyFollowUp = { message: string; emailSubject: string; emailBody: string; whatsappHref?: string; mailtoHref?: string };
type JourneyRow = {
  sessionId: string;
  visitorId: string;
  userId: string | null;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  steps: LiveJourneyStep[];
  whatsappAssisted: boolean;
  purchased: boolean;
  deviceType: string;
  source: string;
  location: string;
  landingPage: string;
  currentPageLabel: string;
  productTitle: string;
  productPath: string;
  identityLabel: string;
  contactEmail: string;
  contactPhone: string;
  contactStatus: string;
  leadStatus: JourneyLeadStatus;
  intentScore: number;
  nextAction: JourneyNextAction;
  followUp: JourneyFollowUp;
  summary: string;
  filters: string[];
  debug: { visitorId: string; sessionId: string; userId: string | null; landingPath: string };
};
const ADVANCED_REPORT_CACHE_TTL_MS = 5 * 60 * 1000;
const advancedReportCache = new Map<string, { value: AdvancedSiteAnalyticsReport; expiresAt: number }>();

export async function getAdvancedSiteAnalyticsReport(days = 30): Promise<AdvancedSiteAnalyticsReport> {
  return buildAdvancedSiteAnalyticsReport(days);
}

async function buildAdvancedSiteAnalyticsReport(days = 30): Promise<AdvancedSiteAnalyticsReport> {
  const normalizedDays = Math.max(1, Math.min(90, Math.round(days || 30)));
  const cacheKey = `advanced:${normalizedDays}`;
  const cached = advancedReportCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const base = await getSiteAnalyticsReport(days);
  const emptyAdvanced = {
    ...base,
    live: {
      online: 0,
      libraryShoppers: 0,
      onCheckout: 0,
      openBags: 0,
      bagValue: 0,
      visitors: [] as Array<{
        visitorId: string;
        path: string;
        title: string;
        deviceType: string;
        productTitle: string;
        cartItemCount: number;
        cartValue: number;
        cartCurrency: string;
        identityLabel: string;
        contactEmail: string;
        contactPhone: string;
        contactStatus: string;
        currentPageLabel: string;
        location: string;
        source: string;
        leadStatus: { label: string; tone: string };
        journey: Array<{ at: string; name: string; detail: string }>;
        debug: { visitorId: string; sessionId: string; userId: string | null; rawPath: string };
        lastSeenAt: string;
        userId: string | null;
      }>,
      alerts: [] as string[],
    },
    products: [] as Array<{
      productId: string;
      title: string;
      views: number;
      uniqueViewers: number;
      adds: number;
      removes: number;
      purchases: number;
      samples: number;
      addRate: number;
      purchaseRate: number;
      formats: Record<string, number>;
    }>,
    cartHeat: {
      mostAdded: [] as Array<{ label: string; value: number }>,
      mostRemoved: [] as Array<{ label: string; value: number }>,
    },
    cartActivity: [] as Array<{
      at: string;
      name: string;
      title: string;
      visitorId: string;
      quantity: number;
      formatLabel: string;
      path: string;
    }>,
    journeys: [] as JourneyRow[],
    revenueByProduct: [] as Array<{ label: string; value: number }>,
    revenueByFormat: [] as Array<{ label: string; value: number }>,
    revenueByChannel: [] as Array<{ label: string; value: number }>,
    proofFunnel: [] as Array<{ label: string; value: number }>,
    marketplace: [] as Array<{ label: string; value: number }>,
    engagement: [] as Array<{ label: string; value: number }>,
    cohorts: {
      newVisitors: 0,
      returningVisitors: 0,
      knownBuyersOnline: 0,
    },
    alerts: [] as string[],
    topClass: buildTopClassAnalytics({
      days: normalizedDays,
      funnels: [],
      orders: [],
      abandoned: [],
      catalog: [],
      live: [],
      pageViewsLast24h: 0,
      pageViewsPrev7dDailyAvg: 0,
      eventsLast24h: 0,
      eventsPrev7dDailyAvg: 0,
      pendingProofs: 0,
      todayRevenue: 0,
      todayOrders: 0,
    }),
  };

  if (!isPostgresStoreEnabled()) return emptyAdvanced;
  await ensureCoreProductionSchema();
  const prisma = getMainPrisma();
  const since = new Date(Date.now() - normalizedDays * 86400000);

  try {
    const dayAgo = new Date(Date.now() - 86400000);
    const eightDaysAgo = new Date(Date.now() - 8 * 86400000);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [funnels, liveRows, orders, firstViews, abandoned, catalog, productPageViews, views24h, views7d, events24h, events7d, platform] =
      await Promise.all([
        prisma.siteFunnelEvent.findMany({
          where: { createdAt: { gte: since }, ...publicFunnelWhere },
          select: {
            name: true,
            target: true,
            metadata: true,
            visitorId: true,
            sessionId: true,
            path: true,
            deviceType: true,
            referrer: true,
            userId: true,
            createdAt: true,
          },
          take: 5000,
          orderBy: { createdAt: "desc" },
        }),
        listLivePresence(5 * 60 * 1000),
        prisma.libraryOrder
          .findMany({
            where: { createdAt: { gte: since }, status: { in: ["PAID", "FULFILLED", "PENDING", "REFUNDED"] } },
            select: {
              id: true,
              orderNumber: true,
              status: true,
              total: true,
              currency: true,
              createdAt: true,
              refundedAt: true,
              customerId: true,
              couponCode: true,
              items: { select: { productId: true, title: true, quantity: true, total: true, productType: true } },
              payment: { select: { status: true, proofStatus: true, createdAt: true, updatedAt: true } },
              customer: { select: { email: true, name: true, phone: true } },
            },
            take: 5000,
          })
          .catch(() => []),
        prisma.sitePageView.groupBy({
          by: ["visitorId"],
          _min: { startedAt: true },
          where: { startedAt: { gte: new Date(Date.now() - 180 * 86400000) }, ...publicPageWhere },
        }).catch(() => []),
        prisma.libraryAbandonedCart
          .findMany({
            where: { recoveredAt: null, updatedAt: { gte: since } },
            select: {
              id: true,
              email: true,
              subtotal: true,
              currency: true,
              reminderCount: true,
              reminderSentAt: true,
              updatedAt: true,
              items: true,
            },
            take: 200,
            orderBy: { updatedAt: "desc" },
          })
          .catch(() => []),
        prisma.libraryProduct
          .findMany({
            where: { deletedAt: null },
            select: { id: true, slug: true, title: true, stock: true, lowStockThreshold: true, status: true },
            take: 500,
          })
          .catch(() => []),
        prisma.sitePageView
          .findMany({
            where: {
              startedAt: { gte: since },
              ...publicPageWhere,
              OR: [{ path: { startsWith: "/library/" } }, { path: { contains: "houselink.co.zw/library/" } }],
            },
            select: {
              visitorId: true,
              sessionId: true,
              path: true,
              title: true,
              startedAt: true,
            },
            orderBy: { startedAt: "desc" },
            take: 5000,
          })
          .catch(() => []),
        prisma.sitePageView.count({ where: { startedAt: { gte: dayAgo }, ...publicPageWhere } }).catch(() => 0),
        prisma.sitePageView.count({ where: { startedAt: { gte: eightDaysAgo, lt: dayAgo }, ...publicPageWhere } }).catch(() => 0),
        prisma.siteFunnelEvent.count({ where: { createdAt: { gte: dayAgo }, ...publicFunnelWhere } }).catch(() => 0),
        prisma.siteFunnelEvent.count({ where: { createdAt: { gte: eightDaysAgo, lt: dayAgo }, ...publicFunnelWhere } }).catch(() => 0),
        getHydratedRuntimePlatformSettings().catch(() => null),
      ]);

    const publicFunnels = funnels.filter((event) => !isInternalAnalyticsPath(event.path) && !isInternalAnalyticsPath(event.target));
    const productMap = new Map<
      string,
      {
        productId: string;
        title: string;
        views: number;
        viewers: Set<string>;
        adds: number;
        removes: number;
        purchases: number;
        samples: number;
        formats: Record<string, number>;
        viewKeys: Set<string>;
      }
    >();

    const catalogTitles = new Map(catalog.map((row) => [row.id, row.title]));
    const productAliases = new Map<string, string>();
    for (const row of catalog) {
      productAliases.set(row.id, row.id);
      if (row.slug) {
        productAliases.set(row.slug.toLowerCase(), row.id);
        productAliases.set(`/library/${row.slug}`.toLowerCase(), row.id);
      }
      const titleKey = normalizeTitleKey(row.title);
      if (titleKey) productAliases.set(titleKey, row.id);
    }

    const resolveProductId = (rawId: string, title: string, path?: string | null) => {
      const id = rawId.trim();
      if (id && catalogTitles.has(id)) return id;
      const slug = librarySlugFromPath(path || id);
      if (slug && productAliases.has(slug)) return productAliases.get(slug)!;
      if (id && productAliases.has(id.toLowerCase())) return productAliases.get(id.toLowerCase())!;
      const titleKey = normalizeTitleKey(title);
      if (titleKey && productAliases.has(titleKey)) return productAliases.get(titleKey)!;
      return id;
    };

    const ensureProduct = (id: string, title: string) => {
      if (!id) return null;
      const productId = resolveProductId(id, title);
      const resolved = resolveDisplayTitle(title, productId, catalogTitles);
      let row = productMap.get(productId);
      if (!row) {
        row = { productId, title: resolved, views: 0, viewers: new Set(), adds: 0, removes: 0, purchases: 0, samples: 0, formats: {}, viewKeys: new Set() };
        productMap.set(productId, row);
      } else if (
        resolved &&
        resolved !== "Unknown product" &&
        (row.title === "Unknown product" || looksLikeProductId(row.title) || row.title === productId)
      ) {
        row.title = resolved;
      }
      return row;
    };

    const addProductView = (id: string, title: string, visitorId: string, sessionId: string, at: Date, path?: string | null) => {
      const productId = resolveProductId(id, title, path);
      const row = ensureProduct(productId, title);
      if (!row) return;
      const bucket = Math.floor(at.getTime() / 30_000);
      const key = `${visitorId || "visitor"}:${sessionId || "session"}:${productId}:${bucket}`;
      if (row.viewKeys.has(key)) return;
      row.viewKeys.add(key);
      row.views += 1;
      row.viewers.add(visitorId);
    };

    const cartActivity: typeof emptyAdvanced.cartActivity = [];
    const addHeat = new Map<string, number>();
    const removeHeat = new Map<string, number>();
    const sessionMap = new Map<string, JourneyRow>();
    const engagementMap = new Map<string, number>();
    const marketplaceMap = new Map<string, number>();

    for (const event of publicFunnels) {
      const meta = asMeta(event.metadata);
      const rawId = productKey(event.target || event.path, meta);
      const id = resolveProductId(rawId, metaStr(meta, "title", "productTitle"), event.path || event.target);
      const title = productTitle(event.target, meta, id ? catalogTitles.get(id) : undefined);
      const format = metaStr(meta, "formatLabel", "formatType", "format") || "unknown";
      const sessionId = event.sessionId || `visitor:${event.visitorId}`;

      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, createJourneyRow({
          sessionId,
          visitorId: event.visitorId,
          userId: event.userId,
          at: event.createdAt,
          path: event.path || event.target || "",
          title,
          deviceType: event.deviceType || undefined,
          referrer: event.referrer || undefined,
          utmSource: metaStr(meta, "utmSource", "source"),
          utmCampaign: metaStr(meta, "utmCampaign", "campaign"),
          contactEmail: metaStr(meta, "email", "contactEmail"),
          contactPhone: metaStr(meta, "phone", "contactPhone"),
        }));
      }
      const journey = sessionMap.get(sessionId)!;
      updateJourneyContext(journey, {
        at: event.createdAt,
        name: event.name,
        path: event.path || event.target || "",
        title,
        deviceType: event.deviceType || undefined,
        referrer: event.referrer || undefined,
        utmSource: metaStr(meta, "utmSource", "source"),
        utmCampaign: metaStr(meta, "utmCampaign", "campaign"),
        contactEmail: metaStr(meta, "email", "contactEmail"),
        contactPhone: metaStr(meta, "phone", "contactPhone"),
      });
      if (event.createdAt.toISOString() < journey.startedAt) journey.startedAt = event.createdAt.toISOString();
      if (event.userId) journey.userId = event.userId;
      const detail = title !== "Unknown product" ? title : event.path || event.target || "";
      if (journey.steps.length < 40) {
        journey.steps.push({ at: event.createdAt.toISOString(), name: event.name, detail });
      }
      if (event.name === "whatsapp_click") journey.whatsappAssisted = true;
      if (event.name === "library_purchase_completed") journey.purchased = true;

      if (event.name === "library_product_viewed" && id) {
        addProductView(id, title, event.visitorId, event.sessionId || "", event.createdAt, event.path || event.target);
      }
      if ((event.name === "library_cart_added" || event.name === "library_bundle_added") && id) {
        const row = ensureProduct(id, title);
        if (row) {
          row.adds += 1;
          row.formats[format] = (row.formats[format] ?? 0) + 1;
        }
        addHeat.set(title, (addHeat.get(title) ?? 0) + 1);
        if (cartActivity.length < 80) {
          cartActivity.push({
            at: event.createdAt.toISOString(),
            name: event.name,
            title,
            visitorId: event.visitorId,
            quantity: metaNum(meta, "quantity", "qty") || 1,
            formatLabel: format,
            path: event.path || "",
          });
        }
      }
      if (event.name === "library_cart_removed" && id) {
        const row = ensureProduct(id, title);
        if (row) row.removes += 1;
        removeHeat.set(title, (removeHeat.get(title) ?? 0) + 1);
        if (cartActivity.length < 80) {
          cartActivity.push({
            at: event.createdAt.toISOString(),
            name: event.name,
            title,
            visitorId: event.visitorId,
            quantity: metaNum(meta, "quantity", "qty") || 1,
            formatLabel: format,
            path: event.path || "",
          });
        }
      }
      if (event.name === "library_sample_opened" && id) {
        const row = ensureProduct(id, title);
        if (row) row.samples += 1;
        engagementMap.set("sample opens", (engagementMap.get("sample opens") ?? 0) + 1);
      }
      if (event.name === "library_scroll_depth") {
        engagementMap.set("scroll depth pings", (engagementMap.get("scroll depth pings") ?? 0) + 1);
      }
      if (event.name === "library_download_started") engagementMap.set("download starts", (engagementMap.get("download starts") ?? 0) + 1);
      if (event.name === "library_download_completed") engagementMap.set("download completes", (engagementMap.get("download completes") ?? 0) + 1);
      if (event.name === "library_review_submitted") engagementMap.set("reviews submitted", (engagementMap.get("reviews submitted") ?? 0) + 1);
      if (event.name === "library_bundle_shown") engagementMap.set("bundle rails shown", (engagementMap.get("bundle rails shown") ?? 0) + 1);
      if (event.name === "gallery_opened") engagementMap.set("gallery opens", (engagementMap.get("gallery opens") ?? 0) + 1);

      if (event.name === "listing_viewed") marketplaceMap.set("listing views", (marketplaceMap.get("listing views") ?? 0) + 1);
      if (event.name === "enquiry_started") marketplaceMap.set("enquiries started", (marketplaceMap.get("enquiries started") ?? 0) + 1);
      if (event.name === "enquiry_completed") marketplaceMap.set("enquiries completed", (marketplaceMap.get("enquiries completed") ?? 0) + 1);
      if (event.name === "search_submitted") marketplaceMap.set("searches", (marketplaceMap.get("searches") ?? 0) + 1);
      if (event.name === "saved_listing") marketplaceMap.set("saved listings", (marketplaceMap.get("saved listings") ?? 0) + 1);
      if (event.name === "whatsapp_click") marketplaceMap.set("whatsapp clicks", (marketplaceMap.get("whatsapp clicks") ?? 0) + 1);
    }

    for (const pageView of productPageViews) {
      const slug = librarySlugFromPath(pageView.path);
      if (!slug) continue;
      const id = resolveProductId(slug, pageView.title || "", pageView.path);
      const title = productTitle(pageView.path, { title: pageView.title || "" }, id ? catalogTitles.get(id) : undefined);
      addProductView(id, title, pageView.visitorId, pageView.sessionId, pageView.startedAt, pageView.path);
    }

    const revenueByProduct = new Map<string, number>();
    const revenueByFormat = new Map<string, number>();
    let awaitingPay = 0;
    let proofUploaded = 0;
    let paid = 0;
    let rejected = 0;

    for (const order of orders) {
      const paymentStatus = String(order.payment?.status || "").toUpperCase();
      const proofStatus = String(order.payment?.proofStatus || "").toUpperCase();
      if (paymentStatus === "PAID" || order.status === "PAID" || order.status === "FULFILLED") paid += 1;
      else if (proofStatus === "UPLOADED") proofUploaded += 1;
      else if (proofStatus === "REJECTED") rejected += 1;
      else awaitingPay += 1;

      if (paymentStatus !== "PAID" && order.status !== "PAID" && order.status !== "FULFILLED") continue;
      for (const item of order.items) {
        const title = resolveDisplayTitle(item.title || "", item.productId, catalogTitles);
        revenueByProduct.set(title, (revenueByProduct.get(title) ?? 0) + Number(item.total || 0));
        const format = item.productType === "PRINTED_BOOK" ? "printed" : "digital";
        revenueByFormat.set(format, (revenueByFormat.get(format) ?? 0) + Number(item.total || 0));
        const row = ensureProduct(item.productId, title);
        if (row) row.purchases += item.quantity || 1;
      }
    }

    const products = [...productMap.values()]
      .map((row) => ({
        productId: row.productId,
        title: resolveDisplayTitle(row.title, row.productId, catalogTitles),
        views: row.views,
        uniqueViewers: row.viewers.size,
        adds: row.adds,
        removes: row.removes,
        purchases: row.purchases,
        samples: row.samples,
        addRate: row.views ? Math.round((row.adds / row.views) * 100) : 0,
        purchaseRate: row.views ? Math.round((row.purchases / row.views) * 100) : 0,
        formats: row.formats,
      }))
      .sort((a, b) => b.views - a.views || b.adds - a.adds)
      .slice(0, 100);

    const liveUserIds = liveRows.map((row) => row.userId).filter((id): id is string => Boolean(id));
    const journeyUserIds = [...sessionMap.values()].map((row) => row.userId).filter((id): id is string => Boolean(id));
    const analyticsUserIds = [...new Set([...liveUserIds, ...journeyUserIds])].slice(0, 300);
    const liveSessionIds = [...new Set(liveRows.map((row) => row.sessionId).filter(Boolean))].slice(0, 200);
    const liveVisitorIds = [...new Set(liveRows.map((row) => row.visitorId).filter(Boolean))].slice(0, 200);
    const journeySessionIds = [...new Set([...sessionMap.keys(), ...liveSessionIds])].slice(0, 250);
    const journeyVisitorIds = [...new Set([...sessionMap.values()].map((row) => row.visitorId).filter(Boolean))].slice(0, 250);
    const [analyticsUsers, livePageViews, presenceRows] = await Promise.all([
      analyticsUserIds.length
        ? prisma.user
            .findMany({
              where: { id: { in: analyticsUserIds } },
              select: { id: true, name: true, email: true, phone: true },
              take: 300,
            })
            .catch(() => [])
        : Promise.resolve([]),
      liveRows.length
        ? prisma.sitePageView
            .findMany({
              where: {
                startedAt: { gte: new Date(Date.now() - 2 * 60 * 60_000) },
                ...publicPageWhere,
                OR: [{ sessionId: { in: liveSessionIds } }, { visitorId: { in: liveVisitorIds } }],
              },
              select: { visitorId: true, sessionId: true, path: true, title: true, referrer: true, utmSource: true, utmCampaign: true, startedAt: true },
              orderBy: { startedAt: "desc" },
              take: 400,
            })
            .catch(() => [])
        : Promise.resolve([]),
      journeySessionIds.length || journeyVisitorIds.length
        ? fetchJourneyPresenceRows(journeySessionIds, journeyVisitorIds)
        : Promise.resolve([]),
    ]);
    const analyticsUserById = new Map(analyticsUsers.map((user) => [user.id, user]));
    const journeysByVisitorId = new Map<string, JourneyRow[]>();
    for (const journey of sessionMap.values()) {
      const rows = journeysByVisitorId.get(journey.visitorId) ?? [];
      rows.push(journey);
      journeysByVisitorId.set(journey.visitorId, rows);
    }
    for (const row of presenceRows) {
      const matches = [
        sessionMap.get(row.sessionId),
        sessionMap.get(`visitor:${row.visitorId}`),
        ...(journeysByVisitorId.get(row.visitorId) ?? []),
      ].filter((journey, index, rows): journey is JourneyRow => Boolean(journey) && rows.indexOf(journey) === index);
      for (const journey of matches) {
        applyPresenceToJourney(journey, row);
      }
    }
    for (const view of livePageViews) {
      const sessionId = view.sessionId || `visitor:${view.visitorId}`;
      const existing =
        sessionMap.get(sessionId) ??
        sessionMap.get(`visitor:${view.visitorId}`) ??
        createJourneyRow({
          sessionId,
          visitorId: view.visitorId,
          userId: null,
          at: view.startedAt,
          path: view.path,
          title: readablePageName(view.path, view.title),
          deviceType: undefined,
          referrer: view.referrer || undefined,
          utmSource: view.utmSource || undefined,
          utmCampaign: view.utmCampaign || undefined,
        });
      const step = {
        at: view.startedAt.toISOString(),
        name: "page_view",
        detail: readablePageName(view.path, view.title),
      };
      if (!existing.steps.some((item: LiveJourneyStep) => recentStepKey(item) === recentStepKey(step))) existing.steps.push(step);
      updateJourneyContext(existing, {
        at: view.startedAt,
        name: "page_view",
        path: view.path,
        title: readablePageName(view.path, view.title),
        deviceType: undefined,
        referrer: view.referrer || undefined,
        utmSource: view.utmSource || undefined,
        utmCampaign: view.utmCampaign || undefined,
      });
      sessionMap.set(existing.sessionId, existing);
    }

    const liveVisitors = liveRows.map((row) => {
      const user = row.userId ? analyticsUserById.get(row.userId) : null;
      const journey = sessionMap.get(row.sessionId) ?? sessionMap.get(`visitor:${row.visitorId}`);
      const purchased = Boolean(journey?.purchased);
      const steps = (journey?.steps ?? [])
        .sort((a: LiveJourneyStep, b: LiveJourneyStep) => a.at.localeCompare(b.at))
        .slice(-6)
        .map((step: LiveJourneyStep) => ({
          ...step,
          name: formatLiveStepName(step.name),
        }));
      const contactEmail = user?.email ?? row.contactEmail ?? "";
      const contactPhone = user?.phone ?? row.contactPhone ?? "";
      const contactStatus = contactPhone
        ? "Phone captured"
        : contactEmail
          ? "Email captured, phone missing"
          : row.path.includes("/library/checkout")
            ? "Checkout contact not captured yet"
            : "Anonymous";
      const currentPageLabel = readablePageName(row.path, row.title || row.productTitle);
      return {
        visitorId: row.visitorId,
        path: cleanUrlPath(row.path),
        title: row.title || "",
        deviceType: row.deviceType || "unknown",
        productTitle: row.productTitle || "",
        cartItemCount: row.cartItemCount,
        cartValue: row.cartValue,
        cartCurrency: row.cartCurrency || "USD",
        identityLabel: user?.name?.trim() || (contactEmail ? contactEmail.split("@")[0] : "Guest visitor"),
        contactEmail,
        contactPhone,
        contactStatus,
        currentPageLabel,
        location: locationLabel(row),
        source: sourceLabel(row),
        leadStatus: liveLeadStatus(row, purchased),
        journey: steps,
        lastSeenAt: row.lastSeenAt.toISOString(),
        userId: row.userId,
        debug: {
          visitorId: row.visitorId,
          sessionId: row.sessionId,
          userId: row.userId,
          rawPath: row.path,
        },
      };
    });
    const libraryShoppers = liveVisitors.filter((row) => row.path.startsWith("/library") || row.path.startsWith("/dashboard/my-library"));
    const onCheckout = liveVisitors.filter((row) => row.path.includes("/library/checkout"));
    const openBags = liveVisitors.filter((row) => row.cartItemCount > 0);
    const bagValue = openBags.reduce((sum, row) => sum + row.cartValue, 0);
    const liveAlerts: string[] = [];
    if (onCheckout.length >= 2) liveAlerts.push(`${onCheckout.length} people are on Library checkout right now.`);
    if (openBags.length >= 3) liveAlerts.push(`${openBags.length} open Library bags online (≈ USD ${bagValue.toFixed(0)}).`);
    if (base.proofSla.overdue > 0) liveAlerts.push(`${base.proofSla.overdue} payment proofs are overdue (24h+).`);

    const periodStart = since.getTime();
    let newVisitors = 0;
    let returningVisitors = 0;
    for (const row of firstViews) {
      const first = row._min.startedAt?.getTime() ?? 0;
      if (first >= periodStart) newVisitors += 1;
      else returningVisitors += 1;
    }

    const alerts = [
      ...liveAlerts,
      ...products
        .filter((row) => row.views >= 10 && row.addRate < 5)
        .slice(0, 5)
        .map((row) => {
          const sampleRate = row.views ? Math.round((row.samples / row.views) * 100) : 0;
          const reason =
            sampleRate < 10
              ? "sample/value proof may be too easy to miss"
              : "the above-the-fold offer may not be giving enough buying confidence";
          return `Content gap: “${row.title}” has ${row.views} views but only ${row.addRate}% add-to-bag. Likely reason: ${reason}. Action: strengthen who-it-is-for, what-they-get, sample proof, and product-specific live chat follow-up.`;
        }),
      ...products
        .filter((row) => row.removes >= 5 && row.removes > row.adds)
        .slice(0, 3)
        .map((row) => `High removes: “${row.title}” removed ${row.removes}× vs ${row.adds} adds.`),
    ];

    const journeys = [...sessionMap.values()]
      .map((journey) => finalizeJourneyRow(journey, journey.userId ? analyticsUserById.get(journey.userId) : null))
      .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
      .slice(0, 40);

    const top = (map: Map<string, number>, limit = 12) =>
      [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([label, value]) => ({ label: label.length > 42 ? `${label.slice(0, 42)}…` : label, value }));

    const todayOrders = orders.filter((order) => order.createdAt >= startOfToday);
    const todayRevenue = todayOrders
      .filter((order) => order.status === "PAID" || order.status === "FULFILLED" || order.payment?.status === "PAID")
      .reduce((sum, order) => sum + Number(order.total || 0), 0);

    const topClass = buildTopClassAnalytics({
      days: normalizedDays,
      funnels: publicFunnels,
      orders,
      abandoned,
      catalog,
      live: liveVisitors,
      pageViewsLast24h: views24h,
      pageViewsPrev7dDailyAvg: views7d / 7,
      eventsLast24h: events24h,
      eventsPrev7dDailyAvg: events7d / 7,
      whatsappNumber: platform?.contact?.whatsappNumber,
      pendingProofs: base.proofSla.pending,
      todayRevenue,
      todayOrders: todayOrders.length,
    });

    const report = {
      ...base,
      live: {
        online: liveVisitors.length,
        libraryShoppers: libraryShoppers.length,
        onCheckout: onCheckout.length,
        openBags: openBags.length,
        bagValue: Math.round(bagValue * 100) / 100,
        visitors: liveVisitors.slice(0, 60),
        alerts: liveAlerts,
      },
      products,
      cartHeat: {
        mostAdded: top(addHeat),
        mostRemoved: top(removeHeat),
      },
      cartActivity,
      journeys,
      revenueByProduct: top(revenueByProduct).map((row) => ({ ...row, value: Math.round(row.value * 100) / 100 })),
      revenueByFormat: top(revenueByFormat).map((row) => ({ ...row, value: Math.round(row.value * 100) / 100 })),
      revenueByChannel: base.channels,
      proofFunnel: [
        { label: "awaiting payment / proof", value: awaitingPay },
        { label: "proof uploaded", value: proofUploaded },
        { label: "paid", value: paid },
        { label: "proof rejected", value: rejected },
      ],
      marketplace: top(marketplaceMap),
      engagement: top(engagementMap),
      cohorts: {
        newVisitors,
        returningVisitors,
        knownBuyersOnline: liveVisitors.filter((row) => row.userId).length,
      },
      alerts: [...alerts, ...topClass.anomalies.map((row) => `Anomaly ${row.metric}: ${row.current} vs baseline ${row.baseline}`)],
      topClass,
    };
    advancedReportCache.set(cacheKey, { value: report, expiresAt: Date.now() + ADVANCED_REPORT_CACHE_TTL_MS });
    return report;
  } catch (error) {
    if (isMissingSchemaError(error) || isDatabaseUnavailableError(error)) return emptyAdvanced;
    throw error;
  }
}

export function advancedAnalyticsToCsv(report: Awaited<ReturnType<typeof getAdvancedSiteAnalyticsReport>>) {
  const lines = [siteAnalyticsReportToCsv(report).trimEnd()];
  lines.push("section,label,value,extra");
  for (const row of report.products) {
    lines.push(
      `products,${csv(row.title)},${row.views},id=${row.productId};uniques=${row.uniqueViewers};adds=${row.adds};removes=${row.removes};purchases=${row.purchases};addRate=${row.addRate};purchaseRate=${row.purchaseRate}`,
    );
  }
  for (const row of report.cartActivity) {
    lines.push(`cartActivity,${csv(row.title)},${row.quantity},event=${row.name};visitor=${row.visitorId};at=${row.at}`);
  }
  for (const row of report.live.visitors) {
    lines.push(
      `live,${csv(row.path)},${row.cartItemCount},visitor=${row.visitorId};product=${csv(row.productTitle)};value=${row.cartValue};at=${row.lastSeenAt}`,
    );
  }
  for (const row of report.journeys) {
    lines.push(
      `journeys,${csv(row.summary || row.sessionId)},${row.intentScore ?? row.steps.length},visitor=${row.visitorId};wa=${row.whatsappAssisted};purchased=${row.purchased};user=${row.userId || ""};lead=${csv(row.leadStatus?.label || "")};action=${csv(row.nextAction?.label || "")};source=${csv(row.source || "")};contact=${csv(row.contactStatus || "")}`,
    );
  }
  for (const alert of report.alerts) {
    lines.push(`alerts,${csv(alert)},1,`);
  }
  const tc = report.topClass;
  if (tc) {
    lines.push(`board,todayRevenue,${tc.board.todayRevenue},orders=${tc.board.todayOrders};online=${tc.board.online};bags=${tc.board.openBags}`);
    lines.push(`board,assistedRevenue,${tc.board.assistedRevenue},waClicks=${tc.board.waClicks};refunds=${tc.board.refundTotal};proofs=${tc.board.pendingProofs}`);
    for (const row of tc.pathFlows) lines.push(`pathFlows,${csv(`${row.from} → ${row.to}`)},${row.value},`);
    for (const row of tc.retentionCohorts) lines.push(`retention,${csv(row.cohort)},${row.size},d7=${row.d7};d30=${row.d30}`);
    for (const row of tc.margins) lines.push(`margins,${csv(row.title)},${row.net},revenue=${row.revenue};refunds=${row.refunds}`);
    for (const row of tc.inventoryDemand) {
      lines.push(`inventory,${csv(row.title)},${row.stock},views=${row.views};adds=${row.adds};status=${row.status};id=${row.productId}`);
    }
    for (const row of tc.experiments) {
      lines.push(`experiments,${csv(`${row.experiment}:${row.variant}`)},${row.exposures},conversions=${row.conversions};rate=${row.rate}`);
    }
    for (const row of tc.intervene) lines.push(`intervene,${csv(row.reason)},${row.count},severity=${row.severity}`);
    for (const row of tc.abandonRescue) {
      lines.push(`abandonRescue,${csv(row.email)},${row.value},idleHours=${row.idleHours};items=${row.itemCount};reminders=${row.reminderCount}`);
    }
    for (const row of tc.fraud) lines.push(`fraud,${csv(row.signal)},${row.score},${csv(row.detail)}`);
    for (const row of tc.orderSlas) {
      lines.push(`orderSla,${csv(row.orderNumber)},${row.hours},stage=${row.stage};breached=${row.breached}`);
    }
    for (const row of tc.identity) {
      lines.push(`identity,${csv(row.visitorId)},${row.orders},user=${row.userId};email=${csv(row.email)}`);
    }
    for (const row of tc.ltvRfm) {
      lines.push(`ltvRfm,${csv(row.email || row.customerId)},${row.revenue},orders=${row.orders};recency=${row.recencyDays};segment=${row.segment}`);
    }
    for (const row of tc.segments) lines.push(`segments,${csv(row.name)},${row.count},${csv(row.description)}`);
    for (const row of tc.attribution.firstTouch) lines.push(`attrFirst,${csv(row.label)},${row.value},`);
    for (const row of tc.attribution.lastTouch) lines.push(`attrLast,${csv(row.label)},${row.value},`);
    for (const row of tc.attribution.linear) lines.push(`attrLinear,${csv(row.label)},${row.value},`);
    lines.push(`attribution,assistedRate,${tc.attribution.assistedRate},assistedRevenue=${tc.attribution.assistedRevenue}`);
    for (const row of tc.campaigns) {
      lines.push(`campaigns,${csv(row.campaign)},${row.revenue},visitors=${row.visitors};purchases=${row.purchases}`);
    }
    lines.push(`quality,rageClicks,${tc.rageClicks},uiErrors=${tc.uiErrors};missingProductIdRate=${tc.dataQuality.missingProductIdRate}`);
    for (const row of tc.search.topQueries) lines.push(`search,${csv(row.label)},${row.value},`);
    for (const row of tc.search.zeroResults) lines.push(`searchZero,${csv(row.label)},${row.value},`);
    for (const row of tc.sampleFunnel) lines.push(`sampleFunnel,${csv(row.label)},${row.value},`);
    lines.push(`nps,avg,${tc.nps.avg},count=${tc.nps.count}`);
    for (const note of tc.dataQuality.notes) lines.push(`dataQuality,note,1,${csv(note)}`);
    for (const row of tc.hourly) lines.push(`hourly,h${row.hour},${row.views},events=${row.events}`);
    for (const row of tc.anomalies) {
      lines.push(`anomalies,${csv(row.metric)},${row.current},baseline=${row.baseline};severity=${row.severity}`);
    }
    for (const field of tc.piiAudit.fieldsStored) lines.push(`piiAudit,field,1,${csv(field)}`);
    for (const goal of tc.goals) lines.push(`goals,${csv(goal.name)},${goal.current},target=${goal.target};pct=${goal.pct}`);
    lines.push(
      `compare,pageViews24h,${tc.compare.pageViewsLast24h},prev7dDailyAvg=${tc.compare.pageViewsPrev7dDailyAvg};events24h=${tc.compare.eventsLast24h};eventsPrevAvg=${tc.compare.eventsPrev7dDailyAvg}`,
    );
  }
  return `${lines.join("\n")}\n`;
}

function csv(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}
