import { readFileSync } from "node:fs";

const repository = readFileSync("lib/live-chat/repository.ts", "utf8");
const types = readFileSync("lib/live-chat/types.ts", "utf8");
const hub = readFileSync("components/admin/live-chat-hub.tsx", "utf8");

const requiredRepositoryMarkers = [
  "function scoreActiveVisitor",
  "salesPriorityScore",
  "salesPriorityReasons",
  "contacted",
  "function activeVisitorQueueRank",
  "Visitor replied",
  "Checkout or payment intent",
];

const requiredTypeMarkers = [
  "salesPriorityScore: number",
  "salesPriorityLabel: string",
  "salesPriorityReasons: string[]",
  "contacted: boolean",
];

const requiredHubMarkers = [
  "buildVisitorQueueSections",
  "Hot live opportunities",
  "Contacted / open conversations",
  "visitorNeedsStaffReply",
  "salesPriorityScore",
  "salesPriorityReasons",
];

function assertIncludes(source, marker, label) {
  if (!source.includes(marker)) {
    throw new Error(`${label} is missing required marker: ${marker}`);
  }
}

for (const marker of requiredRepositoryMarkers) assertIncludes(repository, marker, "live-chat repository");
for (const marker of requiredTypeMarkers) assertIncludes(types, marker, "live-chat types");
for (const marker of requiredHubMarkers) assertIncludes(hub, marker, "live-chat admin hub");

console.log("Live chat visitor queue checks passed.");
