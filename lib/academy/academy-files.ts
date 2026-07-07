import path from "path";

const ACADEMY_UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "academy");

/** Allowed relative paths under public/uploads/academy/ */
const ALLOWED_PATTERNS = [
  /^lessons\/[a-z0-9-]+\.pdf$/i,
  /^resources\/[a-z0-9-]+\.pdf$/i,
  /^homelink-zimbabwe-real-estate-agent-training-manual\.pdf$/i,
];

export function isAllowedAcademyFilePath(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) return false;
  return ALLOWED_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function resolveAcademyFilePath(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!isAllowedAcademyFilePath(normalized)) return null;
  const absolute = path.join(ACADEMY_UPLOAD_ROOT, normalized);
  if (!absolute.startsWith(ACADEMY_UPLOAD_ROOT)) return null;
  return absolute;
}

/** Stable download URL served by the Academy files API (works in standalone/production). */
export function academyFileDownloadUrl(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  return `/api/v1/academy/files/${normalized.split("/").map(encodeURIComponent).join("/")}`;
}

/** Convert legacy /uploads/academy/... paths to the Academy files API. */
export function toAcademyFileDownloadUrl(fileUrl: string) {
  if (!fileUrl) return fileUrl;
  if (fileUrl.startsWith("/api/v1/academy/files/")) return fileUrl;
  const prefix = "/uploads/academy/";
  if (fileUrl.startsWith(prefix)) {
    return academyFileDownloadUrl(fileUrl.slice(prefix.length));
  }
  return fileUrl;
}

export function academyUploadRoot() {
  return ACADEMY_UPLOAD_ROOT;
}

export async function verifyAcademyAssets(manifestRelativePaths: string[]) {
  const { access } = await import("fs/promises");
  const missing: string[] = [];
  for (const relativePath of manifestRelativePaths) {
    const absolute = resolveAcademyFilePath(relativePath);
    if (!absolute) {
      missing.push(relativePath);
      continue;
    }
    try {
      await access(absolute);
    } catch {
      missing.push(relativePath);
    }
  }
  return { ok: missing.length === 0, missing };
}
