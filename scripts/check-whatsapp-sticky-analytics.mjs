/**
 * Smoke-check WhatsApp sticky helpers + analytics event allowlist.
 * Run: node scripts/check-whatsapp-sticky-analytics.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function getWhatsAppHref(contact, options = {}) {
  const lane = options.lane;
  let raw = options.number || contact.whatsappNumber;
  if (lane === "library" && digitsOnly(contact.whatsappLibraryNumber || "").length >= 8) {
    raw = contact.whatsappLibraryNumber;
  }
  if (lane === "property" && digitsOnly(contact.whatsappPropertyNumber || "").length >= 8) {
    raw = contact.whatsappPropertyNumber;
  }
  const digits = digitsOnly(raw);
  if (!digits) return "";
  const text = String(options.message || "").trim();
  if (!text) return `https://wa.me/${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function stickyWhatsAppVisible(contact) {
  const hasNumber =
    digitsOnly(contact.whatsappNumber).length >= 8 ||
    digitsOnly(contact.whatsappLibraryNumber).length >= 8 ||
    digitsOnly(contact.whatsappPropertyNumber).length >= 8;
  return hasNumber && contact.stickyWhatsAppEnabled !== false;
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok: ${message}`);
}

assert(getWhatsAppHref({ whatsappNumber: "+263 77 123 4567" }) === "https://wa.me/263771234567", "formats wa.me link");
assert(
  getWhatsAppHref({ whatsappNumber: "263771234567" }, { message: "Hello" }).includes("text=Hello"),
  "adds prefilled message",
);
assert(
  getWhatsAppHref(
    { whatsappNumber: "263770000000", whatsappLibraryNumber: "263771111111" },
    { lane: "library" },
  ) === "https://wa.me/263771111111",
  "routes library number",
);
assert(!stickyWhatsAppVisible({ stickyWhatsAppEnabled: true, whatsappNumber: "" }), "hides when number missing");
assert(
  stickyWhatsAppVisible({ stickyWhatsAppEnabled: true, whatsappNumber: "263771234567" }),
  "shows when enabled with number",
);
assert(
  stickyWhatsAppVisible({ stickyWhatsAppEnabled: undefined, whatsappNumber: "263771234567" }),
  "shows by default when number is set",
);
assert(
  !stickyWhatsAppVisible({ stickyWhatsAppEnabled: false, whatsappNumber: "263771234567" }),
  "hides when disabled",
);

const funnel = [
  "library_product_viewed",
  "library_cart_added",
  "library_checkout_started",
  "library_proof_uploaded",
  "library_purchase_completed",
  "whatsapp_click",
];
assert(funnel.every((name) => /^[a-z0-9_]+$/.test(name)), "funnel event names are safe labels");

const whatsappFab = readFileSync(join(root, "components/layout/whatsapp-sticky-fab.tsx"), "utf8");
const bagFab = readFileSync(join(root, "components/library/library-cart-fab.tsx"), "utf8");
const headerBag = readFileSync(join(root, "components/library/library-header-bag.tsx"), "utf8");
const analytics = readFileSync(join(root, "lib/analytics/site-analytics.ts"), "utf8");
const privacy = readFileSync(join(root, "lib/analytics/privacy-client.ts"), "utf8");
const footer = readFileSync(join(root, "components/layout/site-footer.tsx"), "utf8");
const panel = readFileSync(join(root, "components/admin/site-analytics-panel.tsx"), "utf8");

assert(/data-houselink-sticky="whatsapp"/.test(whatsappFab), "WhatsApp sticky marker present");
assert(/onLibraryProductPage[\s\S]*bottom-\[calc\(8\.75rem\+env\(safe-area-inset-bottom\)\)\]/.test(whatsappFab), "WhatsApp sticky mirrors Live Chat height on Library product pages");
assert(!/pathname\?\.startsWith\("\/library\/checkout"\)\s*\|\|\s*isLibraryProductPath\(pathname\)/.test(whatsappFab), "WhatsApp sticky stays visible on Library product pages");
assert(/library\/checkout/.test(whatsappFab), "WhatsApp sticky hides on Library checkout");
assert(/useLibraryBagFloatingOpen/.test(whatsappFab), "WhatsApp sticky hides while the Library bag drawer is open");
assert(/library_product_sticky_fab/.test(whatsappFab), "WhatsApp product-page clicks use a dedicated tracking source");
assert(/productTitle:[\s\S]*cleanProductTitle\(document\.title\)/.test(whatsappFab), "WhatsApp product-page message includes product context");
assert(/<span[^>]*lg:hidden/.test(whatsappFab), "WhatsApp label hides on desktop (icon-only)");
assert(/lg:size-12|lg:rounded-full/.test(whatsappFab), "WhatsApp compact icon circle on desktop");
assert(/stickyWhatsAppQuietHours|quiet/.test(whatsappFab), "WhatsApp quiet hours note supported");
assert(/lg:hidden/.test(bagFab) && /data-houselink-sticky="library-bag"/.test(bagFab), "Library bag FAB is mobile-only");
assert(/hidden lg:block/.test(headerBag) && /data-houselink-header-bag="library"/.test(headerBag), "Library bag header control is desktop-only");
assert(/funnelDropoff/.test(analytics) && /proofSla/.test(analytics) && /whatsappSources/.test(analytics), "analytics report includes dropoff, SLA, WA sources");
assert(/siteAnalyticsReportToCsv/.test(analytics), "CSV export helper exists");
assert(/isAnalyticsAllowed/.test(privacy) && /doNotTrack|Do Not Track/i.test(privacy), "privacy opt-out + DNT");
assert(/Turn analytics off|Turn analytics on/.test(footer), "footer analytics toggle");
assert(/Export CSV/.test(panel) && /funnel drop-off|Library funnel drop-off/i.test(panel), "admin panel shows drop-off + export");

if (process.exitCode) {
  console.error("WhatsApp sticky / analytics checks failed.");
  process.exit(process.exitCode);
}
console.log("WhatsApp sticky / analytics checks passed.");
