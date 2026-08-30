CREATE TABLE "live_chat_visitors" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "visitorKeyHash" TEXT NOT NULL,
  "userId" TEXT,
  "name" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "source" TEXT,
  "referrer" TEXT,
  "landingPage" TEXT,
  "utmSource" TEXT,
  "utmMedium" TEXT,
  "utmCampaign" TEXT,
  "deviceType" TEXT NOT NULL DEFAULT 'desktop',
  "currentPath" TEXT,
  "currentTitle" TEXT,
  "pageStartedAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "blockedAt" TIMESTAMP(3),
  "metadata" JSONB,
  CONSTRAINT "live_chat_visitors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "live_chat_departments" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "color" TEXT NOT NULL DEFAULT '#059669',
  "icon" TEXT NOT NULL DEFAULT 'message-circle',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "welcomeMessage" TEXT,
  "offlineMessage" TEXT,
  "businessHours" JSONB,
  "routingMode" TEXT NOT NULL DEFAULT 'MANUAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "live_chat_departments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "live_chat_agent_profiles" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "avatarUrl" TEXT,
  "title" TEXT,
  "departmentId" TEXT,
  "availability" TEXT NOT NULL DEFAULT 'OFFLINE',
  "publicIntro" TEXT,
  "maxActiveChats" INTEGER NOT NULL DEFAULT 6,
  "notificationPrefs" JSONB,
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "live_chat_agent_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "live_chat_conversations" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "visitorId" TEXT NOT NULL,
  "userId" TEXT,
  "departmentId" TEXT,
  "assignedAgentId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "subject" TEXT,
  "source" TEXT,
  "currentPath" TEXT,
  "currentTitle" TEXT,
  "lastMessagePreview" TEXT,
  "lastMessageAt" TIMESTAMP(3),
  "visitorLastReadAt" TIMESTAMP(3),
  "staffLastReadAt" TIMESTAMP(3),
  "firstResponseAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "live_chat_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "live_chat_messages" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderKind" TEXT NOT NULL,
  "senderUserId" TEXT,
  "senderName" TEXT,
  "body" TEXT NOT NULL,
  "messageType" TEXT NOT NULL DEFAULT 'TEXT',
  "metadata" JSONB,
  "internal" BOOLEAN NOT NULL DEFAULT false,
  "automated" BOOLEAN NOT NULL DEFAULT false,
  "idempotencyKey" TEXT,
  "deliveredAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "live_chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "live_chat_participants" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "agentProfileId" TEXT,
  "userId" TEXT,
  "role" TEXT NOT NULL DEFAULT 'AGENT',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leftAt" TIMESTAMP(3),
  "lastReadAt" TIMESTAMP(3),
  CONSTRAINT "live_chat_participants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "live_chat_tags" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#10b981',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "live_chat_tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "live_chat_conversation_tags" (
  "conversationId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "live_chat_conversation_tags_pkey" PRIMARY KEY ("conversationId","tagId")
);

CREATE TABLE "live_chat_quick_replies" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "shortcut" TEXT NOT NULL,
  "category" TEXT,
  "departmentId" TEXT,
  "body" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "live_chat_quick_replies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "live_chat_automation_rules" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "departmentId" TEXT,
  "conditions" JSONB NOT NULL,
  "delaySeconds" INTEGER NOT NULL DEFAULT 45,
  "message" TEXT NOT NULL,
  "frequencyCapHours" INTEGER NOT NULL DEFAULT 24,
  "stopAfterResponse" BOOLEAN NOT NULL DEFAULT true,
  "triggerCount" INTEGER NOT NULL DEFAULT 0,
  "lastTriggeredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "live_chat_automation_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "live_chat_leads" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "visitorId" TEXT NOT NULL,
  "name" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "leadType" TEXT NOT NULL,
  "interest" TEXT,
  "propertyId" TEXT,
  "productId" TEXT,
  "courseId" TEXT,
  "estimatedValue" DECIMAL(12,2),
  "assignedUserId" TEXT,
  "departmentId" TEXT,
  "followUpAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "notes" TEXT,
  "source" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "live_chat_leads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "live_chat_events" (
  "id" TEXT NOT NULL,
  "visitorId" TEXT,
  "conversationId" TEXT,
  "eventType" TEXT NOT NULL,
  "path" TEXT,
  "title" TEXT,
  "metadata" JSONB,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "live_chat_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "live_chat_settings" (
  "id" TEXT NOT NULL DEFAULT 'live-chat',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "widgetGreeting" TEXT NOT NULL DEFAULT 'Hi, need help with HouseLink?',
  "welcomeMessage" TEXT NOT NULL DEFAULT 'Hi, welcome to HouseLink. Ask us anything about properties, books, Academy, or payments.',
  "offlineMessage" TEXT NOT NULL DEFAULT 'We are currently offline. Leave your details and our team will follow up.',
  "privacyNotice" TEXT NOT NULL DEFAULT 'We use this chat and your page context to provide support and improve service.',
  "soundEnabled" BOOLEAN NOT NULL DEFAULT true,
  "requireContact" BOOLEAN NOT NULL DEFAULT false,
  "retentionDays" INTEGER NOT NULL DEFAULT 180,
  "businessTimezone" TEXT NOT NULL DEFAULT 'Africa/Harare',
  "defaultDepartmentId" TEXT,
  "proactiveEnabled" BOOLEAN NOT NULL DEFAULT true,
  "mobilePosition" TEXT NOT NULL DEFAULT 'bottom-right',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "live_chat_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "live_chat_visitors_publicId_key" ON "live_chat_visitors"("publicId");
CREATE UNIQUE INDEX "live_chat_visitors_visitorKeyHash_key" ON "live_chat_visitors"("visitorKeyHash");
CREATE INDEX "live_chat_visitors_lastSeenAt_idx" ON "live_chat_visitors"("lastSeenAt");
CREATE INDEX "live_chat_visitors_userId_idx" ON "live_chat_visitors"("userId");
CREATE INDEX "live_chat_visitors_email_idx" ON "live_chat_visitors"("email");
CREATE INDEX "live_chat_visitors_phone_idx" ON "live_chat_visitors"("phone");

CREATE UNIQUE INDEX "live_chat_departments_slug_key" ON "live_chat_departments"("slug");
CREATE INDEX "live_chat_departments_active_idx" ON "live_chat_departments"("active");

CREATE UNIQUE INDEX "live_chat_agent_profiles_userId_key" ON "live_chat_agent_profiles"("userId");
CREATE INDEX "live_chat_agent_profiles_departmentId_idx" ON "live_chat_agent_profiles"("departmentId");
CREATE INDEX "live_chat_agent_profiles_availability_idx" ON "live_chat_agent_profiles"("availability");

CREATE UNIQUE INDEX "live_chat_conversations_publicId_key" ON "live_chat_conversations"("publicId");
CREATE INDEX "live_chat_conversations_visitorId_idx" ON "live_chat_conversations"("visitorId");
CREATE INDEX "live_chat_conversations_departmentId_idx" ON "live_chat_conversations"("departmentId");
CREATE INDEX "live_chat_conversations_assignedAgentId_idx" ON "live_chat_conversations"("assignedAgentId");
CREATE INDEX "live_chat_conversations_status_updatedAt_idx" ON "live_chat_conversations"("status", "updatedAt");
CREATE INDEX "live_chat_conversations_lastMessageAt_idx" ON "live_chat_conversations"("lastMessageAt");

CREATE UNIQUE INDEX "live_chat_messages_publicId_key" ON "live_chat_messages"("publicId");
CREATE UNIQUE INDEX "live_chat_messages_conversationId_idempotencyKey_key" ON "live_chat_messages"("conversationId", "idempotencyKey");
CREATE INDEX "live_chat_messages_conversationId_createdAt_idx" ON "live_chat_messages"("conversationId", "createdAt");
CREATE INDEX "live_chat_messages_senderUserId_idx" ON "live_chat_messages"("senderUserId");
CREATE INDEX "live_chat_messages_internal_idx" ON "live_chat_messages"("internal");

CREATE UNIQUE INDEX "live_chat_participants_conversationId_userId_key" ON "live_chat_participants"("conversationId", "userId");
CREATE INDEX "live_chat_participants_agentProfileId_idx" ON "live_chat_participants"("agentProfileId");

CREATE UNIQUE INDEX "live_chat_tags_slug_key" ON "live_chat_tags"("slug");
CREATE INDEX "live_chat_tags_active_idx" ON "live_chat_tags"("active");
CREATE INDEX "live_chat_conversation_tags_tagId_idx" ON "live_chat_conversation_tags"("tagId");

CREATE INDEX "live_chat_quick_replies_active_idx" ON "live_chat_quick_replies"("active");
CREATE INDEX "live_chat_quick_replies_departmentId_idx" ON "live_chat_quick_replies"("departmentId");
CREATE INDEX "live_chat_quick_replies_shortcut_idx" ON "live_chat_quick_replies"("shortcut");

CREATE INDEX "live_chat_automation_rules_active_priority_idx" ON "live_chat_automation_rules"("active", "priority");
CREATE INDEX "live_chat_automation_rules_departmentId_idx" ON "live_chat_automation_rules"("departmentId");

CREATE INDEX "live_chat_leads_conversationId_idx" ON "live_chat_leads"("conversationId");
CREATE INDEX "live_chat_leads_visitorId_idx" ON "live_chat_leads"("visitorId");
CREATE INDEX "live_chat_leads_leadType_status_idx" ON "live_chat_leads"("leadType", "status");
CREATE INDEX "live_chat_leads_createdAt_idx" ON "live_chat_leads"("createdAt");

CREATE INDEX "live_chat_events_visitorId_createdAt_idx" ON "live_chat_events"("visitorId", "createdAt");
CREATE INDEX "live_chat_events_conversationId_createdAt_idx" ON "live_chat_events"("conversationId", "createdAt");
CREATE INDEX "live_chat_events_eventType_createdAt_idx" ON "live_chat_events"("eventType", "createdAt");

ALTER TABLE "live_chat_agent_profiles" ADD CONSTRAINT "live_chat_agent_profiles_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "live_chat_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "live_chat_conversations" ADD CONSTRAINT "live_chat_conversations_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "live_chat_visitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "live_chat_conversations" ADD CONSTRAINT "live_chat_conversations_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "live_chat_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "live_chat_conversations" ADD CONSTRAINT "live_chat_conversations_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "live_chat_agent_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "live_chat_messages" ADD CONSTRAINT "live_chat_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "live_chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "live_chat_participants" ADD CONSTRAINT "live_chat_participants_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "live_chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "live_chat_participants" ADD CONSTRAINT "live_chat_participants_agentProfileId_fkey" FOREIGN KEY ("agentProfileId") REFERENCES "live_chat_agent_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "live_chat_conversation_tags" ADD CONSTRAINT "live_chat_conversation_tags_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "live_chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "live_chat_conversation_tags" ADD CONSTRAINT "live_chat_conversation_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "live_chat_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "live_chat_quick_replies" ADD CONSTRAINT "live_chat_quick_replies_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "live_chat_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "live_chat_automation_rules" ADD CONSTRAINT "live_chat_automation_rules_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "live_chat_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "live_chat_leads" ADD CONSTRAINT "live_chat_leads_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "live_chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "live_chat_events" ADD CONSTRAINT "live_chat_events_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "live_chat_visitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "live_chat_events" ADD CONSTRAINT "live_chat_events_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "live_chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
