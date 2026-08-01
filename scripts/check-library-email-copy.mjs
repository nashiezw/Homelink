/**
 * Smoke-check Library order + abandoned-cart email copy includes pay / set-password guidance.
 * Run: node scripts/check-library-email-copy.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const templates = readFileSync(join(root, "lib/library/email-templates.ts"), "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok: ${message}`);
}

assert(templates.includes("{{paymentUrl}}"), "order confirmation includes payment URL");
assert(templates.includes("{{paymentReference}}"), "order confirmation includes payment reference");
assert(templates.includes("{{whatsappHelpUrl}}"), "order confirmation includes WhatsApp help link");
assert(templates.includes("{{myLibraryUrl}}"), "order confirmation includes My Library URL");
assert(templates.includes("{{setPasswordNote}}"), "order confirmation includes set-password note");
assert(templates.includes("no password needed"), "abandoned cart mentions continue-with-email");
assert(templates.includes("set a password"), "abandoned cart mentions set password");
assert(templates.includes("{{opsWhatsappUrl}}"), "low stock alert includes ops WhatsApp link");
assert(templates.includes("weeklyDigest"), "weekly digest template exists");
assert(templates.includes("{{pendingProofs}}"), "weekly digest includes pending proofs");

if (process.exitCode) {
  console.error("Library email copy checks failed.");
  process.exit(process.exitCode);
}
console.log("Library email copy checks passed.");
