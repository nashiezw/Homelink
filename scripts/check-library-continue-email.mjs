/**
 * Smoke-check continue-with-email buyer rules (no DB).
 * Run: node scripts/check-library-continue-email.mjs
 */

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok: ${message}`);
}

function resolveBuyerDecision({ existing, name, email }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedName = String(name || "").trim();
  if (!normalizedEmail.includes("@")) {
    return { ok: false, code: "EMAIL_REQUIRED" };
  }
  if (!normalizedName) {
    return { ok: false, code: "NAME_REQUIRED" };
  }
  if (!existing) {
    return { ok: true, created: true, hasPassword: false };
  }
  if (["SUSPENDED", "BLOCKED", "DELETED"].includes(existing.accountStatus)) {
    return { ok: false, code: "ACCOUNT_UNAVAILABLE" };
  }
  if (existing.passwordHash) {
    return { ok: false, code: "EMAIL_EXISTS" };
  }
  return { ok: true, created: false, hasPassword: false };
}

assert(resolveBuyerDecision({ name: "", email: "a@b.com" }).code === "NAME_REQUIRED", "name required");
assert(resolveBuyerDecision({ name: "Ada", email: "bad" }).code === "EMAIL_REQUIRED", "email required");
assert(resolveBuyerDecision({ name: "Ada", email: "ada@example.com" }).created === true, "creates lightweight buyer");
assert(
  resolveBuyerDecision({
    name: "Ada",
    email: "ada@example.com",
    existing: { passwordHash: "hash", accountStatus: "ACTIVE" },
  }).code === "EMAIL_EXISTS",
  "password accounts must sign in",
);
assert(
  resolveBuyerDecision({
    name: "Ada",
    email: "ada@example.com",
    existing: { passwordHash: null, accountStatus: "ACTIVE" },
  }).created === false,
  "reuses passwordless checkout account",
);
assert(
  resolveBuyerDecision({
    name: "Ada",
    email: "ada@example.com",
    existing: { passwordHash: null, accountStatus: "SUSPENDED" },
  }).code === "ACCOUNT_UNAVAILABLE",
  "blocks suspended accounts",
);

if (process.exitCode) {
  console.error("Continue-with-email checks failed.");
  process.exit(process.exitCode);
}
console.log("Continue-with-email checks passed.");
