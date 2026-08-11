# Academy Engagement Platform — End-to-End Roadmap

This document is the working source of truth for the HouseLink Academy community, learner-success, and marketing platform.

## Guiding principles

- Participation in marketing, community, testimonials, referrals, and directories is always optional.
- Course progress, assessments, certificates, and access are never blocked by engagement participation.
- Admin-saved course data is database-controlled and must never be replaced by deployment or seed activity.
- Every learner-facing experience must work on small screens first.

## Completed

- [x] Protect manual Academy data by removing automatic Academy seeding from normal admin dashboard loads.
- [x] Regenerate Foundation lesson-note PDFs from the current database lesson content.
- [x] Verify current lesson PDF paths are included in the production runtime bundle.
- [x] Add a reliable public-asset fallback for Academy PDF downloads.
- [x] Expand the course Assessment manager to show existing quizzes and assignments.
- [x] Add assessment edit controls for gate placement, pass marks, question randomisation, time limits, points, due dates, and archive/restore status.
- [x] Add learner-preview access from course management.
- [x] Add a global learner-community configuration panel for admins.
- [x] Add an admin on/off switch, community name, WhatsApp invite URL, learner invitation, and sharing prompt.
- [x] Show the optional community invitation and copyable sharing message in the learner course view.
- [x] Validate TypeScript and a production build after the Academy workspace encoding repair.

## Engagement data and consent

- [x] Add dedicated engagement records for learner opt-ins, referrals, challenge participation, testimonials, directory profiles, and spotlight permission.
- [x] Add a safe database migration with indexes, learner ownership checks, and audit logging.
- [x] Add consent timestamps, withdrawal controls, and clear public-visibility states.
- [x] Ensure engagement records are separate from enrolment, progress, assessment, and certificate records.

## Admin engagement centre

- [x] Create a mobile-responsive Engagement Centre in Academy admin.
- [x] Add a master enable/disable switch and individual switches for each programme.
- [x] Manage community name, WhatsApp link, invitation, share prompt, and campaign schedule.
- [x] Manage referral code rules and non-cash reward options.
- [x] Moderate testimonials, reviews, graduate-directory profiles, and learner spotlights.
- [x] Create, schedule, publish, archive, and measure practical challenges.
- [x] Create office-hours events with date, time, meeting/WhatsApp link, capacity, and reminder copy.
- [x] Show engagement metrics, pending moderation, and consent status.

## Learner experience

- [x] Add a mobile-first Engagement Hub inside enrolled courses.
- [x] Let learners opt in or out of the WhatsApp community and ambassador programme.
- [x] Provide a referral link/code and clear reward status.
- [x] Let learners submit a course review or testimonial and choose whether it may be public.
- [x] Let graduates opt in to the directory and manage their visible profile.
- [x] Show practical challenges, completion evidence, and optional badges.
- [x] Show upcoming office hours and allow optional RSVP.
- [x] Add progress nudges at 25%, 50%, and 80% without blocking learning.
- [x] Ensure touch targets, forms, cards, and sharing actions are comfortable on mobile.

## Marketing and operations

- [x] Add moderated learner spotlight publishing controls.
- [x] Add ready-made WhatsApp, Facebook, LinkedIn, and status-post captions.
- [x] Add course-completion testimonial prompts and certificate follow-up prompts.
- [x] Add weekly community content themes and admin scheduling support.
- [x] Add admin export/reporting for referrals, testimonials, challenges, office hours, and consent.

## Quality and launch checks

- [x] Add API authorization and learner-ownership checks for every engagement action.
- [x] Add mobile-first responsive layouts for the learner and admin engagement flows.
- [x] Run database migration validation against the Prisma schema.
- [x] Run TypeScript, lint, and production build checks.
- [x] Verify that deployment preserves manually saved Academy courses, lessons, assessments, PDFs, and engagement records by keeping engagement records in dedicated tables.
- [ ] Commit, push, and verify the production deployment.
