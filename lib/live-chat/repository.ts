import { createHash, randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { upsertSitePresence } from "@/lib/analytics/presence";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { getClientIp } from "@/lib/api/request-meta";
import type {
  LiveChatBootstrapView,
  LiveChatContactInput,
  LiveChatConversationView,
  LiveChatDepartmentView,
  LiveChatEventView,
  LiveChatInboxView,
  LiveChatMessageView,
  LiveChatSettingsView,
  LiveChatTypingView,
  LiveChatVisitorContext,
} from "@/lib/live-chat/types";

const OPEN_STATUSES = ["NEW", "OPEN", "WAITING_FOR_CUSTOMER", "FOLLOW_UP"];
const ACTIVE_VISITOR_MS = 5 * 60_000;
const MAX_MESSAGE_LENGTH = 2_000;
const LIVE_CHAT_MIGRATION_NAME = "202608300001_live_chat_system";
const DEFAULT_DEPARTMENTS = [
  ["Property Sales", "property-sales", "#0ea5e9", "Interested in a property? We can help with viewings, due diligence, and next steps."],
  ["Rentals", "rentals", "#22c55e", "Tell us what you need and we will help you find a practical rental option."],
  ["Property Management", "property-management", "#14b8a6", "Need management help? We can route you to the right consultant."],
  ["Books & Orders", "books-orders", "#059669", "Need help choosing a book, payment option, or delivery format? We are here."],
  ["Academy", "academy", "#8b5cf6", "Ask us about HouseLink Academy courses, registration, or certificates."],
  ["Technical Support", "technical-support", "#64748b", "Tell us what is not working and we will help troubleshoot it."],
  ["General Enquiries", "general-enquiries", "#f59e0b", "Welcome to HouseLink. How can we help today?"],
] as const;

const DEFAULT_TAGS = [
  ["Hot Lead", "hot-lead", "#ef4444"],
  ["Book Buyer", "book-buyer", "#059669"],
  ["Property Buyer", "property-buyer", "#0ea5e9"],
  ["Tenant", "tenant", "#22c55e"],
  ["Landlord", "landlord", "#a855f7"],
  ["Investor", "investor", "#f59e0b"],
  ["Academy", "academy", "#8b5cf6"],
  ["Needs Follow-up", "needs-follow-up", "#f97316"],
  ["Payment Issue", "payment-issue", "#dc2626"],
  ["Bulk Order", "bulk-order", "#14b8a6"],
] as const;

const DEFAULT_QUICK_REPLIES = [
  ["Library payment help", "/bookpay", "Books & Orders", "Hi, thanks for your interest. I can help you complete the book order. Which format do you prefer: soft copy, hard copy, or both?"],
  ["Hard copy delivery", "/delivery", "Books & Orders", "Hard copies can be arranged with delivery or collection depending on location. Send your preferred city and we will confirm the best option."],
  ["Property viewing", "/viewing", "Property Sales", "We can help arrange a viewing. Please share your preferred day, time, and whether you are looking to rent or buy."],
  ["Academy enrolment", "/academy", "Academy", "I can help with Academy enrolment. Which course are you interested in, and are you registering for yourself or a team?"],
] as const;

const memory = {
  visitors: new Map<string, MemoryVisitor>(),
  conversations: new Map<string, MemoryConversation>(),
  messages: [] as MemoryMessage[],
  events: [] as MemoryEvent[],
};

const typingState = new Map<string, { visitor?: number; staff: Map<string, { displayName: string; expiresAt: number }> }>();
const TYPING_TTL_MS = 8_000;

const schemaReadyCache = { checkedAt: 0, ready: false };
const defaultsReadyCache = { checkedAt: 0, ready: false };
let analyticsCache: { checkedAt: number; value: LiveChatInboxView["analytics"] } | null = null;

type AdminUser = { id: string; name: string; email: string; roles: string[] };
type LiveChatRealtimeEvent =
  | { type: "message"; conversationId: string; visitorId?: string | null; message: LiveChatMessageView; createdAt: string }
  | { type: "typing"; conversationId: string; visitorId?: string | null; typing: LiveChatTypingView; createdAt: string };
type LiveChatRealtimeListener = (event: LiveChatRealtimeEvent) => void;

const realtimeSubscribers = new Map<string, Set<LiveChatRealtimeListener>>();

type MemoryVisitor = {
  id: string;
  publicId: string;
  visitorKeyHash: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  referrer?: string | null;
  landingPage?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  deviceType?: string | null;
  currentPath?: string | null;
  currentTitle?: string | null;
  pageStartedAt?: Date | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  blockedAt?: Date | null;
};

type MemoryConversation = {
  id: string;
  publicId: string;
  visitorId: string;
  departmentId?: string | null;
  assignedAgentId?: string | null;
  status: string;
  priority: string;
  subject?: string | null;
  source?: string | null;
  currentPath?: string | null;
  currentTitle?: string | null;
  lastMessagePreview?: string | null;
  lastMessageAt?: Date | null;
  visitorLastReadAt?: Date | null;
  staffLastReadAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MemoryMessage = {
  id: string;
  publicId: string;
  conversationId: string;
  senderKind: string;
  senderUserId?: string | null;
  senderName?: string | null;
  body: string;
  messageType: string;
  metadata?: unknown;
  internal: boolean;
  automated: boolean;
  idempotencyKey?: string | null;
  createdAt: Date;
  deliveredAt?: Date | null;
  readAt?: Date | null;
};

type MemoryEvent = {
  id: string;
  visitorId?: string | null;
  conversationId?: string | null;
  eventType: string;
  path?: string | null;
  title?: string | null;
  metadata?: unknown;
  createdAt: Date;
};

export function makeLiveChatVisitorKey() {
  return `hlv_${randomBytes(24).toString("hex")}`;
}

export function canManageLiveChat(user: AdminUser) {
  return user.roles.some((role) => ["ADMIN", "SUPER_ADMIN", "ACADEMY_ADMIN", "MODERATOR", "SUPPORT", "BILLING", "TECH_SUPPORT"].includes(role));
}

export async function bootstrapLiveChat(input: {
  request: Request;
  visitorKey: string;
  context: LiveChatVisitorContext;
  contact?: LiveChatContactInput;
  userId?: string | null;
}) {
  const settings = await getLiveChatSettings();
  const schemaReady = await isLiveChatSchemaReady();
  if (!settings.enabled) {
    return {
      visitorId: "",
      conversation: null,
      messages: [],
      departments: [],
      settings,
      suggestedMessage: null,
      setupRequired: !schemaReady,
      setupMessage: !schemaReady ? liveChatSetupMessage() : undefined,
    } satisfies LiveChatBootstrapView;
  }

  if (!isPostgresStoreEnabled()) return memoryBootstrap(input.visitorKey, input.context, input.contact);
  if (!schemaReady) return publicSetupRequiredBootstrap();

  await ensureLiveChatDefaults();
  const prisma = getMainPrisma();
  const visitor = await upsertVisitor(input);
  const conversation = await prisma.liveChatConversation.findFirst({
    where: { visitorId: visitor.id, status: { in: OPEN_STATUSES } },
    orderBy: { updatedAt: "desc" },
    include: conversationInclude(),
  });
  if (conversation && visitor.userId && conversation.userId !== visitor.userId) {
    await prisma.liveChatConversation.update({ where: { id: conversation.id }, data: { userId: visitor.userId } }).catch(() => null);
  }
  const messages = conversation
    ? await prisma.liveChatMessage.findMany({
        where: { conversationId: conversation.id, internal: false },
        orderBy: { createdAt: "asc" },
        take: 80,
      })
    : [];
  const [departments, supportAgent, proactive] = await Promise.all([
    prisma.liveChatDepartment.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    getPublicSupportAgent(),
    maybeTriggerAutomation(visitor.id, conversation?.id ?? null, input.context),
  ]);
  return {
    visitorId: visitor.publicId,
    conversation: conversation ? shapeConversation(conversation) : null,
    messages: messages.map(shapeMessage),
    departments: departments.map(shapeDepartment),
    supportAgent,
    typing: conversation ? getTypingState(conversation.publicId) : null,
    settings,
    suggestedMessage: proactive,
  } satisfies LiveChatBootstrapView;
}

export async function updateLiveChatActivity(input: {
  request: Request;
  visitorKey: string;
  context: LiveChatVisitorContext;
  contact?: LiveChatContactInput;
  userId?: string | null;
}) {
  if (isPostgresStoreEnabled() && !(await isLiveChatSchemaReady())) return { ok: true, setupRequired: true };
  if (!isPostgresStoreEnabled()) {
    const boot = await memoryBootstrap(input.visitorKey, input.context, input.contact);
    return boot;
  }
  await ensureLiveChatDefaults();
  const visitor = await upsertVisitor(input);
  const prisma = getMainPrisma();
  const conversation = await prisma.liveChatConversation.findFirst({
    where: { visitorId: visitor.id, status: { in: OPEN_STATUSES } },
    orderBy: { updatedAt: "desc" },
  });
  await prisma.liveChatEvent.create({
    data: {
      visitorId: visitor.id,
      conversationId: conversation?.id,
      eventType: "PAGE_VIEW",
      path: cleanText(input.context.path, 300),
      title: cleanText(input.context.title, 300),
      metadata: contextMetadata(input.context),
    },
  }).catch(() => null);
  if (conversation) {
    await prisma.liveChatConversation.update({
      where: { id: conversation.id },
      data: {
        userId: visitor.userId || conversation.userId,
        currentPath: cleanText(input.context.path, 500),
        currentTitle: cleanText(input.context.title, 300),
      },
    }).catch(() => null);
  }
  return { ok: true };
}

export async function sendVisitorMessage(input: {
  request: Request;
  visitorKey: string;
  body: string;
  idempotencyKey?: string;
  contact?: LiveChatContactInput;
  context?: LiveChatVisitorContext;
  departmentId?: string;
  userId?: string | null;
}) {
  const body = sanitizeMessage(input.body);
  if (!body) throw new LiveChatError("EMPTY_MESSAGE", "Write a message first.", 400);
  if (isPostgresStoreEnabled() && !(await isLiveChatSchemaReady())) throw new LiveChatError("LIVE_CHAT_SETUP_REQUIRED", liveChatSetupMessage(), 503);
  if (!isPostgresStoreEnabled()) return memorySendVisitorMessage(input.visitorKey, body);
  await ensureLiveChatDefaults();
  const visitor = await upsertVisitor({ request: input.request, visitorKey: input.visitorKey, context: input.context ?? {}, contact: input.contact, userId: input.userId });
  if (visitor.blockedAt) throw new LiveChatError("VISITOR_BLOCKED", "Chat is not available for this browser.", 403);
  const prisma = getMainPrisma();
  let conversation = await prisma.liveChatConversation.findFirst({
    where: { visitorId: visitor.id, status: { in: OPEN_STATUSES } },
    orderBy: { updatedAt: "desc" },
  });
  if (!conversation) {
    const settings = await prisma.liveChatSettings.findUnique({ where: { id: "live-chat" } });
    conversation = await prisma.liveChatConversation.create({
      data: {
        publicId: makePublicId("chat"),
        visitorId: visitor.id,
        userId: visitor.userId,
        departmentId: input.departmentId || settings?.defaultDepartmentId || undefined,
        status: "NEW",
        priority: inferPriority(input.context),
        source: visitor.source,
        currentPath: visitor.currentPath,
        currentTitle: visitor.currentTitle,
        subject: inferSubject(input.context),
      },
    });
    await prisma.liveChatMessage.create({
      data: {
        publicId: makePublicId("msg"),
        conversationId: conversation.id,
        senderKind: "SYSTEM",
        senderName: "HouseLink",
        body: "HouseLink has opened this conversation. A team member can now see the visitor journey and respond.",
        messageType: "SYSTEM",
        deliveredAt: new Date(),
      },
    });
  }
  const message = await prisma.liveChatMessage.create({
    data: {
      publicId: makePublicId("msg"),
      conversationId: conversation.id,
      senderKind: "VISITOR",
      senderName: visitor.name || "Guest visitor",
      body,
      messageType: "TEXT",
      idempotencyKey: cleanText(input.idempotencyKey, 120),
      deliveredAt: new Date(),
    },
  }).catch(async (error: unknown) => {
    if (isUniqueError(error) && input.idempotencyKey) {
      const existing = await prisma.liveChatMessage.findFirst({ where: { conversationId: conversation!.id, idempotencyKey: input.idempotencyKey } });
      if (existing) return existing;
    }
    throw error;
  });
  await prisma.liveChatConversation.update({
    where: { id: conversation.id },
    data: {
      userId: visitor.userId || conversation.userId,
      status: conversation.status === "CLOSED" ? "OPEN" : conversation.status,
      lastMessagePreview: preview(body),
      lastMessageAt: message.createdAt,
      visitorLastReadAt: message.createdAt,
      updatedAt: new Date(),
    },
  });
  await prisma.liveChatEvent.create({
    data: {
      visitorId: visitor.id,
      conversationId: conversation.id,
      eventType: "VISITOR_MESSAGE",
      path: visitor.currentPath,
      title: visitor.currentTitle,
    },
  }).catch(() => null);
  return shapeMessage(message);
}

export async function getVisitorMessages(visitorKey: string, conversationPublicId?: string | null) {
  if (isPostgresStoreEnabled() && !(await isLiveChatSchemaReady())) return [];
  if (!isPostgresStoreEnabled()) {
    const visitor = memory.visitors.get(hashVisitorKey(visitorKey));
    const conversation = [...memory.conversations.values()].find((item) => item.visitorId === visitor?.id);
    return memory.messages.filter((item) => item.conversationId === conversation?.id && !item.internal).map(shapeMemoryMessage);
  }
  const visitor = await getVisitorByKey(visitorKey);
  if (!visitor) return [];
  const prisma = getMainPrisma();
  const conversation = conversationPublicId
    ? await prisma.liveChatConversation.findFirst({ where: { publicId: conversationPublicId, visitorId: visitor.id } })
    : await prisma.liveChatConversation.findFirst({ where: { visitorId: visitor.id, status: { in: OPEN_STATUSES } }, orderBy: { updatedAt: "desc" } });
  if (!conversation) return [];
  return (await prisma.liveChatMessage.findMany({
    where: { conversationId: conversation.id, internal: false },
    orderBy: { createdAt: "asc" },
    take: 120,
  })).map(shapeMessage);
}

export async function markVisitorRead(visitorKey: string, conversationPublicId: string) {
  if (isPostgresStoreEnabled() && !(await isLiveChatSchemaReady())) return { ok: true, setupRequired: true };
  if (!isPostgresStoreEnabled()) return { ok: true };
  const visitor = await getVisitorByKey(visitorKey);
  if (!visitor) return { ok: true };
  const prisma = getMainPrisma();
  const conversation = await prisma.liveChatConversation.findFirst({ where: { publicId: conversationPublicId, visitorId: visitor.id } });
  if (!conversation) return { ok: true };
  const readAt = new Date();
  await prisma.$transaction([
    prisma.liveChatConversation.update({ where: { id: conversation.id }, data: { visitorLastReadAt: readAt } }),
    prisma.liveChatMessage.updateMany({
      where: { conversationId: conversation.id, senderKind: { not: "VISITOR" }, internal: false, readAt: null },
      data: { readAt },
    }),
  ]);
  return { ok: true };
}

export async function updateVisitorTyping(visitorKey: string, conversationPublicId: string, typing: boolean) {
  if (isPostgresStoreEnabled() && !(await isLiveChatSchemaReady())) return { ok: true, setupRequired: true };
  if (isPostgresStoreEnabled()) {
    const visitor = await getVisitorByKey(visitorKey);
    if (!visitor) return { ok: true };
    const conversation = await getMainPrisma().liveChatConversation.findFirst({ where: { publicId: conversationPublicId, visitorId: visitor.id } });
    if (!conversation) return { ok: true };
  }
  setTypingState(conversationPublicId, "visitor", "Visitor", typing);
  return { ok: true };
}

export function getLiveChatTyping(conversationPublicId: string): LiveChatTypingView {
  return getTypingState(conversationPublicId);
}

export async function getLiveChatStreamTargets(visitorKey: string, conversationPublicId?: string | null) {
  if (isPostgresStoreEnabled() && !(await isLiveChatSchemaReady())) return [];
  if (!isPostgresStoreEnabled()) {
    const visitor = memory.visitors.get(hashVisitorKey(visitorKey));
    return visitor ? [`visitor:${visitor.publicId}`, ...(conversationPublicId ? [`conversation:${conversationPublicId}`] : [])] : [];
  }
  const visitor = await getVisitorByKey(visitorKey);
  if (!visitor) return [];
  const targets = [`visitor:${visitor.publicId}`];
  if (conversationPublicId) {
    const allowedConversation = await getMainPrisma().liveChatConversation.findFirst({ where: { publicId: conversationPublicId, visitorId: visitor.id }, select: { publicId: true } });
    if (allowedConversation) targets.push(`conversation:${allowedConversation.publicId}`);
  } else {
    const conversation = await getMainPrisma().liveChatConversation.findFirst({ where: { visitorId: visitor.id, status: { in: OPEN_STATUSES } }, orderBy: { updatedAt: "desc" }, select: { publicId: true } });
    if (conversation) targets.push(`conversation:${conversation.publicId}`);
  }
  return [...new Set(targets)];
}

export function subscribeLiveChatRealtime(targets: string[], listener: LiveChatRealtimeListener) {
  for (const target of targets) {
    const listeners = realtimeSubscribers.get(target) ?? new Set<LiveChatRealtimeListener>();
    listeners.add(listener);
    realtimeSubscribers.set(target, listeners);
  }
  return () => {
    for (const target of targets) {
      const listeners = realtimeSubscribers.get(target);
      listeners?.delete(listener);
      if (listeners?.size === 0) realtimeSubscribers.delete(target);
    }
  };
}

export async function getLiveChatInbox(input: { activeConversationId?: string | null; filter?: string | null; query?: string | null; user: AdminUser }): Promise<LiveChatInboxView> {
  if (!isPostgresStoreEnabled()) return memoryInbox();
  if (!(await isLiveChatSchemaReady())) return setupRequiredInbox();
  await ensureLiveChatDefaults(input.user);
  const prisma = getMainPrisma();
  const currentAgent = await ensureAgentProfile(input.user);
  const where = conversationFilter(input.filter, input.query, input.user.id);
  const activeConversationLookup = input.activeConversationId
    ? getConversationByPublicId(input.activeConversationId).catch(() => null)
    : Promise.resolve(null);
  const [conversationRows, activeVisitorsRaw, departments, agents, quickReplies, tags, settings, analytics, activeConversation] = await Promise.all([
    prisma.liveChatConversation.findMany({
      where,
      include: conversationInclude(),
      orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
      take: input.filter === "needs-reply" || input.filter === "all" ? 80 : 30,
    }),
    prisma.liveChatVisitor.findMany({
      where: { lastSeenAt: { gte: new Date(Date.now() - ACTIVE_VISITOR_MS) }, blockedAt: null },
      orderBy: { lastSeenAt: "desc" },
      take: 40,
    }),
    prisma.liveChatDepartment.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.liveChatAgentProfile.findMany({ include: { department: true }, orderBy: { displayName: "asc" } }),
    prisma.liveChatQuickReply.findMany({ orderBy: [{ active: "desc" }, { title: "asc" }] }),
    prisma.liveChatTag.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    getLiveChatSettings(),
    getLiveChatAnalytics(),
    activeConversationLookup,
  ]);
  const conversations = input.filter === "needs-reply"
    ? conversationRows.filter(needsStaffReply)
    : prioritizeConversations(conversationRows);
  const selected = activeConversation && conversations.some((conversation) => conversation.id === activeConversation.id)
    ? activeConversation
    : conversations[0] ?? null;
  const visibleConversations = selected && !conversations.some((conversation) => conversation.id === selected.id) ? [selected, ...conversations] : conversations;
  const [messages, events] = selected
    ? await Promise.all([
        prisma.liveChatMessage.findMany({ where: { conversationId: selected.id }, orderBy: { createdAt: "asc" }, take: 150 }),
        prisma.liveChatEvent.findMany({ where: { OR: [{ conversationId: selected.id }, { visitorId: selected.visitorId }] }, orderBy: { createdAt: "desc" }, take: 40 }),
      ])
    : [[], []];
  if (!currentAgent.lastSeenAt || Date.now() - currentAgent.lastSeenAt.getTime() > 60_000) {
    await prisma.liveChatAgentProfile.update({ where: { userId: input.user.id }, data: { availability: "ONLINE", lastSeenAt: new Date() } }).catch(() => null);
  }
  const activeVisitorIds = activeVisitorsRaw.map((visitor) => visitor.id);
  const activeVisitorConversations = activeVisitorIds.length
    ? await prisma.liveChatConversation.findMany({
        where: { visitorId: { in: activeVisitorIds }, status: { notIn: ["CLOSED"] } },
        include: conversationInclude(),
        orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
      })
    : [];
  const conversationByVisitor = new Map<string, ReturnType<typeof shapeConversation>>();
  for (const conversation of activeVisitorConversations) {
    if (!conversationByVisitor.has(conversation.visitorId)) conversationByVisitor.set(conversation.visitorId, shapeConversation(conversation));
  }
  return {
    conversations: visibleConversations.map((conversation) => shapeConversation(conversation)),
    activeVisitors: activeVisitorsRaw.map((visitor) => shapeActiveVisitor(visitor, conversationByVisitor.get(visitor.id) ?? null)),
    messages: messages.map(shapeMessage),
    events: events.map(shapeEvent),
    departments: departments.map(shapeDepartment),
    agents: agents.map(shapeAgent),
    currentAgent: shapeAgent(currentAgent),
    typing: selected ? getTypingState(selected.publicId) : null,
    quickReplies: quickReplies.map((reply) => ({
      id: reply.id,
      title: reply.title,
      shortcut: reply.shortcut,
      category: reply.category,
      body: reply.body,
      departmentId: reply.departmentId,
      active: reply.active,
    })),
    tags: tags.map((tag) => ({ id: tag.id, name: tag.name, slug: tag.slug, color: tag.color, active: tag.active })),
    settings,
    analytics,
  };
}

export async function liveChatAdminAction(user: AdminUser, body: Record<string, unknown>) {
  if (!isPostgresStoreEnabled()) return { ok: true };
  if (!(await isLiveChatSchemaReady())) throw new LiveChatError("LIVE_CHAT_SETUP_REQUIRED", liveChatSetupMessage(), 503);
  await ensureLiveChatDefaults(user);
  const prisma = getMainPrisma();
  const agent = await ensureAgentProfile(user);
  const action = String(body.action ?? "");
  if (action === "send_message" || action === "internal_note") {
    const conversation = await getConversationByPublicId(String(body.conversationId ?? ""));
    if (!conversation) throw new LiveChatError("CONVERSATION_NOT_FOUND", "Conversation not found.", 404);
    const internal = action === "internal_note";
    const text = sanitizeMessage(String(body.body ?? ""));
    if (!text) throw new LiveChatError("EMPTY_MESSAGE", "Write a message first.", 400);
    const message = await prisma.liveChatMessage.create({
      data: {
        publicId: makePublicId("msg"),
        conversationId: conversation.id,
        senderKind: "STAFF",
        senderUserId: user.id,
        senderName: agent.displayName,
        body: text,
        messageType: internal ? "INTERNAL_NOTE" : String(body.messageType ?? "TEXT"),
        metadata: normalizeMetadata(body.metadata),
        internal,
        deliveredAt: new Date(),
      },
    });
    const firstResponseAt = !conversation.firstResponseAt && !internal ? new Date() : conversation.firstResponseAt;
    await prisma.liveChatConversation.update({
      where: { id: conversation.id },
      data: {
        assignedAgentId: conversation.assignedAgentId ?? agent.id,
        status: internal ? conversation.status : "OPEN",
        firstResponseAt,
        staffLastReadAt: new Date(),
        lastMessagePreview: internal ? conversation.lastMessagePreview : preview(text),
        lastMessageAt: internal ? conversation.lastMessageAt : message.createdAt,
      },
    });
    const participant = await ensureParticipant(conversation.id, user.id, agent.id);
    if (participant?.joinedNow || participant?.rejoined) await createSystemTimelineMessage(conversation.id, `${agent.displayName} joined the conversation.`, conversation.publicId, conversation.visitor.publicId);
    setTypingState(conversation.publicId, agent.id, agent.displayName, false);
    const shaped = shapeMessage(message);
    if (!internal) publishLiveChatRealtime({
      type: "message",
      conversationId: conversation.publicId,
      visitorId: conversation.visitor.publicId,
      message: shaped,
      createdAt: new Date().toISOString(),
    });
    await auditEvent(conversation.visitorId, conversation.id, internal ? "INTERNAL_NOTE" : "STAFF_MESSAGE", user.id, { messageType: message.messageType });
    return shaped;
  }
  if (action === "start_conversation") {
    const visitor = await prisma.liveChatVisitor.findUnique({ where: { publicId: String(body.visitorId ?? "") } });
    if (!visitor) throw new LiveChatError("VISITOR_NOT_FOUND", "Visitor not found.", 404);
    let conversation = await prisma.liveChatConversation.findFirst({ where: { visitorId: visitor.id, status: { in: OPEN_STATUSES } }, orderBy: { updatedAt: "desc" } });
    if (!conversation) {
      conversation = await prisma.liveChatConversation.create({
        data: {
          publicId: makePublicId("chat"),
          visitorId: visitor.id,
          userId: visitor.userId,
          departmentId: String(body.departmentId || agent.departmentId || "") || undefined,
          assignedAgentId: agent.id,
          status: "OPEN",
          priority: "NORMAL",
          source: visitor.source,
          currentPath: visitor.currentPath,
          currentTitle: visitor.currentTitle,
          subject: visitor.currentTitle || visitor.currentPath || "Live chat",
        },
      });
    }
    const participant = await ensureParticipant(conversation.id, user.id, agent.id);
    if (participant?.joinedNow || participant?.rejoined) await createSystemTimelineMessage(conversation.id, `${agent.displayName} joined the conversation.`, conversation.publicId, visitor.publicId);
    const text = sanitizeMessage(String(body.body || proactiveMessageForVisitor(visitor, agent.displayName)));
    const message = await prisma.liveChatMessage.create({
      data: {
        publicId: makePublicId("msg"),
        conversationId: conversation.id,
        senderKind: "STAFF",
        senderUserId: user.id,
        senderName: agent.displayName,
        body: text,
        messageType: "TEXT",
        deliveredAt: new Date(),
      },
    });
    await prisma.liveChatConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessagePreview: preview(text),
        lastMessageAt: message.createdAt,
        assignedAgentId: agent.id,
        staffLastReadAt: new Date(),
      },
    });
    const shaped = shapeMessage(message);
    publishLiveChatRealtime({
      type: "message",
      conversationId: conversation.publicId,
      visitorId: visitor.publicId,
      message: shaped,
      createdAt: new Date().toISOString(),
    });
    await auditEvent(visitor.id, conversation.id, "PROACTIVE_STAFF_MESSAGE", user.id);
    return { conversationId: conversation.publicId, message: shaped };
  }
  if (action === "typing") {
    const conversation = await getConversationByPublicId(String(body.conversationId ?? ""));
    if (!conversation) throw new LiveChatError("CONVERSATION_NOT_FOUND", "Conversation not found.", 404);
    setTypingState(conversation.publicId, agent.id, agent.displayName, Boolean(body.typing));
    const typing = getTypingState(conversation.publicId);
    publishLiveChatRealtime({ type: "typing", conversationId: conversation.publicId, visitorId: conversation.visitor.publicId, typing, createdAt: new Date().toISOString() });
    return { ok: true, typing };
  }
  if (action === "assign" || action === "transfer") {
    const conversation = await getConversationByPublicId(String(body.conversationId ?? ""));
    if (!conversation) throw new LiveChatError("CONVERSATION_NOT_FOUND", "Conversation not found.", 404);
    const assignedAgentId = body.agentId ? String(body.agentId) : undefined;
    const departmentId = body.departmentId ? String(body.departmentId) : undefined;
    await prisma.liveChatConversation.update({
      where: { id: conversation.id },
      data: {
        assignedAgentId,
        departmentId,
        status: "OPEN",
      },
    });
    if (assignedAgentId) {
      const assigned = await prisma.liveChatAgentProfile.findUnique({ where: { id: assignedAgentId } });
      if (assigned?.userId) {
        const participant = await ensureParticipant(conversation.id, assigned.userId, assigned.id);
        if (participant?.joinedNow || participant?.rejoined) await createSystemTimelineMessage(conversation.id, `${assigned.displayName} joined the conversation.`, conversation.publicId, conversation.visitor.publicId);
      }
    }
    const department = departmentId ? await prisma.liveChatDepartment.findUnique({ where: { id: departmentId } }) : null;
    const text = action === "transfer"
      ? `Your conversation has been transferred${department ? ` to ${department.name}` : ""}.`
      : "A HouseLink team member has been assigned to this conversation.";
    const systemMessage = await prisma.liveChatMessage.create({
      data: {
        publicId: makePublicId("msg"),
        conversationId: conversation.id,
        senderKind: "SYSTEM",
        senderName: "HouseLink",
        body: text,
        messageType: "SYSTEM",
        deliveredAt: new Date(),
      },
    });
    publishLiveChatRealtime({
      type: "message",
      conversationId: conversation.publicId,
      visitorId: conversation.visitor.publicId,
      message: shapeMessage(systemMessage),
      createdAt: new Date().toISOString(),
    });
    await auditEvent(conversation.visitorId, conversation.id, action === "transfer" ? "TRANSFER" : "ASSIGN", user.id, { assignedAgentId, departmentId });
    return { ok: true };
  }
  if (action === "status") {
    const conversation = await getConversationByPublicId(String(body.conversationId ?? ""));
    if (!conversation) throw new LiveChatError("CONVERSATION_NOT_FOUND", "Conversation not found.", 404);
    const status = allowed(String(body.status ?? ""), ["NEW", "OPEN", "WAITING_FOR_CUSTOMER", "FOLLOW_UP", "RESOLVED", "CLOSED"], "OPEN");
    await prisma.liveChatConversation.update({
      where: { id: conversation.id },
      data: {
        status,
        resolvedAt: status === "RESOLVED" ? new Date() : undefined,
        closedAt: status === "CLOSED" ? new Date() : undefined,
      },
    });
    await auditEvent(conversation.visitorId, conversation.id, `STATUS_${status}`, user.id);
    return { ok: true };
  }
  if (action === "mark_staff_read") {
    const conversation = await getConversationByPublicId(String(body.conversationId ?? ""));
    if (!conversation) throw new LiveChatError("CONVERSATION_NOT_FOUND", "Conversation not found.", 404);
    const readAt = new Date();
    await prisma.$transaction([
      prisma.liveChatConversation.update({ where: { id: conversation.id }, data: { staffLastReadAt: readAt } }),
      prisma.liveChatMessage.updateMany({
        where: { conversationId: conversation.id, senderKind: "VISITOR", internal: false, readAt: null },
        data: { readAt },
      }),
    ]);
    return { ok: true };
  }
  if (action === "leave_conversation") {
    const conversation = await getConversationByPublicId(String(body.conversationId ?? ""));
    if (!conversation) throw new LiveChatError("CONVERSATION_NOT_FOUND", "Conversation not found.", 404);
    await prisma.liveChatParticipant.updateMany({
      where: { conversationId: conversation.id, userId: user.id, leftAt: null },
      data: { leftAt: new Date() },
    });
    setTypingState(conversation.publicId, agent.id, agent.displayName, false);
    await createSystemTimelineMessage(conversation.id, `${agent.displayName} left the conversation.`, conversation.publicId, conversation.visitor.publicId);
    await auditEvent(conversation.visitorId, conversation.id, "PARTICIPANT_LEFT", user.id, { agentId: agent.id });
    return { ok: true };
  }
  if (action === "delete_conversation") {
    const conversation = await getConversationByPublicId(String(body.conversationId ?? ""));
    if (!conversation) throw new LiveChatError("CONVERSATION_NOT_FOUND", "Conversation not found.", 404);
    await auditEvent(conversation.visitorId, conversation.id, "CONVERSATION_DELETED", user.id);
    await prisma.liveChatConversation.delete({ where: { id: conversation.id } });
    analyticsCache = null;
    return { ok: true };
  }
  if (action === "delete_conversations") {
    const where = conversationFilter(String(body.filter || "open"), String(body.query || ""), user.id);
    const rows = await prisma.liveChatConversation.findMany({ where, select: { id: true, visitorId: true }, take: 100 });
    if (!rows.length) return { count: 0 };
    await prisma.$transaction([
      prisma.liveChatEvent.createMany({
        data: rows.map((conversation) => ({
          visitorId: conversation.visitorId,
          conversationId: conversation.id,
          eventType: "CONVERSATION_BULK_DELETED",
          createdById: user.id,
        })),
      }),
      prisma.liveChatConversation.deleteMany({ where: { id: { in: rows.map((conversation) => conversation.id) } } }),
    ]);
    analyticsCache = null;
    return { count: rows.length };
  }
  if (action === "lead") {
    const conversation = await getConversationByPublicId(String(body.conversationId ?? ""));
    if (!conversation) throw new LiveChatError("CONVERSATION_NOT_FOUND", "Conversation not found.", 404);
    const visitor = await prisma.liveChatVisitor.findUnique({ where: { id: conversation.visitorId } });
    const lead = await prisma.liveChatLead.create({
      data: {
        conversationId: conversation.id,
        visitorId: conversation.visitorId,
        name: cleanText(String(body.name || visitor?.name || ""), 120),
        email: cleanText(String(body.email || visitor?.email || ""), 160),
        phone: cleanText(String(body.phone || visitor?.phone || ""), 80),
        leadType: allowed(String(body.leadType ?? ""), ["PROPERTY", "LIBRARY", "ACADEMY", "SUPPORT", "GENERAL"], "GENERAL"),
        interest: cleanText(String(body.interest || conversation.subject || conversation.currentTitle || ""), 240),
        propertyId: cleanText(String(body.propertyId || ""), 80),
        productId: cleanText(String(body.productId || ""), 80),
        courseId: cleanText(String(body.courseId || ""), 80),
        assignedUserId: user.id,
        departmentId: conversation.departmentId,
        notes: cleanText(String(body.notes || ""), 1000),
        source: conversation.source,
        createdById: user.id,
      },
    });
    await auditEvent(conversation.visitorId, conversation.id, "LEAD_CREATED", user.id, { leadId: lead.id, leadType: lead.leadType });
    return { id: lead.id };
  }
  if (action === "department") {
    const name = cleanText(String(body.name ?? ""), 120);
    if (!name) throw new LiveChatError("INVALID_DEPARTMENT", "Department name is required.", 400);
    const data = {
      name,
      slug: slugify(String(body.slug || name)),
      color: cleanText(String(body.color || "#059669"), 20) || "#059669",
      active: Boolean(body.active ?? true),
      welcomeMessage: cleanText(String(body.welcomeMessage || ""), 500),
      offlineMessage: cleanText(String(body.offlineMessage || ""), 500),
    };
    if (body.id) return prisma.liveChatDepartment.update({ where: { id: String(body.id) }, data });
    return prisma.liveChatDepartment.create({ data });
  }
  if (action === "quick_reply") {
    const title = cleanText(String(body.title ?? ""), 120);
    const content = sanitizeMessage(String(body.body ?? ""));
    if (!title || !content) throw new LiveChatError("INVALID_QUICK_REPLY", "Title and response are required.", 400);
    const data = {
      title,
      shortcut: cleanText(String(body.shortcut || `/${slugify(title).slice(0, 20)}`), 40) || "/reply",
      category: cleanText(String(body.category || ""), 80),
      body: content,
      departmentId: cleanText(String(body.departmentId || ""), 80) || null,
      active: Boolean(body.active ?? true),
      createdById: user.id,
    };
    if (body.id) return prisma.liveChatQuickReply.update({ where: { id: String(body.id) }, data });
    return prisma.liveChatQuickReply.create({ data });
  }
  if (action === "settings") {
    const settings = await prisma.liveChatSettings.upsert({
      where: { id: "live-chat" },
      create: {
        id: "live-chat",
        enabled: Boolean(body.enabled ?? true),
        widgetGreeting: cleanText(String(body.widgetGreeting || ""), 180) || "Hi, need help with HouseLink?",
        welcomeMessage: cleanText(String(body.welcomeMessage || ""), 500) || "Hi, welcome to HouseLink. How can we help?",
        offlineMessage: cleanText(String(body.offlineMessage || ""), 500) || "We are offline. Leave us a message.",
        privacyNotice: cleanText(String(body.privacyNotice || ""), 500) || "We use this chat and page context to provide support.",
        soundEnabled: Boolean(body.soundEnabled ?? true),
        requireContact: Boolean(body.requireContact ?? false),
        proactiveEnabled: Boolean(body.proactiveEnabled ?? true),
        retentionDays: Math.min(730, Math.max(30, numberOr(body.retentionDays, 180))),
        businessTimezone: cleanText(String(body.businessTimezone || ""), 80) || "Africa/Harare",
        defaultDepartmentId: cleanText(String(body.defaultDepartmentId || ""), 80) || null,
        mobilePosition: allowed(String(body.mobilePosition || ""), ["bottom-right", "bottom-left"], "bottom-right"),
        updatedAt: new Date(),
      },
      update: {
        enabled: Boolean(body.enabled ?? true),
        widgetGreeting: cleanText(String(body.widgetGreeting || ""), 180) || "Hi, need help with HouseLink?",
        welcomeMessage: cleanText(String(body.welcomeMessage || ""), 500) || "Hi, welcome to HouseLink. How can we help?",
        offlineMessage: cleanText(String(body.offlineMessage || ""), 500) || "We are offline. Leave us a message.",
        privacyNotice: cleanText(String(body.privacyNotice || ""), 500) || "We use this chat and page context to provide support.",
        soundEnabled: Boolean(body.soundEnabled ?? true),
        requireContact: Boolean(body.requireContact ?? false),
        proactiveEnabled: Boolean(body.proactiveEnabled ?? true),
        retentionDays: Math.min(730, Math.max(30, numberOr(body.retentionDays, 180))),
        businessTimezone: cleanText(String(body.businessTimezone || ""), 80) || "Africa/Harare",
        defaultDepartmentId: cleanText(String(body.defaultDepartmentId || ""), 80) || null,
        mobilePosition: allowed(String(body.mobilePosition || ""), ["bottom-right", "bottom-left"], "bottom-right"),
      },
    });
    analyticsCache = null;
    return shapeSettings(settings);
  }
  if (action === "profile") {
    const displayName = cleanText(String(body.displayName ?? ""), 120) || user.name || "HouseLink Team";
    const profile = await prisma.liveChatAgentProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        displayName,
        avatarUrl: cleanText(String(body.avatarUrl || ""), 500),
        title: cleanText(String(body.title || ""), 120) || "HouseLink Support",
        publicIntro: cleanText(String(body.publicIntro || ""), 500),
        availability: allowed(String(body.availability || ""), ["ONLINE", "AWAY", "BUSY", "OFFLINE"], "ONLINE"),
        departmentId: cleanText(String(body.departmentId || ""), 80) || null,
        updatedAt: new Date(),
      },
      update: {
        displayName,
        avatarUrl: cleanText(String(body.avatarUrl || ""), 500),
        title: cleanText(String(body.title || ""), 120) || "HouseLink Support",
        publicIntro: cleanText(String(body.publicIntro || ""), 500),
        availability: allowed(String(body.availability || ""), ["ONLINE", "AWAY", "BUSY", "OFFLINE"], "ONLINE"),
        departmentId: cleanText(String(body.departmentId || ""), 80) || null,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      },
      include: { department: true },
    });
    return shapeAgent(profile);
  }
  if (action === "automation") {
    const name = cleanText(String(body.name ?? ""), 120);
    const message = sanitizeMessage(String(body.message ?? ""));
    if (!name || !message) throw new LiveChatError("INVALID_AUTOMATION", "Rule name and message are required.", 400);
    const data = {
      name,
      active: Boolean(body.active ?? true),
      priority: numberOr(body.priority, 100),
      departmentId: cleanText(String(body.departmentId || ""), 80) || null,
      conditions: normalizeMetadata(body.conditions) ?? {},
      delaySeconds: numberOr(body.delaySeconds, 45),
      message,
      frequencyCapHours: numberOr(body.frequencyCapHours, 24),
      stopAfterResponse: Boolean(body.stopAfterResponse ?? true),
    };
    if (body.id) return prisma.liveChatAutomationRule.update({ where: { id: String(body.id) }, data });
    return prisma.liveChatAutomationRule.create({ data });
  }
  if (action === "block_visitor") {
    const visitor = await prisma.liveChatVisitor.findUnique({ where: { publicId: String(body.visitorId ?? "") } });
    if (!visitor) throw new LiveChatError("VISITOR_NOT_FOUND", "Visitor not found.", 404);
    await prisma.liveChatVisitor.update({ where: { id: visitor.id }, data: { blockedAt: new Date() } });
    return { ok: true };
  }
  throw new LiveChatError("UNKNOWN_ACTION", "Live Chat action is not supported.", 400);
}

export class LiveChatError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

async function upsertVisitor(input: { request: Request; visitorKey: string; context: LiveChatVisitorContext; contact?: LiveChatContactInput; userId?: string | null }) {
  const prisma = getMainPrisma();
  const keyHash = hashVisitorKey(input.visitorKey);
  const [existing, user] = await Promise.all([
    prisma.liveChatVisitor.findUnique({ where: { visitorKeyHash: keyHash } }),
    input.userId
      ? prisma.user.findUnique({
          where: { id: input.userId },
          select: { name: true, email: true, phone: true },
        }).catch(() => null)
      : null,
  ]);
  const context = input.context;
  const contact = input.contact ?? {};
  const source = cleanText(context.utmSource || context.referrer || "Direct / Unknown", 180);
  const contactName = cleanText(contact.name, 120);
  const contactEmail = cleanText(contact.email, 160);
  const contactPhone = cleanText(contact.phone, 80);
  const data = {
    userId: input.userId ?? undefined,
    name: contactName || existing?.name || user?.name,
    email: contactEmail || existing?.email || user?.email,
    phone: contactPhone || existing?.phone || user?.phone,
    source: source || existing?.source,
    referrer: cleanText(context.referrer, 500) || existing?.referrer,
    landingPage: cleanText(context.landingPage || context.path, 500) || existing?.landingPage,
    utmSource: cleanText(context.utmSource, 120) || existing?.utmSource,
    utmMedium: cleanText(context.utmMedium, 120) || existing?.utmMedium,
    utmCampaign: cleanText(context.utmCampaign, 160) || existing?.utmCampaign,
    deviceType: cleanText(context.deviceType, 40) || "desktop",
    currentPath: cleanText(context.path, 500),
    currentTitle: cleanText(context.title, 300),
    pageStartedAt: parseDate(context.pageStartedAt) ?? new Date(),
    lastSeenAt: new Date(),
    metadata: {
      ip: hashVisitorKey(getClientIp(input.request)),
      cart: context.cart,
      viewed: context.viewed,
    } as Prisma.InputJsonObject,
  };
  const visitor = existing
    ? await prisma.liveChatVisitor.update({ where: { id: existing.id }, data })
    : await prisma.liveChatVisitor.create({
    data: {
      publicId: makePublicId("vis"),
      visitorKeyHash: keyHash,
      ...data,
    },
  });
  void syncSharedPresenceFromLiveChat(input, visitor.publicId).catch(() => null);
  return visitor;
}

async function syncSharedPresenceFromLiveChat(input: { request: Request; context: LiveChatVisitorContext; contact?: LiveChatContactInput; userId?: string | null }, fallbackVisitorId: string) {
  const context = input.context;
  const visitorId = cleanText(context.analyticsVisitorId, 80) || fallbackVisitorId;
  const sessionId = cleanText(context.analyticsSessionId, 80) || visitorId;
  if (!visitorId || !sessionId) return;
  const cartItems = Array.isArray(context.cart?.items)
    ? context.cart.items.slice(0, 12).map((item) => ({
        productId: String(item.id || ""),
        title: String(item.title || ""),
        quantity: Number(item.quantity) || 0,
        price: Number(item.price) || 0,
        formatLabel: item.format,
      }))
    : undefined;
  await upsertSitePresence({
    visitorId,
    sessionId,
    path: cleanText(context.path, 320) || "/",
    title: cleanText(context.title, 200) || undefined,
    deviceType: cleanText(context.deviceType, 32) || undefined,
    userId: input.userId ?? undefined,
    productId: cleanText(context.viewed?.productId || context.viewed?.propertyId || context.viewed?.courseId, 64) || undefined,
    productTitle: cleanText(context.viewed?.productTitle || context.viewed?.propertyTitle || context.viewed?.courseTitle, 200) || undefined,
    cartItemCount: Number(context.cart?.itemCount) || undefined,
    cartValue: Number(context.cart?.value) || undefined,
    cartCurrency: context.cart?.currency,
    cartSummary: cartItems,
    referrer: cleanText(context.referrer, 320) || undefined,
    utmSource: cleanText(context.utmSource, 80) || undefined,
    utmCampaign: cleanText(context.utmCampaign, 120) || undefined,
    contactEmail: cleanText(input.contact?.email, 160) || undefined,
    contactPhone: cleanText(input.contact?.phone, 40) || undefined,
    country: input.request.headers.get("x-vercel-ip-country") || undefined,
    region: decodeHeaderValue(input.request.headers.get("x-vercel-ip-country-region")),
    city: decodeHeaderValue(input.request.headers.get("x-vercel-ip-city")),
  });
}

export async function isLiveChatSchemaReady() {
  if (!isPostgresStoreEnabled()) return true;
  const now = Date.now();
  if (now - schemaReadyCache.checkedAt < 30_000) return schemaReadyCache.ready;
  try {
    const rows = await getMainPrisma().$queryRawUnsafe<Array<{ exists: boolean }>>("select to_regclass('public.live_chat_settings') is not null as exists");
    schemaReadyCache.ready = Boolean(rows[0]?.exists);
  } catch {
    schemaReadyCache.ready = false;
  }
  schemaReadyCache.checkedAt = now;
  return schemaReadyCache.ready;
}

function liveChatSetupMessage() {
  return `Live Chat database tables are not installed yet. Run: npx prisma migrate deploy --schema prisma/schema.prisma. Expected migration: ${LIVE_CHAT_MIGRATION_NAME}.`;
}

function publicSetupRequiredBootstrap(): LiveChatBootstrapView {
  return {
    visitorId: "",
    conversation: null,
    messages: [],
    departments: [],
    supportAgent: null,
    settings: {
      ...getLiveChatSettingsFallback(),
      enabled: false,
    },
    suggestedMessage: null,
    setupRequired: true,
    setupMessage: liveChatSetupMessage(),
  };
}

function setupRequiredInbox(): LiveChatInboxView {
  return {
    conversations: [],
    activeVisitors: [],
    messages: [],
    events: [],
    departments: [],
    agents: [],
    currentAgent: null,
    quickReplies: [],
    tags: [],
    settings: {
      ...getLiveChatSettingsFallback(),
      enabled: false,
    },
    analytics: {
      totalConversations: 0,
      openConversations: 0,
      waitingConversations: 0,
      resolvedConversations: 0,
      activeVisitors: 0,
      leadsCreated: 0,
      proactiveMessages: 0,
      averageFirstResponseSeconds: null,
    },
    setupRequired: true,
    setupMessage: liveChatSetupMessage(),
  };
}

async function getVisitorByKey(visitorKey: string) {
  if (!isPostgresStoreEnabled()) return null;
  return getMainPrisma().liveChatVisitor.findUnique({ where: { visitorKeyHash: hashVisitorKey(visitorKey) } });
}

async function ensureLiveChatDefaults(user?: AdminUser) {
  if (!isPostgresStoreEnabled()) return;
  if (defaultsReadyCache.ready && Date.now() - defaultsReadyCache.checkedAt < 10 * 60_000) return;
  const prisma = getMainPrisma();
  const settings = await prisma.liveChatSettings.findUnique({ where: { id: "live-chat" } });
  if (!settings) {
    await prisma.liveChatSettings.create({
      data: {
        id: "live-chat",
        enabled: true,
        updatedAt: new Date(),
      },
    }).catch(() => null);
  }
  await Promise.all(DEFAULT_DEPARTMENTS.map(([name, slug, color, welcomeMessage]) => prisma.liveChatDepartment.upsert({
      where: { slug },
      update: {},
      create: {
        name,
        slug,
        color,
        welcomeMessage,
        offlineMessage: "We are away right now. Leave your details and we will follow up.",
        updatedAt: new Date(),
      },
    }).catch(() => null)));
  await Promise.all(DEFAULT_TAGS.map(([name, slug, color]) => prisma.liveChatTag.upsert({
      where: { slug },
      update: {},
      create: { name, slug, color, updatedAt: new Date() },
    }).catch(() => null)));
  const departments = await prisma.liveChatDepartment.findMany({ select: { id: true, name: true } });
  await Promise.all(DEFAULT_QUICK_REPLIES.map(([title, shortcut, departmentName, body]) => {
    const departmentId = departments.find((department) => department.name === departmentName)?.id;
    return prisma.liveChatQuickReply.upsert({
      where: { id: `default-${slugify(title)}` },
      update: {},
      create: {
        id: `default-${slugify(title)}`,
        title,
        shortcut,
        category: departmentName,
        departmentId,
        body,
        createdById: user?.id,
        updatedAt: new Date(),
      },
    }).catch(() => null);
  }));
  defaultsReadyCache.ready = true;
  defaultsReadyCache.checkedAt = Date.now();
}

async function ensureAgentProfile(user: AdminUser) {
  const prisma = getMainPrisma();
  const existing = await prisma.liveChatAgentProfile.findUnique({ where: { userId: user.id }, include: { department: true } });
  if (existing) return existing;
  const general = await prisma.liveChatDepartment.findUnique({ where: { slug: "general-enquiries" } });
  return prisma.liveChatAgentProfile.create({
    data: {
      userId: user.id,
      displayName: user.name || "HouseLink Team",
      title: user.roles.includes("TECH_SUPPORT") ? "Technical Support" : "HouseLink Support",
      departmentId: general?.id,
      availability: "ONLINE",
      updatedAt: new Date(),
    },
    include: { department: true },
  });
}

async function ensureParticipant(conversationId: string, userId: string, agentProfileId: string) {
  const prisma = getMainPrisma();
  const existing = await prisma.liveChatParticipant.findUnique({ where: { conversationId_userId: { conversationId, userId } } }).catch(() => null);
  const participant = await prisma.liveChatParticipant.upsert({
    where: { conversationId_userId: { conversationId, userId } },
    update: { leftAt: null, agentProfileId },
    create: { conversationId, userId, agentProfileId, role: "AGENT" },
  }).catch(() => null);
  return participant ? { ...participant, joinedNow: !existing, rejoined: Boolean(existing?.leftAt) } : null;
}

async function createSystemTimelineMessage(conversationId: string, body: string, publicConversationId?: string, publicVisitorId?: string | null) {
  const message = await getMainPrisma().liveChatMessage.create({
    data: {
      publicId: makePublicId("msg"),
      conversationId,
      senderKind: "SYSTEM",
      senderName: "HouseLink",
      body,
      messageType: "SYSTEM",
      deliveredAt: new Date(),
    },
  }).catch(() => null);
  if (message && publicConversationId) {
    publishLiveChatRealtime({
      type: "message",
      conversationId: publicConversationId,
      visitorId: publicVisitorId,
      message: shapeMessage(message),
      createdAt: new Date().toISOString(),
    });
  }
  return message;
}

function setTypingState(conversationId: string, actorId: string, displayName: string, typing: boolean) {
  const record = typingState.get(conversationId) ?? { staff: new Map<string, { displayName: string; expiresAt: number }>() };
  const expiresAt = Date.now() + TYPING_TTL_MS;
  if (actorId === "visitor") {
    if (typing) record.visitor = expiresAt;
    else record.visitor = undefined;
  } else if (typing) {
    record.staff.set(actorId, { displayName, expiresAt });
  } else {
    record.staff.delete(actorId);
  }
  typingState.set(conversationId, record);
}

function getTypingState(conversationId: string): LiveChatTypingView {
  const record = typingState.get(conversationId);
  const now = Date.now();
  if (!record) return { conversationId, visitorTyping: false, staffTyping: [] };
  for (const [agentId, staff] of record.staff) {
    if (staff.expiresAt <= now) record.staff.delete(agentId);
  }
  if (record.visitor && record.visitor <= now) record.visitor = undefined;
  if (!record.visitor && record.staff.size === 0) typingState.delete(conversationId);
  return {
    conversationId,
    visitorTyping: Boolean(record.visitor && record.visitor > now),
    staffTyping: [...record.staff.entries()].map(([agentId, staff]) => ({ agentId, displayName: staff.displayName })),
  };
}

function publishLiveChatRealtime(event: LiveChatRealtimeEvent) {
  const targets = [`conversation:${event.conversationId}`];
  if (event.visitorId) targets.push(`visitor:${event.visitorId}`);
  const delivered = new Set<LiveChatRealtimeListener>();
  for (const target of targets) {
    const listeners = realtimeSubscribers.get(target);
    if (!listeners) continue;
    for (const listener of listeners) {
      if (delivered.has(listener)) continue;
      delivered.add(listener);
      listener(event);
    }
  }
}

async function maybeTriggerAutomation(visitorId: string, conversationId: string | null, context: LiveChatVisitorContext) {
  if (!isPostgresStoreEnabled()) return null;
  if (!(await isLiveChatSchemaReady())) return null;
  const prisma = getMainPrisma();
  try {
    const settings = await prisma.liveChatSettings.findUnique({ where: { id: "live-chat" } });
    if (!settings?.proactiveEnabled || conversationId) return null;
    const rules = await prisma.liveChatAutomationRule.findMany({ where: { active: true }, orderBy: [{ priority: "asc" }, { createdAt: "asc" }], take: 20 });
    const matched = rules.find((rule) => automationMatches(rule.conditions, context));
    if (!matched) return null;
    const visitorResponded = await prisma.liveChatMessage.findFirst({
      where: { conversation: { visitorId }, senderKind: "VISITOR" },
      select: { id: true },
    });
    if (matched.stopAfterResponse && visitorResponded) return null;
    await prisma.liveChatAutomationRule.update({ where: { id: matched.id }, data: { triggerCount: { increment: 1 }, lastTriggeredAt: new Date() } }).catch(() => null);
    await prisma.liveChatEvent.create({
      data: {
        visitorId,
        eventType: "PROACTIVE_RULE_MATCHED",
        path: cleanText(context.path, 500),
        title: cleanText(context.title, 300),
        metadata: { ruleId: matched.id, ruleName: matched.name } as Prisma.InputJsonObject,
      },
    }).catch(() => null);
    return matched.message;
  } catch {
    return null;
  }
}

async function getLiveChatSettings(): Promise<LiveChatSettingsView> {
  if (!isPostgresStoreEnabled()) {
    return getLiveChatSettingsFallback();
  }
  if (!(await isLiveChatSchemaReady())) {
    return {
      ...getLiveChatSettingsFallback(),
      enabled: false,
    };
  }
  const record = await getMainPrisma().liveChatSettings.findUnique({ where: { id: "live-chat" } }).catch(() => null);
  if (!record) return getLiveChatSettingsFallback();
  return shapeSettings(record);
}

async function getLiveChatAnalytics() {
  if (analyticsCache && Date.now() - analyticsCache.checkedAt < 60_000) return analyticsCache.value;
  const prisma = getMainPrisma();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60_000);
  const [totalConversations, openConversations, waitingConversations, resolvedConversations, activeVisitors, leadsCreated, proactiveMessages, firstResponses] = await Promise.all([
    prisma.liveChatConversation.count({ where: { createdAt: { gte: since } } }),
    prisma.liveChatConversation.count({ where: { status: { in: ["NEW", "OPEN", "FOLLOW_UP"] } } }),
    prisma.liveChatConversation.count({ where: { status: "WAITING_FOR_CUSTOMER" } }),
    prisma.liveChatConversation.count({ where: { status: "RESOLVED", updatedAt: { gte: since } } }),
    prisma.liveChatVisitor.count({ where: { lastSeenAt: { gte: new Date(Date.now() - ACTIVE_VISITOR_MS) }, blockedAt: null } }),
    prisma.liveChatLead.count({ where: { createdAt: { gte: since } } }),
    prisma.liveChatEvent.count({ where: { eventType: { in: ["PROACTIVE_RULE_MATCHED", "PROACTIVE_STAFF_MESSAGE"] }, createdAt: { gte: since } } }),
    prisma.liveChatConversation.findMany({ where: { firstResponseAt: { not: null }, createdAt: { gte: since } }, select: { createdAt: true, firstResponseAt: true }, take: 500 }),
  ]);
  const avg = firstResponses.length
    ? Math.round(firstResponses.reduce((sum, item) => sum + ((item.firstResponseAt?.getTime() ?? item.createdAt.getTime()) - item.createdAt.getTime()) / 1000, 0) / firstResponses.length)
    : null;
  const value = {
    totalConversations,
    openConversations,
    waitingConversations,
    resolvedConversations,
    activeVisitors,
    leadsCreated,
    proactiveMessages,
    averageFirstResponseSeconds: avg,
  };
  analyticsCache = { checkedAt: Date.now(), value };
  return value;
}

async function getPublicSupportAgent() {
  if (!isPostgresStoreEnabled() || !(await isLiveChatSchemaReady())) return null;
  const agent = await getMainPrisma().liveChatAgentProfile.findFirst({
    where: {
      availability: { in: ["ONLINE", "AWAY"] },
      lastSeenAt: { gte: new Date(Date.now() - 10 * 60_000) },
    },
    include: { department: true },
    orderBy: [{ availability: "asc" }, { lastSeenAt: "desc" }],
  }).catch(() => null);
  return agent ? shapeAgent(agent) : null;
}

function conversationInclude() {
  return {
    visitor: true,
    department: true,
    assignedAgent: { include: { department: true } },
    tags: { include: { tag: true } },
    messages: { where: { internal: false }, orderBy: { createdAt: "desc" }, take: 1 },
  } satisfies Prisma.LiveChatConversationInclude;
}

function shapeConversation(conversation: Prisma.LiveChatConversationGetPayload<{ include: ReturnType<typeof conversationInclude> }>): LiveChatConversationView {
  const staffReadAt = conversation.staffLastReadAt?.getTime() ?? 0;
  const visitorReadAt = conversation.visitorLastReadAt?.getTime() ?? 0;
  const latestMessage = conversation.messages[0] ?? null;
  return {
    id: conversation.publicId,
    status: conversation.status,
    priority: conversation.priority,
    subject: conversation.subject,
    source: conversation.source,
    currentPath: conversation.currentPath,
    currentTitle: conversation.currentTitle,
    lastMessagePreview: conversation.lastMessagePreview,
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    lastMessageSenderKind: latestMessage?.senderKind ?? null,
    lastMessageSenderName: latestMessage?.senderName ?? null,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    visitor: {
      id: conversation.visitor.publicId,
      userId: conversation.visitor.userId,
      name: conversation.visitor.name,
      email: conversation.visitor.email,
      phone: conversation.visitor.phone,
      deviceType: conversation.visitor.deviceType,
      currentPath: conversation.visitor.currentPath,
      currentTitle: conversation.visitor.currentTitle,
      landingPage: conversation.visitor.landingPage,
      source: conversation.visitor.source,
      utmSource: conversation.visitor.utmSource,
      utmMedium: conversation.visitor.utmMedium,
      utmCampaign: conversation.visitor.utmCampaign,
      lastSeenAt: conversation.visitor.lastSeenAt.toISOString(),
      firstSeenAt: conversation.visitor.firstSeenAt.toISOString(),
      blocked: Boolean(conversation.visitor.blockedAt),
    },
    department: conversation.department ? shapeDepartment(conversation.department) : null,
    assignedAgent: conversation.assignedAgent ? shapeAgent(conversation.assignedAgent) : null,
    tags: conversation.tags.map((item) => ({ id: item.tag.id, name: item.tag.name, color: item.tag.color })),
    unreadForStaff: latestMessage?.senderKind === "VISITOR" && latestMessage.createdAt.getTime() > staffReadAt ? 1 : 0,
    unreadForVisitor: latestMessage && latestMessage.senderKind !== "VISITOR" && latestMessage.createdAt.getTime() > visitorReadAt ? 1 : 0,
  };
}

function shapeMessage(message: { publicId: string; conversationId: string; senderKind: string; senderName: string | null; body: string; messageType: string; metadata: Prisma.JsonValue | unknown; internal: boolean; automated: boolean; createdAt: Date; deliveredAt: Date | null; readAt: Date | null }): LiveChatMessageView {
  return {
    id: message.publicId,
    conversationId: message.conversationId,
    senderKind: message.senderKind,
    senderName: message.senderName,
    body: message.body,
    messageType: message.messageType,
    metadata: message.metadata,
    internal: message.internal,
    automated: message.automated,
    createdAt: message.createdAt.toISOString(),
    deliveredAt: message.deliveredAt?.toISOString() ?? null,
    readAt: message.readAt?.toISOString() ?? null,
  };
}

function shapeEvent(event: { id: string; eventType: string; path: string | null; title: string | null; metadata: Prisma.JsonValue | unknown; createdAt: Date }): LiveChatEventView {
  return {
    id: event.id,
    eventType: event.eventType,
    path: event.path,
    title: event.title,
    metadata: event.metadata,
    createdAt: event.createdAt.toISOString(),
  };
}

function shapeDepartment(department: { id: string; name: string; slug: string; color: string; active: boolean; welcomeMessage?: string | null; offlineMessage?: string | null }): LiveChatDepartmentView {
  return {
    id: department.id,
    name: department.name,
    slug: department.slug,
    color: department.color,
    active: department.active,
    welcomeMessage: department.welcomeMessage,
    offlineMessage: department.offlineMessage,
  };
}

function shapeAgent(agent: { id: string; userId: string; displayName: string; avatarUrl: string | null; title: string | null; publicIntro?: string | null; availability: string; department?: { id: string; name: string; slug: string; color: string; active: boolean } | null }) {
  return {
    id: agent.id,
    userId: agent.userId,
    displayName: agent.displayName,
    avatarUrl: agent.avatarUrl,
    title: agent.title,
    publicIntro: agent.publicIntro,
    availability: agent.availability,
    department: agent.department ? shapeDepartment(agent.department) : null,
  };
}

function shapeActiveVisitor(visitor: { publicId: string; userId: string | null; name: string | null; email: string | null; phone: string | null; deviceType: string | null; currentPath: string | null; currentTitle: string | null; landingPage: string | null; source: string | null; utmSource: string | null; utmMedium: string | null; utmCampaign: string | null; lastSeenAt: Date; firstSeenAt: Date; blockedAt: Date | null; pageStartedAt: Date | null }, conversation: LiveChatConversationView | null) {
  const now = Date.now();
  return {
    id: visitor.publicId,
    userId: visitor.userId,
    name: visitor.name,
    email: visitor.email,
    phone: visitor.phone,
    deviceType: visitor.deviceType,
    currentPath: visitor.currentPath,
    currentTitle: visitor.currentTitle,
    landingPage: visitor.landingPage,
    source: visitor.source,
    utmSource: visitor.utmSource,
    utmMedium: visitor.utmMedium,
    utmCampaign: visitor.utmCampaign,
    lastSeenAt: visitor.lastSeenAt.toISOString(),
    firstSeenAt: visitor.firstSeenAt.toISOString(),
    blocked: Boolean(visitor.blockedAt),
    conversationId: conversation?.id ?? null,
    conversation: conversation
      ? {
          id: conversation.id,
          status: conversation.status,
          priority: conversation.priority,
          lastMessagePreview: conversation.lastMessagePreview,
          lastMessageAt: conversation.lastMessageAt,
          lastMessageSenderKind: conversation.lastMessageSenderKind,
          lastMessageSenderName: conversation.lastMessageSenderName,
          unreadForStaff: conversation.unreadForStaff,
          unreadForVisitor: conversation.unreadForVisitor,
        }
      : null,
    sessionSeconds: Math.max(0, Math.round((now - visitor.firstSeenAt.getTime()) / 1000)),
    pageSeconds: visitor.pageStartedAt ? Math.max(0, Math.round((now - visitor.pageStartedAt.getTime()) / 1000)) : 0,
  };
}

function shapeSettings(settings: { enabled: boolean; widgetGreeting: string; welcomeMessage: string; offlineMessage: string; privacyNotice: string; soundEnabled: boolean; requireContact: boolean; proactiveEnabled: boolean; retentionDays?: number; businessTimezone?: string; defaultDepartmentId?: string | null; mobilePosition?: string }): LiveChatSettingsView {
  return {
    enabled: settings.enabled,
    widgetGreeting: settings.widgetGreeting,
    welcomeMessage: settings.welcomeMessage,
    offlineMessage: settings.offlineMessage,
    privacyNotice: settings.privacyNotice,
    soundEnabled: settings.soundEnabled,
    requireContact: settings.requireContact,
    proactiveEnabled: settings.proactiveEnabled,
    retentionDays: settings.retentionDays,
    businessTimezone: settings.businessTimezone,
    defaultDepartmentId: settings.defaultDepartmentId,
    mobilePosition: settings.mobilePosition,
  };
}

function getLiveChatSettingsFallback(): LiveChatSettingsView {
  return {
    enabled: true,
    widgetGreeting: "Hi, need help with HouseLink?",
    welcomeMessage: "Hi, welcome to HouseLink. Ask us anything about properties, books, Academy, or payments.",
    offlineMessage: "We are currently offline. Leave your details and our team will follow up.",
    privacyNotice: "We use this chat and your page context to provide support and improve service.",
    soundEnabled: true,
    requireContact: false,
    proactiveEnabled: true,
    retentionDays: 180,
    businessTimezone: "Africa/Harare",
    defaultDepartmentId: null,
    mobilePosition: "bottom-right",
  };
}

function conversationFilter(filter?: string | null, query?: string | null, userId?: string): Prisma.LiveChatConversationWhereInput {
  const where: Prisma.LiveChatConversationWhereInput = {};
  if (filter === "mine" && userId) where.assignedAgent = { userId };
  if (filter === "unassigned") where.assignedAgentId = null;
  if (filter === "new") where.status = "NEW";
  if (filter === "open" || filter === "needs-reply") where.status = { in: ["NEW", "OPEN", "FOLLOW_UP"] };
  if (filter === "waiting") where.status = "WAITING_FOR_CUSTOMER";
  if (filter === "follow-up") where.status = "FOLLOW_UP";
  if (filter === "resolved") where.status = { in: ["RESOLVED", "CLOSED"] };
  const q = cleanText(query, 120);
  if (q) {
    where.OR = [
      { subject: { contains: q, mode: "insensitive" } },
      { lastMessagePreview: { contains: q, mode: "insensitive" } },
      { currentPath: { contains: q, mode: "insensitive" } },
      { visitor: { name: { contains: q, mode: "insensitive" } } },
      { visitor: { email: { contains: q, mode: "insensitive" } } },
      { visitor: { phone: { contains: q, mode: "insensitive" } } },
      { messages: { some: { body: { contains: q, mode: "insensitive" }, internal: false } } },
    ];
  }
  return where;
}

function needsStaffReply(conversation: Prisma.LiveChatConversationGetPayload<{ include: ReturnType<typeof conversationInclude> }>) {
  const latestMessage = conversation.messages[0] ?? null;
  const staffReadAt = conversation.staffLastReadAt?.getTime() ?? 0;
  return latestMessage?.senderKind === "VISITOR" && latestMessage.createdAt.getTime() > staffReadAt;
}

function prioritizeConversations(conversations: Array<Prisma.LiveChatConversationGetPayload<{ include: ReturnType<typeof conversationInclude> }>>) {
  return [...conversations].sort((a, b) => {
    const aNeedsReply = needsStaffReply(a) ? 1 : 0;
    const bNeedsReply = needsStaffReply(b) ? 1 : 0;
    if (aNeedsReply !== bNeedsReply) return bNeedsReply - aNeedsReply;
    const aTime = a.lastMessageAt?.getTime() ?? a.updatedAt.getTime();
    const bTime = b.lastMessageAt?.getTime() ?? b.updatedAt.getTime();
    return bTime - aTime;
  });
}

async function getConversationByPublicId(publicId: string) {
  return getMainPrisma().liveChatConversation.findUnique({ where: { publicId }, include: conversationInclude() });
}

async function auditEvent(visitorId: string | null, conversationId: string | null, eventType: string, createdById?: string, metadata?: unknown) {
  if (!isPostgresStoreEnabled()) return;
  await getMainPrisma().liveChatEvent.create({
    data: {
      visitorId: visitorId ?? undefined,
      conversationId: conversationId ?? undefined,
      eventType,
      createdById,
      metadata: normalizeMetadata(metadata),
    },
  }).catch(() => null);
}

function memoryBootstrap(visitorKey: string, context: LiveChatVisitorContext, contact?: LiveChatContactInput): LiveChatBootstrapView {
  const keyHash = hashVisitorKey(visitorKey);
  let visitor = memory.visitors.get(keyHash);
  if (!visitor) {
    visitor = { id: makePublicId("memv"), publicId: makePublicId("vis"), visitorKeyHash: keyHash, firstSeenAt: new Date(), lastSeenAt: new Date() };
    memory.visitors.set(keyHash, visitor);
  }
  visitor.name = cleanText(contact?.name, 120) || visitor.name;
  visitor.email = cleanText(contact?.email, 160) || visitor.email;
  visitor.phone = cleanText(contact?.phone, 80) || visitor.phone;
  visitor.currentPath = cleanText(context.path, 500);
  visitor.currentTitle = cleanText(context.title, 300);
  visitor.deviceType = cleanText(context.deviceType, 40) || "desktop";
  visitor.lastSeenAt = new Date();
  const conversation = [...memory.conversations.values()].find((item) => item.visitorId === visitor!.id && OPEN_STATUSES.includes(item.status));
  const messages = memory.messages.filter((message) => message.conversationId === conversation?.id && !message.internal);
  return {
    visitorId: visitor.publicId,
    conversation: conversation ? shapeMemoryConversation(conversation, visitor) : null,
    messages: messages.map(shapeMemoryMessage),
    departments: DEFAULT_DEPARTMENTS.map(([name, slug, color, welcomeMessage]) => ({ id: slug, name, slug, color, active: true, welcomeMessage })),
    supportAgent: null,
    settings: getLiveChatSettingsFallback(),
    suggestedMessage: null,
  };
}

function memorySendVisitorMessage(visitorKey: string, body: string) {
  const keyHash = hashVisitorKey(visitorKey);
  const visitor = memory.visitors.get(keyHash) ?? { id: makePublicId("memv"), publicId: makePublicId("vis"), visitorKeyHash: keyHash, firstSeenAt: new Date(), lastSeenAt: new Date() };
  memory.visitors.set(keyHash, visitor);
  let conversation = [...memory.conversations.values()].find((item) => item.visitorId === visitor.id && OPEN_STATUSES.includes(item.status));
  if (!conversation) {
    conversation = { id: makePublicId("memc"), publicId: makePublicId("chat"), visitorId: visitor.id, status: "NEW", priority: "NORMAL", createdAt: new Date(), updatedAt: new Date() };
    memory.conversations.set(conversation.id, conversation);
  }
  const message: MemoryMessage = {
    id: makePublicId("memm"),
    publicId: makePublicId("msg"),
    conversationId: conversation.id,
    senderKind: "VISITOR",
    senderName: visitor.name || "Guest visitor",
    body,
    messageType: "TEXT",
    internal: false,
    automated: false,
    createdAt: new Date(),
    deliveredAt: new Date(),
  };
  memory.messages.push(message);
  conversation.lastMessageAt = message.createdAt;
  conversation.lastMessagePreview = preview(body);
  conversation.updatedAt = new Date();
  return shapeMemoryMessage(message);
}

function memoryInbox(): LiveChatInboxView {
  const visitors = [...memory.visitors.values()];
  const conversations = [...memory.conversations.values()];
  const selected = conversations[0];
  return {
    conversations: conversations.map((conversation) => shapeMemoryConversation(conversation, visitors.find((visitor) => visitor.id === conversation.visitorId)!)),
    activeVisitors: visitors.map((visitor) => ({ ...shapeMemoryVisitor(visitor), conversationId: conversations.find((conversation) => conversation.visitorId === visitor.id)?.publicId ?? null, sessionSeconds: 0, pageSeconds: 0 })),
    messages: memory.messages.filter((message) => message.conversationId === selected?.id).map(shapeMemoryMessage),
    events: memory.events.map((event) => ({ id: event.id, eventType: event.eventType, path: event.path, title: event.title, metadata: event.metadata, createdAt: event.createdAt.toISOString() })),
    departments: DEFAULT_DEPARTMENTS.map(([name, slug, color, welcomeMessage]) => ({ id: slug, name, slug, color, active: true, welcomeMessage })),
    agents: [],
    currentAgent: null,
    quickReplies: DEFAULT_QUICK_REPLIES.map(([title, shortcut, category, body]) => ({ id: shortcut, title, shortcut, category, body, active: true })),
    tags: DEFAULT_TAGS.map(([name, slug, color]) => ({ id: slug, name, slug, color, active: true })),
    settings: getLiveChatSettingsFallback(),
    analytics: { totalConversations: conversations.length, openConversations: conversations.length, waitingConversations: 0, resolvedConversations: 0, activeVisitors: visitors.length, leadsCreated: 0, proactiveMessages: 0, averageFirstResponseSeconds: null },
  };
}

function shapeMemoryConversation(conversation: MemoryConversation, visitor: MemoryVisitor): LiveChatConversationView {
  const latestMessage = memory.messages.filter((message) => message.conversationId === conversation.id && !message.internal).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
  return {
    id: conversation.publicId,
    status: conversation.status,
    priority: conversation.priority,
    subject: conversation.subject,
    source: conversation.source,
    currentPath: conversation.currentPath,
    currentTitle: conversation.currentTitle,
    lastMessagePreview: conversation.lastMessagePreview,
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    lastMessageSenderKind: latestMessage?.senderKind ?? null,
    lastMessageSenderName: latestMessage?.senderName ?? null,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    visitor: shapeMemoryVisitor(visitor),
    department: null,
    assignedAgent: null,
    tags: [],
    unreadForStaff: 0,
    unreadForVisitor: 0,
  };
}

function shapeMemoryVisitor(visitor: MemoryVisitor) {
  return {
    id: visitor.publicId,
    name: visitor.name,
    email: visitor.email,
    phone: visitor.phone,
    deviceType: visitor.deviceType,
    currentPath: visitor.currentPath,
    currentTitle: visitor.currentTitle,
    landingPage: visitor.landingPage,
    source: visitor.source,
    utmSource: visitor.utmSource,
    utmMedium: visitor.utmMedium,
    utmCampaign: visitor.utmCampaign,
    lastSeenAt: visitor.lastSeenAt.toISOString(),
    firstSeenAt: visitor.firstSeenAt.toISOString(),
    blocked: Boolean(visitor.blockedAt),
  };
}

function shapeMemoryMessage(message: MemoryMessage): LiveChatMessageView {
  return {
    id: message.publicId,
    conversationId: message.conversationId,
    senderKind: message.senderKind,
    senderName: message.senderName,
    body: message.body,
    messageType: message.messageType,
    metadata: message.metadata,
    internal: message.internal,
    automated: message.automated,
    createdAt: message.createdAt.toISOString(),
    deliveredAt: message.deliveredAt?.toISOString() ?? null,
    readAt: message.readAt?.toISOString() ?? null,
  };
}

function proactiveMessageForVisitor(visitor?: { currentPath?: string | null; currentTitle?: string | null } | null, agentName?: string | null) {
  const title = cleanHouseLinkTitle(visitor?.currentTitle);
  const path = visitor?.currentPath?.toLowerCase() ?? "";
  const intro = agentName ? `Hi, this is ${agentName} from HouseLink.` : "Hi, welcome to HouseLink.";
  if (path.includes("/library/checkout") || path.includes("payment")) {
    return `${intro}\n\nI can help with payment, proof upload, or choosing another payment option so your order is completed smoothly.`;
  }
  if (path.includes("/library/")) {
    return `${intro}\n\nI noticed you are viewing ${title || "this book"}. I can help you choose the right format, confirm payment steps, or answer any questions before you buy.`;
  }
  if (path.includes("/academy")) {
    return `${intro}\n\nI can help with course details, registration, payment, or choosing the right course${title ? ` for ${title}` : ""}.`;
  }
  if (path.includes("/listings/") || path.includes("/rent/") || path.includes("/property-for-sale/")) {
    return `${intro}\n\nI noticed you are viewing ${title || "this property"}. I can help with viewing details, location questions, price checks, or the next step.`;
  }
  return `${intro}\n\nI can help with the next step, pricing, payment, delivery, viewings, or any question before you decide.`;
}

function cleanHouseLinkTitle(value?: string | null) {
  return cleanText(value, 160).replace(/\s*\|\s*HouseLink.*$/i, "").trim();
}

function sanitizeMessage(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_MESSAGE_LENGTH);
}

function cleanText(value: unknown, max = 200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function decodeHeaderValue(value: string | null) {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function preview(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 180);
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "live-chat";
}

function makePublicId(prefix: string) {
  return `${prefix}_${randomBytes(10).toString("hex")}`;
}

function hashVisitorKey(value: string) {
  return createHash("sha256").update(value || "missing").digest("hex");
}

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function allowed(value: string, options: string[], fallback: string) {
  return options.includes(value) ? value : fallback;
}

function numberOr(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function isUniqueError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}

function inferPriority(context?: LiveChatVisitorContext) {
  const path = context?.path?.toLowerCase() ?? "";
  if (path.includes("checkout") || path.includes("payment")) return "HIGH";
  return "NORMAL";
}

function inferSubject(context?: LiveChatVisitorContext) {
  return context?.viewed?.productTitle || context?.viewed?.propertyTitle || context?.viewed?.courseTitle || context?.title || context?.path || "Live chat";
}

function contextMetadata(context: LiveChatVisitorContext) {
  return {
    referrer: context.referrer,
    landingPage: context.landingPage,
    utmSource: context.utmSource,
    utmMedium: context.utmMedium,
    utmCampaign: context.utmCampaign,
    deviceType: context.deviceType,
    cart: context.cart,
    viewed: context.viewed,
  } as Prisma.InputJsonObject;
}

function normalizeMetadata(value: unknown): Prisma.InputJsonValue | undefined {
  if (!value || typeof value !== "object") return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function automationMatches(conditions: Prisma.JsonValue, context: LiveChatVisitorContext) {
  if (!conditions || typeof conditions !== "object" || Array.isArray(conditions)) return true;
  const record = conditions as Record<string, unknown>;
  const pathContains = cleanText(record.pathContains, 200).toLowerCase();
  const pageType = cleanText(record.pageType, 80).toLowerCase();
  const path = (context.path ?? "").toLowerCase();
  if (pathContains && !path.includes(pathContains)) return false;
  if (pageType === "library" && !path.includes("/library")) return false;
  if (pageType === "academy" && !path.includes("/academy")) return false;
  if (pageType === "property" && !path.includes("/listings") && !path.includes("/rent") && !path.includes("/property-for-sale")) return false;
  return true;
}
