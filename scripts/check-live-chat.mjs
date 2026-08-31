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
    file: "components/live-chat/live-chat-widget.tsx",
    label: "chat widget broadcasts floating open state",
    pattern: /setLiveChatFloatingOpen\(next\)/,
  },
  {
    file: "components/library/library-cart-fab.tsx",
    label: "library cart FAB hides while live chat is open",
    pattern: /liveChatOpen/,
  },
  {
    file: "components/live-chat/live-chat-widget.tsx",
    label: "closed live chat launcher sits above the product mobile action dock",
    pattern: /bottom-\[calc\(5\.75rem\+env\(safe-area-inset-bottom\)\)\]/,
  },
  {
    file: "components/library/library-cart-fab.tsx",
    label: "mobile Library cart FAB lifts above the closed live chat launcher",
    pattern: /bottom-\[calc\(12\.5rem\+env\(safe-area-inset-bottom\)\)\]/,
  },
  {
    file: "components/live-chat/live-chat-widget.tsx",
    label: "public live chat bootstrap uses a slow connection state instead of a false offline error",
    pattern: /setSlowBootstrap\(true\)/,
  },
  {
    file: "components/layout/whatsapp-sticky-fab.tsx",
    label: "WhatsApp FAB hides while live chat is open",
    pattern: /liveChatOpen/,
  },
  {
    file: "lib/live-chat/repository.ts",
    label: "missing Live Chat migration is handled before model queries",
    pattern: /isLiveChatSchemaReady/,
  },
  {
    file: "lib/live-chat/repository.ts",
    label: "live chat default setup is cached away from hot paths",
    pattern: /defaultsReadyCache/,
  },
  {
    file: "lib/live-chat/repository.ts",
    label: "admin analytics are cached to protect Vercel CPU",
    pattern: /analyticsCache/,
  },
  {
    file: "components/live-chat/live-chat-widget.tsx",
    label: "public chat contact typing does not re-bootstrap chat",
    pattern: /contactRef\.current/,
  },
  {
    file: "components/live-chat/live-chat-widget.tsx",
    label: "public chat is chat-first instead of opening with a contact form",
    pattern: /handleQuickReply\(reply\.body,\s*reply\.contactField\)/,
  },
  {
    file: "components/live-chat/live-chat-widget.tsx",
    label: "public chat captures WhatsApp and email from conversation text",
    pattern: /mergeContactFromMessage/,
  },
  {
    file: "components/live-chat/live-chat-widget.tsx",
    label: "public chat hides while the Library bag drawer is open",
    pattern: /libraryBagOpen/,
  },
  {
    file: "app/api/v1/live-chat/messages/route.ts",
    label: "visitor messages carry the signed-in user identity",
    pattern: /userId:\s*getSessionUserIdFromRequest\(request\)/,
  },
  {
    file: "lib/live-chat/repository.ts",
    label: "registered visitors are enriched from their saved user profile",
    pattern: /select:\s*\{\s*name:\s*true,\s*email:\s*true,\s*phone:\s*true\s*\}/s,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin live chat avoids aggressive 5 second polling",
    pattern: /activeId \? 20000 : 30000/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin team members can manage their public chat profile",
    pattern: /action:\s*"profile"/,
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
