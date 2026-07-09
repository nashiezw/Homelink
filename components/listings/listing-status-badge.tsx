import { cn } from "@/lib/utils";
import { listingStatusMeta, listingStatusMetaFromValues } from "@/lib/listings/status";
import type { Listing } from "@/lib/types";

const toneClasses = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
  yellow: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
  red: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200",
  blue: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-200",
  slate: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
};

const dotClasses = {
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  red: "bg-red-500",
  blue: "bg-blue-500",
  slate: "bg-slate-400",
};

type ListingStatusBadgeProps = {
  listing?: Pick<Listing, "intent"> & { status?: string };
  status?: string;
  intent?: string;
  compact?: boolean;
  className?: string;
};

export function ListingStatusBadge({ listing, status, intent, compact, className }: ListingStatusBadgeProps) {
  const meta = listing ? listingStatusMeta(listing) : listingStatusMetaFromValues(status, intent);

  return (
    <span
      title={meta.description}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-normal shadow-sm",
        toneClasses[meta.tone],
        className,
      )}
    >
      <span className={cn("size-2 shrink-0 rounded-full", dotClasses[meta.tone])} aria-hidden="true" />
      <span className="truncate">{compact ? meta.shortLabel : meta.label}</span>
    </span>
  );
}
