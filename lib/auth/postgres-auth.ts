import { Prisma, Role, VerificationStatus } from "@prisma/client";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { ensureCoreProductionSchema, isMissingSchemaError } from "@/lib/db/production-schema";

export function shouldUsePostgresAuth() {
  return isPostgresStoreEnabled();
}

export async function getPostgresUserByEmail(email: string) {
  await ensureCoreProductionSchema();
  return getMainPrisma().user.findUnique({ where: { email: email.trim().toLowerCase() } });
}

export async function getPostgresUserById(id: string) {
  await ensureCoreProductionSchema();
  return getMainPrisma().user.findUnique({ where: { id } });
}

const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  phone: true,
  name: true,
  roles: true,
  identityStatus: true,
  phoneVerifiedAt: true,
  emailVerifiedAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type PublicPostgresUserRow = Prisma.UserGetPayload<{ select: typeof PUBLIC_USER_SELECT }> & {
  accountStatus?: string;
};

export async function getPostgresPublicUserById(id: string) {
  await ensureCoreProductionSchema();
  return getMainPrisma().user.findUnique({
    where: { id },
    select: PUBLIC_USER_SELECT,
  });
}

export async function createPostgresUser(input: {
  email: string;
  passwordHash: string;
  name: string;
  phone?: string;
}) {
  await ensureCoreProductionSchema();
  return getMainPrisma().user.create({
    data: {
      email: input.email.trim().toLowerCase(),
      passwordHash: input.passwordHash,
      name: input.name.trim(),
      phone: input.phone || null,
      roles: [Role.SEEKER],
      identityStatus: VerificationStatus.PENDING,
    },
  });
}

export async function recordPostgresLogin(userId: string) {
  await ensureCoreProductionSchema();
  await getMainPrisma().user
    .update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    })
    .catch((error: unknown) => {
      if (!isMissingSchemaError(error)) throw error;
    });
  return getPostgresPublicUserById(userId);
}

export async function createPostgresSession(userId: string, sessionId: string, maxAgeSeconds: number) {
  await ensureCoreProductionSchema();
  const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000);
  await getMainPrisma().appSession.create({
    data: {
      id: sessionId,
      userId,
      expiresAt,
    },
  });
  await recordPostgresAuditEvent({
    actorId: userId,
    action: "AUTH_LOGIN_SUCCESS",
    target: userId,
    metadata: { sessionId },
  });
}

export async function revokePostgresSession(sessionId: string, userId?: string) {
  await ensureCoreProductionSchema();
  const row = await getMainPrisma().appSession
    .update({
      where: { id: sessionId },
      data: { revokedAt: new Date(), lastSeenAt: new Date() },
    })
    .catch((error: unknown) => {
      if (isMissingSchemaError(error) || isRecordNotFoundError(error)) return null;
      throw error;
    });
  if (row) {
    await recordPostgresAuditEvent({
      actorId: userId ?? row.userId,
      action: "AUTH_LOGOUT",
      target: userId ?? row.userId,
      metadata: { sessionId },
    });
  }
}

export async function touchPostgresSession(sessionId: string) {
  await ensureCoreProductionSchema();
  await getMainPrisma().appSession
    .update({
      where: { id: sessionId },
      data: { lastSeenAt: new Date() },
    })
    .catch((error: unknown) => {
      if (!isMissingSchemaError(error) && !isRecordNotFoundError(error)) throw error;
    });
}

export async function recordPostgresAuditEvent(input: {
  actorId?: string | null;
  action: string;
  target: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await ensureCoreProductionSchema();
  await getMainPrisma().auditEvent
    .create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        target: input.target,
        metadata: input.metadata ?? {},
      },
    })
    .catch((error: unknown) => {
      if (!isMissingSchemaError(error)) throw error;
    });
}

export async function getPostgresUserCounts(userId: string) {
  await ensureCoreProductionSchema();
  const prisma = getMainPrisma();
  const [savedCount, alertCount] = await Promise.all([
    prisma.favourite.count({ where: { userId } }),
    prisma.savedSearch.count({ where: { userId } }),
  ]);
  return { savedCount, alertCount };
}

export function toPublicPostgresUser(user: PublicPostgresUserRow) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? undefined,
    roles: user.roles,
    accountStatus: user.accountStatus ?? "ACTIVE",
    verification: {
      identity: user.identityStatus,
      phone: user.phoneVerifiedAt ? "VERIFIED" : "PENDING",
      email: user.emailVerifiedAt ? "VERIFIED" : "PENDING",
    },
    createdAt: user.createdAt.toISOString(),
  };
}

function isRecordNotFoundError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}
