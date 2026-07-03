# Operations And Release Plan

## Environments

- Local: `.env.local`, local PostgreSQL, Cloudinary sandbox, Clerk/Firebase dev
  project, Stripe test mode, Paynow sandbox where available.
- Preview: Vercel preview for the web app and Railway preview database.
- Production: Vercel web hosting, Railway PostgreSQL, Cloudinary production
  cloud, production auth project, Stripe live mode, Paynow live integration.

## Required Secrets

- `DATABASE_URL`
- `CLERK_SECRET_KEY` or Firebase service account credentials
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` or Firebase public config
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PAYNOW_INTEGRATION_ID`
- `PAYNOW_INTEGRATION_KEY`
- `HOMELINK_STRICT_PRODUCTION=true`

## Release Checklist

1. Run `npm run check:content`.
2. Run `npm run typecheck`.
3. Run `npm run lint`.
4. Run `npx prisma validate`.
5. Run `npm run check:production` with production environment variables loaded.
6. Run `npm run build`.
7. Apply database migrations.
8. Verify auth callback URLs.
9. Verify Cloudinary signed upload endpoint.
10. Verify Stripe and Paynow webhooks with live gateway signatures.
11. Smoke test search, listing detail, enquiry, report, saved search, dashboard,
    and payment flows.

## Monitoring

- Track API latency, error rate, payment webhook failures, auth failures, and
  listing creation completion rate.
- Track trust and safety queues: open reports, stale listings, duplicate
  listing candidates, verification backlog, and suspicious contact events.
- Track product metrics: search-to-contact rate, save rate, alert conversion,
  listing freshness, agency active listings, and paid upgrade conversion.

## Security Baseline

- Use HTTP-only secure cookies or verified provider sessions.
- Enforce role checks in backend services.
- Validate every request DTO.
- Store audit events for payments, reports, verification, listing state changes,
  and contact actions.
- Keep signed media upload intents short-lived.
- Rate-limit auth, AI search, listing creation, reports, and enquiry actions.
- Never expose private landlord documents or payment metadata to public listing
  responses.
