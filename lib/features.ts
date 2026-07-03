import { getRuntimePlatformSettings } from "@/lib/settings/runtime";

export type FeatureKey =
  | "aiSearch"
  | "roommateMatching"
  | "featuredListings"
  | "agencyDashboard"
  | "whatsappNotifications"
  | "mapSearch"
  | "compareListings"
  | "savedSearches";

export function isFeatureEnabled(feature: FeatureKey): boolean {
  const settings = getRuntimePlatformSettings();
  if (settings.featureFlags[feature] === false) return false;

  if (feature === "aiSearch" && !settings.ai.searchEnabled) return false;
  if (feature === "roommateMatching" && !settings.ai.roommateMatchingEnabled) return false;

  return true;
}

export function isAiSearchEnabled() {
  return isFeatureEnabled("aiSearch");
}

export function isRoommateMatchingEnabled() {
  return isFeatureEnabled("roommateMatching");
}

export function isFraudDetectionEnabled() {
  return getRuntimePlatformSettings().ai.fraudDetectionEnabled;
}

export function isDuplicateDetectionEnabled() {
  return getRuntimePlatformSettings().ai.duplicateDetectionEnabled;
}
