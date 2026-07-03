import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_PREFIX = "scrypt";
const KEY_LENGTH = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${SCRYPT_PREFIX}$${salt}$${key}`;
}

export function verifyPassword(password: string, passwordHash: string) {
  const [scheme, salt, storedKey] = passwordHash.split("$");

  if (scheme === SCRYPT_PREFIX && salt && storedKey) {
    const key = scryptSync(password, salt, KEY_LENGTH);
    const stored = Buffer.from(storedKey, "hex");
    return stored.length === key.length && timingSafeEqual(stored, key);
  }

  const legacyHash = createHash("sha256").update(password).digest("hex");
  const legacyStored = Buffer.from(passwordHash, "hex");
  const legacyCandidate = Buffer.from(legacyHash, "hex");
  return legacyStored.length === legacyCandidate.length && timingSafeEqual(legacyStored, legacyCandidate);
}
