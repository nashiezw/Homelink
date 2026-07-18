/**
 * Public production health check against houselink.co.zw.
 * Authenticated flows require SEED_* passwords and are skipped here.
 */
process.env.BASE_URL ??= "https://www.houselink.co.zw";
process.env.SMOKE_PUBLIC_ONLY ??= "1";
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === undefined) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

await import("./smoke-test.mjs");
