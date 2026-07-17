# REST API Structure

Base path: `/api/v1`

## Authentication

- `POST /auth/session` - exchange provider token for HouseLink session context.
- `GET /auth/me` - current user, roles, verification state, saved counts.

## Listings

- `GET /listings` - searchable public feed.
- `POST /listings` - create listing for landlord or agent.
- `GET /listings/:id` - public listing details.
- `PATCH /listings/:id` - edit owned listing.
- `POST /listings/:id/media-intents` - signed Cloudinary upload intent.
- `POST /listings/:id/mark-rented` - close rental listing.
- `POST /listings/:id/report` - report fake, duplicate, scam, or stale listing.

Core filters:

- `intent`: `rent` or `buy`
- `type`: room, house, flat, cottage, commercial, land
- `city`, `suburb`, `minPrice`, `maxPrice`
- `bedrooms`, `bathrooms`
- `amenities`: Wi-Fi, solar, borehole, generator, tank, parking, security,
  furnished, pets, garden, pool
- `availableNow`
- `verifiedOnly`
- `bounds`: map viewport bounding box

## Search

- `POST /search/ai` - parse natural-language search into filters.
- `POST /saved-searches` - create alert.
- `GET /saved-searches` - list user alerts.
- `DELETE /saved-searches/:id` - remove alert.

Example AI search request:

```json
{
  "query": "I need a room under $120 near Kwekwe CBD with Wi-Fi",
  "userLocation": "Kwekwe"
}
```

## Users

- `GET /users/me/profile`
- `PATCH /users/me/profile`
- `GET /users/me/favourites`
- `POST /users/me/favourites/:listingId`
- `DELETE /users/me/favourites/:listingId`
- `POST /users/me/documents`

## Roommates

- `POST /roommates/profile`
- `GET /roommates/matches`
- `PATCH /roommates/profile`
- `POST /roommates/:id/contact`

## Dashboards

- `GET /landlord/listings`
- `GET /landlord/enquiries`
- `GET /landlord/analytics`
- `GET /agency/listings`
- `GET /agency/agents`
- `GET /agency/subscription`
- `GET /admin/review-queue`
- `GET /admin/reports`
- `GET /admin/analytics`

## Maps

- `GET /maps/nearby?city=Harare&suburb=Avondale` - nearby schools,
  hospitals, shops, transport, and CBD distance.

## Verification

- `GET /verification/requests`
- `POST /verification/requests`

## Messaging

- `POST /enquiries`
- `GET /notifications`
- `POST /notifications`

## Payments

- `POST /payments/checkout`
- `POST /payments/paynow/initiate`
- `POST /payments/webhooks/stripe`
- `POST /payments/webhooks/paynow`

## Response Envelope

```json
{
  "data": {},
  "meta": {
    "requestId": "req_123",
    "nextCursor": "cursor_456"
  }
}
```

## Error Envelope

```json
{
  "error": {
    "code": "LISTING_NOT_FOUND",
    "message": "Listing not found or no longer available.",
    "requestId": "req_123"
  }
}
```

| HTTP | Code | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Invalid query or body |
| 401 | `UNAUTHORIZED` | Missing or expired session |
| 403 | `FORBIDDEN` | Role or ownership check failed |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `DUPLICATE_LISTING` | Duplicate detection triggered |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server failure |

## Authentication Headers

```
Authorization: Bearer <provider_jwt>
```

Or for web sessions after exchange:

```
Authorization: Bearer <houselink_session_token>
```

## Pagination

Cursor-based for listing feeds and dashboards:

```
GET /listings?cursor=eyJpZCI6ImMxMjMifQ&limit=20
```

Response `meta.nextCursor` is `null` when no more results.

## Listing DTO (Public)

```json
{
  "id": "clx123",
  "title": "2-bed flat in Avondale",
  "intent": "rent",
  "propertyType": "flat",
  "price": 450,
  "currency": "USD",
  "city": "Harare",
  "suburb": "Avondale",
  "bedrooms": 2,
  "bathrooms": 1,
  "amenities": ["wifi", "solarBackup", "parking"],
  "verified": true,
  "availableFrom": "2026-07-01",
  "media": [{ "url": "...", "mediaType": "image", "sortOrder": 0 }],
  "landlord": {
    "name": "T. Moyo",
    "verified": true,
    "phoneMasked": "+263 77***"
  }
}
```

Private fields (`addressLine`, full phone, documents) are omitted from public responses.

## Webhook Security

- Stripe: verify `Stripe-Signature` header
- Paynow: verify hash per Paynow integration docs
- Idempotency: store `externalId` on `Payment` to prevent double processing

## Rate Limits (Production Targets)

| Endpoint | Limit |
| --- | --- |
| `POST /search/ai` | 20 / hour / user |
| `POST /listings` | 10 / day / landlord |
| `POST /reports` | 5 / hour / user |
| `POST /enquiries` | 30 / day / user |
| `POST /auth/session` | 10 / hour / IP |
