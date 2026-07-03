import type { ContactSettings } from "@/lib/settings/types";

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function getTelHref(contact: Pick<ContactSettings, "phoneNumber">) {
  return `tel:${contact.phoneNumber.replace(/\s/g, "")}`;
}

export function getWhatsAppHref(contact: Pick<ContactSettings, "whatsappNumber">) {
  return `https://wa.me/${digitsOnly(contact.whatsappNumber)}`;
}

export function getMailtoHref(email: string, subject?: string) {
  const suffix = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  return `mailto:${email}${suffix}`;
}
