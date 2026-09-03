/**
 * Reconcile public Library product view counters with first-party analytics.
 *
 * Dry-run:
 *   node scripts/sync-library-product-view-counts.mjs
 *   node scripts/sync-library-product-view-counts.mjs --slug=the-complete-guide-to-property-development-and-property-law-in-zimbabwe
 *
 * Apply updates:
 *   node scripts/sync-library-product-view-counts.mjs --write
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const write = process.argv.includes("--write");
const daysArg = Number(process.argv.find((arg) => arg.startsWith("--days="))?.split("=")[1] ?? 30);
const days = Number.isFinite(daysArg) ? Math.max(1, Math.min(365, Math.round(daysArg))) : 30;
const onlySlug = process.argv.find((arg) => arg.startsWith("--slug="))?.split("=")[1]?.trim().toLowerCase() || "";
const since = new Date(Date.now() - days * 86_400_000);

function normalizeTitleKey(value) {
  return String(value || "")
    .replace(/\s*[|–-]\s*HouseLink.*$/i, "")
    .replace(/\s*[|–-]\s*Library.*$/i, "")
    .trim()
    .toLowerCase();
}

function slugFromPath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw, "https://www.houselink.co.zw");
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[0] === "library" && parts[1] && parts[1] !== "checkout" ? decodeURIComponent(parts[1]).toLowerCase() : "";
  } catch {
    const parts = raw.split("?")[0]?.split("#")[0]?.split("/").filter(Boolean) ?? [];
    return parts[0] === "library" && parts[1] && parts[1] !== "checkout" ? decodeURIComponent(parts[1]).toLowerCase() : "";
  }
}

function metaText(metadata, ...keys) {
  const meta = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function makeResolver(products) {
  const aliases = new Map();
  for (const product of products) {
    aliases.set(product.id, product.id);
    aliases.set(product.slug.toLowerCase(), product.id);
    aliases.set(`/library/${product.slug}`.toLowerCase(), product.id);
    aliases.set(normalizeTitleKey(product.title), product.id);
  }
  return (raw, title, path) => {
    const id = String(raw || "").trim();
    if (id && aliases.has(id)) return aliases.get(id);
    if (id && aliases.has(id.toLowerCase())) return aliases.get(id.toLowerCase());
    const slug = slugFromPath(path || id);
    if (slug && aliases.has(slug)) return aliases.get(slug);
    const titleKey = normalizeTitleKey(title);
    if (titleKey && aliases.has(titleKey)) return aliases.get(titleKey);
    return "";
  };
}

function addView(counts, seen, productId, visitorId, sessionId, at) {
  if (!productId) return;
  const bucket = Math.floor(new Date(at).getTime() / 30_000);
  const key = [visitorId || "visitor", sessionId || "session", productId, bucket].join(":");
  if (seen.has(key)) return;
  seen.add(key);
  counts.set(productId, (counts.get(productId) ?? 0) + 1);
}

async function main() {
  const products = await prisma.libraryProduct.findMany({
    where: { deletedAt: null, ...(onlySlug ? { slug: onlySlug } : {}) },
    select: { id: true, slug: true, title: true, viewCount: true },
    take: 1000,
  });
  if (onlySlug && !products.length) throw new Error(`No Library product found for slug: ${onlySlug}`);
  const resolveProductId = makeResolver(products);
  const targetAliases = products.flatMap((product) => [product.id, product.slug, `/library/${product.slug}`, product.title]);
  const slugFilters = products.map((product) => ({ path: { contains: product.slug } }));
  const [events, pageViews] = await Promise.all([
    prisma.siteFunnelEvent.findMany({
      where: {
        createdAt: { gte: since },
        name: "library_product_viewed",
        ...(onlySlug ? { OR: [{ target: { in: targetAliases } }, ...slugFilters] } : {}),
      },
      select: { target: true, path: true, metadata: true, visitorId: true, sessionId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20_000,
    }),
    prisma.sitePageView.findMany({
      where: {
        startedAt: { gte: since },
        OR: onlySlug ? slugFilters : [{ path: { startsWith: "/library/" } }],
      },
      select: { path: true, title: true, visitorId: true, sessionId: true, startedAt: true },
      orderBy: { startedAt: "desc" },
      take: 20_000,
    }),
  ]);

  const counts = new Map();
  const seen = new Set();
  for (const event of events) {
    const title = metaText(event.metadata, "title", "productTitle");
    const rawId = metaText(event.metadata, "productId", "id") || event.target || event.path || "";
    addView(counts, seen, resolveProductId(rawId, title, event.path || event.target), event.visitorId, event.sessionId, event.createdAt);
  }
  for (const pageView of pageViews) {
    const slug = slugFromPath(pageView.path);
    addView(counts, seen, resolveProductId(slug, pageView.title || "", pageView.path), pageView.visitorId, pageView.sessionId, pageView.startedAt);
  }

  const stale = products
    .map((product) => ({
      id: product.id,
      slug: product.slug,
      title: product.title,
      current: product.viewCount,
      tracked: counts.get(product.id) ?? 0,
      next: Math.max(product.viewCount, counts.get(product.id) ?? 0),
    }))
    .filter((product) => product.next > product.current)
    .sort((a, b) => b.next - b.current - (a.next - a.current));

  console.log(JSON.stringify({ mode: write ? "write" : "dry-run", days, checkedProducts: products.length, staleProducts: stale.length, stale: stale.slice(0, 25) }, null, 2));

  if (!write) return;
  for (const product of stale) {
    await prisma.libraryProduct.update({
      where: { id: product.id },
      data: { viewCount: product.next },
    });
  }
  console.log(`Updated ${stale.length} Library product view counters.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
