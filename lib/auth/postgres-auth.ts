import { Prisma, Role, VerificationStatus } from "@prisma/client";
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
  await getMainPrisma().user
    .update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    })
    .catch((error: unknown) => {
      if (!isMissingColumnError(error)) throw error;
    });
  return getPostgresPublicUserById(userId);
}

export async function getPostgresUserCounts(userId: string) {
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

function isMissingColumnError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022";
}
