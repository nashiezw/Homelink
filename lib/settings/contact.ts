import type { ContactSettings } from "@/lib/settings/types";

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function getTelHref(contact: Pick<ContactSettings, "phoneNumber">) {
  return `tel:${contact.phoneNumber.replace(/\s/g, "")}`;
}

export function getWhatsAppHref(
  contact: Pick<ContactSettings, "whatsappNumber">,
  options?: { message?: string },
) {
  const digits = digitsOnly(contact.whatsappNumber || "");
  if (!digits) return "";
  const text = options?.message?.trim();
  if (!text) return `https://wa.me/${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function getMailtoHref(email: string, subject?: string) {
  const suffix = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  return `mailto:${email}${suffix}`;
}

export function stickyWhatsAppVisible(contact: Pick<ContactSettings, "stickyWhatsAppEnabled" | "whatsappNumber">) {
  return Boolean(contact.stickyWhatsAppEnabled && digitsOnly(contact.whatsappNumber || "").length >= 8);
}
