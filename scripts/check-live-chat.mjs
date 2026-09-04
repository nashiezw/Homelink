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
    pattern: /Ready now\. Type your message and the team can reply here in real time/,
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
    pattern: /function proactiveMessageForVisitor[\s\S]*viewing \$\{title\}[\s\S]*browsing \$\{title\}[\s\S]*availability, viewing details, or price help/,
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
    pattern: /function proactiveMessageForVisitor[\s\S]*viewing \$\{title \|\| "this book"\}[\s\S]*browsing \$\{title \|\| "the HouseLink Library"\}[\s\S]*availability, viewing details, or price help/,
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
    label: "admin live visitor status renders from real presence",
    pattern: /visitor\.presenceLabel[\s\S]*function PresenceStatusBadge[\s\S]*size-2 rounded-full/,
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
    file: "app/api/v1/live-chat/stream/route.ts",
    label: "public live chat has a server-sent events stream for instant visitor updates",
    pattern: /subscribeLiveChatRealtime[\s\S]*text\/event-stream/,
  },
  {
    file: "components/live-chat/live-chat-widget.tsx",
    label: "public widget listens for instant live chat stream messages",
    pattern: /new EventSource\(`\/api\/v1\/live-chat\/stream/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "suggested first messages introduce the logged-in team member",
    pattern: /Hi, this is \$\{agentName\} from HouseLink/,
  },
  {
    file: "components/live-chat/live-chat-widget.tsx",
    label: "public live chat optimizes support avatar images before rendering",
    pattern: /displayImageUrl\(boot\?\.supportAgent\?\.avatarUrl,\s*\{\s*width:\s*96,\s*height:\s*96,\s*crop:\s*"fill"\s*\}\)/,
  },
  {
    file: "app/api/v1/admin/live-chat/stream/route.ts",
    label: "admin inbox has a realtime stream without aggressive database polling",
    pattern: /subscribeLiveChatAdminRealtime[\s\S]*admin_stream_heartbeat[\s\S]*20_000/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin inbox listens for realtime stream updates",
    pattern: /new EventSource\("\/api\/v1\/admin\/live-chat\/stream"\)/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin realtime refreshes are debounced and cannot lock controls",
    pattern: /queuedLoadRef[\s\S]*scheduleLiveRefresh[\s\S]*450/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin inbox requests time out instead of spinning forever",
    pattern: /AbortController[\s\S]*45_000/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin initial live chat timeout screen offers retry",
    pattern: /HouseLink Live did not load yet[\s\S]*Retry/,
  },
  {
    file: "lib/live-chat/repository.ts",
    label: "live chat read receipts publish realtime receipt events",
    pattern: /type:\s*"receipt"[\s\S]*messageIds/,
  },
  {
    file: "components/live-chat/live-chat-widget.tsx",
    label: "visitor read ticks turn WhatsApp-blue when read",
    pattern: /text-\[#34b7f1\][\s\S]*Read/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin read ticks turn WhatsApp-blue when read",
    pattern: /text-\[#34b7f1\][\s\S]*Read/,
  },
  {
    file: "lib/live-chat/repository.ts",
    label: "new chats are automatically routed to departments by page and message intent",
    pattern: /findDepartmentByRoute[\s\S]*inferDepartmentSlug/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin inbox hides warm and cold numeric score badges from rows",
    pattern: /temp === "HOT"[\s\S]*Hot lead/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin visitor presence dot is based on real last-seen time",
    pattern: /visitorPresence\(conversation\.visitor\.lastSeenAt\)[\s\S]*Live now[\s\S]*Offline/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin row guidance is hidden unless the lead is urgent or hot",
    pattern: /showNextAction[\s\S]*urgent \|\| temp === "HOT"/,
  },
  {
    file: "lib/live-chat/repository.ts",
    label: "lead scoring uses visitor message intent with explainable reasons",
    pattern: /senderKind === "VISITOR"[\s\S]*Currently on a high-intent page[\s\S]*leadScoreReasons/,
  },
  {
    file: "lib/live-chat/repository.ts",
    label: "live visitors keep a true live window and a recent visitor window",
    pattern: /const LIVE_VISITOR_MS = 120_000[\s\S]*const RECENT_VISITOR_MS = 5 \* 60_000[\s\S]*gte: new Date\(Date\.now\(\) - RECENT_VISITOR_MS\)/,
  },
  {
    file: "lib/live-chat/repository.ts",
    label: "visitor activity publishes realtime presence events",
    pattern: /type:\s*"presence"[\s\S]*presenceStatus:\s*"LIVE"/,
  },
  {
    file: "components/live-chat/live-chat-widget.tsx",
    label: "public widget sends recurring visitor activity heartbeats",
    pattern: /setInterval\(postActivity, 20_000\)[\s\S]*visibilitychange/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin visitors tab separates live and recent counts",
    pattern: /Visitors: \$\{visitorCounts\.live\} live, \$\{visitorCounts\.recent\} recent[\s\S]*Recently active/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin visitors tab refreshes without pressing the manual refresh button",
    pattern: /panel === "inbox" \|\| panel === "visitors"[\s\S]*LIVE_VISITORS_REFRESH_MS[\s\S]*refreshOnVisible/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin proactive sends stop spinner before background inbox refresh",
    pattern: /PROACTIVE_SEND_TIMEOUT_MS[\s\S]*controller\.abort\(\)[\s\S]*setStartingVisitorId\(null\)/,
  },
  {
    file: "lib/live-chat/repository.ts",
    label: "admin staff sends return before non-critical audit work",
    pattern: /publishLiveChatRealtime\([\s\S]*void recordParticipantActivity[\s\S]*void auditEvent/,
  },
  {
    file: "components/live-chat/live-chat-widget.tsx",
    label: "public widget keeps SSE available for reconnects after transient errors",
    pattern: /source\.onerror = \(\) => undefined/,
  },
  {
    file: "components/live-chat/live-chat-widget.tsx",
    label: "public widget treats recent staff replies as online activity",
    pattern: /latestRecentStaffActivity[\s\S]*Date\.now\(\) - time > 5 \* 60_000/,
  },
  {
    file: "lib/live-chat/repository.ts",
    label: "staff chat messages preserve paragraphs instead of flattening text",
    pattern: /replace\(\/\[\^\\S\\r\\n\]\+\/g,\s*" "\)\.replace\(\s*\/\\n\{3,\}\/g,\s*"\\n\\n"\s*\)/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin dashboard can request desktop notification permission",
    pattern: /Notification\.requestPermission/,
  },
  {
    file: "components/live-chat/live-chat-widget.tsx",
    label: "public widget switches to after-hours contact capture when no agent is live",
    pattern: /After hours[\s\S]*Request callback/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin panel includes missed-sales reporting",
    pattern: /Missed-sales report[\s\S]*recoveredChats/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin can convert chats into CRM records by lead type",
    pattern: /Convert chat to CRM[\s\S]*PROPERTY[\s\S]*LIBRARY[\s\S]*ACADEMY/,
  },
  {
    file: "components/live-chat/live-chat-widget.tsx",
    label: "public unread badge persists across refreshes",
    pattern: /UNREAD_STORAGE_KEY[\s\S]*localStorage/,
  },
  {
    file: "components/live-chat/live-chat-widget.tsx",
    label: "visitor failed messages can be retried",
    pattern: /Failed to send\. Tap to retry/,
  },
  {
    file: "lib/live-chat/repository.ts",
    label: "visitor messages auto-detect lead intent",
    pattern: /captureLeadIntentFromVisitorMessage[\s\S]*LEAD_INTENT_DETECTED/,
  },
  {
    file: "components/admin/live-chat-hub.tsx",
    label: "admin can continue captured phone leads on WhatsApp",
    pattern: /Continue on WhatsApp[\s\S]*whatsappFollowUpUrl/,
  },
  {
    file: "lib/live-chat/repository.ts",
    label: "missed chats can trigger configured follow-up recovery",
    pattern: /action === "missed_follow_up"[\s\S]*sendMissedChatFollowUp/,
  },
  {
    file: "components/live-chat/live-chat-widget.tsx",
    label: "visitor chat header shows agent title and department",
    pattern: /agentTitle[\s\S]*agentDepartment/,
  },
  {
    file: "lib/live-chat/repository.ts",
    label: "transfer messages name the source and destination teams",
    pattern: /fromDepartment[\s\S]*has been transferred/,
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
