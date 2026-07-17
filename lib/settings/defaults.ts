import type { PaymentGatewayConfig, PaymentSettings, PlatformSettings } from "@/lib/settings/types";
import { buildDefaultGeo } from "@/lib/settings/geo";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://houselink.co.zw";

function env(name: string) {
  return process.env[name]?.trim() ?? "";
}

function envNumber(name: string, fallback: number) {
  const value = Number(env(name));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getPlatformIntegrationEnvOverrides(): Partial<PlatformSettings["integrations"]> {
  const overrides: Partial<PlatformSettings["integrations"]> = {};
  const googleMapsKey = env("GOOGLE_MAPS_API_KEY") || env("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
  const smtpPass = env("SMTP_PASS") || env("SMTP_PASSWORD") || env("RESEND_API_KEY");
  const smtpFrom = env("SMTP_FROM") || env("EMAIL_FROM") || env("RESEND_FROM") || env("FROM_EMAIL");

  if (googleMapsKey) overrides.googleMapsKey = googleMapsKey;
  if (env("CLOUDINARY_CLOUD_NAME")) overrides.cloudinaryCloud = env("CLOUDINARY_CLOUD_NAME");
  if (env("CLOUDINARY_API_KEY")) overrides.cloudinaryKey = env("CLOUDINARY_API_KEY");
  if (env("CLOUDINARY_API_SECRET")) overrides.cloudinarySecret = env("CLOUDINARY_API_SECRET");
  if (env("FIREBASE_PROJECT_ID")) overrides.firebaseProjectId = env("FIREBASE_PROJECT_ID");
  if (env("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")) overrides.clerkPublishableKey = env("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  if (env("SMTP_HOST")) overrides.smtpHost = env("SMTP_HOST");
  if (env("SMTP_PORT")) overrides.smtpPort = envNumber("SMTP_PORT", 587);
  if (env("SMTP_USER")) overrides.smtpUser = env("SMTP_USER");
  if (smtpPass) {
    overrides.smtpPass = smtpPass;
    if (!overrides.smtpHost && env("RESEND_API_KEY")) overrides.smtpHost = "smtp.resend.com";
    if (!overrides.smtpUser && env("RESEND_API_KEY")) overrides.smtpUser = "resend";
  }
  if (smtpFrom) overrides.smtpFrom = smtpFrom;
  if (env("NEXT_PUBLIC_ANALYTICS_ID")) overrides.analyticsId = env("NEXT_PUBLIC_ANALYTICS_ID");
  if (env("NEXT_PUBLIC_CDN_URL")) overrides.cdnUrl = env("NEXT_PUBLIC_CDN_URL");

  return overrides;
}

function gateway(
  partial: Omit<PaymentGatewayConfig, "webhookUrl" | "callbackUrl" | "successUrl" | "failedUrl"> &
    Partial<Pick<PaymentGatewayConfig, "webhookUrl" | "callbackUrl" | "successUrl" | "failedUrl">>,
): PaymentGatewayConfig {
  return {
    webhookUrl: `${baseUrl}/api/v1/payments/webhooks/${partial.id}`,
    callbackUrl: `${baseUrl}/api/v1/payments/callback/${partial.id}`,
    successUrl: `${baseUrl}/payments?status=success`,
    failedUrl: `${baseUrl}/payments?status=failed`,
    ...partial,
  };
}

export const defaultPaymentSettings: PaymentSettings = {
  defaultGateway: "bank_transfer",
  liveMode: false,
  sandboxMode: true,
  currency: "USD",
  exchangeRateUsdToZwl: 13500,
  autoRetryEnabled: true,
  autoRetryMaxAttempts: 3,
  failedPaymentRecoveryEnabled: true,
  refundPolicyDays: 7,
  trialPeriodDays: 14,
  billingCycle: "MONTHLY",
  fees: {
    platformCommissionPercent: 5,
    serviceFeePercent: 2.5,
    taxPercent: 0,
    listingFee: 5,
    subscriptionFee: 49,
    featuredListingFee: 15,
    advertisingFee: 25,
    agencyFee: 149,
  },
  bankDetails: {
    bankName: "CBZ Bank",
    accountName: "HouseLink Zimbabwe Pvt Ltd",
    accountNumber: "1234567890",
    branch: "Harare Main",
    swiftCode: "COBZZWHX",
  },
  manualMethods: [
    {
      id: "bank_transfer",
      label: "CBZ Bank transfer",
      type: "bank",
      enabled: true,
      requiresProof: true,
      bankName: "CBZ Bank",
      accountName: "HouseLink Zimbabwe Pvt Ltd",
      accountNumber: "1234567890",
      branch: "Harare Main",
      instructions: "Use your HouseLink payment reference as the bank transfer reference, then upload the proof of payment.",
    },
    {
      id: "zipit",
      label: "ZIPIT transfer",
      type: "bank",
      enabled: true,
      requiresProof: true,
      accountName: "HouseLink Zimbabwe Pvt Ltd",
      accountNumber: "1234567890",
      bankName: "CBZ Bank",
      instructions: "Send ZIPIT using your HouseLink payment reference and upload the confirmation receipt.",
    },
    {
      id: "cash",
      label: "Cash at HouseLink office",
      type: "cash",
      enabled: true,
      requiresProof: true,
      instructions: "Pay at a HouseLink office and upload or provide the receipt number for finance approval.",
    },
  ],
  gateways: [
    gateway({
      id: "stripe",
      label: "Stripe",
      enabled: false,
      sandbox: true,
      apiKey: "",
      secretKey: "",
      timeoutMinutes: 30,
    }),
    gateway({
      id: "paynow",
      label: "Paynow",
      enabled: false,
      sandbox: true,
      apiKey: "",
      secretKey: "",
      timeoutMinutes: 15,
    }),
    gateway({
      id: "ecocash",
      label: "EcoCash",
      enabled: false,
      sandbox: false,
      apiKey: "",
      secretKey: "",
      timeoutMinutes: 10,
    }),
    gateway({
      id: "onemoney",
      label: "OneMoney",
      enabled: false,
      sandbox: false,
      apiKey: "",
      secretKey: "",
      timeoutMinutes: 10,
    }),
    gateway({
      id: "bank_transfer",
      label: "Bank Transfer",
      enabled: true,
      sandbox: false,
      apiKey: "",
      secretKey: "",
      timeoutMinutes: 1440,
    }),
    gateway({
      id: "cash",
      label: "Cash Payments",
      enabled: true,
      sandbox: false,
      apiKey: "",
      secretKey: "",
      timeoutMinutes: 1440,
    }),
    gateway({
      id: "zipit",
      label: "ZIPIT",
      enabled: true,
      sandbox: false,
      apiKey: "",
      secretKey: "",
      timeoutMinutes: 60,
    }),
    gateway({
      id: "innbucks",
      label: "Innbucks",
      enabled: false,
      sandbox: false,
      apiKey: "",
      secretKey: "",
      timeoutMinutes: 15,
    }),
  ],
};

export const defaultPlatformSettings: PlatformSettings = {
  platformName: "HouseLink Zimbabwe",
  logoUrl: "/logo.svg",
  primaryColor: "#059669",
  secondaryColor: "#0891b2",
  theme: "system",
  darkModeEnabled: true,
  defaultLanguage: "en",
  supportedLanguages: ["en", "sn", "nd"],
  defaultCurrency: "USD",
  supportedCurrencies: ["USD", "ZWL"],
  timezone: "Africa/Harare",
  maintenanceMode: false,
  maintenanceMessage: "We are performing scheduled maintenance. Please check back shortly.",
  registrationOpen: true,
  emailVerificationRequired: false,
  phoneVerificationRequired: false,
  minPasswordLength: 8,
  sessionTimeoutMinutes: 480,
  maxUploadMb: 10,
  rateLimitPerMinute: 120,
  countries: ["Zimbabwe"],
  provinces: ["Harare", "Bulawayo", "Manicaland", "Mashonaland Central", "Mashonaland East", "Mashonaland West", "Masvingo", "Matabeleland North", "Matabeleland South", "Midlands"],
  cities: ["Harare", "Bulawayo", "Gweru", "Mutare", "Kwekwe", "Masvingo", "Chitungwiza", "Victoria Falls"],
  suburbs: ["Avondale", "Borrowdale", "CBD", "Greendale", "Hillside", "Senga", "Murambi"],
  geo: buildDefaultGeo(),
  propertyTypes: ["room", "cottage", "flat", "house", "land", "commercial", "holiday_home"],
  amenities: ["wifi", "parking", "security", "borehole", "solar", "furnished", "ensuite", "garden"],
  featureFlags: {
    aiSearch: true,
    roommateMatching: true,
    featuredListings: true,
    agencyDashboard: true,
    whatsappNotifications: true,
    mapSearch: true,
    compareListings: true,
    savedSearches: true,
  },
  seo: {
    title: "HouseLink Zimbabwe - Find Rooms, Houses & Land",
    description: "Zimbabwe's property marketplace for rooms, houses, flats, land, and roommate matching.",
    keywords: "property, zimbabwe, rent, harare, bulawayo, rooms",
  },
  contact: {
    supportEmail: "",
    careersEmail: "",
    phoneNumber: "",
    phoneLabel: "",
    whatsappNumber: "",
    whatsappLabel: "",
    officeAddress: "",
    supportHours: "",
  },
  careers: {
    roles: [
      {
        id: "customer-support-specialist",
        title: "Customer support specialist",
        location: "Harare / remote",
        type: "Full-time",
        body: "Help seekers and landlords get unstuck - verification questions, listing issues, and account access.",
        published: true,
      },
      {
        id: "property-operations-associate",
        title: "Property operations associate",
        location: "Harare",
        type: "Full-time",
        body: "Support property management workflows, owner onboarding, and consultant coordination.",
        published: true,
      },
      {
        id: "frontend-engineer",
        title: "Frontend engineer",
        location: "Remote (Zimbabwe-friendly)",
        type: "Full-time",
        body: "Build premium marketplace experiences - search, listings, tenancies, and trust tooling.",
        published: true,
      },
    ],
  },
  legal: {
    termsVersion: "2026.1",
    privacyVersion: "2026.1",
    cookieConsentRequired: true,
    dataRetentionDays: 365,
    allowDataExport: true,
    allowAccountDeletion: true,
  },
  rbac: {
    roles: {
      viewer: {
        label: "Viewer",
        description: "Read-only platform configuration.",
        permissions: ["platform:read", "security:read", "payments:read", "enquiries:read"],
      },
      finance: {
        label: "Finance",
        description: "Manage payments, fees, and gateways.",
        permissions: ["platform:read", "payments:read", "payments:write"],
      },
      support: {
        label: "Support",
        description: "Manage customer support queues and customer follow-up.",
        permissions: ["platform:read"],
      },
      billing_support: {
        label: "Billing Support",
        description: "Handle payment tickets, manual proof review, and billing questions.",
        permissions: ["platform:read", "payments:read", "payments:write"],
      },
      technical_support: {
        label: "Technical Support",
        description: "Handle technical tickets and system health triage.",
        permissions: ["platform:read", "security:read", "enquiries:read", "enquiries:write"],
      },
      trust_safety: {
        label: "Trust & Safety",
        description: "Handle safety, verification, and moderation queues.",
        permissions: ["platform:read", "security:read", "users:write"],
      },
      marketing: {
        label: "Marketing",
        description: "Homepage CMS and campaigns.",
        permissions: ["platform:read", "marketing:write"],
      },
      ops: {
        label: "Operations",
        description: "Users, listings, and day-to-day platform ops.",
        permissions: ["platform:read", "platform:write", "users:write", "security:read"],
      },
      platform_admin: {
        label: "Platform Admin",
        description: "Full settings except super-admin overrides.",
        permissions: [
          "platform:read",
          "platform:write",
          "payments:read",
          "payments:write",
          "enquiries:read",
          "enquiries:write",
          "users:write",
          "marketing:write",
          "security:read",
          "security:write",
        ],
      },
      super_admin: {
        label: "Super Admin",
        description: "Unrestricted access including overrides.",
        permissions: ["super"],
      },
    },
    userRoleKeys: {
      user_admin: ["super_admin"],
    },
  },
  integrations: {
    googleMapsKey: env("GOOGLE_MAPS_API_KEY") || env("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"),
    cloudinaryCloud: env("CLOUDINARY_CLOUD_NAME"),
    cloudinaryKey: env("CLOUDINARY_API_KEY"),
    cloudinarySecret: env("CLOUDINARY_API_SECRET"),
    firebaseProjectId: env("FIREBASE_PROJECT_ID"),
    clerkPublishableKey: env("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
    smtpHost: env("SMTP_HOST") || (env("RESEND_API_KEY") ? "smtp.resend.com" : ""),
    smtpPort: envNumber("SMTP_PORT", 587),
    smtpUser: env("SMTP_USER") || (env("RESEND_API_KEY") ? "resend" : ""),
    smtpPass: env("SMTP_PASS") || env("SMTP_PASSWORD") || env("RESEND_API_KEY"),
    smtpFrom: env("SMTP_FROM") || env("EMAIL_FROM") || env("RESEND_FROM") || env("FROM_EMAIL") || "support@houselink.co.zw",
    analyticsId: env("NEXT_PUBLIC_ANALYTICS_ID"),
    cdnUrl: env("NEXT_PUBLIC_CDN_URL"),
  },
  ai: {
    searchEnabled: true,
    fraudDetectionEnabled: true,
    roommateMatchingEnabled: true,
    duplicateDetectionEnabled: true,
    modelName: "gpt-4o-mini",
    maxTokens: 2048,
  },
  notifications: {
    emailTemplates: {
      welcome: "Welcome to {{platformName}}!",
      payment_received: "Your payment of {{amount}} was received.",
      listing_approved: "Your listing {{title}} is now live.",
      enquiry_created: "New {{enquiryType}} enquiry on {{listingTitle}} from {{seekerName}}. Reference: {{enquiryId}}.",
    },
    smsTemplates: {
      otp: "Your HouseLink code is {{code}}",
      enquiry: "New enquiry on {{listing}}",
      enquiry_created: "New {{enquiryType}} enquiry on {{listingTitle}} from {{seekerName}}. Reference: {{enquiryId}}.",
    },
    whatsappTemplates: {
      enquiry: "Hi {{name}}, you have a new enquiry on {{listing}}.",
      new_enquiry_assigned: "New enquiry on {{listingTitle}} from {{seekerName}}.",
      new_enquiry_owner: "{{seekerName}} enquired about {{listingTitle}}. Your HouseLink agent will manage this lead.",
    },
  },
  enquiries: {
    requireManagedEnquiries: true,
    showPublicContactDetails: false,
    autoAssignAgents: true,
    assignmentStrategy: "ROUND_ROBIN",
    responseTimeTargetMinutes: 30,
    followUpReminderHours: 24,
    viewingWorkflowEnabled: true,
    bookingWorkflowEnabled: true,
    commissionRulesEnabled: true,
    notifyAdminOnNewEnquiry: true,
    notifyOwnerOnNewEnquiry: true,
    notifyAgentOnAssignment: true,
  },
  updatedAt: new Date().toISOString(),
};
