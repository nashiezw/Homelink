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
    orderPrefix: string;
    allowCoupons: boolean;
    minimumOrderAmount: number;
    notePlaceholder: string;
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
    fromName: string;
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
    guestCheckout: false,
    requireAccountForDigital: true,
    requireTerms: false,
    termsUrl: "/legal/terms",
    privacyUrl: "/legal/privacy",
    orderPrefix: "HL-LIB",
    allowCoupons: true,
    minimumOrderAmount: 0,
    notePlaceholder: "Add a note for this order (optional)",
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
    requirePurchase: true,
    autoApprove: false,
    minRating: 1,
    allowGuestNames: false,
  },
  seo: {
    storeTitle: "HouseLink Library | Books, Manuals, Templates and Courses",
    storeDescription: "Browse professional property books, manuals, contracts, forms, templates, toolkits, and digital products from HouseLink Zimbabwe.",
    storeOgImage: "",
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
    fromName: "HouseLink Library",
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
      return [key, { subject: str(row.subject, fallback.subject), body: str(row.body, fallback.body) }];
    }),
  ) as Record<LibraryEmailTemplateKey, LibraryEmailTemplate>;
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
      orderPrefix: str(checkout.orderPrefix, d.checkout.orderPrefix).trim() || d.checkout.orderPrefix,
      allowCoupons: bool(checkout.allowCoupons, d.checkout.allowCoupons),
      minimumOrderAmount: Math.max(0, num(checkout.minimumOrderAmount, d.checkout.minimumOrderAmount)),
      notePlaceholder: str(checkout.notePlaceholder, d.checkout.notePlaceholder),
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
      fromName: str(notifications.fromName, d.notifications.fromName),
    },
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
      requireTerms: settings.checkout.requireTerms,
      termsUrl: settings.checkout.termsUrl,
      privacyUrl: settings.checkout.privacyUrl,
      allowCoupons: settings.checkout.allowCoupons,
      minimumOrderAmount: settings.checkout.minimumOrderAmount,
      notePlaceholder: settings.checkout.notePlaceholder,
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
