# HomeLink Admin and Dashboard Realism TODO

## Completed
- Reports admin: Preview shows real sample rows, generated time, fields, and CSV download.
- Agent commissions: payout requires payment method, HomeLink source account, destination account, reference, and audit metadata.
- Agent documents and verification queue: documents are viewable in designed previews before approval or rejection.
- Command center/user directory stats: estimated/fake device, browser, and source numbers were removed.
- Routing settings: enquiry settings persist, manual assignment validates agent IDs, and terminal enquiry statuses require reasons.
- Landlords & Agents: completed actions are state-aware, and agency/landlord verification, suspension, activation, tier, and delete actions are conditionally shown.
- Admin action logic: holiday listings/bookings, moderation, support, payments, and marketing/CMS now use clearer state-aware actions and feedback.
- Manual payment methods: manual method, reference, proof URL, proof upload, request-proof, and admin approval workflows are wired.
- Super admin roles: User Directory now lets admins assign/remove platform roles that unlock matching dashboards.
- Listing-to-payment flow: checkout redirects preserve payment/listing context, and the payments page shows the selected payment instead of generic content.
- Enquiry contact flow: public listing actions now route through distinct HomeLink-managed enquiry intents without repetitive buttons.
- Moderation: duplicate/report items expose details and linked targets before resolve/dismiss.
- Moderation decisions: resolve/dismiss now use designed prompts and require an admin reason before changing state.
- Support CRM: escalation asks destination team and reason, assigns the ticket, and audits the escalation.
- Property-management document requests: admins now select the document type, source party, due date, and upload instructions before emailing/tracking a request.
- Marketing & CMS: campaign broadcasts validate subject/body and CMS actions give designed feedback.
- Marketing & CMS lifecycle: coupons can be paused/reactivated/removed, campaigns validate supported audiences/channels and can be cancelled, blog posts can be edited/published/unpublished/removed, FAQs can be published/unpublished/removed, and media assets can be opened or removed.
- Dashboard logic: landlord dashboard no longer exposes seed credentials, and agent lead actions now hide once they are redundant or terminal.
- Internal seed/demo naming was replaced with neutral real-looking seed fixture names where it affected app/admin scans.
- Verified with full `eslint` over `app`, `components`, and `lib` (excluding generated code), `npm run typecheck`, and `npm run build`.

## Remaining Integration Notes
- Production build passes, but Next.js reports non-blocking warnings for the ESLint Next plugin configuration and missing `metadataBase`.
- Email, SMS, WhatsApp, payment settlement, bank transfer confirmation, and file storage are wired through platform flows, but still depend on real provider credentials/settings in production.
