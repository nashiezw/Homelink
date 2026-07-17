import { getClientIp } from "@/lib/api/request-meta";
import { requireAdmin, requireAdminAsync } from "@/lib/admin/require-admin";
import {
  getPostgresPaymentSettingsResponse,
  getPostgresPlatformSettings,
  getPostgresSettingsRbac,
  savePostgresPaymentSettings,
  savePostgresPlatformSettings,
} from "@/lib/admin/postgres-admin-config";
import { ok, problem } from "@/lib/api/response";
import { isPostgresStoreEnabled } from "@/lib/db/main-prisma";
import { testCloudinaryConfig } from "@/lib/integrations/cloudinary";
import { testGoogleMapsKey } from "@/lib/integrations/google-maps";
import { sendSmtpTestEmail } from "@/lib/integrations/smtp";
import { getHydratedStore } from "@/lib/store/app-store";
import { redactPaymentSettingsForAdmin, redactPlatformSettingsForAdmin, mergePlatformSecrets } from "@/lib/settings/redact";
import { mergePlatformSettings } from "@/lib/settings/merge";
import { savePersistedSettings } from "@/lib/settings/persist";
import type { AdminRbacSettings, PaymentSettings, PlatformSettings } from "@/lib/settings/types";
export const dynamic = "force-dynamic";

function hasDedicatedSettingsPersistence() {
  const url = process.env.SETTINGS_DATABASE_URL ?? "";
  if (!url) return false;
  if (process.env.HOUSELINK_STRICT_PRODUCTION === "true" && url.startsWith("file:")) return false;
  return true;
}

async function flushStoreAfterSettingsSave(store: Awaited<ReturnType<typeof getHydratedStore>>) {
  try {
    await store.flushPersistence();
  } catch (error) {
    if (!hasDedicatedSettingsPersistence()) throw error;
    console.warn("Settings saved, but app-store snapshot persistence failed.", error);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section") ?? "platform";
  const permission = section === "payments" ? "payments:read" : "platform:read";
  const auth = isPostgresStoreEnabled() ? await requireAdminAsync(request, permission) : requireAdmin(request, permission);
  if (auth.error) return auth.error;

  if (isPostgresStoreEnabled()) {
    if (section === "payments") return ok(await getPostgresPaymentSettingsResponse());
    if (section === "rbac") return ok(await getPostgresSettingsRbac());
    const settings = await getPostgresPlatformSettings();
    return ok({
      settings: redactPlatformSettingsForAdmin(settings),
      maintenanceMode: settings.maintenanceMode,
    });
  }

  const store = await getHydratedStore();
  if (section === "payments") {
    return ok({
      settings: redactPaymentSettingsForAdmin(store.getPaymentSettings()),
      health: store.getPaymentHealth(),
      webhooks: store.getWebhookLogs().slice(0, 20),
    });
  }

  if (section === "rbac") {
    const settings = store.getPlatformSettings();
    return ok({
      rbac: settings.rbac,
      admins: store.listUsers({ role: "ADMIN" }),
      eligibleUsers: store.listUsers({ status: "ACTIVE" }).filter((user) => !user.roles.includes("ADMIN")),
    });
  }

  return ok({
    settings: redactPlatformSettingsForAdmin(store.getPlatformSettings()),
    maintenanceMode: store.getPlatformSettings().maintenanceMode,
  });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    section?: string;
    settings?: Partial<PlatformSettings> | Partial<PaymentSettings>;
    test?: { type: "smtp" | "maps" | "cloudinary"; email?: string };
  };

  const section = body.section ?? "platform";
  const permission =
    section === "payments"
      ? "payments:write"
      : section === "marketing"
        ? "marketing:write"
        : "platform:write";
  const auth = isPostgresStoreEnabled() ? await requireAdminAsync(request, permission) : requireAdmin(request, permission);
  if (auth.error || !auth.user) return auth.error ?? problem(401, "UNAUTHORIZED", "Admin required.");
  const incomingPlatformSettings = body.settings as Partial<PlatformSettings> | undefined;

  if (isPostgresStoreEnabled()) {
    const actorEmail = "email" in auth.user ? auth.user.email : undefined;
    if (body.test) {
      const settings = await getPostgresPlatformSettings();
      const liveSettings = incomingPlatformSettings
        ? mergePlatformSecrets(mergePlatformSettings(settings, incomingPlatformSettings), settings)
        : settings;
      if (body.test.type === "smtp") {
        const recipient = body.test.email?.trim() || actorEmail || "admin@houselink.co.zw";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
          return ok({ ok: false, message: "Enter a valid recipient email address for the SMTP test." });
        }
        return ok(await sendSmtpTestEmail(liveSettings.integrations, recipient));
      }
      if (body.test.type === "maps") return ok(await testGoogleMapsKey(liveSettings.integrations.googleMapsKey));
      if (body.test.type === "cloudinary") return ok(await testCloudinaryConfig(liveSettings.integrations));
    }
    if (section === "payments") {
      const settings = await savePostgresPaymentSettings((body.settings ?? {}) as Partial<PaymentSettings>);
      return ok({ settings: redactPaymentSettingsForAdmin(settings), health: (await getPostgresPaymentSettingsResponse()).health });
    }
    const settings = await savePostgresPlatformSettings((body.settings ?? {}) as Partial<PlatformSettings>);
    return ok({ settings: redactPlatformSettingsForAdmin(settings) });
  }

  const store = await getHydratedStore();
  const actor = { id: auth.user.id, name: auth.user.name };
  const ip = getClientIp(request);

  if (body.test) {
    const settings = store.getPlatformSettings();
    const liveSettings = incomingPlatformSettings
      ? mergePlatformSecrets(mergePlatformSettings(settings, incomingPlatformSettings), settings)
      : settings;
    if (body.test.type === "smtp") {
      const recipient = body.test.email?.trim() || auth.user.email;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
        return ok({ ok: false, message: "Enter a valid recipient email address for the SMTP test." });
      }
      console.info("Admin SMTP test requested.", {
        recipient,
        host: liveSettings.integrations.smtpHost || "<empty>",
        port: liveSettings.integrations.smtpPort,
        userConfigured: Boolean(liveSettings.integrations.smtpUser),
        passConfigured: Boolean(liveSettings.integrations.smtpPass),
        from: liveSettings.integrations.smtpFrom || "<empty>",
      });
      const result = await sendSmtpTestEmail(liveSettings.integrations, recipient);
      return ok(result);
    }
    if (body.test.type === "maps") {
      const result = await testGoogleMapsKey(liveSettings.integrations.googleMapsKey);
      return ok(result);
    }
    if (body.test.type === "cloudinary") {
      const result = await testCloudinaryConfig(liveSettings.integrations);
      return ok(result);
    }
  }
  if (incomingPlatformSettings?.rbac && rbacChanged(store.getPlatformSettings().rbac, incomingPlatformSettings.rbac)) {
    const isSuperAdmin = store.getAdminPermissionsForUser(auth.user.id).includes("super");
    if (!isSuperAdmin) {
      return problem(403, "FORBIDDEN", "Only a super admin can change admin access assignments.");
    }
    if (!hasAtLeastOneSuperAdmin(incomingPlatformSettings.rbac)) {
      return problem(400, "INVALID_RBAC", "At least one super admin must remain assigned.");
    }
  }

  if (section === "payments") {
    const settings = store.updatePaymentSettings((body.settings ?? {}) as Partial<PaymentSettings>, actor, {
      ip,
      preserveSecrets: true,
    });
    try {
      await savePersistedSettings(store.getPlatformSettings(), settings);
      await flushStoreAfterSettingsSave(store);
    } catch {
      return problem(500, "PERSISTENCE_FAILED", "Settings could not be saved to the production database.");
    }
    return ok({ settings: redactPaymentSettingsForAdmin(settings), health: store.getPaymentHealth() });
  }

  const settings = store.updatePlatformSettings((body.settings ?? {}) as Partial<PlatformSettings>, actor, {
    ip,
    preserveSecrets: true,
  });
  try {
    await savePersistedSettings(settings, store.getPaymentSettings());
    await flushStoreAfterSettingsSave(store);
  } catch {
    return problem(500, "PERSISTENCE_FAILED", "Settings could not be saved to the production database.");
  }
  return ok({ settings: redactPlatformSettingsForAdmin(settings) });
}

function rbacChanged(current: AdminRbacSettings, incoming: AdminRbacSettings) {
  return JSON.stringify(current.roles) !== JSON.stringify(incoming.roles) || JSON.stringify(current.userRoleKeys) !== JSON.stringify(incoming.userRoleKeys);
}

function hasAtLeastOneSuperAdmin(rbac: AdminRbacSettings) {
  return Object.values(rbac.userRoleKeys).some((roleKeys) => roleKeys.includes("super_admin"));
}
