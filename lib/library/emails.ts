import { getHydratedRuntimePlatformSettings } from "@/lib/settings/runtime";
import { sendSmtpPlainEmail } from "@/lib/integrations/smtp";
import {
  renderLibraryEmailTemplate,
  type LibraryEmailTemplateKey,
} from "@/lib/library/email-templates";
import type { LibraryStoreSettings } from "@/lib/library/settings-shared";

export type { LibraryEmailTemplate, LibraryEmailTemplateKey } from "@/lib/library/email-templates";
export { defaultLibraryEmailTemplates, renderLibraryEmailTemplate } from "@/lib/library/email-templates";

export async function sendLibraryTemplatedEmail(input: {
  to: string;
  settings: LibraryStoreSettings;
  templateKey: LibraryEmailTemplateKey;
  variables: Record<string, string | number | null | undefined>;
  fallbackSubject: string;
  fallbackBody: string;
}) {
  if (!input.to.trim()) return { ok: false, message: "Missing recipient email." };
  const template = input.settings.emails.templates[input.templateKey];
  const rendered = template
    ? renderLibraryEmailTemplate(template, {
        ...input.variables,
        storeName: input.settings.store.name,
        supportEmail: input.settings.store.supportEmail,
        fromName: input.settings.notifications.fromName,
      })
    : { subject: input.fallbackSubject, body: input.fallbackBody };

  try {
    const platform = await getHydratedRuntimePlatformSettings();
    return await sendSmtpPlainEmail(platform.integrations, input.to, rendered.subject, rendered.body);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Email send failed." };
  }
}
