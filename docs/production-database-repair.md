# Production Database Repair

Use this runbook when production has Prisma `P2022` errors or missing seed data.

Never paste the production database URL into chat, Git, screenshots, or docs. Set it only in your shell or Vercel environment variables.

## What This Repair Covers

- Adds and backfills `Listing.slug`.
- Adds `Review.metadata` as `JSONB`.
- Ensures the Prisma schema and generated client know about `Listing.slug`.
- Seeds initial users, listings, media, a roommate profile, an agent lead, and a review without duplicating rows.
- Provides an audit command that compares Prisma Client models/enums with the live Postgres schema.

## Safe Command Order

Run from the repository root with the real production `DATABASE_URL` available in the shell.

```powershell
npm.cmd install
npx.cmd prisma generate --schema prisma\schema.prisma
npx.cmd prisma migrate deploy --schema prisma\schema.prisma
npm.cmd run db:audit:production
npm.cmd run db:seed:production
npm.cmd run db:audit:production
```

Then redeploy Vercel so the generated Prisma Client and application code are deployed together.

## Vercel Production Notes

Set these variables in Vercel Production before redeploying:

```text
DATABASE_URL=your Postgres connection string
HOMELINK_STRICT_PRODUCTION=true
NEXT_PUBLIC_APP_URL=https://homelinkzim.co.zw
HOMELINK_SESSION_SECRET=long random secret
SEED_STANDARD_PASSWORD=strong private password
SEED_ADMIN_PASSWORD=strong private admin password
```

The seed script is idempotent. It uses stable user emails, listing slugs, and seed metadata keys, so running it more than once updates seed rows and avoids duplicate demo data.

## Expected Verification

After migration and seed:

- `npm.cmd run db:audit:production` should report `issueCount: 0` or only reviewed warnings.
- Home page listings should come from Postgres.
- `/listings/<slug>` should open existing listings.
- New listing submission should return a persisted `id` and `slug`.
- Admin listings, users, reviews, roommate data, agent data, and bookings/reviews pages should load without Prisma `P2022` errors.
