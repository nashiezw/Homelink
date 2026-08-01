/**
 * Smoke-check digital-only upsell suggestion + promo copy rules.
 * Run: node scripts/check-library-upsells.mjs
 */

function pickDigital(product) {
  const formats = (product.formats || []).filter((f) => f.enabled !== false);
  return formats.find((f) => f.type !== "PRINTED_BOOK") || null;
}

function applyLibraryBundlePromo(linePrices, promoTotal) {
  const subtotal = Math.round(linePrices.reduce((sum, price) => sum + price, 0) * 100) / 100;
  if (promoTotal == null || promoTotal <= 0 || promoTotal >= subtotal - 0.001) {
    return { subtotal, total: subtotal, savings: 0 };
  }
  return { subtotal, total: promoTotal, savings: Math.round((subtotal - promoTotal) * 100) / 100 };
}

function suggestLibraryDigitalUpsells({
  catalog,
  seedProductIds,
  excludeProductIds = [],
  cartProductIds,
  max = 2,
  preferPromoCompanions = false,
}) {
  const exclude = new Set([...excludeProductIds, ...seedProductIds]);
  const cartIds = new Set(cartProductIds || seedProductIds);
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const seeds = seedProductIds.map((id) => byId.get(id)).filter(Boolean);
  const scored = [];
  const seen = new Set();

  function push(target, source, reason, score) {
    if (exclude.has(target.id) || seen.has(target.id)) return;
    const format = pickDigital(target);
    if (!format) return;
    let promoLabel;
    let completesBundle = false;
    let promoSavings;
    let why = `Recommended with ${source.title}.`;
    if (reason === "BUNDLE" && source.bundlePromoPrice > 0) {
      const members = [source.id, ...(source.bundleProductIds || [])];
      const prices = members.map((id) => pickDigital(byId.get(id))?.price || 0);
      const deal = applyLibraryBundlePromo(prices, source.bundlePromoPrice);
      if (deal.savings > 0) {
        const stillMissing = members.filter((id) => id !== target.id && !cartIds.has(id));
        completesBundle = stillMissing.length === 0;
        promoSavings = deal.savings;
        promoLabel = completesBundle
          ? `Unlock soft-copy bundle · save USD ${deal.savings.toFixed(2)}`
          : `Soft-copy set deal · save USD ${deal.savings.toFixed(2)} when complete`;
        why = completesBundle
          ? `Frequently bought with ${source.title}. Add this soft copy to unlock the set promo.`
          : `Part of the soft-copy set with ${source.title}.`;
        score += completesBundle ? 50 : 15;
      }
    }
    seen.add(target.id);
    scored.push({ productId: target.id, reason, score, title: target.title, why, promoLabel, completesBundle, promoSavings });
  }

  for (const source of seeds) {
    const promoBoost = preferPromoCompanions && source.bundlePromoPrice > 0 ? 20 : 0;
    for (const id of source.bundleProductIds || []) {
      const companion = byId.get(id);
      if (companion) push(companion, source, "BUNDLE", 100 + promoBoost);
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
    bundleProductIds: ["b"],
    bundlePromoPrice: 25,
    currency: "USD",
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
];

const unlock = suggestLibraryDigitalUpsells({
  catalog,
  seedProductIds: ["a"],
  cartProductIds: ["a"],
  max: 2,
  preferPromoCompanions: true,
});
assert(unlock[0]?.completesBundle === true, "single missing companion completes the set");
assert(Boolean(unlock[0]?.promoLabel?.includes("Unlock")), "shows unlock promo label");
assert(Boolean(unlock[0]?.why?.includes("unlock")), "explains why to add for promo");
assert(unlock[0]?.promoSavings === 5, "promo savings = 30 list − 25 promo");

if (process.exitCode) {
  console.error("Library upsell checks failed.");
  process.exit(process.exitCode);
}
console.log("Library upsell checks passed.");
