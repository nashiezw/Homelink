import { readFileSync } from "node:fs";

const repository = readFileSync("lib/library/repository.ts", "utf8");
const schema = readFileSync("lib/db/production-schema.ts", "utf8");
const route = readFileSync("app/api/v1/library/reviews/route.ts", "utf8");

function assertIncludes(source, expected, message) {
  if (!source.includes(expected)) throw new Error(message);
}

assertIncludes(
  repository,
  "withLibraryReviewSchemaRecovery",
  "Library review reads and writes must recover only when the production schema is missing.",
);
if (repository.includes("await ensureLibraryReviewProductionSchema();\n  const prisma = getMainPrisma();")) {
  throw new Error("Healthy review requests must not run schema DDL before normal Prisma queries.");
}
for (const column of ["displayName", "guestName", "guestEmail", "guestPhone", "purchaseSource", "adminNote"]) {
  assertIncludes(schema, `ADD COLUMN IF NOT EXISTS \"${column}\"`, `Library review schema repair is missing ${column}.`);
}
assertIncludes(schema, 'ALTER COLUMN "userId" DROP NOT NULL', "Guest reviews require a nullable userId.");
assertIncludes(schema, "library_reviews_status_createdAt_idx", "The admin review queue requires a status and creation-time index.");
assertIncludes(route, '"REVIEWS_UNAVAILABLE"', "The review API must return a controlled database-unavailable response.");
assertIncludes(route, '"REVIEW_SUBMISSION_FAILED"', "The review API must return a controlled unexpected-error response.");

const adminRoute = readFileSync("app/api/v1/admin/library/route.ts", "utf8");
const adminHub = readFileSync("components/admin/library-admin-hub.tsx", "utf8");
const productPage = readFileSync("components/library/library-product-page.tsx", "utf8");
assertIncludes(adminRoute, 'type === "reviews"', "Admin reviews need a dedicated fast-loading endpoint.");
assertIncludes(adminHub, "?type=reviews&limit=100", "The review screen must load its queue independently.");
assertIncludes(adminHub, "current.reviews.map", "Review moderation must update the changed row without reloading the entire admin hub.");
assertIncludes(productPage, "if (result.data?.autoApproved)", "Pending reviews must not trigger an unnecessary public review reload.");
assertIncludes(repository, "autoApproved ? await recalculateLibraryProductRating", "Pending reviews must not recalculate unchanged public ratings.");

console.log("Library review submission checks passed.");
