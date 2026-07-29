"use client";

import { BarChart3, BookOpen, Boxes, Copy, Download, Edit3, FileArchive, LineChart, Plus, Search, ShoppingBag, Star, Tags, Trash2, Upload, Users, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { getLibraryAnalytics, libraryFacets, searchLibraryProducts, type LibraryAnalytics, type LibraryOrder, type LibraryProduct } from "@/lib/library/catalog";

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

type LibraryOperations = {
  fulfilments: Array<{ id: string; status: string; courier?: string | null; trackingNumber?: string | null; order?: { orderNumber: string; total: unknown; currency: string } }>;
  invoices: Array<{ id: string; invoiceNumber: string; total: unknown; currency: string; issuedAt?: string; order?: { orderNumber: string } }>;
  activities: Array<{ id: string; action: string; message: string; createdAt?: string }>;
  exports: Array<{ id: string; type: string; status: string; fileUrl?: string | null; createdAt?: string }>;
  taxSettings: Array<{ id: string; name: string; country: string; rate: unknown; inclusive: boolean; active: boolean }>;
  guestClaims: Array<{ id: string; email: string; status: string; order?: { orderNumber: string } }>;
  academyEntitlements: Array<{ id: string; userId: string; courseId: string; status: string }>;
  recommendations: Array<{ id: string; reason: string; sourceProduct?: { title: string }; targetProduct?: { title: string } }>;
};

const emptyOperations: LibraryOperations = {
  fulfilments: [],
  invoices: [],
  activities: [],
  exports: [],
  taxSettings: [],
  guestClaims: [],
  academyEntitlements: [],
  recommendations: [],
};

function OperationsList({ title, rows }: { title: string; rows: Array<{ label: string; value: string; detail?: string }> }) {
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
          </div>
        )) : (
          <p className="rounded-lg border border-dashed border-white/[0.08] p-3 text-sm text-slate-500">No records yet.</p>
        )}
      </div>
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
  const emptyDraft = { title: "", price: "29", category: "Toolkits", productType: "PDF", status: "DRAFT", description: "", gallery: [] as LibraryProduct["gallery"], downloads: [] as LibraryProduct["downloads"] };
  const [draft, setDraft] = useState(emptyDraft);
  const [editingProduct, setEditingProduct] = useState<LibraryProduct | null>(null);
  const source = productsSource.length ? productsSource : searchLibraryProducts({});
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
    if (result.data) {
      setProductsSource(result.data.products);
      setOrders(result.data.orders);
      setAnalytics(result.data.analytics);
      setOperations(result.data.operations ?? emptyOperations);
    }
  }

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createProduct() {
    setSaving(true);
    const result = await apiFetch<{ product: LibraryProduct }>("/api/v1/admin/library", {
      method: "POST",
      body: JSON.stringify({
        ...draft,
        price: Number(draft.price),
        shortDescription: draft.description.slice(0, 140),
        downloads: [],
        gallery: [],
      }),
    });
    setSaving(false);
    if (result.data?.product) {
      setDraftOpen(false);
      setDraft(emptyDraft);
      await load();
    }
  }

  async function saveProduct() {
    if (!editingProduct) return createProduct();
    setSaving(true);
    const result = await apiFetch<{ product: LibraryProduct }>(`/api/v1/admin/library/products/${editingProduct.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...draft,
        price: Number(draft.price),
        shortDescription: draft.description.slice(0, 140),
      }),
    });
    setSaving(false);
    if (result.data?.product) {
      closeEditor();
      await load();
    }
  }

  function openEditor(product: LibraryProduct) {
    setEditingProduct(product);
    setDraft({
      title: product.title,
      price: String(product.price),
      category: product.category,
      productType: product.productType,
      status: product.status,
      description: product.description,
      gallery: product.gallery,
      downloads: product.downloads,
    });
    setDraftOpen(true);
  }

  function closeEditor() {
    setDraftOpen(false);
    setEditingProduct(null);
    setDraft(emptyDraft);
  }

  async function uploadAsset(files: FileList | null, kind: "cover" | "download") {
    const file = files?.[0];
    if (!file) return;
    const dataUrl = await readFile(file);
    const isImage = file.type.startsWith("image/");
    const uploaded = await apiFetch<{ url: string; filename?: string; size?: number }>("/api/v1/uploads", {
      method: "POST",
      body: JSON.stringify({ dataUrl, kind: isImage ? "image" : "document", folder: "library" }),
    });
    if (!uploaded.data?.url) return;
    if (kind === "cover") {
      setDraft((current) => ({
        ...current,
        gallery: [...current.gallery, { label: file.name.replace(/\.[^.]+$/, ""), url: uploaded.data!.url, kind: "cover" }],
      }));
    } else {
      const ext = file.name.split(".").pop()?.toUpperCase() || "PDF";
      setDraft((current) => ({
        ...current,
        downloads: [...current.downloads, { id: crypto.randomUUID(), label: file.name.replace(/\.[^.]+$/, ""), fileType: ext, size: formatUploadSize(uploaded.data?.size ?? file.size), secure: true, fileUrl: uploaded.data!.url, fileName: uploaded.data?.filename ?? file.name } as LibraryProduct["downloads"][number] & { fileUrl: string; fileName: string }],
      }));
    }
  }

  async function duplicate(id: string) {
    await apiFetch("/api/v1/admin/library", { method: "POST", body: JSON.stringify({ action: "duplicate", id }) });
    await load();
  }

  async function bulk(action: "bulk_archive" | "bulk_delete") {
    await apiFetch("/api/v1/admin/library", { method: "POST", body: JSON.stringify({ action, ids: Array.from(selectedIds) }) });
    setSelectedIds(new Set());
    await load();
  }

  async function createExport(type: string) {
    await apiFetch("/api/v1/admin/library", { method: "POST", body: JSON.stringify({ action: "create_export", type, filters: { view } }) });
    await load();
  }

  async function saveTaxSetting() {
    await apiFetch("/api/v1/admin/library", { method: "POST", body: JSON.stringify({ action: "save_tax_setting", name: "Zimbabwe Library VAT", country: "ZW", rate: 0, inclusive: false, active: true }) });
    await load();
  }

  return (
    <div className="space-y-5">
      <AdminTabStrip tabs={views.map((id) => ({ id, label: id }))} active={view} onChange={setView} />

      {view === "Dashboard" && (
        <>
          <AdminMetricGrid cols={4}>
            <AdminStatPill label="Today's Sales" value={`$${analytics.todaySales}`} tone="success" />
            <AdminStatPill label="Weekly Sales" value={`$${analytics.weeklySales}`} tone="info" />
            <AdminStatPill label="Monthly Sales" value={`$${analytics.monthlySales}`} tone="default" />
            <AdminStatPill label="Conversion Rate" value={`${analytics.conversionRate}%`} tone="warning" />
          </AdminMetricGrid>
          <div className="grid gap-4 xl:grid-cols-2">
            <AdminPanel title="Interactive sales chart" description="Library revenue and order momentum.">
              <BarChart data={analytics.salesTrend} color="bg-emerald-500" />
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
                { key: "type", header: "Type", render: (row) => row.productType.replace(/_/g, " ") },
                { key: "price", header: "Price", render: (row) => `${row.currency} ${row.price.toFixed(2)}` },
                { key: "status", header: "Status", render: (row) => <AdminStatusBadge status={row.status} variant={row.status === "PUBLISHED" ? "success" : row.status === "SCHEDULED" ? "warning" : "muted"} /> },
                { key: "stock", header: "Inventory", render: (row) => row.stock === null ? "Unlimited digital" : `${row.stock} units` },
                { key: "actions", header: "Actions", render: (row) => <div className="flex gap-2"><IconButton icon={Edit3} label="Edit" onClick={() => openEditor(row)} /><IconButton icon={Copy} label="Duplicate" onClick={() => void duplicate(row.id)} /></div> },
              ]}
            />
          </div>
        </AdminPanel>
      )}

      {view === "Orders" && (
        <AdminPanel title="Library orders" description="Order queue, fulfilment, payment state, invoices, and customer confirmations.">
          <OrdersTable orders={orders} />
          <OperationsList title="Fulfilment queue" rows={operations.fulfilments.map((item) => ({ label: item.order?.orderNumber ?? item.id, value: item.status, detail: [item.courier, item.trackingNumber].filter(Boolean).join(" - ") || "Awaiting dispatch details" }))} />
          <OperationsList title="Invoices" rows={operations.invoices.map((item) => ({ label: item.invoiceNumber, value: `${item.currency} ${Number(item.total).toFixed(2)}`, detail: item.order?.orderNumber ?? "Library invoice" }))} />
        </AdminPanel>
      )}

      {["Categories", "Collections", "Authors", "Customers", "Reviews", "Coupons", "Downloads", "Inventory", "Reports", "Analytics", "Settings"].includes(view) && (
        <AdminPanel
          title={`Library ${view}`}
          description={sectionDescription(view)}
          action={view === "Reports" || view === "Analytics" ? <Button onClick={() => void createExport(view.toLowerCase())}>Create Export</Button> : view === "Settings" ? <Button onClick={() => void saveTaxSetting()}>Save Tax Defaults</Button> : undefined}
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {managementCards(view).map((item) => (
              <div key={item.label} className="rounded-xl border border-white/[0.08] bg-slate-950/50 p-4">
                <item.icon className="size-5 text-emerald-400" />
                <p className="mt-3 font-semibold text-white">{item.label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p>
              </div>
            ))}
          </div>
          {view === "Reports" && <OperationsList title="Export jobs" rows={operations.exports.map((item) => ({ label: item.type, value: item.status, detail: item.fileUrl ?? "Preparing export" }))} />}
          {view === "Analytics" && <OperationsList title="Activity timeline" rows={operations.activities.map((item) => ({ label: item.action, value: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Now", detail: item.message }))} />}
          {view === "Settings" && <OperationsList title="Tax settings" rows={operations.taxSettings.map((item) => ({ label: item.name, value: `${Number(item.rate).toFixed(2)}%`, detail: `${item.country} - ${item.inclusive ? "inclusive" : "exclusive"} - ${item.active ? "active" : "inactive"}` }))} />}
          {view === "Customers" && <OperationsList title="Guest claim queue" rows={operations.guestClaims.map((item) => ({ label: item.email, value: item.status, detail: item.order?.orderNumber ?? "Awaiting account claim" }))} />}
          {view === "Collections" && <OperationsList title="Recommendation links" rows={operations.recommendations.map((item) => ({ label: item.sourceProduct?.title ?? "Product", value: item.reason, detail: item.targetProduct?.title ?? "Recommended product" }))} />}
          {view === "Downloads" && <OperationsList title="Course entitlement bridge" rows={operations.academyEntitlements.map((item) => ({ label: item.courseId, value: item.status, detail: item.userId }))} />}
        </AdminPanel>
      )}

      {draftOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={closeEditor}>
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-950 p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">{editingProduct ? "Edit Library Product" : "Create Library Product"}</h2>
              <button type="button" onClick={closeEditor} className="rounded-lg p-2 text-slate-400 hover:bg-white/5" aria-label="Close editor"><X className="size-4" /></button>
            </div>
            <div className="mt-4 grid gap-3">
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white" />
              <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Description" className="min-h-28 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white" />
              <div className="grid gap-3 sm:grid-cols-3">
                <input value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder="Price" className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white" />
                <input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Category" className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white" />
                <select value={draft.productType} onChange={(e) => setDraft({ ...draft, productType: e.target.value })} className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white">
                  {facets.types.map((type) => <option key={type} value={type}>{type.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="rounded-lg border border-dashed border-white/10 p-3 text-sm text-slate-300">
                  <span className="flex items-center gap-2 font-semibold"><Upload className="size-4" /> Upload cover/gallery</span>
                  <input type="file" accept="image/*" className="mt-2 block w-full text-xs" onChange={(event) => void uploadAsset(event.target.files, "cover")} />
                </label>
                <label className="rounded-lg border border-dashed border-white/10 p-3 text-sm text-slate-300">
                  <span className="flex items-center gap-2 font-semibold"><Upload className="size-4" /> Upload download file</span>
                  <input type="file" accept=".pdf,.docx,.xlsx,.pptx,.zip" className="mt-2 block w-full text-xs" onChange={(event) => void uploadAsset(event.target.files, "download")} />
                </label>
              </div>
              {(draft.gallery.length > 0 || draft.downloads.length > 0) && (
                <div className="grid gap-2 rounded-lg border border-white/10 p-3 text-xs text-slate-400">
                  {draft.gallery.map((item, index) => <p key={`${item.url}-${index}`}>Cover: {item.label}</p>)}
                  {draft.downloads.map((item, index) => <p key={`${item.id}-${index}`}>Download: {item.label} ({item.fileType})</p>)}
                </div>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={closeEditor} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300">Cancel</button>
              <Button disabled={saving || !draft.title.trim() || !draft.description.trim()} onClick={() => void saveProduct()}>{saving ? "Saving..." : editingProduct ? "Save" : "Create"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
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

function OrdersTable({ orders }: { orders: LibraryOrder[] }) {
  return (
    <AdminDataTable
      rows={orders}
      columns={[
        { key: "order", header: "Order", render: (row) => <span className="font-semibold text-white">{row.orderNumber}</span> },
        { key: "customer", header: "Customer", render: (row) => <div><p>{row.customerName}</p><p className="text-xs text-slate-500">{row.customerEmail}</p></div> },
        { key: "status", header: "Status", render: (row) => <AdminStatusBadge status={row.status} variant={row.status === "FULFILLED" ? "success" : "warning"} /> },
        { key: "payment", header: "Payment", render: (row) => row.paymentStatus },
        { key: "total", header: "Total", render: (row) => `${row.currency} ${row.total.toFixed(2)}` },
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

function IconButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/5" aria-label={label}>
      <Icon className="size-4" />
    </button>
  );
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
    Settings: "Configure checkout, delivery, preview, SEO, licence, and future product-type settings.",
  };
  return descriptions[view] ?? "Manage Library operations.";
}

function managementCards(view: string) {
  const shared = [
    { icon: Search, label: "Search and filter", description: `Find ${view.toLowerCase()} quickly across the Library.` },
    { icon: Plus, label: "Create", description: `Add new ${view.toLowerCase()} records with admin permissions.` },
    { icon: Edit3, label: "Bulk edit", description: "Apply controlled updates across selected records." },
    { icon: LineChart, label: "Audit and analytics", description: "Track changes, performance, and operational history." },
  ];
  const byView: Record<string, typeof shared> = {
    Downloads: [
      { icon: Download, label: "Secure links", description: "Issue encrypted, expiring, trackable download URLs." },
      { icon: Download, label: "Download limits", description: "Set per-product limits, expiry dates, and instant delivery." },
      { icon: FileArchive, label: "File versions", description: "Manage PDF, ZIP, DOCX, PPTX, XLSX, media, and replacement files." },
      { icon: BarChart3, label: "Tracking", description: "Measure download count, access failures, and customer activity." },
    ],
    Inventory: [
      { icon: Boxes, label: "Stock", description: "Track printed stock, reserved stock, and out-of-stock states." },
      { icon: Tags, label: "Suppliers", description: "Manage warehouses, suppliers, and fulfilment notes." },
      { icon: ShoppingBag, label: "Digital unlimited", description: "Keep PDF and bundle inventory unlimited where appropriate." },
      { icon: LineChart, label: "Alerts", description: "Surface low-stock risks inside admin operations." },
    ],
    Reviews: [
      { icon: Star, label: "Moderation", description: "Approve, reject, feature, and investigate reviews." },
      { icon: Users, label: "Customer context", description: "Connect feedback to customers and verified purchases." },
      { icon: BookOpen, label: "Product quality", description: "Identify products with weak ratings or support patterns." },
      { icon: BarChart3, label: "Review analytics", description: "Measure ratings, sentiment, and response times." },
    ],
  };
  return byView[view] ?? shared;
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
