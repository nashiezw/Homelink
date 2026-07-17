export function isStrictProductionMode() {
  return process.env.HOUSELINK_STRICT_PRODUCTION === "true";
}

export function isLocalAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return !appUrl || appUrl.includes("localhost") || appUrl.includes("127.0.0.1");
}

export function requireStrictProductionConfig() {
  return isStrictProductionMode() && process.env.NODE_ENV === "production";
}
