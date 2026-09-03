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
const libraryProductPage = readFileSync(join(root, "components/library/library-product-page.tsx"), "utf8");
const libraryProductRoute = readFileSync(join(root, "app/api/v1/library/products/[slug]/route.ts"), "utf8");
const libraryRepository = readFileSync(join(root, "lib/library/repository.ts"), "utf8");
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
assert(/data: \{ viewCount: \{ increment: 1 \} \ }|viewCount: \{ increment: 1 \}/.test(libraryRepository), "library product view counter increments stored product count");
assert(/export async function POST[\s\S]*action !== "view"[\s\S]*recordLibraryProductView/.test(libraryProductRoute), "library product API records view actions");
assert(/displayViewCount[\s\S]*Viewed \$\{displayViewCount\} times[\s\S]*\/api\/v1\/library\/products/.test(libraryProductPage), "library product viewed badge updates from recorded view count");
assert(/Buy Digital PDF - \$\{product\.currency\} \$\{selectedPrice\.toFixed\(2\)\}/.test(libraryProductPage), "library product page makes buy digital the primary CTA");
assert(/Digital PDF unlocks automatically once payment is confirmed/.test(libraryProductPage), "library product page clarifies digital access timing");
assert(/setReviewFormOpen[\s\S]*toggle_review_form[\s\S]*reviewFormOpen \? "Hide review form" : "Leave a review"[\s\S]*reviewFormOpen \?/.test(libraryProductPage), "library product page keeps review form behind a deliberate action");
assert(/Access kept in your Library account[\s\S]*WhatsApp support available/.test(libraryProductPage), "library product page shows checkout trust signals");
assert(/setPreviewOpen\(false\); buyNow\(\);/.test(libraryProductPage), "library sample preview includes a direct buy path");

if (process.exitCode) {
  console.error("Advanced analytics checks failed.");
  process.exit(process.exitCode);
}
console.log("Advanced analytics checks passed.");
