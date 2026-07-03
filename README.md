# HomeLink Zimbabwe

Find Your Next Home with Confidence.

HomeLink Zimbabwe is a website-first property marketplace for verified rooms,
houses, flats, cottages, commercial spaces, land, and roommate matching.

## Current Milestone

This implementation delivers a working end-to-end property marketplace scaffold:

- Next.js, TypeScript, and Tailwind CSS frontend with dark mode.
- Premium responsive homepage with live search that routes to filtered results.
- Search with smart filters, AI natural-language search, and OpenStreetMap map view.
- Property detail with save, share, compare, report, call, and WhatsApp contact flows.
- Demo authentication with cookie sessions (ready to swap for Clerk/Firebase).
- Favourites, saved searches/alerts, compare (up to 3 listings), and roommate matching.
- Messaging, payments checkout (Stripe/Paynow simulation), and notifications.
- Landlord, agency, and admin dashboards wired to REST APIs.
- In-memory app store backing all `/api/v1` routes (ready for PostgreSQL/Prisma).
- CI, Docker, Prisma schema, architecture docs, and smoke test script.

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Seeker + Landlord | demo@homelinkzim.co.zw | demo1234 |
| Landlord | landlord@homelinkzim.co.zw | landlord1234 |
| Admin | admin@homelinkzim.co.zw | admin1234 |

## Run Locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

Sign in at `/auth`, search from the homepage, save listings, compare properties,
send enquiries, and manage dashboards.

## Next Build Milestones

1. Connect Prisma to PostgreSQL and replace the in-memory store.
2. Add Clerk or Firebase Auth in place of demo session auth.
3. Integrate Cloudinary signed uploads for listing media.
4. Connect live Stripe and Paynow webhooks.
5. Add Playwright end-to-end tests and Lighthouse performance budgets.

## Local Verification

```bash
npm run check:content
npm run typecheck
npm run lint
npx prisma validate
npm run build
```

`check:content` does not require installed dependencies; the other commands do.
