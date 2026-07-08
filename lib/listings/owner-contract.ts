export const OWNER_LISTING_AGREEMENT_VERSION = "2026-01";

export const HOMELINK_OWNER_LISTING_AGREEMENT = `HomeLink Zimbabwe — Property Owner Listing Agreement

By signing this agreement, the property owner authorises HomeLink Zimbabwe to market, manage enquiries, schedule viewings, and process payments for the listed property through the HomeLink platform.

1. Exclusive platform relationship
The owner agrees to route all enquiries, viewings, and tenant/buyer introductions for this property through HomeLink. Private side deals that bypass HomeLink are not permitted while the listing is active.

2. Accurate information
The owner confirms that listing details, pricing, availability, and ownership information provided are true and accurate.

3. Viewings and access
The owner authorises HomeLink and assigned agents to coordinate property viewings. All viewings must be recorded in HomeLink CRM with a HomeLink viewing reference.

4. Deposits and payments
Rent deposits, sale deposits, and booking fees must be paid to HomeLink-designated accounts. The owner must not request direct personal payments from clients introduced through HomeLink.

5. Commission and fees
The owner accepts HomeLink commission and fee structures as published on the platform at the time of listing approval.

6. Listing control
HomeLink may pause, reject, or remove listings that breach this agreement, contain misleading information, or create client-protection risk.

7. Termination
The owner may request delisting through HomeLink. Active client relationships introduced through HomeLink remain subject to platform rules until closed or transferred per admin policy.`;

export function listingHasOwnerAgreement(listing: {
  ownerAgreementAccepted?: boolean;
}) {
  return Boolean(listing.ownerAgreementAccepted);
}

export class ListingApprovalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ListingApprovalError";
  }
}

export type OwnerAgreementBypassInput = {
  bypassOwnerAgreement: boolean;
  bypassReason: string;
  actor: { id: string; name: string; email: string };
};

export function buildOwnerAgreementBypassRecord(input: OwnerAgreementBypassInput) {
  return {
    ownerAgreementBypassedAt: new Date().toISOString(),
    ownerAgreementBypassedById: input.actor.id,
    ownerAgreementBypassedByName: input.actor.name,
    ownerAgreementBypassedByEmail: input.actor.email,
    ownerAgreementBypassReason: input.bypassReason.trim(),
  };
}
