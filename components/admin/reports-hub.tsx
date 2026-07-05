"use client";

import { BarChart3, Download, FileSpreadsheet, Search, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdminKpiCard } from "@/components/admin/kpi-card";
import { AdminPanel, AdminTabStrip } from "@/components/admin/ui/admin-ui";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { apiFetch } from "@/lib/api/client";

const REPORT_TYPES = [
  { id: "revenue", label: "Revenue & payments", description: "Paid transactions, plans, MRR components", category: "finance" },
  { id: "users", label: "User directory", description: "Accounts, roles, status, registration dates", category: "people" },
  { id: "properties", label: "Listings inventory", description: "All listings with status, location, pricing", category: "properties" },
  { id: "audit", label: "Audit log", description: "Admin actions and security events", category: "compliance" },
  { id: "bookings", label: "Holiday bookings", description: "Enquiries, conversions, guest details", category: "bookings" },
  { id: "agents", label: "Agent performance", description: "Applications, commissions, territories", category: "agents" },
  { id: "commissions", label: "Commission ledger", description: "Agent payouts and adjustments", category: "finance" },
  { id: "occupancy", label: "Occupancy analytics", description: "Holiday home availability & occupancy", category: "bookings" },
] as const;

type ReportCategory = "all" | "finance" | "people" | "properties" | "bookings" | "agents" | "compliance";
type ReportPreview = {
  type: string;
  rows: Array<Record<string, unknown>>;
  totalRows: number;
  generatedAt: string;
};

export function ReportsHub() {
  const { showToast } = useApp();
  const previewRef = useRef<HTMLElement | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<{ type: string; message: string } | null>(null);
  const [category, setCategory] = useState<ReportCategory>("all");

  const loadPreview = useCallback(async (type: string, shouldScroll = true) => {
    setPreviewing(type);
    setPreviewError(null);
    try {
      const result = await apiFetch<{ rows: Array<Record<string, unknown>>; generatedAt: string }>(`/api/v1/admin/reports?type=${type}`);
      if (result.error) throw new Error(result.error.message);
      if (!result.data) throw new Error("No preview data returned.");
      setPreview({ type, rows: result.data.rows.slice(0, 8), totalRows: result.data.rows.length, generatedAt: result.data.generatedAt });
      if (shouldScroll) {
        requestAnimationFrame(() => {
          previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load preview.";
      setPreviewError({ type, message });
      showToast(message, "error");
    } finally {
      setPreviewing(null);
    }
  }, [showToast]);

  useEffect(() => {
    void loadPreview("revenue", false);
  }, [loadPreview]);

  async function download(type: string, format: "csv" | "json") {
    setDownloading(`${type}-${format}`);
    try {
      const url = `/api/v1/admin/reports?type=${type}&format=${format}`;
      if (format === "csv") {
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error("Export failed");
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = `homelink-${type}-report.csv`;
        a.click();
        URL.revokeObjectURL(objectUrl);
      } else {
        const result = await apiFetch<{ rows: unknown[]; generatedAt: string }>(url);
        if (!result.data) throw new Error("Export failed");
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = `homelink-${type}-report.json`;
        a.click();
        URL.revokeObjectURL(objectUrl);
      }
      showToast(`${type} report downloaded as ${format.toUpperCase()}.`);
    } catch {
      showToast("Failed to generate report.", "error");
    } finally {
      setDownloading(null);
    }
  }

  const filtered = REPORT_TYPES.filter((r) => category === "all" || r.category === category);
  const previewReport = preview ? REPORT_TYPES.find((report) => report.id === preview.type) : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard label="Report types" value={REPORT_TYPES.length} icon={FileSpreadsheet} />
        <AdminKpiCard label="Last preview rows" value={preview?.totalRows ?? "-"} icon={BarChart3} />
        <AdminKpiCard label="Export formats" value="CSV + JSON" icon={Download} />
        <AdminKpiCard label="Generation" value="On-demand" icon={TrendingUp} change="Live data at export time" />
      </div>

      <AdminTabStrip
        active={category}
        onChange={(id) => setCategory(id as ReportCategory)}
        tabs={[
          { id: "all", label: "All reports" },
          { id: "finance", label: "Finance" },
          { id: "people", label: "People" },
          { id: "properties", label: "Properties" },
          { id: "bookings", label: "Bookings" },
          { id: "agents", label: "Agents" },
          { id: "compliance", label: "Compliance" },
        ]}
      />

      {preview && (
        <section ref={previewRef} className="overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-slate-900/95 to-slate-950/95 shadow-2xl shadow-cyan-950/10">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Report preview</p>
              <h3 className="mt-1 text-lg font-semibold text-white">{previewReport?.label ?? preview.type}</h3>
              <p className="mt-1 text-sm text-slate-400">
                {preview.totalRows} row{preview.totalRows === 1 ? "" : "s"} generated from live data on {new Date(preview.generatedAt).toLocaleString()}.
              </p>
            </div>
            <div className="grid gap-2 sm:flex sm:flex-wrap">
              <Button variant="secondary" onClick={() => void download(preview.type, "csv")} disabled={downloading === `${preview.type}-csv`}>
                <Download className="size-4" /> {downloading === `${preview.type}-csv` ? "Exporting..." : "Download CSV"}
              </Button>
              <Button variant="secondary" onClick={() => void download(preview.type, "json")} disabled={downloading === `${preview.type}-json`}>
                {downloading === `${preview.type}-json` ? "Exporting..." : "JSON"}
              </Button>
            </div>
          </div>
          <ReportPreviewTable preview={preview} />
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((report) => (
          <AdminPanel key={report.id} title={report.label} description={report.description}>
            <div className="grid gap-2 sm:flex sm:flex-wrap">
              <Button variant="secondary" onClick={() => void loadPreview(report.id)} disabled={previewing === report.id}>
                <Search className="size-4" /> {previewing === report.id ? "Loading..." : "Preview"}
              </Button>
              <Button onClick={() => void download(report.id, "csv")} disabled={downloading === `${report.id}-csv`}>
                <Download className="size-4" />
                {downloading === `${report.id}-csv` ? "Exporting..." : "CSV"}
              </Button>
              <Button variant="secondary" onClick={() => void download(report.id, "json")} disabled={downloading === `${report.id}-json`}>
                JSON
              </Button>
            </div>
            {previewError?.type === report.id && (
              <p className="mt-3 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-100">{previewError.message}</p>
            )}
          </AdminPanel>
        ))}
      </div>
    </div>
  );
}

function ReportPreviewTable({ preview, compact = false }: { preview: ReportPreview; compact?: boolean }) {
  if (!preview.rows.length) return <p className="px-4 py-6 text-sm text-slate-400">No rows match this report yet.</p>;
  const keys = Object.keys(preview.rows[0]);
  const rows = preview.rows.slice(0, compact ? 4 : preview.rows.length);
  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((row, index) => (
          <article key={`${preview.type}-card-${index}`} className="rounded-xl border border-white/[0.07] bg-slate-950/45 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Row {index + 1}</p>
            <div className="space-y-2">
              {keys.map((key) => (
                <div key={key} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2 text-xs">
                  <span className="text-slate-500">{key.replace(/([A-Z])/g, " $1")}</span>
                  <span className="min-w-0 break-words text-slate-300">{formatPreviewValue(row[key])}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
      <table className="min-w-[720px] text-left text-xs text-slate-300">
        <thead className="bg-slate-900 text-slate-400">
          <tr>
            {keys.map((key) => (
              <th key={key} className="px-4 py-3 font-semibold uppercase tracking-wider">
                {key.replace(/([A-Z])/g, " $1")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${preview.type}-${index}`} className="border-t border-white/10">
              {keys.map((key) => (
                <td key={key} className="max-w-[220px] truncate px-4 py-3">
                  {formatPreviewValue(row[key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}

function formatPreviewValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString() : "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
