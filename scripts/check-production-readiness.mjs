import { existsSync, readFileSync } from "node:fs";

function loadDotenv() {
  if (!existsSync(".env")) return;
  const lines = readFileSync(".env", "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^"|"$/g, "");
  }
}

function has(name) {
  return Boolean(process.env[name]?.trim());
}

function isLocalUrl(value) {
  return !value || value.includes("localhost") || value.includes("127.0.0.1");
}

loadDotenv();

const failures = [];
const warnings = [];

if (process.env.HOMELINK_STRICT_PRODUCTION !== "true") {
  warnings.push("Set HOMELINK_STRICT_PRODUCTION=true for the final launch environment.");
}

if (!has("HOMELINK_SESSION_SECRET")) {
  warnings.push("Set HOMELINK_SESSION_SECRET to a long random value so login cookies remain stable across deploys.");
}

if (!has("NEXT_PUBLIC_APP_URL") || isLocalUrl(process.env.NEXT_PUBLIC_APP_URL)) {
  failures.push("NEXT_PUBLIC_APP_URL must be the public HTTPS origin.");
}

if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  failures.push("DATABASE_URL must point to production PostgreSQL.");
}

for (const name of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) {
  if (!has(name)) failures.push(`${name} is required for durable production media uploads.`);
}

const gatewaySecrets = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "PAYNOW_INTEGRATION_ID",
  "PAYNOW_INTEGRATION_KEY",
];
for (const name of gatewaySecrets) {
  if (!has(name)) warnings.push(`${name} is not configured; keep the matching gateway disabled until it is.`);
}

const seedPasswords = [
  ["SEED_STANDARD_PASSWORD", "HomeLink2026!"],
  ["SEED_TINASHE_PASSWORD", "HomeLink2026!"],
  ["SEED_LANDLORD_PASSWORD", "HomeLinkOwner2026!"],
  ["SEED_ADMIN_PASSWORD", "HomeLinkAdmin2026!"],
  ["SEED_CONSULTANT_PASSWORD", "HomeLinkConsultant2026!"],
];
for (const [name, unsafe] of seedPasswords) {
  if (process.env[name] === unsafe) failures.push(`${name} must be rotated from the default value.`);
}

if (failures.length) {
  console.error("\nProduction readiness failed:\n");
  for (const failure of failures) console.error(`  - ${failure}`);
}

if (warnings.length) {
  console.warn("\nProduction readiness warnings:\n");
  for (const warning of warnings) console.warn(`  - ${warning}`);
}

if (!failures.length && !warnings.length) {
  console.log("Production readiness checks passed.");
}

process.exit(failures.length ? 1 : 0);
