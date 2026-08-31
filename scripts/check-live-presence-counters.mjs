import { readFileSync } from "node:fs";

const widget = readFileSync("components/live-chat/live-chat-widget.tsx", "utf8");
const repository = readFileSync("lib/live-chat/repository.ts", "utf8");
const types = readFileSync("lib/live-chat/types.ts", "utf8");
const advancedReport = readFileSync("lib/analytics/advanced-report.ts", "utf8");

const checks = [
  {
    label: "live chat context carries analytics visitor and session IDs",
    pass: /analyticsVisitorId\?: string/.test(types)
      && /analyticsSessionId\?: string/.test(types)
      && /getOrCreateVisitorId/.test(widget)
      && /getOrCreateSessionId/.test(widget),
  },
  {
    label: "live chat activity syncs into shared SitePresence",
    pass: /syncSharedPresenceFromLiveChat/.test(repository)
      && /upsertSitePresence/.test(repository)
      && /context\.analyticsVisitorId/.test(repository)
      && /context\.analyticsSessionId/.test(repository),
  },
  {
    label: "live chat KPI uses the same visitor source as the live visitors tab",
    pass: /prisma\.liveChatVisitor\.count\(\{ where: \{ lastSeenAt: \{ gte: new Date\(Date\.now\(\) - ACTIVE_VISITOR_MS\) \}, blockedAt: null \} \}\)/.test(repository)
      && /activeVisitors: activeVisitorsRaw\.map/.test(repository)
      && !/activeVisitors: sharedPresence/.test(repository),
  },
  {
    label: "library shoppers remain a subset of shared live visitors",
    pass: /const libraryShoppers = liveVisitors\.filter/.test(advancedReport)
      && /row\.path\.startsWith\("\/library"\)/.test(advancedReport)
      && /row\.path\.startsWith\("\/dashboard\/my-library"\)/.test(advancedReport),
  },
];

let failed = false;
for (const check of checks) {
  if (check.pass) {
    console.log(`OK   ${check.label}`);
  } else {
    failed = true;
    console.error(`FAIL ${check.label}`);
  }
}

if (failed) process.exit(1);
