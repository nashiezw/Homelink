import { readFileSync } from "node:fs";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync("prisma/migrations/202609050001_library_product_promotions/migration.sql", "utf8");
const catalog = readFileSync("lib/library/catalog.ts", "utf8");
const repository = readFileSync("lib/library/repository.ts", "utf8");
const admin = readFileSync("components/admin/library-admin-hub.tsx", "utf8");
const productPage = readFileSync("components/library/library-product-page.tsx", "utf8");

const schemaMarkers = [
  "promotionEnabled",
  "promotionTitle",
  "promotionDescription",
  "promotionBadge",
  "promotionStartsAt",
  "promotionEndsAt",
  "promotionCountdown",
  "promotionStyle",
];

const files = [
  ["Prisma schema", schema, schemaMarkers],
  ["Promotion migration", migration, schemaMarkers],
  ["Library catalog type", catalog, schemaMarkers],
  ["Library repository", repository, [...schemaMarkers, "productInputToPrisma", "toLibraryProduct"]],
  ["Admin product form", admin, ["Product promotion", "Show promotion on product page", "Offer title", "Offer badge", "Starts at", "Ends at", "Visual style"]],
  ["Public product page", productPage, ["resolveLibraryPromotion", "LibraryPromotionOffer", "PromotionCountdown", "Ends in", "Offer price"]],
];

for (const [label, source, markers] of files) {
  for (const marker of markers) {
    if (!source.includes(marker)) {
      throw new Error(`${label} is missing required marker: ${marker}`);
    }
  }
}

console.log("Library product promotion checks passed.");
