import { readFileSync } from "fs";

const checks = [
  {
    file: "lib/live-chat/repository.ts",
    label: "public visitor APIs filter internal messages",
    pattern: /internal:\s*false/,
  },
  {
    file: "lib/live-chat/repository.ts",
    label: "visitor browser key is hashed before persistence",
    pattern: /createHash\("sha256"\)\.update/,
  },
  {
    file: "app/api/v1/live-chat/messages/route.ts",
    label: "anonymous message endpoint is rate limited",
    pattern: /checkRateLimit\(`live-chat:\$\{ip\}`,\s*12\)/,
  },
  {
    file: "components/live-chat/live-chat-widget.tsx",
    label: "public widget is hidden from dashboard and auth surfaces",
    pattern: /pathname\?\.startsWith\("\/dashboard"\).*pathname\?\.startsWith\("\/auth"\)/s,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "staff can create internal notes without exposing them as visitor replies",
    pattern: /action:\s*"internal_note"/,
  },
  {
    file: "prisma/schema.prisma",
    label: "live chat messages enforce idempotency per conversation",
    pattern: /@@unique\(\[conversationId,\s*idempotencyKey\]\)/,
  },
];

const failures = [];

for (const check of checks) {
  const source = readFileSync(check.file, "utf8");
  if (!check.pattern.test(source)) failures.push(`${check.file}: ${check.label}`);
}

if (failures.length) {
  console.error("Live Chat checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Live Chat checks passed (${checks.length}).`);
