import { readFileSync } from "node:fs";

const repository = readFileSync("lib/library/repository.ts", "utf8");
const schema = readFileSync("lib/db/production-schema.ts", "utf8");
const route = readFileSync("app/api/v1/library/reviews/route.ts", "utf8");

function assertIncludes(source, expected, message) {
  if (!source.includes(expected)) throw new Error(message);
}

assertIncludes(
  repository,
  "await ensureLibraryReviewProductionSchema();",
  "Library review reads and writes must repair the production review schema before using Prisma.",
);
for (const column of ["displayName", "guestName", "guestEmail", "guestPhone", "purchaseSource", "adminNote"]) {
  assertIncludes(schema, `ADD COLUMN IF NOT EXISTS \"${column}\"`, `Library review schema repair is missing ${column}.`);
}
assertIncludes(schema, 'ALTER COLUMN "userId" DROP NOT NULL', "Guest reviews require a nullable userId.");
assertIncludes(route, '"REVIEWS_UNAVAILABLE"', "The review API must return a controlled database-unavailable response.");
assertIncludes(route, '"REVIEW_SUBMISSION_FAILED"', "The review API must return a controlled unexpected-error response.");

console.log("Library review submission checks passed.");
