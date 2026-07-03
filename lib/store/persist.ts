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

export async function loadPersistedStore(version: number): Promise<StoreState | null> {
  const fromPg = await loadFromPostgres(version);
  if (fromPg) return fromPg;

  const fromFile = await loadFromFile(version);
  if (fromFile) {
    void persistStoreState(fromFile, version);
    return fromFile;
  }

  return null;
}

export function loadPersistedStoreSync(version: number): StoreState | null {
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
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void persistStoreState(state, version);
  }, 1500);
}

export async function persistStoreState(state: StoreState, version: number) {
  if (persistInFlight) return;
  persistInFlight = true;
  const snapshot = serializeStoreState(state, version);
  try {
    await saveToPostgres(snapshot);
    await saveToFile(snapshot);
  } finally {
    persistInFlight = false;
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
  if (!isPostgresStoreEnabled()) return;
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
  } catch {
    // fall back to file only
  }
}

async function loadFromFile(version: number): Promise<StoreState | null> {
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
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(STORE_FILE, JSON.stringify(snapshot), "utf8");
}

export function saveStoreFileSync(snapshot: SerializedStoreSnapshot) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(STORE_FILE, JSON.stringify(snapshot), "utf8");
}
