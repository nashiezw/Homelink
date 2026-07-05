# HomeLink Production Postgres Audit Todo

Status key: `[x]` complete, `[~]` partially complete, `[ ]` still required.

## Critical listing outage

- [x] Listing create API writes directly to Postgres when `DATABASE_URL` is PostgreSQL.
- [x] Listing create API verifies a durable listing id before returning success.
- [x] Listing detail API reads from Postgres in production and no longer falls back to seeded memory data.
- [x] Admin listing dashboard reads live listing rows from Postgres.
- [x] Admin listing approvals, rejects, archives, restores, deletes, verifies, features, and transfers write to Postgres.
- [x] Listing image metadata writes to Postgres in production.
- [x] Mark-rented listing status writes to Postgres in production.
- [x] Listing detail page avoids build-time Postgres reads and resolves records at request time.
- [x] Listing submission UI shows success only after the API returns a persisted id.
- [x] Listing submission UI keeps loading/error states correct and does not redirect after failed saves.

## Hydration and serverless memory

- [x] Removed the production crash caused by `markDirty()` throwing before store hydration.
- [x] Deferred legacy snapshot persistence while hydration is pending instead of failing requests.
- [x] Legacy `AppStore` is blocked in strict production unless `HOMELINK_ALLOW_LEGACY_STORE=true` is explicitly set.
- [~] Legacy `AppStore` still exists for demo/local functionality and unmigrated domains outside strict production.
- [x] Production writes cannot silently persist only to server memory when `HOMELINK_STRICT_PRODUCTION=true`.

## Database-first domains

- [x] Property listings.
- [x] Listing media metadata.
- [x] Listing status and moderation actions.
- [x] Users and sessions: login/register/current-user and admin user directory/detail use Prisma in production.
- [x] Saved properties: `/api/v1/users/me/favourites` uses `Favourite` in production.
- [x] Saved searches: `/api/v1/saved-searches` uses `SavedSearch` in production.
- [x] Notifications: `/api/v1/notifications` uses `Notification` in production.
- [x] Reports: `/api/v1/reports` uses `Report` in production.
- [x] Messages: `/api/v1/messages` uses `Conversation` and `Message` in production.
- [x] Enquiries: `/api/v1/enquiries` and core enquiry actions use `PropertyEnquiryRecord` in production.
- [ ] Tenancies: no durable Prisma model yet.
- [ ] Property management requests: no durable Prisma model yet.
- [~] Holiday bookings/reviews: holiday reviews use durable `Review` rows in production; holiday bookings still need a durable Prisma model.
- [~] Agent applications/training/ratings: agent dashboard/leads/commissions/agency/public agent routes use Prisma; applications/training/ratings still need durable models.
- [x] Payments and proof workflows: checkout, list, proof upload, callback, webhook, and config use Prisma/default durable settings in production.
- [ ] Admin analytics/audit dashboards still read many store-backed aggregates.
- [ ] Homepage/CMS/settings still use snapshot-backed store data in several routes.

## API audit

- [x] `/api/v1/listings` migrated for production reads/writes.
- [x] `/api/v1/listings/[id]` migrated for production reads/updates.
- [x] `/api/v1/listings/[id]/images` migrated for production image metadata writes.
- [x] `/api/v1/listings/[id]/media-intents` migrated for production authorization reads.
- [x] `/api/v1/listings/[id]/mark-rented` migrated for production listing status writes.
- [x] `/api/v1/admin/listings` migrated for production listing admin reads/writes.
- [x] `/api/v1/users/me/favourites` migrated for production saved property reads/writes.
- [x] `/api/v1/saved-searches` migrated for production saved search reads/writes.
- [x] `/api/v1/notifications` migrated for production notification reads/writes.
- [x] `/api/v1/reports` migrated for production report writes.
- [x] `/api/v1/messages` and `/api/v1/messages/[id]` migrated for production message reads/writes.
- [x] `/api/v1/enquiries` and `/api/v1/enquiries/[id]` migrated for production enquiry create/read/core updates.
- [x] `/api/v1/admin/enquiries` and `/api/v1/admin/enquiries/export` migrated for production enquiry reads/core updates.
- [x] `/api/v1/admin/reports` uses Postgres for common production reports: properties, users, enquiries, payments/revenue, and reports.
- [x] `/api/v1/auth/session` and `/api/v1/auth/me` use Prisma users in production.
- [x] `/api/v1/payments/*` core checkout/proof/callback/webhook/config routes use Prisma in production.
- [x] `/api/v1/roommates/profile`, `/api/v1/roommates/matches`, and public roommate profile routes use Prisma in production.
- [x] `/api/v1/agents/me`, `/api/v1/agents/leads`, `/api/v1/agents/commissions`, `/api/v1/agents/public/[slug]`, and `/api/v1/agencies/me` use Prisma in production for durable subsets.
- [x] `/api/v1/admin/users`, `/api/v1/admin/users/[id]`, and `/api/v1/users/lookup` use Prisma in production.
- [x] `/api/v1/holiday-homes/reviews` uses Prisma `Review` rows with metadata in production.
- [x] Remaining legacy-store `app/api` routes are blocked by the strict production store guard instead of silently writing to memory.

## Production readiness

- [x] Prisma schema supports durable listing lifecycle states: `REJECTED`, `ARCHIVED`, `DELETED`.
- [x] Prisma schema supports durable listing `featured`, `featuredUntil`, `views`, and `adminNotes`.
- [x] Prisma schema supports durable holiday review metadata.
- [x] Build no longer fails by trying to prerender dynamic Postgres listing pages.
- [ ] Apply schema changes to the production database before deploy.
- [ ] Configure Cloudinary production credentials.
- [ ] Configure transactional email credentials.
- [ ] Set `HOMELINK_STRICT_PRODUCTION=true`.
- [ ] Set a stable long `HOMELINK_SESSION_SECRET`.
- [ ] Configure payment gateway credentials or keep payment gateways disabled.

## Final verification

- [x] `npm.cmd exec prisma generate -- --schema prisma/schema.prisma` completed successfully.
- [x] `npm.cmd run typecheck` completed successfully.
- [x] `npm.cmd run lint` completed successfully.
- [x] `npm.cmd exec prisma validate -- --schema prisma/schema.prisma` completed successfully.
- [x] `npm.cmd run build` completed successfully.
- [~] `npm.cmd run check:production` runs but fails until production Cloudinary and email variables are configured.
- [ ] Run database migration/push against the target Postgres database.
- [ ] Submit a new property listing against the deployed environment.
- [ ] Confirm the listing row exists in Postgres.
- [ ] Confirm media rows exist in Postgres when photos/videos are attached.
- [ ] Confirm the listing appears immediately in `/dashboard/admin`.
- [ ] Confirm the success redirect lands on an existing listing details page.
- [ ] Confirm no hydration error appears in Vercel logs.
- [ ] Run CRUD smoke checks for listings and admin listing actions.
- [ ] Run CRUD smoke checks for every migrated non-listing domain.
