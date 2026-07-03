import type { PaymentGatewayConfig, PaymentSettings, PlatformSettings } from "@/lib/settings/types";

const SECRET_PLACEHOLDER = "••••••••";

function maskSecret(value: string) {
  if (!value) return "";
  return SECRET_PLACEHOLDER;
}

export function redactPlatformSettingsForAdmin(settings: PlatformSettings): PlatformSettings {
  return {
    ...settings,
    integrations: {
      ...settings.integrations,
      cloudinarySecret: maskSecret(settings.integrations.cloudinarySecret),
      smtpPass: maskSecret(settings.integrations.smtpPass),
    },
  };
}

export function redactPaymentSettingsForAdmin(settings: PaymentSettings): PaymentSettings {
  return {
    ...settings,
    gateways: settings.gateways.map((gw) => redactGatewayForAdmin(gw)),
  };
}

function redactGatewayForAdmin(gw: PaymentGatewayConfig): PaymentGatewayConfig {
  return {
    ...gw,
    apiKey: maskSecret(gw.apiKey),
    secretKey: maskSecret(gw.secretKey),
  };
}

export function applySecretPreservation<T extends string>(
  incoming: T,
  current: T,
  placeholder = SECRET_PLACEHOLDER,
): T {
  if (incoming === placeholder || incoming.startsWith("••••")) {
    return current;
  }
  return incoming;
}

export function mergePlatformSecrets(incoming: PlatformSettings, current: PlatformSettings): PlatformSettings {
  return {
    ...incoming,
    integrations: {
      ...incoming.integrations,
      cloudinarySecret: applySecretPreservation(
        incoming.integrations.cloudinarySecret,
        current.integrations.cloudinarySecret,
      ),
      smtpPass: applySecretPreservation(incoming.integrations.smtpPass, current.integrations.smtpPass),
    },
  };
}

export function mergePaymentSecrets(incoming: PaymentSettings, current: PaymentSettings): PaymentSettings {
  return {
    ...incoming,
    gateways: incoming.gateways.map((gw, i) => {
      const prev = current.gateways[i];
      if (!prev || prev.id !== gw.id) return gw;
      return {
        ...gw,
        apiKey: applySecretPreservation(gw.apiKey, prev.apiKey),
        secretKey: applySecretPreservation(gw.secretKey, prev.secretKey),
      };
    }),
  };
}
