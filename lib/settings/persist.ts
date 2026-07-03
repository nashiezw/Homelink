import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { defaultPaymentSettings, defaultPlatformSettings } from "@/lib/settings/defaults";
import { mergePaymentSettings, mergePlatformSettings } from "@/lib/settings/merge";
import type { PaymentSettings, PlatformSettings } from "@/lib/settings/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const SETTINGS_FILE = path.join(DATA_DIR, "platform-settings.json");

export type PersistedSettings = {
  platformSettings: PlatformSettings;
  paymentSettings: PaymentSettings;
  savedAt: string;
};

function defaults(): PersistedSettings {
  return {
    platformSettings: { ...defaultPlatformSettings },
    paymentSettings: {
      ...defaultPaymentSettings,
      gateways: defaultPaymentSettings.gateways.map((g) => ({ ...g })),
    },
    savedAt: new Date().toISOString(),
  };
}

function isStrictProduction() {
  return process.env.HOMELINK_STRICT_PRODUCTION === "true";
}

function isSettingsDatabaseEnabled() {
  return Boolean(process.env.SETTINGS_DATABASE_URL);
}

function hydrateSettings(settings: PersistedSettings): PersistedSettings {
  const base = defaults();
  return {
    platformSettings: mergePlatformSettings(base.platformSettings, settings.platformSettings),
    paymentSettings: mergePaymentSettings(base.paymentSettings, settings.paymentSettings),
    savedAt: settings.savedAt,
  };
}

async function loadFromDatabase(): Promise<PersistedSettings | null> {
  try {
    const { getSettingsPrisma } = await import("@/lib/db/settings-prisma");
    const prisma = getSettingsPrisma();
    const row = await prisma.platformSettingsRecord.findUnique({ where: { id: "singleton" } });
    if (!row) return null;
    return hydrateSettings({
      platformSettings: JSON.parse(row.platform) as PlatformSettings,
      paymentSettings: JSON.parse(row.payment) as PaymentSettings,
      savedAt: row.savedAt.toISOString(),
    });
  } catch {
    return null;
  }
}

function loadFromDatabaseSync(): PersistedSettings | null {
  return null;
}

async function saveToDatabase(platformSettings: PlatformSettings, paymentSettings: PaymentSettings) {
  const { getSettingsPrisma } = await import("@/lib/db/settings-prisma");
  const prisma = getSettingsPrisma();
  const platform = JSON.stringify(platformSettings);
  const payment = JSON.stringify(paymentSettings);
  await prisma.platformSettingsRecord.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", platform, payment },
    update: { platform, payment, savedAt: new Date() },
  });
}

function loadFromFile(): PersistedSettings | null {
  if (isStrictProduction()) return null;
  try {
    if (!existsSync(SETTINGS_FILE)) return null;
    const raw = readFileSync(SETTINGS_FILE, "utf8");
    return hydrateSettings(JSON.parse(raw) as PersistedSettings);
  } catch {
    return null;
  }
}

async function migrateFileToDatabase(file: PersistedSettings) {
  try {
    await saveToDatabase(file.platformSettings, file.paymentSettings);
  } catch {
    // Keep file as fallback
  }
}

export async function loadPersistedSettings(): Promise<PersistedSettings | null> {
  const fromDb = isSettingsDatabaseEnabled() ? await loadFromDatabase() : null;
  if (fromDb) return fromDb;
  if (isStrictProduction()) return null;

  const fromFile = await (async () => {
    try {
      const raw = await readFile(SETTINGS_FILE, "utf8");
      return hydrateSettings(JSON.parse(raw) as PersistedSettings);
    } catch {
      return null;
    }
  })();

  if (fromFile) {
    await migrateFileToDatabase(fromFile);
    return fromFile;
  }

  return null;
}

export function loadPersistedSettingsSync(): PersistedSettings | null {
  const fromDb = isSettingsDatabaseEnabled() ? loadFromDatabaseSync() : null;
  if (fromDb) return fromDb;
  if (isStrictProduction()) return null;

  const fromFile = loadFromFile();
  if (fromFile) {
    void migrateFileToDatabase(fromFile);
    return fromFile;
  }

  return null;
}

export async function savePersistedSettings(platformSettings: PlatformSettings, paymentSettings: PaymentSettings) {
  const payload: PersistedSettings = {
    platformSettings,
    paymentSettings,
    savedAt: new Date().toISOString(),
  };
  try {
    if (isSettingsDatabaseEnabled()) {
      await saveToDatabase(platformSettings, paymentSettings);
    } else if (isStrictProduction()) {
      return;
    }
  } catch {
    if (isStrictProduction()) {
      throw new Error("Settings database persistence failed.");
    }
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(SETTINGS_FILE, JSON.stringify(payload, null, 2), "utf8");
    return;
  }

  // Keep JSON mirror for ops/debug
  if (!isStrictProduction()) {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(SETTINGS_FILE, JSON.stringify(payload, null, 2), "utf8");
  }
}

export function savePersistedSettingsSync(platformSettings: PlatformSettings, paymentSettings: PaymentSettings) {
  const payload: PersistedSettings = {
    platformSettings,
    paymentSettings,
    savedAt: new Date().toISOString(),
  };
  if (!isStrictProduction()) {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(SETTINGS_FILE, JSON.stringify(payload, null, 2), "utf8");
  }
  void savePersistedSettings(platformSettings, paymentSettings);
}

export function getSettingsFilePath() {
  return SETTINGS_FILE;
}

export function getDefaultPersistedSettings() {
  return defaults();
}
