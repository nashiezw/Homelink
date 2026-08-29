import type { PlatformSettings, PublicPlatformConfig } from "@/lib/settings/types";
import { isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { isDatabaseUnavailableError } from "@/lib/db/production-schema";
import { getHydratedStore, getStore } from "@/lib/store/app-store";

const PUBLIC_PLATFORM_CONFIG_TTL_MS = 10 * 60 * 1000;
let publicPlatformConfigCache: { value: PublicPlatformConfig; expiresAt: number; fromDatabase: boolean } | null = null;

export function invalidatePlatformSettingsCache() {
  publicPlatformConfigCache = null;
}

export function getRuntimePlatformSettings(): PlatformSettings {
  if (isPostgresStoreEnabled()) {
    // For synchronous calls, we need to use the store fallback
    // This is a limitation of the sync context, but in production
    // the async version should be used where possible
    return getStore().getPlatformSettings();
  }
  return getStore().getPlatformSettings();
}

export async function getHydratedRuntimePlatformSettings(options: { strictDatabase?: boolean } = {}): Promise<PlatformSettings> {
  if (isPostgresStoreEnabled()) {
    const { getPostgresPlatformSettings } = await import("@/lib/admin/postgres-admin-config");
    return getPostgresPlatformSettings().catch((error: unknown) => {
      if (options.strictDatabase || !isDatabaseUnavailableError(error)) throw error;
      return getStore().getPlatformSettings();
    });
  }
  return (await getHydratedStore()).getPlatformSettings();
}

export function toPublicPlatformConfig(settings: PlatformSettings): PublicPlatformConfig {
  return {
    platformName: settings.platformName,
    logoUrl: settings.logoUrl,
    primaryColor: settings.primaryColor,
    secondaryColor: settings.secondaryColor,
    darkModeEnabled: settings.darkModeEnabled,
    maintenanceMode: settings.maintenanceMode,
    maintenanceMessage: settings.maintenanceMessage,
    registrationOpen: settings.registrationOpen,
    defaultLanguage: settings.defaultLanguage,
    supportedLanguages: settings.supportedLanguages,
    defaultCurrency: settings.defaultCurrency,
    supportedCurrencies: settings.supportedCurrencies,
    featureFlags: settings.featureFlags,
    geo: settings.geo,
    provinces: settings.provinces,
    cities: settings.cities,
    suburbs: settings.suburbs,
    propertyTypes: settings.propertyTypes,
    amenities: settings.amenities,
    contact: settings.contact,
    integrations: {
      googleMapsKey: settings.integrations.googleMapsKey,
      analyticsId: settings.integrations.analyticsId,
      metaPixelId: settings.integrations.metaPixelId,
      cdnUrl: settings.integrations.cdnUrl,
    },
    enquiries: {
      requireManagedEnquiries: settings.enquiries.requireManagedEnquiries,
      showPublicContactDetails: false,
      viewingWorkflowEnabled: settings.enquiries.viewingWorkflowEnabled,
      bookingWorkflowEnabled: settings.enquiries.bookingWorkflowEnabled,
    },
  };
}

export function getPublicPlatformConfig(): PublicPlatformConfig {
  return toPublicPlatformConfig(getRuntimePlatformSettings());
}

export async function getHydratedPublicPlatformConfig(): Promise<PublicPlatformConfig> {
  return toPublicPlatformConfig(await getHydratedRuntimePlatformSettings());
}

export async function getCachedHydratedPublicPlatformConfig(): Promise<PublicPlatformConfig> {
  return (await getCachedHydratedPublicPlatformConfigResult()).config;
}

export async function getCachedHydratedPublicPlatformConfigResult(): Promise<{
  config: PublicPlatformConfig;
  degraded: boolean;
}> {
  const now = Date.now();
  if (publicPlatformConfigCache && publicPlatformConfigCache.expiresAt > now) {
    return { config: publicPlatformConfigCache.value, degraded: false };
  }
  try {
    const value = toPublicPlatformConfig(await getHydratedRuntimePlatformSettings({ strictDatabase: true }));
    publicPlatformConfigCache = { value, expiresAt: now + PUBLIC_PLATFORM_CONFIG_TTL_MS, fromDatabase: isPostgresStoreEnabled() };
    return { config: value, degraded: false };
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      if (publicPlatformConfigCache?.fromDatabase) return { config: publicPlatformConfigCache.value, degraded: true };
      return { config: getPublicPlatformConfig(), degraded: true };
    }
    throw error;
  }
}

export function isMaintenanceMode() {
  return getRuntimePlatformSettings().maintenanceMode;
}

export function getRegistrationPolicy() {
  const s = getRuntimePlatformSettings();
  return {
    open: s.registrationOpen,
    minPasswordLength: s.minPasswordLength,
    emailVerificationRequired: s.emailVerificationRequired,
    phoneVerificationRequired: s.phoneVerificationRequired,
  };
}

export function getUploadLimitsMb() {
  return getRuntimePlatformSettings().maxUploadMb;
}

export function getSessionTimeoutSeconds() {
  return getRuntimePlatformSettings().sessionTimeoutMinutes * 60;
}

export function getRateLimitPerMinute() {
  return getRuntimePlatformSettings().rateLimitPerMinute;
}

export function renderNotificationTemplate(
  channel: "email" | "sms" | "whatsapp",
  templateKey: string,
  variables: Record<string, string>,
): string | null {
  const settings = getRuntimePlatformSettings();
  const templates =
    channel === "email"
      ? settings.notifications.emailTemplates
      : channel === "sms"
        ? settings.notifications.smsTemplates
        : settings.notifications.whatsappTemplates;
  const template = templates[templateKey];
  if (!template) return null;
  return Object.entries(variables).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    template,
  );
}
