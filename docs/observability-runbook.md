# Observability Runbook

HouseLink production should emit enough signal to answer: who failed, where, and what money/media/listing record was affected.

## Request IDs

- Middleware adds `X-Request-Id` to API responses.
- Client bug reports should include the visible error plus request ID from network logs.
- Server logs should include request ID, route, status, user ID when known, and safe metadata only.

## Dashboards

- API errors: 4xx/5xx by route, request ID, deployment, and user role.
- Auth failures: login/register rate-limit hits, invalid credentials, blocked accounts, suspicious IP concentration.
- Upload failures: rejected MIME, signature mismatch, scanner rejection, Cloudinary failure, strict-production storage failure.
- Payments: pending proof, proof rejected, verified, refunded, failed webhook, manual transfer pending.
- Webhooks: gateway, signature result, event name, payment ID, failure reason.
- Admin actions: route, permission, actor, target, status.

## Alerts

- Any payment webhook verification failure above normal noise.
- Upload scanner unavailable in production.
- Spike in auth failures or CSRF rejects.
- Admin 403/401 spikes.
- Error rate above 2% for `/api/v1/listings`, `/api/v1/enquiries`, `/api/v1/payments`, `/api/v1/uploads`.

## Minimum Tooling

- Vercel logs for request errors and build/deploy visibility.
- Sentry or equivalent for server/client exceptions.
- Neon monitoring for database availability and slow queries.
- Cloudinary/S3 dashboard for media storage failures.
