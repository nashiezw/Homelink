import { existsSync, readFileSync } from "node:fs";

const checks = [
  {
    flow: "auth",
    files: ["app/api/v1/auth/session/route.ts", "app/api/v1/auth/me/route.ts"],
    requireAny: ["shouldUsePostgresAuth"],
    requireAll: ["getPostgres"],
  },
  {
    flow: "listings",
    files: [
      "app/api/v1/listings/route.ts",
      "app/api/v1/listings/[id]/route.ts",
      "app/api/v1/listings/[id]/images/route.ts",
      "app/api/v1/listings/[id]/mark-rented/route.ts",
    ],
    requireAny: ["shouldUsePostgresListings"],
    requireAll: ["Postgres"],
  },
  {
    flow: "favourites",
    files: ["app/api/v1/users/me/favourites/route.ts", "app/api/v1/users/me/favourites/[listingId]/route.ts"],
    requireAny: ["listFavouriteListingsFromPostgres", "addFavouriteInPostgres", "removeFavouriteInPostgres"],
    requireAll: ["shouldUsePostgresPersistence"],
  },
  {
    flow: "enquiries",
    files: ["app/api/v1/enquiries/route.ts", "app/api/v1/enquiries/[id]/route.ts"],
    requireAny: ["shouldUsePostgresEnquiries"],
    requireAll: ["Postgres"],
  },
  {
    flow: "messages",
    files: ["app/api/v1/messages/route.ts", "app/api/v1/messages/[id]/route.ts"],
    requireAny: ["listConversationsFromPostgres", "sendMessageInPostgres", "listMessagesFromPostgres"],
    requireAll: ["shouldUsePostgresPersistence"],
  },
  {
    flow: "payments",
    files: [
      "app/api/v1/payments/checkout/route.ts",
      "app/api/v1/payments/[id]/proof/route.ts",
      "app/api/v1/payments/webhooks/[gateway]/route.ts",
      "app/api/v1/payments/callback/[gateway]/route.ts",
      "app/api/v1/payments/config/route.ts",
    ],
    requireAny: ["shouldUsePostgresPayments"],
    requireAll: ["Postgres"],
  },
  {
    flow: "uploads",
    files: ["app/api/v1/uploads/route.ts"],
    requireAny: ["hasCloudinaryConfig"],
    requireAll: ["requireStrictProductionConfig", "MEDIA_STORAGE_NOT_CONFIGURED"],
  },
  {
    flow: "academy progress",
    files: ["app/api/v1/academy/progress/route.ts", "lib/academy/academy-progress.ts"],
    requireAny: ["completeLessonForLearner", "lessonProgress.upsert"],
    requireAll: ["courseProgress.upsert", "getMainPrisma"],
  },
  {
    flow: "admin actions",
    files: ["app/api/v1/admin/actions/route.ts"],
    requireAny: ["handlePostgresAdminAction"],
    requireAll: ["requireAdminAsync", "recordPostgresAuditEvent", "getMainPrisma", "SUPPORT_TICKETS_NOT_MIGRATED"],
    forbid: ['import { requireAdmin }'],
  },
  {
    flow: "legacy store guard",
    files: ["lib/store/app-store.ts"],
    requireAny: ["Legacy in-memory AppStore is disabled in strict production"],
    requireAll: ["HOMELINK_ALLOW_LEGACY_STORE", "HOMELINK_STRICT_PRODUCTION"],
  },
];

const issues = [];

for (const check of checks) {
  const combined = check.files.map((file) => {
    if (!existsSync(file)) {
      issues.push(`${check.flow}: missing ${file}`);
      return "";
    }
    return readFileSync(file, "utf8");
  }).join("\n");

  for (const token of check.requireAll ?? []) {
    if (!combined.includes(token)) issues.push(`${check.flow}: expected token ${JSON.stringify(token)}`);
  }

  if (check.requireAny?.length && !check.requireAny.some((token) => combined.includes(token))) {
    issues.push(`${check.flow}: expected one of ${check.requireAny.map((token) => JSON.stringify(token)).join(", ")}`);
  }

  for (const token of check.forbid ?? []) {
    if (combined.includes(token)) issues.push(`${check.flow}: forbidden token ${JSON.stringify(token)}`);
  }
}

if (issues.length) {
  console.error("\nProduction persistence gate failed:\n");
  for (const issue of issues) console.error(`  - ${issue}`);
  process.exit(1);
}

console.log(`Production persistence gate passed for ${checks.length} launch-critical flows.`);
