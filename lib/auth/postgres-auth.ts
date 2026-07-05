import { Role, VerificationStatus } from "@prisma/client";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";

export function shouldUsePostgresAuth() {
  return isPostgresStoreEnabled();
}

export async function getPostgresUserByEmail(email: string) {
  return getMainPrisma().user.findUnique({ where: { email: email.trim().toLowerCase() } });
}

export async function getPostgresUserById(id: string) {
  return getMainPrisma().user.findUnique({ where: { id } });
}

export async function createPostgresUser(input: {
  email: string;
  passwordHash: string;
  name: string;
  phone?: string;
}) {
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
  return getMainPrisma().user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
}

export async function getPostgresUserCounts(userId: string) {
  const prisma = getMainPrisma();
  const [savedCount, alertCount] = await Promise.all([
    prisma.favourite.count({ where: { userId } }),
    prisma.savedSearch.count({ where: { userId } }),
  ]);
  return { savedCount, alertCount };
}

export function toPublicPostgresUser(user: {
  id: string;
  email: string;
  phone: string | null;
  name: string;
  roles: Role[];
  accountStatus: string;
  identityStatus: VerificationStatus;
  phoneVerifiedAt: Date | null;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? undefined,
    roles: user.roles,
    accountStatus: user.accountStatus,
    verification: {
      identity: user.identityStatus,
      phone: user.phoneVerifiedAt ? "VERIFIED" : "PENDING",
      email: user.emailVerifiedAt ? "VERIFIED" : "PENDING",
    },
    createdAt: user.createdAt.toISOString(),
  };
}
