"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-white/[0.06] pb-5 sm:pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="max-w-full break-words text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-400/90 sm:text-xs sm:tracking-[0.2em]">{eyebrow}</p>
        )}
        <h1 className="mt-1 break-words text-[1.65rem] font-bold leading-tight tracking-tight text-white sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400 sm:leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0">{actions}</div>}
    </div>
  );
}

export function AdminPanel({
  title,
  description,
  children,
  className,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-slate-900/90 to-slate-950/90 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]",
        className,
      )}
    >
      <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="min-w-0">
          <h2 className="break-words text-sm font-semibold uppercase tracking-wider text-slate-300">{title}</h2>
          {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}

export function AdminStatPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    default: "border-white/10 bg-white/[0.03] text-slate-200",
    success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
    warning: "border-amber-500/20 bg-amber-500/10 text-amber-200",
    danger: "border-red-500/20 bg-red-500/10 text-red-200",
    info: "border-cyan-500/20 bg-cyan-500/10 text-cyan-200",
  };
  return (
    <div className={cn("rounded-xl border px-4 py-3", tones[tone])}>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export function AdminFilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-slate-900/50 p-4 lg:flex-row lg:items-center",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminSearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/20",
        className,
      )}
    />
  );
}

export function AdminSelect({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-white focus:border-emerald-500/40 focus:outline-none",
        className,
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function AdminStatusBadge({
  status,
  variant = "default",
}: {
  status: string;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "muted";
}) {
  const styles = {
    default: "bg-slate-500/20 text-slate-300",
    success: "bg-emerald-500/20 text-emerald-300",
    warning: "bg-amber-500/20 text-amber-300",
    danger: "bg-red-500/20 text-red-300",
    info: "bg-cyan-500/20 text-cyan-300",
    muted: "bg-white/5 text-slate-500",
  };
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide", styles[variant])}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-slate-950/30 px-6 py-12 text-center">
      {Icon && (
        <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-white/5 text-slate-400">
          <Icon className="size-6" />
        </span>
      )}
      <p className="font-semibold text-white">{title}</p>
      {description && <p className="mt-2 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function AdminTabStrip({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: string; label: string; count?: number }>;
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/[0.08] bg-slate-950/50 p-1 [scrollbar-width:none]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
            active === tab.id
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-400 hover:bg-white/5 hover:text-white",
          )}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                active === tab.id ? "bg-white/20" : "bg-amber-500/20 text-amber-300",
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function AdminQuickAction({
  icon: Icon,
  label,
  description,
  onClick,
  href,
}: {
  icon: LucideIcon;
  label: string;
  description?: string;
  onClick?: () => void;
  href?: string;
}) {
  const className =
    "group flex w-full items-start gap-3 rounded-xl border border-white/[0.08] bg-slate-900/40 p-4 text-left transition hover:border-emerald-500/30 hover:bg-emerald-500/5";
  const inner = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 transition group-hover:bg-emerald-500/20">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-white">{label}</p>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
    </>
  );
  if (href) {
    return (
      <a href={href} className={className}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

export function AdminLoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />
      ))}
    </div>
  );
}

export function AdminBreadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-slate-500">
      {items.map((item, i) => (
        <span key={item.label} className="flex min-w-0 items-center gap-1.5">
          {i > 0 && <span className="text-slate-600">/</span>}
          {item.href ? (
            <a href={item.href} className="truncate hover:text-emerald-400">
              {item.label}
            </a>
          ) : (
            <span className="truncate text-slate-300">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function AdminToolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-slate-900/40 p-4 lg:flex-row lg:items-center lg:justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminPagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-3 text-sm text-slate-400">
      <p>
        Showing <span className="font-medium text-white">{from}–{to}</span> of{" "}
        <span className="font-medium text-white">{total}</span>
      </p>
      <div className="flex max-w-full items-center gap-1 overflow-x-auto [scrollbar-width:none]">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-40"
        >
          Prev
        </button>
        {Array.from({ length: Math.min(pages, 5) }).map((_, i) => {
          const p = i + 1;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(
                "min-w-9 rounded-lg px-2 py-1.5 text-sm",
                page === p ? "bg-emerald-600 text-white" : "border border-white/10 hover:bg-white/5",
              )}
            >
              {p}
            </button>
          );
        })}
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
};

export function AdminDataTable<T extends { id?: string }>({
  columns,
  rows,
  selectedId,
  onRowClick,
  emptyMessage = "No records found.",
  selectable,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allSelected,
}: {
  columns: Column<T>[];
  rows: T[];
  selectedId?: string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  allSelected?: boolean;
}) {
  if (!rows.length) {
    return <p className="p-8 text-center text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-white/[0.08] bg-slate-950/40 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <tr>
            {selectable && (
              <th className="w-10 px-4 py-3">
                <input type="checkbox" checked={allSelected} onChange={onToggleSelectAll} />
              </th>
            )}
            {columns.map((col) => (
              <th key={col.key} className={cn("px-4 py-3", col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const rowId = row.id ?? String(idx);
            const active = selectedId === rowId;
            return (
              <tr
                key={rowId}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-b border-white/[0.04] transition",
                  onRowClick && "cursor-pointer hover:bg-white/[0.03]",
                  active && "bg-emerald-500/[0.08]",
                )}
              >
                {selectable && (
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds?.has(rowId)}
                      onChange={() => onToggleSelect?.(rowId)}
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3", col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function AdminConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {description && <p className="mt-2 text-sm text-slate-400">{description}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold text-white",
              danger ? "bg-red-600 hover:bg-red-500" : "bg-emerald-600 hover:bg-emerald-500",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminDrawer({
  open,
  title,
  description,
  onClose,
  children,
  width = "md",
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  width?: "md" | "lg" | "xl";
}) {
  if (!open) return null;
  const widths = { md: "max-w-md", lg: "max-w-lg", xl: "max-w-xl" };
  return (
    <div className="fixed inset-0 z-[55] flex justify-end bg-black/50" onClick={onClose}>
      <aside
        className={cn("flex h-full w-full flex-col border-l border-white/10 bg-slate-950 shadow-2xl", widths[width])}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-white/[0.06] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="break-words text-lg font-semibold text-white">{title}</h2>
              {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5">
              ✕
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
      </aside>
    </div>
  );
}

export function AdminMetricGrid({ children, cols = 4 }: { children: ReactNode; cols?: 2 | 3 | 4 | 6 }) {
  const grid = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 xl:grid-cols-3", 4: "sm:grid-cols-2 xl:grid-cols-4", 6: "sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6" };
  return <div className={cn("grid gap-3", grid[cols])}>{children}</div>;
}
