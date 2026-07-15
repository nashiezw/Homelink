# Mobile Launch Scan

Run this before public launch on at least one iPhone-sized viewport and one Android-sized viewport. Playwright covers Pixel 7 and iPhone 14 emulation with `npm run e2e:mobile`; a real-device spot check should still be done on production.

## Required Screens

- Home: search is visible without horizontal scroll, mobile navigation opens, primary trust links are reachable.
- Search filters: city/suburb, budget, property type, verified-only, sort, AI search, and load-more controls fit and update the URL.
- Listing gallery: cover image is visible, thumbnails scroll horizontally, lightbox opens/closes, contact buttons do not expose raw phone before intent logging.
- Auth: login/register toggle, email/password fields, and error states fit above the keyboard.
- Dashboard forms: landlord listing form, media upload controls, agreement signature, and submit button remain usable.
- Admin tables: payments/listings/enquiries tables degrade into mobile card views or remain horizontally scrollable without clipped action buttons.

## Evidence To Keep

- Playwright HTML report from `npm run e2e:mobile`.
- Two screenshots per device class: home, search filters, listing gallery, auth, landlord create listing, admin payments/listings.
- Notes for any overlap, clipped text, unclickable controls, or keyboard-obscured submit buttons.
