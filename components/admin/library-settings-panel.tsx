"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminDataTable, AdminStatusBadge } from "@/components/admin/ui/admin-ui";
import { Button } from "@/components/ui/button";
import { defaultLibraryStoreSettings, type LibraryStoreSettings } from "@/lib/library/settings-shared";
import { cn } from "@/lib/utils";

type TaxRow = { id: string; name: string; country: string; rate: unknown; inclusive: boolean; active: boolean };
type HealthRow = { area: string; status: string; detail: string };

export function LibrarySettingsPanel({
  settings,
  taxSettings,
  settingsHealth,
  onSave,
  onEditTaxSetting,
  onDeleteTaxSetting,
  onAddTaxSetting,
}: {
  settings?: LibraryStoreSettings | null;
  taxSettings: TaxRow[];
  settingsHealth: HealthRow[];
  onSave: (settings: LibraryStoreSettings) => Promise<unknown>;
  onEditTaxSetting: (tax?: TaxRow) => void;
  onDeleteTaxSetting: (id: string) => void | Promise<void>;
  onAddTaxSetting: () => void;
}) {
  const [draft, setDraft] = useState<LibraryStoreSettings>(settings ?? defaultLibraryStoreSettings);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState("store");

  useEffect(() => {
    setDraft(settings ?? defaultLibraryStoreSettings);
  }, [settings]);

  async function save() {
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  }

  const sections = [
    { id: "store", label: "Store" },
    { id: "checkout", label: "Checkout" },
    { id: "tax", label: "Tax" },
    { id: "delivery", label: "Delivery" },
    { id: "downloads", label: "Downloads" },
    { id: "licence", label: "Licence" },
    { id: "reviews", label: "Reviews" },
    { id: "seo", label: "SEO" },
    { id: "preview", label: "Preview" },
    { id: "claims", label: "Claims" },
    { id: "inventory", label: "Inventory" },
    { id: "notifications", label: "Notifications" },
  ];

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
                variant={["READY", "CLEAR", "AUTO", "OPEN", "PER_PRODUCT"].includes(row.status) ? "success" : ["ATTENTION", "MODERATION", "NEEDS_SETUP", "NEEDS_FILES", "DISABLED"].includes(row.status) ? "warning" : "muted"}
              />
            ),
          },
          { key: "detail", header: "Detail", render: (row) => row.detail },
        ]}
      />

      <section className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-white">Library store settings</h3>
            <p className="mt-1 text-sm text-slate-400">
              Checkout, tax country, delivery, downloads, licence, reviews, SEO, preview, claims, inventory, and notification defaults — saved to the database and used end to end.
            </p>
          </div>
          <Button onClick={() => void save()} disabled={saving}>
            <CheckCircle2 className="size-4" /> {saving ? "Saving..." : "Save all settings"}
          </Button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {sections.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                section === item.id ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200" : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/5",
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
                <ToggleRow label="Allow guest checkout (future claims flow)" checked={draft.checkout.guestCheckout} onChange={(guestCheckout) => setDraft({ ...draft, checkout: { ...draft.checkout, guestCheckout } })} />
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
                <Button type="button" variant="secondary" onClick={onAddTaxSetting}>Add tax rule</Button>
              </div>
              <div className="mt-3">
                <AdminDataTable
                  rows={taxSettings}
                  emptyMessage="No Library tax settings yet. Add a real tax setting when the store needs one."
                  columns={[
                    { key: "name", header: "Tax setting", render: (row) => <span className="font-semibold text-white">{row.name}</span> },
                    { key: "country", header: "Country", render: (row) => row.country },
                    { key: "rate", header: "Rate", render: (row) => `${Number(row.rate).toFixed(2)}%` },
                    { key: "active", header: "State", render: (row) => <AdminStatusBadge status={row.active ? "ACTIVE" : "INACTIVE"} variant={row.active ? "success" : "muted"} /> },
                    {
                      key: "actions",
                      header: "Actions",
                      render: (row) => (
                        <div className="flex gap-2">
                          <button type="button" className="text-xs font-semibold text-emerald-300 hover:underline" onClick={() => onEditTaxSetting(row)}>Edit</button>
                          <button type="button" className="text-xs font-semibold text-red-300 hover:underline" onClick={() => void onDeleteTaxSetting(row.id)}>Delete</button>
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
                <TextField label="Free shipping minimum (blank = never)" value={draft.delivery.freeShippingMin == null ? "" : String(draft.delivery.freeShippingMin)} onChange={(value) => setDraft({ ...draft, delivery: { ...draft.delivery, freeShippingMin: value.trim() === "" ? null : Number(value) || 0 } })} />
                <TextField label="Est. days min" type="number" value={String(draft.delivery.estimatedDaysMin)} onChange={(value) => setDraft({ ...draft, delivery: { ...draft.delivery, estimatedDaysMin: Number(value) || 0 } })} />
                <TextField label="Est. days max" type="number" value={String(draft.delivery.estimatedDaysMax)} onChange={(value) => setDraft({ ...draft, delivery: { ...draft.delivery, estimatedDaysMax: Number(value) || 0 } })} />
                <TextAreaField label="Packing slip note" value={draft.delivery.packingSlipNote} onChange={(packingSlipNote) => setDraft({ ...draft, delivery: { ...draft.delivery, packingSlipNote } })} className="sm:col-span-2" />
                <TextAreaField label="Dispatch note" value={draft.delivery.dispatchNote} onChange={(dispatchNote) => setDraft({ ...draft, delivery: { ...draft.delivery, dispatchNote } })} className="sm:col-span-2" />
              </FormGrid>
              <ToggleRow label="Enable printed book shipping" checked={draft.delivery.enablePrintedShipping} onChange={(enablePrintedShipping) => setDraft({ ...draft, delivery: { ...draft.delivery, enablePrintedShipping } })} />
            </Section>
          )}

          {section === "downloads" && (
            <Section title="Digital downloads">
              <FormGrid>
                <TextField label="Default download limit (blank = unlimited)" value={draft.downloads.defaultLimit == null ? "" : String(draft.downloads.defaultLimit)} onChange={(value) => setDraft({ ...draft, downloads: { ...draft.downloads, defaultLimit: value.trim() === "" ? null : Number(value) || 0 } })} />
                <TextField label="Default expiry days (blank = never)" value={draft.downloads.defaultExpiryDays == null ? "" : String(draft.downloads.defaultExpiryDays)} onChange={(value) => setDraft({ ...draft, downloads: { ...draft.downloads, defaultExpiryDays: value.trim() === "" ? null : Number(value) || 0 } })} />
                <TextField label="Secure token TTL (seconds)" type="number" value={String(draft.downloads.tokenTtlSeconds)} onChange={(value) => setDraft({ ...draft, downloads: { ...draft.downloads, tokenTtlSeconds: Number(value) || 900 } })} />
                <TextField label="Max concurrent download sessions" type="number" value={String(draft.downloads.maxConcurrentDownloads)} onChange={(value) => setDraft({ ...draft, downloads: { ...draft.downloads, maxConcurrentDownloads: Number(value) || 1 } })} />
              </FormGrid>
              <div className="mt-3 grid gap-2">
                <ToggleRow label="Enforce product watermark flag" checked={draft.downloads.enforceWatermarkFlag} onChange={(enforceWatermarkFlag) => setDraft({ ...draft, downloads: { ...draft.downloads, enforceWatermarkFlag } })} />
                <ToggleRow label="Watermark by default for new products" checked={draft.downloads.watermarkByDefault} onChange={(watermarkByDefault) => setDraft({ ...draft, downloads: { ...draft.downloads, watermarkByDefault } })} />
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
                <ToggleRow label="Allow guest display names" checked={draft.reviews.allowGuestNames} onChange={(allowGuestNames) => setDraft({ ...draft, reviews: { ...draft.reviews, allowGuestNames } })} />
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
              <ToggleRow label="Allow search engines to index /library" checked={draft.seo.robotsIndex} onChange={(robotsIndex) => setDraft({ ...draft, seo: { ...draft.seo, robotsIndex } })} />
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
              </div>
            </Section>
          )}
        </div>
      </section>
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={cn("block text-sm text-slate-300", className)}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <textarea
        value={value}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40"
      />
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
