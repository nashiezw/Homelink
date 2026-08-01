/**
 * Smoke-check top-class analytics surfaces.
 * Run: node scripts/check-topclass-analytics.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok: ${message}`);
}

const events = readFileSync(join(root, "lib/analytics/events.ts"), "utf8");
const topclass = readFileSync(join(root, "lib/analytics/topclass.ts"), "utf8");
const report = readFileSync(join(root, "lib/analytics/advanced-report.ts"), "utf8");
const panel = readFileSync(join(root, "components/admin/site-analytics-panel.tsx"), "utf8");
const behavior = readFileSync(join(root, "components/analytics/advanced-behavior-tracker.tsx"), "utf8");
const experiments = readFileSync(join(root, "lib/analytics/experiments.ts"), "utf8");
const identity = readFileSync(join(root, "lib/analytics/identity-client.ts"), "utf8");
const chrome = readFileSync(join(root, "components/layout/chrome-gate.tsx"), "utf8");
const contact = readFileSync(join(root, "lib/settings/contact.ts"), "utf8");
const checkout = readFileSync(join(root, "components/library/library-checkout-client.tsx"), "utf8");
const myLibrary = readFileSync(join(root, "components/library/my-library-client.tsx"), "utf8");

for (const name of [
  "library_nps_submitted",
  "rage_click",
  "ui_error",
  "experiment_exposure",
  "identity_stitched",
]) {
  assert(events.includes(`"${name}"`), `event ${name} registered`);
}
assert(
  /shouldMirrorFunnelEvent[\s\S]*rage_click[\s\S]*experiment_exposure[\s\S]*identity_stitched/.test(events),
  "funnel mirror includes advanced events",
);

assert(/export function buildTopClassAnalytics/.test(topclass), "topclass builder exists");
for (const key of [
  "pathFlows",
  "retentionCohorts",
  "ltvRfm",
  "attribution",
  "abandonRescue",
  "orderSlas",
  "fraud",
  "sampleFunnel",
  "dataQuality",
  "piiAudit",
  "anomalies",
  "goals",
]) {
  assert(topclass.includes(key), `topclass returns ${key}`);
}

assert(/buildTopClassAnalytics/.test(report) && /topClass/.test(report), "advanced report merges topClass");
assert(/section,label,value,extra/.test(report) && /attrFirst|abandonRescue|ltvRfm/.test(report), "CSV export includes topClass");
assert(/id: "board"/.test(panel) && /id: "rescue"/.test(panel) && /id: "attribution"/.test(panel), "admin panel has board/rescue/attribution");
assert(/id: "segments"/.test(panel) && /id: "quality"/.test(panel) && /id: "paths"/.test(panel), "admin panel has segments/quality/paths");
assert(/AdvancedBehaviorTracker/.test(chrome) && /rage_click/.test(behavior), "behavior tracker mounted");
assert(/getExperimentVariant/.test(experiments) && /peekExperimentVariant/.test(experiments), "experiments helpers");
assert(/stitchAnalyticsIdentity/.test(identity), "identity stitch helper");
assert(/library_nps_submitted/.test(myLibrary), "NPS prompt on My Library");
assert(/\[cart\]/.test(checkout), "checkout useEffect depends on cart");
assert(!/const main =/.test(contact), "contact.ts unused main removed");

if (process.exitCode) {
  console.error("Top-class analytics checks failed.");
  process.exit(process.exitCode);
}
console.log("Top-class analytics checks passed.");
