import { sendSmtpPlainEmail } from "@/lib/integrations/smtp";
import type { PropertyEnquiry } from "@/lib/enquiries/types";
import { ENQUIRY_TYPE_LABELS } from "@/lib/enquiries/labels";
import { getRuntimePlatformSettings, renderNotificationTemplate } from "@/lib/settings/runtime";

type DispatchTarget = {
  email?: string;
  name?: string;
};

export async function dispatchEnquiryCreatedNotifications(
  enquiry: PropertyEnquiry,
  targets: {
    admin?: DispatchTarget[];
    agent?: DispatchTarget;
    owner?: DispatchTarget;
    seeker?: DispatchTarget;
  },
) {
  const settings = getRuntimePlatformSettings();
  const integrations = settings.integrations;
  if (!integrations.smtpHost || !integrations.smtpUser) return;

  const vars = {
    platformName: settings.platformName,
    listingTitle: enquiry.listingTitle,
    seekerName: enquiry.seekerName,
    enquiryType: ENQUIRY_TYPE_LABELS[enquiry.enquiryType],
    enquiryId: enquiry.id,
    status: enquiry.status,
  };

  const subject = `New enquiry: ${enquiry.listingTitle}`;
  const body =
    renderNotificationTemplate("email", "enquiry_created", vars) ??
    `A new ${vars.enquiryType} enquiry was submitted on HouseLink.\n\nProperty: ${enquiry.listingTitle}\nCustomer: ${enquiry.seekerName}\nMessage: ${enquiry.message}\n\nEnquiry ID: ${enquiry.id}`;

  const recipients = new Set<string>();
  if (settings.enquiries.notifyAdminOnNewEnquiry) {
    for (const t of targets.admin ?? []) {
      if (t.email) recipients.add(t.email);
    }
  }
  if (settings.enquiries.notifyAgentOnAssignment && targets.agent?.email) {
    recipients.add(targets.agent.email);
  }
  if (settings.enquiries.notifyOwnerOnNewEnquiry && targets.owner?.email) {
    recipients.add(targets.owner.email);
  }
  if (targets.seeker?.email) {
    recipients.add(targets.seeker.email);
  }

  await Promise.all(
    [...recipients].map((to) =>
      sendSmtpPlainEmail(integrations, to, subject, body).catch(() => undefined),
    ),
  );
}
