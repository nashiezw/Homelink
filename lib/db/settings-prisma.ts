import { PrismaClient } from "@/lib/generated/settings-client";

const globalForPrisma = globalThis as typeof globalThis & {
  __settingsPrisma?: PrismaClient;
};

export function getSettingsPrisma() {
  if (!globalForPrisma.__settingsPrisma) {
    globalForPrisma.__settingsPrisma = new PrismaClient();
  }
  return globalForPrisma.__settingsPrisma;
}
