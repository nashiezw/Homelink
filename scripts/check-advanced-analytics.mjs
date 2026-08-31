/**
 * Smoke-check advanced analytics surfaces.
 * Run: node scripts/check-advanced-analytics.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok: ${message}`);
}

const events = readFileSync(join(root, "lib/analytics/events.ts"), "utf8");
const report = readFileSync(join(root, "lib/analytics/advanced-report.ts"), "utf8");
const presence = readFileSync(join(root, "lib/analytics/presence.ts"), "utf8");
const panel = readFileSync(join(root, "components/admin/site-analytics-panel.tsx"), "utf8");
const tracker = readFileSync(join(root, "components/analytics/site-analytics-tracker.tsx"), "utf8");
const cart = readFileSync(join(root, "lib/library/cart-client.ts"), "utf8");
const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
const prodSchema = readFileSync(join(root, "lib/db/production-schema.ts"), "utf8");

for (const name of [
  "library_cart_removed",
  "library_cart_qty_changed",
  "library_cart_cleared",
  "library_bundle_shown",
  "library_sample_opened",
  "library_scroll_depth",
  "library_download_completed",
  "presence_heartbeat",
]) {
  assert(events.includes(`"${name}"`), `event ${name} registered`);
}

assert(/model SitePresence/.test(schema), "SitePresence model in prisma");
assert(/CREATE TABLE IF NOT EXISTS "SitePresence"/.test(prodSchema), "SitePresence ensured in production schema");
assert(/upsertSitePresence|listLivePresence/.test(presence), "presence helpers exist");
assert(/getAdvancedSiteAnalyticsReport/.test(report), "advanced report exists");
assert(/products/.test(report) && /journeys/.test(report) && /cartActivity/.test(report) && /live:/.test(report), "advanced report covers products/carts/journeys/live");
assert(/librarySlugFromPath/.test(report) && /productAliases/.test(report), "product analytics normalizes library slugs and titles");
assert(/productPageViews/.test(report) && /sitePageView[\s\S]*startsWith: "\/library\/"/.test(report), "product analytics includes library page views");
assert(/addProductView/.test(report) && /library_product_viewed[\s\S]*addProductView/.test(report), "product analytics dedupes event and page-view counts");
assert(/Live now|Products|Carts|Journeys/.test(panel), "admin panel has advanced tabs");
assert(/Conversion journey/.test(panel) && /productConversionDiagnosis/.test(panel), "admin products tab explains product conversion gaps");
assert(/kind: "presence"|kind === "presence"|presence/.test(tracker), "tracker sends presence heartbeat");
assert(/library_cart_removed|CART_REMOVE/.test(cart), "cart client tracks removes");
assert(/CART_QTY_CHANGE/.test(cart), "cart client tracks qty changes");
assert(/CART_CLEAR/.test(cart), "cart client tracks clears");

if (process.exitCode) {
  console.error("Advanced analytics checks failed.");
  process.exit(process.exitCode);
}
console.log("Advanced analytics checks passed.");
