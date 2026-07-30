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
  };
  downloads: {
    defaultLimit: number | null;
    defaultExpiryDays: number | null;
    tokenTtlSeconds: number;
    enforceWatermarkFlag: boolean;
    watermarkByDefault: boolean;
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
    flatRate: 0,
    freeShippingMin: null,
    estimatedDaysMin: 3,
    estimatedDaysMax: 7,
    packingSlipNote: "Thank you for buying from HouseLink Library.",
    dispatchNote: "Handle with care. Printed Library order.",
  },
  downloads: {
    defaultLimit: null,
    defaultExpiryDays: null,
    tokenTtlSeconds: 60 * 15,
    enforceWatermarkFlag: true,
    watermarkByDefault: true,
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

export function mergeLibraryStoreSettings(payload?: unknown): LibraryStoreSettings {
  const raw = asRecord(payload);
  const store = asRecord(raw.store);
  const checkout = asRecord(raw.checkout);
  const tax = asRecord(raw.tax);
  const delivery = asRecord(raw.delivery);
  const downloads = asRecord(raw.downloads);
  const licence = asRecord(raw.licence);
  const reviews = asRecord(raw.reviews);
  const seo = asRecord(raw.seo);
  const claims = asRecord(raw.claims);
  const preview = asRecord(raw.preview);
  const inventory = asRecord(raw.inventory);
  const notifications = asRecord(raw.notifications);
  const d = defaultLibraryStoreSettings;

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
    },
    downloads: {
      defaultLimit: nullableNum(downloads.defaultLimit, d.downloads.defaultLimit),
      defaultExpiryDays: nullableNum(downloads.defaultExpiryDays, d.downloads.defaultExpiryDays),
      tokenTtlSeconds: Math.max(60, Math.round(num(downloads.tokenTtlSeconds, d.downloads.tokenTtlSeconds))),
      enforceWatermarkFlag: bool(downloads.enforceWatermarkFlag, d.downloads.enforceWatermarkFlag),
      watermarkByDefault: bool(downloads.watermarkByDefault, d.downloads.watermarkByDefault),
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
    preview: {
      enabled: settings.preview.enabled,
      requireLogin: settings.preview.requireLogin,
    },
    claims: {
      enabled: settings.claims.enabled,
    },
  };
}
