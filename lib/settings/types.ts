import type { EnquirySettings, PublicEnquiryConfig } from "@/lib/enquiries/types";

export type GatewayId =
  | "stripe"
  | "paynow"
  | "ecocash"
  | "onemoney"
  | "bank_transfer"
  | "cash"
  | "zipit"
  | "innbucks";

export type PaymentGatewayConfig = {
  id: GatewayId;
  label: string;
  enabled: boolean;
  sandbox: boolean;
  apiKey: string;
  secretKey: string;
  webhookUrl: string;
  callbackUrl: string;
  successUrl: string;
  failedUrl: string;
  timeoutMinutes: number;
};

export type ManualPaymentMethodConfig = {
  id: string;
  label: string;
  type: "bank" | "mobile_money" | "cash" | "other";
  enabled: boolean;
  requiresProof: boolean;
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  branch?: string;
  phoneNumber?: string;
  instructions: string;
};

export type FeeConfig = {
  platformCommissionPercent: number;
  serviceFeePercent: number;
  taxPercent: number;
  listingFee: number;
  subscriptionFee: number;
  featuredListingFee: number;
  advertisingFee: number;
  agencyFee: number;
};

export type PaymentSettings = {
  defaultGateway: GatewayId;
  liveMode: boolean;
  sandboxMode: boolean;
  currency: string;
  exchangeRateUsdToZwl: number;
  autoRetryEnabled: boolean;
  autoRetryMaxAttempts: number;
  failedPaymentRecoveryEnabled: boolean;
  refundPolicyDays: number;
  trialPeriodDays: number;
  billingCycle: "MONTHLY" | "QUARTERLY" | "YEARLY";
  gateways: PaymentGatewayConfig[];
  manualMethods: ManualPaymentMethodConfig[];
  fees: FeeConfig;
  bankDetails: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    branch: string;
    swiftCode: string;
  };
};

export type GeoCity = {
  name: string;
  suburbs: string[];
};

export type GeoProvince = {
  name: string;
  cities: GeoCity[];
};

export type LegalSettings = {
  termsVersion: string;
  privacyVersion: string;
  cookieConsentRequired: boolean;
  dataRetentionDays: number;
  allowDataExport: boolean;
  allowAccountDeletion: boolean;
};

export type ContactSettings = {
  supportEmail: string;
  careersEmail: string;
  phoneNumber: string;
  phoneLabel: string;
  whatsappNumber: string;
  whatsappLabel: string;
  officeAddress: string;
  supportHours: string;
};

export type AdminPermission =
  | "platform:read"
  | "platform:write"
  | "payments:read"
  | "payments:write"
  | "users:write"
  | "marketing:write"
  | "security:read"
  | "security:write"
  | "super";

export type AdminRoleDefinition = {
  label: string;
  description: string;
  permissions: AdminPermission[];
};

export type AdminRbacSettings = {
  roles: Record<string, AdminRoleDefinition>;
  userRoleKeys: Record<string, string[]>;
};

export type PlatformSettings = {
  platformName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  theme: "light" | "dark" | "system";
  darkModeEnabled: boolean;
  defaultLanguage: string;
  supportedLanguages: string[];
  defaultCurrency: string;
  supportedCurrencies: string[];
  timezone: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  registrationOpen: boolean;
  emailVerificationRequired: boolean;
  phoneVerificationRequired: boolean;
  minPasswordLength: number;
  sessionTimeoutMinutes: number;
  maxUploadMb: number;
  rateLimitPerMinute: number;
  countries: string[];
  provinces: string[];
  cities: string[];
  suburbs: string[];
  geo: GeoProvince[];
  propertyTypes: string[];
  amenities: string[];
  featureFlags: Record<string, boolean>;
  seo: {
    title: string;
    description: string;
    keywords: string;
  };
  contact: ContactSettings;
  legal: LegalSettings;
  rbac: AdminRbacSettings;
  integrations: {
    googleMapsKey: string;
    cloudinaryCloud: string;
    cloudinaryKey: string;
    cloudinarySecret: string;
    firebaseProjectId: string;
    clerkPublishableKey: string;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
    analyticsId: string;
    cdnUrl: string;
  };
  ai: {
    searchEnabled: boolean;
    fraudDetectionEnabled: boolean;
    roommateMatchingEnabled: boolean;
    duplicateDetectionEnabled: boolean;
    modelName: string;
    maxTokens: number;
  };
  notifications: {
    emailTemplates: Record<string, string>;
    smsTemplates: Record<string, string>;
    whatsappTemplates: Record<string, string>;
  };
  enquiries: EnquirySettings;
  updatedAt: string;
  updatedBy?: string;
};

export type WebhookLog = {
  id: string;
  gateway: GatewayId;
  event: string;
  payload: Record<string, unknown>;
  status: "SUCCESS" | "FAILED" | "PENDING";
  createdAt: string;
};

export type PaymentHealth = {
  gateway: GatewayId;
  status: "healthy" | "degraded" | "down";
  lastCheck: string;
  successRate: number;
  pendingWebhooks: number;
};

export type PublicPlatformConfig = {
  platformName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  darkModeEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  registrationOpen: boolean;
  defaultLanguage: string;
  supportedLanguages: string[];
  defaultCurrency: string;
  supportedCurrencies: string[];
  featureFlags: Record<string, boolean>;
  geo: GeoProvince[];
  provinces: string[];
  cities: string[];
  suburbs: string[];
  propertyTypes: string[];
  amenities: string[];
  contact: ContactSettings;
  integrations: {
    googleMapsKey: string;
    analyticsId: string;
    cdnUrl: string;
  };
  enquiries: PublicEnquiryConfig;
};
