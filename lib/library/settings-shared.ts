import { defaultLibraryEmailTemplates, type LibraryEmailTemplate, type LibraryEmailTemplateKey } from "@/lib/library/email-templates";
import type { LibraryShippingZone } from "@/lib/library/shipping";

export type LibraryProductTypeTemplate = {
  productType: string;
  downloadLimit: number | null;
  downloadExpiryDays: number | null;
  watermarking: boolean;
  licenseKeys: boolean;
  trackStock: boolean;
  lowStockThreshold: number;
  defaultFormats: Array<"PDF" | "DIGITAL_BOOK" | "PRINTED_BOOK" | "TOOLKIT" | "COURSE">;
};

export type LibraryStoreSettings = {
  store: {
    name: string;
    tagline: string;
    supportEmail: string;
    currency: string;
    enabled: boolean;
  };
  checkout: {
    guestCheckout: boolean;
    requireAccountForDigital: boolean;
    requireTerms: boolean;
    termsUrl: string;
    privacyUrl: string;
    returnsUrl: string;
    orderPrefix: string;
    allowCoupons: boolean;
    minimumOrderAmount: number;
    notePlaceholder: string;
    bulkQuoteMinQty: number;
  };
  tax: {
    defaultCountry: string;
    pricesIncludeTax: boolean;
    displayTaxBreakdown: boolean;
    taxLabel: string;
  };
  delivery: {
    enablePrintedShipping: boolean;
    defaultCountry: string;
    defaultCourier: string;
    flatRate: number;
    freeShippingMin: number | null;
    estimatedDaysMin: number;
    estimatedDaysMax: number;
    packingSlipNote: string;
    dispatchNote: string;
    allowLocalPickup: boolean;
    pickupAddress: string;
    pickupInstructions: string;
    pickupPhone: string;
    zones: LibraryShippingZone[];
  };
  payments: {
    usePlatformDefaults: boolean;
    allowedMethodIds: string[];
    requireProof: boolean;
    instructions: string;
  };
  downloads: {
    defaultLimit: number | null;
    defaultExpiryDays: number | null;
    tokenTtlSeconds: number;
    enforceWatermarkFlag: boolean;
    watermarkByDefault: boolean;
    stampPdfBytes: boolean;
    maxConcurrentDownloads: number;
  };
  licence: {
    generateByDefault: boolean;
    keyPrefix: string;
    termsUrl: string;
    licenceText: string;
    showOnDownload: boolean;
  };
  reviews: {
    enabled: boolean;
    requirePurchase: boolean;
    autoApprove: boolean;
    minRating: number;
    allowGuestNames: boolean;
  };
  seo: {
    storeTitle: string;
    storeDescription: string;
    storeOgImage: string;
    focusKeyword: string;
    robotsIndex: boolean;
  };
  merchandising: {
    heroHeadline: string;
    heroSubcopy: string;
    ctaLabel: string;
    ctaHref: string;
    showCuratedRail: boolean;
    curatedTitle: string;
    defaultSort: "newest" | "best-selling" | "downloads" | "rating" | "price-asc" | "price-desc";
    hidePricesUntilLogin: boolean;
    featuredCollectionSlug: string;
    maxHeroItems: number;
    maxCuratedItems: number;
  };
  productTemplates: LibraryProductTypeTemplate[];
  emails: {
    templates: Record<LibraryEmailTemplateKey, LibraryEmailTemplate>;
  };
  claims: {
    enabled: boolean;
    expiryDays: number;
    requireAdminApproval: boolean;
  };
  preview: {
    enabled: boolean;
    maxSamplePages: number;
    watermarkSamples: boolean;
    requireLogin: boolean;
  };
  inventory: {
    trackStockByDefault: boolean;
    lowStockThreshold: number;
    hideOutOfStock: boolean;
    allowBackorder: boolean;
  };
  notifications: {
    orderConfirmation: boolean;
    downloadReady: boolean;
    reviewRequest: boolean;
    lowStockAlert: boolean;
    abandonedCart: boolean;
    fromName: string;
  };
  salesFunnels: {
    enabled: boolean;
    defaultTimezone: string;
    funnels: LibrarySalesFunnelConfig[];
  };
};

export type LibrarySalesFunnelOffer = {
  id: string;
  status: "DRAFT" | "SCHEDULED" | "ACTIVE" | "PAUSED" | "EXPIRED";
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  countdown: boolean;
  urgencyMessage: string;
  formatPrices: Array<{
    formatType: "PDF" | "DIGITAL_BOOK" | "PRINTED_BOOK";
    normalPrice: number;
    offerPrice: number;
  }>;
};

export type LibrarySalesFunnelConfig = {
  id: string;
  slug: string;
  productSlug: string;
  template: "BOOK_SALES" | "GUIDE_SALES" | "SIMPLE_OFFER";
  status: "DRAFT" | "PUBLISHED" | "PAUSED";
  version: number;
  headline: string;
  subheadline: string;
  label: string;
  primaryCta: string;
  secondaryCta: string;
  whatsappUrl: string;
  heroImageUrl: string;
  problemTitle: string;
  problemPoints: string[];
  audienceTitle: string;
  audience: string[];
  learningTitle: string;
  learning: Array<{ title: string; description: string }>;
  delayTitle: string;
  delayPoints: string[];
  trust: string[];
  faq: Array<{ question: string; answer: string }>;
  disclaimer: string;
  finalTitle: string;
  offer: LibrarySalesFunnelOffer;
  abTest?: {
    id: string;
    status: "DRAFT" | "RUNNING" | "PAUSED" | "COMPLETE";
    variants: Array<{ id: string; name: string; weight: number; headline?: string; primaryCta?: string }>;
  };
};

const defaultZones: LibraryShippingZone[] = [
  {
    id: "harare",
    name: "Harare metro",
    countries: ["ZW", "Zimbabwe"],
    provinces: ["Harare"],
    cities: ["Harare", "Chitungwiza", "Epworth", "Norton"],
    rate: 3,
    freeShippingMin: 80,
    estimatedDaysMin: 1,
    estimatedDaysMax: 3,
    courier: "Harare courier",
    allowLocalPickup: true,
    active: true,
    priority: 10,
  },
  {
    id: "zimbabwe",
    name: "Rest of Zimbabwe",
    countries: ["ZW", "Zimbabwe"],
    provinces: [],
    cities: [],
    rate: 8,
    freeShippingMin: 120,
    estimatedDaysMin: 3,
    estimatedDaysMax: 7,
    courier: "Nationwide courier",
    allowLocalPickup: false,
    active: true,
    priority: 20,
  },
  {
    id: "international",
    name: "International",
    countries: [],
    provinces: [],
    cities: [],
    rate: 35,
    freeShippingMin: null,
    estimatedDaysMin: 7,
    estimatedDaysMax: 21,
    courier: "International courier",
    allowLocalPickup: false,
    active: true,
    priority: 90,
  },
];

const defaultProductTemplates: LibraryProductTypeTemplate[] = [
  { productType: "PDF", downloadLimit: null, downloadExpiryDays: null, watermarking: true, licenseKeys: false, trackStock: false, lowStockThreshold: 0, defaultFormats: ["PDF"] },
  { productType: "DIGITAL_BOOK", downloadLimit: 5, downloadExpiryDays: 365, watermarking: true, licenseKeys: true, trackStock: false, lowStockThreshold: 0, defaultFormats: ["DIGITAL_BOOK"] },
  { productType: "PRINTED_BOOK", downloadLimit: null, downloadExpiryDays: null, watermarking: false, licenseKeys: false, trackStock: true, lowStockThreshold: 5, defaultFormats: ["PRINTED_BOOK"] },
  { productType: "BUNDLE", downloadLimit: null, downloadExpiryDays: null, watermarking: false, licenseKeys: false, trackStock: false, lowStockThreshold: 0, defaultFormats: ["PDF", "PRINTED_BOOK"] },
  { productType: "TOOLKIT", downloadLimit: 10, downloadExpiryDays: null, watermarking: true, licenseKeys: true, trackStock: false, lowStockThreshold: 0, defaultFormats: ["TOOLKIT", "PDF"] },
  { productType: "COURSE", downloadLimit: null, downloadExpiryDays: 365, watermarking: false, licenseKeys: true, trackStock: false, lowStockThreshold: 0, defaultFormats: ["COURSE"] },
];

export const defaultLibraryStoreSettings: LibraryStoreSettings = {
  store: {
    name: "HouseLink Library",
    tagline: "Books, manuals, templates, and digital property tools for Zimbabwe.",
    supportEmail: "library@houselink.co.zw",
    currency: "USD",
    enabled: true,
  },
  checkout: {
    guestCheckout: true,
    requireAccountForDigital: true,
    requireTerms: false,
    termsUrl: "/terms",
    privacyUrl: "/privacy",
    returnsUrl: "/returns",
    orderPrefix: "HL-LIB",
    allowCoupons: true,
    minimumOrderAmount: 0,
    notePlaceholder: "Add a note for this order (optional)",
    bulkQuoteMinQty: 20,
  },
  tax: {
    defaultCountry: "ZW",
    pricesIncludeTax: false,
    displayTaxBreakdown: true,
    taxLabel: "VAT",
  },
  delivery: {
    enablePrintedShipping: true,
    defaultCountry: "Zimbabwe",
    defaultCourier: "Local courier",
    flatRate: 8,
    freeShippingMin: 120,
    estimatedDaysMin: 3,
    estimatedDaysMax: 7,
    packingSlipNote: "Thank you for buying from HouseLink Library.",
    dispatchNote: "Handle with care. Printed Library order.",
    allowLocalPickup: true,
    pickupAddress: "",
    pickupInstructions: "Bring your order number and a valid ID. We will confirm readiness by email or WhatsApp after payment.",
    pickupPhone: "",
    zones: defaultZones,
  },
  payments: {
    usePlatformDefaults: true,
    allowedMethodIds: ["bank_transfer", "zipit", "ecocash"],
    requireProof: true,
    instructions: "Pay using one of the enabled Library methods, then upload proof if required.",
  },
  downloads: {
    defaultLimit: null,
    defaultExpiryDays: null,
    tokenTtlSeconds: 60 * 15,
    enforceWatermarkFlag: true,
    watermarkByDefault: true,
    stampPdfBytes: true,
    maxConcurrentDownloads: 3,
  },
  licence: {
    generateByDefault: false,
    keyPrefix: "HL",
    termsUrl: "/legal/licence",
    licenceText: "Personal licence for the purchasing account. Redistribution is not permitted.",
    showOnDownload: true,
  },
  reviews: {
    enabled: true,
    requirePurchase: false,
    autoApprove: false,
    minRating: 1,
    allowGuestNames: true,
  },
  seo: {
    storeTitle: "HouseLink Library | Property Books, Manuals & Contracts Zimbabwe",
    storeDescription:
      "Buy property books, training manuals, contracts, forms, templates and digital toolkits for Zimbabwe real estate agents, developers and property professionals.",
    storeOgImage: "/images/library/library-hero-books.png",
    focusKeyword: "property books Zimbabwe",
    robotsIndex: true,
  },
  merchandising: {
    heroHeadline: "Everything Property Professionals Need.",
    heroSubcopy: "Books, manuals, contracts, forms and toolkits built for Zimbabwe's property industry.",
    ctaLabel: "Browse the catalogue",
    ctaHref: "#library-products",
    showCuratedRail: true,
    curatedTitle: "Editor picks",
    defaultSort: "newest",
    hidePricesUntilLogin: false,
    featuredCollectionSlug: "",
    maxHeroItems: 4,
    maxCuratedItems: 6,
  },
  productTemplates: defaultProductTemplates,
  emails: {
    templates: defaultLibraryEmailTemplates,
  },
  claims: {
    enabled: true,
    expiryDays: 14,
    requireAdminApproval: false,
  },
  preview: {
    enabled: true,
    maxSamplePages: 5,
    watermarkSamples: true,
    requireLogin: false,
  },
  inventory: {
    trackStockByDefault: true,
    lowStockThreshold: 5,
    hideOutOfStock: false,
    allowBackorder: false,
  },
  notifications: {
    orderConfirmation: true,
    downloadReady: true,
    reviewRequest: false,
    lowStockAlert: true,
    abandonedCart: true,
    fromName: "HouseLink Library",
  },
  salesFunnels: {
    enabled: true,
    defaultTimezone: "Africa/Harare",
    funnels: [
      {
        id: "property-development-law",
        slug: "property-development-law",
        productSlug: "the-complete-guide-to-property-development-and-property-law-in-zimbabwe",
        template: "GUIDE_SALES",
        status: "PUBLISHED",
        version: 1,
        label: "Property Development in Zimbabwe",
        headline: "Quick: get the Zimbabwe property guide before your project gets expensive.",
        subheadline:
          "A focused property development and property law guide for buyers, builders, investors, and developers who want fewer costly surprises before they move.",
        primaryCta: "Yes, I want this offer now",
        secondaryCta: "Preview the sample",
        whatsappUrl: "https://wa.me/263",
        heroImageUrl: "",
        problemTitle: "One missed check can cost more than the guide.",
        problemPoints: ["Buying land without checks", "Missing council approvals", "Underestimating compliance", "Poor subdivision planning", "Unclear professional roles", "Weak contractor decisions", "Legal blind spots", "Costly project delays"],
        audienceTitle: "Get this before you move from interest to action.",
        audience: [
          "You want to buy land and need to know what to check first",
          "You want to build and avoid approval or compliance surprises",
          "You are planning a small development project",
          "You are considering subdivision or land development",
          "You want to invest in property with more confidence",
          "You work in real estate or construction and need a clearer roadmap",
          "You want property law explained in practical language",
          "You want one guide you can return to before each major decision",
        ],
        learningTitle: "Here is what you get when you order now",
        learning: [
          { title: "Development roadmap", description: "How a project moves from idea, land, approvals, construction, compliance, and completion." },
          { title: "Land due diligence", description: "What to investigate before you commit to land or development money." },
          { title: "Approvals and council processes", description: "Planning, building plans, permissions, and the approvals that can affect your timeline." },
          { title: "Construction decisions", description: "Key professional, contractor, inspection, and site-management considerations." },
          { title: "Compliance and occupancy", description: "Why compliance matters before occupation, resale, renting, or further development." },
          { title: "Subdivision and legal issues", description: "Practical considerations around subdivision, land development, ownership, and property law." },
        ],
        delayTitle: "Do not wait until the mistake is already expensive.",
        delayPoints: ["Land checks", "Approval risk", "Professional team", "Construction control", "Compliance", "Legal position", "Budget pressure", "Timeline delays", "Exit options"],
        trust: ["Zimbabwe-focused property guide", "HouseLink Library checkout", "Secure payment flow", "Invoice or receipt provided", "Digital access after successful payment", "Printed edition availability"],
        faq: [
          { question: "Is there a digital version?", answer: "Yes. Choose the digital edition for Library account access after payment is confirmed." },
          { question: "Is there a printed version?", answer: "Yes. Choose the printed edition if stock and fulfilment are available in the existing Library checkout." },
          { question: "How do I receive the digital book?", answer: "After successful payment confirmation, access is handled through your HouseLink Library account." },
          { question: "Will I receive an invoice?", answer: "Yes. HouseLink Library checkout creates an order record and invoice/receipt trail." },
          { question: "Is this legal advice?", answer: "No. It is educational information and does not replace advice from qualified professionals." },
        ],
        disclaimer:
          "This guide is educational information. It does not replace current advice from qualified lawyers, planners, architects, engineers, valuers, or other specialists.",
        finalTitle: "Make the next property move with a clearer roadmap.",
        offer: {
          id: "pilot-launch-offer",
          status: "ACTIVE",
          title: "Launch offer",
          description: "Get the guide at the promotional launch price before the configured deadline.",
          startsAt: "2026-09-10T00:00:00+02:00",
          endsAt: "2026-12-31T23:59:59+02:00",
          timezone: "Africa/Harare",
          countdown: true,
          urgencyMessage: "The promotional price ends at the configured deadline, then normal Library pricing applies.",
          formatPrices: [
            { formatType: "PDF", normalPrice: 20, offerPrice: 15 },
            { formatType: "DIGITAL_BOOK", normalPrice: 20, offerPrice: 15 },
            { formatType: "PRINTED_BOOK", normalPrice: 35, offerPrice: 25 },
          ],
        },
      },
    ],
  },
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function str(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

/** Map previously shipped merchandising defaults to the current Library hero copy. */
function upgradeLegacyHeroCopy(value: string, legacyValue: string, nextDefault: string) {
  return value.trim() === legacyValue ? nextDefault : value;
}

function upgradeLegacyFunnelCopy(value: string, legacyValue: string, nextDefault: string) {
  return value.trim() === legacyValue ? nextDefault : value;
}

function sameStringList(left: string[], right: string[]) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function sameLearningList(left: LibrarySalesFunnelConfig["learning"], right: LibrarySalesFunnelConfig["learning"]) {
  return left.length === right.length && left.every((item, index) => item.title === right[index]?.title && item.description === right[index]?.description);
}

function bool(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function num(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nullableNum(value: unknown, fallback: number | null) {
  if (value === null || value === "") return null;
  if (value === undefined) return fallback;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function stringList(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function mergeZones(value: unknown): LibraryShippingZone[] {
  if (!Array.isArray(value) || !value.length) return defaultLibraryStoreSettings.delivery.zones;
  return value.map((raw, index) => {
    const row = asRecord(raw);
    return {
      id: str(row.id, `zone-${index + 1}`),
      name: str(row.name, `Zone ${index + 1}`),
      countries: stringList(row.countries),
      provinces: stringList(row.provinces),
      cities: stringList(row.cities),
      rate: Math.max(0, num(row.rate, 0)),
      freeShippingMin: nullableNum(row.freeShippingMin, null),
      estimatedDaysMin: Math.max(0, Math.round(num(row.estimatedDaysMin, 3))),
      estimatedDaysMax: Math.max(0, Math.round(num(row.estimatedDaysMax, 7))),
      courier: str(row.courier, "Courier"),
      allowLocalPickup: bool(row.allowLocalPickup, false),
      active: bool(row.active, true),
      priority: Math.round(num(row.priority, (index + 1) * 10)),
    };
  });
}

function mergeProductTemplates(value: unknown): LibraryProductTypeTemplate[] {
  if (!Array.isArray(value) || !value.length) return defaultLibraryStoreSettings.productTemplates;
  return value.map((raw) => {
    const row = asRecord(raw);
    return {
      productType: str(row.productType, "PDF").toUpperCase(),
      downloadLimit: nullableNum(row.downloadLimit, null),
      downloadExpiryDays: nullableNum(row.downloadExpiryDays, null),
      watermarking: bool(row.watermarking, true),
      licenseKeys: bool(row.licenseKeys, false),
      trackStock: bool(row.trackStock, false),
      lowStockThreshold: Math.max(0, Math.round(num(row.lowStockThreshold, 0))),
      defaultFormats: (Array.isArray(row.defaultFormats) ? row.defaultFormats.map(String) : ["PDF"]) as LibraryProductTypeTemplate["defaultFormats"],
    };
  });
}

function mergeEmailTemplates(value: unknown): Record<LibraryEmailTemplateKey, LibraryEmailTemplate> {
  const raw = asRecord(value);
  const keys = Object.keys(defaultLibraryEmailTemplates) as LibraryEmailTemplateKey[];
  return Object.fromEntries(
    keys.map((key) => {
      const row = asRecord(raw[key]);
      const fallback = defaultLibraryEmailTemplates[key];
      let subject = str(row.subject, fallback.subject);
      let body = str(row.body, fallback.body);
      // Refresh legacy saved templates that predate newer checkout / digest copy.
      if (key === "orderConfirmation" && (!body.includes("{{paymentUrl}}") || !body.includes("{{paymentReference}}"))) {
        subject = fallback.subject;
        body = fallback.body;
      }
      if (key === "abandonedCart" && !/set a password/i.test(body)) {
        subject = fallback.subject;
        body = fallback.body;
      }
      if (key === "lowStockAlert" && !body.includes("{{opsWhatsappUrl}}")) {
        subject = fallback.subject;
        body = fallback.body;
      }
      if (key === "weeklyDigest" && (!row.subject || !row.body || !body.includes("{{pendingProofs}}"))) {
        subject = fallback.subject;
        body = fallback.body;
      }
      return [key, { subject, body }];
    }),
  ) as Record<LibraryEmailTemplateKey, LibraryEmailTemplate>;
}

function mergeSalesFunnels(value: unknown): LibraryStoreSettings["salesFunnels"] {
  const raw = asRecord(value);
  const fallback = defaultLibraryStoreSettings.salesFunnels;
  const funnels = Array.isArray(raw.funnels) ? raw.funnels.map(mergeSalesFunnel).filter(Boolean) as LibrarySalesFunnelConfig[] : fallback.funnels;
  return {
    enabled: bool(raw.enabled, fallback.enabled),
    defaultTimezone: str(raw.defaultTimezone, fallback.defaultTimezone),
    funnels: funnels.length ? funnels : fallback.funnels,
  };
}

function mergeSalesFunnel(value: unknown): LibrarySalesFunnelConfig | null {
  const row = asRecord(value);
  const id = str(row.id, str(row.slug, "")).trim();
  const slug = str(row.slug, id).trim();
  const productSlug = str(row.productSlug, "").trim();
  if (!id || !slug || !productSlug) return null;
  const fallback = defaultLibraryStoreSettings.salesFunnels.funnels.find((item) => item.id === id || item.slug === slug) ?? defaultLibraryStoreSettings.salesFunnels.funnels[0];
  const offer = asRecord(row.offer);
  const fallbackOffer = fallback.offer;
  const status = str(row.status, fallback.status).toUpperCase();
  const template = str(row.template, fallback.template).toUpperCase();
  const legacyHeadline = "Before you buy land, build or develop - know what you're getting into.";
  const legacySubheadline = "A practical Zimbabwe-focused guide covering property development, land due diligence, approvals, construction, compliance, subdivisions and property law.";
  const legacyPrimaryCta = "Get the book now";
  const legacySecondaryCta = "Read a free sample";
  const legacyProblemTitle = "Property development involves more than buying land and starting to build.";
  const legacyAudienceTitle = "This guide is for you if...";
  const legacyLearningTitle = "What you will learn";
  const legacyDelayTitle = "Before you put serious money into property development...";
  const legacyFinalTitle = "Before you make your next property move, be prepared.";
  const legacyOfferTitle = "Special offer";
  const legacyOfferDescription = "Get the guide at the current promotional price before the configured deadline.";
  const legacyUrgencyMessage = "The promotional price ends at the configured deadline, then the normal price appears.";
  const problemPoints = stringList(row.problemPoints);
  const audience = stringList(row.audience);
  const delayPoints = stringList(row.delayPoints);
  const trust = stringList(row.trust);
  const learning = mergeLearningList(row.learning, fallback.learning);
  const legacyProblemPoints = ["Land", "Due diligence", "Planning", "Approvals", "Construction", "Compliance", "Subdivision", "Property law"];
  const legacyAudience = [
    "You want to buy land for development",
    "You want to build property",
    "You are planning a development project",
    "You are considering subdivision",
    "You want to invest in property",
    "You work in real estate",
    "You work in construction",
    "You want to understand property law",
  ];
  const legacyDelayPoints = ["Land", "Planning", "Approvals", "Construction", "Professionals", "Compliance", "Legal considerations", "Capital", "Time"];
  const legacyTrust = ["HouseLink Library", "Secure checkout", "Invoice or receipt provided", "Digital access after successful payment", "Printed edition availability", "Customer support"];
  const legacyLearning = [
    { title: "Property Development", description: "From concept to completion." },
    { title: "Land & Due Diligence", description: "What to investigate before committing." },
    { title: "Council Approvals", description: "Planning, building plans and approvals." },
    { title: "Construction", description: "Key construction and inspection considerations." },
    { title: "Compliance", description: "Building compliance and occupancy." },
    { title: "Subdivision", description: "Land development and subdivision considerations." },
  ];
  return {
    id,
    slug,
    productSlug,
    template: (["BOOK_SALES", "GUIDE_SALES", "SIMPLE_OFFER"].includes(template) ? template : fallback.template) as LibrarySalesFunnelConfig["template"],
    status: (["DRAFT", "PUBLISHED", "PAUSED"].includes(status) ? status : fallback.status) as LibrarySalesFunnelConfig["status"],
    version: Math.max(1, Math.round(num(row.version, fallback.version))),
    label: str(row.label, fallback.label),
    headline: upgradeLegacyFunnelCopy(str(row.headline, fallback.headline), legacyHeadline, fallback.headline),
    subheadline: upgradeLegacyFunnelCopy(str(row.subheadline, fallback.subheadline), legacySubheadline, fallback.subheadline),
    primaryCta: upgradeLegacyFunnelCopy(str(row.primaryCta, fallback.primaryCta), legacyPrimaryCta, fallback.primaryCta),
    secondaryCta: upgradeLegacyFunnelCopy(str(row.secondaryCta, fallback.secondaryCta), legacySecondaryCta, fallback.secondaryCta),
    whatsappUrl: str(row.whatsappUrl, fallback.whatsappUrl),
    heroImageUrl: str(row.heroImageUrl, fallback.heroImageUrl),
    problemTitle: upgradeLegacyFunnelCopy(str(row.problemTitle, fallback.problemTitle), legacyProblemTitle, fallback.problemTitle),
    problemPoints: problemPoints.length ? (sameStringList(problemPoints, legacyProblemPoints) ? fallback.problemPoints : problemPoints) : fallback.problemPoints,
    audienceTitle: upgradeLegacyFunnelCopy(str(row.audienceTitle, fallback.audienceTitle), legacyAudienceTitle, fallback.audienceTitle),
    audience: audience.length ? (sameStringList(audience, legacyAudience) ? fallback.audience : audience) : fallback.audience,
    learningTitle: upgradeLegacyFunnelCopy(str(row.learningTitle, fallback.learningTitle), legacyLearningTitle, fallback.learningTitle),
    learning: sameLearningList(learning, legacyLearning) ? fallback.learning : learning,
    delayTitle: upgradeLegacyFunnelCopy(str(row.delayTitle, fallback.delayTitle), legacyDelayTitle, fallback.delayTitle),
    delayPoints: delayPoints.length ? (sameStringList(delayPoints, legacyDelayPoints) ? fallback.delayPoints : delayPoints) : fallback.delayPoints,
    trust: trust.length ? (sameStringList(trust, legacyTrust) ? fallback.trust : trust) : fallback.trust,
    faq: mergeFaqList(row.faq, fallback.faq),
    disclaimer: str(row.disclaimer, fallback.disclaimer),
    finalTitle: upgradeLegacyFunnelCopy(str(row.finalTitle, fallback.finalTitle), legacyFinalTitle, fallback.finalTitle),
    offer: {
      id: str(offer.id, fallbackOffer.id),
      status: (["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "EXPIRED"].includes(str(offer.status, fallbackOffer.status).toUpperCase())
        ? str(offer.status, fallbackOffer.status).toUpperCase()
        : fallbackOffer.status) as LibrarySalesFunnelOffer["status"],
      title: upgradeLegacyFunnelCopy(str(offer.title, fallbackOffer.title), legacyOfferTitle, fallbackOffer.title),
      description: upgradeLegacyFunnelCopy(str(offer.description, fallbackOffer.description), legacyOfferDescription, fallbackOffer.description),
      startsAt: str(offer.startsAt, fallbackOffer.startsAt),
      endsAt: str(offer.endsAt, fallbackOffer.endsAt),
      timezone: str(offer.timezone, fallbackOffer.timezone),
      countdown: bool(offer.countdown, fallbackOffer.countdown),
      urgencyMessage: upgradeLegacyFunnelCopy(str(offer.urgencyMessage, fallbackOffer.urgencyMessage), legacyUrgencyMessage, fallbackOffer.urgencyMessage),
      formatPrices: mergeOfferPrices(offer.formatPrices, fallbackOffer.formatPrices),
    },
    abTest: mergeAbTest(row.abTest),
  };
}

function mergeLearningList(value: unknown, fallback: LibrarySalesFunnelConfig["learning"]) {
  if (!Array.isArray(value) || !value.length) return fallback;
  return value.map((item) => {
    const row = asRecord(item);
    return { title: str(row.title, "").trim(), description: str(row.description, "").trim() };
  }).filter((item) => item.title || item.description);
}

function mergeFaqList(value: unknown, fallback: LibrarySalesFunnelConfig["faq"]) {
  if (!Array.isArray(value) || !value.length) return fallback;
  return value.map((item) => {
    const row = asRecord(item);
    return { question: str(row.question, "").trim(), answer: str(row.answer, "").trim() };
  }).filter((item) => item.question && item.answer);
}

function mergeOfferPrices(value: unknown, fallback: LibrarySalesFunnelOffer["formatPrices"]) {
  if (!Array.isArray(value) || !value.length) return fallback;
  return value.map((item) => {
    const row = asRecord(item);
    const formatType = str(row.formatType, "PDF").toUpperCase();
    if (!["PDF", "DIGITAL_BOOK", "PRINTED_BOOK"].includes(formatType)) return null;
    return {
      formatType: formatType as LibrarySalesFunnelOffer["formatPrices"][number]["formatType"],
      normalPrice: Math.max(0, num(row.normalPrice, 0)),
      offerPrice: Math.max(0, num(row.offerPrice, 0)),
    };
  }).filter(Boolean) as LibrarySalesFunnelOffer["formatPrices"];
}

function mergeAbTest(value: unknown): LibrarySalesFunnelConfig["abTest"] | undefined {
  const row = asRecord(value);
  const id = str(row.id, "").trim();
  if (!id) return undefined;
  const status = str(row.status, "DRAFT").toUpperCase();
  const variants = Array.isArray(row.variants)
    ? row.variants.map((item) => {
        const variant = asRecord(item);
        const variantId = str(variant.id, "").trim();
        if (!variantId) return null;
        return {
          id: variantId,
          name: str(variant.name, variantId),
          weight: Math.max(0, num(variant.weight, 1)),
          headline: str(variant.headline, "").trim() || undefined,
          primaryCta: str(variant.primaryCta, "").trim() || undefined,
        };
      }).filter(Boolean) as NonNullable<LibrarySalesFunnelConfig["abTest"]>["variants"]
    : [];
  return {
    id,
    status: (["DRAFT", "RUNNING", "PAUSED", "COMPLETE"].includes(status) ? status : "DRAFT") as NonNullable<LibrarySalesFunnelConfig["abTest"]>["status"],
    variants,
  };
}

export function mergeLibraryStoreSettings(payload?: unknown): LibraryStoreSettings {
  const raw = asRecord(payload);
  const store = asRecord(raw.store);
  const checkout = asRecord(raw.checkout);
  const tax = asRecord(raw.tax);
  const delivery = asRecord(raw.delivery);
  const payments = asRecord(raw.payments);
  const downloads = asRecord(raw.downloads);
  const licence = asRecord(raw.licence);
  const reviews = asRecord(raw.reviews);
  const seo = asRecord(raw.seo);
  const merchandising = asRecord(raw.merchandising);
  const emails = asRecord(raw.emails);
  const claims = asRecord(raw.claims);
  const preview = asRecord(raw.preview);
  const inventory = asRecord(raw.inventory);
  const notifications = asRecord(raw.notifications);
  const salesFunnels = asRecord(raw.salesFunnels);
  const d = defaultLibraryStoreSettings;
  const sort = str(merchandising.defaultSort, d.merchandising.defaultSort);
  const allowedSort = ["newest", "best-selling", "downloads", "rating", "price-asc", "price-desc"] as const;

  return {
    store: {
      name: str(store.name, d.store.name),
      tagline: str(store.tagline, d.store.tagline),
      supportEmail: str(store.supportEmail, d.store.supportEmail),
      currency: str(store.currency, d.store.currency).toUpperCase() || d.store.currency,
      enabled: bool(store.enabled, d.store.enabled),
    },
    checkout: {
      guestCheckout: bool(checkout.guestCheckout, d.checkout.guestCheckout),
      requireAccountForDigital: bool(checkout.requireAccountForDigital, d.checkout.requireAccountForDigital),
      requireTerms: bool(checkout.requireTerms, d.checkout.requireTerms),
      termsUrl: str(checkout.termsUrl, d.checkout.termsUrl),
      privacyUrl: str(checkout.privacyUrl, d.checkout.privacyUrl),
      returnsUrl: str(checkout.returnsUrl, d.checkout.returnsUrl),
      orderPrefix: str(checkout.orderPrefix, d.checkout.orderPrefix).trim() || d.checkout.orderPrefix,
      allowCoupons: bool(checkout.allowCoupons, d.checkout.allowCoupons),
      minimumOrderAmount: Math.max(0, num(checkout.minimumOrderAmount, d.checkout.minimumOrderAmount)),
      notePlaceholder: str(checkout.notePlaceholder, d.checkout.notePlaceholder),
      bulkQuoteMinQty: Math.max(5, Math.round(num(checkout.bulkQuoteMinQty, d.checkout.bulkQuoteMinQty))),
    },
    tax: {
      defaultCountry: str(tax.defaultCountry, d.tax.defaultCountry).toUpperCase() || d.tax.defaultCountry,
      pricesIncludeTax: bool(tax.pricesIncludeTax, d.tax.pricesIncludeTax),
      displayTaxBreakdown: bool(tax.displayTaxBreakdown, d.tax.displayTaxBreakdown),
      taxLabel: str(tax.taxLabel, d.tax.taxLabel),
    },
    delivery: {
      enablePrintedShipping: bool(delivery.enablePrintedShipping, d.delivery.enablePrintedShipping),
      defaultCountry: str(delivery.defaultCountry, d.delivery.defaultCountry),
      defaultCourier: str(delivery.defaultCourier, d.delivery.defaultCourier),
      flatRate: Math.max(0, num(delivery.flatRate, d.delivery.flatRate)),
      freeShippingMin: nullableNum(delivery.freeShippingMin, d.delivery.freeShippingMin),
      estimatedDaysMin: Math.max(0, Math.round(num(delivery.estimatedDaysMin, d.delivery.estimatedDaysMin))),
      estimatedDaysMax: Math.max(0, Math.round(num(delivery.estimatedDaysMax, d.delivery.estimatedDaysMax))),
      packingSlipNote: str(delivery.packingSlipNote, d.delivery.packingSlipNote),
      dispatchNote: str(delivery.dispatchNote, d.delivery.dispatchNote),
      allowLocalPickup: bool(delivery.allowLocalPickup, d.delivery.allowLocalPickup),
      pickupAddress: str(delivery.pickupAddress, d.delivery.pickupAddress),
      pickupInstructions: str(delivery.pickupInstructions, d.delivery.pickupInstructions),
      pickupPhone: str(delivery.pickupPhone, d.delivery.pickupPhone),
      zones: mergeZones(delivery.zones),
    },
    payments: {
      usePlatformDefaults: bool(payments.usePlatformDefaults, d.payments.usePlatformDefaults),
      allowedMethodIds: stringList(payments.allowedMethodIds).length ? stringList(payments.allowedMethodIds) : d.payments.allowedMethodIds,
      requireProof: bool(payments.requireProof, d.payments.requireProof),
      instructions: str(payments.instructions, d.payments.instructions),
    },
    downloads: {
      defaultLimit: nullableNum(downloads.defaultLimit, d.downloads.defaultLimit),
      defaultExpiryDays: nullableNum(downloads.defaultExpiryDays, d.downloads.defaultExpiryDays),
      tokenTtlSeconds: Math.max(60, Math.round(num(downloads.tokenTtlSeconds, d.downloads.tokenTtlSeconds))),
      enforceWatermarkFlag: bool(downloads.enforceWatermarkFlag, d.downloads.enforceWatermarkFlag),
      watermarkByDefault: bool(downloads.watermarkByDefault, d.downloads.watermarkByDefault),
      stampPdfBytes: bool(downloads.stampPdfBytes, d.downloads.stampPdfBytes),
      maxConcurrentDownloads: Math.max(1, Math.round(num(downloads.maxConcurrentDownloads, d.downloads.maxConcurrentDownloads))),
    },
    licence: {
      generateByDefault: bool(licence.generateByDefault, d.licence.generateByDefault),
      keyPrefix: str(licence.keyPrefix, d.licence.keyPrefix).replace(/[^A-Za-z0-9_-]/g, "").toUpperCase() || d.licence.keyPrefix,
      termsUrl: str(licence.termsUrl, d.licence.termsUrl),
      licenceText: str(licence.licenceText, d.licence.licenceText),
      showOnDownload: bool(licence.showOnDownload, d.licence.showOnDownload),
    },
    reviews: {
      enabled: bool(reviews.enabled, d.reviews.enabled),
      requirePurchase: bool(reviews.requirePurchase, d.reviews.requirePurchase),
      autoApprove: bool(reviews.autoApprove, d.reviews.autoApprove),
      minRating: Math.min(5, Math.max(1, Math.round(num(reviews.minRating, d.reviews.minRating)))),
      allowGuestNames: bool(reviews.allowGuestNames, d.reviews.allowGuestNames),
    },
    seo: {
      storeTitle: str(seo.storeTitle, d.seo.storeTitle),
      storeDescription: str(seo.storeDescription, d.seo.storeDescription),
      storeOgImage: str(seo.storeOgImage, d.seo.storeOgImage),
      focusKeyword: str(seo.focusKeyword, d.seo.focusKeyword),
      robotsIndex: bool(seo.robotsIndex, d.seo.robotsIndex),
    },
    merchandising: {
      heroHeadline: upgradeLegacyHeroCopy(
        str(merchandising.heroHeadline, d.merchandising.heroHeadline),
        "Property knowledge, ready to buy",
        d.merchandising.heroHeadline,
      ),
      heroSubcopy: upgradeLegacyHeroCopy(
        str(merchandising.heroSubcopy, d.merchandising.heroSubcopy),
        "Books, manuals, contracts, forms, and toolkits built for Zimbabwe's property professionals.",
        d.merchandising.heroSubcopy,
      ),
      ctaLabel: str(merchandising.ctaLabel, d.merchandising.ctaLabel),
      ctaHref: str(merchandising.ctaHref, d.merchandising.ctaHref),
      showCuratedRail: bool(merchandising.showCuratedRail, d.merchandising.showCuratedRail),
      curatedTitle: str(merchandising.curatedTitle, d.merchandising.curatedTitle),
      defaultSort: (allowedSort.includes(sort as (typeof allowedSort)[number]) ? sort : d.merchandising.defaultSort) as LibraryStoreSettings["merchandising"]["defaultSort"],
      hidePricesUntilLogin: bool(merchandising.hidePricesUntilLogin, d.merchandising.hidePricesUntilLogin),
      featuredCollectionSlug: str(merchandising.featuredCollectionSlug, d.merchandising.featuredCollectionSlug),
      maxHeroItems: Math.max(1, Math.round(num(merchandising.maxHeroItems, d.merchandising.maxHeroItems))),
      maxCuratedItems: Math.max(1, Math.round(num(merchandising.maxCuratedItems, d.merchandising.maxCuratedItems))),
    },
    productTemplates: mergeProductTemplates(raw.productTemplates),
    emails: {
      templates: mergeEmailTemplates(emails.templates),
    },
    claims: {
      enabled: bool(claims.enabled, d.claims.enabled),
      expiryDays: Math.max(1, Math.round(num(claims.expiryDays, d.claims.expiryDays))),
      requireAdminApproval: bool(claims.requireAdminApproval, d.claims.requireAdminApproval),
    },
    preview: {
      enabled: bool(preview.enabled, d.preview.enabled),
      maxSamplePages: Math.max(1, Math.round(num(preview.maxSamplePages, d.preview.maxSamplePages))),
      watermarkSamples: bool(preview.watermarkSamples, d.preview.watermarkSamples),
      requireLogin: bool(preview.requireLogin, d.preview.requireLogin),
    },
    inventory: {
      trackStockByDefault: bool(inventory.trackStockByDefault, d.inventory.trackStockByDefault),
      lowStockThreshold: Math.max(0, Math.round(num(inventory.lowStockThreshold, d.inventory.lowStockThreshold))),
      hideOutOfStock: bool(inventory.hideOutOfStock, d.inventory.hideOutOfStock),
      allowBackorder: bool(inventory.allowBackorder, d.inventory.allowBackorder),
    },
    notifications: {
      orderConfirmation: bool(notifications.orderConfirmation, d.notifications.orderConfirmation),
      downloadReady: bool(notifications.downloadReady, d.notifications.downloadReady),
      reviewRequest: bool(notifications.reviewRequest, d.notifications.reviewRequest),
      lowStockAlert: bool(notifications.lowStockAlert, d.notifications.lowStockAlert),
      abandonedCart: bool(notifications.abandonedCart, d.notifications.abandonedCart),
      fromName: str(notifications.fromName, d.notifications.fromName),
    },
    salesFunnels: mergeSalesFunnels(salesFunnels),
  };
}

export function productTemplateForType(settings: LibraryStoreSettings, productType?: string | null) {
  const type = String(productType || "PDF").toUpperCase();
  return settings.productTemplates.find((row) => row.productType === type) ?? settings.productTemplates[0] ?? defaultProductTemplates[0];
}

export function publicLibraryStoreSettings(settings: LibraryStoreSettings) {
  return {
    store: settings.store,
    checkout: {
      guestCheckout: settings.checkout.guestCheckout,
      requireTerms: settings.checkout.requireTerms,
      termsUrl: settings.checkout.termsUrl,
      privacyUrl: settings.checkout.privacyUrl,
      returnsUrl: settings.checkout.returnsUrl,
      allowCoupons: settings.checkout.allowCoupons,
      minimumOrderAmount: settings.checkout.minimumOrderAmount,
      notePlaceholder: settings.checkout.notePlaceholder,
      bulkQuoteMinQty: settings.checkout.bulkQuoteMinQty,
    },
    tax: {
      defaultCountry: settings.tax.defaultCountry,
      displayTaxBreakdown: settings.tax.displayTaxBreakdown,
      taxLabel: settings.tax.taxLabel,
    },
    delivery: {
      enablePrintedShipping: settings.delivery.enablePrintedShipping,
      defaultCountry: settings.delivery.defaultCountry,
      flatRate: settings.delivery.flatRate,
      freeShippingMin: settings.delivery.freeShippingMin,
      estimatedDaysMin: settings.delivery.estimatedDaysMin,
      estimatedDaysMax: settings.delivery.estimatedDaysMax,
      allowLocalPickup: settings.delivery.allowLocalPickup,
      pickupAddress: settings.delivery.pickupAddress,
      pickupInstructions: settings.delivery.pickupInstructions,
      pickupPhone: settings.delivery.pickupPhone,
      zones: settings.delivery.zones.filter((zone) => zone.active).map((zone) => ({
        id: zone.id,
        name: zone.name,
        rate: zone.rate,
        freeShippingMin: zone.freeShippingMin,
        estimatedDaysMin: zone.estimatedDaysMin,
        estimatedDaysMax: zone.estimatedDaysMax,
        allowLocalPickup: zone.allowLocalPickup,
        countries: zone.countries,
        provinces: zone.provinces,
        cities: zone.cities,
      })),
    },
    payments: {
      allowedMethodIds: settings.payments.allowedMethodIds,
      usePlatformDefaults: settings.payments.usePlatformDefaults,
      requireProof: settings.payments.requireProof,
      instructions: settings.payments.instructions,
    },
    licence: {
      termsUrl: settings.licence.termsUrl,
      licenceText: settings.licence.licenceText,
    },
    reviews: {
      enabled: settings.reviews.enabled,
      requirePurchase: settings.reviews.requirePurchase,
      minRating: settings.reviews.minRating,
      autoApprove: settings.reviews.autoApprove,
      allowGuestNames: settings.reviews.allowGuestNames,
    },
    seo: settings.seo,
    merchandising: settings.merchandising,
    preview: {
      enabled: settings.preview.enabled,
      requireLogin: settings.preview.requireLogin,
    },
    claims: {
      enabled: settings.claims.enabled,
    },
  };
}
