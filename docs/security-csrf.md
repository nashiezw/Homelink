# CSRF Strategy

HomeLink uses signed, HttpOnly, `SameSite=Lax` session cookies. State-changing API routes also have a centralized CSRF boundary in `middleware.ts`.

The middleware applies to `POST`, `PATCH`, `PUT`, and `DELETE` under `/api/v1/*`.

## What Is Enforced

- Cross-site Fetch Metadata (`Sec-Fetch-Site: cross-site` or `none`) is rejected.
- `Origin` and `Referer`, when present, must match the request origin, `NEXT_PUBLIC_APP_URL`, or a comma-separated value in `HOMELINK_ALLOWED_ORIGINS`.
- Cookie-authenticated mutations must include `X-HomeLink-CSRF: 1`.
- `apiFetch()` automatically sends that header for unsafe methods.

## Exemptions

Payment webhooks are exempt from CSRF because they are server-to-server callbacks and are protected by gateway signature verification.

Payment gateway callbacks are also exempt because they redirect users back from an external provider and do not mutate payment state directly.

## High-Risk Coverage

This strategy covers admin actions, listing edits, messages, uploads, payments, tenancy actions, academy writes, favourites, saved searches, property-management requests, and other `/api/v1` mutations by default.

Run `npm run check:csrf` to verify the middleware and client header remain in place.
