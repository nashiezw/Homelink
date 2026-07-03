import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  __mainPrisma?: PrismaClient;
};

export function getMainPrisma() {
  if (!globalForPrisma.__mainPrisma) {
    globalForPrisma.__mainPrisma = new PrismaClient();
  }
  return globalForPrisma.__mainPrisma;
}

export function isPostgresStoreEnabled() {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}
