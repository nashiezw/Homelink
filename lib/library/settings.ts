import type { Prisma } from "@prisma/client";
import { getMainPrisma, isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-errors";
import {
  defaultLibraryStoreSettings,
  mergeLibraryStoreSettings,
  type LibraryStoreSettings,
} from "@/lib/library/settings-shared";

// Re-export shared types/defaults for server modules only.
// Client components must import from "@/lib/library/settings-shared"
// so webpack never pulls Prisma / node:crypto into the browser bundle.
export {
  defaultLibraryStoreSettings,
  mergeLibraryStoreSettings,
  productTemplateForType,
  publicLibraryStoreSettings,
  type LibraryProductTypeTemplate,
  type LibraryStoreSettings,
} from "@/lib/library/settings-shared";

export function shouldUsePostgresLibrarySettings() {
  return isPostgresStoreEnabled();
}

export async function getLibraryStoreSettings(): Promise<LibraryStoreSettings> {
  if (!shouldUsePostgresLibrarySettings()) return defaultLibraryStoreSettings;
  try {
    const row = await getMainPrisma().librarySetting.findUnique({ where: { id: "singleton" } });
    return mergeLibraryStoreSettings(row?.payload);
  } catch (error) {
    if (isMissingSchemaError(error)) return defaultLibraryStoreSettings;
    console.error("[library/settings] failed to load", error);
    return defaultLibraryStoreSettings;
  }
}

export async function saveLibraryStoreSettings(payload: unknown, actorId?: string) {
  const settings = mergeLibraryStoreSettings(payload);
  if (!shouldUsePostgresLibrarySettings()) return settings;
  try {
    await getMainPrisma().librarySetting.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", payload: settings as unknown as Prisma.InputJsonValue },
      update: { payload: settings as unknown as Prisma.InputJsonValue },
    });
    if (actorId) {
      await getMainPrisma().libraryActivity.create({
        data: {
          actorId,
          targetType: "settings",
          targetId: "singleton",
          action: "SETTINGS_UPDATED",
          message: "Library store settings updated.",
          metadata: {
            sections: Object.keys(settings),
            shippingZones: settings.delivery.zones.length,
            paymentMethods: settings.payments.allowedMethodIds,
          } as Prisma.InputJsonValue,
        },
      }).catch(() => null);
    }
  } catch (error) {
    if (isMissingSchemaError(error)) {
      throw new Error("Library settings table is missing. Run the latest database migration.");
    }
    throw error;
  }
  return settings;
}

export async function listLibrarySettingsAudit(limit = 20) {
  if (!shouldUsePostgresLibrarySettings()) return [] as Array<{ id: string; actorId: string | null; action: string; message: string; createdAt: Date; metadata: unknown }>;
  try {
    return await getMainPrisma().libraryActivity.findMany({
      where: { targetType: "settings" },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, actorId: true, action: true, message: true, createdAt: true, metadata: true },
    });
  } catch {
    return [];
  }
}
