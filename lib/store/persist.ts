import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { isPostgresStoreEnabled, getMainPrisma } from "@/lib/db/main-prisma";
import { deserializeStoreState, serializeStoreState, type SerializedStoreSnapshot } from "@/lib/store/serialize";
import type { StoreState } from "@/lib/store/app-store";

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "app-store.json");

let persistTimer: ReturnType<typeof setTimeout> | null = null;
let persistInFlight = false;
let queuedSnapshot: SerializedStoreSnapshot | null = null;

function isStrictProduction() {
  return process.env.HOMELINK_STRICT_PRODUCTION === "true";
}

export async function loadPersistedStore(version: number): Promise<StoreState | null> {
  const fromPg = await loadFromPostgres(version);
  if (fromPg) return fromPg;
  if (isStrictProduction()) return null;

  const fromFile = await loadFromFile(version);
  if (fromFile) {
    void persistStoreState(fromFile, version);
    return fromFile;
  }

  return null;
}

export function loadPersistedStoreSync(version: number): StoreState | null {
  if (isStrictProduction()) return null;
  try {
    if (!existsSync(STORE_FILE)) return null;
    const raw = readFileSync(STORE_FILE, "utf8");
    const snapshot = JSON.parse(raw) as SerializedStoreSnapshot;
    if (snapshot.version !== version) return null;
    return deserializeStoreState(snapshot) as StoreState;
  } catch {
    return null;
  }
}

export function scheduleStorePersist(state: StoreState, version: number) {
  if (isStrictProduction()) {
    void persistStoreState(state, version);
    return;
  }
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void persistStoreState(state, version);
  }, 1500);
}

export async function persistStoreState(state: StoreState, version: number) {
  const snapshot = serializeStoreState(state, version);
  if (persistInFlight) {
    queuedSnapshot = snapshot;
    return;
  }
  persistInFlight = true;
  try {
    await persistSnapshot(snapshot);
  } finally {
    persistInFlight = false;
  }

  if (queuedSnapshot) {
    const next = queuedSnapshot;
    queuedSnapshot = null;
    await persistSerializedStoreSnapshot(next);
  }
}

export async function persistSerializedStoreSnapshot(snapshot: SerializedStoreSnapshot) {
  if (persistInFlight) {
    queuedSnapshot = snapshot;
    return;
  }
  persistInFlight = true;
  try {
    await persistSnapshot(snapshot);
  } finally {
    persistInFlight = false;
  }

  if (queuedSnapshot) {
    const next = queuedSnapshot;
    queuedSnapshot = null;
    await persistSerializedStoreSnapshot(next);
  }
}

async function persistSnapshot(snapshot: SerializedStoreSnapshot) {
  await saveToPostgres(snapshot);
  if (!isStrictProduction()) {
    await saveToFile(snapshot);
  }
}

async function loadFromPostgres(version: number): Promise<StoreState | null> {
  if (!isPostgresStoreEnabled()) return null;
  try {
    const prisma = getMainPrisma();
    const row = await prisma.appStoreSnapshot.findUnique({ where: { id: "singleton" } });
    if (!row || row.version !== version) return null;
    return deserializeStoreState({
      version: row.version,
      savedAt: row.updatedAt.toISOString(),
      state: row.payload as Record<string, unknown>,
    }) as StoreState;
  } catch {
    return null;
  }
}

async function saveToPostgres(snapshot: SerializedStoreSnapshot) {
  if (!isPostgresStoreEnabled()) {
    if (isStrictProduction()) throw new Error("DATABASE_URL is required for strict production store persistence.");
    return;
  }
  try {
    const prisma = getMainPrisma();
    await prisma.appStoreSnapshot.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        version: snapshot.version,
        payload: snapshot.state as object,
      },
      update: {
        version: snapshot.version,
        payload: snapshot.state as object,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    if (isStrictProduction()) throw error;
  }
}

async function loadFromFile(version: number): Promise<StoreState | null> {
  if (isStrictProduction()) return null;
  try {
    const raw = await readFile(STORE_FILE, "utf8");
    const snapshot = JSON.parse(raw) as SerializedStoreSnapshot;
    if (snapshot.version !== version) return null;
    return deserializeStoreState(snapshot) as StoreState;
  } catch {
    return null;
  }
}

async function saveToFile(snapshot: SerializedStoreSnapshot) {
  if (isStrictProduction()) return;
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(STORE_FILE, JSON.stringify(snapshot), "utf8");
}

export function saveStoreFileSync(snapshot: SerializedStoreSnapshot) {
  if (isStrictProduction()) return;
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(STORE_FILE, JSON.stringify(snapshot), "utf8");
}
