import type { PlatformSettings, PublicPlatformConfig } from "@/lib/settings/types";
import { defaultPlatformSettings } from "@/lib/settings/defaults";
import { isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { getHydratedStore, getStore } from "@/lib/store/app-store";

export function getRuntimePlatformSettings(): PlatformSettings {
  if (process.env.HOMELINK_STRICT_PRODUCTION === "true" && isPostgresStoreEnabled()) {
    return defaultPlatformSettings;
  }
  return getStore().getPlatformSettings();
}

export async function getHydratedRuntimePlatformSettings(): Promise<PlatformSettings> {
  if (process.env.HOMELINK_STRICT_PRODUCTION === "true" && isPostgresStoreEnabled()) {
    return defaultPlatformSettings;
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
      cdnUrl: settings.integrations.cdnUrl,
    },
    enquiries: {
      requireManagedEnquiries: settings.enquiries.requireManagedEnquiries,
      showPublicContactDetails: settings.enquiries.showPublicContactDetails,
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
