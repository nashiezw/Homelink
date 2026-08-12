import type { PlatformSettings } from "@/lib/settings/types";

type WhatsAppResult = { ok: boolean; message: string; providerMessageId?: string };

function cleanPhone(value: string) {
  return value.replace(/[^\d+]/g, "").replace(/^\+/, "");
}

function isConfigured(integrations: PlatformSettings["integrations"]) {
  return Boolean(
    integrations.whatsappProvider?.trim()
      && integrations.whatsappAccessToken?.trim()
      && integrations.whatsappPhoneNumberId?.trim(),
  );
}

function textPreview(body: string) {
  return body.replace(/\s+/g, " ").trim().slice(0, 90);
}

export async function sendWhatsAppTextMessage(
  integrations: PlatformSettings["integrations"],
  to: string,
  body: string,
): Promise<WhatsAppResult> {
  if (!isConfigured(integrations)) {
    return {
      ok: false,
      message: "Configure WhatsApp provider, access token, and phone number ID in Platform Settings > Integrations.",
    };
  }

  const recipient = cleanPhone(to);
  if (!recipient || recipient.length < 8) {
    return { ok: false, message: "Enter a valid WhatsApp recipient number with country code." };
  }

  const provider = integrations.whatsappProvider.trim().toLowerCase();
  if (!["meta", "whatsapp", "whatsapp_cloud", "whatsapp_cloud_api"].includes(provider)) {
    return {
      ok: false,
      message: `Unsupported WhatsApp provider "${integrations.whatsappProvider}". Use "meta" for WhatsApp Cloud API.`,
    };
  }

  const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(integrations.whatsappPhoneNumberId.trim())}/messages`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${integrations.whatsappAccessToken.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "text",
        text: {
          preview_url: false,
          body,
        },
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = payload?.error?.message ?? response.statusText;
      return { ok: false, message: `WhatsApp send failed: ${detail}` };
    }
    const providerMessageId = payload?.messages?.[0]?.id;
    return {
      ok: true,
      providerMessageId,
      message: `WhatsApp message submitted to ${recipient}${providerMessageId ? ` (${providerMessageId})` : ""}.`,
    };
  } catch (error) {
    return {
      ok: false,
      message: `WhatsApp send failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export async function sendWhatsAppTestMessage(
  integrations: PlatformSettings["integrations"],
  to: string,
): Promise<WhatsAppResult> {
  return sendWhatsAppTextMessage(
    integrations,
    to,
    `HouseLink WhatsApp test message.\n\nYour WhatsApp integration is configured and submitted this test at ${new Date().toISOString()}.`,
  );
}

export function describeWhatsAppSend(input: { ok: boolean; to?: string | null; body: string }) {
  if (!input.ok) return "WhatsApp not sent";
  return `WhatsApp submitted${input.to ? ` to ${cleanPhone(input.to)}` : ""}: ${textPreview(input.body)}`;
}
