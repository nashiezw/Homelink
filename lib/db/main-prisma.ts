import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  __mainPrisma?: PrismaClient;
};

export function getMainPrisma() {
  if (!globalForPrisma.__mainPrisma) {
    const url = withServerlessPoolDefaults(process.env.DATABASE_URL);
    globalForPrisma.__mainPrisma = url
      ? new PrismaClient({ datasources: { db: { url } } })
      : new PrismaClient();
  }
  return globalForPrisma.__mainPrisma;
}

export function isPostgresStoreEnabled() {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

function withServerlessPoolDefaults(value?: string) {
  if (!value || (!value.startsWith("postgresql://") && !value.startsWith("postgres://"))) {
    return value;
  }
  try {
    const url = new URL(value);
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", "1");
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", "20");
    }
    return url.toString();
  } catch {
    return value;
  }
}
