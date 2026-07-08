"use client";

import { ChevronDown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AcademyAccordion({
  items,
  accent = "#008b68",
}: {
  accent?: string;
  items: Array<{
    id: string;
    title: string;
    subtitle?: string;
    meta?: string;
    defaultOpen?: boolean;
    content: React.ReactNode;
  }>;
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <details
          key={item.id}
          className="academy-card group overflow-hidden rounded-xl open:shadow-md"
          open={item.defaultOpen}
        >
          <summary className="flex cursor-pointer list-none flex-col gap-3 px-4 py-4 marker:content-none sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5">
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold leading-snug text-slate-900 dark:text-white">{item.title}</p>
              {item.subtitle && <p className="mt-1 text-sm leading-relaxed text-slate-500">{item.subtitle}</p>}
            </div>
            <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
              {item.meta && (
                <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: `${accent}18`, color: accent }}>
                  {item.meta}
                </span>
              )}
              <ChevronDown className="size-5 text-slate-400 transition group-open:rotate-180" />
            </div>
          </summary>
          <div className="border-t border-slate-100 bg-white/55 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/35 sm:px-5">{item.content}</div>
        </details>
      ))}
    </div>
  );
}

export type ToolkitAccessState = {
  unlocked: boolean;
  salesEnabled: boolean;
  price: number;
  currency: string;
  status: string | null;
  paymentId: string | null;
  proofUrl?: string | null;
  adminNote?: string | null;
};

export function ToolkitGrid({
  groups,
  accent = "#008b68",
  access,
  onPurchase,
  onUploadProof,
  purchaseBusy = false,
  preview = false,
}: {
  accent?: string;
  preview?: boolean;
  access?: ToolkitAccessState;
  onPurchase?: () => void;
  onUploadProof?: () => void;
  purchaseBusy?: boolean;
  groups: Array<{
    category: string;
    description: string;
    items: Array<{ id: string; title: string; description: string; fileUrl?: string; locked?: boolean }>;
  }>;
}) {
  if (!groups.length) {
    return <p className="text-sm text-slate-500">Toolkit downloads unlock after purchase and admin approval.</p>;
  }

  const locked = preview || (access ? !access.unlocked : false);

  return (
    <div className="space-y-4">
      {locked && (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
                <Lock className="size-4" />
                {preview ? "Toolkit previews only" : "Toolkit locked"}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {preview
                  ? "Purchase the field toolkit separately after enrolment. Downloads are not available from the public catalogue."
                  : access?.status === "PAYMENT_UPLOADED"
                    ? "Payment proof uploaded — waiting for admin approval before downloads unlock."
                    : access?.status === "REJECTED"
                      ? access.adminNote || "Payment could not be verified. Upload a clearer proof or contact support."
                      : "Purchase this programme toolkit, upload proof of payment, and wait for admin approval."}
              </p>
              {!preview && access?.salesEnabled && access.price > 0 && (
                <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Price: {access.currency} {access.price.toFixed(2)}
                </p>
              )}
            </div>
            {!preview && onPurchase && access?.salesEnabled && access.status !== "APPROVED" && (
              <div className="flex flex-wrap gap-2">
                {(!access.status || access.status === "PENDING_PAYMENT" || access.status === "REJECTED") && (
                  <Button onClick={onPurchase} disabled={purchaseBusy} style={{ backgroundColor: accent }}>
                    Purchase toolkit
                  </Button>
                )}
                {access.paymentId && access.status !== "APPROVED" && onUploadProof && (
                  <Button variant="secondary" onClick={onUploadProof} disabled={purchaseBusy}>
                    Upload proof
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <AcademyAccordion
        accent={accent}
        items={groups.map((group, index) => ({
          id: group.category,
          title: group.category,
          subtitle: group.description,
          meta: `${group.items.length} PDFs`,
          defaultOpen: index === 0,
          content: (
            <div className="grid gap-2 sm:grid-cols-2">
              {group.items.map((item) =>
                locked || item.locked || !item.fileUrl ? (
                  <div
                    key={item.id}
                    className={cn("rounded-lg border p-3 min-h-[4.5rem] bg-slate-50/80 dark:bg-slate-900/40")}
                    style={{ borderColor: `${accent}22` }}
                  >
                    <div className="flex items-start gap-2">
                      <Lock className="size-4 shrink-0 text-slate-400 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">{item.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.description}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <a
                    key={item.id}
                    href={item.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn("rounded-lg border p-3 transition hover:-translate-y-0.5 hover:shadow-md min-h-[4.5rem] bg-white dark:bg-slate-950")}
                    style={{ borderColor: `${accent}33` }}
                  >
                    <p className="font-semibold text-sm">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.description}</p>
                  </a>
                ),
              )}
            </div>
          ),
        }))}
      />
    </div>
  );
}
