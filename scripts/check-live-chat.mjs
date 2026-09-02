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
    label: "public live chat opens as ready while history syncs in the background",
    pattern: /Ready now\. Type your message anytime/,
  },
  {
    file: "components/live-chat/live-chat-widget.tsx",
    label: "public live chat does not show a blocking syncing loader",
    pattern: /^(?![\s\S]*(Still connecting|Syncing chat|Opening your HouseLink chat))/,
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
    file: "components/live-chat/live-chat-widget.tsx",
    label: "public chat shows proactive staff messages as a launcher preview",
    pattern: /previewMessage/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "live visitor proactive buttons track loading per visitor",
    pattern: /startingVisitorId\s*===\s*visitor\.id/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin inbox has an all filter before narrowed status filters",
    pattern: /const FILTERS = \[\s*\["all",\s*"All"\]/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin inbox has a needs-reply filter for unread visitor messages",
    pattern: /\["needs-reply",\s*"Needs reply"\]/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin inbox rows show visitor replies as urgent",
    pattern: /New reply/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin notification sound is keyed to new visitor message IDs",
    pattern: /notifiedVisitorMessageIdsRef/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin bulk delete button remains readable when disabled",
    pattern: /disabled:bg-red-950\/70/,
  },
  {
    file: "lib/live-chat/repository.ts",
    label: "admin all filter returns a broader conversation window",
    pattern: /input\.filter === "needs-reply" \|\| input\.filter === "all" \? 80 : 30/,
  },
  {
    file: "lib/live-chat/repository.ts",
    label: "conversation unread state depends on latest visible message sender",
    pattern: /latestMessage\?\.senderKind === "VISITOR"/,
  },
  {
    file: "lib/live-chat/repository.ts",
    label: "admin can mark a live chat conversation read",
    pattern: /action === "mark_staff_read"/,
  },
  {
    file: "components/live-chat/live-chat-widget.tsx",
    label: "public proactive popup shows a clear new-message card",
    pattern: /New message from/,
  },
  {
    file: "components/live-chat/live-chat-widget.tsx",
    label: "public notification sound is keyed to unseen staff messages",
    pattern: /notifiedStaffMessageIdsRef/,
  },
  {
    file: "components/live-chat/live-chat-widget.tsx",
    label: "public chat plays sound for staff replies while chat is open",
    pattern: /if \(open\) \{\s*if \(boot\.settings\.soundEnabled\) playLiveChatNotificationSound\(\);/s,
  },
  {
    file: "lib/live-chat/notification-sound.ts",
    label: "live chat notification sound resumes browser audio before playback",
    pattern: /audio\.state === "suspended"\) await audio\.resume/,
  },
  {
    file: "lib/live-chat/notification-sound.ts",
    label: "live chat notification sound is longer and louder than a short beep",
    pattern: /exponentialRampToValueAtTime\(0\.16[\s\S]*start \+ 1\.05[\s\S]*1240/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "live visitors can open an existing conversation instead of starting a duplicate",
    pattern: /visitorActionLabel\(visitor\.conversation\.status\)/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin proactive messages are context-aware",
    pattern: /function proactiveMessageForVisitor[\s\S]*payment, proof upload[\s\S]*right format[\s\S]*viewing details/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin sound settings include a test sound action",
    pattern: /Test notification sound/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin sound waits until initial inbox load is seeded",
    pattern: /notificationReadyRef/,
  },
  {
    file: "lib/live-chat/repository.ts",
    label: "server fallback proactive messages are context-aware",
    pattern: /function proactiveMessageForVisitor[\s\S]*payment, proof upload[\s\S]*right format[\s\S]*viewing details/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin inbox filter changes clear the selected conversation",
    pattern: /function changeFilter[\s\S]*activeIdRef\.current\s*=\s*null/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin inbox shows readable page labels instead of raw tracking URLs",
    pattern: /function pageLabel/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin live visitors classify raw page links into readable source labels",
    pattern: /function sourceKindLabel[\s\S]*Admin dashboard[\s\S]*Library product[\s\S]*HouseLink search/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin live visitors keep full URLs behind copy and open actions",
    pattern: /function UrlActions[\s\S]*Copy \$\{label\} link[\s\S]*Open \$\{label\}/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin live visitor status renders as a round dot badge",
    pattern: /function LiveStatusBadge[\s\S]*Live now[\s\S]*size-2 rounded-full/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin conversation header uses auto-fit facts to avoid vertical text",
    pattern: /\[grid-template-columns:repeat\(auto-fit,minmax\(min\(100%,10\.75rem\),1fr\)\)\]/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin page labels strip tracking query strings before rendering",
    pattern: /function cleanJourneyPath[\s\S]*new URL/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin bulk deletion is explicit and scoped to the current filter",
    pattern: /deleteConversationsInFilter/,
  },
  {
    file: "lib/live-chat/repository.ts",
    label: "bulk live chat deletion reuses the server-side conversation filter",
    pattern: /action === "delete_conversations"[\s\S]*conversationFilter/,
  },
  {
    file: "lib/live-chat/repository.ts",
    label: "active visitors include latest conversation context for smarter admin actions",
    pattern: /activeVisitorConversations/,
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
