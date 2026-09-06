import { readFileSync } from "node:fs";

const report = readFileSync("lib/analytics/advanced-report.ts", "utf8");
const panel = readFileSync("components/admin/site-analytics-panel.tsx", "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`OK   ${message}`);
}

assert(/identityKey: string/.test(report) && /sessionCount: number/.test(report), "journey rows expose identity key and merged session count");
assert(/function journeyIdentityKey[\s\S]*user:\$\{journey\.userId\}[\s\S]*phone:\$\{phone\}[\s\S]*email:\$\{email\}[\s\S]*visitor:\$\{journey\.visitorId\}/.test(report), "journeys identify people by user, phone, email, then visitor id");
assert(/mergeJourneyRowsByIdentity\(\[\.\.\.sessionMap\.values\(\)\]/.test(report), "advanced report merges session journeys before returning them");
assert(/summaryPrefix[\s\S]*returned across \$\{sessionCount\} sessions/.test(report), "merged journeys explain returning sessions");
assert(/uniqueJourneyCount/.test(panel), "admin journey metrics count unique identities");
assert(/Unique known contacts/.test(panel) && /Unique phone contacts/.test(panel), "admin journey labels describe unique contact counts");
assert(/sessions merged/.test(panel) && /<JourneyFact icon=\{Route\} label="Sessions"/.test(panel), "admin journey UI shows merged session count");

if (process.exitCode) {
  console.error("Library journey dedupe checks failed.");
  process.exit(process.exitCode);
}

console.log("Library journey dedupe checks passed.");
