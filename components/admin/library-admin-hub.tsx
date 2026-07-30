"use client";

import { Boxes, CheckCircle2, Copy, Download, Edit3, FileArchive, Plus, Search, Star, Trash2, Upload, X } from "lucide-react";
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
  fulfilments: Array<{ id: string; status: string; courier?: string | null; trackingNumber?: string | null; order?: { orderNumber: string; total: unknown; currency: string } }>;
  invoices: Array<{ id: string; invoiceNumber: string; total: unknown; currency: string; issuedAt?: string; order?: { orderNumber: string } }>;
  activities: Array<{ id: string; action: string; message: string; createdAt?: string }>;
  exports: Array<{ id: string; type: string; status: string; fileUrl?: string | null; createdAt?: string }>;
  taxSettings: Array<{ id: string; name: string; country: string; rate: unknown; inclusive: boolean; active: boolean }>;
  guestClaims: Array<{ id: string; email: string; status: string; order?: { orderNumber: string } }>;
  academyEntitlements: Array<{ id: string; userId: string; courseId: string; status: string }>;
  recommendations: Array<{ id: string; reason: string; sourceProduct?: { title: string }; targetProduct?: { title: string } }>;
};

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
  stock: string;
  lowStockThreshold: string;
  warehouse: string;
  supplier: string;
  featured: boolean;
  bestSeller: boolean;
  newRelease: boolean;
  editorsChoice: boolean;
  comingSoon: boolean;
  preorder: boolean;
  gallery: LibraryProduct["gallery"];
  downloads: LibraryDraftDownload[];
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
    stock: "",
    lowStockThreshold: "0",
    warehouse: "",
    supplier: "",
    featured: false,
    bestSeller: false,
    newRelease: false,
    editorsChoice: false,
    comingSoon: false,
    preorder: false,
    gallery: [],
    downloads: [],
  };
  const [draft, setDraft] = useState<LibraryProductDraft>(emptyDraft);
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
      body: JSON.stringify(productPayload(draft)),
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
      body: JSON.stringify(productPayload(draft)),
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
      stock: product.stock === null ? "" : String(product.stock),
      lowStockThreshold: String(product.lowStockThreshold),
      warehouse: product.warehouse ?? "",
      supplier: product.supplier ?? "",
      featured: product.featured,
      bestSeller: product.bestSeller,
      newRelease: product.newRelease,
      editorsChoice: product.editorsChoice,
      comingSoon: product.comingSoon,
      preorder: product.preorder,
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

  async function deleteProduct(id: string) {
    if (!window.confirm("Delete this Library product? This removes it from the admin catalogue and public library.")) return;
    await apiFetch(`/api/v1/admin/library/products/${id}`, { method: "DELETE" });
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    await load();
  }

  async function setProductStatus(product: LibraryProduct, status: string) {
    await apiFetch<{ product: LibraryProduct }>(`/api/v1/admin/library/products/${product.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await load();
  }

  async function bulk(action: "bulk_archive" | "bulk_delete") {
    if (action === "bulk_delete" && !window.confirm(`Delete ${selectedIds.size} selected Library product${selectedIds.size === 1 ? "" : "s"}?`)) return;
    await apiFetch("/api/v1/admin/library", { method: "POST", body: JSON.stringify({ action, ids: Array.from(selectedIds) }) });
    setSelectedIds(new Set());
    await load();
  }

  async function updateProducts(ids: string[], patch: Partial<LibraryProduct>) {
    await Promise.all(ids.map((id) => apiFetch(`/api/v1/admin/library/products/${id}`, { method: "PATCH", body: JSON.stringify(patch) })));
    await load();
  }

  async function renameProductGroup(field: "category" | "collection" | "author", currentName: string) {
    const nextName = window.prompt(`Rename ${field}`, currentName)?.trim();
    if (!nextName || nextName === currentName) return;
    const ids = source.filter((product) => product[field] === currentName).map((product) => product.id);
    await updateProducts(ids, { [field]: nextName } as Partial<LibraryProduct>);
  }

  async function deleteProductGroup(field: "category" | "collection" | "author", currentName: string) {
    const ids = source.filter((product) => product[field] === currentName).map((product) => product.id);
    if (!ids.length || !window.confirm(`Delete ${ids.length} product${ids.length === 1 ? "" : "s"} in ${currentName}?`)) return;
    await apiFetch("/api/v1/admin/library", { method: "POST", body: JSON.stringify({ action: "bulk_delete", ids }) });
    await load();
  }

  function createForView(targetView = view) {
    setEditingProduct(null);
    setDraft({
      ...emptyDraft,
      category: targetView === "Categories" ? "New Category" : targetView === "Downloads" ? "Digital Downloads" : targetView === "Inventory" ? "Printed Stock" : "Toolkits",
      productType: targetView === "Downloads" ? "PDF" : targetView === "Inventory" ? "PRINTED_BOOK" : "PDF",
      stock: targetView === "Inventory" ? "10" : "",
    });
    setDraftOpen(true);
  }

  async function createExport(type: string) {
    await apiFetch("/api/v1/admin/library", { method: "POST", body: JSON.stringify({ action: "create_export", type, filters: { view } }) });
    await load();
  }

  async function saveTaxSetting() {
    const name = window.prompt("Tax setting name");
    if (!name?.trim()) return;
    const country = window.prompt("Country code", "ZW");
    if (!country?.trim()) return;
    const rateInput = window.prompt("Tax rate percentage", "0");
    const rate = Number(rateInput);
    if (!Number.isFinite(rate) || rate < 0) {
      window.alert("Enter a valid tax rate.");
      return;
    }
    const inclusive = window.confirm("Should this tax be included in the displayed product price?");
    await apiFetch("/api/v1/admin/library", { method: "POST", body: JSON.stringify({ action: "save_tax_setting", name: name.trim(), country: country.trim().toUpperCase(), rate, inclusive, active: true }) });
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
                { key: "actions", header: "Actions", render: (row) => <div className="flex flex-wrap gap-2"><IconButton icon={Edit3} label="Edit" onClick={() => openEditor(row)} /><IconButton icon={Copy} label="Duplicate" onClick={() => void duplicate(row.id)} /><IconButton icon={Trash2} label="Delete" danger onClick={() => void deleteProduct(row.id)} /><button type="button" onClick={() => void setProductStatus(row, row.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED")} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/5">{row.status === "PUBLISHED" ? "Draft" : "Publish"}</button></div> },
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
          action={
            view === "Reports" || view === "Analytics" ? (
              <Button onClick={() => void createExport(view.toLowerCase())}>Create Export</Button>
            ) : view === "Settings" ? (
              <Button onClick={() => void saveTaxSetting()}>Add Tax Setting</Button>
            ) : ["Categories", "Collections", "Authors", "Downloads", "Inventory"].includes(view) ? (
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
            onEditProduct={openEditor}
            onDeleteProduct={deleteProduct}
            onSetProductStatus={setProductStatus}
            onRenameGroup={renameProductGroup}
            onDeleteGroup={deleteProductGroup}
            onCreateExport={createExport}
            onSaveTaxSetting={saveTaxSetting}
          />
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

                  <EditorSection title="Files and media">
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
                      <div className="mt-3 grid gap-2 rounded-lg border border-white/10 p-3 text-xs text-slate-400">
                        {draft.gallery.map((item, index) => <p key={`${item.url}-${index}`}>Cover/gallery: {item.label}</p>)}
                        {draft.downloads.map((item, index) => <p key={`${item.id}-${index}`}>Download: {item.label} ({item.fileType})</p>)}
                      </div>
                    )}
                  </EditorSection>
                </div>

                <aside className="space-y-5">
                  <EditorSection title="Pricing">
                    <div className="grid gap-3">
                      <Field label="Price" value={draft.price} onChange={(value) => setDraft({ ...draft, price: value })} type="number" required />
                      <Field label="Compare-at price" value={draft.compareAtPrice} onChange={(value) => setDraft({ ...draft, compareAtPrice: value })} type="number" />
                      <Field label="Currency" value={draft.currency} onChange={(value) => setDraft({ ...draft, currency: value })} />
                    </div>
                  </EditorSection>

                  <EditorSection title="Publishing">
                    <div className="grid gap-3">
                      <SelectField label="Status" value={draft.status} onChange={(value) => setDraft({ ...draft, status: value })} options={productStatuses} />
                      <SelectField label="Product type" value={draft.productType} onChange={(value) => setDraft({ ...draft, productType: value })} options={["PDF", "PRINTED_BOOK", "DIGITAL_BOOK", "TRAINING_MANUAL", "TOOLKIT", "COURSE", "TEMPLATE", "FORMS", "BUNDLE"]} />
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
                      <Field label="Stock quantity" value={draft.stock} onChange={(value) => setDraft({ ...draft, stock: value })} type="number" placeholder="Blank for unlimited digital" />
                      <Field label="Low stock threshold" value={draft.lowStockThreshold} onChange={(value) => setDraft({ ...draft, lowStockThreshold: value })} type="number" />
                      <Field label="Warehouse" value={draft.warehouse} onChange={(value) => setDraft({ ...draft, warehouse: value })} />
                      <Field label="Supplier" value={draft.supplier} onChange={(value) => setDraft({ ...draft, supplier: value })} />
                    </div>
                  </EditorSection>
                </aside>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-white/10 p-5">
              <button type="button" onClick={closeEditor} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300">Cancel</button>
              <Button disabled={saving || !draft.title.trim() || !draft.description.trim()} onClick={() => void saveProduct()}>{saving ? "Saving..." : editingProduct ? "Save" : "Create"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function productPayload(draft: LibraryProductDraft) {
  const lines = (value: string) => value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  const tags = draft.tagsText.split(",").map((item) => item.trim()).filter(Boolean);
  const stock = draft.stock.trim() === "" ? null : Number(draft.stock);
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
    productType: draft.productType,
    status: draft.status,
    price: Number(draft.price),
    compareAtPrice: draft.compareAtPrice.trim() ? Number(draft.compareAtPrice) : undefined,
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
    stock,
    lowStockThreshold: Number(draft.lowStockThreshold) || 0,
    warehouse: draft.warehouse.trim() || undefined,
    supplier: draft.supplier.trim() || undefined,
    featured: draft.featured,
    bestSeller: draft.bestSeller,
    newRelease: draft.newRelease,
    editorsChoice: draft.editorsChoice,
    comingSoon: draft.comingSoon,
    preorder: draft.preorder,
    gallery: draft.gallery,
    downloads: draft.downloads,
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

function LibraryTabManagement({
  view,
  products,
  orders,
  analytics,
  operations,
  onEditProduct,
  onDeleteProduct,
  onSetProductStatus,
  onRenameGroup,
  onDeleteGroup,
  onCreateExport,
  onSaveTaxSetting,
}: {
  view: string;
  products: LibraryProduct[];
  orders: LibraryOrder[];
  analytics: LibraryAnalytics;
  operations: LibraryOperations;
  onEditProduct: (product: LibraryProduct) => void;
  onDeleteProduct: (id: string) => void | Promise<void>;
  onSetProductStatus: (product: LibraryProduct, status: string) => void | Promise<void>;
  onRenameGroup: (field: LibraryGroupField, currentName: string) => void | Promise<void>;
  onDeleteGroup: (field: LibraryGroupField, currentName: string) => void | Promise<void>;
  onCreateExport: (type: string) => void | Promise<void>;
  onSaveTaxSetting: () => void | Promise<void>;
}) {
  if (view === "Categories") return <GroupTable field="category" products={products} onRename={onRenameGroup} onDelete={onDeleteGroup} />;
  if (view === "Collections") return <GroupTable field="collection" products={products} onRename={onRenameGroup} onDelete={onDeleteGroup} />;
  if (view === "Authors") return <GroupTable field="author" products={products} onRename={onRenameGroup} onDelete={onDeleteGroup} />;

  if (view === "Customers") {
    const customers = Array.from(
      orders.reduce((map, order) => {
        const current = map.get(order.customerEmail) ?? { id: order.customerEmail, name: order.customerName, email: order.customerEmail, orders: 0, spend: 0, status: "ACTIVE" };
        current.orders += 1;
        current.spend += order.total;
        map.set(order.customerEmail, current);
        return map;
      }, new Map<string, { id: string; name: string; email: string; orders: number; spend: number; status: string }>())
      .values(),
    );
    return (
      <AdminDataTable
        rows={customers}
        columns={[
          { key: "customer", header: "Customer", render: (row) => <div><p className="font-semibold text-white">{row.name}</p><p className="text-xs text-slate-500">{row.email}</p></div> },
          { key: "orders", header: "Orders", render: (row) => row.orders },
          { key: "spend", header: "Lifetime spend", render: (row) => `USD ${row.spend.toFixed(2)}` },
          { key: "status", header: "Access", render: (row) => <AdminStatusBadge status={row.status} variant="success" /> },
          { key: "actions", header: "Actions", render: () => <RowActions primaryLabel="View Orders" primaryIcon={Search} onPrimary={() => null} onDelete={() => window.alert("Customer deletion is restricted because orders and invoices must remain auditable.")} /> },
        ]}
      />
    );
  }

  if (view === "Reviews") {
    return (
      <AdminDataTable
        rows={products.filter((product) => product.reviewCount > 0 || product.rating > 0)}
        columns={[
          { key: "product", header: "Product", render: (row) => <ProductCell product={row} /> },
          { key: "rating", header: "Rating", render: (row) => `${row.rating.toFixed(1)} (${row.reviewCount})` },
          { key: "featured", header: "Featured", render: (row) => <AdminStatusBadge status={row.editorsChoice ? "FEATURED" : "STANDARD"} variant={row.editorsChoice ? "success" : "muted"} /> },
          { key: "status", header: "Status", render: (row) => <AdminStatusBadge status={row.status} variant={row.status === "PUBLISHED" ? "success" : "warning"} /> },
          { key: "actions", header: "Actions", render: (row) => <RowActions primaryLabel="Feature" primaryIcon={Star} onPrimary={() => onSetProductStatus(row, "PUBLISHED")} onEdit={() => onEditProduct(row)} onDelete={() => onDeleteProduct(row.id)} /> },
        ]}
      />
    );
  }

  if (view === "Downloads") {
    const rows = products.flatMap((product) => product.downloads.map((download) => ({ ...download, id: download.id, product })));
    return (
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
    );
  }

  if (view === "Inventory") {
    return (
      <AdminDataTable
        rows={products}
        columns={[
          { key: "product", header: "Product", render: (row) => <ProductCell product={row} /> },
          { key: "stock", header: "Available", render: (row) => row.stock === null ? "Unlimited digital" : `${row.stock} units` },
          { key: "threshold", header: "Low stock", render: (row) => row.lowStockThreshold },
          { key: "warehouse", header: "Warehouse", render: (row) => row.warehouse ?? "Digital delivery" },
          { key: "actions", header: "Actions", render: (row) => <RowActions primaryLabel="Restock" primaryIcon={Boxes} onPrimary={() => onEditProduct(row)} onEdit={() => onEditProduct(row)} onDelete={() => onDeleteProduct(row.id)} /> },
        ]}
      />
    );
  }

  if (view === "Coupons") {
    const rows: Array<{ id: string; code: string; discount: string; status: string; used: number }> = [];
    return (
      <AdminDataTable
        rows={rows}
        emptyMessage="No Library coupons yet. Connect real coupon campaigns from Marketing before showing them here."
        columns={[
          { key: "code", header: "Code", render: (row) => <span className="font-semibold text-white">{row.code}</span> },
          { key: "discount", header: "Discount", render: (row) => row.discount },
          { key: "used", header: "Used", render: (row) => row.used },
          { key: "status", header: "Status", render: (row) => <AdminStatusBadge status={row.status} variant={row.status === "ACTIVE" ? "success" : "muted"} /> },
          { key: "actions", header: "Actions", render: () => <RowActions primaryLabel="Export Uses" primaryIcon={Download} onPrimary={() => onCreateExport("coupons")} onDelete={() => window.alert("Coupon deletion needs the production coupon editor; export usage before removing active campaigns.")} /> },
        ]}
      />
    );
  }

  if (view === "Reports") {
    return (
      <AdminDataTable
        rows={operations.exports}
        emptyMessage="No exports yet. Create an export to generate one."
        columns={[
          { key: "type", header: "Report", render: (row) => <span className="font-semibold text-white">{row.type}</span> },
          { key: "status", header: "Status", render: (row) => <AdminStatusBadge status={row.status} variant={row.status === "COMPLETED" ? "success" : "warning"} /> },
          { key: "file", header: "File", render: (row) => row.fileUrl ?? "Preparing" },
          { key: "date", header: "Created", render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "Now" },
          { key: "actions", header: "Actions", render: (row) => <RowActions primaryLabel="Refresh" primaryIcon={Download} onPrimary={() => onCreateExport(row.type)} onDelete={() => window.alert("Export jobs are retained for audit history.")} /> },
        ]}
      />
    );
  }

  if (view === "Analytics") {
    const rows = [
      { id: "revenue", metric: "Revenue", value: `USD ${analytics.revenue.toFixed(2)}`, detail: `${analytics.orders} orders` },
      { id: "downloads", metric: "Downloads", value: analytics.downloads, detail: "Secure file access" },
      { id: "visitors", metric: "Visitors", value: analytics.visitors, detail: `${analytics.conversionRate}% conversion` },
      { id: "views", metric: "Most viewed", value: analytics.mostViewed[0]?.value ?? 0, detail: analytics.mostViewed[0]?.label ?? "No product views" },
    ];
    return (
      <AdminDataTable
        rows={rows}
        columns={[
          { key: "metric", header: "Metric", render: (row) => <span className="font-semibold text-white">{row.metric}</span> },
          { key: "value", header: "Value", render: (row) => row.value },
          { key: "detail", header: "Detail", render: (row) => row.detail },
          { key: "actions", header: "Actions", render: (row) => <RowActions primaryLabel="Export" primaryIcon={Download} onPrimary={() => onCreateExport(row.id)} /> },
        ]}
      />
    );
  }

  if (view === "Settings") {
    const rows = operations.taxSettings;
    return (
      <AdminDataTable
        rows={rows}
        emptyMessage="No Library tax settings yet. Add a real tax setting when the store needs one."
        columns={[
          { key: "name", header: "Setting", render: (row) => <span className="font-semibold text-white">{row.name}</span> },
          { key: "country", header: "Country", render: (row) => row.country },
          { key: "rate", header: "Rate", render: (row) => `${Number(row.rate).toFixed(2)}%` },
          { key: "active", header: "State", render: (row) => <AdminStatusBadge status={row.active ? "ACTIVE" : "INACTIVE"} variant={row.active ? "success" : "muted"} /> },
          { key: "actions", header: "Actions", render: () => <RowActions primaryLabel="Save Defaults" primaryIcon={CheckCircle2} onPrimary={onSaveTaxSetting} onDelete={() => window.alert("Tax settings are versioned; disable them instead of deleting audit history.")} /> },
        ]}
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
        { key: "actions", header: "Actions", render: (row) => <RowActions primaryLabel="Invoice" primaryIcon={Download} onPrimary={() => window.open(`/api/v1/library/orders/${row.id}/invoice`, "_blank")} onDelete={() => window.alert("Orders are retained for payment, invoice, and audit history.")} /> },
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

function RowActions({ primaryIcon: PrimaryIcon, primaryLabel, onPrimary, onEdit, onDelete }: { primaryIcon: LucideIcon; primaryLabel: string; onPrimary?: () => void; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={onPrimary} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/5">
        <PrimaryIcon className="size-4" /> {primaryLabel}
      </button>
      {onEdit && <IconButton icon={Edit3} label="Edit" onClick={onEdit} />}
      {onDelete && <IconButton icon={Trash2} label="Delete" danger onClick={onDelete} />}
    </div>
  );
}

function IconButton({ icon: Icon, label, onClick, danger }: { icon: LucideIcon; label: string; onClick?: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-lg border p-2 hover:bg-white/5 ${danger ? "border-red-500/30 text-red-300" : "border-white/10 text-slate-300"}`} aria-label={label}>
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
