# Feature Matrix

## Working End To End (Demo Store)

| Area | Status | Route or API |
| --- | --- | --- |
| Homepage + live search | Working | `/` |
| Search + filters + map + AI | Working | `/search`, `POST /api/v1/search/ai` |
| Property detail actions | Working | `/listings/[id]` |
| Auth (local sessions) | Working | `/auth`, `POST /api/v1/auth/session` |
| Favourites | Working | `/saved`, `/api/v1/users/me/favourites` |
| Saved searches / alerts | Working | `POST /api/v1/saved-searches` |
| Compare (local + API) | Working | `/compare` |
| Roommate matching | Working | `/roommates`, `/api/v1/roommates/matches` |
| Messaging | Working | `/messages`, `/api/v1/messages` |
| Payments checkout | Working | `/payments`, `POST /api/v1/payments/checkout` |
| Enquiries + reports | Working | `POST /api/v1/enquiries`, `POST /api/v1/reports` |
| Durable viewing appointments | Working | `/api/v1/appointments` |
| Digital signatures + signed PDFs | Working | `/api/v1/signatures`, `/api/v1/signatures/[id]/download` |
| AI market insights | Working | `/api/v1/market-insights`, listing insight panels |
| Virtual tour analytics + hotspots | Working | `/api/v1/virtual-tours/events`, listing virtual tour viewer |
| Landlord dashboard | Working | `/dashboard/landlord` |
| Admin dashboard | Working | `/dashboard/admin` |
| Maps (OpenStreetMap) | Working | `/api/v1/maps/nearby`, map embed |
| Dark mode | Working | Header toggle |
| REST API envelope | Working | `/api/v1/*` |
| Prisma schema (design) | Ready | `prisma/schema.prisma` |
| CI, Docker, smoke test | Working | `.github/workflows/ci.yml`, `npm run smoke` |

## Requires External Services For Production

| Area | External dependency |
| --- | --- |
| Persistent database | PostgreSQL + `prisma migrate` |
| Authentication | Clerk or Firebase project |
| Media upload | Cloudinary signed uploads |
| Live maps geocoding | Google Maps API (optional) |
| Live payments | Stripe + Paynow credentials |
| SMS/WhatsApp | Provider credentials |
| LLM AI search | Hosted model provider |
| Push notifications | Mobile push credentials |
