# Production Launch Checklist

This checklist tracks the remaining launch gates for taking HouseLink public.

## Code Gates

- [x] Use slow, salted password hashing for newly created local-password users.
- [x] Set secure session cookies in production.
- [x] Require listing ownership before issuing listing media upload intents.
- [x] Hydrate persisted settings over current defaults so old snapshots do not crash new runtime fields.
- [x] Reject local filesystem uploads in strict production unless durable media storage is configured.
- [x] Provide signed Cloudinary upload parameters when Cloudinary credentials are configured.
- [x] Verify payment webhooks before mutating payment state in live/strict production.
- [x] Prevent sandbox auto-completion when strict production is enabled.
- [x] Add production configuration checks for required secrets and unsafe defaults.
- [x] Fail production session signing unless `HOUSELINK_SESSION_SECRET` is present and strong.
- [x] Make strict production and upload scanning mandatory in the production env check.
- [x] Keep smoke tests passing against the standalone production build.

## Infrastructure Gates

- [ ] Provision production PostgreSQL and set `DATABASE_URL`.
- [ ] Apply Prisma schema with a migration plan, not ad hoc local-only state.
- [ ] Decide whether the current snapshot store is acceptable for launch scope or replace critical flows with normalized tables.
- [ ] Configure durable media storage, preferably Cloudinary or S3-compatible object storage.
- [ ] Configure live payment gateway credentials and webhook secrets.
- [ ] Configure a production auth provider or explicitly accept the local session auth risk.
- [ ] Configure SMTP or transactional email for account, payment, and enquiry notifications.
- [ ] Set `NEXT_PUBLIC_APP_URL` to the public HTTPS origin.

## Operational Gates

- [x] Rotate all seed/demo passwords before launch.
- [x] Disable or remove demo credentials from public documentation.
- [ ] Verify admin RBAC assignments for real operators.
- [ ] Confirm backup and restore process for database and uploaded media.
- [ ] Confirm monitoring for API errors, auth failures, upload failures, payment failures, and webhook failures.
- [ ] Run a restore drill: recover the database plus uploaded media into a temporary environment and verify listings, payments, enquiries, and gallery files still line up.
- [ ] Keep [observability-runbook.md](./observability-runbook.md), [backup-restore-drill.md](./backup-restore-drill.md), and [mobile-launch-scan.md](./mobile-launch-scan.md) with launch evidence.
- [ ] Run `npm run check:production` against final production environment variables.
- [ ] Run a final smoke test on the deployed URL.
