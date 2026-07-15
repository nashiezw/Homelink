import { readFileSync } from "node:fs";

const middleware = readFileSync("middleware.ts", "utf8");
const analytics = readFileSync("lib/analytics/events.ts", "utf8");

const rateLimitedPaths = [
  "enquiries",
  "uploads",
  "reports",
  "search\\\\/ai",
  "payments\\\\/checkout",
  "messages",
  "admin",
  "analytics\\\\/events",
];

const events = [
  "search_submitted",
  "filter_changed",
  "listing_viewed",
  "gallery_opened",
  "enquiry_started",
  "enquiry_completed",
  "whatsapp_click",
  "saved_listing",
  "listing_submitted",
  "payment_started",
  "upload_failed",
];

const failures = [];
for (const path of rateLimitedPaths) {
  if (!new RegExp(path).test(middleware)) failures.push(`Missing middleware rate limit for ${path.replaceAll("\\\\/", "/")}`);
}
for (const event of events) {
  if (!analytics.includes(`"${event}"`)) failures.push(`Missing analytics event ${event}`);
}

if (failures.length) {
  console.error("Launch coverage check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Launch coverage check passed.");
