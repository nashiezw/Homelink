import { existsSync, readFileSync } from "node:fs";

const issues = [];

const middlewarePath = "middleware.ts";
const apiClientPath = "lib/api/client.ts";

if (!existsSync(middlewarePath)) {
  issues.push("middleware.ts is required for centralized CSRF enforcement.");
} else {
  const middleware = readFileSync(middlewarePath, "utf8");
  for (const token of [
    'matcher: "/api/v1/:path*"',
    "CSRF_EXEMPT_PATHS",
    "payments\\/webhooks",
    "payments\\/callback",
    "sec-fetch-site",
    "CSRF_HEADER_REQUIRED",
    "x-homelink-csrf",
    "homelink_session",
  ]) {
    if (!middleware.includes(token)) issues.push(`middleware.ts missing ${JSON.stringify(token)}`);
  }
}

if (!existsSync(apiClientPath)) {
  issues.push("lib/api/client.ts is required for browser API requests.");
} else {
  const apiClient = readFileSync(apiClientPath, "utf8");
  for (const token of ["X-HomeLink-CSRF", "new Headers", "GET\", \"HEAD\", \"OPTIONS"]) {
    if (!apiClient.includes(token)) issues.push(`apiFetch missing ${JSON.stringify(token)}`);
  }
}

for (const route of [
  "app/api/v1/admin/actions/route.ts",
  "app/api/v1/admin/listings/route.ts",
  "app/api/v1/payments/checkout/route.ts",
  "app/api/v1/payments/[id]/proof/route.ts",
  "app/api/v1/listings/[id]/route.ts",
  "app/api/v1/messages/route.ts",
  "app/api/v1/uploads/route.ts",
  "app/api/v1/tenancies/[id]/route.ts",
]) {
  if (!existsSync(route)) issues.push(`high-risk route missing from expected location: ${route}`);
}

if (issues.length) {
  console.error("\nCSRF strategy check failed:\n");
  for (const issue of issues) console.error(`  - ${issue}`);
  process.exit(1);
}

console.log("CSRF strategy check passed.");
