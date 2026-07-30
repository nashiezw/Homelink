export type LibraryEmailTemplateKey =
  | "orderConfirmation"
  | "paymentReceived"
  | "downloadReady"
  | "dispatchUpdate"
  | "reviewRequest"
  | "refundNotice"
  | "guestClaim";

export type LibraryEmailTemplate = {
  subject: string;
  body: string;
};

export const defaultLibraryEmailTemplates: Record<LibraryEmailTemplateKey, LibraryEmailTemplate> = {
  orderConfirmation: {
    subject: "Order {{orderNumber}} received — {{storeName}}",
    body: "Hi {{customerName}},\n\nWe received your Library order {{orderNumber}}.\nTotal: {{currency}} {{total}}\n\nTrack it in My Library: {{orderUrl}}\n\n— {{fromName}}",
  },
  paymentReceived: {
    subject: "Payment confirmed for {{orderNumber}}",
    body: "Hi {{customerName}},\n\nPayment for Library order {{orderNumber}} is confirmed.\n{{extra}}\n\nMy Library: {{orderUrl}}\n\n— {{fromName}}",
  },
  downloadReady: {
    subject: "Your Library downloads are ready — {{orderNumber}}",
    body: "Hi {{customerName}},\n\nYour digital Library items for {{orderNumber}} are ready in My Library.\n\n{{orderUrl}}\n\nLicence note: {{licenceText}}\n\n— {{fromName}}",
  },
  dispatchUpdate: {
    subject: "Dispatch update for {{orderNumber}}",
    body: "Hi {{customerName}},\n\nYour printed Library order {{orderNumber}} has a fulfilment update.\nCourier: {{courier}}\nTracking: {{trackingNumber}}\n\n{{message}}\n\n— {{fromName}}",
  },
  reviewRequest: {
    subject: "How was {{productTitle}}?",
    body: "Hi {{customerName}},\n\nThanks for buying from {{storeName}}. Leave a quick review for {{productTitle}}:\n{{productUrl}}\n\n— {{fromName}}",
  },
  refundNotice: {
    subject: "Refund update for {{orderNumber}}",
    body: "Hi {{customerName}},\n\nYour HouseLink Library order {{orderNumber}} has been marked refunded. Related download access has been revoked.\nReason: {{reason}}\n\n— {{fromName}}",
  },
  guestClaim: {
    subject: "Claim your HouseLink Library order {{orderNumber}}",
    body: "Hi,\n\nAn admin issued a Library access claim for order {{orderNumber}}.\n\n1. Sign in (or create an account) with this email: {{email}}\n2. Open this claim link:\n{{claimUrl}}\n\nThe link expires in {{expiryDays}} days.\n\n— {{fromName}}",
  },
};

export function renderLibraryEmailTemplate(
  template: LibraryEmailTemplate,
  variables: Record<string, string | number | null | undefined>,
) {
  const replace = (text: string) =>
    Object.entries(variables).reduce(
      (current, [key, value]) => current.replaceAll(`{{${key}}}`, String(value ?? "")),
      text,
    );
  return {
    subject: replace(template.subject),
    body: replace(template.body),
  };
}
