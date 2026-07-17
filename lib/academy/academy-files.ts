/** Allowed relative paths under public/uploads/academy/ */
const ALLOWED_PATTERNS = [
  /^lessons\/[a-z0-9-]+\.pdf$/i,
  /^resources\/[a-z0-9-]+\.pdf$/i,
  /^houselink-zimbabwe-real-estate-agent-training-manual\.pdf$/i,
];

export function isAllowedAcademyFilePath(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) return false;
  return ALLOWED_PATTERNS.some((pattern) => pattern.test(normalized));
}

/** Extract the academy-relative path from stored or legacy URLs. */
export function academyRelativePathFromUrl(fileUrl: string) {
  if (!fileUrl) return null;
  const normalized = fileUrl.split("?")[0] ?? fileUrl;
  if (normalized.startsWith("/uploads/academy/")) {
    return normalized.slice("/uploads/academy/".length);
  }
  if (normalized.startsWith("/api/v1/academy/files/")) {
    return decodeURIComponent(normalized.slice("/api/v1/academy/files/".length));
  }
  return null;
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
  const relative = academyRelativePathFromUrl(fileUrl);
  if (relative) return academyFileDownloadUrl(relative);
  return fileUrl;
}

export function academyUploadRoot() {
  return "public/uploads/academy";
}
