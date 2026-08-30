# HouseLink Live Chat

HouseLink Live is a first-party customer support and sales inbox for public visitors and staff.

## Architecture

- Public visitors use the floating `LiveChatWidget` mounted from the root layout.
- Anonymous visitors receive a secure HTTP-only visitor cookie; the stored database key is a SHA-256 hash, not the raw browser token.
- Visitor journey updates are sent through `/api/v1/live-chat/activity`.
- Messages are persisted through `/api/v1/live-chat/messages` with per-conversation idempotency keys.
- Staff use `/dashboard/admin/live-chat`, backed by `/api/v1/admin/live-chat`.
- Realtime behavior uses visibility-aware polling. This fits the current Vercel Hobby architecture without requiring WebSockets or a paid realtime provider.

## Database

Migration: `prisma/migrations/202608300001_live_chat_system/migration.sql`

Main tables:

- `live_chat_visitors`
- `live_chat_conversations`
- `live_chat_messages`
- `live_chat_participants`
- `live_chat_departments`
- `live_chat_agent_profiles`
- `live_chat_quick_replies`
- `live_chat_automation_rules`
- `live_chat_tags`
- `live_chat_leads`
- `live_chat_events`
- `live_chat_settings`

Indexes cover active visitors, conversation status/update ordering, message ordering, tags, leads, and automation rules.

## Permissions

Admin access is enforced server-side through the existing admin auth gate. Users with admin/support-style roles can access the Live Chat API. The public visitor API cannot read internal notes or arbitrary conversations.

## Staff Flows

The admin Live Chat hub supports:

- Conversation filters and search
- Active visitor view
- Proactive staff messages
- Staff replies
- Internal notes
- Department transfer
- Agent assignment
- Status workflow
- Quick replies
- Lead conversion
- Visitor context and journey timeline
- Basic 30-day analytics

## Public Flows

The visitor widget supports:

- No-account chat start
- Conversation persistence by browser session cookie
- Contact capture for name, phone/WhatsApp, and email
- Unread badge and preview
- Message polling while visible
- Read receipts at conversation level
- Context cards/links sent by staff
- Mobile-safe fixed chat panel

## Operations

Run after deployment:

```bash
npx prisma migrate deploy --schema prisma/schema.prisma
```

No new environment variables are required.

## Checks

```bash
npm run check:live-chat
npm run typecheck
npm run lint
npm run build
```
