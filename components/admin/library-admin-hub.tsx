"use client";

import { Boxes, ChevronDown, Copy, Download, Edit3, ExternalLink, FileArchive, FileText, ImagePlus, Link2, Loader2, Plus, Search, Trash2, Upload, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  AdminDataTable,
  AdminMetricGrid,
  AdminPanel,
  AdminSearchInput,
  AdminSelect,
  AdminStatPill,
  AdminStatusBadge,
  AdminTabStrip,
  AdminToolbar,
} from "@/components/admin/ui/admin-ui";
import { BarChart, DonutChart, MetricRow } from "@/components/admin/charts";
import { LibrarySettingsPanel } from "@/components/admin/library-settings-panel";
import { SiteAnalyticsPanel } from "@/components/admin/site-analytics-panel";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import sampleManifest from "@/public/uploads/library/samples/sample-manifest.json";
import {
  enabledLibraryFormats,
  estimateLibraryBundleScenario,
  getLibraryAnalytics,
  libraryFacets,
  libraryFormatCompareAt,
  libraryFormatInStock,
  libraryVolumePricing,
  normalizeLibraryVolumeTiers,
  primaryLibraryFormat,
  searchLibraryProducts,
  type LibraryAnalytics,
  type LibraryBundleFormatPreference,
  type LibraryOrder,
  type LibraryProduct,
  type LibraryProductFormat,
  type LibraryVolumeTier,
} from "@/lib/library/catalog";
import { defaultLibraryStoreSettings, type LibraryStoreSettings } from "@/lib/library/settings-shared";
import { cn } from "@/lib/utils";

const views = [
  "Dashboard",
  "Products",
  "Categories",
  "Collections",
  "Authors",
  "Orders",
  "Customers",
  "Reviews",
  "Coupons",
  "Downloads",
  "Inventory",
  "Reports",
  "Analytics",
  "Settings",
];

const productStatuses = ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"];
const MAX_LIBRARY_SAMPLE_UPLOAD_BYTES = 4 * 1024 * 1024;

type LibraryOperations = {
  fulfilments: Array<{ id: string; status: string; courier?: string | null; trackingNumber?: string | null; trackingUrl?: string | null; dispatchNotes?: string | null; deliveryNotes?: string | null; order?: { orderNumber: string; total: unknown; currency: string } }>;
  invoices: Array<{ id: string; invoiceNumber: string; total: unknown; currency: string; issuedAt?: string; orderId?: string; order?: { orderNumber: string } }>;
  activities: Array<{ id: string; action: string; message: string; createdAt?: string }>;
  exports: Array<{ id: string; type: string; status: string; fileUrl?: string | null; createdAt?: string }>;
  taxSettings: Array<{ id: string; name: string; country: string; rate: unknown; inclusive: boolean; active: boolean }>;
  storeSettings?: LibraryStoreSettings;
  settingsAudit?: LibrarySettingsAuditRow[];
  coupons: LibraryCouponAdmin[];
  taxonomy: LibraryTaxonomyAdmin[];
  downloadAccess: LibraryDownloadAccessAdmin[];
  reviews: LibraryReviewAdmin[];
  guestClaims: Array<{ id: string; email: string; status: string; order?: { orderNumber: string } }>;
  academyEntitlements: Array<{ id: string; userId: string; courseId: string; status: string }>;
  recommendations: LibraryRecommendationAdmin[];
  quoteRequests: LibraryQuoteRequestAdmin[];
  reports: LibraryAdminReports;
};

type LibraryQuoteRequestAdmin = {
  id: string;
  productId: string | null;
  productTitle: string;
  email: string;
  name: string | null;
  phone: string | null;
  company: string | null;
  quantity: number;
  formatType: string | null;
  message: string | null;
  status: string;
  createdAt: string;
};

type LibraryAdminReports = {
  scorecards: Array<{ label: string; value: number; detail: string; tone: "default" | "success" | "warning" | "danger" | "info" }>;
  funnel: Array<{ label: string; value: number }>;
  revenueTrend: Array<{ label: string; value: number }>;
  orderStatus: Array<{ label: string; value: number }>;
  paymentGateways: Array<{ label: string; value: number }>;
  productPerformance: Array<{ id: string; title: string; revenue: number; units: number; views: number; downloads: number; conversionRate: number; health: number }>;
  customerSegments: Array<{ id: string; userId: string; name: string; email: string; orders: number; spend: number; downloads: number; lastOrderAt: string; segment: string }>;
  couponPerformance: Array<{ id: string; code: string; usedCount: number; discountValue: number; discountType: string; active: boolean; status: string }>;
  downloadLogs: Array<{ id: string; customer: string; product: string; file: string; status: string; usage: string; lastDownloadAt?: string | null; expiresAt?: string | null }>;
  stockAlerts: Array<{ id: string; title: string; stock: number; threshold: number; warehouse: string; supplier: string; state: string }>;
  inventoryMovements: Array<{ id: string; productTitle: string; type: string; quantity: number; note?: string | null; createdAt: string }>;
  taxSummary: Array<{ id: string; name: string; country: string; rate: number; active: boolean; collected: number }>;
  refundSummary: { orders: number; amount: number; taxReturned?: number; rate: number };
  settingsHealth: Array<{ area: string; status: string; detail: string }>;
  bundlePairPerformance: Array<{ label: string; value: number; digitalLines: number; printLines: number }>;
  bundleFormatMix: Array<{ label: string; value: number }>;
};

type LibrarySettingsAuditRow = {
  id: string;
  actorId: string | null;
  action: string;
  message: string;
  createdAt: string | Date;
  metadata?: unknown;
};

type LibraryCouponAdmin = {
  id: string;
  code: string;
  description?: string | null;
  discountType: string;
  discountValue: number;
  usageLimit?: number | null;
  usedCount: number;
  minimumSubtotal?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  active: boolean;
  productIds: string[];
  categoryIds: string[];
  firstPurchaseOnly: boolean;
};

type LibraryTaxonomyAdmin = {
  id: string;
  kind: LibraryGroupField;
  name: string;
  slug: string;
  description?: string | null;
  seoTitle?: string | null;
  metaDescription?: string | null;
  heroImageUrl?: string | null;
  bio?: string | null;
  websiteUrl?: string | null;
  featured?: boolean;
  sortOrder?: number;
  active: boolean;
  productCount: number;
};

type LibraryDownloadAccessAdmin = {
  id: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  productId: string;
  productTitle: string;
  orderNumber?: string | null;
  fileName?: string | null;
  status: string;
  downloadCount: number;
  downloadLimit?: number | null;
  expiresAt?: string | null;
  lastDownloadAt?: string | null;
  licenseKey?: string | null;
};

type LibraryReviewAdmin = {
  id: string;
  productId: string;
  productTitle: string;
  userName?: string | null;
  userEmail?: string | null;
  displayName?: string | null;
  rating: number;
  title?: string | null;
  body?: string | null;
  status: string;
  verified: boolean;
  featured: boolean;
  createdAt: string;
};

type LibraryRecommendationAdmin = {
  id: string;
  reason: string;
  weight?: number;
  active?: boolean;
  sourceProductId?: string;
  targetProductId?: string;
  sourceProduct?: { title: string };
  targetProduct?: { title: string };
};

type CouponDraft = {
  id?: string;
  code: string;
  description: string;
  discountType: string;
  discountValue: string;
  usageLimit: string;
  minimumSubtotal: string;
  startsAt: string;
  expiresAt: string;
  active: boolean;
  firstPurchaseOnly: boolean;
  productIdsText: string;
  categoryIdsText: string;
};

type TaxDraft = { id?: string; name: string; country: string; rate: string; inclusive: boolean; active: boolean };

type FulfilmentDraft = { id: string; status: string; courier: string; trackingNumber: string; trackingUrl: string; dispatchNotes: string; deliveryNotes: string };

type GroupDraft = { field: LibraryGroupField; currentName: string; nextName: string };
type TaxonomyDraft = { id?: string; kind: LibraryGroupField; name: string; slug: string; description: string; seoTitle: string; metaDescription: string; heroImageUrl: string; bio: string; websiteUrl: string; featured: boolean; sortOrder: string; active: boolean };
type DownloadAccessDraft = { id: string; status: string; downloadLimit: string; expiresAt: string; resetDownloadCount: boolean };
type ManualOrderDraft = { customerId: string; productId: string; quantity: string; couponCode: string; provider: string; referenceNumber: string; note: string; markPaid: boolean };
type OrderNotifyDraft = { orderId: string; type: string; message: string };
type RefundDraft = { orderId: string; reason: string };
type PaymentActionDraft = { paymentId: string; orderNumber: string; action: "approve" | "reject" | "refund"; reason: string };
type InventoryMovementDraft = { productId: string; type: string; quantity: string; note: string };
type RecommendationDraft = { sourceProductId: string; targetProductId: string; reason: string; weight: string; active: boolean };

type LibraryDraftDownload = LibraryProduct["downloads"][number] & { fileUrl?: string; fileName?: string; fileSizeBytes?: number; previewable?: boolean };
type UploadSlot = "cover" | "download" | "sample";
type InlineStatus = { tone: "success" | "error" | "pending"; message: string };
type PreparedLibrarySample = {
  slug: string;
  title: string;
  label: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  size: string;
  pages: number;
};

type LibraryProductDraft = {
  title: string;
  slug: string;
  subtitle: string;
  author: string;
  publisher: string;
  edition: string;
  isbn: string;
  language: string;
  publicationDate: string;
  pages: string;
  sku: string;
  productType: string;
  status: string;
  price: string;
  compareAtPrice: string;
  currency: string;
  category: string;
  collection: string;
  series: string;
  difficulty: string;
  shortDescription: string;
  description: string;
  learningOutcomesText: string;
  whoThisIsForText: string;
  requirementsText: string;
  tableOfContentsText: string;
  tagsText: string;
  seoTitle: string;
  metaDescription: string;
  seoFocusKeyword: string;
  seoImageUrl: string;
  stock: string;
  lowStockThreshold: string;
  warehouse: string;
  supplier: string;
  downloadLimit: string;
  downloadExpiryDays: string;
  watermarking: boolean;
  licenseKeys: boolean;
  featured: boolean;
  bestSeller: boolean;
  newRelease: boolean;
  editorsChoice: boolean;
  comingSoon: boolean;
  preorder: boolean;
  formats: LibraryProductFormat[];
  gallery: LibraryProduct["gallery"];
  downloads: LibraryDraftDownload[];
  sampleFile: LibraryDraftDownload | null;
  scheduledAt: string;
  bundleProductIds: string[];
  bundlePromoPrice: string;
  bundleFormatPreference: LibraryBundleFormatPreference;
};

const preparedLibrarySamples = sampleManifest.samples as PreparedLibrarySample[];

const emptyOperations: LibraryOperations = {
  fulfilments: [],
  invoices: [],
  activities: [],
  exports: [],
  taxSettings: [],
  storeSettings: defaultLibraryStoreSettings,
  settingsAudit: [],
  coupons: [],
  taxonomy: [],
  downloadAccess: [],
  reviews: [],
  guestClaims: [],
  academyEntitlements: [],
  recommendations: [],
  quoteRequests: [],
  reports: {
    scorecards: [],
    funnel: [],
    revenueTrend: [],
    orderStatus: [],
    paymentGateways: [],
    productPerformance: [],
    customerSegments: [],
    couponPerformance: [],
    downloadLogs: [],
    stockAlerts: [],
    inventoryMovements: [],
    taxSummary: [],
    refundSummary: { orders: 0, amount: 0, rate: 0 },
    settingsHealth: [],
    bundlePairPerformance: [],
    bundleFormatMix: [],
  },
};

function OperationsList({ title, rows }: { title: string; rows: Array<{ label: string; value: string; detail?: string; href?: string }> }) {
  return (
    <div className="mt-5 rounded-xl border border-white/[0.08] bg-slate-950/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-white">{title}</p>
        <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-300">{rows.length}</span>
      </div>
      <div className="mt-3 grid gap-2">
        {rows.length ? rows.slice(0, 8).map((row, index) => (
          <div key={`${row.label}-${index}`} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <div className="grid min-w-0 gap-1 min-[460px]:flex min-[460px]:items-start min-[460px]:justify-between min-[460px]:gap-3">
              <p className="min-w-0 break-words text-sm font-semibold text-slate-100 [overflow-wrap:anywhere]">{row.label}</p>
              <span className="shrink-0 text-xs font-semibold text-emerald-300">{row.value}</span>
            </div>
            {row.detail && <p className="mt-1 break-words text-xs text-slate-500 [overflow-wrap:anywhere]">{row.detail}</p>}
            {row.href && (
              <a href={row.href} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-bold text-emerald-300 hover:underline">
                Open
              </a>
            )}
          </div>
        )) : (
          <p className="rounded-lg border border-dashed border-white/[0.08] p-3 text-sm text-slate-500">No records yet.</p>
        )}
      </div>
    </div>
  );
}

function MiniMetricGrid({ rows }: { rows: Array<{ label: string; value: string | number; detail?: string }> }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {rows.map((row) => (
        <div key={row.label} className="min-w-0 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{row.label}</p>
          <p className="mt-1 break-words text-lg font-bold text-white [overflow-wrap:anywhere]">{row.value}</p>
          {row.detail && <p className="break-words text-xs text-slate-500 [overflow-wrap:anywhere]">{row.detail}</p>}
        </div>
      ))}
    </div>
  );
}

export function LibraryAdminHub() {
  const searchParams = useSearchParams();
  const [view, setView] = useState("Dashboard");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [productsSource, setProductsSource] = useState<LibraryProduct[]>([]);
  const [orders, setOrders] = useState<LibraryOrder[]>([]);
  const [analytics, setAnalytics] = useState<LibraryAnalytics>(getLibraryAnalytics());
  const [operations, setOperations] = useState<LibraryOperations>(emptyOperations);
  const [draftOpen, setDraftOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const emptyDraft: LibraryProductDraft = {
    title: "",
    slug: "",
    subtitle: "",
    author: "",
    publisher: "HouseLink Zimbabwe",
    edition: "Digital Edition",
    isbn: "",
    language: "English",
    publicationDate: "",
    pages: "",
    sku: "",
    productType: "PDF",
    status: "DRAFT",
    price: "29",
    compareAtPrice: "",
    currency: "USD",
    category: "Toolkits",
    collection: "HouseLink Library",
    series: "",
    difficulty: "Professional",
    shortDescription: "",
    description: "",
    learningOutcomesText: "",
    whoThisIsForText: "",
    requirementsText: "",
    tableOfContentsText: "",
    tagsText: "",
    seoTitle: "",
    metaDescription: "",
    seoFocusKeyword: "",
    seoImageUrl: "",
    stock: "",
    lowStockThreshold: "0",
    warehouse: "",
    supplier: "",
    downloadLimit: "",
    downloadExpiryDays: "",
    watermarking: false,
    licenseKeys: false,
    featured: false,
    bestSeller: false,
    newRelease: false,
    editorsChoice: false,
    comingSoon: false,
    preorder: false,
    bundleProductIds: [],
    bundlePromoPrice: "",
    bundleFormatPreference: "PREFER_DIGITAL",
    formats: [
      { id: "digital", type: "PDF", label: "Digital PDF", enabled: true, price: 29 },
      { id: "printed", type: "PRINTED_BOOK", label: "Printed book", enabled: false, price: 45 },
    ],
    gallery: [],
    downloads: [],
    sampleFile: null,
    scheduledAt: "",
  };
  const [draft, setDraft] = useState<LibraryProductDraft>(emptyDraft);
  const draftSlug = draft.slug;
  const draftTitle = draft.title;
  const preparedSample = useMemo(() => findPreparedLibrarySample({ slug: draftSlug, title: draftTitle }), [draftSlug, draftTitle]);
  const [bundleCompanionQuery, setBundleCompanionQuery] = useState("");
  const [hidePrintOosCompanions, setHidePrintOosCompanions] = useState(false);
  const [editingProduct, setEditingProduct] = useState<LibraryProduct | null>(null);
  const emptyCouponDraft: CouponDraft = { code: "", description: "", discountType: "PERCENT", discountValue: "10", usageLimit: "", minimumSubtotal: "", startsAt: "", expiresAt: "", active: true, firstPurchaseOnly: false, productIdsText: "", categoryIdsText: "" };
  const emptyTaxDraft: TaxDraft = { name: "", country: "ZW", rate: "0", inclusive: false, active: true };
  const [couponDraft, setCouponDraft] = useState<CouponDraft | null>(null);
  const [taxDraft, setTaxDraft] = useState<TaxDraft | null>(null);
  const [fulfilmentDraft, setFulfilmentDraft] = useState<FulfilmentDraft | null>(null);
  const [groupDraft, setGroupDraft] = useState<GroupDraft | null>(null);
  const [taxonomyDraft, setTaxonomyDraft] = useState<TaxonomyDraft | null>(null);
  const taxonomyAvatarInputRef = useRef<HTMLInputElement>(null);
  const [taxonomyAvatarUploading, setTaxonomyAvatarUploading] = useState(false);
  const [downloadAccessDraft, setDownloadAccessDraft] = useState<DownloadAccessDraft | null>(null);
  const [manualOrderDraft, setManualOrderDraft] = useState<ManualOrderDraft | null>(null);
  const [orderNotifyDraft, setOrderNotifyDraft] = useState<OrderNotifyDraft | null>(null);
  const [refundDraft, setRefundDraft] = useState<RefundDraft | null>(null);
  const [paymentActionDraft, setPaymentActionDraft] = useState<PaymentActionDraft | null>(null);
  const [inventoryMovementDraft, setInventoryMovementDraft] = useState<InventoryMovementDraft | null>(null);
  const [recommendationDraft, setRecommendationDraft] = useState<RecommendationDraft | null>(null);
  const [previewProduct, setPreviewProduct] = useState<LibraryProduct | null>(null);
  const [guestClaimDraft, setGuestClaimDraft] = useState<{ orderId: string; email: string } | null>(null);
  const [bulkDraft, setBulkDraft] = useState<{ mode: "price" | "category"; value: string } | null>(null);
  const [fileVerification, setFileVerification] = useState<Record<string, { tone: "success" | "error" | "pending"; message: string }>>({});
  const [uploadStatus, setUploadStatus] = useState<Partial<Record<UploadSlot, InlineStatus>>>({});
  const [storageStatus, setStorageStatus] = useState<InlineStatus | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [orderFilter, setOrderFilter] = useState("ALL");
  const [customerFilter, setCustomerFilter] = useState("");
  const [reportFilter, setReportFilter] = useState("overview");
  const source = loaded || productsSource.length > 0 ? productsSource : searchLibraryProducts({});
  const products = useMemo(() => {
    const q = query.trim().toLowerCase();
    return source.filter((product) => {
      if (category && product.category !== category) return false;
      if (!q) return true;
      return [product.title, product.sku, product.author, product.isbn, product.category].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [category, query, source]);
  const facets = productsSource.length
    ? {
        categories: Array.from(new Set(productsSource.map((p) => p.category))).sort(),
        authors: Array.from(new Set(productsSource.map((p) => p.author))).sort(),
        types: Array.from(new Set(productsSource.map((p) => p.productType))).sort(),
        difficulties: Array.from(new Set(productsSource.map((p) => p.difficulty))).sort(),
      }
    : libraryFacets();
  const taxonomyOptions = useMemo(() => {
    const byKind = (kind: LibraryGroupField) => {
      const fromTaxonomy = operations.taxonomy.filter((row) => row.kind === kind && row.active).map((row) => row.name);
      const fromProducts = productsSource.map((product) => product[kind]).filter(Boolean);
      return Array.from(new Set([...fromTaxonomy, ...fromProducts])).sort((a, b) => a.localeCompare(b));
    };
    return {
      categories: byKind("category"),
      collections: byKind("collection"),
      authors: byKind("author"),
    };
  }, [operations.taxonomy, productsSource]);

  useEffect(() => {
    const requested = searchParams?.get("libraryView");
    if (requested && views.includes(requested)) setView(requested);
  }, [searchParams]);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const result = await apiFetch<{ products: LibraryProduct[]; orders: LibraryOrder[]; analytics: LibraryAnalytics; operations?: LibraryOperations }>("/api/v1/admin/library");
    if (result.error) {
      setLoadError(result.error.message || "Library admin could not load from the database.");
      setFeedback({ tone: "error", message: result.error.message || "Library admin could not load from the database." });
      setLoaded(true);
      return;
    }
    if (result.data) {
      setProductsSource(result.data.products);
      setOrders(result.data.orders);
      setAnalytics(result.data.analytics);
      setOperations(result.data.operations ?? emptyOperations);
      setLoadError(null);
    }
    setLoaded(true);
  }

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createProduct(statusOverride?: string) {
    setSaving(true);
    setFeedback(null);
    try {
      const result = await apiFetch<{ product: LibraryProduct }>("/api/v1/admin/library", {
        method: "POST",
        body: JSON.stringify(productPayload(draft, statusOverride)),
      });
      if (result.error || !result.data?.product) {
        setFeedback({ tone: "error", message: result.error?.message || "Product could not be created in the database." });
        return;
      }
      setFeedback({
        tone: "success",
        message: result.data.product.status === "PUBLISHED"
          ? "Product created and published to the public Library."
          : "Product saved as draft. Publish it to show it on the public Library.",
      });
      setDraftOpen(false);
      setDraft(emptyDraft);
      await load();
    } catch (error) {
      setFeedback({ tone: "error", message: error instanceof Error ? `Product could not be created: ${error.message}` : "Product could not be created in the database." });
    } finally {
      setSaving(false);
    }
  }

  async function saveProduct(statusOverride?: string) {
    if (!editingProduct) return createProduct(statusOverride);
    setSaving(true);
    setFeedback(null);
    try {
      const result = await apiFetch<{ product: LibraryProduct }>(`/api/v1/admin/library/products/${editingProduct.id}`, {
        method: "PATCH",
        body: JSON.stringify(productPayload(draft, statusOverride)),
      });
      if (result.error || !result.data?.product) {
        setFeedback({ tone: "error", message: result.error?.message || "Product could not be saved to the database." });
        return;
      }
      setFeedback({
        tone: "success",
        message: result.data.product.status === "PUBLISHED"
          ? "Product published to the public Library."
          : "Product saved as draft.",
      });
      closeEditor();
      await load();
    } catch (error) {
      setFeedback({ tone: "error", message: error instanceof Error ? `Product could not be saved: ${error.message}` : "Product could not be saved to the database." });
    } finally {
      setSaving(false);
    }
  }

  function confirmPublishThenSave() {
    if (draft.bundleProductIds.length > 0 && !draft.bundlePromoPrice.trim()) {
      const proceed = window.confirm(
        "Companions are selected but the bundle promo total is blank. Publish without a bundle discount?",
      );
      if (!proceed) return;
    }
    void saveProduct("PUBLISHED");
  }

  function moveBundleCompanion(id: string, direction: -1 | 1) {
    setDraft((current) => {
      const ids = [...current.bundleProductIds];
      const index = ids.indexOf(id);
      if (index < 0) return current;
      const next = index + direction;
      if (next < 0 || next >= ids.length) return current;
      const swap = ids[index]!;
      ids[index] = ids[next]!;
      ids[next] = swap;
      return { ...current, bundleProductIds: ids };
    });
  }

  function openPackWizard() {
    const selected: LibraryProduct[] = [];
    for (const id of selectedIds) {
      const product = productsSource.find((item) => item.id === id);
      if (product?.status === "PUBLISHED") selected.push(product);
    }
    if (selected.length < 2) {
      setFeedback({ tone: "error", message: "Select at least 2 published products, then use Pack wizard." });
      return;
    }
    const main = selected[0]!;
    const companions = selected.slice(1, 5);
    const packMembers = [main, ...companions];
    const digitalList = estimateLibraryBundleScenario(packMembers, "digital", null);
    const suggested = Math.round(digitalList.subtotal * 0.9 * 100) / 100;
    setEditingProduct(null);
    setDraft({
      ...emptyDraft,
      title: `${main.title} Pack`,
      subtitle: "Curated frequently bought together pack",
      author: main.author,
      publisher: main.publisher || "HouseLink Zimbabwe",
      currency: main.currency || "USD",
      category: main.category || "Toolkits",
      collection: main.collection || "HouseLink Library",
      productType: "BUNDLE",
      price: String(suggested || main.price),
      shortDescription: `Pack with ${packMembers.map((item) => item.title).join(", ")}.`,
      description: `A curated HouseLink Library pack featuring ${packMembers.map((item) => item.title).join(", ")}. Shoppers can still choose digital or print per title on the product page.`,
      formats: [
        { id: "digital", type: "PDF", label: "Digital PDF", enabled: true, price: suggested || main.price },
        { id: "printed", type: "PRINTED_BOOK", label: "Printed book", enabled: false, price: Math.round((suggested || main.price) * 1.4 * 100) / 100 },
      ],
      bundleProductIds: companions.map((item) => item.id),
      bundlePromoPrice: suggested > 0 ? suggested.toFixed(2) : "",
      bundleFormatPreference: "PREFER_DIGITAL",
    });
    setBundleCompanionQuery("");
    setHidePrintOosCompanions(false);
    setDraftOpen(true);
    setFeedback({
      tone: "success",
      message: `Pack draft ready with ${companions.length} companion${companions.length === 1 ? "" : "s"}. Review promo, then publish.`,
    });
  }

  async function updateQuoteRequestStatus(id: string, status: string) {
    setFeedback(null);
    const result = await apiFetch("/api/v1/admin/library", {
      method: "POST",
      body: JSON.stringify({ action: "update_quote_request", id, status }),
    });
    if (result.error) {
      setFeedback({ tone: "error", message: result.error.message || "Quote request could not be updated." });
      return;
    }
    setOperations((current) => ({
      ...current,
      quoteRequests: (current.quoteRequests ?? []).map((row) => (row.id === id ? { ...row, status } : row)),
    }));
    setFeedback({ tone: "success", message: `Quote marked ${status}.` });
  }

  function openEditor(product: LibraryProduct) {
    setEditingProduct(product);
    setDraft({
      title: product.title,
      slug: product.slug,
      subtitle: product.subtitle,
      author: product.author,
      publisher: product.publisher,
      edition: product.edition,
      isbn: product.isbn ?? "",
      language: product.language,
      publicationDate: product.publicationDate,
      pages: product.pages?.toString() ?? "",
      sku: product.sku,
      price: String(product.price),
      compareAtPrice: product.compareAtPrice?.toString() ?? "",
      currency: product.currency,
      category: product.category,
      collection: product.collection,
      series: product.series ?? "",
      difficulty: product.difficulty,
      productType: product.productType,
      status: product.status,
      shortDescription: product.shortDescription,
      description: product.description,
      learningOutcomesText: product.learningOutcomes.join("\n"),
      whoThisIsForText: product.whoThisIsFor.join("\n"),
      requirementsText: product.requirements.join("\n"),
      tableOfContentsText: product.tableOfContents.join("\n"),
      tagsText: product.tags.join(", "),
      seoTitle: product.seoTitle ?? "",
      metaDescription: product.metaDescription ?? "",
      seoFocusKeyword: product.seoFocusKeyword ?? "",
      seoImageUrl: product.seoImageUrl ?? "",
      stock: product.stock === null ? "" : String(product.stock),
      lowStockThreshold: String(product.lowStockThreshold),
      warehouse: product.warehouse ?? "",
      supplier: product.supplier ?? "",
      downloadLimit: product.downloadLimit == null ? "" : String(product.downloadLimit),
      downloadExpiryDays: product.downloadExpiryDays == null ? "" : String(product.downloadExpiryDays),
      watermarking: Boolean(product.watermarking),
      licenseKeys: Boolean(product.licenseKeys),
      featured: product.featured,
      bestSeller: product.bestSeller,
      newRelease: product.newRelease,
      editorsChoice: product.editorsChoice,
      comingSoon: product.comingSoon,
      preorder: product.preorder,
      formats: normalizeDraftFormats(product),
      gallery: product.gallery,
      ...splitSampleFromDownloads(product.downloads),
      scheduledAt: product.scheduledAt ? product.scheduledAt.slice(0, 16) : "",
      bundleProductIds: product.bundleProductIds ?? [],
      bundlePromoPrice: product.bundlePromoPrice != null ? String(product.bundlePromoPrice) : "",
      bundleFormatPreference: product.bundleFormatPreference ?? "PREFER_DIGITAL",
    });
    setBundleCompanionQuery("");
    setHidePrintOosCompanions(false);
    setDraftOpen(true);
  }

  function closeEditor() {
    setDraftOpen(false);
    setEditingProduct(null);
    setDraft(emptyDraft);
    setFileVerification({});
    setUploadStatus({});
    setBundleCompanionQuery("");
    setHidePrintOosCompanions(false);
  }

  async function uploadAsset(files: FileList | null, kind: UploadSlot, input?: HTMLInputElement | null) {
    const file = files?.[0];
    if (!file) return;
    setFeedback(null);
    if (kind === "sample" && !file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setUploadStatus((current) => ({ ...current, sample: { tone: "error", message: "Sample preview must be a PDF file." } }));
      if (input) input.value = "";
      return;
    }
    if (kind === "sample" && file.size > MAX_LIBRARY_SAMPLE_UPLOAD_BYTES) {
      setUploadStatus((current) => ({
        ...current,
        sample: {
          tone: "error",
          message: `Sample preview is ${formatUploadSize(file.size)}. Please upload a PDF under ${formatUploadSize(MAX_LIBRARY_SAMPLE_UPLOAD_BYTES)} so the admin upload can complete reliably.`,
        },
      }));
      if (input) input.value = "";
      return;
    }

    setUploadStatus((current) => ({ ...current, [kind]: { tone: "pending", message: `Uploading ${file.name}...` } }));
    try {
      const dataUrl = await readFile(file);
      const isImage = file.type.startsWith("image/");
      const uploaded = await apiFetch<{ url: string; filename?: string; storageId?: string; size?: number }>("/api/v1/uploads", {
        method: "POST",
        body: JSON.stringify({ dataUrl, kind: isImage ? "image" : "document", folder: "library", filename: file.name }),
      });
      if (!uploaded.data?.url) {
        setUploadStatus((current) => ({
          ...current,
          [kind]: { tone: "error", message: uploaded.error?.message || "Upload failed. Check Cloudinary/storage settings and try again." },
        }));
        return;
      }
      if (kind === "cover") {
        setDraft((current) => ({
          ...current,
          gallery: [...current.gallery, { label: file.name.replace(/\.[^.]+$/, ""), url: uploaded.data!.url, kind: "cover" }],
        }));
        setUploadStatus((current) => ({ ...current, cover: { tone: "success", message: "Cover uploaded. Save the product to keep it." } }));
        return;
      }

      const ext = file.name.split(".").pop()?.toUpperCase() || "PDF";
      const baseName = file.name.replace(/\.[^.]+$/, "");
      const nextFile = {
        id: crypto.randomUUID(),
        label: kind === "sample" ? (baseName.toLowerCase().includes("sample") || baseName.toLowerCase().includes("preview") ? baseName : `Sample preview - ${baseName}`) : baseName,
        fileType: ext,
        size: formatUploadSize(uploaded.data?.size ?? file.size),
        secure: true,
        previewable: kind === "sample",
        fileUrl: uploaded.data!.url,
        fileName: kind === "sample" ? `sample-${uploaded.data?.filename ?? file.name}` : (uploaded.data?.filename ?? file.name),
        fileSizeBytes: uploaded.data?.size ?? file.size,
      } as LibraryDraftDownload;
      if (kind === "sample") {
        setDraft((current) => ({ ...current, sampleFile: nextFile }));
        setUploadStatus((current) => ({ ...current, sample: { tone: "success", message: "Sample PDF uploaded. Save the product to keep it." } }));
        return;
      }
      const prepared = findPreparedLibrarySample(draft);
      const shouldAttachPreparedSample = Boolean(prepared && !draft.sampleFile && (file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf"));
      setDraft((current) => ({
        ...current,
        downloads: [...current.downloads, nextFile],
        sampleFile: shouldAttachPreparedSample && prepared ? preparedSampleToDraft(prepared) : current.sampleFile,
      }));
      setUploadStatus((current) => ({
        ...current,
        download: {
          tone: "success",
          message: shouldAttachPreparedSample
            ? "Full download uploaded. A matching prepared sample was attached too; save the product to keep both."
            : "Full download uploaded and attached. Save the product to keep it.",
        },
      }));
    } catch (error) {
      setUploadStatus((current) => ({
        ...current,
        [kind]: {
          tone: "error",
          message: error instanceof Error ? `Upload failed: ${error.message}` : "Upload failed. Check Cloudinary/storage settings and try again.",
        },
      }));
    } finally {
      if (input) input.value = "";
    }
  }

  async function uploadTaxonomyAvatar(files: FileList | null, input?: HTMLInputElement | null) {
    const file = files?.[0];
    if (!file || !taxonomyDraft || taxonomyDraft.kind !== "author") return;
    setFeedback(null);
    if (!file.type.startsWith("image/")) {
      setFeedback({ tone: "error", message: "Author profile image must be a JPG, PNG, or WebP file." });
      if (input) input.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ tone: "error", message: "Author profile images must be under 5 MB." });
      if (input) input.value = "";
      return;
    }

    setTaxonomyAvatarUploading(true);
    try {
      const dataUrl = await readFile(file);
      const uploaded = await apiFetch<{ url: string }>("/api/v1/uploads", {
        method: "POST",
        body: JSON.stringify({ dataUrl, kind: "image", folder: "library-authors", filename: file.name }),
      });
      if (!uploaded.data?.url) {
        setFeedback({ tone: "error", message: uploaded.error?.message || "Author profile image upload failed." });
        return;
      }
      setTaxonomyDraft((current) => current ? { ...current, heroImageUrl: uploaded.data!.url } : current);
      setFeedback({ tone: "success", message: "Author profile image uploaded. Save the author to keep it." });
    } catch {
      setFeedback({ tone: "error", message: "Author profile image upload failed." });
    } finally {
      setTaxonomyAvatarUploading(false);
      if (input) input.value = "";
    }
  }

  async function verifyLibraryFile(file: LibraryDraftDownload) {
    const key = fileVerificationKey(file);
    if (!file.fileUrl) {
      setFileVerification((current) => ({ ...current, [key]: { tone: "error", message: "This file does not have a URL to verify." } }));
      return;
    }
    setFileVerification((current) => ({ ...current, [key]: { tone: "pending", message: "Checking file delivery..." } }));
    try {
      const result = await apiFetch<{ ok: boolean; message: string; status?: number; contentType?: string | null; contentLength?: string | null }>("/api/v1/admin/library", {
        method: "POST",
        body: JSON.stringify({ action: "verify_library_file_delivery", fileUrl: file.fileUrl }),
      });
      if (result.error || !result.data) {
        setFileVerification((current) => ({
          ...current,
          [key]: { tone: "error", message: result.error?.message || "Library file delivery could not be verified." },
        }));
        return;
      }
      setFileVerification((current) => ({
        ...current,
        [key]: {
          tone: result.data.ok ? "success" : "error",
          message: result.data.message,
        },
      }));
    } catch (error) {
      setFileVerification((current) => ({
        ...current,
        [key]: {
          tone: "error",
          message: error instanceof Error ? `Verification failed: ${error.message}` : "Verification failed.",
        },
      }));
    }
  }

  function attachPreparedSample(sample = preparedSample) {
    if (!sample) return;
    setDraft((current) => ({ ...current, sampleFile: preparedSampleToDraft(sample) }));
    setUploadStatus((current) => ({
      ...current,
      sample: { tone: "success", message: `${sample.size}, ${sample.pages}-page prepared sample attached. Save the product to keep it.` },
    }));
  }

  async function checkLibraryStorage() {
    setStorageStatus({ tone: "pending", message: "Checking Library document storage..." });
    try {
      const result = await apiFetch<{ ok: boolean; message: string }>("/api/v1/admin/library", {
        method: "POST",
        body: JSON.stringify({ action: "test_library_storage" }),
      });
      if (result.error || !result.data) {
        setStorageStatus({ tone: "error", message: result.error?.message || "Library storage check failed." });
        return;
      }
      setStorageStatus({ tone: result.data.ok ? "success" : "error", message: result.data.message });
    } catch (error) {
      setStorageStatus({
        tone: "error",
        message: error instanceof Error ? `Library storage check failed: ${error.message}` : "Library storage check failed.",
      });
    }
  }

  async function duplicate(id: string) {
    await apiFetch("/api/v1/admin/library", { method: "POST", body: JSON.stringify({ action: "duplicate", id }) });
    await load();
  }

  async function deleteProduct(id: string) {
    if (!window.confirm("Delete this Library product? This removes it from the admin catalogue and public library.")) return;
    setFeedback(null);
    const result = await apiFetch<{ count: number }>(`/api/v1/admin/library/products/${id}`, { method: "DELETE" });
    if (result.error || !result.data?.count) {
      setFeedback({ tone: "error", message: result.error?.message || "Product could not be deleted." });
      return;
    }
    setProductsSource((current) => current.filter((product) => product.id !== id));
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    setFeedback({ tone: "success", message: "Product deleted." });
    await load();
  }

  async function setProductStatus(product: LibraryProduct, status: string) {
    setFeedback(null);
    const result = await apiFetch<{ product: LibraryProduct }>(`/api/v1/admin/library/products/${product.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (result.error) {
      setFeedback({ tone: "error", message: result.error.message || "Could not update product status." });
      return;
    }
    setFeedback({
      tone: "success",
      message: status === "PUBLISHED" ? "Product published." : `Product marked ${status.toLowerCase()}.`,
    });
    await load();
  }

  async function bulk(action: "bulk_archive" | "bulk_delete") {
    if (action === "bulk_delete" && !window.confirm(`Delete ${selectedIds.size} selected Library product${selectedIds.size === 1 ? "" : "s"}?`)) return;
    await apiFetch("/api/v1/admin/library", { method: "POST", body: JSON.stringify({ action, ids: Array.from(selectedIds) }) });
    setSelectedIds(new Set());
    await load();
  }

  async function saveBulkUpdate() {
    if (!bulkDraft || !selectedIds.size) return;
    const action = bulkDraft.mode === "price" ? "bulk_price" : "bulk_category";
    const body = bulkDraft.mode === "price"
      ? { action, ids: Array.from(selectedIds), price: Number(bulkDraft.value) }
      : { action, ids: Array.from(selectedIds), category: bulkDraft.value.trim() };
    setFeedback(null);
    const result = await apiFetch<{ count?: number }>("/api/v1/admin/library", { method: "POST", body: JSON.stringify(body) });
    if (result.error) {
      setFeedback({ tone: "error", message: result.error.message || "Bulk update failed." });
      return;
    }
    setBulkDraft(null);
    setSelectedIds(new Set());
    setFeedback({ tone: "success", message: `Updated ${result.data?.count ?? selectedIds.size} product(s).` });
    await load();
  }

  async function moderateGuestClaim(id: string, action: "approve_guest_claim" | "reject_guest_claim") {
    setFeedback(null);
    const result = await apiFetch("/api/v1/admin/library", { method: "POST", body: JSON.stringify({ action, id }) });
    if (result.error) {
      setFeedback({ tone: "error", message: result.error.message || "Guest claim action failed." });
      return;
    }
    setFeedback({ tone: "success", message: action === "approve_guest_claim" ? "Guest claim approved." : "Guest claim rejected." });
    await load();
  }

  async function saveGuestClaim() {
    if (!guestClaimDraft?.orderId || !guestClaimDraft.email.trim()) return;
    setFeedback(null);
    const result = await apiFetch<{ claimUrl?: string }>("/api/v1/admin/library", {
      method: "POST",
      body: JSON.stringify({ action: "create_guest_claim", orderId: guestClaimDraft.orderId, email: guestClaimDraft.email.trim() }),
    });
    if (result.error) {
      setFeedback({ tone: "error", message: result.error.message || "Guest claim could not be created." });
      return;
    }
    setGuestClaimDraft(null);
    setFeedback({
      tone: "success",
      message: result.data?.claimUrl
        ? `Guest claim issued and emailed. Claim link: ${result.data.claimUrl}`
        : "Guest claim issued.",
    });
    await load();
  }

  async function updateProducts(ids: string[], patch: Partial<LibraryProduct>) {
    await Promise.all(ids.map((id) => apiFetch(`/api/v1/admin/library/products/${id}`, { method: "PATCH", body: JSON.stringify(patch) })));
    await load();
  }

  function openGroupEditor(field: LibraryGroupField, currentName: string) {
    setGroupDraft({ field, currentName, nextName: currentName });
  }

  function openTaxonomyEditor(kind: LibraryGroupField, row?: LibraryTaxonomyAdmin) {
    setTaxonomyDraft(row ? {
      id: row.id,
      kind: row.kind,
      name: row.name,
      slug: row.slug,
      description: row.description ?? "",
      seoTitle: row.seoTitle ?? "",
      metaDescription: row.metaDescription ?? "",
      heroImageUrl: row.heroImageUrl ?? "",
      bio: row.bio ?? "",
      websiteUrl: row.websiteUrl ?? "",
      featured: Boolean(row.featured),
      sortOrder: String(row.sortOrder ?? 0),
      active: row.active,
    } : { kind, name: "", slug: "", description: "", seoTitle: "", metaDescription: "", heroImageUrl: "", bio: "", websiteUrl: "", featured: false, sortOrder: "0", active: true });
  }

  async function saveTaxonomy() {
    if (!taxonomyDraft) return;
    setFeedback(null);
    const result = await apiFetch<{ taxonomy: LibraryTaxonomyAdmin }>("/api/v1/admin/library", {
      method: "POST",
      body: JSON.stringify({ action: "save_taxonomy", ...taxonomyPayload(taxonomyDraft) }),
    });
    if (result.error || !result.data?.taxonomy) {
      setFeedback({ tone: "error", message: result.error?.message || "Taxonomy record could not be saved." });
      return;
    }
    setTaxonomyDraft(null);
    setFeedback({ tone: "success", message: `${result.data.taxonomy.name} saved.` });
    await load();
  }

  async function deleteTaxonomy(kind: LibraryGroupField, id: string) {
    if (!window.confirm("Permanently delete this Library record? Linked products keep their text values, but this taxonomy row will be removed.")) return;
    setFeedback(null);
    const result = await apiFetch<{ taxonomy: LibraryTaxonomyAdmin }>("/api/v1/admin/library", {
      method: "POST",
      body: JSON.stringify({ action: "delete_taxonomy", kind, id }),
    });
    if (result.error || !result.data?.taxonomy) {
      setFeedback({ tone: "error", message: result.error?.message || "Taxonomy record could not be deleted." });
      return;
    }
    setOperations((current) => ({
      ...current,
      taxonomy: current.taxonomy.filter((item) => item.id !== id),
    }));
    setFeedback({ tone: "success", message: `${result.data.taxonomy.name} deleted.` });
    await load();
  }

  async function saveProductGroup() {
    if (!groupDraft) return;
    const nextName = groupDraft.nextName.trim();
    if (!nextName || nextName === groupDraft.currentName) {
      setGroupDraft(null);
      return;
    }
    const ids = source.filter((product) => product[groupDraft.field] === groupDraft.currentName).map((product) => product.id);
    await updateProducts(ids, { [groupDraft.field]: nextName } as Partial<LibraryProduct>);
    setGroupDraft(null);
  }

  async function deleteProductGroup(field: "category" | "collection" | "author", currentName: string) {
    const ids = source.filter((product) => product[field] === currentName).map((product) => product.id);
    if (!ids.length || !window.confirm(`Delete ${ids.length} product${ids.length === 1 ? "" : "s"} in ${currentName}?`)) return;
    await apiFetch("/api/v1/admin/library", { method: "POST", body: JSON.stringify({ action: "bulk_delete", ids }) });
    await load();
  }

  function createForView(targetView = view) {
    setEditingProduct(null);
    const defaults = operations.storeSettings ?? defaultLibraryStoreSettings;
    const productType = targetView === "Downloads" ? "PDF" : targetView === "Inventory" ? "PRINTED_BOOK" : "PDF";
    const template = defaults.productTemplates.find((row) => row.productType === productType) ?? defaults.productTemplates[0];
    setDraft({
      ...emptyDraft,
      currency: defaults.store.currency,
      downloadLimit: (template?.downloadLimit ?? defaults.downloads.defaultLimit) == null ? "" : String(template?.downloadLimit ?? defaults.downloads.defaultLimit),
      downloadExpiryDays: (template?.downloadExpiryDays ?? defaults.downloads.defaultExpiryDays) == null ? "" : String(template?.downloadExpiryDays ?? defaults.downloads.defaultExpiryDays),
      watermarking: template?.watermarking ?? defaults.downloads.watermarkByDefault,
      licenseKeys: template?.licenseKeys ?? defaults.licence.generateByDefault,
      lowStockThreshold: String(template?.lowStockThreshold ?? defaults.inventory.lowStockThreshold),
      category: targetView === "Categories" ? "New Category" : targetView === "Downloads" ? "Digital Downloads" : targetView === "Inventory" ? "Printed Stock" : "Toolkits",
      productType,
      stock: targetView === "Inventory" || template?.trackStock ? "10" : "",
    });
    setBundleCompanionQuery("");
    setHidePrintOosCompanions(false);
    setDraftOpen(true);
  }

  async function createExport(type: string) {
    setFeedback(null);
    const result = await apiFetch("/api/v1/admin/library", { method: "POST", body: JSON.stringify({ action: "create_export", type, filters: { view } }) });
    if (result.error) {
      setFeedback({ tone: "error", message: result.error.message || "Export could not be created." });
      return;
    }
    await load();
    setFeedback({ tone: "success", message: "Export created." });
  }

  async function deleteExport(id: string, type: string) {
    if (!window.confirm(`Delete the ${type} export job? This removes it from the reports list.`)) return;
    setFeedback(null);
    const result = await apiFetch<{ deleted: boolean }>("/api/v1/admin/library", { method: "POST", body: JSON.stringify({ action: "delete_export", id }) });
    if (result.error) {
      setFeedback({ tone: "error", message: result.error.message || "Export could not be deleted." });
      return;
    }
    setOperations((current) => ({
      ...current,
      exports: current.exports.filter((item) => item.id !== id),
    }));
    await load();
    setFeedback({ tone: "success", message: "Export deleted." });
  }

  function openCouponEditor(coupon?: LibraryCouponAdmin) {
    setCouponDraft(coupon ? {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description ?? "",
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      usageLimit: coupon.usageLimit == null ? "" : String(coupon.usageLimit),
      minimumSubtotal: coupon.minimumSubtotal == null ? "" : String(coupon.minimumSubtotal),
      startsAt: coupon.startsAt ?? "",
      expiresAt: coupon.expiresAt ?? "",
      active: coupon.active,
      firstPurchaseOnly: coupon.firstPurchaseOnly,
      productIdsText: coupon.productIds.join(", "),
      categoryIdsText: coupon.categoryIds.join(", "),
    } : emptyCouponDraft);
  }

  async function saveCoupon() {
    if (!couponDraft) return;
    setFeedback(null);
    const result = await apiFetch("/api/v1/admin/library", { method: "POST", body: JSON.stringify({ action: "save_coupon", ...couponPayload(couponDraft) }) });
    if (result.error) {
      setFeedback({ tone: "error", message: result.error.message || "Coupon could not be saved." });
      return;
    }
    setCouponDraft(null);
    setFeedback({ tone: "success", message: "Coupon saved." });
    await load();
  }

  async function deleteCoupon(id: string) {
    if (!window.confirm("Delete this Library coupon?")) return;
    setFeedback(null);
    const result = await apiFetch("/api/v1/admin/library", { method: "POST", body: JSON.stringify({ action: "delete_coupon", id }) });
    if (result.error) {
      setFeedback({ tone: "error", message: result.error.message || "Coupon could not be deleted." });
      return;
    }
    setOperations((current) => ({ ...current, coupons: current.coupons.filter((item) => item.id !== id) }));
    setFeedback({ tone: "success", message: "Coupon deleted." });
    await load();
  }

  function openTaxEditor(tax?: LibraryOperations["taxSettings"][number]) {
    setTaxDraft(tax ? { id: tax.id, name: tax.name, country: tax.country, rate: String(tax.rate), inclusive: tax.inclusive, active: tax.active } : emptyTaxDraft);
  }

  async function saveTaxSetting() {
    if (!taxDraft) return;
    await apiFetch("/api/v1/admin/library", { method: "POST", body: JSON.stringify({ action: "save_tax_setting", id: taxDraft.id, name: taxDraft.name, country: taxDraft.country, rate: Number(taxDraft.rate), inclusive: taxDraft.inclusive, active: taxDraft.active }) });
    setTaxDraft(null);
    await load();
  }

  async function deleteTaxSetting(id: string) {
    if (!window.confirm("Delete this Library tax setting? Checkout quotes will stop using it immediately.")) return;
    setFeedback(null);
    const result = await apiFetch("/api/v1/admin/library", { method: "POST", body: JSON.stringify({ action: "delete_tax_setting", id }) });
    if (result.error) {
      setFeedback({ tone: "error", message: result.error.message || "Tax setting could not be deleted." });
      return;
    }
    await load();
    setFeedback({ tone: "success", message: "Tax setting deleted." });
  }

  async function saveStoreSettings(next: LibraryStoreSettings) {
    setFeedback(null);
    const result = await apiFetch<{ storeSettings: LibraryStoreSettings }>("/api/v1/admin/library", {
      method: "POST",
      body: JSON.stringify({ action: "save_store_settings", settings: next }),
    });
    if (result.error || !result.data?.storeSettings) {
      setFeedback({ tone: "error", message: result.error?.message || "Library store settings could not be saved." });
      return;
    }
    setOperations((current) => ({ ...current, storeSettings: result.data!.storeSettings }));
    setFeedback({ tone: "success", message: "Library store settings saved and now live across checkout, downloads, reviews, SEO, and delivery." });
    await load();
  }

  function openFulfilmentEditor(row: LibraryOperations["fulfilments"][number]) {
    setFulfilmentDraft({ id: row.id, status: row.status, courier: row.courier ?? "", trackingNumber: row.trackingNumber ?? "", trackingUrl: row.trackingUrl ?? "", dispatchNotes: row.dispatchNotes ?? "", deliveryNotes: row.deliveryNotes ?? "" });
  }

  async function saveFulfilment() {
    if (!fulfilmentDraft) return;
    await apiFetch("/api/v1/admin/library", { method: "POST", body: JSON.stringify({ action: "update_fulfilment", ...fulfilmentDraft }) });
    setFulfilmentDraft(null);
    await load();
  }

  function openDownloadAccessEditor(row: LibraryDownloadAccessAdmin) {
    setDownloadAccessDraft({ id: row.id, status: row.status, downloadLimit: row.downloadLimit == null ? "" : String(row.downloadLimit), expiresAt: row.expiresAt ?? "", resetDownloadCount: false });
  }

  async function saveDownloadAccess() {
    if (!downloadAccessDraft) return;
    await apiFetch("/api/v1/admin/library", { method: "POST", body: JSON.stringify({ action: "update_download_access", ...downloadAccessDraft }) });
    setDownloadAccessDraft(null);
    await load();
  }

  async function moderateReview(id: string, status: string, patch: { featured?: boolean; verified?: boolean } = {}) {
    await apiFetch("/api/v1/admin/library", { method: "POST", body: JSON.stringify({ action: "moderate_review", id, status, ...patch }) });
    await load();
  }

  function openManualOrder() {
    setManualOrderDraft({ customerId: "", productId: products[0]?.id ?? source[0]?.id ?? "", quantity: "1", couponCode: "", provider: "manual", referenceNumber: `HL-LIB-MAN-${Date.now()}`, note: "", markPaid: true });
  }

  async function saveManualOrder() {
    if (!manualOrderDraft) return;
    setFeedback(null);
    const result = await apiFetch("/api/v1/admin/library", { method: "POST", body: JSON.stringify({ action: "create_manual_order", customerId: manualOrderDraft.customerId, provider: manualOrderDraft.provider, referenceNumber: manualOrderDraft.referenceNumber, note: manualOrderDraft.note, couponCode: manualOrderDraft.couponCode || undefined, markPaid: manualOrderDraft.markPaid, items: [{ productId: manualOrderDraft.productId, quantity: Number(manualOrderDraft.quantity) || 1 }] }) });
    if (result.error) {
      setFeedback({ tone: "error", message: result.error.message || "Manual order could not be created." });
      return;
    }
    setManualOrderDraft(null);
    await load();
    setFeedback({ tone: "success", message: "Manual Library order created." });
  }

  async function refundOrder() {
    if (!refundDraft) return;
    setFeedback(null);
    const result = await apiFetch("/api/v1/admin/library", { method: "POST", body: JSON.stringify({ action: "refund_order", id: refundDraft.orderId, reason: refundDraft.reason }) });
    if (result.error) {
      setFeedback({ tone: "error", message: result.error.message || "Order could not be refunded." });
      return;
    }
    setRefundDraft(null);
    await load();
    setFeedback({ tone: "success", message: "Order refunded and download access revoked." });
  }

  async function deleteOrder(order: LibraryOrder) {
    const confirmed = window.confirm(
      `Permanently delete ${order.orderNumber}? This removes the order, invoice, fulfilment, downloads, and linked payment. This cannot be undone.`,
    );
    if (!confirmed) return;
    setFeedback(null);
    const result = await apiFetch("/api/v1/admin/library", {
      method: "POST",
      body: JSON.stringify({ action: "delete_order", id: order.id }),
    });
    if (result.error) {
      setFeedback({ tone: "error", message: result.error.message || "Order could not be deleted." });
      return;
    }
    setOrders((current) => current.filter((row) => row.id !== order.id));
    await load();
    setFeedback({ tone: "success", message: `${order.orderNumber} deleted.` });
  }

  async function runPaymentAction() {
    if (!paymentActionDraft) return;
    if ((paymentActionDraft.action === "reject" || paymentActionDraft.action === "refund") && !paymentActionDraft.reason.trim()) {
      setFeedback({ tone: "error", message: "A reason is required for reject/refund." });
      return;
    }
    setFeedback(null);
    const result = await apiFetch(`/api/v1/admin/payments/${paymentActionDraft.paymentId}`, {
      method: "PATCH",
      body: JSON.stringify({
        action: paymentActionDraft.action,
        reason: paymentActionDraft.reason.trim() || undefined,
        note: paymentActionDraft.reason.trim() || undefined,
      }),
    });
    if (result.error) {
      setFeedback({ tone: "error", message: result.error.message || "Payment action failed." });
      return;
    }
    const label = paymentActionDraft.action === "approve" ? "approved" : paymentActionDraft.action === "reject" ? "rejected" : "refunded";
    setPaymentActionDraft(null);
    await load();
    setFeedback({ tone: "success", message: `Library payment ${label}. Customer has been notified.` });
  }

  async function notifyOrder() {
    if (!orderNotifyDraft) return;
    setFeedback(null);
    const result = await apiFetch("/api/v1/admin/library", { method: "POST", body: JSON.stringify({ action: "notify_order", id: orderNotifyDraft.orderId, type: orderNotifyDraft.type, message: orderNotifyDraft.message }) });
    if (result.error) {
      setFeedback({ tone: "error", message: result.error.message || "Notification could not be queued." });
      return;
    }
    setOrderNotifyDraft(null);
    await load();
    setFeedback({ tone: "success", message: "Customer notification queued." });
  }

  async function disableCustomer(userId: string, email: string) {
    if (!userId) {
      setFeedback({ tone: "error", message: "This customer segment is missing a user id, so it cannot be changed safely." });
      return;
    }
    if (!window.confirm(`Disable Library customer ${email}? Their orders and invoices stay for audit history, but login and download access will be revoked.`)) return;
    setFeedback(null);
    const result = await apiFetch("/api/v1/admin/library", { method: "POST", body: JSON.stringify({ action: "disable_customer", userId }) });
    if (result.error) {
      setFeedback({ tone: "error", message: result.error.message || "Customer could not be disabled." });
      return;
    }
    await load();
    setFeedback({ tone: "success", message: "Customer disabled, personal details anonymised, and download access revoked." });
  }

  function viewCustomerOrders(email: string) {
    setOrderFilter("ALL");
    setCustomerFilter(email);
    setView("Orders");
  }

  function openInventoryMovement(product?: LibraryProduct) {
    setInventoryMovementDraft({ productId: product?.id ?? products[0]?.id ?? source[0]?.id ?? "", type: "RESTOCK", quantity: "1", note: "" });
  }

  async function saveInventoryMovement() {
    if (!inventoryMovementDraft) return;
    setFeedback(null);
    const result = await apiFetch("/api/v1/admin/library", { method: "POST", body: JSON.stringify({ action: "inventory_movement", ...inventoryMovementDraft, quantity: Number(inventoryMovementDraft.quantity) }) });
    if (result.error) {
      setFeedback({ tone: "error", message: result.error.message || "Inventory movement could not be saved." });
      return;
    }
    setInventoryMovementDraft(null);
    await load();
    setFeedback({ tone: "success", message: "Inventory movement saved." });
  }

  function openRecommendation(sourceProduct?: LibraryProduct) {
    const first = products[0]?.id ?? source[0]?.id ?? "";
    const second = products.find((product) => product.id !== (sourceProduct?.id ?? first))?.id ?? "";
    setRecommendationDraft({ sourceProductId: sourceProduct?.id ?? first, targetProductId: second, reason: "RELATED", weight: "10", active: true });
  }

  function editRecommendation(row: LibraryRecommendationAdmin) {
    setRecommendationDraft({
      sourceProductId: row.sourceProductId ?? source.find((product) => product.title === row.sourceProduct?.title)?.id ?? "",
      targetProductId: row.targetProductId ?? source.find((product) => product.title === row.targetProduct?.title)?.id ?? "",
      reason: row.reason,
      weight: String(row.weight ?? 10),
      active: row.active ?? true,
    });
  }

  async function saveRecommendation() {
    if (!recommendationDraft) return;
    setFeedback(null);
    const result = await apiFetch("/api/v1/admin/library", { method: "POST", body: JSON.stringify({ action: "save_recommendation", ...recommendationDraft, weight: Number(recommendationDraft.weight) || 0 }) });
    if (result.error) {
      setFeedback({ tone: "error", message: result.error.message || "Recommendation could not be saved." });
      return;
    }
    setRecommendationDraft(null);
    await load();
    setFeedback({ tone: "success", message: "Recommendation saved." });
  }

  async function deleteRecommendation(row: LibraryRecommendationAdmin) {
    const sourceProductId = row.sourceProductId ?? source.find((product) => product.title === row.sourceProduct?.title)?.id;
    const targetProductId = row.targetProductId ?? source.find((product) => product.title === row.targetProduct?.title)?.id;
    if (!sourceProductId || !targetProductId) return;
    if (!window.confirm("Disable this product recommendation?")) return;
    setFeedback(null);
    const result = await apiFetch("/api/v1/admin/library", {
      method: "POST",
      body: JSON.stringify({ action: "save_recommendation", sourceProductId, targetProductId, reason: row.reason, weight: row.weight ?? 0, active: false }),
    });
    if (result.error) {
      setFeedback({ tone: "error", message: result.error.message || "Recommendation could not be disabled." });
      return;
    }
    await load();
    setFeedback({ tone: "success", message: "Recommendation disabled." });
  }

  return (
    <div className="space-y-5">
      <AdminTabStrip tabs={views.map((id) => ({ id, label: id }))} active={view} onChange={setView} />
      {feedback && (
        <div role="status" className={cn("rounded-lg border px-4 py-3 text-sm font-semibold", feedback.tone === "success" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" : "border-red-400/25 bg-red-400/10 text-red-200")}>
          {feedback.message}
        </div>
      )}
      {loadError && !feedback && (
        <div role="alert" className="rounded-lg border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">
          {loadError}
        </div>
      )}

      {view === "Dashboard" && (
        <>
          <AdminMetricGrid cols={6}>
            {(operations.reports.scorecards.length ? operations.reports.scorecards : [
              { label: "Today's Sales", value: analytics.todaySales, detail: "Today", tone: "success" as const },
              { label: "Weekly Sales", value: analytics.weeklySales, detail: "7 days", tone: "info" as const },
              { label: "Monthly Sales", value: analytics.monthlySales, detail: "30 days", tone: "default" as const },
              { label: "Conversion", value: analytics.conversionRate, detail: "View to order", tone: "warning" as const },
            ]).map((card) => (
              <AdminStatPill key={card.label} label={card.label} value={card.label.toLowerCase().includes("rate") || card.label === "Conversion" ? `${card.value}%` : card.label === "Revenue" || card.label === "Average order" ? `USD ${card.value}` : card.value} tone={card.tone} />
            ))}
          </AdminMetricGrid>
          <div className="grid gap-4 xl:grid-cols-2">
            <AdminPanel title="Interactive sales chart" description="Library revenue and order momentum.">
              <BarChart data={operations.reports.revenueTrend.length ? operations.reports.revenueTrend : analytics.salesTrend} color="bg-emerald-500" />
            </AdminPanel>
            <AdminPanel title="Marketplace funnel">
              <BarChart data={operations.reports.funnel} color="bg-cyan-500" />
            </AdminPanel>
            <AdminPanel title="Order status">
              <DonutChart data={operations.reports.orderStatus} />
            </AdminPanel>
            <AdminPanel title="Payment gateways">
              <DonutChart data={operations.reports.paymentGateways} />
            </AdminPanel>
            <AdminPanel title="Top categories">
              <DonutChart data={analytics.topCategories} />
            </AdminPanel>
            <AdminPanel title="Best sellers">
              {analytics.bestSellers.map((item) => <MetricRow key={item.label} label={item.label} value={item.value} delta="downloads" />)}
            </AdminPanel>
            <AdminPanel title="Most viewed">
              {analytics.mostViewed.map((item) => <MetricRow key={item.label} label={item.label} value={item.value} delta="views" />)}
            </AdminPanel>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <AdminPanel title="Recent orders" className="xl:col-span-2">
              <OrdersTable orders={orders} />
            </AdminPanel>
            <AdminPanel title="Stock levels">
              {analytics.stockLevels.map((item) => <MetricRow key={item.label} label={item.label} value={item.value} delta={item.value <= 10 ? "low stock" : "available"} />)}
            </AdminPanel>
          </div>
        </>
      )}

      {view === "Products" && (
        <AdminPanel
          title="Library product management"
          description="Create, edit, duplicate, archive, publish, schedule, bulk price, bulk category, and manage product downloads."
          action={<Button onClick={() => setDraftOpen(true)}><Plus className="size-4" /> Create Product</Button>}
        >
          <AdminToolbar>
            <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <AdminSearchInput value={query} onChange={setQuery} placeholder="Search products, SKU, author, ISBN..." />
              <AdminSelect value={category} onChange={setCategory} options={[{ value: "", label: "All categories" }, ...facets.categories.map((item) => ({ value: item, label: item }))]} />
            </div>
            <div className="flex flex-wrap gap-2">
              <AdminAction icon={Link2} label="Pack wizard" disabled={selectedIds.size < 2} onClick={openPackWizard} />
              <AdminAction icon={Boxes} label="Bulk Price" disabled={!selectedIds.size} onClick={() => setBulkDraft({ mode: "price", value: "" })} />
              <AdminAction icon={Boxes} label="Bulk Category" disabled={!selectedIds.size} onClick={() => setBulkDraft({ mode: "category", value: category || "" })} />
              <AdminAction icon={FileArchive} label="Archive" disabled={!selectedIds.size} onClick={() => void bulk("bulk_archive")} />
              <AdminAction icon={Trash2} label="Bulk Delete" disabled={!selectedIds.size} danger onClick={() => void bulk("bulk_delete")} />
            </div>
          </AdminToolbar>
          <div className="mt-4">
            <AdminDataTable
              rows={products}
              selectable
              selectedIds={selectedIds}
              onToggleSelect={toggle}
              allSelected={products.length > 0 && selectedIds.size === products.length}
              onToggleSelectAll={() => setSelectedIds(selectedIds.size === products.length ? new Set() : new Set(products.map((product) => product.id)))}
              columns={[
                { key: "title", header: "Product", render: (row) => <ProductCell product={row} /> },
                { key: "type", header: "Formats", render: (row) => formatSummary(row) },
                { key: "sample", header: "Sample", render: (row) => <SampleStatus product={row} /> },
                { key: "price", header: "Price", render: (row) => priceSummary(row) },
                { key: "status", header: "Status", render: (row) => <AdminStatusBadge status={row.status} variant={row.status === "PUBLISHED" ? "success" : row.status === "SCHEDULED" ? "warning" : "muted"} /> },
                { key: "stock", header: "Inventory", render: (row) => {
                  const formats = enabledLibraryFormats(row);
                  const hasPrint = formats.some((format) => format.type === "PRINTED_BOOK");
                  const hasDigital = formats.some((format) => format.type !== "PRINTED_BOOK");
                  if (hasPrint && hasDigital) return row.stock == null ? "Digital + print stock TBA" : `Digital + ${row.stock} print`;
                  if (hasPrint) return row.stock == null ? "Print available" : `${row.stock} print units`;
                  return "Unlimited digital";
                } },
                { key: "actions", header: "Actions", render: (row) => <div className="flex flex-wrap gap-2"><IconButton icon={Edit3} label="Edit" onClick={() => openEditor(row)} /><IconButton icon={ExternalLink} label="Preview" onClick={() => setPreviewProduct(row)} /><IconButton icon={Copy} label="Duplicate" onClick={() => void duplicate(row.id)} /><IconButton icon={Trash2} label="Delete" danger onClick={() => void deleteProduct(row.id)} /><button type="button" onClick={() => void setProductStatus(row, row.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED")} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/5">{row.status === "PUBLISHED" ? "Draft" : "Publish"}</button></div> },
              ]}
            />
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <section className="min-w-0">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Product performance</h3>
              <p className="mt-1 text-xs text-slate-500">Database-backed revenue, units, downloads, views, conversion, and merchandising health.</p>
              <div className="mt-3">
              <ProductPerformanceTable rows={operations.reports.productPerformance} products={source} onEditProduct={openEditor} onRecommend={openRecommendation} />
              </div>
            </section>
            <section className="min-w-0">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Product health signals</h3>
              <p className="mt-1 text-xs text-slate-500">Publishing, SEO, media, files, reviews, and stock completeness.</p>
              <OperationsList title="Needs attention" rows={operations.reports.productPerformance.filter((row) => row.health < 80).map((row) => ({ label: row.title, value: `${row.health}%`, detail: row.health < 60 ? "Add files, SEO, media, or reviews." : "Polish merchandising details." }))} />
            </section>
          </div>
        </AdminPanel>
      )}

      {view === "Orders" && (
        <AdminPanel title="Library orders" description="Order queue, fulfilment, payment state, invoices, and customer confirmations." action={<Button onClick={openManualOrder}><Plus className="size-4" /> Manual Order</Button>}>
          <PaymentProofQueue
            orders={orders}
            onApprovePayment={(order) => order.paymentId && setPaymentActionDraft({ paymentId: order.paymentId, orderNumber: order.orderNumber, action: "approve", reason: "Payment verified" })}
            onRejectPayment={(order) => order.paymentId && setPaymentActionDraft({ paymentId: order.paymentId, orderNumber: order.orderNumber, action: "reject", reason: "" })}
          />
          <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_14rem_12rem]">
            <MiniMetricGrid rows={[{ label: "Refunded", value: operations.reports.refundSummary.orders, detail: `USD ${operations.reports.refundSummary.amount.toFixed(2)}` }, { label: "Refund rate", value: `${operations.reports.refundSummary.rate}%`, detail: "Order quality signal" }, { label: "Fulfilments", value: operations.fulfilments.length, detail: "Printed order queue" }]} />
            <AdminSearchInput value={customerFilter} onChange={setCustomerFilter} placeholder="Customer or order..." />
            <AdminSelect value={orderFilter} onChange={setOrderFilter} options={[{ value: "ALL", label: "All statuses" }, ...Array.from(new Set(orders.map((order) => order.status))).map((status) => ({ value: status, label: status }))]} />
          </div>
          <OrdersTable orders={(orderFilter === "ALL" ? orders : orders.filter((order) => order.status === orderFilter)).filter((order) => {
            const q = customerFilter.trim().toLowerCase();
            return !q || [order.orderNumber, order.customerName, order.customerEmail, order.status].join(" ").toLowerCase().includes(q);
          })}
            onNotify={(order) => setOrderNotifyDraft({ orderId: order.id, type: "invoice", message: "" })}
            onRefund={(order) => setRefundDraft({ orderId: order.id, reason: "Customer refund / admin adjustment" })}
            onApprovePayment={(order) => order.paymentId && setPaymentActionDraft({ paymentId: order.paymentId, orderNumber: order.orderNumber, action: "approve", reason: "Payment verified" })}
            onRejectPayment={(order) => order.paymentId && setPaymentActionDraft({ paymentId: order.paymentId, orderNumber: order.orderNumber, action: "reject", reason: "" })}
            onRefundPayment={(order) => order.paymentId && setPaymentActionDraft({ paymentId: order.paymentId, orderNumber: order.orderNumber, action: "refund", reason: "" })}
            onDelete={(order) => void deleteOrder(order)}
          />
          <FulfilmentTable rows={operations.fulfilments} onEdit={openFulfilmentEditor} />
          <OperationsList title="Invoices" rows={operations.invoices.map((item) => ({ label: item.invoiceNumber, value: `${item.currency} ${Number(item.total).toFixed(2)}`, detail: item.order?.orderNumber ?? "Library invoice", href: item.orderId ? `/api/v1/library/orders/${item.orderId}/invoice` : undefined }))} />
        </AdminPanel>
      )}

      {["Categories", "Collections", "Authors", "Customers", "Reviews", "Coupons", "Downloads", "Inventory", "Reports", "Analytics", "Settings"].includes(view) && (
        <AdminPanel
          title={`Library ${view}`}
          description={sectionDescription(view)}
          action={
            view === "Reports" || view === "Analytics" ? (
              <Button onClick={() => void createExport(view.toLowerCase())}>Create Export</Button>
            ) : view === "Settings" ? (
              <Button onClick={() => openTaxEditor()}><Plus className="size-4" /> Add Tax Rule</Button>
            ) : view === "Coupons" ? (
              <Button onClick={() => openCouponEditor()}><Plus className="size-4" /> Create Coupon</Button>
            ) : ["Categories", "Collections", "Authors"].includes(view) ? (
              <Button onClick={() => openTaxonomyEditor(view === "Categories" ? "category" : view === "Collections" ? "collection" : "author")}><Plus className="size-4" /> Create {view.slice(0, -1)}</Button>
            ) : ["Downloads", "Inventory"].includes(view) ? (
              <Button onClick={() => createForView()}>
                <Plus className="size-4" /> Create Product
              </Button>
            ) : undefined
          }
        >
          <LibraryTabManagement
            view={view}
            products={source}
            orders={orders}
            analytics={analytics}
            operations={operations}
            orderFilter={orderFilter}
            customerFilter={customerFilter}
            reportFilter={reportFilter}
            onEditProduct={openEditor}
            onDeleteProduct={deleteProduct}
            onSetProductStatus={setProductStatus}
            onRenameGroup={openGroupEditor}
            onDeleteGroup={deleteProductGroup}
            onCreateExport={createExport}
            onEditCoupon={openCouponEditor}
            onDeleteCoupon={deleteCoupon}
            onEditTaxSetting={openTaxEditor}
            onDeleteTaxSetting={deleteTaxSetting}
            onSaveStoreSettings={saveStoreSettings}
            onEditTaxonomy={openTaxonomyEditor}
            onDeleteTaxonomy={deleteTaxonomy}
            onDeleteExport={deleteExport}
            onEditDownloadAccess={openDownloadAccessEditor}
            onModerateReview={moderateReview}
            onOpenInventoryMovement={openInventoryMovement}
            onOpenRecommendation={openRecommendation}
            onEditRecommendation={editRecommendation}
            onDeleteRecommendation={deleteRecommendation}
            onCustomerFilterChange={setCustomerFilter}
            onViewCustomerOrders={viewCustomerOrders}
            onDisableCustomer={disableCustomer}
            onReportFilterChange={setReportFilter}
            onUpdateQuoteRequest={updateQuoteRequestStatus}
          />
          {view === "Settings" && (
            <div className="mt-5 rounded-xl border border-white/[0.08] bg-slate-950/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">Library document storage</p>
                  <p className="mt-1 text-xs text-slate-500">Checks whether PDF uploads can be accepted and served publicly for samples and buyer files.</p>
                </div>
                <Button variant="secondary" onClick={() => void checkLibraryStorage()}>
                  <Upload className="size-4" /> Check storage
                </Button>
              </div>
              <UploadInlineStatus status={storageStatus ?? undefined} />
            </div>
          )}
          {view === "Reports" && <OperationsList title="Export jobs" rows={operations.exports.map((item) => ({ label: item.type, value: item.status, detail: item.fileUrl ? "Ready to download" : "Preparing export", href: item.fileUrl ?? undefined }))} />}
          {view === "Analytics" && <OperationsList title="Activity timeline" rows={operations.activities.map((item) => ({ label: item.action, value: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Now", detail: item.message }))} />}
          {view === "Customers" && (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setGuestClaimDraft({ orderId: orders[0]?.id ?? "", email: "" })}>
                  <Plus className="size-4" /> Issue guest claim
                </Button>
              </div>
              <div className="mt-5 rounded-xl border border-white/[0.08] bg-slate-950/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-white">Guest claim queue</p>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-300">{operations.guestClaims.length}</span>
                </div>
                <div className="mt-3 grid gap-2">
                  {operations.guestClaims.length ? operations.guestClaims.slice(0, 12).map((claim) => (
                    <div key={claim.id} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-100">{claim.email}</p>
                          <p className="mt-1 text-xs text-slate-500">{claim.order?.orderNumber ?? "Library order"} · {claim.status}</p>
                        </div>
                        {claim.status === "PENDING" && (
                          <div className="flex shrink-0 gap-2">
                            <button type="button" onClick={() => void moderateGuestClaim(claim.id, "approve_guest_claim")} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-white/5">Approve</button>
                            <button type="button" onClick={() => void moderateGuestClaim(claim.id, "reject_guest_claim")} className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/10">Reject</button>
                          </div>
                        )}
                      </div>
                    </div>
                  )) : (
                    <p className="rounded-lg border border-dashed border-white/[0.08] p-3 text-sm text-slate-500">No guest claims yet. Issue one from an order email.</p>
                  )}
                </div>
              </div>
            </>
          )}
          {view === "Inventory" && <OperationsList title="Inventory movements" rows={operations.reports.inventoryMovements.map((item) => ({ label: item.productTitle, value: `${item.type} ${item.quantity > 0 ? "+" : ""}${item.quantity}`, detail: item.note ?? new Date(item.createdAt).toLocaleDateString() }))} />}
          {view === "Downloads" && <OperationsList title="Course entitlement bridge" rows={operations.academyEntitlements.map((item) => ({ label: item.courseId, value: item.status, detail: item.userId }))} />}
        </AdminPanel>
      )}

      {draftOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={closeEditor}>
          <div className="flex max-h-[92dvh] w-full max-w-6xl min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
              <div>
                <h2 className="text-lg font-semibold text-white">{editingProduct ? "Edit Library Product" : "Create Library Product"}</h2>
                <p className="mt-1 text-sm text-slate-400">Full product setup for pricing, publishing, content, files, SEO, inventory, and storefront merchandising.</p>
              </div>
              <button type="button" onClick={closeEditor} className="rounded-lg p-2 text-slate-400 hover:bg-white/5" aria-label="Close editor"><X className="size-4" /></button>
            </div>
            <div className="min-w-0 overflow-y-auto overflow-x-hidden p-5">
              <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
                <div className="min-w-0 space-y-5">
                  <EditorSection title="Product basics">
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Title" value={draft.title} onChange={(value) => setDraft({ ...draft, title: value })} required className="md:col-span-2" />
                      <Field label="Subtitle" value={draft.subtitle} onChange={(value) => setDraft({ ...draft, subtitle: value })} className="md:col-span-2" />
                      <Field label="Slug" value={draft.slug} onChange={(value) => setDraft({ ...draft, slug: value })} placeholder="Auto-generated from title if empty" />
                      <Field label="SKU" value={draft.sku} onChange={(value) => setDraft({ ...draft, sku: value })} placeholder="Auto-generated if empty" />
                      <CreatableSelectField label="Author" value={draft.author} onChange={(value) => setDraft({ ...draft, author: value })} options={taxonomyOptions.authors} placeholder="Select or create an author" />
                      <Field label="Publisher" value={draft.publisher} onChange={(value) => setDraft({ ...draft, publisher: value })} />
                      <CreatableSelectField label="Category" value={draft.category} onChange={(value) => setDraft({ ...draft, category: value })} options={taxonomyOptions.categories} placeholder="Select or create a category" />
                      <CreatableSelectField label="Collection" value={draft.collection} onChange={(value) => setDraft({ ...draft, collection: value })} options={taxonomyOptions.collections} placeholder="Select or create a collection" />
                    </div>
                  </EditorSection>

                  <EditorSection title="Descriptions and learning content">
                    <div className="grid gap-3">
                      <Field label="Short description" value={draft.shortDescription} onChange={(value) => setDraft({ ...draft, shortDescription: value })} placeholder="Short storefront summary" />
                      <TextAreaField label="Full description" value={draft.description} onChange={(value) => setDraft({ ...draft, description: value })} required />
                      <TextAreaField label="Table of contents" value={draft.tableOfContentsText} onChange={(value) => setDraft({ ...draft, tableOfContentsText: value })} placeholder="One chapter per line" />
                      <TextAreaField label="Learning outcomes" value={draft.learningOutcomesText} onChange={(value) => setDraft({ ...draft, learningOutcomesText: value })} placeholder="One outcome per line" />
                      <TextAreaField label="Who this is for" value={draft.whoThisIsForText} onChange={(value) => setDraft({ ...draft, whoThisIsForText: value })} placeholder="One audience per line" />
                      <TextAreaField label="Requirements" value={draft.requirementsText} onChange={(value) => setDraft({ ...draft, requirementsText: value })} placeholder="One requirement per line" />
                      <Field label="Tags" value={draft.tagsText} onChange={(value) => setDraft({ ...draft, tagsText: value })} placeholder="Comma separated tags" />
                    </div>
                  </EditorSection>

                  <EditorSection title="SEO">
                    <div className="grid gap-3">
                      <Field label="Focus keyphrase" value={draft.seoFocusKeyword} onChange={(value) => setDraft({ ...draft, seoFocusKeyword: value })} placeholder="Primary search phrase for this product" />
                      <Field label="SEO title" value={draft.seoTitle} onChange={(value) => setDraft({ ...draft, seoTitle: value })} placeholder="Search result title" />
                      <SeoLengthHint length={draft.seoTitle.length} ideal={60} softMax={70} />
                      <Field label="Slug" value={draft.slug} onChange={(value) => setDraft({ ...draft, slug: value })} placeholder="URL slug" />
                      <TextAreaField label="Meta description" value={draft.metaDescription} onChange={(value) => setDraft({ ...draft, metaDescription: value })} placeholder="Search result summary" />
                      <SeoLengthHint length={draft.metaDescription.length} ideal={155} softMax={165} />
                      <Field label="Social / OG image URL" value={draft.seoImageUrl} onChange={(value) => setDraft({ ...draft, seoImageUrl: value })} placeholder="Defaults to cover image if empty" />
                      <div className="rounded-lg border border-white/10 bg-slate-900/60 p-3 text-sm text-slate-300">
                        <p className="text-xs font-black uppercase tracking-wide text-emerald-300">Search preview</p>
                        <p className="mt-2 text-base font-semibold text-[#8ab4f8]">{draft.seoTitle.trim() || draft.title.trim() || "Product title"}</p>
                        <p className="mt-1 text-xs text-emerald-400">houselink.co.zw/library/{draft.slug.trim() || "product-slug"}</p>
                        <p className="mt-1 text-sm text-slate-400">{draft.metaDescription.trim() || draft.shortDescription.trim() || "Meta description will appear here."}</p>
                      </div>
                    </div>
                  </EditorSection>

                  <EditorSection title="Files and media">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="rounded-lg border border-dashed border-white/10 p-3 text-sm text-slate-300">
                        <span className="flex items-center gap-2 font-semibold"><Upload className="size-4" /> Upload cover/gallery</span>
                        <input type="file" accept="image/*" className="mt-2 block w-full text-xs" onChange={(event) => void uploadAsset(event.currentTarget.files, "cover", event.currentTarget)} />
                        <UploadInlineStatus status={uploadStatus.cover} />
                      </label>
                      <label className={`rounded-lg border border-dashed p-3 text-sm text-slate-300 ${draft.formats.some((format) => format.enabled && format.type !== "PRINTED_BOOK") && !draft.downloads.some((file) => Boolean((file as LibraryDraftDownload).fileUrl)) ? "border-amber-400/50 bg-amber-500/5" : "border-white/10"}`}>
                        <span className="flex items-center gap-2 font-semibold">
                          <Upload className="size-4" /> Upload full download
                          {draft.formats.some((format) => format.enabled && format.type !== "PRINTED_BOOK") ? <span className="text-emerald-300">*</span> : null}
                        </span>
                        <p className="mt-1 text-xs text-slate-500">
                          Required to publish digital formats. Buyer file after purchase (PDF, DOCX, ZIP, etc.).
                        </p>
                        <input type="file" accept=".pdf,.docx,.xlsx,.pptx,.zip" className="mt-2 block w-full text-xs" onChange={(event) => void uploadAsset(event.currentTarget.files, "download", event.currentTarget)} />
                        <UploadInlineStatus status={uploadStatus.download} />
                      </label>
                      <div className="rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-slate-300 sm:col-span-2">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <span className="flex items-center gap-2 font-semibold"><FileText className="size-4 text-emerald-300" /> Sample PDF (optional)</span>
                            {preparedSample ? (
                              <p className="mt-1 text-xs font-semibold text-emerald-200">
                                Prepared sample available: {preparedSample.size}, {preparedSample.pages} pages.
                              </p>
                            ) : null}
                          </div>
                          {preparedSample ? (
                            <button
                              type="button"
                              onClick={() => attachPreparedSample(preparedSample)}
                              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/10"
                            >
                              <FileText className="size-4" /> Use prepared sample
                            </button>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Upload a short preview PDF if available. This powers “Read sample” on the product page. Leave empty if you do not have a sample.
                        </p>
                        <input type="file" accept=".pdf,application/pdf" className="mt-2 block w-full text-xs" onChange={(event) => void uploadAsset(event.currentTarget.files, "sample", event.currentTarget)} />
                        <UploadInlineStatus status={uploadStatus.sample} />
                      </div>
                    </div>
                    {(draft.gallery.length > 0 || draft.downloads.length > 0 || draft.sampleFile) && (
                      <div className="mt-3 grid gap-2 rounded-lg border border-white/10 p-3 text-xs text-slate-400">
                        {draft.gallery.map((item, index) => <AssetRow key={`${item.url}-${index}`} label={`Cover/gallery: ${item.label}`} canMoveUp={index > 0} canMoveDown={index < draft.gallery.length - 1} onMoveUp={() => setDraft((current) => ({ ...current, gallery: moveItem(current.gallery, index, index - 1) }))} onMoveDown={() => setDraft((current) => ({ ...current, gallery: moveItem(current.gallery, index, index + 1) }))} onRemove={() => setDraft((current) => ({ ...current, gallery: current.gallery.filter((_, itemIndex) => itemIndex !== index) }))} />)}
                        {draft.sampleFile ? (
                          <AssetRow
                            label={`Sample preview: ${draft.sampleFile.label} (${draft.sampleFile.fileType})`}
                            details={[
                              draft.sampleFile.fileName ? `File: ${draft.sampleFile.fileName}` : "",
                              draft.sampleFile.size || draft.sampleFile.fileSizeBytes ? `Size: ${draft.sampleFile.size || formatUploadSize(draft.sampleFile.fileSizeBytes ?? 0)}` : "",
                              editingProduct ? "Saved sample will remain public after you save product changes." : "Save the product to make this sample public.",
                            ].filter(Boolean)}
                            verification={fileVerification[fileVerificationKey(draft.sampleFile)]}
                            onOpen={draft.sampleFile.fileUrl ? () => window.open(draft.sampleFile?.fileUrl, "_blank", "noopener,noreferrer") : undefined}
                            onVerify={() => draft.sampleFile && void verifyLibraryFile(draft.sampleFile)}
                            onRemove={() => setDraft((current) => ({ ...current, sampleFile: null }))}
                          />
                        ) : null}
                        {draft.downloads.map((item, index) => <AssetRow key={`${item.id}-${index}`} label={`Full download: ${item.label} (${item.fileType})`} canMoveUp={index > 0} canMoveDown={index < draft.downloads.length - 1} verification={fileVerification[fileVerificationKey(item)]} onMoveUp={() => setDraft((current) => ({ ...current, downloads: moveItem(current.downloads, index, index - 1) }))} onMoveDown={() => setDraft((current) => ({ ...current, downloads: moveItem(current.downloads, index, index + 1) }))} onVerify={() => void verifyLibraryFile(item)} onRemove={() => setDraft((current) => ({ ...current, downloads: current.downloads.filter((_, itemIndex) => itemIndex !== index) }))} />)}
                      </div>
                    )}
                  </EditorSection>
                </div>

                <aside className="min-w-0 space-y-5">
                  <EditorSection title="Pricing & formats">
                    <div className="grid gap-3">
                      <Field label="Currency" value={draft.currency} onChange={(value) => setDraft({ ...draft, currency: value })} />
                      {draft.formats.map((format) => (
                        <div key={format.id} className="rounded-lg border border-white/10 bg-slate-900/50 p-3">
                          <ToggleField
                            label={format.label}
                            checked={format.enabled}
                            onChange={(value) => setDraft((current) => ({
                              ...current,
                              formats: current.formats.map((item) => item.id === format.id ? { ...item, enabled: value } : item),
                            }))}
                          />
                          {format.enabled && (
                            <div className="mt-3 grid gap-2">
                              {format.id === "digital" && (
                                <SelectField
                                  label="Digital type"
                                  value={format.type}
                                  onChange={(value) => setDraft((current) => ({
                                    ...current,
                                    formats: current.formats.map((item) => item.id === format.id ? { ...item, type: value as LibraryProductFormat["type"], label: value === "DIGITAL_BOOK" ? "Digital book" : "Digital PDF" } : item),
                                  }))}
                                  options={["PDF", "DIGITAL_BOOK"]}
                                />
                              )}
                              <Field
                                label={`${format.label} price (selling)`}
                                value={String(format.price)}
                                onChange={(value) => setDraft((current) => ({
                                  ...current,
                                  formats: current.formats.map((item) => item.id === format.id ? { ...item, price: Number(value) || 0 } : item),
                                }))}
                                type="number"
                                required
                              />
                              <Field
                                label="Compare-at / was price (promo)"
                                value={format.compareAtPrice == null ? "" : String(format.compareAtPrice)}
                                onChange={(value) => setDraft((current) => ({
                                  ...current,
                                  formats: current.formats.map((item) => item.id === format.id ? { ...item, compareAtPrice: value.trim() ? Number(value) : undefined } : item),
                                }))}
                                type="number"
                                placeholder="e.g. 25 when selling at 15"
                              />
                              <p className="text-[11px] leading-4 text-slate-500">
                                Optional Woo-style promo: set a higher “was” price to show a strikethrough publicly. Leave blank for no sale badge.
                              </p>
                              {format.compareAtPrice != null
                                && Number.isFinite(Number(format.compareAtPrice))
                                && Number(format.compareAtPrice) > 0
                                && Number(format.compareAtPrice) <= Number(format.price) && (
                                <p className="text-[11px] text-amber-300">
                                  Compare-at must be higher than the selling price to display as a promotion.
                                </p>
                              )}
                              {format.type === "PRINTED_BOOK" ? (
                                <PrintedVolumeTiersEditor
                                  currency={draft.currency.trim() || "USD"}
                                  basePrice={Number(format.price) || 0}
                                  tiers={format.volumeTiers ?? []}
                                  onChange={(volumeTiers) =>
                                    setDraft((current) => ({
                                      ...current,
                                      formats: current.formats.map((item) =>
                                        item.id === format.id ? { ...item, volumeTiers } : item,
                                      ),
                                    }))
                                  }
                                />
                              ) : null}
                            </div>
                          )}
                        </div>
                      ))}
                      {!draft.formats.some((format) => format.enabled) && (
                        <p className="text-xs text-amber-300">Enable at least one format before publishing.</p>
                      )}
                      {draft.formats.some((format) => format.enabled && format.type !== "PRINTED_BOOK") && !draft.downloads.some((file) => Boolean((file as LibraryDraftDownload).fileUrl)) && (
                        <p className="text-xs text-amber-300">Upload at least one download file before publishing a digital format.</p>
                      )}
                    </div>
                  </EditorSection>

                  <EditorSection title="Frequently bought together">
                    {(() => {
                      const currency = draft.currency.trim() || "USD";
                      const promo = draft.bundlePromoPrice.trim() ? Number(draft.bundlePromoPrice) : null;
                      const mainPreview = {
                        formats: draft.formats,
                        productType: draft.productType as LibraryProduct["productType"],
                        price: Number(draft.price) || 0,
                        compareAtPrice: draft.compareAtPrice.trim() ? Number(draft.compareAtPrice) : undefined,
                        sku: draft.sku,
                        currency,
                      };
                      const companionPreview = draft.bundleProductIds
                        .map((id) => productsSource.find((product) => product.id === id))
                        .filter((product): product is LibraryProduct => Boolean(product));
                      const previewProducts = [mainPreview, ...companionPreview];
                      const digital = estimateLibraryBundleScenario(previewProducts, "digital", promo);
                      const digitalList = estimateLibraryBundleScenario(previewProducts, "digital", null);
                      const printList = estimateLibraryBundleScenario(previewProducts, "print", null);
                      const suggestedDigitalPromo = Math.round(digitalList.subtotal * 0.9 * 100) / 100;
                      const query = bundleCompanionQuery.trim().toLowerCase();
                      const publishedCompanions = productsSource.filter(
                        (product) => product.id !== editingProduct?.id && product.status === "PUBLISHED",
                      );
                      const filteredCompanions = publishedCompanions.filter((product) => {
                        const printEnabled = enabledLibraryFormats(product).some((format) => format.type === "PRINTED_BOOK");
                        const printOos = printEnabled && !libraryFormatInStock(product, { type: "PRINTED_BOOK" });
                        if (hidePrintOosCompanions && printOos) return false;
                        if (!query) return true;
                        const haystack = [
                          product.title,
                          product.author,
                          product.sku,
                          product.category,
                          ...enabledLibraryFormats(product).map((format) => format.label),
                        ]
                          .join(" ")
                          .toLowerCase();
                        return haystack.includes(query);
                      });
                      const selectedCompanions = draft.bundleProductIds
                        .map((id) => publishedCompanions.find((product) => product.id === id))
                        .filter((product): product is LibraryProduct => Boolean(product));
                      const promoOnlyHelpsPrint =
                        promo != null &&
                        Number.isFinite(promo) &&
                        promo > 0 &&
                        promo >= digitalList.subtotal - 0.001 &&
                        promo < printList.subtotal - 0.001;
                      return (
                    <div className="grid min-w-0 max-w-full gap-3 overflow-hidden">
                      <p className="text-xs leading-5 text-slate-500">
                        Tick up to 4 companions. Shoppers can still choose digital or print per title. The promo total is for soft copy only — if any printed format is selected, list prices apply.
                      </p>
                      {selectedCompanions.length > 0 ? (
                        <div className="min-w-0 space-y-1.5">
                          {selectedCompanions.map((product, index) => (
                            <div
                              key={`selected-${product.id}`}
                              className="flex min-w-0 max-w-full items-start gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5"
                            >
                              <span className="min-w-0 flex-1 break-words text-[11px] font-semibold leading-4 text-emerald-200 [overflow-wrap:anywhere]" title={product.title}>
                                {index + 1}. {product.title}
                              </span>
                              <div className="flex shrink-0 items-center gap-0.5">
                                <button
                                  type="button"
                                  className="rounded px-1 py-0.5 text-[10px] font-bold text-slate-300 hover:bg-white/10 disabled:opacity-30"
                                  disabled={index === 0}
                                  onClick={() => moveBundleCompanion(product.id, -1)}
                                  title="Move up"
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  className="rounded px-1 py-0.5 text-[10px] font-bold text-slate-300 hover:bg-white/10 disabled:opacity-30"
                                  disabled={index === selectedCompanions.length - 1}
                                  onClick={() => moveBundleCompanion(product.id, 1)}
                                  title="Move down"
                                >
                                  ↓
                                </button>
                                <button
                                  type="button"
                                  className="rounded px-1 py-0.5 text-[11px] font-bold text-emerald-200 hover:bg-white/10"
                                  onClick={() =>
                                    setDraft((current) => ({
                                      ...current,
                                      bundleProductIds: current.bundleProductIds.filter((id) => id !== product.id),
                                    }))
                                  }
                                  title="Remove from bundle"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                          <span className="text-[11px] text-slate-500">
                            {draft.bundleProductIds.length}/4 selected · order shown on the product page
                          </span>
                        </div>
                      ) : null}
                      <label className="grid min-w-0 gap-1.5 text-sm">
                        <span className="font-semibold text-slate-300">Search companions</span>
                        <input
                          value={bundleCompanionQuery}
                          onChange={(event) => setBundleCompanionQuery(event.target.value)}
                          placeholder="Filter by title, author, SKU…"
                          className="w-full min-w-0 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500"
                        />
                      </label>
                      <label className="flex min-w-0 items-start gap-2 text-[11px] leading-4 text-slate-400">
                        <input
                          type="checkbox"
                          className="mt-0.5 shrink-0 accent-emerald-600"
                          checked={hidePrintOosCompanions}
                          onChange={(event) => setHidePrintOosCompanions(event.target.checked)}
                        />
                        <span className="min-w-0 break-words">Hide companions with printed format out of stock</span>
                      </label>
                      <div className="max-h-56 min-w-0 max-w-full space-y-2 overflow-y-auto overflow-x-hidden rounded-lg border border-white/10 p-2">
                        {filteredCompanions.map((product) => {
                            const checked = draft.bundleProductIds.includes(product.id);
                            const disabled = !checked && draft.bundleProductIds.length >= 4;
                            const printEnabled = enabledLibraryFormats(product).some((format) => format.type === "PRINTED_BOOK");
                            const printOos = printEnabled && !libraryFormatInStock(product, { type: "PRINTED_BOOK" });
                            return (
                              <label
                                key={product.id}
                                className={`flex min-w-0 max-w-full cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-sm transition hover:bg-white/5 ${disabled ? "opacity-40" : ""}`}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-1 shrink-0"
                                  checked={checked}
                                  disabled={disabled}
                                  onChange={() => {
                                    setDraft((current) => ({
                                      ...current,
                                      bundleProductIds: checked
                                        ? current.bundleProductIds.filter((id) => id !== product.id)
                                        : [...current.bundleProductIds, product.id].slice(0, 4),
                                    }));
                                  }}
                                />
                                <span className="min-w-0 flex-1 overflow-hidden">
                                  <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                                    <span className="break-words font-semibold text-slate-100">{product.title}</span>
                                    {printOos ? (
                                      <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
                                        Print OOS
                                      </span>
                                    ) : null}
                                  </span>
                                  <span className="mt-0.5 block break-words text-[11px] text-slate-500">
                                    {enabledLibraryFormats(product)
                                      .map((format) => `${format.label} ${product.currency} ${format.price.toFixed(2)}`)
                                      .join(" · ") || `${product.currency} ${product.price.toFixed(2)}`}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        {publishedCompanions.length === 0 && (
                          <p className="px-2 py-3 text-xs text-slate-500">Publish other products first, then pick them here for the bundle.</p>
                        )}
                        {publishedCompanions.length > 0 && filteredCompanions.length === 0 && (
                          <p className="px-2 py-3 text-xs text-slate-500">No published products match “{bundleCompanionQuery.trim()}”.</p>
                        )}
                      </div>
                      <SelectField
                        label="Default companion formats"
                        value={draft.bundleFormatPreference}
                        onChange={(value) =>
                          setDraft({
                            ...draft,
                            bundleFormatPreference: (["MATCH_SHOPPER", "PREFER_DIGITAL", "PREFER_PRINT"].includes(value)
                              ? value
                              : "MATCH_SHOPPER") as LibraryBundleFormatPreference,
                          })
                        }
                        options={["PREFER_DIGITAL", "MATCH_SHOPPER", "PREFER_PRINT"]}
                        optionLabels={{
                          PREFER_DIGITAL: "Prefer digital / soft copy (recommended)",
                          MATCH_SHOPPER: "Match shopper’s format",
                          PREFER_PRINT: "Prefer printed book",
                        }}
                        hint="Recommended: prefer digital so the soft-copy deal shows first. Shoppers can still switch formats on the product page."
                      />
                      <Field
                        label="Soft-copy bundle promo total (optional)"
                        value={draft.bundlePromoPrice}
                        onChange={(value) => setDraft({ ...draft, bundlePromoPrice: value })}
                        type="number"
                        placeholder={
                          draft.bundleProductIds.length
                            ? `e.g. ${suggestedDigitalPromo.toFixed(2)} for ~10% off digital`
                            : "e.g. 39 when full digital bundle is 45"
                        }
                      />
                      <p className="text-[11px] leading-4 text-slate-500">
                        Aim about 5–15% under the digital list total. Soft-copy only — printed picks stay at list price. Use printed volume tiers or the quote inbox for bulk print.
                      </p>
                      {draft.bundleProductIds.length > 0 ? (
                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs leading-5 text-slate-300">
                          <p className="font-semibold text-emerald-300">Live bundle preview</p>
                          <p className="mt-1.5">
                            Soft copy (digital):{" "}
                            <span className="font-semibold text-white">
                              {currency} {digitalList.subtotal.toFixed(2)}
                            </span>
                            {digital.savings > 0 ? (
                              <span className="text-emerald-300">
                                {" "}
                                → promo {currency} {digital.total.toFixed(2)} (save {currency} {digital.savings.toFixed(2)})
                              </span>
                            ) : promo != null && Number.isFinite(promo) && promo > 0 ? (
                              <span className="text-slate-500"> · promo not below digital total yet</span>
                            ) : null}
                          </p>
                          <p className="mt-1">
                            Printed / mixed with print:{" "}
                            <span className="font-semibold text-white">
                              {currency} {printList.subtotal.toFixed(2)}
                            </span>
                            <span className="text-slate-500"> · list prices (soft-copy promo off)</span>
                          </p>
                          {digitalList.subtotal > 0 ? (
                            <button
                              type="button"
                              className="mt-2 text-[11px] font-semibold text-emerald-300 hover:text-emerald-200"
                              onClick={() =>
                                setDraft((current) => ({
                                  ...current,
                                  bundlePromoPrice: suggestedDigitalPromo.toFixed(2),
                                  bundleFormatPreference: "PREFER_DIGITAL",
                                }))
                              }
                            >
                              Use suggested digital promo ({currency} {suggestedDigitalPromo.toFixed(2)} · ~10% off soft copy)
                            </button>
                          ) : null}
                          {promoOnlyHelpsPrint ? (
                            <p className="mt-1.5 text-[11px] text-amber-300">
                              This promo is above the soft-copy total, so digital shoppers won’t see a Save. Lower it below {currency} {digitalList.subtotal.toFixed(2)} for a soft-copy deal.
                            </p>
                          ) : null}
                          <p className="mt-1.5 text-[11px] text-slate-500">
                            Companions are shared; shoppers pick format on the product page. Promo unlocks only when every selected format is digital.
                          </p>
                        </div>
                      ) : (
                        <p className="text-[11px] leading-4 text-slate-500">
                          Leave promo blank for no discount. Pick companions to see live soft-copy and print totals.
                        </p>
                      )}
                    </div>
                      );
                    })()}
                  </EditorSection>

                  <EditorSection title="Publishing">
                    <div className="grid gap-3">
                      <SelectField label="Status" value={draft.status} onChange={(value) => setDraft({ ...draft, status: value })} options={productStatuses} />
                      {draft.status === "SCHEDULED" && (
                        <Field
                          label="Go live at"
                          value={draft.scheduledAt}
                          onChange={(value) => setDraft({ ...draft, scheduledAt: value })}
                          type="datetime-local"
                        />
                      )}
                      <SelectField label="Difficulty" value={draft.difficulty} onChange={(value) => setDraft({ ...draft, difficulty: value })} options={["Beginner", "Intermediate", "Advanced", "Professional"]} />
                      <ToggleField label="Featured" checked={draft.featured} onChange={(value) => setDraft({ ...draft, featured: value })} />
                      <ToggleField label="Best seller" checked={draft.bestSeller} onChange={(value) => setDraft({ ...draft, bestSeller: value })} />
                      <ToggleField label="New release" checked={draft.newRelease} onChange={(value) => setDraft({ ...draft, newRelease: value })} />
                      <ToggleField label="Editor's choice" checked={draft.editorsChoice} onChange={(value) => setDraft({ ...draft, editorsChoice: value })} />
                      <ToggleField label="Coming soon" checked={draft.comingSoon} onChange={(value) => setDraft({ ...draft, comingSoon: value })} />
                      <ToggleField label="Allow pre-order" checked={draft.preorder} onChange={(value) => setDraft({ ...draft, preorder: value })} />
                    </div>
                  </EditorSection>

                  <EditorSection title="Book details">
                    <div className="grid gap-3">
                      <Field label="Edition" value={draft.edition} onChange={(value) => setDraft({ ...draft, edition: value })} />
                      <Field label="ISBN" value={draft.isbn} onChange={(value) => setDraft({ ...draft, isbn: value })} />
                      <Field label="Language" value={draft.language} onChange={(value) => setDraft({ ...draft, language: value })} />
                      <Field label="Publication date" value={draft.publicationDate} onChange={(value) => setDraft({ ...draft, publicationDate: value })} type="date" />
                      <Field label="Pages" value={draft.pages} onChange={(value) => setDraft({ ...draft, pages: value })} type="number" />
                      <Field label="Series" value={draft.series} onChange={(value) => setDraft({ ...draft, series: value })} />
                    </div>
                  </EditorSection>

                  <EditorSection title="Inventory">
                    <div className="grid gap-3">
                      <Field label="Stock quantity (printed format)" value={draft.stock} onChange={(value) => setDraft({ ...draft, stock: value })} type="number" placeholder="Applies to printed books only; blank = unlimited" />
                      <Field label="Low stock threshold" value={draft.lowStockThreshold} onChange={(value) => setDraft({ ...draft, lowStockThreshold: value })} type="number" />
                      <Field label="Warehouse" value={draft.warehouse} onChange={(value) => setDraft({ ...draft, warehouse: value })} />
                      <Field label="Supplier" value={draft.supplier} onChange={(value) => setDraft({ ...draft, supplier: value })} />
                    </div>
                  </EditorSection>

                  <EditorSection title="Downloads and licensing">
                    <div className="grid gap-3">
                      <Field label="Download limit" value={draft.downloadLimit} onChange={(value) => setDraft({ ...draft, downloadLimit: value })} type="number" placeholder="Blank for unlimited" />
                      <Field label="Expiry days" value={draft.downloadExpiryDays} onChange={(value) => setDraft({ ...draft, downloadExpiryDays: value })} type="number" placeholder="Blank for never expires" />
                      <ToggleField label="Watermark PDF files" checked={draft.watermarking} onChange={(value) => setDraft({ ...draft, watermarking: value })} />
                      <ToggleField label="Generate license keys" checked={draft.licenseKeys} onChange={(value) => setDraft({ ...draft, licenseKeys: value })} />
                    </div>
                  </EditorSection>
                </aside>
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-white/10 p-5 sm:flex-row sm:items-end sm:justify-between">
              {(() => {
                const blockers = libraryPublishBlockers(draft);
                if (!blockers.length) return null;
                return (
                  <div className="min-w-0 flex-1 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    <p className="font-bold text-amber-200">Publish needs:</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4">
                      {blockers.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={closeEditor} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300">Cancel</button>
                <Button
                  variant="secondary"
                  loading={saving}
                  loadingText="Saving..."
                  disabled={!draft.title.trim() || !draft.description.trim() || !draft.formats.some((format) => format.enabled)}
                  onClick={() => void saveProduct(draft.status === "SCHEDULED" || draft.status === "ARCHIVED" ? draft.status : "DRAFT")}
                >
                  {draft.status === "SCHEDULED"
                      ? "Save scheduled"
                      : draft.status === "ARCHIVED"
                        ? "Save archived"
                        : "Save draft"}
                </Button>
                <Button
                  loading={saving}
                  loadingText="Publishing..."
                  disabled={libraryPublishBlockers(draft).length > 0}
                  onClick={confirmPublishThenSave}
                >
                  Publish
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {couponDraft && (
        <CommerceModal title={couponDraft.id ? "Edit Library Coupon" : "Create Library Coupon"} description="Discount rules, expiry, usage limits, first-purchase controls, and product/category restrictions." onClose={() => setCouponDraft(null)} onSave={() => void saveCoupon()} saveLabel={couponDraft.id ? "Save Coupon" : "Create Coupon"} disabled={!couponDraft.code.trim() || !Number(couponDraft.discountValue)}>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Coupon code" value={couponDraft.code} onChange={(value) => setCouponDraft({ ...couponDraft, code: value.toUpperCase() })} required />
            <SelectField label="Discount type" value={couponDraft.discountType} onChange={(value) => setCouponDraft({ ...couponDraft, discountType: value })} options={["PERCENT", "FIXED"]} />
            <Field label="Discount value" value={couponDraft.discountValue} onChange={(value) => setCouponDraft({ ...couponDraft, discountValue: value })} type="number" required />
            <Field label="Minimum subtotal" value={couponDraft.minimumSubtotal} onChange={(value) => setCouponDraft({ ...couponDraft, minimumSubtotal: value })} type="number" />
            <Field label="Usage limit" value={couponDraft.usageLimit} onChange={(value) => setCouponDraft({ ...couponDraft, usageLimit: value })} type="number" />
            <Field label="Starts at" value={couponDraft.startsAt} onChange={(value) => setCouponDraft({ ...couponDraft, startsAt: value })} type="date" />
            <Field label="Expires at" value={couponDraft.expiresAt} onChange={(value) => setCouponDraft({ ...couponDraft, expiresAt: value })} type="date" />
            <Field label="Product IDs" value={couponDraft.productIdsText} onChange={(value) => setCouponDraft({ ...couponDraft, productIdsText: value })} placeholder="Optional, comma separated" />
            <Field label="Category IDs" value={couponDraft.categoryIdsText} onChange={(value) => setCouponDraft({ ...couponDraft, categoryIdsText: value })} placeholder="Optional, comma separated" />
            <TextAreaField label="Description" value={couponDraft.description} onChange={(value) => setCouponDraft({ ...couponDraft, description: value })} />
            <div className="grid gap-3">
              <ToggleField label="Active" checked={couponDraft.active} onChange={(value) => setCouponDraft({ ...couponDraft, active: value })} />
              <ToggleField label="First purchase only" checked={couponDraft.firstPurchaseOnly} onChange={(value) => setCouponDraft({ ...couponDraft, firstPurchaseOnly: value })} />
            </div>
          </div>
        </CommerceModal>
      )}

      {taxDraft && (
        <CommerceModal title={taxDraft.id ? "Edit Tax Setting" : "Add Tax Setting"} description="Real checkout tax settings used when quoting Library carts." onClose={() => setTaxDraft(null)} onSave={() => void saveTaxSetting()} saveLabel="Save Tax Setting" disabled={!taxDraft.name.trim() || !taxDraft.country.trim()}>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Name" value={taxDraft.name} onChange={(value) => setTaxDraft({ ...taxDraft, name: value })} required />
            <Field label="Country" value={taxDraft.country} onChange={(value) => setTaxDraft({ ...taxDraft, country: value.toUpperCase() })} required />
            <Field label="Rate percentage" value={taxDraft.rate} onChange={(value) => setTaxDraft({ ...taxDraft, rate: value })} type="number" required />
            <div className="grid gap-3">
              <ToggleField label="Tax included in price" checked={taxDraft.inclusive} onChange={(value) => setTaxDraft({ ...taxDraft, inclusive: value })} />
              <ToggleField label="Active" checked={taxDraft.active} onChange={(value) => setTaxDraft({ ...taxDraft, active: value })} />
            </div>
          </div>
        </CommerceModal>
      )}

      {fulfilmentDraft && (
        <CommerceModal title="Update Fulfilment" description="Packing, dispatch, tracking, and delivery notes for printed Library orders." onClose={() => setFulfilmentDraft(null)} onSave={() => void saveFulfilment()} saveLabel="Save Fulfilment">
          <div className="grid gap-3 md:grid-cols-2">
            <SelectField label="Status" value={fulfilmentDraft.status} onChange={(value) => setFulfilmentDraft({ ...fulfilmentDraft, status: value })} options={["PENDING", "PACKED", "DISPATCHED", "DELIVERED", "RETURNED", "CANCELLED"]} />
            <Field label="Courier" value={fulfilmentDraft.courier} onChange={(value) => setFulfilmentDraft({ ...fulfilmentDraft, courier: value })} />
            <Field label="Tracking number" value={fulfilmentDraft.trackingNumber} onChange={(value) => setFulfilmentDraft({ ...fulfilmentDraft, trackingNumber: value })} />
            <Field label="Tracking URL" value={fulfilmentDraft.trackingUrl} onChange={(value) => setFulfilmentDraft({ ...fulfilmentDraft, trackingUrl: value })} />
            <TextAreaField label="Dispatch notes" value={fulfilmentDraft.dispatchNotes} onChange={(value) => setFulfilmentDraft({ ...fulfilmentDraft, dispatchNotes: value })} />
            <TextAreaField label="Delivery notes" value={fulfilmentDraft.deliveryNotes} onChange={(value) => setFulfilmentDraft({ ...fulfilmentDraft, deliveryNotes: value })} />
          </div>
        </CommerceModal>
      )}

      {groupDraft && (
        <CommerceModal title={`Rename ${groupDraft.field}`} description="Update this Library grouping across all products currently assigned to it." onClose={() => setGroupDraft(null)} onSave={() => void saveProductGroup()} saveLabel="Save Group" disabled={!groupDraft.nextName.trim()}>
          <Field label="Name" value={groupDraft.nextName} onChange={(value) => setGroupDraft({ ...groupDraft, nextName: value })} required />
        </CommerceModal>
      )}

      {taxonomyDraft && (
        <CommerceModal title={taxonomyDraft.id ? `Edit ${taxonomyDraft.kind}` : `Create ${taxonomyDraft.kind}`} description="Database-backed Library taxonomy with storefront visibility, SEO, sort order, and merchandising fields." onClose={() => setTaxonomyDraft(null)} onSave={() => void saveTaxonomy()} saveLabel="Save Record" disabled={!taxonomyDraft.name.trim()}>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Name" value={taxonomyDraft.name} onChange={(value) => setTaxonomyDraft({ ...taxonomyDraft, name: value })} required />
            <Field label="Slug" value={taxonomyDraft.slug} onChange={(value) => setTaxonomyDraft({ ...taxonomyDraft, slug: value })} placeholder="Auto-generated if empty" />
            <TextAreaField label={taxonomyDraft.kind === "author" ? "Bio" : "Description"} value={taxonomyDraft.kind === "author" ? taxonomyDraft.bio : taxonomyDraft.description} onChange={(value) => setTaxonomyDraft(taxonomyDraft.kind === "author" ? { ...taxonomyDraft, bio: value } : { ...taxonomyDraft, description: value })} />
            {taxonomyDraft.kind === "author" ? (
              <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-white">Author profile image</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">Upload a square JPG, PNG, or WebP image. This is used on Library author profiles and bylines.</p>
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
                    {taxonomyDraft.heroImageUrl ? (
                      <div
                        className="size-full bg-cover bg-center"
                        role="img"
                        aria-label={`${taxonomyDraft.name || "Author"} profile image preview`}
                        style={{ backgroundImage: `url("${taxonomyDraft.heroImageUrl.replace(/"/g, "%22")}")` }}
                      />
                    ) : (
                      <span className="text-2xl font-black text-emerald-200">{initials(taxonomyDraft.name)}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button type="button" disabled={taxonomyAvatarUploading} onClick={() => taxonomyAvatarInputRef.current?.click()}>
                        {taxonomyAvatarUploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                        {taxonomyAvatarUploading ? "Uploading..." : taxonomyDraft.heroImageUrl ? "Replace image" : "Upload image"}
                      </Button>
                      {taxonomyDraft.heroImageUrl ? (
                        <Button type="button" variant="secondary" disabled={taxonomyAvatarUploading} onClick={() => setTaxonomyDraft({ ...taxonomyDraft, heroImageUrl: "" })}>
                          <X className="size-4" /> Remove
                        </Button>
                      ) : null}
                    </div>
                    <input
                      ref={taxonomyAvatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(event) => void uploadTaxonomyAvatar(event.target.files, event.currentTarget)}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Field label="Image URL" value={taxonomyDraft.heroImageUrl} onChange={(value) => setTaxonomyDraft({ ...taxonomyDraft, heroImageUrl: value })} placeholder="Optional hosted image URL" />
                </div>
              </div>
            ) : (
              <Field label="Hero image URL" value={taxonomyDraft.heroImageUrl} onChange={(value) => setTaxonomyDraft({ ...taxonomyDraft, heroImageUrl: value })} />
            )}
            {taxonomyDraft.kind === "author" && <Field label="Website URL" value={taxonomyDraft.websiteUrl} onChange={(value) => setTaxonomyDraft({ ...taxonomyDraft, websiteUrl: value })} />}
            {taxonomyDraft.kind !== "author" && <Field label="SEO title" value={taxonomyDraft.seoTitle} onChange={(value) => setTaxonomyDraft({ ...taxonomyDraft, seoTitle: value })} />}
            {taxonomyDraft.kind !== "author" && <Field label="Meta description" value={taxonomyDraft.metaDescription} onChange={(value) => setTaxonomyDraft({ ...taxonomyDraft, metaDescription: value })} />}
            <Field label="Sort order" value={taxonomyDraft.sortOrder} onChange={(value) => setTaxonomyDraft({ ...taxonomyDraft, sortOrder: value })} type="number" />
            <div className="grid gap-3">
              {taxonomyDraft.kind === "collection" && <ToggleField label="Featured collection" checked={taxonomyDraft.featured} onChange={(value) => setTaxonomyDraft({ ...taxonomyDraft, featured: value })} />}
              <ToggleField label="Active" checked={taxonomyDraft.active} onChange={(value) => setTaxonomyDraft({ ...taxonomyDraft, active: value })} />
            </div>
          </div>
        </CommerceModal>
      )}

      {downloadAccessDraft && (
        <CommerceModal title="Manage Download Access" description="Control customer file access, revocation, expiry, and download limits." onClose={() => setDownloadAccessDraft(null)} onSave={() => void saveDownloadAccess()} saveLabel="Save Access">
          <div className="grid gap-3 md:grid-cols-2">
            <SelectField label="Status" value={downloadAccessDraft.status} onChange={(value) => setDownloadAccessDraft({ ...downloadAccessDraft, status: value })} options={["ACTIVE", "REVOKED", "EXPIRED", "SUSPENDED"]} />
            <Field label="Download limit" value={downloadAccessDraft.downloadLimit} onChange={(value) => setDownloadAccessDraft({ ...downloadAccessDraft, downloadLimit: value })} type="number" placeholder="Blank for unlimited" />
            <Field label="Expires at" value={downloadAccessDraft.expiresAt} onChange={(value) => setDownloadAccessDraft({ ...downloadAccessDraft, expiresAt: value })} type="date" />
            <div className="md:col-span-2">
              <ToggleField label="Reset used download count" checked={downloadAccessDraft.resetDownloadCount} onChange={(value) => setDownloadAccessDraft({ ...downloadAccessDraft, resetDownloadCount: value })} />
            </div>
          </div>
        </CommerceModal>
      )}

      {inventoryMovementDraft && (
        <CommerceModal title="Adjust Library Inventory" description="Record a stock movement and update the product's available quantity." onClose={() => setInventoryMovementDraft(null)} onSave={() => void saveInventoryMovement()} saveLabel="Save Movement" disabled={!inventoryMovementDraft.productId || !Number(inventoryMovementDraft.quantity)}>
          <div className="grid gap-3 md:grid-cols-2">
            <SelectField label="Product" value={inventoryMovementDraft.productId} onChange={(value) => setInventoryMovementDraft({ ...inventoryMovementDraft, productId: value })} options={source.map((product) => product.id)} />
            <SelectField label="Movement type" value={inventoryMovementDraft.type} onChange={(value) => setInventoryMovementDraft({ ...inventoryMovementDraft, type: value })} options={["RESTOCK", "ADJUSTMENT", "DAMAGE", "RETURN", "RESERVED_RELEASE"]} />
            <Field label="Quantity change" value={inventoryMovementDraft.quantity} onChange={(value) => setInventoryMovementDraft({ ...inventoryMovementDraft, quantity: value })} type="number" />
            <TextAreaField label="Note" value={inventoryMovementDraft.note} onChange={(value) => setInventoryMovementDraft({ ...inventoryMovementDraft, note: value })} />
          </div>
        </CommerceModal>
      )}

      {recommendationDraft && (
        <CommerceModal title="Manage Product Recommendation" description="Connect two Library products for curated related-product merchandising." onClose={() => setRecommendationDraft(null)} onSave={() => void saveRecommendation()} saveLabel="Save Recommendation" disabled={!recommendationDraft.sourceProductId || !recommendationDraft.targetProductId || recommendationDraft.sourceProductId === recommendationDraft.targetProductId}>
          <div className="grid gap-3 md:grid-cols-2">
            <SelectField label="Source product" value={recommendationDraft.sourceProductId} onChange={(value) => setRecommendationDraft({ ...recommendationDraft, sourceProductId: value })} options={source.map((product) => product.id)} />
            <SelectField label="Recommended product" value={recommendationDraft.targetProductId} onChange={(value) => setRecommendationDraft({ ...recommendationDraft, targetProductId: value })} options={source.map((product) => product.id)} />
            <SelectField label="Reason" value={recommendationDraft.reason} onChange={(value) => setRecommendationDraft({ ...recommendationDraft, reason: value })} options={["RELATED", "BUNDLE", "NEXT_STEP", "POPULAR_WITH", "SAME_AUTHOR"]} />
            <Field label="Weight" value={recommendationDraft.weight} onChange={(value) => setRecommendationDraft({ ...recommendationDraft, weight: value })} type="number" />
            <ToggleField label="Active" checked={recommendationDraft.active} onChange={(value) => setRecommendationDraft({ ...recommendationDraft, active: value })} />
          </div>
        </CommerceModal>
      )}

      {manualOrderDraft && (
        <CommerceModal title="Create Manual Library Order" description="Create a real payment/order record, apply coupon pricing, and optionally grant Library access immediately." onClose={() => setManualOrderDraft(null)} onSave={() => void saveManualOrder()} saveLabel="Create Order" disabled={!manualOrderDraft.customerId.trim() || !manualOrderDraft.productId}>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Customer user ID" value={manualOrderDraft.customerId} onChange={(value) => setManualOrderDraft({ ...manualOrderDraft, customerId: value })} required />
            <SelectField label="Product" value={manualOrderDraft.productId} onChange={(value) => setManualOrderDraft({ ...manualOrderDraft, productId: value })} options={source.map((product) => product.id)} />
            <Field label="Quantity" value={manualOrderDraft.quantity} onChange={(value) => setManualOrderDraft({ ...manualOrderDraft, quantity: value })} type="number" />
            <Field label="Coupon code" value={manualOrderDraft.couponCode} onChange={(value) => setManualOrderDraft({ ...manualOrderDraft, couponCode: value.toUpperCase() })} />
            <Field label="Provider / method" value={manualOrderDraft.provider} onChange={(value) => setManualOrderDraft({ ...manualOrderDraft, provider: value })} />
            <Field label="Reference" value={manualOrderDraft.referenceNumber} onChange={(value) => setManualOrderDraft({ ...manualOrderDraft, referenceNumber: value })} />
            <TextAreaField label="Internal note" value={manualOrderDraft.note} onChange={(value) => setManualOrderDraft({ ...manualOrderDraft, note: value })} />
            <ToggleField label="Mark paid and grant access" checked={manualOrderDraft.markPaid} onChange={(value) => setManualOrderDraft({ ...manualOrderDraft, markPaid: value })} />
          </div>
        </CommerceModal>
      )}

      {refundDraft && (
        <CommerceModal title="Refund Library Order" description="Mark the order refunded, revoke related download access, update payment status, and log the reason." onClose={() => setRefundDraft(null)} onSave={() => void refundOrder()} saveLabel="Refund Order">
          <TextAreaField label="Reason" value={refundDraft.reason} onChange={(value) => setRefundDraft({ ...refundDraft, reason: value })} />
        </CommerceModal>
      )}
      {paymentActionDraft && (
        <CommerceModal
          title={
            paymentActionDraft.action === "approve"
              ? `Approve payment · ${paymentActionDraft.orderNumber}`
              : paymentActionDraft.action === "reject"
                ? `Reject proof · ${paymentActionDraft.orderNumber}`
                : `Refund payment · ${paymentActionDraft.orderNumber}`
          }
          description={
            paymentActionDraft.action === "approve"
              ? "Verify the transfer and unlock Library access / fulfilment for this order."
              : paymentActionDraft.action === "reject"
                ? "Reject the uploaded proof, keep the order awaiting a clearer receipt, and tell the customer why."
                : "Refund the payment, revoke downloads, restock printed items if needed, and notify the customer."
          }
          onClose={() => setPaymentActionDraft(null)}
          onSave={() => void runPaymentAction()}
          saveLabel={paymentActionDraft.action === "approve" ? "Approve payment" : paymentActionDraft.action === "reject" ? "Reject proof" : "Refund payment"}
          disabled={(paymentActionDraft.action === "reject" || paymentActionDraft.action === "refund") && !paymentActionDraft.reason.trim()}
        >
          <TextAreaField
            label={paymentActionDraft.action === "approve" ? "Note (optional)" : "Reason (required)"}
            value={paymentActionDraft.reason}
            onChange={(value) => setPaymentActionDraft({ ...paymentActionDraft, reason: value })}
          />
        </CommerceModal>
      )}

      {orderNotifyDraft && (
        <CommerceModal title="Send Library Notification" description="Queue a real customer notification for invoice, access, dispatch, or a custom order update." onClose={() => setOrderNotifyDraft(null)} onSave={() => void notifyOrder()} saveLabel="Queue Notification">
          <div className="grid gap-3">
            <SelectField label="Notification type" value={orderNotifyDraft.type} onChange={(value) => setOrderNotifyDraft({ ...orderNotifyDraft, type: value })} options={["invoice", "access", "dispatch", "custom"]} />
            <TextAreaField label="Message" value={orderNotifyDraft.message} onChange={(value) => setOrderNotifyDraft({ ...orderNotifyDraft, message: value })} placeholder="Leave blank to use the default message for this type." />
          </div>
        </CommerceModal>
      )}

      {previewProduct && (
        <CommerceModal title="Product Preview" description="Admin preview of the customer-facing product content before publishing." onClose={() => setPreviewProduct(null)} onSave={() => window.open(`/library/${previewProduct.slug}`, "_blank")} saveLabel="Open Public Page">
          <ProductPreview product={previewProduct} />
        </CommerceModal>
      )}

      {bulkDraft && (
        <CommerceModal
          title={bulkDraft.mode === "price" ? "Bulk update price" : "Bulk update category"}
          description={`Apply to ${selectedIds.size} selected product${selectedIds.size === 1 ? "" : "s"}.`}
          onClose={() => setBulkDraft(null)}
          onSave={() => void saveBulkUpdate()}
          saveLabel="Apply"
          disabled={bulkDraft.mode === "price" ? !Number.isFinite(Number(bulkDraft.value)) : !bulkDraft.value.trim()}
        >
          {bulkDraft.mode === "price" ? (
            <Field
              label="New price (USD)"
              value={bulkDraft.value}
              onChange={(value) => setBulkDraft({ ...bulkDraft, value })}
              type="number"
              required
            />
          ) : (
            <CreatableSelectField
              label="Category"
              value={bulkDraft.value}
              onChange={(value) => setBulkDraft({ ...bulkDraft, value })}
              options={taxonomyOptions.categories}
              placeholder="Select or create a category"
            />
          )}
        </CommerceModal>
      )}

      {guestClaimDraft && (
        <CommerceModal
          title="Issue guest claim"
          description="Create a pending claim so access can be approved once the buyer has a HouseLink account with that email."
          onClose={() => setGuestClaimDraft(null)}
          onSave={() => void saveGuestClaim()}
          saveLabel="Issue claim"
          disabled={!guestClaimDraft.orderId || !guestClaimDraft.email.trim()}
        >
          <div className="grid gap-3">
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-slate-200">Order</span>
              <select
                value={guestClaimDraft.orderId}
                onChange={(event) => setGuestClaimDraft({ ...guestClaimDraft, orderId: event.target.value })}
                className="h-11 rounded-lg border border-white/10 bg-slate-950 px-3 text-slate-100"
              >
                <option value="">Select order</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>{order.orderNumber} · {order.customerEmail}</option>
                ))}
              </select>
            </label>
            <Field label="Buyer email" value={guestClaimDraft.email} onChange={(value) => setGuestClaimDraft({ ...guestClaimDraft, email: value })} required />
          </div>
        </CommerceModal>
      )}
    </div>
  );
}

function productPayload(draft: LibraryProductDraft, statusOverride?: string) {
  const lines = (value: string) => value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  const tags = draft.tagsText.split(",").map((item) => item.trim()).filter(Boolean);
  const stock = draft.stock.trim() === "" ? null : Number(draft.stock);
  const formats = draft.formats.map((format) => {
    const price = Number(format.price) || 0;
    const volumeTiers =
      format.type === "PRINTED_BOOK"
        ? normalizeLibraryVolumeTiers(format.volumeTiers, price)
        : undefined;
    return {
      ...format,
      price,
      compareAtPrice: format.compareAtPrice == null || Number.isNaN(Number(format.compareAtPrice)) ? undefined : Number(format.compareAtPrice),
      volumeTiers: volumeTiers?.length ? volumeTiers : undefined,
    };
  });
  const primary = primaryLibraryFormat(formats, draft.productType as LibraryProduct["productType"], Number(draft.price) || 0);
  return {
    title: draft.title.trim(),
    slug: draft.slug.trim() || undefined,
    subtitle: draft.subtitle.trim(),
    author: draft.author.trim(),
    publisher: draft.publisher.trim(),
    edition: draft.edition.trim(),
    isbn: draft.isbn.trim() || undefined,
    language: draft.language.trim() || "English",
    publicationDate: draft.publicationDate || undefined,
    pages: draft.pages.trim() ? Number(draft.pages) : undefined,
    sku: draft.sku.trim() || undefined,
    productType: draft.productType === "BUNDLE" ? "BUNDLE" : primary.type,
    status: statusOverride || draft.status,
    price: primary.price,
    compareAtPrice: primary.compareAtPrice,
    currency: draft.currency.trim() || "USD",
    category: draft.category.trim(),
    collection: draft.collection.trim(),
    series: draft.series.trim() || undefined,
    difficulty: draft.difficulty,
    shortDescription: draft.shortDescription.trim() || draft.description.trim().slice(0, 140),
    description: draft.description.trim(),
    learningOutcomes: lines(draft.learningOutcomesText),
    whoThisIsFor: lines(draft.whoThisIsForText),
    requirements: lines(draft.requirementsText),
    tableOfContents: lines(draft.tableOfContentsText),
    tags,
    seoTitle: draft.seoTitle.trim() || undefined,
    metaDescription: draft.metaDescription.trim() || undefined,
    seoFocusKeyword: draft.seoFocusKeyword.trim() || undefined,
    seoImageUrl: draft.seoImageUrl.trim() || undefined,
    bundleProductIds: draft.bundleProductIds,
    bundlePromoPrice: draft.bundlePromoPrice.trim() ? Number(draft.bundlePromoPrice) : null,
    bundleFormatPreference: draft.bundleFormatPreference || "PREFER_DIGITAL",
    formats,
    stock,
    lowStockThreshold: Number(draft.lowStockThreshold) || 0,
    warehouse: draft.warehouse.trim() || undefined,
    supplier: draft.supplier.trim() || undefined,
    downloadLimit: draft.downloadLimit.trim() ? Number(draft.downloadLimit) : null,
    downloadExpiryDays: draft.downloadExpiryDays.trim() ? Number(draft.downloadExpiryDays) : null,
    watermarking: draft.watermarking,
    licenseKeys: draft.licenseKeys,
    featured: draft.featured,
    bestSeller: draft.bestSeller,
    newRelease: draft.newRelease,
    editorsChoice: draft.editorsChoice,
    comingSoon: draft.comingSoon,
    preorder: draft.preorder,
    scheduledAt: draft.status === "SCHEDULED" ? (draft.scheduledAt || null) : draft.status === "PUBLISHED" ? null : draft.scheduledAt || undefined,
    gallery: draft.gallery,
    downloads: [
      ...draft.downloads.map((item) => ({ ...item, previewable: false })),
      ...(draft.sampleFile?.fileUrl
        ? [{
            ...draft.sampleFile,
            label: /sample|preview/i.test(`${draft.sampleFile.label || ""} ${draft.sampleFile.fileName || ""}`)
              ? (draft.sampleFile.label?.trim() || "Sample preview")
              : `Sample preview · ${draft.sampleFile.label?.trim() || "PDF"}`,
            fileName: /sample|preview/i.test(draft.sampleFile.fileName || "")
              ? draft.sampleFile.fileName
              : `sample-${draft.sampleFile.fileName || "preview.pdf"}`,
            previewable: true,
            secure: true,
          }]
        : []),
    ],
  };
}

function libraryPublishBlockers(draft: LibraryProductDraft) {
  const blockers: string[] = [];
  if (!draft.title.trim()) blockers.push("Add a product title.");
  if (!draft.description.trim()) blockers.push("Add a full description (short description alone is not enough).");
  if (!draft.formats.some((format) => format.enabled)) blockers.push("Enable at least one format (Digital PDF and/or Printed book).");
  const hasDigital = draft.formats.some((format) => format.enabled && format.type !== "PRINTED_BOOK");
  const hasDownload = draft.downloads.some((file) => Boolean(file.fileUrl));
  if (hasDigital && !hasDownload) {
    blockers.push('Upload a full download file under "Files and media" (required for digital formats).');
  }
  return blockers;
}

function splitSampleFromDownloads(downloads: LibraryProduct["downloads"]): {
  sampleFile: LibraryDraftDownload | null;
  downloads: LibraryDraftDownload[];
} {
  const rows = downloads.map((item) => ({ ...item })) as LibraryDraftDownload[];
  const labeledSampleIndex = rows.findIndex((item) => {
    if (!item.previewable || !item.fileUrl) return false;
    return /sample|preview/i.test(`${item.label || ""} ${item.fileName || ""}`);
  });
  if (labeledSampleIndex >= 0) {
    const sampleFile = { ...rows[labeledSampleIndex], previewable: true };
    return {
      sampleFile,
      downloads: rows
        .filter((_, index) => index !== labeledSampleIndex)
        .map((item) => ({ ...item, previewable: false })),
    };
  }
  return {
    sampleFile: null,
    downloads: rows.map((item) => ({ ...item, previewable: false })),
  };
}

function normalizeDraftFormats(product: LibraryProduct): LibraryProductFormat[] {
  const all = product.formats?.length ? product.formats : enabledLibraryFormats(product);
  const digital = all.find((format) => format.type !== "PRINTED_BOOK");
  const printed = all.find((format) => format.type === "PRINTED_BOOK");
  const printedPrice = printed?.price ?? Math.max(product.price + 10, 25);
  const volumeTiers = normalizeLibraryVolumeTiers(printed?.volumeTiers, printedPrice);
  return [
    {
      id: "digital",
      type: digital?.type === "DIGITAL_BOOK" ? "DIGITAL_BOOK" : "PDF",
      label: digital?.type === "DIGITAL_BOOK" ? "Digital book" : "Digital PDF",
      enabled: digital ? digital.enabled !== false : false,
      price: digital?.price ?? product.price,
      compareAtPrice: digital?.compareAtPrice,
      sku: digital?.sku,
    },
    {
      id: "printed",
      type: "PRINTED_BOOK",
      label: "Printed book",
      enabled: printed ? printed.enabled !== false : false,
      price: printedPrice,
      compareAtPrice: printed?.compareAtPrice,
      sku: printed?.sku,
      volumeTiers: volumeTiers.length ? volumeTiers : undefined,
    },
  ];
}

function PrintedVolumeTiersEditor({
  currency,
  basePrice,
  tiers,
  onChange,
}: {
  currency: string;
  basePrice: number;
  tiers: LibraryVolumeTier[];
  onChange: (tiers: LibraryVolumeTier[]) => void;
}) {
  const tiersKey = JSON.stringify(normalizeLibraryVolumeTiers(tiers, basePrice));
  const [rows, setRows] = useState<Array<{ minQty: string; unitPrice: string }>>(() => {
    const initial = normalizeLibraryVolumeTiers(tiers, basePrice);
    return initial.length
      ? initial.map((tier) => ({ minQty: String(tier.minQty), unitPrice: String(tier.unitPrice) }))
      : [{ minQty: "", unitPrice: "" }];
  });

  useEffect(() => {
    const fromProps = normalizeLibraryVolumeTiers(JSON.parse(tiersKey) as LibraryVolumeTier[], basePrice);
    setRows((current) => {
      const drafting = current.some((row) => {
        const minQty = row.minQty.trim();
        const unitPrice = row.unitPrice.trim();
        if (!minQty && !unitPrice) return false;
        const parsedMin = Number(minQty);
        const parsedPrice = Number(unitPrice);
        return !Number.isFinite(parsedMin) || !Number.isFinite(parsedPrice) || parsedPrice >= basePrice - 0.001;
      });
      if (drafting) return current;
      return fromProps.length
        ? fromProps.map((tier) => ({ minQty: String(tier.minQty), unitPrice: String(tier.unitPrice) }))
        : [{ minQty: "", unitPrice: "" }];
    });
  }, [tiersKey, basePrice]);

  const normalized = normalizeLibraryVolumeTiers(
    rows.map((row) => ({ minQty: Number(row.minQty), unitPrice: Number(row.unitPrice) })),
    basePrice,
  );

  function pushChange(nextRows: Array<{ minQty: string; unitPrice: string }>) {
    setRows(nextRows.length ? nextRows : [{ minQty: "", unitPrice: "" }]);
    onChange(
      normalizeLibraryVolumeTiers(
        nextRows.map((row) => ({
          minQty: Number(row.minQty),
          unitPrice: Number(row.unitPrice),
        })),
        basePrice,
      ),
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-white/10 bg-slate-950/60 p-3">
      <p className="text-xs font-semibold text-slate-300">Printed bulk / volume pricing</p>
      <p className="text-[11px] leading-4 text-slate-500">
        Optional. When shoppers buy enough printed copies of this title, the unit price drops. Digital formats are never discounted this way. Checkout enforces these tiers.
      </p>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={`volume-tier-${index}`} className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2">
            <Field
              label={index === 0 ? "Min qty" : ""}
              value={row.minQty}
              onChange={(value) => {
                const next = rows.map((entry, i) => (i === index ? { ...entry, minQty: value } : entry));
                pushChange(next);
              }}
              type="number"
              placeholder="5"
            />
            <Field
              label={index === 0 ? "Unit price" : ""}
              value={row.unitPrice}
              onChange={(value) => {
                const next = rows.map((entry, i) => (i === index ? { ...entry, unitPrice: value } : entry));
                pushChange(next);
              }}
              type="number"
              placeholder={basePrice ? String(Math.max(1, Math.round(basePrice * 0.9))) : "40"}
            />
            <button
              type="button"
              className="mb-0.5 h-9 rounded-lg border border-white/10 px-2 text-xs text-slate-400 hover:border-red-400 hover:text-red-300"
              onClick={() => pushChange(rows.filter((_, i) => i !== index))}
              aria-label="Remove tier"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      {rows.length < 5 ? (
        <button
          type="button"
          className="text-xs font-semibold text-emerald-300 hover:text-emerald-200"
          onClick={() =>
            pushChange([
              ...rows,
              {
                minQty: String(normalized.length ? normalized[normalized.length - 1].minQty + 5 : 5),
                unitPrice: String(
                  normalized.length
                    ? Math.max(1, Math.round(normalized[normalized.length - 1].unitPrice * 0.9))
                    : Math.max(1, Math.round(basePrice * 0.9) || 1),
                ),
              },
            ])
          }
        >
          + Add quantity break
        </button>
      ) : null}
      {normalized.length > 0 && basePrice > 0 ? (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2 text-[11px] leading-5 text-slate-300">
          <p className="font-semibold text-emerald-300">Live volume preview</p>
          {normalized.map((tier) => {
            const pricing = libraryVolumePricing(
              { price: basePrice, type: "PRINTED_BOOK", volumeTiers: normalized },
              tier.minQty,
            );
            return (
              <p key={tier.minQty}>
                {tier.minQty}+ copies → {currency} {tier.unitPrice.toFixed(2)} each
                {pricing.savingsPercent > 0 ? (
                  <span className="text-slate-500">
                    {" "}
                    · save {pricing.savingsPercent}% ({currency} {pricing.savingsTotal.toFixed(2)} at {tier.minQty})
                  </span>
                ) : null}
              </p>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function formatSummary(product: LibraryProduct) {
  const formats = enabledLibraryFormats(product);
  if (formats.length > 1) return formats.map((format) => format.label.replace(/Digital PDF/i, "Digital").replace(/Printed book/i, "Print")).join(" + ");
  return (formats[0]?.label || product.productType).replace(/_/g, " ");
}

function priceSummary(product: LibraryProduct) {
  const formats = enabledLibraryFormats(product);
  if (formats.length > 1) {
    const prices = formats.map((format) => format.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = min === max ? `${product.currency} ${min.toFixed(2)}` : `${product.currency} ${min.toFixed(2)} – ${max.toFixed(2)}`;
    const onSale = formats.some((format) => libraryFormatCompareAt(format) != null);
    return onSale ? `${range} · sale` : range;
  }
  const format = formats[0];
  const compareAt = format ? libraryFormatCompareAt(format) : undefined;
  const price = format?.price ?? product.price;
  if (compareAt != null) return `${product.currency} ${price.toFixed(2)} (was ${compareAt.toFixed(2)})`;
  return `${product.currency} ${price.toFixed(2)}`;
}

function couponPayload(draft: CouponDraft) {
  const csv = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
  return {
    id: draft.id,
    code: draft.code.trim().toUpperCase(),
    description: draft.description.trim(),
    discountType: draft.discountType,
    discountValue: Number(draft.discountValue),
    usageLimit: draft.usageLimit.trim() ? Number(draft.usageLimit) : null,
    minimumSubtotal: draft.minimumSubtotal.trim() ? Number(draft.minimumSubtotal) : null,
    startsAt: draft.startsAt || null,
    expiresAt: draft.expiresAt || null,
    active: draft.active,
    firstPurchaseOnly: draft.firstPurchaseOnly,
    productIds: csv(draft.productIdsText),
    categoryIds: csv(draft.categoryIdsText),
  };
}

function CommerceModal({ title, description, children, saveLabel, disabled, onClose, onSave }: { title: string; description: string; children: React.ReactNode; saveLabel: string; disabled?: boolean; onClose: () => void; onSave: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="mt-1 text-sm text-slate-400">{description}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5" aria-label="Close modal"><X className="size-4" /></button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
        <div className="flex justify-end gap-2 border-t border-white/10 p-5">
          <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300">Cancel</button>
          <Button disabled={disabled} onClick={onSave}>{saveLabel}</Button>
        </div>
      </div>
    </div>
  );
}

function AssetRow({
  label,
  details,
  canMoveUp,
  canMoveDown,
  verification,
  onOpen,
  onMoveUp,
  onMoveDown,
  onVerify,
  onRemove,
}: {
  label: string;
  details?: string[];
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  verification?: { tone: "success" | "error" | "pending"; message: string };
  onOpen?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onVerify?: () => void;
  onRemove: () => void;
}) {
  const verifying = verification?.tone === "pending";
  return (
    <div className="grid min-w-0 gap-2 rounded-lg border border-white/[0.06] bg-slate-950 p-2 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <span className="block min-w-0 break-words [overflow-wrap:anywhere]">{label}</span>
        {details?.length ? (
          <div className="mt-1 grid gap-0.5 text-[11px] leading-4 text-slate-500">
            {details.map((detail) => <span key={detail} className="break-words [overflow-wrap:anywhere]">{detail}</span>)}
          </div>
        ) : null}
        {verification ? (
          <p
            role={verification.tone === "error" ? "alert" : "status"}
            className={cn(
              "mt-1 text-[11px] font-semibold leading-4",
              verification.tone === "success" ? "text-emerald-300" : verification.tone === "pending" ? "text-slate-300" : "text-red-300",
            )}
          >
            {verification.message}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-1">
        <button type="button" disabled={!canMoveUp} onClick={onMoveUp} className="rounded-md border border-white/10 px-2 py-1 text-[11px] font-bold text-slate-300 hover:bg-white/5 disabled:opacity-35">Up</button>
        <button type="button" disabled={!canMoveDown} onClick={onMoveDown} className="rounded-md border border-white/10 px-2 py-1 text-[11px] font-bold text-slate-300 hover:bg-white/5 disabled:opacity-35">Down</button>
        {onOpen ? <button type="button" onClick={onOpen} className="rounded-md border border-white/10 px-2 py-1 text-[11px] font-bold text-slate-300 hover:bg-white/5">Open</button> : null}
        {onVerify ? <button type="button" disabled={verifying} onClick={onVerify} className="rounded-md border border-emerald-500/30 px-2 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/10 disabled:cursor-wait disabled:opacity-60">{verifying ? "Checking" : "Verify"}</button> : null}
        <button type="button" onClick={onRemove} className="rounded-md border border-red-500/30 px-2 py-1 text-[11px] font-bold text-red-300 hover:bg-red-500/10">Remove</button>
      </div>
    </div>
  );
}

function moveItem<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function fileVerificationKey(file: LibraryDraftDownload) {
  return file.id || file.fileUrl || file.fileName || file.label;
}

function UploadInlineStatus({ status }: { status?: InlineStatus }) {
  if (!status) return null;
  return (
    <p
      role={status.tone === "error" ? "alert" : "status"}
      className={cn(
        "mt-2 rounded-md border px-2 py-1 text-[11px] font-semibold leading-4",
        status.tone === "success"
          ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
          : status.tone === "pending"
            ? "border-white/10 bg-white/5 text-slate-200"
            : "border-red-400/25 bg-red-400/10 text-red-200",
      )}
    >
      {status.message}
    </p>
  );
}

function ProductPreview({ product }: { product: LibraryProduct }) {
  const cover = product.gallery[0];
  return (
    <div className="grid gap-5 md:grid-cols-[14rem_minmax(0,1fr)]">
      <div className="rounded-xl border border-white/10 bg-slate-900 p-3">
        {cover ? (
          <div role="img" aria-label={cover.label || product.title} className="aspect-[3/4] w-full rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${cover.url})` }} />
        ) : (
          <div className="flex aspect-[3/4] items-center justify-center rounded-lg bg-slate-800 text-sm text-slate-500">No cover</div>
        )}
      </div>
      <div className="space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-emerald-300">{formatSummary(product)}</p>
          <h3 className="mt-1 text-2xl font-black text-white">{product.title}</h3>
          {product.subtitle && <p className="mt-1 text-sm text-slate-400">{product.subtitle}</p>}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <AdminStatusBadge status={product.status} variant={product.status === "PUBLISHED" ? "success" : "warning"} />
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-semibold text-slate-300">{product.category}</span>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-semibold text-slate-300">{product.difficulty}</span>
        </div>
        <p className="text-sm leading-6 text-slate-300">{product.shortDescription || product.description}</p>
        <div className="grid gap-2 rounded-xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-300">
          <div className="flex justify-between gap-3"><span>Price</span><strong className="text-white">{priceSummary(product)}</strong></div>
          {enabledLibraryFormats(product).map((format) => {
            const compareAt = libraryFormatCompareAt(format);
            return (
              <div key={format.id} className="flex justify-between gap-3">
                <span>{format.label}</span>
                <strong className="text-right text-white">
                  {product.currency} {format.price.toFixed(2)}
                  {compareAt != null ? <span className="ml-2 text-xs font-normal text-slate-400 line-through">{product.currency} {compareAt.toFixed(2)}</span> : null}
                </strong>
              </div>
            );
          })}
          <div className="flex justify-between gap-3"><span>Author</span><strong className="text-white">{product.author}</strong></div>
          <div className="flex justify-between gap-3"><span>Downloads</span><strong className="text-white">{product.downloads.length}</strong></div>
        </div>
      </div>
    </div>
  );
}

function taxonomyPayload(draft: TaxonomyDraft) {
  return {
    id: draft.id,
    kind: draft.kind,
    name: draft.name.trim(),
    slug: draft.slug.trim() || undefined,
    description: draft.description.trim(),
    seoTitle: draft.seoTitle.trim(),
    metaDescription: draft.metaDescription.trim(),
    heroImageUrl: draft.heroImageUrl.trim(),
    bio: draft.bio.trim(),
    websiteUrl: draft.websiteUrl.trim(),
    featured: draft.featured,
    sortOrder: Number(draft.sortOrder) || 0,
    active: draft.active,
  };
}

function EditorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-xl border border-white/10 bg-slate-900/50 p-4">
      <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-300">{title}</h3>
      <div className="min-w-0 max-w-full">{children}</div>
    </section>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", required = false, className }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean; className?: string }) {
  return (
    <label className={cn("grid min-w-0 max-w-full gap-1.5 text-sm", className)}>
      <span className="font-semibold text-slate-300">{label}{required && <span className="text-emerald-300"> *</span>}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} className="w-full min-w-0 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500" />
    </label>
  );
}

function CreatableSelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "Select existing or type a new value",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const normalized = value.trim().toLowerCase();
  const filtered = options.filter((option) => !normalized || option.toLowerCase().includes(normalized));
  const exactMatch = options.some((option) => option.toLowerCase() === normalized);
  const canCreate = Boolean(value.trim()) && !exactMatch;

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
  }

  const listboxId = `${label.toLowerCase().replace(/\s+/g, "-")}-options`;

  return (
    <div ref={rootRef} className="relative grid gap-1.5 text-sm">
      <span className="font-semibold text-slate-300">{label}</span>
      <div className="relative">
        <input
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-white/10 bg-slate-950 py-2 pl-3 pr-10 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-white"
          aria-label={`Show ${label.toLowerCase()} options`}
          aria-expanded={open}
          aria-controls={listboxId}
          onClick={() => setOpen((current) => !current)}
        >
          <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
        </button>
      </div>
      {open ? (
        <div id={listboxId} role="listbox" className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-30 max-h-56 overflow-y-auto rounded-lg border border-white/10 bg-slate-950 shadow-2xl">
          {filtered.length ? (
            filtered.map((option) => (
              <button
                key={option}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5",
                  option.toLowerCase() === normalized && "bg-emerald-500/10 text-emerald-200",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
              >
                <span>{option}</span>
                {option.toLowerCase() === normalized ? <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300">Selected</span> : null}
              </button>
            ))
          ) : options.length ? (
            <p className="px-3 py-2 text-sm text-slate-500">No matching {label.toLowerCase()}.</p>
          ) : (
            <p className="px-3 py-2 text-sm text-slate-500">No {label.toLowerCase()}s yet. Type a name to create one.</p>
          )}
          {canCreate ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 border-t border-white/10 px-3 py-2 text-left text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(value.trim())}
            >
              <Plus className="size-3.5" />
              Create &ldquo;{value.trim()}&rdquo;
            </button>
          ) : null}
        </div>
      ) : null}
      <p className="text-xs text-slate-500">Pick an existing {label.toLowerCase()} or type a new one.</p>
    </div>
  );
}

function TextAreaField({ label, value, onChange, placeholder, required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-semibold text-slate-300">{label}{required && <span className="text-emerald-300"> *</span>}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-h-28 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500" />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  optionLabels,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  optionLabels?: Record<string, string>;
  hint?: string;
}) {
  return (
    <label className="grid min-w-0 max-w-full gap-1.5 text-sm">
      <span className="font-semibold text-slate-300">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full min-w-0 max-w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none transition focus:border-emerald-500">
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabels?.[option] ?? option.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      {hint ? <span className="break-words text-[11px] leading-4 text-slate-500">{hint}</span> : null}
    </label>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm">
      <span className="font-semibold text-slate-300">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-emerald-600" />
    </label>
  );
}

function ProductCell({ product }: { product: LibraryProduct }) {
  return (
    <div className="min-w-0">
      <p className="font-semibold text-white">{product.title}</p>
      <p className="text-xs text-slate-500">{product.sku} - {product.author}</p>
    </div>
  );
}

function SampleStatus({ product }: { product: LibraryProduct }) {
  const sample = product.downloads.find((file) => isLibrarySampleFile(file));
  if (sample?.fileUrl) {
    return (
      <div className="grid gap-1">
        <AdminStatusBadge status="ATTACHED" variant="success" />
        <span className="text-xs text-slate-500">{sample.size || formatUploadSize(sample.fileSizeBytes ?? 0)}</span>
      </div>
    );
  }
  const prepared = findPreparedLibrarySample(product);
  return prepared
    ? <AdminStatusBadge status="PREPARED" variant="info" />
    : <AdminStatusBadge status="MISSING" variant="warning" />;
}

function isLibrarySampleFile(file: Pick<LibraryDraftDownload, "label" | "fileName" | "fileUrl" | "previewable">) {
  if (!file.previewable || !file.fileUrl) return false;
  return /sample|preview/i.test(`${file.label || ""} ${file.fileName || ""}`);
}

function findPreparedLibrarySample(input: Pick<LibraryProductDraft, "slug" | "title"> | Pick<LibraryProduct, "slug" | "title">) {
  const slug = normalizeSampleMatch(input.slug);
  const title = normalizeSampleMatch(input.title);
  return preparedLibrarySamples.find((sample) => sample.slug === slug)
    ?? preparedLibrarySamples.find((sample) => normalizeSampleMatch(sample.title) === title)
    ?? preparedLibrarySamples.find((sample) => {
      const sampleTitle = normalizeSampleMatch(sample.title);
      return Boolean(title) && (title.includes(sampleTitle) || sampleTitle.includes(title));
    })
    ?? null;
}

function preparedSampleToDraft(sample: PreparedLibrarySample): LibraryDraftDownload {
  return {
    id: `prepared-sample-${sample.slug}`,
    label: sample.label,
    fileType: sample.fileType,
    size: sample.size,
    secure: true,
    previewable: true,
    fileUrl: sample.fileUrl,
    fileName: sample.fileName,
    fileSizeBytes: sample.fileSizeBytes,
  };
}

function normalizeSampleMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type LibraryGroupField = "category" | "collection" | "author";

function TaxonomyTable({ kind, products, taxonomy, fallback, onEdit, onDelete }: { kind: LibraryGroupField; products: LibraryProduct[]; taxonomy: LibraryTaxonomyAdmin[]; fallback: React.ReactNode; onEdit: (kind: LibraryGroupField, row?: LibraryTaxonomyAdmin) => void; onDelete: (kind: LibraryGroupField, id: string) => void | Promise<void> }) {
  const rows = taxonomy.filter((row) => row.kind === kind);
  if (!rows.length && products.length) return fallback;
  return (
    <AdminDataTable
      rows={rows}
      emptyMessage={`No Library ${kind} records yet. Create one to control slug, SEO, active state, and sort order.`}
      columns={[
        { key: "name", header: "Name", render: (row) => <div><p className="font-semibold text-white">{row.name}</p><p className="text-xs text-slate-500">{row.slug}</p></div> },
        { key: "products", header: "Products", render: (row) => row.productCount },
        { key: "visibility", header: "Visibility", render: (row) => <AdminStatusBadge status={row.active ? "ACTIVE" : "INACTIVE"} variant={row.active ? "success" : "muted"} /> },
        { key: "seo", header: "SEO", render: (row) => row.seoTitle || row.metaDescription || row.description || row.bio ? "Configured" : "Not set" },
        { key: "actions", header: "Actions", render: (row) => <RowActions primaryLabel="Edit" primaryIcon={Edit3} onPrimary={() => onEdit(kind, row)} onDelete={() => onDelete(kind, row.id)} /> },
      ]}
    />
  );
}

function DownloadAccessTable({ rows, onEdit }: { rows: LibraryDownloadAccessAdmin[]; onEdit: (row: LibraryDownloadAccessAdmin) => void }) {
  return (
    <div className="mt-5 rounded-xl border border-white/[0.08] bg-slate-950/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-semibold text-white">Customer download access</p>
        <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-300">{rows.length}</span>
      </div>
      <AdminDataTable
        rows={rows}
        emptyMessage="No customer download access records yet."
        columns={[
          { key: "customer", header: "Customer", render: (row) => <div><p className="font-semibold text-white">{row.userName ?? row.userEmail ?? row.userId}</p><p className="text-xs text-slate-500">{row.orderNumber ?? "No order"}</p></div> },
          { key: "product", header: "Product/File", render: (row) => <div><p>{row.productTitle}</p><p className="text-xs text-slate-500">{row.fileName ?? "Product access"}</p></div> },
          { key: "status", header: "Status", render: (row) => <AdminStatusBadge status={row.status} variant={row.status === "ACTIVE" ? "success" : row.status === "REVOKED" ? "danger" : "warning"} /> },
          { key: "usage", header: "Usage", render: (row) => `${row.downloadCount}${row.downloadLimit == null ? "" : `/${row.downloadLimit}`}` },
          { key: "expires", header: "Expires", render: (row) => row.expiresAt ?? "Never" },
          { key: "actions", header: "Actions", render: (row) => <RowActions primaryLabel="Manage" primaryIcon={Edit3} onPrimary={() => onEdit(row)} /> },
        ]}
      />
    </div>
  );
}

function ProductPerformanceTable({ rows, products, onEditProduct, onRecommend }: { rows: LibraryAdminReports["productPerformance"]; products: LibraryProduct[]; onEditProduct: (product: LibraryProduct) => void; onRecommend: (product?: LibraryProduct) => void }) {
  return (
    <AdminDataTable
      rows={rows}
      emptyMessage="No product performance yet. Sales, downloads, and views will appear after the Library starts receiving traffic."
      columns={[
        { key: "product", header: "Product", render: (row) => <span className="font-semibold text-white">{row.title}</span> },
        { key: "revenue", header: "Revenue", render: (row) => `USD ${row.revenue.toFixed(2)}` },
        { key: "units", header: "Units", render: (row) => row.units },
        { key: "conversion", header: "Conv.", render: (row) => `${row.conversionRate}%` },
        { key: "health", header: "Health", render: (row) => <AdminStatusBadge status={`${row.health}%`} variant={row.health >= 80 ? "success" : row.health >= 60 ? "warning" : "danger"} /> },
        { key: "actions", header: "Actions", render: (row) => {
          const product = products.find((item) => item.id === row.id);
          return <RowActions primaryLabel="Edit" primaryIcon={Edit3} onPrimary={() => product && onEditProduct(product)} editIcon={Link2} editLabel="Recommend" onEdit={() => product && onRecommend(product)} />;
        } },
      ]}
    />
  );
}

function LibraryTabManagement({
  view,
  products,
  orders: _orders,
  analytics,
  operations,
  orderFilter: _orderFilter,
  customerFilter,
  reportFilter,
  onEditProduct,
  onDeleteProduct,
  onSetProductStatus: _onSetProductStatus,
  onRenameGroup,
  onDeleteGroup,
  onCreateExport,
  onDeleteExport,
  onEditCoupon,
  onDeleteCoupon,
  onEditTaxSetting,
  onDeleteTaxSetting,
  onSaveStoreSettings,
  onEditTaxonomy,
  onDeleteTaxonomy,
  onEditDownloadAccess,
  onModerateReview,
  onOpenInventoryMovement,
  onOpenRecommendation,
  onEditRecommendation,
  onDeleteRecommendation,
  onCustomerFilterChange,
  onViewCustomerOrders,
  onDisableCustomer,
  onReportFilterChange,
  onUpdateQuoteRequest,
}: {
  view: string;
  products: LibraryProduct[];
  orders: LibraryOrder[];
  analytics: LibraryAnalytics;
  operations: LibraryOperations;
  orderFilter: string;
  customerFilter: string;
  reportFilter: string;
  onEditProduct: (product: LibraryProduct) => void;
  onDeleteProduct: (id: string) => void | Promise<void>;
  onSetProductStatus: (product: LibraryProduct, status: string) => void | Promise<void>;
  onRenameGroup: (field: LibraryGroupField, currentName: string) => void | Promise<void>;
  onDeleteGroup: (field: LibraryGroupField, currentName: string) => void | Promise<void>;
  onCreateExport: (type: string) => void | Promise<void>;
  onDeleteExport: (id: string, type: string) => void | Promise<void>;
  onEditCoupon: (coupon?: LibraryCouponAdmin) => void;
  onDeleteCoupon: (id: string) => void | Promise<void>;
  onEditTaxSetting: (tax?: LibraryOperations["taxSettings"][number]) => void;
  onDeleteTaxSetting: (id: string) => void | Promise<void>;
  onSaveStoreSettings: (settings: LibraryStoreSettings) => Promise<unknown>;
  onEditTaxonomy: (kind: LibraryGroupField, row?: LibraryTaxonomyAdmin) => void;
  onDeleteTaxonomy: (kind: LibraryGroupField, id: string) => void | Promise<void>;
  onEditDownloadAccess: (row: LibraryDownloadAccessAdmin) => void;
  onModerateReview: (id: string, status: string, patch?: { featured?: boolean; verified?: boolean }) => void | Promise<void>;
  onOpenInventoryMovement: (product?: LibraryProduct) => void;
  onOpenRecommendation: (product?: LibraryProduct) => void;
  onEditRecommendation: (row: LibraryRecommendationAdmin) => void;
  onDeleteRecommendation: (row: LibraryRecommendationAdmin) => void | Promise<void>;
  onUpdateQuoteRequest: (id: string, status: string) => void | Promise<void>;
  onCustomerFilterChange: (value: string) => void;
  onViewCustomerOrders: (email: string) => void;
  onDisableCustomer: (userId: string, email: string) => void | Promise<void>;
  onReportFilterChange: (value: string) => void;
}) {
  if (view === "Categories") return <TaxonomyTable kind="category" products={products} taxonomy={operations.taxonomy} onEdit={onEditTaxonomy} onDelete={onDeleteTaxonomy} fallback={<GroupTable field="category" products={products} onRename={onRenameGroup} onDelete={onDeleteGroup} />} />;
  if (view === "Collections") {
    return (
      <div className="grid gap-5">
        <TaxonomyTable kind="collection" products={products} taxonomy={operations.taxonomy} onEdit={onEditTaxonomy} onDelete={onDeleteTaxonomy} fallback={<GroupTable field="collection" products={products} onRename={onRenameGroup} onDelete={onDeleteGroup} />} />
        <AdminDataTable
          rows={operations.recommendations}
          emptyMessage="No recommendation links yet."
          columns={[
            { key: "source", header: "Source", render: (row) => <span className="font-semibold text-white">{row.sourceProduct?.title ?? "Product"}</span> },
            { key: "target", header: "Recommendation", render: (row) => row.targetProduct?.title ?? "Recommended product" },
            { key: "reason", header: "Reason", render: (row) => row.reason },
            { key: "active", header: "State", render: (row) => <AdminStatusBadge status={row.active === false ? "INACTIVE" : "ACTIVE"} variant={row.active === false ? "muted" : "success"} /> },
            { key: "actions", header: "Actions", render: (row) => <RowActions primaryLabel="Edit" primaryIcon={Edit3} onPrimary={() => onEditRecommendation(row)} onDelete={() => onDeleteRecommendation(row)} /> },
          ]}
        />
        <Button disabled={products.length < 2} onClick={() => onOpenRecommendation(products[0])}><Plus className="size-4" /> Add Recommendation</Button>
      </div>
    );
  }
  if (view === "Authors") return <TaxonomyTable kind="author" products={products} taxonomy={operations.taxonomy} onEdit={onEditTaxonomy} onDelete={onDeleteTaxonomy} fallback={<GroupTable field="author" products={products} onRename={onRenameGroup} onDelete={onDeleteGroup} />} />;

  if (view === "Customers") {
    const q = customerFilter.trim().toLowerCase();
    const customers = operations.reports.customerSegments.filter((customer) => !q || [customer.name, customer.email, customer.segment].join(" ").toLowerCase().includes(q));
    return (
      <div className="grid gap-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <MiniMetricGrid rows={[{ label: "Customers", value: operations.reports.customerSegments.length, detail: "Library buyers" }, { label: "VIP", value: operations.reports.customerSegments.filter((row) => row.segment === "VIP").length, detail: "High value" }, { label: "Repeat", value: operations.reports.customerSegments.filter((row) => row.segment === "Repeat").length, detail: "3+ orders" }]} />
          <AdminSearchInput value={customerFilter} onChange={onCustomerFilterChange} placeholder="Search customers, emails, or segments..." />
        </div>
        <AdminDataTable
          rows={customers}
          emptyMessage="No Library customer segments yet."
          columns={[
            { key: "customer", header: "Customer", render: (row) => <div><p className="font-semibold text-white">{row.name}</p><p className="text-xs text-slate-500">{row.email}</p></div> },
            { key: "segment", header: "Segment", render: (row) => <AdminStatusBadge status={row.segment} variant={row.segment === "VIP" ? "success" : row.segment === "Repeat" ? "info" : "muted"} /> },
            { key: "orders", header: "Orders", render: (row) => row.orders },
            { key: "spend", header: "Lifetime spend", render: (row) => `USD ${row.spend.toFixed(2)}` },
            { key: "downloads", header: "Downloads", render: (row) => row.downloads },
            { key: "last", header: "Last order", render: (row) => new Date(row.lastOrderAt).toLocaleDateString() },
            { key: "actions", header: "Actions", render: (row) => <RowActions primaryLabel="View Orders" primaryIcon={Search} onPrimary={() => onViewCustomerOrders(row.email)} onDelete={() => onDisableCustomer(row.userId, row.email)} /> },
          ]}
        />
      </div>
    );
  }

  if (view === "Reviews") {
    return (
      <AdminDataTable
        rows={operations.reviews}
        emptyMessage="No Library reviews yet."
        columns={[
          { key: "product", header: "Product", render: (row) => <div><p className="font-semibold text-white">{row.productTitle}</p><p className="text-xs text-slate-500">{row.displayName ? `${row.displayName} · ${row.userName ?? row.userEmail ?? "Customer"}` : (row.userName ?? row.userEmail ?? "Customer")}</p></div> },
          { key: "rating", header: "Rating", render: (row) => `${row.rating}/5` },
          { key: "review", header: "Review", render: (row) => <div><p className="font-semibold text-slate-200">{row.title ?? "Untitled"}</p><p className="line-clamp-2 text-xs text-slate-500">{row.body ?? "No written review"}</p></div> },
          { key: "status", header: "Status", render: (row) => <AdminStatusBadge status={row.status} variant={row.status === "APPROVED" ? "success" : row.status === "REJECTED" ? "danger" : "warning"} /> },
          { key: "actions", header: "Actions", render: (row) => <div className="flex flex-wrap gap-2"><button type="button" onClick={() => onModerateReview(row.id, "APPROVED")} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/5">Approve</button><button type="button" onClick={() => onModerateReview(row.id, row.status, { featured: !row.featured })} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/5">{row.featured ? "Unfeature" : "Feature"}</button><button type="button" onClick={() => onModerateReview(row.id, row.status, { verified: !row.verified })} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/5">{row.verified ? "Unverify" : "Verify"}</button><IconButton icon={Trash2} label="Reject" danger onClick={() => void onModerateReview(row.id, "REJECTED")} /></div> },
        ]}
      />
    );
  }

  if (view === "Downloads") {
    const rows = products.flatMap((product) => product.downloads.map((download) => ({ ...download, id: download.id, product })));
    return (
      <>
        <AdminDataTable
          rows={rows}
          columns={[
            { key: "file", header: "File", render: (row) => <div><p className="font-semibold text-white">{row.label}</p><p className="text-xs text-slate-500">{row.product.title}</p></div> },
            { key: "type", header: "Type", render: (row) => row.fileType },
            { key: "size", header: "Size", render: (row) => row.size },
            { key: "access", header: "Access", render: (row) => <AdminStatusBadge status={isLibrarySampleFile(row) ? "SAMPLE" : "BUYER FILE"} variant={isLibrarySampleFile(row) ? "info" : "success"} /> },
            { key: "secure", header: "Security", render: (row) => <AdminStatusBadge status={row.secure ? "SECURE" : "OPEN"} variant={row.secure ? "success" : "warning"} /> },
            { key: "actions", header: "Actions", render: (row) => <RowActions primaryLabel="Edit Product" primaryIcon={Edit3} onPrimary={() => onEditProduct(row.product)} onDelete={() => onDeleteProduct(row.product.id)} /> },
          ]}
        />
        <DownloadAccessTable rows={operations.downloadAccess} onEdit={onEditDownloadAccess} />
        <div className="mt-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Download logs</h3>
          <p className="mt-1 text-xs text-slate-500">Access status, usage, expiry, and last-download signals from database access records.</p>
          <div className="mt-3">
            <AdminDataTable
              rows={operations.reports.downloadLogs}
              emptyMessage="No download activity yet."
              columns={[
                { key: "customer", header: "Customer", render: (row) => <span className="font-semibold text-white">{row.customer}</span> },
                { key: "product", header: "Product", render: (row) => row.product },
                { key: "file", header: "File", render: (row) => row.file },
                { key: "usage", header: "Usage", render: (row) => row.usage },
                { key: "status", header: "Status", render: (row) => <AdminStatusBadge status={row.status} variant={row.status === "ACTIVE" ? "success" : row.status === "REVOKED" ? "danger" : "warning"} /> },
                { key: "last", header: "Last", render: (row) => row.lastDownloadAt ? new Date(row.lastDownloadAt).toLocaleDateString() : "Never" },
              ]}
            />
          </div>
        </div>
      </>
    );
  }

  if (view === "Inventory") {
    const quoteRows = operations.quoteRequests ?? [];
    return (
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MiniMetricGrid rows={[
            { label: "Low stock", value: operations.reports.stockAlerts.length, detail: "At or under threshold" },
            { label: "Quote inbox", value: quoteRows.filter((row) => row.status === "NEW").length, detail: `${quoteRows.length} total requests` },
            { label: "Physical SKUs", value: products.filter((row) => row.stock !== null).length, detail: "Tracked inventory" },
          ]} />
          <Button
            variant="secondary"
            onClick={() => {
              void apiFetch("/api/v1/admin/library", { method: "POST", body: JSON.stringify({ action: "process_abandoned_carts" }) }).then((result) => {
                if (result.error) {
                  window.alert(result.error.message || "Could not process abandoned carts.");
                  return;
                }
                const sent = Number((result.data as { sent?: number } | undefined)?.sent ?? 0);
                window.alert(sent ? `Sent ${sent} abandoned bag reminder(s).` : "No abandoned bags were due for a reminder.");
              });
            }}
          >
            Send abandoned bag reminders
          </Button>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-300">Bulk quote inbox</h3>
          <AdminDataTable
            rows={quoteRows}
            emptyMessage="No bulk quote requests yet."
            columns={[
              { key: "when", header: "When", render: (row) => new Date(row.createdAt).toLocaleDateString() },
              { key: "customer", header: "Customer", render: (row) => <span className="font-semibold text-white">{row.name || row.email}</span> },
              { key: "product", header: "Product", render: (row) => row.productTitle },
              { key: "qty", header: "Qty", render: (row) => row.quantity },
              { key: "detail", header: "Detail", render: (row) => [row.company, row.formatType, row.phone].filter(Boolean).join(" · ") || row.message || "—" },
              {
                key: "status",
                header: "Status",
                render: (row) => (
                  <select
                    value={row.status}
                    onChange={(event) => void onUpdateQuoteRequest(row.id, event.target.value)}
                    className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-xs text-white"
                  >
                    {["NEW", "CONTACTED", "QUOTED", "WON", "LOST", "CLOSED"].map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                ),
              },
            ]}
          />
        </div>
        <AdminDataTable
          rows={operations.reports.stockAlerts}
          emptyMessage="No low-stock alerts right now."
          columns={[
            { key: "title", header: "Alert", render: (row) => <span className="font-semibold text-white">{row.title}</span> },
            { key: "stock", header: "Stock", render: (row) => row.stock },
            { key: "threshold", header: "Threshold", render: (row) => row.threshold },
            { key: "warehouse", header: "Warehouse", render: (row) => row.warehouse || "—" },
            { key: "state", header: "State", render: (row) => <AdminStatusBadge status={row.state} variant={row.state === "OUT" ? "danger" : "warning"} /> },
          ]}
        />
        <AdminDataTable
          rows={products}
          columns={[
            { key: "product", header: "Product", render: (row) => <ProductCell product={row} /> },
            { key: "stock", header: "Available", render: (row) => row.stock === null ? "Unlimited digital" : `${row.stock} units` },
            { key: "threshold", header: "Low stock", render: (row) => row.lowStockThreshold },
            { key: "warehouse", header: "Warehouse", render: (row) => row.warehouse ?? "Digital delivery" },
            { key: "state", header: "State", render: (row) => row.stock !== null && row.stock <= row.lowStockThreshold ? <AdminStatusBadge status={row.stock === 0 ? "OUT" : "LOW"} variant="danger" /> : <AdminStatusBadge status="OK" variant="success" /> },
            { key: "actions", header: "Actions", render: (row) => <RowActions primaryLabel="Restock" primaryIcon={Boxes} onPrimary={() => onOpenInventoryMovement(row)} onEdit={() => onEditProduct(row)} onDelete={() => onDeleteProduct(row.id)} /> },
          ]}
        />
        <AdminDataTable
          rows={operations.reports.inventoryMovements}
          emptyMessage="No inventory movements yet."
          columns={[
            { key: "product", header: "Product", render: (row) => <span className="font-semibold text-white">{row.productTitle}</span> },
            { key: "type", header: "Type", render: (row) => row.type },
            { key: "quantity", header: "Qty", render: (row) => row.quantity },
            { key: "note", header: "Note", render: (row) => row.note ?? "No note" },
            { key: "date", header: "Date", render: (row) => new Date(row.createdAt).toLocaleDateString() },
          ]}
        />
      </div>
    );
  }

  if (view === "Coupons") {
    const rows = operations.coupons;
    return (
      <div className="grid gap-5">
        <MiniMetricGrid rows={[{ label: "Campaigns", value: rows.length, detail: "Coupons configured" }, { label: "Active", value: rows.filter((row) => row.active).length, detail: "Live discounts" }, { label: "Uses", value: rows.reduce((sum, row) => sum + row.usedCount, 0), detail: "Total redemptions" }]} />
        <AdminDataTable
          rows={rows}
          emptyMessage="No Library coupons yet. Create real coupon campaigns for discounts, bundles, and launch offers."
          columns={[
            { key: "code", header: "Code", render: (row) => <span className="font-semibold text-white">{row.code}</span> },
            { key: "discount", header: "Discount", render: (row) => row.discountType === "PERCENT" ? `${row.discountValue}%` : `USD ${row.discountValue.toFixed(2)}` },
            { key: "rules", header: "Rules", render: (row) => [row.minimumSubtotal ? `Min USD ${row.minimumSubtotal}` : null, row.usageLimit ? `${row.usedCount}/${row.usageLimit} used` : `${row.usedCount} used`, row.firstPurchaseOnly ? "First purchase" : null].filter(Boolean).join(" - ") || "No restrictions" },
            { key: "status", header: "Status", render: (row) => <AdminStatusBadge status={row.active ? "ACTIVE" : "INACTIVE"} variant={row.active ? "success" : "muted"} /> },
            { key: "actions", header: "Actions", render: (row) => <RowActions primaryLabel="Export Uses" primaryIcon={Download} onPrimary={() => onCreateExport("coupons")} onEdit={() => onEditCoupon(row)} onDelete={() => onDeleteCoupon(row.id)} /> },
          ]}
        />
        <AdminDataTable
          rows={operations.reports.couponPerformance}
          emptyMessage="Coupon performance appears after campaign activity."
          columns={[
            { key: "code", header: "Campaign", render: (row) => <span className="font-semibold text-white">{row.code}</span> },
            { key: "uses", header: "Uses", render: (row) => row.usedCount },
            { key: "discount", header: "Discount", render: (row) => row.discountType === "PERCENT" ? `${row.discountValue}%` : `USD ${row.discountValue.toFixed(2)}` },
            { key: "state", header: "State", render: (row) => <AdminStatusBadge status={row.status} variant={row.status === "ACTIVE" ? "success" : "muted"} /> },
          ]}
        />
      </div>
    );
  }

  if (view === "Reports") {
    const reportRows = reportFilter === "products" ? operations.reports.productPerformance.map((row) => ({ id: row.id, name: row.title, metric: `USD ${row.revenue.toFixed(2)}`, detail: `${row.units} units / ${row.downloads} downloads`, status: `${row.health}% health` }))
      : reportFilter === "customers" ? operations.reports.customerSegments.map((row) => ({ id: row.id, name: row.name, metric: `USD ${row.spend.toFixed(2)}`, detail: `${row.orders} orders / ${row.downloads} downloads`, status: row.segment }))
      : reportFilter === "downloads" ? operations.reports.downloadLogs.map((row) => ({ id: row.id, name: row.product, metric: row.usage, detail: `${row.customer} / ${row.file}`, status: row.status }))
      : reportFilter === "taxes" ? operations.reports.taxSummary.map((row) => ({ id: row.id, name: `${row.name} (${row.country})`, metric: `${row.rate.toFixed(2)}%`, detail: `Collected USD ${row.collected.toFixed(2)}`, status: row.active ? "ACTIVE" : "INACTIVE" }))
      : reportFilter === "coupons" ? operations.reports.couponPerformance.map((row) => ({ id: row.id, name: row.code, metric: `${row.usedCount} uses`, detail: row.discountType === "PERCENT" ? `${row.discountValue}% discount` : `USD ${row.discountValue.toFixed(2)} discount`, status: row.status }))
      : reportFilter === "bundles" ? (operations.reports.bundlePairPerformance ?? []).map((row) => ({ id: row.label, name: row.label, metric: `${row.value} adds`, detail: `Digital lines ${row.digitalLines} · Print lines ${row.printLines}`, status: "BUNDLE" }))
      : reportFilter === "quotes" ? (operations.quoteRequests ?? []).map((row) => ({ id: row.id, name: row.productTitle, metric: `${row.quantity} qty`, detail: `${row.email}${row.company ? ` · ${row.company}` : ""}`, status: row.status }))
      : operations.reports.scorecards.map((row) => ({ id: row.label, name: row.label, metric: String(row.value), detail: row.detail, status: row.tone.toUpperCase() }));
    return (
      <div className="grid gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <AdminSelect value={reportFilter} onChange={onReportFilterChange} options={[
            { value: "overview", label: "Overview" },
            { value: "products", label: "Products" },
            { value: "customers", label: "Customers" },
            { value: "downloads", label: "Downloads" },
            { value: "coupons", label: "Coupons" },
            { value: "taxes", label: "Taxes" },
            { value: "bundles", label: "FBT bundles" },
            { value: "quotes", label: "Quote requests" },
          ]} />
          <Button onClick={() => onCreateExport(reportFilter)}>Export {reportFilter}</Button>
        </div>
        <AdminDataTable
          rows={reportRows}
          emptyMessage="No report data for this view yet."
          columns={[
            { key: "name", header: "Report row", render: (row) => <span className="font-semibold text-white">{row.name}</span> },
            { key: "metric", header: "Metric", render: (row) => row.metric },
            { key: "detail", header: "Detail", render: (row) => row.detail },
            { key: "status", header: "State", render: (row) => <AdminStatusBadge status={row.status} variant={row.status.includes("ACTIVE") || row.status.includes("SUCCESS") || row.status.includes("VIP") ? "success" : row.status.includes("DANGER") || row.status.includes("LOW") ? "danger" : "info"} /> },
          ]}
        />
        <AdminDataTable
          rows={operations.exports}
          emptyMessage="No exports yet. Create an export to generate one."
          columns={[
            { key: "type", header: "Export job", render: (row) => <span className="font-semibold text-white">{row.type}</span> },
            { key: "status", header: "Status", render: (row) => <AdminStatusBadge status={row.status} variant={row.status === "COMPLETED" ? "success" : "warning"} /> },
            { key: "file", header: "File", render: (row) => row.fileUrl ? <a href={row.fileUrl} className="font-semibold text-emerald-300 hover:underline" target="_blank" rel="noreferrer">Download CSV</a> : "Preparing" },
            { key: "date", header: "Created", render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "Now" },
            { key: "actions", header: "Actions", render: (row) => <RowActions primaryLabel="Download" primaryIcon={Download} onPrimary={() => row.fileUrl && window.open(row.fileUrl, "_blank")} onDelete={() => onDeleteExport(row.id, row.type)} /> },
          ]}
        />
      </div>
    );
  }

  if (view === "Analytics") {
    const bundlePairs = operations.reports.bundlePairPerformance ?? [];
    const formatMix = operations.reports.bundleFormatMix ?? [];
    const stockAlerts = operations.reports.stockAlerts ?? [];
    const downloadLogs = operations.reports.downloadLogs ?? [];
    const customerSegments = operations.reports.customerSegments ?? [];
    
    return (
      <div className="grid gap-5">
        <SiteAnalyticsPanel />
        <MiniMetricGrid rows={[
          { label: "Revenue", value: `USD ${analytics.revenue.toFixed(2)}`, detail: `${analytics.orders} orders` },
          { label: "Visitors", value: analytics.visitors, detail: `${analytics.conversionRate}% conversion` },
          { label: "Bundle adds", value: formatMix.reduce((sum, row) => sum + row.value, 0) ? bundlePairs.reduce((sum, row) => sum + row.value, 0) : (operations.reports.scorecards.find((row) => row.label === "Bundle cart adds")?.value ?? 0), detail: "FBT cart events" },
          { label: "Avg Order Value", value: `USD ${analytics.averageOrderValue.toFixed(2)}`, detail: "Per order" },
          { label: "Active Customers", value: analytics.activeCustomers, detail: "Last 30 days" },
          { label: "Avg Rating", value: `${analytics.averageRating.toFixed(1)}/5`, detail: "Customer satisfaction" },
        ]} />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-2">
          <div className="sm:col-span-2 xl:col-span-1">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Revenue trend</h3>
            <div className="mt-3"><BarChart data={operations.reports.revenueTrend.length ? operations.reports.revenueTrend : analytics.salesTrend} /></div>
          </div>
          <div className="sm:col-span-2 xl:col-span-1">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Marketplace funnel</h3>
            <div className="mt-3"><BarChart data={operations.reports.funnel} color="bg-cyan-500" /></div>
          </div>
          <div className="sm:col-span-2 xl:col-span-1">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">FBT pair performance</h3>
            <div className="mt-3"><BarChart data={bundlePairs.map((row) => ({ label: row.label, value: row.value }))} color="bg-emerald-500" /></div>
          </div>
          <div className="sm:col-span-2 xl:col-span-1">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Bundle digital vs print mix</h3>
            <div className="mt-3"><DonutChart data={formatMix} /></div>
          </div>
        </div>
        
        {/* Top Categories */}
        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Top Categories</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {analytics.topCategories.slice(0, 6).map((cat) => (
              <div key={cat.label} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/60 p-3">
                <span className="text-sm font-medium text-white">{cat.label}</span>
                <span className="text-sm text-slate-400">{cat.value} products</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Most Downloaded */}
        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Most Downloaded Products</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {analytics.mostDownloaded.slice(0, 6).map((product) => (
              <div key={product.label} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/60 p-3">
                <span className="text-sm font-medium text-white truncate">{product.label}</span>
                <span className="text-sm text-slate-400">{product.value} downloads</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Most Viewed */}
        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Most Viewed Products</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {analytics.mostViewed.slice(0, 6).map((product) => (
              <div key={product.label} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/60 p-3">
                <span className="text-sm font-medium text-white truncate">{product.label}</span>
                <span className="text-sm text-slate-400">{product.value} views</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Stock Alerts */}
        {stockAlerts.length > 0 && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-200">Stock Alerts</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {stockAlerts.slice(0, 6).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{alert.title}</p>
                    <p className="text-xs text-amber-200">{alert.state} - {alert.stock} left</p>
                  </div>
                  <span className="text-xs text-slate-400">{alert.warehouse}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Recent Downloads */}
        {downloadLogs.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Recent Downloads</h3>
            <div className="mt-3 space-y-2">
              {downloadLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/60 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{log.customer}</p>
                    <p className="text-xs text-slate-400 truncate">{log.product} - {log.file}</p>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">{log.usage}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Customer Segments */}
        {customerSegments.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Customer Segments</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {customerSegments.slice(0, 6).map((segment) => (
                <div key={segment.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/60 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{segment.name}</p>
                    <p className="text-xs text-slate-400">{segment.segment}</p>
                  </div>
                  <span className="text-sm text-slate-400 whitespace-nowrap">USD {segment.spend.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <AdminDataTable
          rows={bundlePairs.map((row, index) => ({ id: `bundle-pair-${index}`, ...row }))}
          emptyMessage="No frequently-bought-together cart adds yet."
          columns={[
            { key: "pair", header: "Pair / set", render: (row) => <span className="block min-w-0 max-w-full break-words font-semibold text-white [overflow-wrap:anywhere]">{row.label}</span> },
            { key: "adds", header: "Cart adds", render: (row) => row.value },
            { key: "digital", header: "Digital lines", render: (row) => row.digitalLines },
            { key: "print", header: "Print lines", render: (row) => row.printLines },
          ]}
        />
        <ProductPerformanceTable rows={operations.reports.productPerformance} products={products} onEditProduct={onEditProduct} onRecommend={onOpenRecommendation} />
      </div>
    );
  }

  if (view === "Settings") {
    return (
      <LibrarySettingsPanel
        settings={operations.storeSettings}
        taxSettings={operations.taxSettings}
        settingsHealth={operations.reports.settingsHealth}
        settingsAudit={operations.settingsAudit}
        onSave={onSaveStoreSettings}
        onEditTaxSetting={onEditTaxSetting}
        onDeleteTaxSetting={onDeleteTaxSetting}
        onAddTaxSetting={() => onEditTaxSetting()}
      />
    );
  }

  return null;
}

function GroupTable({
  field,
  products,
  onRename,
  onDelete,
}: {
  field: LibraryGroupField;
  products: LibraryProduct[];
  onRename: (field: LibraryGroupField, currentName: string) => void | Promise<void>;
  onDelete: (field: LibraryGroupField, currentName: string) => void | Promise<void>;
}) {
  const rows = Array.from(
    products.reduce((map, product) => {
      const key = product[field] || "Unassigned";
      const current = map.get(key) ?? { id: key, name: key, products: 0, published: 0, revenue: 0 };
      current.products += 1;
      if (product.status === "PUBLISHED") current.published += 1;
      current.revenue += product.price;
      map.set(key, current);
      return map;
    }, new Map<string, { id: string; name: string; products: number; published: number; revenue: number }>())
    .values(),
  );
  return (
    <AdminDataTable
      rows={rows}
      columns={[
        { key: "name", header: field, render: (row) => <span className="font-semibold text-white">{row.name}</span> },
        { key: "products", header: "Products", render: (row) => row.products },
        { key: "published", header: "Published", render: (row) => row.published },
        { key: "value", header: "Catalogue value", render: (row) => `USD ${row.revenue.toFixed(2)}` },
        { key: "actions", header: "Actions", render: (row) => <RowActions primaryLabel="Rename" primaryIcon={Edit3} onPrimary={() => onRename(field, row.name)} onDelete={() => onDelete(field, row.name)} /> },
      ]}
    />
  );
}

function FulfilmentTable({ rows, onEdit }: { rows: LibraryOperations["fulfilments"]; onEdit: (row: LibraryOperations["fulfilments"][number]) => void }) {
  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-semibold text-white">Fulfilment queue</p>
        <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-300">{rows.length}</span>
      </div>
      <AdminDataTable
        rows={rows}
        emptyMessage="No printed Library fulfilments yet."
        columns={[
          { key: "order", header: "Order", render: (row) => <span className="font-semibold text-white">{row.order?.orderNumber ?? row.id}</span> },
          { key: "status", header: "Status", render: (row) => <AdminStatusBadge status={row.status} variant={row.status === "DELIVERED" ? "success" : row.status === "DISPATCHED" ? "info" : "warning"} /> },
          { key: "courier", header: "Courier", render: (row) => row.courier || "Unassigned" },
          { key: "tracking", header: "Tracking", render: (row) => row.trackingUrl ? <a href={row.trackingUrl} target="_blank" rel="noreferrer" className="text-emerald-300 hover:text-emerald-200">{row.trackingNumber || "Open tracking"}</a> : row.trackingNumber || "Not added" },
          { key: "actions", header: "Actions", render: (row) => <RowActions primaryLabel="Update" primaryIcon={Edit3} onPrimary={() => onEdit(row)} /> },
        ]}
      />
    </div>
  );
}

function PaymentProofQueue({
  orders,
  onApprovePayment,
  onRejectPayment,
}: {
  orders: LibraryOrder[];
  onApprovePayment?: (order: LibraryOrder) => void;
  onRejectPayment?: (order: LibraryOrder) => void;
}) {
  const queue = orders
    .filter((order) => order.paymentId && (order.proofStatus === "UPLOADED" || (order.status === "PENDING" && order.paymentStatus === "PENDING" && order.proofUrl)))
    .map((order) => {
      const ageHours = Math.max(0, Math.round((Date.now() - new Date(order.createdAt).getTime()) / 3600000));
      return { order, ageHours };
    })
    .sort((a, b) => b.ageHours - a.ageHours);

  if (!queue.length) return null;

  return (
    <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-100">Payment proof queue</h3>
          <p className="mt-1 text-xs text-amber-100/80">
            {queue.length} order{queue.length === 1 ? "" : "s"} awaiting finance review. Approve unlocks downloads; reject asks for clearer proof.
          </p>
        </div>
        <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-100">
          SLA: review within 24h
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        {queue.slice(0, 8).map(({ order, ageHours }) => (
          <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-3">
            <div className="min-w-0">
              <p className="font-semibold text-white">{order.orderNumber}</p>
              <p className="truncate text-xs text-slate-400">
                {order.customerName} · {order.currency} {order.total.toFixed(2)} · waiting {ageHours}h
                {ageHours >= 24 ? " · overdue" : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {order.proofUrl ? (
                <a href={order.proofUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/5">
                  View proof
                </a>
              ) : null}
              {onApprovePayment ? (
                <button type="button" onClick={() => onApprovePayment(order)} className="rounded-lg border border-emerald-500/30 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/10">
                  Approve & unlock
                </button>
              ) : null}
              {onRejectPayment ? (
                <button type="button" onClick={() => onRejectPayment(order)} className="rounded-lg border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/10">
                  Reject proof
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrdersTable({
  orders,
  onNotify,
  onRefund,
  onApprovePayment,
  onRejectPayment,
  onRefundPayment,
  onDelete,
}: {
  orders: LibraryOrder[];
  onNotify?: (order: LibraryOrder) => void;
  onRefund?: (order: LibraryOrder) => void;
  onApprovePayment?: (order: LibraryOrder) => void;
  onRejectPayment?: (order: LibraryOrder) => void;
  onRefundPayment?: (order: LibraryOrder) => void;
  onDelete?: (order: LibraryOrder) => void;
}) {
  return (
    <AdminDataTable
      rows={orders}
      columns={[
        { key: "order", header: "Order", render: (row) => <span className="font-semibold text-white">{row.orderNumber}</span> },
        { key: "customer", header: "Customer", render: (row) => <div><p>{row.customerName}</p><p className="text-xs text-slate-500">{row.customerEmail}</p></div> },
        { key: "status", header: "Status", render: (row) => <AdminStatusBadge status={row.status} variant={row.status === "FULFILLED" ? "success" : row.status === "REFUNDED" ? "danger" : "warning"} /> },
        {
          key: "payment",
          header: "Payment",
          render: (row) => (
            <div>
              <p>{row.proofStatus === "UPLOADED" ? "PROOF REVIEW" : row.proofStatus === "REJECTED" ? "PROOF REJECTED" : row.paymentStatus}</p>
              {row.paymentAdminNote && <p className="mt-1 max-w-[14rem] truncate text-xs text-slate-500">{row.paymentAdminNote}</p>}
            </div>
          ),
        },
        { key: "total", header: "Total", render: (row) => `${row.currency} ${row.total.toFixed(2)}` },
        {
          key: "actions",
          header: "Actions",
          render: (row) => {
            const canReviewProof = Boolean(row.paymentId) && (row.proofStatus === "UPLOADED" || row.paymentStatus === "PENDING" || row.proofStatus === "REJECTED");
            const canRefundPayment = Boolean(row.paymentId) && row.paymentStatus === "PAID" && row.status !== "REFUNDED";
            return (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => window.open(`/api/v1/library/orders/${row.id}/invoice`, "_blank")} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/5"><Download className="size-4" /> Invoice</button>
                {onNotify && <button type="button" onClick={() => onNotify(row)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/5">Notify</button>}
                {canReviewProof && onApprovePayment && (
                  <button type="button" onClick={() => onApprovePayment(row)} className="rounded-lg border border-emerald-500/30 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/10">Approve payment</button>
                )}
                {canReviewProof && onRejectPayment && (
                  <button type="button" onClick={() => onRejectPayment(row)} className="rounded-lg border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/10">Reject proof</button>
                )}
                {canRefundPayment && onRefundPayment && (
                  <button type="button" onClick={() => onRefundPayment(row)} className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/10">Refund payment</button>
                )}
                {onRefund && row.status !== "REFUNDED" && !canRefundPayment && (
                  <button type="button" onClick={() => onRefund(row)} className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/10">Refund order</button>
                )}
                {row.proofUrl && (
                  <a href={row.proofUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/5">View proof</a>
                )}
                {onDelete && (
                  <button type="button" onClick={() => onDelete(row)} className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/10">
                    <Trash2 className="size-4" /> Delete
                  </button>
                )}
              </div>
            );
          },
        },
      ]}
    />
  );
}

function AdminAction({ icon: Icon, label, disabled, danger, onClick }: { icon: LucideIcon; label: string; disabled?: boolean; danger?: boolean; onClick?: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition disabled:opacity-40 ${danger ? "border-red-500/30 text-red-300 hover:bg-red-500/10" : "border-white/10 text-slate-300 hover:bg-white/5"}`}>
      <Icon className="size-4" /> {label}
    </button>
  );
}

function RowActions({
  primaryIcon: PrimaryIcon,
  primaryLabel,
  onPrimary,
  onEdit,
  onDelete,
  editIcon: EditIcon = Edit3,
  editLabel = "Edit",
}: {
  primaryIcon: LucideIcon;
  primaryLabel: string;
  onPrimary?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  editIcon?: LucideIcon;
  editLabel?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onPrimary?.();
        }}
        className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/5"
      >
        <PrimaryIcon className="size-4" /> {primaryLabel}
      </button>
      {onEdit && (
        <IconButton
          icon={EditIcon}
          label={editLabel}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onEdit();
          }}
        />
      )}
      {onDelete && (
        <IconButton
          icon={Trash2}
          label="Delete"
          danger
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void onDelete();
          }}
        />
      )}
    </div>
  );
}

function IconButton({ icon: Icon, label, onClick, danger }: { icon: LucideIcon; label: string; onClick?: (event: MouseEvent<HTMLButtonElement>) => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-lg border p-2 hover:bg-white/5 ${danger ? "border-red-500/30 text-red-300" : "border-white/10 text-slate-300"}`} aria-label={label}>
      <Icon className="size-4" />
    </button>
  );
}

function SeoLengthHint({ length, ideal, softMax }: { length: number; ideal: number; softMax: number }) {
  const tone = length === 0 ? "text-slate-500" : length <= ideal ? "text-emerald-300" : length <= softMax ? "text-amber-300" : "text-rose-300";
  return <p className={`text-xs ${tone}`}>{length}/{ideal} characters recommended{length > softMax ? " — too long for most SERPs" : length > ideal ? " — a little long" : length > 0 ? " — looking good" : ""}</p>;
}

function sectionDescription(view: string) {
  const descriptions: Record<string, string> = {
    Categories: "Organise taxonomy, SEO metadata, sort order, and visibility.",
    Collections: "Curate featured shelves, bundles, series, and professional product groups.",
    Authors: "Manage author profiles, bios, products, royalties, and publishing status.",
    Customers: "Review customer value, access state, downloads, orders, and support notes.",
    Reviews: "Moderate ratings, product feedback, featured reviews, and abuse reports.",
    Coupons: "Create coupons, gift cards, usage rules, expiry windows, and campaign tracking.",
    Downloads: "Configure secure files, limits, expiry, watermarking, license keys, and tracking.",
    Inventory: "Manage stock, low-stock alerts, warehouses, suppliers, and reserved quantities.",
    Reports: "Export sales, revenue, refunds, inventory, customers, products, downloads, and taxes.",
    Analytics: "Live presence, product views/adds/removes, cart activity, journeys, revenue, and proof SLA.",
    Settings: "Full store configuration: checkout, tax, delivery, downloads, licence, reviews, SEO, preview, claims, inventory, and notifications.",
  };
  return descriptions[view] ?? "Manage Library operations.";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "HL";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatUploadSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}
