"use client";

import { Boxes, Copy, Download, Edit3, ExternalLink, FileArchive, FileText, Link2, Plus, Search, Trash2, Upload, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
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
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import {
  enabledLibraryFormats,
  getLibraryAnalytics,
  libraryFacets,
  primaryLibraryFormat,
  searchLibraryProducts,
  type LibraryAnalytics,
  type LibraryOrder,
  type LibraryProduct,
  type LibraryProductFormat,
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
  reports: LibraryAdminReports;
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
type DownloadAccessDraft = { id: string; status: string; downloadLimit: string; expiresAt: string };
type ManualOrderDraft = { customerId: string; productId: string; quantity: string; couponCode: string; provider: string; referenceNumber: string; note: string; markPaid: boolean };
type OrderNotifyDraft = { orderId: string; type: string; message: string };
type RefundDraft = { orderId: string; reason: string };
type PaymentActionDraft = { paymentId: string; orderNumber: string; action: "approve" | "reject" | "refund"; reason: string };
type InventoryMovementDraft = { productId: string; type: string; quantity: string; note: string };
type RecommendationDraft = { sourceProductId: string; targetProductId: string; reason: string; weight: string; active: boolean };

type LibraryDraftDownload = LibraryProduct["downloads"][number] & { fileUrl?: string; fileName?: string; fileSizeBytes?: number; previewable?: boolean };

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
};

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
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-semibold text-slate-100">{row.label}</p>
              <span className="shrink-0 text-xs font-semibold text-emerald-300">{row.value}</span>
            </div>
            {row.detail && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{row.detail}</p>}
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
          <p className="mt-1 truncate text-lg font-bold text-white">{row.value}</p>
          {row.detail && <p className="truncate text-xs text-slate-500">{row.detail}</p>}
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
  const [editingProduct, setEditingProduct] = useState<LibraryProduct | null>(null);
  const emptyCouponDraft: CouponDraft = { code: "", description: "", discountType: "PERCENT", discountValue: "10", usageLimit: "", minimumSubtotal: "", startsAt: "", expiresAt: "", active: true, firstPurchaseOnly: false, productIdsText: "", categoryIdsText: "" };
  const emptyTaxDraft: TaxDraft = { name: "", country: "ZW", rate: "0", inclusive: false, active: true };
  const [couponDraft, setCouponDraft] = useState<CouponDraft | null>(null);
  const [taxDraft, setTaxDraft] = useState<TaxDraft | null>(null);
  const [fulfilmentDraft, setFulfilmentDraft] = useState<FulfilmentDraft | null>(null);
  const [groupDraft, setGroupDraft] = useState<GroupDraft | null>(null);
  const [taxonomyDraft, setTaxonomyDraft] = useState<TaxonomyDraft | null>(null);
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
    const result = await apiFetch<{ product: LibraryProduct }>("/api/v1/admin/library", {
      method: "POST",
      body: JSON.stringify(productPayload(draft, statusOverride)),
    });
    setSaving(false);
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
  }

  async function saveProduct(statusOverride?: string) {
    if (!editingProduct) return createProduct(statusOverride);
    setSaving(true);
    setFeedback(null);
    const result = await apiFetch<{ product: LibraryProduct }>(`/api/v1/admin/library/products/${editingProduct.id}`, {
      method: "PATCH",
      body: JSON.stringify(productPayload(draft, statusOverride)),
    });
    setSaving(false);
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
    });
    setDraftOpen(true);
  }

  function closeEditor() {
    setDraftOpen(false);
    setEditingProduct(null);
    setDraft(emptyDraft);
  }

  async function uploadAsset(files: FileList | null, kind: "cover" | "download" | "sample") {
    const file = files?.[0];
    if (!file) return;
    setFeedback(null);
    if (kind === "sample" && !file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setFeedback({ tone: "error", message: "Sample preview must be a PDF file." });
      return;
    }
    const dataUrl = await readFile(file);
    const isImage = file.type.startsWith("image/");
    const uploaded = await apiFetch<{ url: string; filename?: string; size?: number }>("/api/v1/uploads", {
      method: "POST",
      body: JSON.stringify({ dataUrl, kind: isImage ? "image" : "document", folder: "library" }),
    });
    if (!uploaded.data?.url) {
      setFeedback({ tone: "error", message: uploaded.error?.message || "Upload failed. Check Cloudinary/storage settings and try again." });
      return;
    }
    if (kind === "cover") {
      setDraft((current) => ({
        ...current,
        gallery: [...current.gallery, { label: file.name.replace(/\.[^.]+$/, ""), url: uploaded.data!.url, kind: "cover" }],
      }));
      setFeedback({ tone: "success", message: "Cover image uploaded. Save the product to keep it." });
      return;
    }
    const ext = file.name.split(".").pop()?.toUpperCase() || "PDF";
    const nextFile = {
      id: crypto.randomUUID(),
      label: kind === "sample" ? (file.name.replace(/\.[^.]+$/, "") || "Sample preview") : file.name.replace(/\.[^.]+$/, ""),
      fileType: ext,
      size: formatUploadSize(uploaded.data?.size ?? file.size),
      secure: true,
      previewable: kind === "sample",
      fileUrl: uploaded.data!.url,
      fileName: uploaded.data?.filename ?? file.name,
      fileSizeBytes: uploaded.data?.size ?? file.size,
    } as LibraryDraftDownload;
    if (kind === "sample") {
      setDraft((current) => ({ ...current, sampleFile: nextFile }));
      setFeedback({ tone: "success", message: "Sample PDF uploaded. Save the product to keep it." });
      return;
    }
    setDraft((current) => ({
      ...current,
      downloads: [...current.downloads, nextFile],
    }));
    setFeedback({ tone: "success", message: "Download file uploaded. Save the product to keep it." });
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
    setDownloadAccessDraft({ id: row.id, status: row.status, downloadLimit: row.downloadLimit == null ? "" : String(row.downloadLimit), expiresAt: row.expiresAt ?? "" });
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
          />
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
          <div className="flex max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
              <div>
                <h2 className="text-lg font-semibold text-white">{editingProduct ? "Edit Library Product" : "Create Library Product"}</h2>
                <p className="mt-1 text-sm text-slate-400">Full product setup for pricing, publishing, content, files, SEO, inventory, and storefront merchandising.</p>
              </div>
              <button type="button" onClick={closeEditor} className="rounded-lg p-2 text-slate-400 hover:bg-white/5" aria-label="Close editor"><X className="size-4" /></button>
            </div>
            <div className="overflow-y-auto p-5">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="space-y-5">
                  <EditorSection title="Product basics">
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Title" value={draft.title} onChange={(value) => setDraft({ ...draft, title: value })} required className="md:col-span-2" />
                      <Field label="Subtitle" value={draft.subtitle} onChange={(value) => setDraft({ ...draft, subtitle: value })} className="md:col-span-2" />
                      <Field label="Slug" value={draft.slug} onChange={(value) => setDraft({ ...draft, slug: value })} placeholder="Auto-generated from title if empty" />
                      <Field label="SKU" value={draft.sku} onChange={(value) => setDraft({ ...draft, sku: value })} placeholder="Auto-generated if empty" />
                      <Field label="Author" value={draft.author} onChange={(value) => setDraft({ ...draft, author: value })} />
                      <Field label="Publisher" value={draft.publisher} onChange={(value) => setDraft({ ...draft, publisher: value })} />
                      <Field label="Category" value={draft.category} onChange={(value) => setDraft({ ...draft, category: value })} />
                      <Field label="Collection" value={draft.collection} onChange={(value) => setDraft({ ...draft, collection: value })} />
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
                        <input type="file" accept="image/*" className="mt-2 block w-full text-xs" onChange={(event) => void uploadAsset(event.target.files, "cover")} />
                      </label>
                      <label className="rounded-lg border border-dashed border-white/10 p-3 text-sm text-slate-300">
                        <span className="flex items-center gap-2 font-semibold"><Upload className="size-4" /> Upload full download</span>
                        <p className="mt-1 text-xs text-slate-500">Buyer file after purchase (PDF, DOCX, ZIP, etc.)</p>
                        <input type="file" accept=".pdf,.docx,.xlsx,.pptx,.zip" className="mt-2 block w-full text-xs" onChange={(event) => void uploadAsset(event.target.files, "download")} />
                      </label>
                      <label className="rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-slate-300 sm:col-span-2">
                        <span className="flex items-center gap-2 font-semibold"><FileText className="size-4 text-emerald-300" /> Sample PDF (optional)</span>
                        <p className="mt-1 text-xs text-slate-500">
                          Upload a short preview PDF if available. This powers “Read sample” on the product page. Leave empty if you do not have a sample.
                        </p>
                        <input type="file" accept=".pdf,application/pdf" className="mt-2 block w-full text-xs" onChange={(event) => void uploadAsset(event.target.files, "sample")} />
                      </label>
                    </div>
                    {(draft.gallery.length > 0 || draft.downloads.length > 0 || draft.sampleFile) && (
                      <div className="mt-3 grid gap-2 rounded-lg border border-white/10 p-3 text-xs text-slate-400">
                        {draft.gallery.map((item, index) => <AssetRow key={`${item.url}-${index}`} label={`Cover/gallery: ${item.label}`} canMoveUp={index > 0} canMoveDown={index < draft.gallery.length - 1} onMoveUp={() => setDraft((current) => ({ ...current, gallery: moveItem(current.gallery, index, index - 1) }))} onMoveDown={() => setDraft((current) => ({ ...current, gallery: moveItem(current.gallery, index, index + 1) }))} onRemove={() => setDraft((current) => ({ ...current, gallery: current.gallery.filter((_, itemIndex) => itemIndex !== index) }))} />)}
                        {draft.sampleFile ? (
                          <AssetRow
                            label={`Sample preview: ${draft.sampleFile.label} (${draft.sampleFile.fileType})`}
                            onRemove={() => setDraft((current) => ({ ...current, sampleFile: null }))}
                          />
                        ) : null}
                        {draft.downloads.map((item, index) => <AssetRow key={`${item.id}-${index}`} label={`Full download: ${item.label} (${item.fileType})`} canMoveUp={index > 0} canMoveDown={index < draft.downloads.length - 1} onMoveUp={() => setDraft((current) => ({ ...current, downloads: moveItem(current.downloads, index, index - 1) }))} onMoveDown={() => setDraft((current) => ({ ...current, downloads: moveItem(current.downloads, index, index + 1) }))} onRemove={() => setDraft((current) => ({ ...current, downloads: current.downloads.filter((_, itemIndex) => itemIndex !== index) }))} />)}
                      </div>
                    )}
                  </EditorSection>
                </div>

                <aside className="space-y-5">
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
                                label={`${format.label} price`}
                                value={String(format.price)}
                                onChange={(value) => setDraft((current) => ({
                                  ...current,
                                  formats: current.formats.map((item) => item.id === format.id ? { ...item, price: Number(value) || 0 } : item),
                                }))}
                                type="number"
                                required
                              />
                              <Field
                                label="Compare-at price"
                                value={format.compareAtPrice == null ? "" : String(format.compareAtPrice)}
                                onChange={(value) => setDraft((current) => ({
                                  ...current,
                                  formats: current.formats.map((item) => item.id === format.id ? { ...item, compareAtPrice: value.trim() ? Number(value) : undefined } : item),
                                }))}
                                type="number"
                              />
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
            <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 p-5">
              <button type="button" onClick={closeEditor} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300">Cancel</button>
              <Button
                variant="secondary"
                disabled={saving || !draft.title.trim() || !draft.description.trim() || !draft.formats.some((format) => format.enabled)}
                onClick={() => void saveProduct(draft.status === "SCHEDULED" || draft.status === "ARCHIVED" ? draft.status : "DRAFT")}
              >
                {saving
                  ? "Saving..."
                  : draft.status === "SCHEDULED"
                    ? "Save scheduled"
                    : draft.status === "ARCHIVED"
                      ? "Save archived"
                      : "Save draft"}
              </Button>
              <Button
                disabled={
                  saving
                  || !draft.title.trim()
                  || !draft.description.trim()
                  || !draft.formats.some((format) => format.enabled)
                  || (draft.formats.some((format) => format.enabled && format.type !== "PRINTED_BOOK") && !draft.downloads.some((file) => Boolean((file as LibraryDraftDownload).fileUrl)))
                }
                onClick={() => void saveProduct("PUBLISHED")}
              >
                {saving ? "Publishing..." : "Publish"}
              </Button>
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
            <Field label={taxonomyDraft.kind === "author" ? "Avatar URL" : "Hero image URL"} value={taxonomyDraft.heroImageUrl} onChange={(value) => setTaxonomyDraft({ ...taxonomyDraft, heroImageUrl: value })} />
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
          <Field
            label={bulkDraft.mode === "price" ? "New price (USD)" : "Category name"}
            value={bulkDraft.value}
            onChange={(value) => setBulkDraft({ ...bulkDraft, value })}
            type={bulkDraft.mode === "price" ? "number" : "text"}
            required
          />
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
  const formats = draft.formats.map((format) => ({
    ...format,
    price: Number(format.price) || 0,
    compareAtPrice: format.compareAtPrice == null || Number.isNaN(Number(format.compareAtPrice)) ? undefined : Number(format.compareAtPrice),
  }));
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
    productType: primary.type,
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
            label: draft.sampleFile.label?.trim() || "Sample preview",
            previewable: true,
            secure: true,
          }]
        : []),
    ],
  };
}

function splitSampleFromDownloads(downloads: LibraryProduct["downloads"]): {
  sampleFile: LibraryDraftDownload | null;
  downloads: LibraryDraftDownload[];
} {
  const rows = downloads.map((item) => ({ ...item })) as LibraryDraftDownload[];
  const labeledSampleIndex = rows.findIndex((item) => item.previewable && /sample|preview/i.test(item.label || ""));
  if (labeledSampleIndex >= 0) {
    const sampleFile = { ...rows[labeledSampleIndex], previewable: true };
    return {
      sampleFile,
      downloads: rows
        .filter((_, index) => index !== labeledSampleIndex)
        .map((item) => ({ ...item, previewable: false })),
    };
  }
  const previewable = rows.filter((item) => item.previewable && item.fileUrl);
  if (previewable.length === 1 && rows.length > 1) {
    const sampleFile = { ...previewable[0], previewable: true };
    return {
      sampleFile,
      downloads: rows
        .filter((item) => item.id !== sampleFile.id)
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
      price: printed?.price ?? Math.max(product.price + 10, 25),
      compareAtPrice: printed?.compareAtPrice,
      sku: printed?.sku,
    },
  ];
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
    if (min === max) return `${product.currency} ${min.toFixed(2)}`;
    return `${product.currency} ${min.toFixed(2)} – ${max.toFixed(2)}`;
  }
  return `${product.currency} ${(formats[0]?.price ?? product.price).toFixed(2)}`;
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

function AssetRow({ label, canMoveUp, canMoveDown, onMoveUp, onMoveDown, onRemove }: { label: string; canMoveUp?: boolean; canMoveDown?: boolean; onMoveUp?: () => void; onMoveDown?: () => void; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-slate-950 p-2">
      <span className="min-w-0 truncate">{label}</span>
      <div className="flex shrink-0 gap-1">
        <button type="button" disabled={!canMoveUp} onClick={onMoveUp} className="rounded-md border border-white/10 px-2 py-1 text-[11px] font-bold text-slate-300 hover:bg-white/5 disabled:opacity-35">Up</button>
        <button type="button" disabled={!canMoveDown} onClick={onMoveDown} className="rounded-md border border-white/10 px-2 py-1 text-[11px] font-bold text-slate-300 hover:bg-white/5 disabled:opacity-35">Down</button>
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
          {enabledLibraryFormats(product).map((format) => (
            <div key={format.id} className="flex justify-between gap-3"><span>{format.label}</span><strong className="text-white">{product.currency} {format.price.toFixed(2)}</strong></div>
          ))}
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
    <section className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
      <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-300">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", required = false, className }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean; className?: string }) {
  return (
    <label className={cn("grid gap-1.5 text-sm", className)}>
      <span className="font-semibold text-slate-300">{label}{required && <span className="text-emerald-300"> *</span>}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500" />
    </label>
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

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-semibold text-slate-300">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none transition focus:border-emerald-500">
        {options.map((option) => <option key={option} value={option}>{option.replace(/_/g, " ")}</option>)}
      </select>
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
          { key: "product", header: "Product", render: (row) => <div><p className="font-semibold text-white">{row.productTitle}</p><p className="text-xs text-slate-500">{row.userName ?? row.userEmail ?? "Customer"}</p></div> },
          { key: "rating", header: "Rating", render: (row) => `${row.rating}/5` },
          { key: "review", header: "Review", render: (row) => <div><p className="font-semibold text-slate-200">{row.title ?? "Untitled"}</p><p className="line-clamp-2 text-xs text-slate-500">{row.body ?? "No written review"}</p></div> },
          { key: "status", header: "Status", render: (row) => <AdminStatusBadge status={row.status} variant={row.status === "APPROVED" ? "success" : row.status === "REJECTED" ? "danger" : "warning"} /> },
          { key: "actions", header: "Actions", render: (row) => <div className="flex flex-wrap gap-2"><button type="button" onClick={() => onModerateReview(row.id, "APPROVED", { verified: true })} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/5">Approve</button><button type="button" onClick={() => onModerateReview(row.id, row.status, { featured: !row.featured })} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/5">{row.featured ? "Unfeature" : "Feature"}</button><IconButton icon={Trash2} label="Reject" danger onClick={() => void onModerateReview(row.id, "REJECTED")} /></div> },
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
    return (
      <div className="grid gap-5">
        <MiniMetricGrid rows={[{ label: "Low stock", value: operations.reports.stockAlerts.length, detail: "At or under threshold" }, { label: "Movements", value: operations.reports.inventoryMovements.length, detail: "Recent stock ledger" }, { label: "Physical SKUs", value: products.filter((row) => row.stock !== null).length, detail: "Tracked inventory" }]} />
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
    return (
      <div className="grid gap-5">
        <MiniMetricGrid rows={[{ label: "Revenue", value: `USD ${analytics.revenue.toFixed(2)}`, detail: `${analytics.orders} orders` }, { label: "Visitors", value: analytics.visitors, detail: `${analytics.conversionRate}% conversion` }, { label: "Downloads", value: analytics.downloads, detail: "Access events" }]} />
        <div className="grid gap-5 xl:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Revenue trend</h3>
            <div className="mt-3"><BarChart data={operations.reports.revenueTrend.length ? operations.reports.revenueTrend : analytics.salesTrend} /></div>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Marketplace funnel</h3>
            <div className="mt-3"><BarChart data={operations.reports.funnel} color="bg-cyan-500" /></div>
          </div>
        </div>
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

function OrdersTable({
  orders,
  onNotify,
  onRefund,
  onApprovePayment,
  onRejectPayment,
  onRefundPayment,
}: {
  orders: LibraryOrder[];
  onNotify?: (order: LibraryOrder) => void;
  onRefund?: (order: LibraryOrder) => void;
  onApprovePayment?: (order: LibraryOrder) => void;
  onRejectPayment?: (order: LibraryOrder) => void;
  onRefundPayment?: (order: LibraryOrder) => void;
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
    Analytics: "Inspect visitors, conversion, product performance, categories, authors, and cohorts.",
    Settings: "Full store configuration: checkout, tax, delivery, downloads, licence, reviews, SEO, preview, claims, inventory, and notifications.",
  };
  return descriptions[view] ?? "Manage Library operations.";
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
