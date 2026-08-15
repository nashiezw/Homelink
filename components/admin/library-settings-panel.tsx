"use client";

import { CheckCircle2, History, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminDataTable, AdminStatusBadge } from "@/components/admin/ui/admin-ui";
import { MetricRow } from "@/components/admin/charts";
import { Button } from "@/components/ui/button";
import type { LibraryEmailTemplateKey } from "@/lib/library/email-templates";
import type { LibraryShippingZone } from "@/lib/library/shipping";
import {
  defaultLibraryStoreSettings,
  type LibraryProductTypeTemplate,
  type LibraryStoreSettings,
} from "@/lib/library/settings-shared";
import { cn } from "@/lib/utils";

type TaxRow = { id: string; name: string; country: string; rate: unknown; inclusive: boolean; active: boolean };
type HealthRow = { area: string; status: string; detail: string };
type SettingsAuditRow = {
  id: string;
  actorId: string | null;
  action: string;
  message: string;
  createdAt: string | Date;
};

const EMAIL_TEMPLATE_KEYS = Object.keys(defaultLibraryStoreSettings.emails.templates) as LibraryEmailTemplateKey[];

const EMAIL_TEMPLATE_LABELS: Record<LibraryEmailTemplateKey, string> = {
  orderConfirmation: "Order confirmation",
  abandonedCart: "Abandoned bag reminder",
  paymentReceived: "Payment received",
  downloadReady: "Download ready",
  dispatchUpdate: "Dispatch update",
  reviewRequest: "Review request",
  refundNotice: "Refund notice",
  guestClaim: "Guest claim",
  lowStockAlert: "Low stock alert",
  weeklyDigest: "Weekly Library digest",
  bulkQuoteReceived: "Bulk quote received",
};

const MERGE_TAG_HINT =
  "{{orderNumber}} {{customerName}} {{storeName}} {{currency}} {{total}} {{orderUrl}} {{fromName}} {{productTitle}} {{productUrl}} {{courier}} {{trackingNumber}} {{trackingUrl}} {{message}} {{licenceText}} {{extra}} {{reason}} {{email}} {{claimUrl}} {{expiryDays}}";

const SORT_OPTIONS: Array<LibraryStoreSettings["merchandising"]["defaultSort"]> = [
  "newest",
  "best-selling",
  "downloads",
  "rating",
  "price-asc",
  "price-desc",
];

const SECTIONS = [
  { id: "store", label: "Store" },
  { id: "checkout", label: "Checkout" },
  { id: "tax", label: "Tax" },
  { id: "delivery", label: "Delivery" },
  { id: "zones", label: "Zones" },
  { id: "payments", label: "Payments" },
  { id: "downloads", label: "Downloads" },
  { id: "licence", label: "Licence" },
  { id: "reviews", label: "Reviews" },
  { id: "seo", label: "SEO" },
  { id: "merchandising", label: "Merchandising" },
  { id: "templates", label: "Templates" },
  { id: "emails", label: "Emails" },
  { id: "preview", label: "Preview" },
  { id: "claims", label: "Claims" },
  { id: "inventory", label: "Inventory" },
  { id: "notifications", label: "Notifications" },
  { id: "audit", label: "Audit" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function parseCommaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinCommaList(values: string[]) {
  return values.join(", ");
}

function createZone(priority = 50): LibraryShippingZone {
  return {
    id: `zone-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: "New shipping zone",
    countries: [],
    provinces: [],
    cities: [],
    rate: 0,
    freeShippingMin: null,
    estimatedDaysMin: 3,
    estimatedDaysMax: 7,
    courier: "Courier",
    allowLocalPickup: false,
    active: true,
    priority,
  };
}

function createProductTemplate(): LibraryProductTypeTemplate {
  return {
    productType: "CUSTOM",
    downloadLimit: null,
    downloadExpiryDays: null,
    watermarking: true,
    licenseKeys: false,
    trackStock: false,
    lowStockThreshold: 0,
    defaultFormats: ["PDF"],
  };
}

function normalizeSettings(value?: LibraryStoreSettings | null): LibraryStoreSettings {
  if (!value) return structuredClone(defaultLibraryStoreSettings);
  return {
    ...defaultLibraryStoreSettings,
    ...value,
    store: { ...defaultLibraryStoreSettings.store, ...value.store },
    checkout: { ...defaultLibraryStoreSettings.checkout, ...value.checkout },
    tax: { ...defaultLibraryStoreSettings.tax, ...value.tax },
    delivery: {
      ...defaultLibraryStoreSettings.delivery,
      ...value.delivery,
      zones: value.delivery?.zones?.length ? value.delivery.zones : defaultLibraryStoreSettings.delivery.zones,
      allowLocalPickup: value.delivery?.allowLocalPickup ?? defaultLibraryStoreSettings.delivery.allowLocalPickup,
    },
    payments: { ...defaultLibraryStoreSettings.payments, ...value.payments },
    downloads: { ...defaultLibraryStoreSettings.downloads, ...value.downloads },
    licence: { ...defaultLibraryStoreSettings.licence, ...value.licence },
    reviews: { ...defaultLibraryStoreSettings.reviews, ...value.reviews },
    seo: { ...defaultLibraryStoreSettings.seo, ...value.seo },
    merchandising: { ...defaultLibraryStoreSettings.merchandising, ...value.merchandising },
    productTemplates: value.productTemplates?.length ? value.productTemplates : defaultLibraryStoreSettings.productTemplates,
    emails: {
      templates: {
        ...defaultLibraryStoreSettings.emails.templates,
        ...(value.emails?.templates ?? {}),
      },
    },
    claims: { ...defaultLibraryStoreSettings.claims, ...value.claims },
    preview: { ...defaultLibraryStoreSettings.preview, ...value.preview },
    inventory: { ...defaultLibraryStoreSettings.inventory, ...value.inventory },
    notifications: { ...defaultLibraryStoreSettings.notifications, ...value.notifications },
  };
}

export function LibrarySettingsPanel({
  settings,
  taxSettings,
  settingsHealth,
  settingsAudit,
  onSave,
  onEditTaxSetting,
  onDeleteTaxSetting,
  onAddTaxSetting,
}: {
  settings?: LibraryStoreSettings | null;
  taxSettings: TaxRow[];
  settingsHealth: HealthRow[];
  settingsAudit?: SettingsAuditRow[];
  onSave: (settings: LibraryStoreSettings) => Promise<unknown>;
  onEditTaxSetting: (tax?: TaxRow) => void;
  onDeleteTaxSetting: (id: string) => void | Promise<void>;
  onAddTaxSetting: () => void;
}) {
  const [draft, setDraft] = useState<LibraryStoreSettings>(() => normalizeSettings(settings));
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<SectionId>("store");

  useEffect(() => {
    setDraft(normalizeSettings(settings));
  }, [settings]);

  async function save() {
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  }

  function updateZones(zones: LibraryShippingZone[]) {
    setDraft({ ...draft, delivery: { ...draft.delivery, zones } });
  }

  function patchZone(id: string, patch: Partial<LibraryShippingZone>) {
    updateZones(draft.delivery.zones.map((zone) => (zone.id === id ? { ...zone, ...patch } : zone)));
  }

  function updateTemplate(index: number, patch: Partial<LibraryProductTypeTemplate>) {
    setDraft({
      ...draft,
      productTemplates: draft.productTemplates.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    });
  }

  function updateEmailTemplate(key: LibraryEmailTemplateKey, patch: Partial<{ subject: string; body: string }>) {
    setDraft({
      ...draft,
      emails: {
        templates: {
          ...draft.emails.templates,
          [key]: { ...draft.emails.templates[key], ...patch },
        },
      },
    });
  }

  const showAuditSide = Boolean(settingsAudit?.length);
  const auditRows = settingsAudit ?? [];

  return (
    <div className="grid gap-5">
      <AdminDataTable
        rows={settingsHealth.map((row) => ({ ...row, id: row.area }))}
        emptyMessage="Settings health appears after Library data loads."
        columns={[
          { key: "area", header: "Area", render: (row) => <span className="font-semibold text-white">{row.area}</span> },
          {
            key: "status",
            header: "Status",
            render: (row) => (
              <AdminStatusBadge
                status={row.status}
                variant={
                  ["READY", "CLEAR", "AUTO", "OPEN", "PER_PRODUCT"].includes(row.status)
                    ? "success"
                    : ["ATTENTION", "MODERATION", "NEEDS_SETUP", "NEEDS_FILES", "DISABLED"].includes(row.status)
                      ? "warning"
                      : "muted"
                }
              />
            ),
          },
          { key: "detail", header: "Detail", render: (row) => row.detail },
        ]}
      />

      <div className={cn(showAuditSide && "grid gap-5 xl:grid-cols-3")}>
        <section className={cn("rounded-xl border border-white/10 bg-slate-900/60 p-5", showAuditSide && "xl:col-span-2")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-white">Library store settings</h3>
              <p className="mt-1 text-sm text-slate-400">
                Storefront, checkout, tax, delivery zones, payments, downloads, emails, merchandising, and operational defaults — saved to the database and used end to end.
              </p>
            </div>
            <Button variant="primary" onClick={() => void save()} disabled={saving}>
              <CheckCircle2 className="size-4" /> {saving ? "Saving..." : "Save all settings"}
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {SECTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                  section === item.id
                    ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/5",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-6">
            {section === "store" && (
              <Section title="General store">
                <FormGrid>
                  <TextField label="Store name" value={draft.store.name} onChange={(name) => setDraft({ ...draft, store: { ...draft.store, name } })} />
                  <TextField label="Support email" value={draft.store.supportEmail} onChange={(supportEmail) => setDraft({ ...draft, store: { ...draft.store, supportEmail } })} />
                  <TextField label="Default currency" value={draft.store.currency} onChange={(currency) => setDraft({ ...draft, store: { ...draft.store, currency: currency.toUpperCase() } })} />
                  <TextField label="Tagline" value={draft.store.tagline} onChange={(tagline) => setDraft({ ...draft, store: { ...draft.store, tagline } })} className="sm:col-span-2" />
                </FormGrid>
                <ToggleRow label="Library store enabled" checked={draft.store.enabled} onChange={(enabled) => setDraft({ ...draft, store: { ...draft.store, enabled } })} />
              </Section>
            )}

            {section === "checkout" && (
              <Section title="Checkout">
                <FormGrid>
                  <TextField label="Order number prefix" value={draft.checkout.orderPrefix} onChange={(orderPrefix) => setDraft({ ...draft, checkout: { ...draft.checkout, orderPrefix } })} />
                  <TextField label="Minimum order amount" type="number" value={String(draft.checkout.minimumOrderAmount)} onChange={(value) => setDraft({ ...draft, checkout: { ...draft.checkout, minimumOrderAmount: Number(value) || 0 } })} />
                  <TextField label="Terms URL" value={draft.checkout.termsUrl} onChange={(termsUrl) => setDraft({ ...draft, checkout: { ...draft.checkout, termsUrl } })} />
                  <TextField label="Privacy URL" value={draft.checkout.privacyUrl} onChange={(privacyUrl) => setDraft({ ...draft, checkout: { ...draft.checkout, privacyUrl } })} />
                  <TextField label="Order note placeholder" value={draft.checkout.notePlaceholder} onChange={(notePlaceholder) => setDraft({ ...draft, checkout: { ...draft.checkout, notePlaceholder } })} className="sm:col-span-2" />
                </FormGrid>
                <div className="mt-3 grid gap-2">
                  <ToggleRow label="Require terms acceptance" checked={draft.checkout.requireTerms} onChange={(requireTerms) => setDraft({ ...draft, checkout: { ...draft.checkout, requireTerms } })} />
                  <ToggleRow label="Allow coupons at checkout" checked={draft.checkout.allowCoupons} onChange={(allowCoupons) => setDraft({ ...draft, checkout: { ...draft.checkout, allowCoupons } })} />
                  <ToggleRow label="Require account for digital products" checked={draft.checkout.requireAccountForDigital} onChange={(requireAccountForDigital) => setDraft({ ...draft, checkout: { ...draft.checkout, requireAccountForDigital } })} />
                  <ToggleRow label="Continue with email at checkout (light account, set password later)" checked={draft.checkout.guestCheckout} onChange={(guestCheckout) => setDraft({ ...draft, checkout: { ...draft.checkout, guestCheckout } })} />
                </div>
              </Section>
            )}

            {section === "tax" && (
              <Section title="Tax defaults">
                <FormGrid>
                  <TextField label="Default tax country" value={draft.tax.defaultCountry} onChange={(defaultCountry) => setDraft({ ...draft, tax: { ...draft.tax, defaultCountry: defaultCountry.toUpperCase() } })} />
                  <TextField label="Tax label" value={draft.tax.taxLabel} onChange={(taxLabel) => setDraft({ ...draft, tax: { ...draft.tax, taxLabel } })} />
                </FormGrid>
                <div className="mt-3 grid gap-2">
                  <ToggleRow label="Prices include tax by default" checked={draft.tax.pricesIncludeTax} onChange={(pricesIncludeTax) => setDraft({ ...draft, tax: { ...draft.tax, pricesIncludeTax } })} />
                  <ToggleRow label="Display tax breakdown at checkout" checked={draft.tax.displayTaxBreakdown} onChange={(displayTaxBreakdown) => setDraft({ ...draft, tax: { ...draft.tax, displayTaxBreakdown } })} />
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-400">Country tax rules used when quoting carts for the default (or shipping) country.</p>
                  <Button type="button" variant="secondary" onClick={onAddTaxSetting}>
                    Add tax rule
                  </Button>
                </div>
                <div className="mt-3">
                  <AdminDataTable
                    rows={taxSettings}
                    emptyMessage="No Library tax settings yet. Add a real tax setting when the store needs one."
                    columns={[
                      { key: "name", header: "Tax setting", render: (row) => <span className="font-semibold text-white">{row.name}</span> },
                      { key: "country", header: "Country", render: (row) => row.country },
                      { key: "rate", header: "Rate", render: (row) => `${Number(row.rate).toFixed(2)}%` },
                      {
                        key: "active",
                        header: "State",
                        render: (row) => <AdminStatusBadge status={row.active ? "ACTIVE" : "INACTIVE"} variant={row.active ? "success" : "muted"} />,
                      },
                      {
                        key: "actions",
                        header: "Actions",
                        render: (row) => (
                          <div className="flex gap-2">
                            <button type="button" className="text-xs font-semibold text-emerald-300 hover:underline" onClick={() => onEditTaxSetting(row)}>
                              Edit
                            </button>
                            <button type="button" className="text-xs font-semibold text-red-300 hover:underline" onClick={() => void onDeleteTaxSetting(row.id)}>
                              Delete
                            </button>
                          </div>
                        ),
                      },
                    ]}
                  />
                </div>
              </Section>
            )}

            {section === "delivery" && (
              <Section title="Printed delivery">
                <FormGrid>
                  <TextField label="Default country" value={draft.delivery.defaultCountry} onChange={(defaultCountry) => setDraft({ ...draft, delivery: { ...draft.delivery, defaultCountry } })} />
                  <TextField label="Default courier" value={draft.delivery.defaultCourier} onChange={(defaultCourier) => setDraft({ ...draft, delivery: { ...draft.delivery, defaultCourier } })} />
                  <TextField label="Flat shipping rate" type="number" value={String(draft.delivery.flatRate)} onChange={(value) => setDraft({ ...draft, delivery: { ...draft.delivery, flatRate: Number(value) || 0 } })} />
                  <TextField
                    label="Free shipping minimum (blank = never)"
                    value={draft.delivery.freeShippingMin == null ? "" : String(draft.delivery.freeShippingMin)}
                    onChange={(value) => setDraft({ ...draft, delivery: { ...draft.delivery, freeShippingMin: value.trim() === "" ? null : Number(value) || 0 } })}
                  />
                  <TextField label="Est. days min" type="number" value={String(draft.delivery.estimatedDaysMin)} onChange={(value) => setDraft({ ...draft, delivery: { ...draft.delivery, estimatedDaysMin: Number(value) || 0 } })} />
                  <TextField label="Est. days max" type="number" value={String(draft.delivery.estimatedDaysMax)} onChange={(value) => setDraft({ ...draft, delivery: { ...draft.delivery, estimatedDaysMax: Number(value) || 0 } })} />
                  <TextAreaField label="Packing slip note" value={draft.delivery.packingSlipNote} onChange={(packingSlipNote) => setDraft({ ...draft, delivery: { ...draft.delivery, packingSlipNote } })} className="sm:col-span-2" />
                  <TextAreaField label="Dispatch note" value={draft.delivery.dispatchNote} onChange={(dispatchNote) => setDraft({ ...draft, delivery: { ...draft.delivery, dispatchNote } })} className="sm:col-span-2" />
                </FormGrid>
                <div className="mt-3 grid gap-2">
                  <ToggleRow label="Enable printed book shipping" checked={draft.delivery.enablePrintedShipping} onChange={(enablePrintedShipping) => setDraft({ ...draft, delivery: { ...draft.delivery, enablePrintedShipping } })} />
                  <ToggleRow label="Allow local pickup" checked={draft.delivery.allowLocalPickup} onChange={(allowLocalPickup) => setDraft({ ...draft, delivery: { ...draft.delivery, allowLocalPickup } })} />
                </div>
                {draft.delivery.allowLocalPickup ? (
                  <div className="mt-4">
                    <FormGrid>
                      <TextAreaField
                        label="Pickup address (shown to customers)"
                        value={draft.delivery.pickupAddress}
                        onChange={(pickupAddress) => setDraft({ ...draft, delivery: { ...draft.delivery, pickupAddress } })}
                        className="sm:col-span-2"
                      />
                      <TextAreaField
                        label="Pickup instructions"
                        value={draft.delivery.pickupInstructions}
                        onChange={(pickupInstructions) => setDraft({ ...draft, delivery: { ...draft.delivery, pickupInstructions } })}
                        className="sm:col-span-2"
                      />
                      <TextField
                        label="Pickup contact phone (optional)"
                        value={draft.delivery.pickupPhone}
                        onChange={(pickupPhone) => setDraft({ ...draft, delivery: { ...draft.delivery, pickupPhone } })}
                      />
                    </FormGrid>
                  </div>
                ) : null}
                <div className="mt-6">
                  <ShippingZonesEditor
                    zones={draft.delivery.zones}
                    onAdd={() => updateZones([...draft.delivery.zones, createZone((draft.delivery.zones.length + 1) * 10)])}
                    onRemove={(id) => updateZones(draft.delivery.zones.filter((zone) => zone.id !== id))}
                    onPatch={patchZone}
                  />
                </div>
              </Section>
            )}

            {section === "zones" && (
              <Section title="Shipping zones">
                <p className="mb-4 text-sm text-slate-400">
                  Zones override the flat rate when a buyer address matches country, province, or city rules. Lower priority numbers win first.
                </p>
                <ShippingZonesEditor
                  zones={draft.delivery.zones}
                  onAdd={() => updateZones([...draft.delivery.zones, createZone((draft.delivery.zones.length + 1) * 10)])}
                  onRemove={(id) => updateZones(draft.delivery.zones.filter((zone) => zone.id !== id))}
                  onPatch={patchZone}
                />
              </Section>
            )}

            {section === "payments" && (
              <Section title="Library payments">
                <FormGrid>
                  <TextField
                    label="Allowed method IDs (comma-separated)"
                    value={joinCommaList(draft.payments.allowedMethodIds)}
                    onChange={(value) => setDraft({ ...draft, payments: { ...draft.payments, allowedMethodIds: parseCommaList(value) } })}
                    className="sm:col-span-2"
                  />
                  <TextAreaField
                    label="Payment instructions"
                    value={draft.payments.instructions}
                    onChange={(instructions) => setDraft({ ...draft, payments: { ...draft.payments, instructions } })}
                    className="sm:col-span-2"
                  />
                </FormGrid>
                <p className="mt-2 text-xs text-slate-500">Examples: bank_transfer, zipit, ecocash</p>
                <div className="mt-3 grid gap-2">
                  <ToggleRow label="Use platform payment defaults" checked={draft.payments.usePlatformDefaults} onChange={(usePlatformDefaults) => setDraft({ ...draft, payments: { ...draft.payments, usePlatformDefaults } })} />
                  <ToggleRow label="Require proof of payment" checked={draft.payments.requireProof} onChange={(requireProof) => setDraft({ ...draft, payments: { ...draft.payments, requireProof } })} />
                </div>
              </Section>
            )}

            {section === "downloads" && (
              <Section title="Digital downloads">
                <FormGrid>
                  <TextField
                    label="Default download limit (blank = unlimited)"
                    value={draft.downloads.defaultLimit == null ? "" : String(draft.downloads.defaultLimit)}
                    onChange={(value) => setDraft({ ...draft, downloads: { ...draft.downloads, defaultLimit: value.trim() === "" ? null : Number(value) || 0 } })}
                  />
                  <TextField
                    label="Default expiry days (blank = never)"
                    value={draft.downloads.defaultExpiryDays == null ? "" : String(draft.downloads.defaultExpiryDays)}
                    onChange={(value) => setDraft({ ...draft, downloads: { ...draft.downloads, defaultExpiryDays: value.trim() === "" ? null : Number(value) || 0 } })}
                  />
                  <TextField label="Secure token TTL (seconds)" type="number" value={String(draft.downloads.tokenTtlSeconds)} onChange={(value) => setDraft({ ...draft, downloads: { ...draft.downloads, tokenTtlSeconds: Number(value) || 900 } })} />
                  <TextField label="Max concurrent download sessions" type="number" value={String(draft.downloads.maxConcurrentDownloads)} onChange={(value) => setDraft({ ...draft, downloads: { ...draft.downloads, maxConcurrentDownloads: Number(value) || 1 } })} />
                </FormGrid>
                <div className="mt-3 grid gap-2">
                  <ToggleRow label="Enforce product watermark flag" checked={draft.downloads.enforceWatermarkFlag} onChange={(enforceWatermarkFlag) => setDraft({ ...draft, downloads: { ...draft.downloads, enforceWatermarkFlag } })} />
                  <ToggleRow label="Watermark by default for new products" checked={draft.downloads.watermarkByDefault} onChange={(watermarkByDefault) => setDraft({ ...draft, downloads: { ...draft.downloads, watermarkByDefault } })} />
                  <ToggleRow label="Stamp PDF bytes on download" checked={draft.downloads.stampPdfBytes} onChange={(stampPdfBytes) => setDraft({ ...draft, downloads: { ...draft.downloads, stampPdfBytes } })} />
                </div>
              </Section>
            )}

            {section === "licence" && (
              <Section title="Licence / DRM defaults">
                <FormGrid>
                  <TextField label="Licence key prefix" value={draft.licence.keyPrefix} onChange={(keyPrefix) => setDraft({ ...draft, licence: { ...draft.licence, keyPrefix } })} />
                  <TextField label="Licence terms URL" value={draft.licence.termsUrl} onChange={(termsUrl) => setDraft({ ...draft, licence: { ...draft.licence, termsUrl } })} />
                  <TextAreaField label="Licence text shown to buyers" value={draft.licence.licenceText} onChange={(licenceText) => setDraft({ ...draft, licence: { ...draft.licence, licenceText } })} className="sm:col-span-2" />
                </FormGrid>
                <div className="mt-3 grid gap-2">
                  <ToggleRow label="Generate licence keys by default" checked={draft.licence.generateByDefault} onChange={(generateByDefault) => setDraft({ ...draft, licence: { ...draft.licence, generateByDefault } })} />
                  <ToggleRow label="Show licence on download response" checked={draft.licence.showOnDownload} onChange={(showOnDownload) => setDraft({ ...draft, licence: { ...draft.licence, showOnDownload } })} />
                </div>
              </Section>
            )}

            {section === "reviews" && (
              <Section title="Reviews policy">
                <FormGrid>
                  <TextField label="Minimum star rating" type="number" value={String(draft.reviews.minRating)} onChange={(value) => setDraft({ ...draft, reviews: { ...draft.reviews, minRating: Number(value) || 1 } })} />
                </FormGrid>
                <div className="mt-3 grid gap-2">
                  <ToggleRow label="Reviews enabled" checked={draft.reviews.enabled} onChange={(enabled) => setDraft({ ...draft, reviews: { ...draft.reviews, enabled } })} />
                  <ToggleRow label="Require purchase before review" checked={draft.reviews.requirePurchase} onChange={(requirePurchase) => setDraft({ ...draft, reviews: { ...draft.reviews, requirePurchase } })} />
                  <ToggleRow label="Auto-approve reviews" checked={draft.reviews.autoApprove} onChange={(autoApprove) => setDraft({ ...draft, reviews: { ...draft.reviews, autoApprove } })} />
                  <ToggleRow label="Allow custom public display names on reviews" checked={draft.reviews.allowGuestNames} onChange={(allowGuestNames) => setDraft({ ...draft, reviews: { ...draft.reviews, allowGuestNames } })} />
                </div>
              </Section>
            )}

            {section === "seo" && (
              <Section title="Storefront SEO">
                <FormGrid>
                  <TextField label="Store title" value={draft.seo.storeTitle} onChange={(storeTitle) => setDraft({ ...draft, seo: { ...draft.seo, storeTitle } })} className="sm:col-span-2" />
                  <TextAreaField label="Meta description" value={draft.seo.storeDescription} onChange={(storeDescription) => setDraft({ ...draft, seo: { ...draft.seo, storeDescription } })} className="sm:col-span-2" />
                  <TextField label="Focus keyword" value={draft.seo.focusKeyword} onChange={(focusKeyword) => setDraft({ ...draft, seo: { ...draft.seo, focusKeyword } })} />
                  <TextField label="OG image URL" value={draft.seo.storeOgImage} onChange={(storeOgImage) => setDraft({ ...draft, seo: { ...draft.seo, storeOgImage } })} />
                </FormGrid>
                  <ToggleRow label="Allow search engines to index Library storefront and product pages" checked={draft.seo.robotsIndex} onChange={(robotsIndex) => setDraft({ ...draft, seo: { ...draft.seo, robotsIndex } })} />
                  <p className="mt-2 text-xs leading-5 text-slate-500">When off, Library pages are noindex and excluded from the sitemap. Checkout and claim pages stay private either way.</p>
              </Section>
            )}

            {section === "merchandising" && (
              <Section title="Storefront merchandising">
                <FormGrid>
                  <TextField label="Hero headline" value={draft.merchandising.heroHeadline} onChange={(heroHeadline) => setDraft({ ...draft, merchandising: { ...draft.merchandising, heroHeadline } })} className="sm:col-span-2" />
                  <TextAreaField label="Hero subcopy" value={draft.merchandising.heroSubcopy} onChange={(heroSubcopy) => setDraft({ ...draft, merchandising: { ...draft.merchandising, heroSubcopy } })} className="sm:col-span-2" />
                  <TextField label="CTA label" value={draft.merchandising.ctaLabel} onChange={(ctaLabel) => setDraft({ ...draft, merchandising: { ...draft.merchandising, ctaLabel } })} />
                  <TextField label="CTA href" value={draft.merchandising.ctaHref} onChange={(ctaHref) => setDraft({ ...draft, merchandising: { ...draft.merchandising, ctaHref } })} />
                  <TextField label="Curated rail title" value={draft.merchandising.curatedTitle} onChange={(curatedTitle) => setDraft({ ...draft, merchandising: { ...draft.merchandising, curatedTitle } })} />
                  <TextField label="Featured collection slug" value={draft.merchandising.featuredCollectionSlug} onChange={(featuredCollectionSlug) => setDraft({ ...draft, merchandising: { ...draft.merchandising, featuredCollectionSlug } })} />
                  <SelectField
                    label="Default catalogue sort"
                    value={draft.merchandising.defaultSort}
                    options={SORT_OPTIONS}
                    onChange={(defaultSort) =>
                      setDraft({
                        ...draft,
                        merchandising: {
                          ...draft.merchandising,
                          defaultSort: defaultSort as LibraryStoreSettings["merchandising"]["defaultSort"],
                        },
                      })
                    }
                  />
                  <TextField label="Max hero items" type="number" value={String(draft.merchandising.maxHeroItems)} onChange={(value) => setDraft({ ...draft, merchandising: { ...draft.merchandising, maxHeroItems: Number(value) || 1 } })} />
                  <TextField label="Max curated items" type="number" value={String(draft.merchandising.maxCuratedItems)} onChange={(value) => setDraft({ ...draft, merchandising: { ...draft.merchandising, maxCuratedItems: Number(value) || 1 } })} />
                </FormGrid>
                <div className="mt-3 grid gap-2">
                  <ToggleRow label="Show curated rail" checked={draft.merchandising.showCuratedRail} onChange={(showCuratedRail) => setDraft({ ...draft, merchandising: { ...draft.merchandising, showCuratedRail } })} />
                  <ToggleRow label="Hide prices until login" checked={draft.merchandising.hidePricesUntilLogin} onChange={(hidePricesUntilLogin) => setDraft({ ...draft, merchandising: { ...draft.merchandising, hidePricesUntilLogin } })} />
                </div>
              </Section>
            )}

            {section === "templates" && (
              <Section title="Product type templates">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-400">Defaults applied when creating products of each type (download limits, watermarking, licence keys, stock).</p>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setDraft({ ...draft, productTemplates: [...draft.productTemplates, createProductTemplate()] })}
                  >
                    <Plus className="size-4" /> Add template
                  </Button>
                </div>
                <div className="space-y-4">
                  {draft.productTemplates.map((row, index) => (
                    <div key={`${row.productType}-${index}`} className="rounded-lg border border-white/10 bg-slate-950/50 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white">{row.productType || `Template ${index + 1}`}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-red-300 hover:text-red-200"
                          onClick={() =>
                            setDraft({
                              ...draft,
                              productTemplates: draft.productTemplates.filter((_, rowIndex) => rowIndex !== index),
                            })
                          }
                        >
                          <Trash2 className="size-4" /> Remove
                        </Button>
                      </div>
                      <FormGrid>
                        <TextField label="Product type" value={row.productType} onChange={(productType) => updateTemplate(index, { productType: productType.toUpperCase() })} />
                        <TextField
                          label="Download limit (blank = unlimited)"
                          value={row.downloadLimit == null ? "" : String(row.downloadLimit)}
                          onChange={(value) => updateTemplate(index, { downloadLimit: value.trim() === "" ? null : Number(value) || 0 })}
                        />
                        <TextField
                          label="Download expiry days (blank = never)"
                          value={row.downloadExpiryDays == null ? "" : String(row.downloadExpiryDays)}
                          onChange={(value) => updateTemplate(index, { downloadExpiryDays: value.trim() === "" ? null : Number(value) || 0 })}
                        />
                        <TextField
                          label="Low stock threshold"
                          type="number"
                          value={String(row.lowStockThreshold)}
                          onChange={(value) => updateTemplate(index, { lowStockThreshold: Number(value) || 0 })}
                        />
                      </FormGrid>
                      <div className="mt-3 grid gap-2">
                        <ToggleRow label="Watermarking" checked={row.watermarking} onChange={(watermarking) => updateTemplate(index, { watermarking })} />
                        <ToggleRow label="Licence keys" checked={row.licenseKeys} onChange={(licenseKeys) => updateTemplate(index, { licenseKeys })} />
                        <ToggleRow label="Track stock" checked={row.trackStock} onChange={(trackStock) => updateTemplate(index, { trackStock })} />
                      </div>
                    </div>
                  ))}
                  {!draft.productTemplates.length && <p className="text-sm text-slate-500">No product templates yet. Add one to define download and stock defaults.</p>}
                </div>
              </Section>
            )}

            {section === "emails" && (
              <Section title="Transactional email templates">
                <p className="mb-2 text-sm text-slate-400">Edit subject and body for each Library email. Merge tags are replaced at send time.</p>
                <p className="mb-5 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-xs leading-5 text-slate-400">
                  Merge tags: <span className="text-emerald-200/90">{MERGE_TAG_HINT}</span>
                </p>
                <div className="space-y-5">
                  {EMAIL_TEMPLATE_KEYS.map((key) => {
                    const template = draft.emails.templates[key] ?? defaultLibraryStoreSettings.emails.templates[key];
                    return (
                      <div key={key} className="rounded-lg border border-white/10 bg-slate-950/50 p-4">
                        <p className="mb-3 text-sm font-semibold text-white">{EMAIL_TEMPLATE_LABELS[key]}</p>
                        <FormGrid>
                          <TextField label="Subject" value={template.subject} onChange={(subject) => updateEmailTemplate(key, { subject })} className="sm:col-span-2" />
                          <TextAreaField label="Body" value={template.body} onChange={(body) => updateEmailTemplate(key, { body })} className="sm:col-span-2" rows={5} />
                        </FormGrid>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {section === "preview" && (
              <Section title="Sample / preview">
                <FormGrid>
                  <TextField label="Max sample pages hint" type="number" value={String(draft.preview.maxSamplePages)} onChange={(value) => setDraft({ ...draft, preview: { ...draft.preview, maxSamplePages: Number(value) || 1 } })} />
                </FormGrid>
                <div className="mt-3 grid gap-2">
                  <ToggleRow label="Previews enabled" checked={draft.preview.enabled} onChange={(enabled) => setDraft({ ...draft, preview: { ...draft.preview, enabled } })} />
                  <ToggleRow label="Watermark sample responses" checked={draft.preview.watermarkSamples} onChange={(watermarkSamples) => setDraft({ ...draft, preview: { ...draft.preview, watermarkSamples } })} />
                  <ToggleRow label="Require login for samples" checked={draft.preview.requireLogin} onChange={(requireLogin) => setDraft({ ...draft, preview: { ...draft.preview, requireLogin } })} />
                </div>
              </Section>
            )}

            {section === "claims" && (
              <Section title="Guest order claims">
                <FormGrid>
                  <TextField label="Claim link expiry (days)" type="number" value={String(draft.claims.expiryDays)} onChange={(value) => setDraft({ ...draft, claims: { ...draft.claims, expiryDays: Number(value) || 1 } })} />
                </FormGrid>
                <div className="mt-3 grid gap-2">
                  <ToggleRow label="Guest claims enabled" checked={draft.claims.enabled} onChange={(enabled) => setDraft({ ...draft, claims: { ...draft.claims, enabled } })} />
                  <ToggleRow label="Require admin approval before redeem" checked={draft.claims.requireAdminApproval} onChange={(requireAdminApproval) => setDraft({ ...draft, claims: { ...draft.claims, requireAdminApproval } })} />
                </div>
              </Section>
            )}

            {section === "inventory" && (
              <Section title="Inventory defaults">
                <FormGrid>
                  <TextField label="Default low-stock threshold" type="number" value={String(draft.inventory.lowStockThreshold)} onChange={(value) => setDraft({ ...draft, inventory: { ...draft.inventory, lowStockThreshold: Number(value) || 0 } })} />
                </FormGrid>
                <div className="mt-3 grid gap-2">
                  <ToggleRow label="Track stock by default for printed products" checked={draft.inventory.trackStockByDefault} onChange={(trackStockByDefault) => setDraft({ ...draft, inventory: { ...draft.inventory, trackStockByDefault } })} />
                  <ToggleRow label="Hide out-of-stock printed products" checked={draft.inventory.hideOutOfStock} onChange={(hideOutOfStock) => setDraft({ ...draft, inventory: { ...draft.inventory, hideOutOfStock } })} />
                  <ToggleRow label="Allow backorders" checked={draft.inventory.allowBackorder} onChange={(allowBackorder) => setDraft({ ...draft, inventory: { ...draft.inventory, allowBackorder } })} />
                </div>
              </Section>
            )}

            {section === "notifications" && (
              <Section title="Customer notifications">
                <FormGrid>
                  <TextField label="From name" value={draft.notifications.fromName} onChange={(fromName) => setDraft({ ...draft, notifications: { ...draft.notifications, fromName } })} />
                </FormGrid>
                <div className="mt-3 grid gap-2">
                  <ToggleRow label="Order confirmation" checked={draft.notifications.orderConfirmation} onChange={(orderConfirmation) => setDraft({ ...draft, notifications: { ...draft.notifications, orderConfirmation } })} />
                  <ToggleRow label="Download ready" checked={draft.notifications.downloadReady} onChange={(downloadReady) => setDraft({ ...draft, notifications: { ...draft.notifications, downloadReady } })} />
                  <ToggleRow label="Review request" checked={draft.notifications.reviewRequest} onChange={(reviewRequest) => setDraft({ ...draft, notifications: { ...draft.notifications, reviewRequest } })} />
                  <ToggleRow label="Low stock alert to admins" checked={draft.notifications.lowStockAlert} onChange={(lowStockAlert) => setDraft({ ...draft, notifications: { ...draft.notifications, lowStockAlert } })} />
                  <ToggleRow label="Abandoned bag reminders" checked={draft.notifications.abandonedCart} onChange={(abandonedCart) => setDraft({ ...draft, notifications: { ...draft.notifications, abandonedCart } })} />
                </div>
              </Section>
            )}

            {section === "audit" && (
              <Section title="Settings audit">
                {auditRows.length ? (
                  <div className="space-y-2">
                    {auditRows.map((entry) => (
                      <div key={entry.id} className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-white">{entry.action.replace(/_/g, " ")}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-400">{entry.message}</p>
                            {entry.actorId && <p className="mt-1 text-[11px] text-slate-500">Actor {entry.actorId}</p>}
                          </div>
                          <span className="shrink-0 text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No settings audit entries yet. Saves will appear here when audit history is available.</p>
                )}
              </Section>
            )}
          </div>
        </section>

        {showAuditSide && (
          <aside className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Audit log</h3>
              <History className="size-4 text-emerald-400" />
            </div>
            <div className="space-y-2">
              {auditRows.slice(0, 12).map((entry) => (
                <MetricRow
                  key={entry.id}
                  label={entry.message || entry.action.replace(/_/g, " ")}
                  value={new Date(entry.createdAt).toLocaleDateString()}
                />
              ))}
            </div>
            <Button type="button" variant="ghost" className="mt-4 w-full" onClick={() => setSection("audit")}>
              View full audit
            </Button>
          </aside>
        )}
      </div>
    </div>
  );
}

function ShippingZonesEditor({
  zones,
  onAdd,
  onRemove,
  onPatch,
}: {
  zones: LibraryShippingZone[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onPatch: (id: string, patch: Partial<LibraryShippingZone>) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Shipping zones</p>
        <Button type="button" variant="secondary" onClick={onAdd}>
          <Plus className="size-4" /> Add zone
        </Button>
      </div>
      <div className="space-y-4">
        {zones.map((zone) => (
          <div key={zone.id} className="rounded-lg border border-white/10 bg-slate-950/50 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">{zone.name || "Untitled zone"}</p>
              <Button type="button" variant="ghost" className="text-red-300 hover:text-red-200" onClick={() => onRemove(zone.id)}>
                <Trash2 className="size-4" /> Remove
              </Button>
            </div>
            <FormGrid>
              <TextField label="Name" value={zone.name} onChange={(name) => onPatch(zone.id, { name })} />
              <TextField label="Courier" value={zone.courier} onChange={(courier) => onPatch(zone.id, { courier })} />
              <TextField label="Countries (comma)" value={joinCommaList(zone.countries)} onChange={(value) => onPatch(zone.id, { countries: parseCommaList(value) })} className="sm:col-span-2" />
              <TextField label="Provinces (comma)" value={joinCommaList(zone.provinces)} onChange={(value) => onPatch(zone.id, { provinces: parseCommaList(value) })} />
              <TextField label="Cities (comma)" value={joinCommaList(zone.cities)} onChange={(value) => onPatch(zone.id, { cities: parseCommaList(value) })} />
              <TextField label="Rate" type="number" value={String(zone.rate)} onChange={(value) => onPatch(zone.id, { rate: Number(value) || 0 })} />
              <TextField
                label="Free shipping min (blank = never)"
                value={zone.freeShippingMin == null ? "" : String(zone.freeShippingMin)}
                onChange={(value) => onPatch(zone.id, { freeShippingMin: value.trim() === "" ? null : Number(value) || 0 })}
              />
              <TextField label="Est. days min" type="number" value={String(zone.estimatedDaysMin)} onChange={(value) => onPatch(zone.id, { estimatedDaysMin: Number(value) || 0 })} />
              <TextField label="Est. days max" type="number" value={String(zone.estimatedDaysMax)} onChange={(value) => onPatch(zone.id, { estimatedDaysMax: Number(value) || 0 })} />
              <TextField label="Priority" type="number" value={String(zone.priority)} onChange={(value) => onPatch(zone.id, { priority: Number(value) || 0 })} />
            </FormGrid>
            <div className="mt-3 grid gap-2">
              <ToggleRow label="Allow local pickup" checked={zone.allowLocalPickup} onChange={(allowLocalPickup) => onPatch(zone.id, { allowLocalPickup })} />
              <ToggleRow label="Active" checked={zone.active} onChange={(active) => onPatch(zone.id, { active })} />
            </div>
          </div>
        ))}
        {!zones.length && <p className="text-sm text-slate-500">No shipping zones yet. Add a zone or rely on the flat rate above.</p>}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-300">{title}</p>
      {children}
    </div>
  );
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <label className={cn("block text-sm text-slate-300", className)}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-emerald-400/40"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  className,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  rows?: number;
}) {
  return (
    <label className={cn("block text-sm text-slate-300", className)}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={cn("block text-sm text-slate-300", className)}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-emerald-400/40"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-300">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 rounded border-white/20 bg-slate-950" />
      {label}
    </label>
  );
}
