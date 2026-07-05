import { NotificationChannel, NotificationStatus, ReportStatus, type Prisma } from "@prisma/client";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import {
  getListingFromPostgres,
  toPublicPostgresListing,
} from "@/lib/listings/postgres-listing-repository";

const NOTIFICATION_CHANNELS = new Set<string>(Object.values(NotificationChannel));

export function shouldUsePostgresPersistence() {
  return isPostgresStoreEnabled();
}

export async function listFavouriteListingsFromPostgres(userId: string) {
  assertPostgres();
  const rows = await getMainPrisma().favourite.findMany({
    where: { userId },
    select: { listingId: true },
    orderBy: { createdAt: "desc" },
  });
  const listings = await Promise.all(rows.map((row) => getListingFromPostgres(row.listingId)));
  return listings.filter((listing): listing is NonNullable<typeof listing> => Boolean(listing)).map(toPublicPostgresListing);
}

export async function addFavouriteInPostgres(userId: string, listingId: string) {
  assertPostgres();
  await requireUser(userId);
  await requireListing(listingId);
  const favourite = await getMainPrisma().favourite.upsert({
    where: { userId_listingId: { userId, listingId } },
    create: { userId, listingId },
    update: {},
  });
  return {
    userId: favourite.userId,
    listingId: favourite.listingId,
    createdAt: favourite.createdAt.toISOString(),
  };
}

export async function removeFavouriteInPostgres(userId: string, listingId: string) {
  assertPostgres();
  await getMainPrisma().favourite
    .delete({ where: { userId_listingId: { userId, listingId } } })
    .catch(() => null);
  return { removed: true };
}

export async function listSavedSearchesFromPostgres(userId: string) {
  assertPostgres();
  const rows = await getMainPrisma().savedSearch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    name: row.name,
    channels: row.channels.map((channel) => channel.toLowerCase()),
    filters: row.query as Record<string, unknown>,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function createSavedSearchInPostgres(
  userId: string,
  input: { name: string; channels?: string[]; filters?: Record<string, unknown> },
) {
  assertPostgres();
  await requireUser(userId);
  const row = await getMainPrisma().savedSearch.create({
    data: {
      userId,
      name: input.name.trim(),
      channels: normalizeNotificationChannels(input.channels),
      query: (input.filters ?? {}) as Prisma.InputJsonObject,
      enabled: true,
    },
  });
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    channels: row.channels.map((channel) => channel.toLowerCase()),
    filters: row.query as Record<string, unknown>,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listNotificationsFromPostgres(userId: string) {
  assertPostgres();
  const rows = await getMainPrisma().notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    channel: row.channel.toLowerCase(),
    subject: row.subject,
    body: row.body,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    sentAt: row.sentAt?.toISOString(),
  }));
}

export async function createNotificationInPostgres(
  userId: string,
  input: { channel?: string; subject: string; body: string },
) {
  assertPostgres();
  await requireUser(userId);
  const row = await getMainPrisma().notification.create({
    data: {
      userId,
      channel: normalizeNotificationChannel(input.channel),
      status: NotificationStatus.QUEUED,
      subject: input.subject,
      body: input.body,
    },
  });
  return {
    id: row.id,
    userId: row.userId,
    channel: row.channel.toLowerCase(),
    subject: row.subject,
    body: row.body,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createReportInPostgres(input: {
  listingId: string;
  reporterId?: string;
  reason: string;
  details?: string;
}) {
  assertPostgres();
  await requireListing(input.listingId);
  if (input.reporterId) await requireUser(input.reporterId);
  const row = await getMainPrisma().report.create({
    data: {
      listingId: input.listingId,
      reporterId: input.reporterId,
      reason: input.reason,
      details: input.details,
      status: ReportStatus.OPEN,
    },
  });
  return {
    id: row.id,
    listingId: row.listingId,
    reporterId: row.reporterId ?? undefined,
    reason: row.reason,
    details: row.details ?? "",
    status: row.status,
    priority: "MEDIUM",
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listConversationsFromPostgres(userId: string) {
  assertPostgres();
  const rows = await getMainPrisma().conversation.findMany({
    where: { participants: { some: { userId } } },
    include: {
      participants: { include: { user: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });
  const listingTitles = await listingTitlesById(rows.map((row) => row.listingId).filter(Boolean) as string[]);
  return rows.map((row) => ({
    id: row.id,
    listingTitle: row.listingId ? listingTitles.get(row.listingId) ?? "Property conversation" : "Conversation",
    participantNames: row.participants.map((participant) => participant.user.name),
    updatedAt: (row.messages[0]?.createdAt ?? row.updatedAt).toISOString(),
  }));
}

export async function listMessagesFromPostgres(conversationId: string, userId: string) {
  assertPostgres();
  await requireConversationParticipant(conversationId, userId);
  const rows = await getMainPrisma().message.findMany({
    where: { conversationId },
    include: { sender: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    senderName: row.sender.name,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function sendMessageInPostgres(conversationId: string, senderId: string, body: string) {
  assertPostgres();
  await requireConversationParticipant(conversationId, senderId);
  const row = await getMainPrisma().$transaction(async (tx) => {
    const message = await tx.message.create({
      data: { conversationId, senderId, body },
      include: { sender: true },
    });
    await tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
    return message;
  });
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    senderName: row.sender.name,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

async function requireUser(userId: string) {
  const user = await getMainPrisma().user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw new Error("User does not exist in Postgres.");
  return user;
}

async function requireListing(listingId: string) {
  const listing = await getMainPrisma().listing.findUnique({ where: { id: listingId }, select: { id: true } });
  if (!listing) throw new Error("Listing does not exist in Postgres.");
  return listing;
}

async function requireConversationParticipant(conversationId: string, userId: string) {
  const participant = await getMainPrisma().conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: { conversationId: true },
  });
  if (!participant) throw new Error("Conversation is not available to this user.");
}

async function listingTitlesById(ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const rows = await getMainPrisma().listing.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: { id: true, title: true },
  });
  return new Map(rows.map((row) => [row.id, row.title]));
}

function normalizeNotificationChannels(channels?: string[]) {
  const normalized = (channels ?? ["email"]).map(normalizeNotificationChannel);
  return [...new Set(normalized)];
}

function normalizeNotificationChannel(channel?: string) {
  const normalized = (channel ?? "email").trim().toUpperCase();
  if (normalized === "IN_APP") return NotificationChannel.PUSH;
  if (NOTIFICATION_CHANNELS.has(normalized)) return normalized as NotificationChannel;
  return NotificationChannel.EMAIL;
}

function assertPostgres() {
  if (!isPostgresStoreEnabled()) {
    throw new Error("Postgres persistence is not configured.");
  }
}
