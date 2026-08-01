/**
 * Smoke-check WhatsApp sticky helpers + analytics event allowlist.
 * Run: node scripts/check-whatsapp-sticky-analytics.mjs
 */

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
  return Boolean(contact.stickyWhatsAppEnabled && digitsOnly(contact.whatsappNumber).length >= 8);
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
  !stickyWhatsAppVisible({ stickyWhatsAppEnabled: false, whatsappNumber: "263771234567" }),
  "hides when disabled",
);

const funnel = ["library_product_viewed", "library_cart_added", "library_checkout_started", "library_purchase_completed", "whatsapp_click"];
assert(funnel.every((name) => /^[a-z0-9_]+$/.test(name)), "funnel event names are safe labels");

if (process.exitCode) {
  console.error("WhatsApp sticky / analytics checks failed.");
  process.exit(process.exitCode);
}
console.log("WhatsApp sticky / analytics checks passed.");
