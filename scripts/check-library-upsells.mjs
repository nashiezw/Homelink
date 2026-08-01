/**
 * Smoke-check digital-only upsell suggestion rules.
 * Run: node scripts/check-library-upsells.mjs
 */

function pickDigital(product) {
  const formats = (product.formats || []).filter((f) => f.enabled !== false);
  return formats.find((f) => f.type !== "PRINTED_BOOK") || null;
}

function suggestLibraryDigitalUpsells({ catalog, seedProductIds, excludeProductIds = [], max = 2, preferPromoCompanions = false }) {
  const exclude = new Set([...excludeProductIds, ...seedProductIds]);
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const seeds = seedProductIds.map((id) => byId.get(id)).filter(Boolean);
  const scored = [];
  const seen = new Set();

  function push(target, source, reason, score) {
    if (exclude.has(target.id) || seen.has(target.id)) return;
    const format = pickDigital(target);
    if (!format) return;
    seen.add(target.id);
    scored.push({ productId: target.id, reason, score, title: target.title });
  }

  for (const source of seeds) {
    const promoBoost = preferPromoCompanions && source.bundlePromoPrice > 0 ? 20 : 0;
    for (const id of source.bundleProductIds || []) {
      const companion = byId.get(id);
      if (companion) push(companion, source, "BUNDLE", 100 + promoBoost);
    }
  }
  for (const source of seeds) {
    const series = (source.series || "").trim().toLowerCase();
    if (!series) continue;
    for (const candidate of catalog) {
      if (candidate.id === source.id) continue;
      if ((candidate.series || "").trim().toLowerCase() !== series) continue;
      push(candidate, source, "SERIES", 40);
    }
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, max);
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok: ${message}`);
}

const catalog = [
  {
    id: "a",
    title: "Main",
    series: "Property",
    bundleProductIds: ["b", "c"],
    bundlePromoPrice: 40,
    formats: [{ type: "PDF", enabled: true, price: 15 }],
  },
  {
    id: "b",
    title: "Companion B",
    series: "Property",
    bundleProductIds: [],
    formats: [
      { type: "PDF", enabled: true, price: 15 },
      { type: "PRINTED_BOOK", enabled: true, price: 25 },
    ],
  },
  {
    id: "c",
    title: "Print only C",
    series: "Other",
    bundleProductIds: [],
    formats: [{ type: "PRINTED_BOOK", enabled: true, price: 30 }],
  },
  {
    id: "d",
    title: "Series D",
    series: "Property",
    bundleProductIds: [],
    formats: [{ type: "PDF", enabled: true, price: 12 }],
  },
];

const checkout = suggestLibraryDigitalUpsells({
  catalog,
  seedProductIds: ["a"],
  excludeProductIds: [],
  max: 2,
  preferPromoCompanions: true,
});
assert(checkout.length === 2, "returns up to 2 suggestions");
assert(checkout[0].productId === "b", "prefers digital FBT companion first");
assert(checkout.every((row) => row.productId !== "c"), "never suggests print-only titles");
assert(checkout.some((row) => row.productId === "d"), "fills with same-series digital title");

const excluded = suggestLibraryDigitalUpsells({
  catalog,
  seedProductIds: ["a"],
  excludeProductIds: ["b", "d"],
  max: 2,
});
assert(excluded.length === 0, "excludes cart/owned titles");

if (process.exitCode) {
  console.error("Library upsell checks failed.");
  process.exit(process.exitCode);
}
console.log("Library upsell checks passed.");
