import { readFileSync } from "node:fs";

const publicPage = readFileSync("components/library/library-product-page.tsx", "utf8");
const adminHub = readFileSync("components/admin/library-admin-hub.tsx", "utf8");

function assertIncludes(content, needle, message) {
  if (!content.includes(needle)) {
    throw new Error(`${message}\nMissing: ${needle}`);
  }
}

assertIncludes(publicPage, 'id="reviews"', "Public product page must expose a reviews anchor.");
assertIncludes(publicPage, "?review=1#reviews", "Public product page must build direct review links.");
assertIncludes(publicPage, "setReviewFormOpen(true)", "Review deep links must open the review form.");
assertIncludes(publicPage, "scrollIntoView", "Review deep links must scroll to the feedback section.");
assertIncludes(publicPage, "Copy review link", "Public page must let staff/customers copy the review URL.");
assertIncludes(adminHub, "copyReviewRequestLink", "Admin product table must support copying review links.");
assertIncludes(adminHub, "shareReviewRequestOnWhatsApp", "Admin product table must support WhatsApp review requests.");
assertIncludes(adminHub, "?review=1#reviews", "Admin review links must land on the public review form.");
assertIncludes(adminHub, "Could you please leave a quick honest review?", "WhatsApp review request should use a polished sales-safe message.");

console.log("Library review-link checks passed.");
