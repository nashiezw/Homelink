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

## Production Repair Result

The production Neon database was repaired on July 5, 2026.

- Prisma migration history is synchronized and `prisma migrate status` reports the schema is up to date.
- `npm.cmd run db:audit:production` reported `issueCount: 0`.
- `npm.cmd run db:seed:production` completed without creating duplicates.
- Seed row counts after repair: 5 users, 4 listings, 4 active listings, 0 empty listing slugs, 1 review, 1 roommate profile, 1 agent lead, and 4 media rows.
- Canonical production slugs were verified for old public URLs, including `/listings/harare-avondale-cottage`.

Remaining production launch tasks are environment/dashboard tasks: rotate the Neon password because it was pasted into chat, update Vercel with the rotated `DATABASE_URL`, set strict production variables, configure Cloudinary and SMTP, and redeploy.

Authenticated live smoke tests need private seed passwords. Set `SEED_STANDARD_PASSWORD` and `SEED_ADMIN_PASSWORD` in Vercel, rerun `npm.cmd run db:seed:production` with those values, then run `node --use-system-ca scripts\smoke-test.mjs` with matching local `SEED_*` variables.
