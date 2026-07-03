import { getClientIp } from "@/lib/api/request-meta";
import { requireAdmin } from "@/lib/admin/require-admin";
import { ok, problem } from "@/lib/api/response";
import { testGoogleMapsKey } from "@/lib/integrations/google-maps";
import { sendSmtpTestEmail } from "@/lib/integrations/smtp";
import { getStore } from "@/lib/store/app-store";
import { redactPaymentSettingsForAdmin, redactPlatformSettingsForAdmin, mergePlatformSecrets } from "@/lib/settings/redact";
import type { AdminRbacSettings, PaymentSettings, PlatformSettings } from "@/lib/settings/types";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section") ?? "platform";
  const permission = section === "payments" ? "payments:read" : "platform:read";
  const auth = requireAdmin(request, permission);
  if (auth.error) return auth.error;

  const store = getStore();
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
    test?: { type: "smtp" | "maps"; email?: string };
  };

  const section = body.section ?? "platform";
  const permission =
    section === "payments"
      ? "payments:write"
      : section === "marketing"
        ? "marketing:write"
        : "platform:write";
  const auth = requireAdmin(request, permission);
  if (auth.error || !auth.user) return auth.error ?? problem(401, "UNAUTHORIZED", "Admin required.");

  const store = getStore();
  const actor = { id: auth.user.id, name: auth.user.name };
  const ip = getClientIp(request);
  const incomingPlatformSettings = body.settings as Partial<PlatformSettings> | undefined;

  if (body.test) {
    const settings = store.getPlatformSettings();
    if (body.test.type === "smtp") {
      const live = mergePlatformSecrets(
        { ...settings, integrations: { ...settings.integrations } },
        settings,
      );
      const result = await sendSmtpTestEmail(live.integrations, body.test.email ?? auth.user.email);
      return ok(result);
    }
    if (body.test.type === "maps") {
      const result = await testGoogleMapsKey(settings.integrations.googleMapsKey);
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
      await store.flushPersistence();
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
    await store.flushPersistence();
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
