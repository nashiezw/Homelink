/**
 * Smoke-check digital-only upsell list + checkout pack rules.
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

function suggestLibraryDigitalUpsellPack({
  catalog,
  seedProductIds,
  excludeProductIds = [],
  cartProductIds,
  maxItems = 4,
}) {
  const exclude = new Set([...excludeProductIds, ...seedProductIds]);
  const cartIds = new Set(cartProductIds || seedProductIds);
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const seeds = seedProductIds.map((id) => byId.get(id)).filter(Boolean);
  const sourceCandidates = new Map();
  for (const seed of seeds) {
    if ((seed.bundleProductIds || []).length) sourceCandidates.set(seed.id, seed);
    for (const product of byId.values()) {
      if ((product.bundleProductIds || []).includes(seed.id)) sourceCandidates.set(product.id, product);
    }
  }

  let best = null;
  for (const source of sourceCandidates.values()) {
    const members = [source.id, ...(source.bundleProductIds || [])];
    if (members.length < 2 || !members.some((id) => cartIds.has(id))) continue;
    const missingIds = members.filter((id) => !cartIds.has(id) && !exclude.has(id)).slice(0, maxItems);
    const items = missingIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((target) => {
        const format = pickDigital(target);
        return format ? { productId: target.id, title: target.title, price: format.price } : null;
      })
      .filter(Boolean);
    if (!items.length) continue;
    const prices = members.map((id) => pickDigital(byId.get(id))?.price || 0);
    const deal = applyLibraryBundlePromo(prices, source.bundlePromoPrice);
    const stillMissingAfterPack = members.filter(
      (id) => !cartIds.has(id) && !items.some((item) => item.productId === id),
    );
    const completesBundle = deal.savings > 0 && stillMissingAfterPack.length === 0;
    const listSubtotal = Math.round(items.reduce((sum, item) => sum + item.price, 0) * 100) / 100;
    const score = (completesBundle ? 100 : 0) + (deal.savings > 0 ? Math.min(40, deal.savings) : 0) + items.length * 5;
    const candidate = {
      sourceProductId: source.id,
      items,
      itemCount: items.length,
      listSubtotal,
      promoSavings: deal.savings > 0 ? deal.savings : undefined,
      completesBundle,
      score,
      why: completesBundle
        ? `Add these ${items.length} soft-copy companion${items.length === 1 ? "" : "s"} with ${source.title} to unlock the set promo.`
        : `Add these soft copies toward the curated set with ${source.title}.`,
    };
    if (!best || candidate.score > best.score) best = candidate;
  }
  return best;
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
  {
    id: "c",
    title: "Companion C",
    series: "Property",
    bundleProductIds: [],
    formats: [{ type: "PDF", enabled: true, price: 15 }],
  },
];

const unlock = suggestLibraryDigitalUpsells({
  catalog,
  seedProductIds: ["a"],
  cartProductIds: ["a"],
  max: 2,
  preferPromoCompanions: true,
});
assert(unlock.length === 2, "list mode can return multiple companions");
assert(unlock.some((item) => item.completesBundle === false), "with 2 missing, a single add does not complete alone");

const pack = suggestLibraryDigitalUpsellPack({
  catalog,
  seedProductIds: ["a"],
  cartProductIds: ["a"],
  maxItems: 4,
});
assert(pack?.itemCount === 2, "pack includes every missing soft-copy companion");
assert(pack?.completesBundle === true, "adding the whole pack completes the set");
assert(pack?.promoSavings === 5, "promo savings = 45 list − 40 promo");
assert(Boolean(pack?.why?.includes("unlock")), "pack explains why to add the set");
assert(pack?.listSubtotal === 30, "pack list subtotal is sum of missing digital prices");

const oneLeft = suggestLibraryDigitalUpsellPack({
  catalog,
  seedProductIds: ["a", "b"],
  cartProductIds: ["a", "b"],
  maxItems: 4,
});
assert(oneLeft?.itemCount === 1, "pack shrinks as companions enter the bag");
assert(oneLeft?.items[0]?.productId === "c", "remaining companion is C");
assert(oneLeft?.completesBundle === true, "last missing title still unlocks promo");

if (process.exitCode) {
  console.error("Library upsell checks failed.");
  process.exit(process.exitCode);
}
console.log("Library upsell checks passed.");
