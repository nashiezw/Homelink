# Library lead data operations

This is an internal operating procedure, not a legal determination of retention obligations.

## Access

- The Library Leads inbox is limited to active `ADMIN` and `SUPER_ADMIN` accounts. The CSV export is limited to `SUPER_ADMIN` and writes an activity record.
- Retention decisions and erasure escalations are limited to `SUPER_ADMIN`; regular admins can still follow up on leads.
- In-app lead alerts go to active admins. Optional email backup is enabled only when `LIBRARY_LEAD_EMAIL_ALERTS=1` and SMTP is configured.
- Customer notes, contact details and CSV files must not be placed in public issue trackers or shared links. Store exported files only in approved restricted storage and delete working copies after use.
- Staff should record follow-up facts, not sensitive identity documents or payment credentials, in notes.

## Retention review

- `LIBRARY_LEAD_RETENTION_REVIEW_DAYS` sets when a lead enters the admin retention-review queue (default 365 days; accepted range 30-3650).
- The queue does **not** delete or anonymize records automatically. An authorized data owner must review linked orders, support history, disputes and applicable retention requirements before any erasure decision.
- The owner may record a `RETAIN` review or escalate an `ERASURE_REQUEST` in the lead history. Retained records return to the queue at the next interval; escalated erasure requests remain visible until a separate authorized privacy process resolves them. Escalation is not itself erasure.
- Verified privacy requests should be handled through the existing support/privacy process; removing a lead row alone would not erase analytics events, support chats, orders or notifications.
- The original submission and audit history remain available when a duplicate is linked to another lead.

## Operations

- Set a random 32-character-or-longer `CRON_SECRET` in the Vercel Production environment, then redeploy. Vercel sends it as a bearer token to the daily follow-up reminder route. The route returns `CRON_NOT_CONFIGURED` (503) without it; never put the secret in the repository or a public issue. `HOUSELINK_CRON_SECRET` remains supported for non-Vercel schedulers that send the same bearer token.
- Reconcile `EXIT_LEAD_NOTIFICATION_FAILED` activity with SMTP and application logs. A saved lead remains in the inbox even if an alert fails.
- Paid orders matched by contact are contextual only. An admin must confirm one qualifying paid order link for attribution; one order cannot be linked to multiple leads. The confirmed order must include the lead's requested product, and duplicate leads cannot receive an order link.
- Before production deployment, apply the Library lead migration against a staging copy, inspect old quote and lead rows, and run authenticated admin and customer-submission tests. Do not use the configured production database as the migration test target.
- The lead schema guard is read-only. Until the migration is applied, lead endpoints return `LEAD_SCHEMA_NOT_READY` instead of altering tables during a request; existing bulk-quote operations remain available.
