# Postgres Migration TODO

This file tracks every remaining `getStore()` touchpoint found during the production migration scan.

## Current Production State

- Core production crash guard no longer throws for strict Postgres deployments.
- Remaining routes without dedicated typed tables are backed by the `AppStoreSnapshot` Postgres table.
- Public listing detail no longer calls `getStore()` while Postgres listings are enabled.

## Typed Postgres Migrations Already Present

- Listings: public listing reads, listing create/update, admin listing summaries/actions.
- Auth/session: Postgres-backed auth paths.
- Favourites, saved searches, notifications, messages, reports.
- Enquiries via `PropertyEnquiryRecord`.
- Agent leads, commissions, agency dashboard, public agent profiles.
- Payments.
- Roommate profiles and matches.
- Holiday-home reviews.

## Remaining Direct Route Touchpoints

### Admin

- `app/api/v1/admin/actions/route.ts`
- `app/api/v1/admin/agencies/route.ts`
- `app/api/v1/admin/agents/route.ts`
- `app/api/v1/admin/analytics/route.ts`
- `app/api/v1/admin/audit/route.ts`
- `app/api/v1/admin/cms-content/route.ts`
- `app/api/v1/admin/enquiries/export/route.ts`
- `app/api/v1/admin/enquiries/route.ts`
- `app/api/v1/admin/holiday-homes/route.ts`
- `app/api/v1/admin/homepage/route.ts`
- `app/api/v1/admin/landlords/route.ts`
- `app/api/v1/admin/listings/route.ts`
- `app/api/v1/admin/marketing/route.ts`
- `app/api/v1/admin/me/route.ts`
- `app/api/v1/admin/overrides/route.ts`
- `app/api/v1/admin/payments/[id]/route.ts`
- `app/api/v1/admin/payments/route.ts`
- `app/api/v1/admin/property-management/route.ts`
- `app/api/v1/admin/reports/route.ts`
- `app/api/v1/admin/review-queue/route.ts`
- `app/api/v1/admin/roommates/route.ts`
- `app/api/v1/admin/tenancy-disputes/[id]/route.ts`
- `app/api/v1/admin/tenancy-disputes/route.ts`
- `app/api/v1/admin/users/[id]/route.ts`
- `app/api/v1/admin/users/route.ts`

### User Workflows

- `app/api/v1/messages/[id]/route.ts`
- `app/api/v1/messages/route.ts`
- `app/api/v1/notifications/route.ts`
- `app/api/v1/reports/route.ts`
- `app/api/v1/saved-searches/route.ts`
- `app/api/v1/users/lookup/route.ts`
- `app/api/v1/users/me/favourites/[listingId]/route.ts`
- `app/api/v1/users/me/favourites/route.ts`
- `app/api/v1/users/me/residence-history/route.ts`

### Agent And Agency

- `app/api/v1/agencies/me/route.ts`
- `app/api/v1/agents/applications/[id]/submit/route.ts`
- `app/api/v1/agents/applications/route.ts`
- `app/api/v1/agents/commissions/route.ts`
- `app/api/v1/agents/leads/route.ts`
- `app/api/v1/agents/me/route.ts`
- `app/api/v1/agents/public/[slug]/route.ts`
- `app/api/v1/agents/ratings/route.ts`
- `app/api/v1/agents/training/route.ts`

### Listings And Enquiries

- `app/api/v1/enquiries/[id]/route.ts`
- `app/api/v1/enquiries/roommate/route.ts`
- `app/api/v1/enquiries/route.ts`
- `app/api/v1/listings/[id]/images/route.ts`
- `app/api/v1/listings/[id]/mark-rented/route.ts`
- `app/api/v1/listings/[id]/media-intents/route.ts`
- `app/api/v1/listings/[id]/route.ts`
- `app/api/v1/listings/route.ts`
- `app/listings/[id]/page.tsx`

### Payments

- `app/api/v1/payments/[id]/proof/route.ts`
- `app/api/v1/payments/callback/[gateway]/route.ts`
- `app/api/v1/payments/checkout/route.ts`
- `app/api/v1/payments/config/route.ts`
- `app/api/v1/payments/webhooks/[gateway]/route.ts`

### Property Management, Tenancies, Holiday Homes, Roommates

- `app/api/v1/holiday-homes/bookings/[id]/route.ts`
- `app/api/v1/holiday-homes/bookings/route.ts`
- `app/api/v1/holiday-homes/reviews/route.ts`
- `app/api/v1/landlord/analytics/route.ts`
- `app/api/v1/property-management/requests/[id]/actions/route.ts`
- `app/api/v1/property-management/requests/[id]/route.ts`
- `app/api/v1/property-management/requests/public/route.ts`
- `app/api/v1/property-management/requests/route.ts`
- `app/api/v1/property-management/stats/route.ts`
- `app/api/v1/roommates/matches/route.ts`
- `app/api/v1/roommates/profile/route.ts`
- `app/api/v1/roommates/profiles/[userId]/route.ts`
- `app/api/v1/tenancies/[id]/address-consent/route.ts`
- `app/api/v1/tenancies/[id]/confirm/route.ts`
- `app/api/v1/tenancies/[id]/disputes/route.ts`
- `app/api/v1/tenancies/[id]/references/route.ts`
- `app/api/v1/tenancies/[id]/route.ts`
- `app/api/v1/tenancies/lease/route.ts`
- `app/api/v1/tenancies/route.ts`

### Shared Libraries

- `lib/admin/compute-analytics.ts`
- `lib/admin/require-admin.ts`
- `lib/api/listing-service.ts`
- `lib/auth/session.ts`
- `lib/homepage/data.ts`
- `lib/listings/postgres-listing-repository.ts`
- `lib/settings/runtime.ts`
- `lib/store/app-store.ts`

## Final Removal Checklist

- Replace each direct route touchpoint with a typed Prisma repository where a dedicated table exists.
- Keep snapshot-backed storage only for domains without a dedicated table.
- Add Prisma models for tenancies, residence history, holiday bookings, property-management requests, agent applications, CMS content, marketing, overrides, and review queue before removing their snapshot usage.
- After `rg "getStore\(" app lib` no longer shows production route access, restore the strict throw or remove `getStore()` from server routes entirely.
