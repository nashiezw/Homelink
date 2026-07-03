# Production Environment Template

Do not commit real secret values. Use this as a worksheet while filling your hosting provider's environment variables.

## Required Core

```text
NEXT_PUBLIC_APP_URL="https://homelinkzim.co.zw"
HOMELINK_STRICT_PRODUCTION="true"
DATABASE_URL="postgresql://..."
SETTINGS_DATABASE_URL="file:./.data/settings.db"
```

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
