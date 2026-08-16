import type { ContactSettings } from "@/lib/settings/types";

export type WhatsAppLane = "library" | "property";

export type WhatsAppHelpContext = {
  source: string;
  lane?: WhatsAppLane;
  pathname?: string;
  productTitle?: string;
  orderNumber?: string;
  paymentReference?: string;
  listingTitle?: string;
  totalLabel?: string;
};

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function getTelHref(contact: Pick<ContactSettings, "phoneNumber">) {
  return `tel:${contact.phoneNumber.replace(/\s/g, "")}`;
}

export function resolveWhatsAppLane(pathname?: string): WhatsAppLane {
  const path = String(pathname || "");
  if (path.startsWith("/library") || path.startsWith("/dashboard/my-library")) return "library";
  return "property";
}

export function resolveWhatsAppNumber(
  contact: Pick<ContactSettings, "whatsappNumber" | "whatsappLibraryNumber" | "whatsappPropertyNumber">,
  lane: WhatsAppLane,
) {
  const library = digitsOnly(contact.whatsappLibraryNumber || "");
  const property = digitsOnly(contact.whatsappPropertyNumber || "");
  if (lane === "library" && library.length >= 8) return contact.whatsappLibraryNumber;
  if (lane === "property" && property.length >= 8) return contact.whatsappPropertyNumber;
  return contact.whatsappNumber || (lane === "library" ? contact.whatsappLibraryNumber : contact.whatsappPropertyNumber) || "";
}

export function buildWhatsAppMessage(
  contact: Pick<ContactSettings, "stickyWhatsAppMessage" | "stickyWhatsAppLibraryMessage" | "stickyWhatsAppQuietHours">,
  ctx: WhatsAppHelpContext,
) {
  const lane = ctx.lane || resolveWhatsAppLane(ctx.pathname);
  const quiet = normaliseWhatsAppText(contact.stickyWhatsAppQuietHours).trim();
  const quietNote = quiet ? ` (${quiet})` : "";

  if (ctx.orderNumber) {
    const ref = ctx.paymentReference ? ` Reference: ${ctx.paymentReference}.` : "";
    const total = ctx.totalLabel ? ` Total: ${ctx.totalLabel}.` : "";
    return `Hi HouseLink - I need help with Library order ${ctx.orderNumber}.${ref}${total}${quietNote}`;
  }
  if (ctx.productTitle) {
    return `Hi HouseLink - I have a question about the Library book "${ctx.productTitle}".${quietNote}`;
  }
  if (ctx.listingTitle) {
    return `Hi HouseLink - I am interested in "${ctx.listingTitle}".${quietNote}`;
  }

  const pageNote = buildWhatsAppPageNote(ctx.pathname);
  if (lane === "library") {
    const base =
      cleanConfiguredWhatsAppMessage(contact.stickyWhatsAppLibraryMessage) ||
      "Hi HouseLink - I need help with a Library book or order.";
    return `${base}${pageNote}${quietNote}`;
  }
  const base = cleanConfiguredWhatsAppMessage(contact.stickyWhatsAppMessage) || "Hi HouseLink - I need help with a property listing or viewing.";
  return `${base}${pageNote}${quietNote}`;
}

function cleanConfiguredWhatsAppMessage(value?: string | null) {
  const message = normaliseWhatsAppText(value).trim();
  if (!message) return "";
  if (/property\s*\/\s*library\s+order/i.test(message)) return "";
  if (/library\s*\/\s*books\s+order/i.test(message)) return "";
  return message;
}

function normaliseWhatsAppText(value?: string | null) {
  return String(value || "")
    .replace(/â€”/g, "-")
    .replace(/â€“/g, "-")
    .replace(/—/g, "-")
    .replace(/–/g, "-");
}

function buildWhatsAppPageNote(pathname?: string) {
  const path = String(pathname || "").trim();
  if (!path || path === "/") return "";
  return ` Page: ${path}.`;
}

export function getWhatsAppHref(
  contact: Pick<ContactSettings, "whatsappNumber" | "whatsappLibraryNumber" | "whatsappPropertyNumber">,
  options?: { message?: string; lane?: WhatsAppLane; number?: string },
) {
  const lane = options?.lane;
  const rawNumber = options?.number || (lane ? resolveWhatsAppNumber(contact, lane) : contact.whatsappNumber);
  const digits = digitsOnly(rawNumber || "");
  if (!digits) return "";
  const text = options?.message?.trim();
  if (!text) return `https://wa.me/${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** Build a tracked wa.me URL for a page context (library vs property routing). */
export function getContextualWhatsAppHref(contact: ContactSettings, ctx: WhatsAppHelpContext) {
  const lane = ctx.lane || resolveWhatsAppLane(ctx.pathname);
  const message = buildWhatsAppMessage(contact, { ...ctx, lane });
  return getWhatsAppHref(contact, { message, lane });
}

export function getMailtoHref(email: string, subject?: string) {
  const suffix = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  return `mailto:${email}${suffix}`;
}

export function stickyWhatsAppVisible(contact: Pick<ContactSettings, "stickyWhatsAppEnabled" | "whatsappNumber" | "whatsappLibraryNumber" | "whatsappPropertyNumber">) {
  const hasNumber =
    digitsOnly(contact.whatsappNumber || "").length >= 8 ||
    digitsOnly(contact.whatsappLibraryNumber || "").length >= 8 ||
    digitsOnly(contact.whatsappPropertyNumber || "").length >= 8;
  return hasNumber && contact.stickyWhatsAppEnabled !== false;
}
