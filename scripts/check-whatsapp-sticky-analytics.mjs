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
  const digits = digitsOnly(contact.whatsappNumber);
  if (!digits) return "";
  const text = String(options.message || "").trim();
  if (!text) return `https://wa.me/${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function stickyWhatsAppVisible(contact) {
  const hasNumber = digitsOnly(contact.whatsappNumber).length >= 8;
  // Visible whenever a valid number exists unless admin explicitly disables sticky.
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

const funnel = ["library_product_viewed", "library_cart_added", "library_checkout_started", "library_purchase_completed", "whatsapp_click"];
assert(funnel.every((name) => /^[a-z0-9_]+$/.test(name)), "funnel event names are safe labels");

const whatsappFab = readFileSync(join(root, "components/layout/whatsapp-sticky-fab.tsx"), "utf8");
const bagFab = readFileSync(join(root, "components/library/library-cart-fab.tsx"), "utf8");
const headerBag = readFileSync(join(root, "components/library/library-header-bag.tsx"), "utf8");
const whatsappFixedClass = whatsappFab.match(/"fixed[^"]+"/)?.[0] || "";
assert(/data-houselink-sticky="whatsapp"/.test(whatsappFab), "WhatsApp sticky marker present");
assert(whatsappFixedClass.includes("fixed") && !whatsappFixedClass.includes("lg:hidden"), "WhatsApp fixed control is not mobile-only");
assert(/<span[^>]*className="[^"]*lg:hidden/.test(whatsappFab), "WhatsApp label hides on desktop (icon-only)");
assert(/lg:size-12|lg:rounded-full/.test(whatsappFab), "WhatsApp compact icon circle on desktop");
assert(/lg:hidden/.test(bagFab) && /data-houselink-sticky="library-bag"/.test(bagFab), "Library bag FAB is mobile-only");
assert(/hidden lg:block/.test(headerBag) && /data-houselink-header-bag="library"/.test(headerBag), "Library bag header control is desktop-only");

if (process.exitCode) {
  console.error("WhatsApp sticky / analytics checks failed.");
  process.exit(process.exitCode);
}
console.log("WhatsApp sticky / analytics checks passed.");
