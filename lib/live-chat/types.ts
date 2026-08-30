export type LiveChatStatus = "NEW" | "OPEN" | "WAITING_FOR_CUSTOMER" | "FOLLOW_UP" | "RESOLVED" | "CLOSED";
export type LiveChatPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type LiveChatSenderKind = "VISITOR" | "STAFF" | "SYSTEM" | "AUTOMATION";
export type LiveChatMessageType = "TEXT" | "SYSTEM" | "INTERNAL_NOTE" | "PRODUCT_CARD" | "PROPERTY_CARD" | "COURSE_CARD" | "LINK";
export type LiveChatAvailability = "ONLINE" | "AWAY" | "BUSY" | "OFFLINE";

export type LiveChatVisitorContext = {
  path?: string;
  title?: string;
  referrer?: string;
  landingPage?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  deviceType?: string;
  pageStartedAt?: string;
  cart?: {
    itemCount?: number;
    value?: number;
    currency?: string;
    items?: Array<{ id?: string; title: string; quantity?: number; price?: number; format?: string }>;
  };
  viewed?: {
    productId?: string;
    productTitle?: string;
    propertyId?: string;
    propertyTitle?: string;
    courseId?: string;
    courseTitle?: string;
  };
};

export type LiveChatContactInput = {
  name?: string;
  email?: string;
  phone?: string;
};

export type LiveChatSettingsView = {
  enabled: boolean;
  widgetGreeting: string;
  welcomeMessage: string;
  offlineMessage: string;
  privacyNotice: string;
  soundEnabled: boolean;
  requireContact: boolean;
  proactiveEnabled: boolean;
  retentionDays?: number;
  businessTimezone?: string;
  defaultDepartmentId?: string | null;
  mobilePosition?: string;
  teamDisplayName?: string | null;
  teamAvatarUrl?: string | null;
};

export type LiveChatDepartmentView = {
  id: string;
  name: string;
  slug: string;
  color: string;
  active: boolean;
  welcomeMessage?: string | null;
  offlineMessage?: string | null;
};

export type LiveChatAgentView = {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  title?: string | null;
  publicIntro?: string | null;
  availability: LiveChatAvailability | string;
  department?: LiveChatDepartmentView | null;
};

export type LiveChatMessageView = {
  id: string;
  conversationId: string;
  senderKind: LiveChatSenderKind | string;
  senderName?: string | null;
  body: string;
  messageType: LiveChatMessageType | string;
  metadata?: unknown;
  internal: boolean;
  automated: boolean;
  createdAt: string;
  deliveredAt?: string | null;
  readAt?: string | null;
};

export type LiveChatConversationView = {
  id: string;
  status: LiveChatStatus | string;
  priority: LiveChatPriority | string;
  subject?: string | null;
  source?: string | null;
  currentPath?: string | null;
  currentTitle?: string | null;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
  createdAt: string;
  updatedAt: string;
  visitor: {
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    deviceType?: string | null;
    currentPath?: string | null;
    currentTitle?: string | null;
    landingPage?: string | null;
    source?: string | null;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    lastSeenAt: string;
    firstSeenAt: string;
    blocked: boolean;
  };
  department?: LiveChatDepartmentView | null;
  assignedAgent?: LiveChatAgentView | null;
  tags: Array<{ id: string; name: string; color: string }>;
  unreadForStaff: number;
  unreadForVisitor: number;
};

export type LiveChatEventView = {
  id: string;
  eventType: string;
  path?: string | null;
  title?: string | null;
  metadata?: unknown;
  createdAt: string;
};

export type LiveChatBootstrapView = {
  visitorId: string;
  conversation: LiveChatConversationView | null;
  messages: LiveChatMessageView[];
  departments: LiveChatDepartmentView[];
  supportAgent?: LiveChatAgentView | null;
  settings: LiveChatSettingsView;
  suggestedMessage?: string | null;
  setupRequired?: boolean;
  setupMessage?: string;
};

export type LiveChatInboxView = {
  conversations: LiveChatConversationView[];
  activeVisitors: Array<LiveChatConversationView["visitor"] & { conversationId?: string | null; sessionSeconds: number; pageSeconds: number }>;
  messages: LiveChatMessageView[];
  events: LiveChatEventView[];
  departments: LiveChatDepartmentView[];
  agents: LiveChatAgentView[];
  currentAgent?: LiveChatAgentView | null;
  quickReplies: Array<{ id: string; title: string; shortcut: string; category?: string | null; body: string; departmentId?: string | null; active: boolean }>;
  tags: Array<{ id: string; name: string; slug: string; color: string; active: boolean }>;
  settings: LiveChatSettingsView;
  analytics: {
    totalConversations: number;
    openConversations: number;
    waitingConversations: number;
    resolvedConversations: number;
    activeVisitors: number;
    leadsCreated: number;
    proactiveMessages: number;
    averageFirstResponseSeconds: number | null;
  };
  setupRequired?: boolean;
  setupMessage?: string;
};
