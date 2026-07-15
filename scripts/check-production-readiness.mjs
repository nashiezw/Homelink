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
  failures.push("Set HOMELINK_STRICT_PRODUCTION=true for the final launch environment.");
}

if (!has("HOMELINK_SESSION_SECRET")) {
  failures.push("Set HOMELINK_SESSION_SECRET to a long random value so login cookies remain stable across deploys.");
} else if (process.env.HOMELINK_SESSION_SECRET.length < 32) {
  failures.push("HOMELINK_SESSION_SECRET must be at least 32 characters.");
}

if (!has("NEXT_PUBLIC_APP_URL") || isLocalUrl(process.env.NEXT_PUBLIC_APP_URL)) {
  failures.push("NEXT_PUBLIC_APP_URL must be the public HTTPS origin.");
}

if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  failures.push("DATABASE_URL must point to production PostgreSQL.");
}

if (process.env.HOMELINK_STRICT_PRODUCTION === "true" && process.env.SETTINGS_DATABASE_URL?.startsWith("file:")) {
  failures.push("SETTINGS_DATABASE_URL must not point to file: storage in strict production.");
}

for (const name of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) {
  if (!has(name)) failures.push(`${name} is required for durable production media uploads.`);
}
if (!has("HOMELINK_UPLOAD_SCAN_URL")) {
  failures.push("HOMELINK_UPLOAD_SCAN_URL is required so production uploads are antivirus/content scanned.");
}

const smtpPassConfigured = has("SMTP_PASS") || has("SMTP_PASSWORD") || has("RESEND_API_KEY");
if (!has("SMTP_HOST")) failures.push("SMTP_HOST is required for transactional email.");
if (!has("SMTP_USER")) failures.push("SMTP_USER is required for transactional email.");
if (!smtpPassConfigured) failures.push("SMTP_PASS, SMTP_PASSWORD, or RESEND_API_KEY is required for transactional email.");
if (!has("SMTP_FROM") && !has("EMAIL_FROM") && !has("RESEND_FROM") && !has("FROM_EMAIL")) {
  failures.push("SMTP_FROM, EMAIL_FROM, RESEND_FROM, or FROM_EMAIL must be a verified sender address.");
}
if ((process.env.SMTP_HOST ?? "").includes("resend.com") && process.env.SMTP_USER !== "resend") {
  failures.push("Resend SMTP requires SMTP_USER=resend.");
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
