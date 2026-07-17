# Backup And Restore Drill

Backups are not real until HouseLink can restore both database records and uploaded media into a working temporary environment.

## Assets

- PostgreSQL: users, listings, enquiries, messages, payments, academy progress, admin audit logs.
- Media: listing images/videos, payment proof, verification documents, academy files, signatures.
- Secrets: production env values are not backed up in Git; store them in the hosting provider and a secure password manager.

## Weekly Drill

1. Export or restore the latest Neon backup into a temporary database.
2. Copy or point a temporary media bucket/folder at a recent media backup.
3. Set a temporary deployment with:
   - `DATABASE_URL` pointing at the restored database.
   - strict production still enabled.
   - media scanner and Cloudinary/S3 credentials for the temporary scope.
4. Run:
   - `npm run check:production`
   - `npm run e2e`
5. Manually verify:
   - A listing page renders its gallery.
   - A saved favourite still points to the same listing.
   - An enquiry still links seeker, owner, listing, and messages.
   - Payment proof links still open.
   - Academy progress and certificates still load.

## Recovery Objective

- Target RPO: 24 hours or better.
- Target RTO: same business day for marketplace browsing, 24 hours for all admin workflows.
