# Development Roadmap

Phased delivery plan for HouseLink Zimbabwe. Each phase produces a shippable increment.

## Phase 1 - Design (Steps 1-4) [CURRENT]

| Step | Deliverable | Status | Artifact |
| --- | --- | --- | --- |
| 1 | System architecture | Done | `docs/architecture.md` |
| 2 | Database schema | Done | `prisma/schema.prisma`, `docs/database-schema.md` |
| 3 | API structure | Done | `docs/api.md`, `app/api/v1/*` |
| 4 | UI/UX wireframes | Done | `docs/ux-wireframes.md`, `docs/design-system.md` |

## Phase 2 - Core Web (Steps 5-8)

| Step | Deliverable | Status | Notes |
| --- | --- | --- | --- |
| 5 | Authentication | Scaffolded | `/auth`, `GET /api/v1/auth/me` - needs Clerk/Firebase |
| 6 | Homepage | Built | `/` with hero, search, categories, featured listings |
| 7 | Search | Built | `/search` with filters - connect to PostgreSQL |
| 8 | Listings | Built | `/listings/[id]` - connect media, reviews, map |

**Exit criteria**: User can search, view listing detail, save favourites (authenticated).

## Phase 3 - Dashboards (Step 9)

| Surface | Route | Status |
| --- | --- | --- |
| Landlord | `/dashboard/landlord` | UI built |
| Agency | `/dashboard/agency` | UI built |
| Admin | `/dashboard/admin` | UI built |

**Exit criteria**: Landlord can create/edit listing; admin can approve from queue.

## Phase 4 - Engagement (Steps 10-12)

| Step | Feature | Route / API | Status |
| --- | --- | --- | --- |
| 10 | Messaging | `/messages`, `POST /enquiries` | Scaffolded |
| 11 | Payments | `/payments`, `POST /payments/checkout` | Scaffolded |
| 12 | AI search | `POST /search/ai` | Rule-based parser exists |

**Exit criteria**: Enquiry flow, Paynow/Stripe checkout, natural-language search.

## Phase 5 - Quality (Steps 13-14)

| Step | Activity |
| --- | --- |
| 13 | Unit tests, integration tests, Playwright E2E, accessibility audit |
| 14 | Lighthouse optimization, image CDN, API caching, bundle analysis |

## Phase 6 - Mobile Readiness (Step 15)

| Item | Approach |
| --- | --- |
| API-first backend | NestJS modules in `apps/api` |
| Shared types | `packages/domain` |
| Future mobile | Expo React Native consuming `/api/v1` |
| Push notifications | `NotificationChannel.PUSH` reserved in schema |

## Recommended Next Session

**Step 5 - Authentication**: Integrate Clerk, wire session to `User` table, protect dashboard routes, enable favourites persistence.

## Repository Layout (Target)

```text
HouseLink/
  app/                    # Next.js App Router (website + BFF routes)
  components/             # React UI components
  lib/                    # Client utilities, API clients
  prisma/                 # Schema and migrations
  packages/domain/        # Shared DTOs and validation
  apps/api/               # NestJS REST API (production backend)
  docs/                   # Architecture and product docs
  public/                 # Static assets
```
