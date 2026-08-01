/**
 * Smoke-check soft-copy-only FBT promo maths (mirrors lib/library/catalog.ts rules).
 * Run: node scripts/check-library-bundle-promo.mjs
 */

function libraryBundlePromoAppliesToFormats(formatTypes) {
  if (!formatTypes.length) return false;
  return formatTypes.every((type) => type !== "PRINTED_BOOK");
}

function applyLibraryBundlePromo(linePrices, promoTotal, formatTypes) {
  const subtotal = Math.round(linePrices.reduce((sum, price) => sum + price, 0) * 100) / 100;
  if (formatTypes?.length && !libraryBundlePromoAppliesToFormats(formatTypes)) {
    return { linePrices, subtotal, total: subtotal, savings: 0 };
  }
  if (
    promoTotal == null ||
    !Number.isFinite(promoTotal) ||
    promoTotal <= 0 ||
    promoTotal >= subtotal - 0.001
  ) {
    return { linePrices, subtotal, total: subtotal, savings: 0 };
  }
  const target = Math.round(promoTotal * 100) / 100;
  const ratio = target / subtotal;
  const adjusted = linePrices.map((price, index) =>
    index === linePrices.length - 1 ? 0 : Math.round(price * ratio * 100) / 100,
  );
  const allocated = adjusted.slice(0, -1).reduce((sum, price) => sum + price, 0);
  adjusted[adjusted.length - 1] = Math.round((target - allocated) * 100) / 100;
  return {
    linePrices: adjusted,
    subtotal,
    total: target,
    savings: Math.round((subtotal - target) * 100) / 100,
  };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok: ${message}`);
}

const digital = applyLibraryBundlePromo([15, 15, 15], 40, ["PDF", "PDF", "PDF"]);
assert(digital.total === 40, "all-digital bundle uses soft-copy promo total");
assert(digital.savings === 5, "all-digital bundle savings = list − promo");

const mixed = applyLibraryBundlePromo([15, 25, 15], 40, ["PDF", "PRINTED_BOOK", "PDF"]);
assert(mixed.total === 55, "mixed digital+print keeps list total (not promo 40)");
assert(mixed.savings === 0, "mixed digital+print has no soft-copy promo savings");

const printOnly = applyLibraryBundlePromo([25, 25, 25], 40, ["PRINTED_BOOK", "PRINTED_BOOK", "PRINTED_BOOK"]);
assert(printOnly.total === 75, "all-print keeps list total");
assert(printOnly.savings === 0, "all-print has no soft-copy promo");

assert(
  !libraryBundlePromoAppliesToFormats(["PDF", "PRINTED_BOOK"]),
  "promo gate rejects any printed format",
);
assert(
  libraryBundlePromoAppliesToFormats(["PDF", "EPUB"]),
  "promo gate allows all-digital formats",
);

if (process.exitCode) {
  console.error("Library bundle promo checks failed.");
  process.exit(process.exitCode);
}
console.log("Library bundle promo checks passed.");
