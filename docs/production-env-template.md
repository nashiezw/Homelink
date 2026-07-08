# Production Environment Template

Do not commit real secret values. Use this as a worksheet while filling your hosting provider's environment variables.

## Required Core

```text
NEXT_PUBLIC_APP_URL="https://homelinkzim.co.zw"
HOMELINK_STRICT_PRODUCTION="true"
HOMELINK_SESSION_SECRET=""
DATABASE_URL="postgresql://..."
```

`SETTINGS_DATABASE_URL` is only for local development SQLite settings. In strict production, HomeLink stores platform/payment settings inside the main Postgres-backed app snapshot instead of relying on a local `.data` file.

## Auth

Choose one production auth path.

```text
CLERK_SECRET_KEY=""
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
FIREBASE_PROJECT_ID=""
```

## Media

```text
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
```

## Email (transactional)

```text
SMTP_HOST=""
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="HomeLink <noreply@homelinkzim.co.zw>"
```

Or use Resend:

```text
SMTP_HOST="smtp.resend.com"
SMTP_USER="resend"
SMTP_PASS=""
RESEND_API_KEY=""
RESEND_FROM="HomeLink <noreply@homelinkzim.co.zw>"
```

## Payments

Enable only the gateways you have configured.

```text
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
PAYNOW_INTEGRATION_ID=""
PAYNOW_INTEGRATION_KEY=""
```

## Seed Password Rotation

Use strong unique values. Never reuse these defaults in production.

```text
SEED_STANDARD_PASSWORD=""
SEED_TINASHE_PASSWORD=""
SEED_LANDLORD_PASSWORD=""
SEED_ADMIN_PASSWORD=""
SEED_CONSULTANT_PASSWORD=""
```

## Vercel launch checklist

1. Set all required variables above in the Vercel project (Production environment).
2. Run `npx prisma migrate deploy` against production `DATABASE_URL` after each deploy that adds migrations.
3. Run `npm run db:seed:production` once on a fresh database, then rotate all `SEED_*` passwords.
4. Confirm `HOMELINK_STRICT_PRODUCTION=true` and `NEXT_PUBLIC_APP_URL=https://homelinkzim.co.zw`.
5. Run `npm run check:production` locally with production env values loaded to validate configuration.
6. After deploy, verify Admin → Properties, Agents → Activity, and Academy checkout show live payment details.
